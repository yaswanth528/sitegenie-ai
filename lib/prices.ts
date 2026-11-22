// Creation price, one-time (₹2,499 from 2026-11-22; the MVP scope said ₹1,999). Existing dynamic sites add ₹3,000 a year.
// Every screen reads this; nothing else should hard-code the price.
const STATIC_PRICE = 2499;
export const PRICES = { static: STATIC_PRICE, dynamic: STATIC_PRICE + 3000 } as const;
export const YEARLY = 3000; // dynamic plan renewal
export const GRACE_DAYS = 15; // online orders keep working this long after the paid year ends
export const REMIND_DAYS = 30; // remind the owner this many days before renewal

const DAY = 86_400_000;
export const addYear = (from: Date) => new Date(from.getTime() + 365 * DAY).toISOString();

type Paid = { plan: "static" | "dynamic"; paidUntil?: string | null } | null | undefined;

// "active" | "due" (renewal coming up) | "grace" (lapsed, still working) | "lapsed" (orders paused)
export function renewalState(payment: Paid, siteType: "static" | "dynamic", now = Date.now()): "none" | "active" | "due" | "grace" | "lapsed" {
  if (siteType !== "dynamic" || payment?.plan !== "dynamic" || !payment.paidUntil) return "none";
  const until = Date.parse(payment.paidUntil);
  if (now < until - REMIND_DAYS * DAY) return "active";
  if (now < until) return "due";
  if (now < until + GRACE_DAYS * DAY) return "grace";
  return "lapsed";
}
