import { NextResponse } from "next/server";
import { appOrigin, chargeFor, deploySite, withPayment } from "@/lib/publish";
import { limit } from "@/lib/ratelimit";
import { confirmPayment, getOrder, razorpayMode, webhookSignatureOk } from "@/lib/razorpay";
import { ConflictError, getSiteRev, saveSite, validSlug } from "@/lib/store";

export const maxDuration = 60;

// Razorpay tells us a payment was captured, even if the customer closed the tab right after paying.
// Set the webhook (event: payment.captured) to https://<your site>/api/razorpay/webhook with the same
// secret as RAZORPAY_WEBHOOK_SECRET. The browser flow already records the payment normally; this
// only fills in when it didn't, and never records the same payment twice.
export async function POST(req: Request) {
  const stop = await limit(req, "payWebhook", { global: true });
  if (stop) return stop;
  const raw = await req.text();
  if (!webhookSignatureOk(raw, req.headers.get("x-razorpay-signature"))) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string | null } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  if (event.event !== "payment.captured") return NextResponse.json({ ok: true, ignored: event.event ?? null });
  const paymentId = event.payload?.payment?.entity?.id;
  const orderId = event.payload?.payment?.entity?.order_id;
  if (!paymentId || !orderId) return NextResponse.json({ ok: true, ignored: "no order" });

  try {
    const order = await getOrder(orderId);
    const slug = order.notes?.slug ?? "";
    if (!validSlug(slug)) return NextResponse.json({ ok: true, ignored: "not ours" });

    for (let attempt = 0; attempt < 3; attempt++) {
      const { site, rev } = await getSiteRev(slug);
      if (!site) return NextResponse.json({ ok: true, ignored: "unknown site" });
      if (site.payment?.paymentIds?.includes(paymentId)) return NextResponse.json({ ok: true, already: true });
      const { renewal, charge } = chargeFor(site, order.notes?.kind === "renewal");
      if (charge <= 0) return NextResponse.json({ ok: true, ignored: "nothing due" }); // the browser flow got there first
      try {
        await confirmPayment({ orderId, paymentId, slug, expectedRupees: charge });
      } catch (err) {
        console.error("Razorpay webhook: payment doesn't match what is due:", (err as Error).message);
        return NextResponse.json({ ok: true, ignored: "mismatch" });
      }
      const paid = withPayment(site, { charge, renewal, reference: paymentId, mode: razorpayMode(), gateway: "razorpay", paymentId });
      try {
        await saveSite(paid, `Payment ₹${charge} for ${slug} (webhook)`, rev);
      } catch (err) {
        if (err instanceof ConflictError) continue; // someone saved at the same moment: look again
        throw err;
      }
      if (!renewal) await deploySite(paid, appOrigin(req)).catch((err) => console.error("Webhook deploy failed:", (err as Error).message));
      return NextResponse.json({ ok: true, recorded: true });
    }
    return NextResponse.json({ error: "Busy, retry" }, { status: 503 });
  } catch (err) {
    console.error("Razorpay webhook error:", (err as Error).message);
    return NextResponse.json({ error: "Try again" }, { status: 500 }); // Razorpay will retry
  }
}
