// Payment rules and deploying a site to its own hosting.
import { deployToPages } from "./cloudflare";
import { PRICES, YEARLY, addYear, renewalState } from "./prices";
import { razorpayReady } from "./razorpay";
import type { Site } from "./schema";
import { renderStandalone } from "./standalone";
import { ConflictError, getSiteRev, saveSite } from "./store";


// What the owner has to pay now for their current site type.
export function amountDue(site: Site): number {
  const paid = site.payment;
  if (!paid) return PRICES[site.siteType];
  if (site.siteType === "dynamic" && paid.plan === "static") return PRICES.dynamic - PRICES.static; // upgrade
  return 0;
}

// The yearly renewal for dynamic sites, payable from 30 days before the paid year ends.
export function renewalDue(site: Site): number {
  const state = renewalState(site.payment, site.siteType);
  return state === "due" || state === "grace" || state === "lapsed" ? YEARLY : 0;
}

export const paymentMode = (): "test" | "live" | "off" =>
  process.env.PAYMENT_MODE === "live" ? "live" : process.env.PAYMENT_MODE === "off" ? "off" : "test";

// Who takes the money. With Razorpay keys set it is always Razorpay (test keys move no real money).
// Without keys, the app keeps its pretend "test" payment, unless PAYMENT_MODE=live or off, which
// refuse to pretend. PAYMENT_MODE=off switches payments off entirely.
export function paymentProvider(): "razorpay" | "simulated" | "off" {
  if (process.env.PAYMENT_MODE === "off") return "off";
  if (razorpayReady()) return "razorpay";
  return process.env.PAYMENT_MODE === "live" ? "off" : "simulated";
}

// What this site owes right now, worked out on the server only: the browser never names an amount.
export function chargeFor(site: Site, renew: boolean): { due: number; renewal: number; charge: number } {
  const due = amountDue(site);
  const renewal = due === 0 && renew ? renewalDue(site) : 0;
  return { due, renewal, charge: due + renewal };
}

// The site as it is after a payment of `charge` rupees (a year of online orders from today, or from
// the current end date when renewing early, for the yearly plan).
export function withPayment(
  site: Site,
  p: { charge: number; renewal: number; reference: string; mode: "test" | "live"; gateway: "razorpay" | "simulated"; paymentId?: string },
): Site {
  const now = new Date();
  const current = site.payment?.paidUntil ? Date.parse(site.payment.paidUntil) : 0;
  const paidUntil = site.siteType === "dynamic" ? addYear(new Date(Math.max(now.getTime(), p.renewal ? current : 0))) : null;
  return {
    ...site,
    payment: {
      plan: site.siteType,
      amount: p.charge + (site.payment?.amount ?? 0),
      mode: p.mode,
      gateway: p.gateway,
      reference: p.reference,
      paymentIds: [...(site.payment?.paymentIds ?? []), ...(p.paymentId ? [p.paymentId] : [])],
      paidAt: now.toISOString(),
      paidUntil,
    },
    renewalReminderSentFor: null,
  };
}

export async function deploySite(site: Site, appOrigin: string): Promise<Site> {
  const { project, url } = await deployToPages(site.slug, await renderStandalone(site, appOrigin));
  const live = { provider: "cloudflare" as const, project, url, deployedAt: new Date().toISOString(), updatedAt: site.updatedAt };
  // Record the deploy on the newest saved version, so a deploy never undoes a newer edit.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { site: latest, rev } = await getSiteRev(site.slug);
    if (!latest) break;
    const next: Site = { ...latest, live };
    try {
      await saveSite(next, `Deploy ${site.slug} to ${url}`, rev);
      return next;
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
    }
  }
  return { ...site, live };
}

export const appOrigin = (req: Request) => process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
