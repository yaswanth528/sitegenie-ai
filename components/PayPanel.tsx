"use client";
// "Pay ₹1,999 to get your website", then the site is deployed to its own address.
// With Razorpay keys on the server, this opens Razorpay's checkout (UPI, cards, netbanking) and the
// server verifies the payment before anything goes live. Without keys it keeps the pretend payment.
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalogue";
import type { Live } from "@/lib/schema";

type Props = {
  slug: string;
  editKey: string;
  siteType: "static" | "dynamic";
  due: number;
  upgrade?: boolean;
  onLive: (live: Live) => void;
};

const INCLUDES = {
  static: ["Your own website address", "Products, photos, about and contact", "Orders on WhatsApp", "Unlimited voice changes"],
  dynamic: ["Everything in Static", "Cart and checkout with delivery address", "Orders list for you", "First year included (₹3,000/yr after)"],
};

type Config = { provider: "razorpay" | "simulated" | "off"; mode: "test" | "live" };
type Order = {
  provider: "razorpay";
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { contact?: string; email?: string };
};
type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type Phase = "idle" | "starting" | "paying" | "verifying";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void };
  }
}

// Razorpay's official checkout script, loaded only when someone is about to pay.
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("checkout script")));
    if (!existing) {
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

// Opens the checkout window. Resolves with the payment details, or null if the customer closed it.
function openCheckout(order: Order): Promise<CheckoutResult | null> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error("checkout script"));
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#0b5d7a" },
      handler: (r: CheckoutResult) => resolve(r),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.open();
  });
}

export function PayPanel({ slug, editKey, siteType, due, upgrade, onLive }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paidNotLive, setPaidNotLive] = useState(false);
  // A payment the customer already made but we could not confirm yet: re-check it, never charge again.
  const [unconfirmed, setUnconfirmed] = useState<CheckoutResult | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const busy = phase !== "idle";

  useEffect(() => {
    fetch("/api/payment-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Config | null) => c && setConfig(c))
      .catch(() => {});
  }, []);

  // Tells the server to finish: verify the payment (when there is one), then put the website live.
  async function finish(razorpay?: CheckoutResult) {
    setPhase("verifying");
    const res = await fetch(`/api/pay/${slug}`, {
      method: "POST",
      headers: { "x-edit-key": editKey, "Content-Type": "application/json" },
      body: JSON.stringify(razorpay ? { razorpay: { order_id: razorpay.razorpay_order_id, payment_id: razorpay.razorpay_payment_id, signature: razorpay.razorpay_signature } } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.live) {
      setUnconfirmed(null);
      return onLive(data.live);
    }
    if (data.payment) {
      setUnconfirmed(null);
      setPaidNotLive(true);
    } else if (razorpay && res.status >= 500) setUnconfirmed(razorpay); // paid, but we could not confirm it just now
    setError(data.error ?? "Couldn't complete this step.");
  }

  async function pay() {
    setError(null);
    setPhase("starting");
    try {
      if (unconfirmed) return await finish(unconfirmed); // check the payment already made
      if (paidNotLive) return await finish(); // already paid: only putting it live is left
      const res = await fetch(`/api/pay/${slug}/order`, { method: "POST", headers: { "x-edit-key": editKey, "Content-Type": "application/json" }, body: "{}" });
      const order = (await res.json().catch(() => ({}))) as Partial<Order> & { provider?: string; error?: string };
      if (!res.ok) return setError(order.error ?? "Couldn't start the payment. Try again.");
      if (order.provider !== "razorpay") return await finish(); // practice payment (no Razorpay keys on the server)
      await loadCheckout();
      setPhase("paying");
      const result = await openCheckout(order as Order);
      if (!result) return; // the customer closed the window: nothing to do
      await finish(result);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPhase("idle");
    }
  }

  const label = phase === "starting" ? "Starting payment…" : phase === "paying" ? "Waiting for your payment…" : phase === "verifying" ? "Putting your website live…" : unconfirmed ? "Check my payment again" : paidNotLive ? "Retry putting it live" : `Pay ${formatPrice(due)} to get your website`;

  return (
    <div className="pay card">
      <div className="pay-head">
        <div>
          <p className="pay-plan">{siteType === "dynamic" ? "Dynamic website" : "Static website"}</p>
          <p className="pay-amount">{formatPrice(due)}</p>
          <p className="hint">{upgrade ? "Upgrade from Static to Dynamic" : siteType === "dynamic" ? "₹1,999 setup + ₹3,000 first year" : "One-time, no yearly fee"}</p>
        </div>
        {config?.mode === "test" && <span className="test-badge">Test mode</span>}
      </div>
      <ul className="pay-list">
        {INCLUDES[siteType].map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {error && (
        <div className="errors" role="alert">
          <p>{error}</p>
          {paidNotLive && <p>Your payment is recorded. Tap the button again to retry putting the site live.</p>}
          {unconfirmed && <p>Your payment went through. Tap the button to check it again. You won&apos;t be charged twice.</p>}
        </div>
      )}
      <button className="btn block" onClick={pay} disabled={busy} aria-busy={busy}>
        {label}
      </button>
      <p className="hint small">
        {config?.provider === "razorpay"
          ? config.mode === "live"
            ? "Pay securely with UPI, cards or netbanking through Razorpay. We never see your card details."
            : "Test payments: no real money is charged. Use Razorpay's test payment details."
          : "Test mode: no money is charged. Real payments (UPI, cards) will be added before launch."}{" "}
        By continuing you agree to the{" "}
        <a href="/terms" target="_blank" rel="noreferrer">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" target="_blank" rel="noreferrer">
          Privacy policy
        </a>
        .
      </p>
    </div>
  );
}
