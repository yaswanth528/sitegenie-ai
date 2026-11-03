import { NextResponse } from "next/server";
import { canEdit } from "@/lib/owner";
import { appOrigin, chargeFor, deploySite, paymentProvider, withPayment } from "@/lib/publish";
import { checkoutSignatureOk, confirmPayment, razorpayMode } from "@/lib/razorpay";
import type { Site } from "@/lib/schema";
import { ConflictError, getSiteRev, newId, saveSite } from "@/lib/store";

export const maxDuration = 60;
type Ctx = { params: Promise<{ slug: string }> };

const LIVE_FAILED = "We couldn't put your website live just now. Your payment is saved, so you won't be charged again. Please try again in a minute.";
const text = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 100) : "");

// Pay to get the website (or renew the yearly plan), then deploy it to its own hosting.
// With Razorpay keys set, the browser sends back what Razorpay's checkout returned; we verify it
// with Razorpay before marking anything paid. Without keys, a pretend "test" payment is recorded.
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const { site, rev } = await getSiteRev(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!canEdit(req, site)) return NextResponse.json({ error: "Log in with WhatsApp or open your private edit link." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { renew?: boolean; razorpay?: { order_id?: unknown; payment_id?: unknown; signature?: unknown } };

  const { renewal, charge } = chargeFor(site, !!body.renew);
  let paid: Site = site;
  if (charge > 0) {
    const provider = paymentProvider();
    if (provider === "off") return NextResponse.json({ error: "Online payment isn't connected yet. Please contact SiteGenie." }, { status: 501 });

    if (provider === "razorpay") {
      const orderId = text(body.razorpay?.order_id);
      const paymentId = text(body.razorpay?.payment_id);
      const signature = text(body.razorpay?.signature);
      if (!orderId || !paymentId || !signature) return NextResponse.json({ error: "Payment details are missing. Please try paying again.", due: charge }, { status: 400 });
      if (!checkoutSignatureOk(orderId, paymentId, signature)) return NextResponse.json({ error: "We couldn't verify that payment." }, { status: 400 });
      try {
        await confirmPayment({ orderId, paymentId, slug, expectedRupees: charge });
      } catch (err) {
        const msg = (err as Error).message;
        console.error("Razorpay confirmation failed:", msg);
        // Our own checks speak plainly; a Razorpay or network error does not belong on a customer's screen.
        const ours = !msg.startsWith("Razorpay ") && !/fetch|abort|timeout/i.test(msg);
        return NextResponse.json(
          { error: ours ? msg : "We couldn't confirm your payment with Razorpay yet. If money was taken it will be applied automatically within a few minutes." },
          { status: ours ? 400 : 502 },
        );
      }
      paid = withPayment(site, { charge, renewal, reference: paymentId, mode: razorpayMode(), gateway: "razorpay", paymentId });
    } else {
      paid = withPayment(site, { charge, renewal, reference: `TEST-${newId()}`, mode: "test", gateway: "simulated" });
    }

    try {
      await saveSite(paid, `${provider === "razorpay" ? "Payment" : "Test payment"} ₹${charge} for ${slug}${renewal ? " (renewal)" : ""}`, rev);
    } catch (err) {
      if (err instanceof ConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
      console.error(err);
      return NextResponse.json({ error: "Couldn't record the payment. Try again." }, { status: 502 });
    }
    if (renewal) return NextResponse.json({ paid: charge, payment: paid.payment, live: paid.live ?? null });
  }

  try {
    const live = await deploySite(paid, appOrigin(req));
    return NextResponse.json({ paid: charge, payment: live.payment, live: live.live });
  } catch (err) {
    console.error(err);
    // Paid but not deployed yet: the owner can retry "Update live website" from the edit screen.
    return NextResponse.json({ error: LIVE_FAILED, paid: charge, payment: paid.payment }, { status: 502 });
  }
}
