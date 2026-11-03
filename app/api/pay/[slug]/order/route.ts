import { NextResponse } from "next/server";
import { canEdit } from "@/lib/owner";
import { chargeFor, paymentProvider } from "@/lib/publish";
import { limit } from "@/lib/ratelimit";
import { createOrder, RazorpayError, razorpayKeyId, razorpayMode } from "@/lib/razorpay";
import { getSite } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };

// Step 1 of paying: ask Razorpay for an order for exactly what this site owes. The amount is worked
// out here from the saved site; nothing the browser sends can change it.
export async function POST(req: Request, { params }: Ctx) {
  const stop = await limit(req, "payOrder");
  if (stop) return stop;
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });
  if (!canEdit(req, site)) return NextResponse.json({ error: "Log in with WhatsApp or open your private edit link." }, { status: 403 });
  const { renew } = (await req.json().catch(() => ({}))) as { renew?: boolean };

  const provider = paymentProvider();
  if (provider === "off") return NextResponse.json({ error: "Online payment isn't connected yet. Please contact SiteGenie." }, { status: 501 });
  if (provider === "simulated") return NextResponse.json({ provider: "simulated" });

  const { renewal, charge } = chargeFor(site, !!renew);
  if (charge <= 0) return NextResponse.json({ error: "There's nothing to pay for this website right now." }, { status: 400 });

  try {
    const order = await createOrder(charge, `sg_${slug}_${Date.now().toString(36)}`, {
      slug,
      kind: renewal > 0 ? "renewal" : site.payment ? "upgrade" : "creation",
      plan: site.siteType,
    });
    const digits = site.whatsapp.replace(/\D/g, "");
    return NextResponse.json({
      provider: "razorpay",
      mode: razorpayMode(),
      keyId: razorpayKeyId(), // the public key id; the secret never leaves the server
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "SiteGenie",
      description: `Website for ${site.businessName}`.slice(0, 250),
      prefill: { contact: digits ? `+${digits}` : undefined, email: site.ownerEmail ?? undefined },
    });
  } catch (err) {
    const message = (err as Error).message;
    if (err instanceof RangeError) return NextResponse.json({ error: "That amount can't be paid online." }, { status: 400 });
    if (err instanceof RazorpayError && err.status === 401) {
      // Our own keys were refused: a setup problem for you, not something a customer can fix.
      console.error("Razorpay rejected our keys (401). Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:", message);
      return NextResponse.json({ error: "Online payment isn't set up correctly yet. Please contact SiteGenie." }, { status: 401 });
    }
    console.error("Razorpay order failed:", message);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again in a minute." }, { status: 500 });
  }
}
