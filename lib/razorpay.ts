// Razorpay (Orders API + Standard Checkout). The server decides the amount, Razorpay collects the
// money, and a site is only marked paid after the payment is verified here:
//   1. we create an order for the amount WE compute (never one sent by the browser),
//   2. the customer pays in Razorpay's checkout window,
//   3. we check the checkout signature, then ask Razorpay for the order and payment and confirm
//      they belong to this site, match the amount, and were captured,
//   4. a webhook (payment.captured) repeats step 3 if the customer closed the tab after paying.
// Keys live only in environment variables: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (and
// RAZORPAY_WEBHOOK_SECRET for the webhook). Nothing here ever logs or returns the secret.
import { createHmac, timingSafeEqual } from "node:crypto";

// Test servers can point this elsewhere; in production it is always Razorpay's own API.
const base = () => (process.env.RAZORPAY_API_BASE || "https://api.razorpay.com").replace(/\/$/, "");

export const razorpayReady = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";
// Razorpay test keys start with rzp_test_ (no real money moves); live keys start with rzp_live_.
export const razorpayMode = (): "test" | "live" => (razorpayKeyId().startsWith("rzp_live_") ? "live" : "test");

const auth = () => `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;

async function rz<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { description?: string; code?: string } };
  if (!res.ok) throw new Error(`Razorpay ${res.status}: ${body.error?.description ?? body.error?.code ?? "request failed"}`);
  return body;
}

export type RzOrder = { id: string; amount: number; amount_paid?: number; currency: string; status: string; notes?: Record<string, string> };
export type RzPayment = { id: string; order_id: string | null; amount: number; currency: string; status: string; captured?: boolean };

export const createOrder = (amountRupees: number, receipt: string, notes: Record<string, string>) =>
  rz<RzOrder>("/v1/orders", { method: "POST", body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: "INR", receipt: receipt.slice(0, 40), notes }) });

export const getOrder = (id: string) => rz<RzOrder>(`/v1/orders/${encodeURIComponent(id)}`);
export const getPayment = (id: string) => rz<RzPayment>(`/v1/payments/${encodeURIComponent(id)}`);
export const capturePayment = (id: string, amountPaise: number) =>
  rz<RzPayment>(`/v1/payments/${encodeURIComponent(id)}/capture`, { method: "POST", body: JSON.stringify({ amount: amountPaise, currency: "INR" }) });

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Razorpay's documented checkout signature: HMAC-SHA256 of "order_id|payment_id" with the key secret.
export function checkoutSignatureOk(orderId: string, paymentId: string, signature: string): boolean {
  if (!razorpayReady() || !orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

// Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret.
export function webhookSignatureOk(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}

export type Confirmed = { orderId: string; paymentId: string; amountRupees: number };

// Confirms with Razorpay itself that this order and payment are real, for this site and amount,
// and that the money was captured (capturing it if Razorpay left it "authorized").
export async function confirmPayment(opts: { orderId: string; paymentId: string; slug: string; expectedRupees: number }): Promise<Confirmed> {
  const expectedPaise = Math.round(opts.expectedRupees * 100);
  const order = await getOrder(opts.orderId);
  if (order.notes?.slug !== opts.slug) throw new Error("This payment belongs to a different website.");
  if (order.currency !== "INR" || order.amount !== expectedPaise) throw new Error("The payment amount doesn't match.");
  let payment = await getPayment(opts.paymentId);
  if (payment.order_id !== opts.orderId) throw new Error("This payment doesn't belong to the order.");
  if (payment.amount !== expectedPaise || payment.currency !== "INR") throw new Error("The payment amount doesn't match.");
  if (payment.status === "authorized") payment = await capturePayment(payment.id, expectedPaise);
  if (payment.status !== "captured") throw new Error("The payment hasn't been completed.");
  return { orderId: order.id, paymentId: payment.id, amountRupees: opts.expectedRupees };
}
