// MOCK-TESTED PAYMENTS (server side) with a FAKE Razorpay and a fake Gemini. No real Razorpay call, no money, no account.
//
//   order (server decides the amount) -> checkout signature -> Razorpay re-check (slug, amount, captured)
//   -> payment recorded once; and the webhook safety net (bad signature, idempotent, mismatch, nothing due).
//
// What this does NOT prove: that the real Razorpay dashboard webhook is registered, that real checkout (UPI/cards)
// works, or the versioned-save race between the browser and the webhook. That race needs the real D1 database:
// local files have no version numbers, so ConflictError can't happen here. Cloudflare is not configured in tests, so
// the "put it live" step fails after payment on purpose (the payment record is what is checked).
//
// Run:  node --import ./tests/helpers/register.mjs --test tests/payments.mock.test.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SAMPLE_TRANSCRIPT, startMockGemini } from "./helpers/mock-gemini.mjs";
import { FAKE_KEY_ID, FAKE_KEY_SECRET, startMockRazorpay } from "./helpers/mock-razorpay.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => import(pathToFileURL(path.join(root, p)).href);
// every request comes from its own fake device, so the per-device fair-use limits (12 orders an hour) don't interfere
let ipSeq = 0;
const req = (url, init = {}) => new Request(`http://test.local${url}`, { ...init, headers: { "x-real-ip": `10.9.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`, ...init.headers } });
const json = (url, body, headers = {}) => req(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const ctx = (slug) => ({ params: Promise.resolve({ slug }) });
const WEBHOOK_SECRET = "fake-webhook-secret-not-real";
const checkoutSig = (orderId, paymentId) => createHmac("sha256", FAKE_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");

let gemini, rz, routes, draft, PRICE; // PRICE = what a static site costs now (read from lib/prices.ts, so the tests survive a price change)
const created = [];

before(async () => {
  gemini = await startMockGemini();
  rz = await startMockRazorpay();
  for (const k of Object.keys(process.env)) if (/^(CLOUDFLARE_|BLOB_|UNSPLASH_|PIXABAY_|PEXELS_|GITHUB_|RAZORPAY_|WHATSAPP_|BREVO_|GEMINI_|PAYMENT_)/.test(k) || k === "VERCEL") delete process.env[k];
  process.env.GEMINI_API_KEY = "mock-key-not-real";
  process.env.GOOGLE_GEMINI_BASE_URL = gemini.url;
  process.env.RAZORPAY_KEY_ID = FAKE_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = FAKE_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.RAZORPAY_API_BASE = rz.url;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url ?? String(input));
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return realFetch(input, init);
    return Promise.reject(new TypeError(`blocked in tests: ${url.hostname}`));
  };
  PRICE = (await load("lib/prices.ts")).PRICES.static;
  routes = {
    build: await load("app/api/build/route.ts"),
    pages: await load("app/api/pages/route.ts"),
    order: await load("app/api/pay/[slug]/order/route.ts"),
    pay: await load("app/api/pay/[slug]/route.ts"),
    webhook: await load("app/api/razorpay/webhook/route.ts"),
  };
  const b = await routes.build.POST(json("/api/build", { transcript: SAMPLE_TRANSCRIPT, media: [], generateImages: false }));
  draft = await b.json();
});

after(async () => {
  await gemini?.close();
  await rz?.close();
  for (const slug of created) await rm(path.join(root, "data", "catalogues", `${slug}.json`), { force: true });
});

// A fresh unpaid static site (₹1,999) with its own name, so tests don't share state.
async function newSite(name) {
  const r = await routes.pages.POST(json("/api/pages", { ...draft, businessName: name }));
  assert.equal(r.status, 200);
  const s = await r.json();
  created.push(s.slug);
  return { slug: s.slug, headers: { "x-edit-key": s.editKey } };
}
const stored = async (slug) => JSON.parse(await readFile(path.join(root, "data", "catalogues", `${slug}.json`), "utf8"));
async function startOrder(s) {
  const r = await routes.order.POST(json(`/api/pay/${s.slug}/order`, {}, s.headers), ctx(s.slug));
  return { res: r, body: await r.json() };
}
const payRoute = (s, orderId, paymentId, signature = checkoutSig(orderId, paymentId)) =>
  routes.pay.POST(json(`/api/pay/${s.slug}`, { razorpay: { order_id: orderId, payment_id: paymentId, signature } }, s.headers), ctx(s.slug));
const hook = (event, secret = WEBHOOK_SECRET) => {
  const raw = JSON.stringify(event);
  return routes.webhook.POST(req("/api/razorpay/webhook", { method: "POST", body: raw, headers: { "x-razorpay-signature": createHmac("sha256", secret).update(raw).digest("hex") } }));
};
const captured = (p) => ({ event: "payment.captured", payload: { payment: { entity: { id: p.id, order_id: p.order_id } } } });

test("1. order: the server sets the amount (the site price, in paise) and the browser cannot change it", async () => {
  const s = await newSite("Pay Test One");
  let r = await routes.order.POST(json(`/api/pay/${s.slug}/order`, {}, { "x-edit-key": "wrong-key-wrong-key-wrong" }), ctx(s.slug));
  assert.equal(r.status, 403, "no edit key -> refused, no order created");
  assert.equal(rz.state.orders.size, 0);
  const { res, body } = await startOrder({ ...s, headers: s.headers });
  assert.equal(res.status, 200);
  assert.equal(body.provider, "razorpay");
  assert.equal(body.amount, PRICE * 100);
  assert.equal(body.keyId, FAKE_KEY_ID);
  assert.ok(!JSON.stringify(body).includes(FAKE_KEY_SECRET), "the secret never leaves the server");
  assert.equal(rz.state.orders.get(body.orderId).notes.slug, s.slug);
  // an amount sent by the browser is ignored
  r = await routes.order.POST(json(`/api/pay/${s.slug}/order`, { amount: 100, charge: 1 }, s.headers), ctx(s.slug));
  assert.equal((await r.json()).amount, PRICE * 100);
});

test("2. wrong keys at Razorpay: the customer is told it is a setup problem (401), not shown Razorpay's error", async () => {
  const s = await newSite("Pay Test Keys");
  const old = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = "some-other-secret";
  const { res, body } = await startOrder(s);
  process.env.RAZORPAY_KEY_SECRET = old;
  assert.equal(res.status, 401);
  assert.match(body.error, /isn't set up correctly/);
  assert.ok(!/Authentication failed/.test(body.error));
});

test("3. a forged or tampered payment is refused and the site stays unpaid", async () => {
  const s = await newSite("Pay Test Forged");
  const { body } = await startOrder(s);
  const p = rz.pay(body.orderId);
  let r = await payRoute(s, body.orderId, p.id, "deadbeef".repeat(8));
  assert.equal(r.status, 400, "bad checkout signature");
  r = await routes.pay.POST(json(`/api/pay/${s.slug}`, {}, s.headers), ctx(s.slug));
  assert.equal(r.status, 400, "no payment details at all");
  r = await payRoute(s, body.orderId, p.id, "");
  assert.equal(r.status, 400);
  assert.equal((await stored(s.slug)).payment, undefined, "nothing recorded");
});

test("4. a real payment of the wrong amount, or on another site's order, is refused", async () => {
  const s = await newSite("Pay Test Mismatch");
  const other = await newSite("Pay Test Other");
  const { body } = await startOrder(s);
  const short = rz.pay(body.orderId, { amount: PRICE * 100 + 100 }); // paid ₹1 more than the order
  let r = await payRoute(s, body.orderId, short.id);
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /amount/i);
  // somebody else's paid order presented for this site
  const { body: ob } = await startOrder(other);
  const p = rz.pay(ob.orderId);
  r = await payRoute(s, ob.orderId, p.id);
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /different website/i);
  // a payment that belongs to a different order than the one named
  const { body: b2 } = await startOrder(s);
  const stray = rz.pay(b2.orderId, { orderOverride: ob.orderId });
  r = await payRoute(s, b2.orderId, stray.id);
  assert.equal(r.status, 400);
  assert.equal((await stored(s.slug)).payment, undefined);
  assert.equal((await stored(other.slug)).payment, undefined);
});

test("5. a good payment is recorded once: an 'authorized' payment is captured, replays add nothing", async () => {
  const s = await newSite("Pay Test Good");
  const { body } = await startOrder(s);
  const p = rz.pay(body.orderId, { status: "authorized" });
  const r = await payRoute(s, body.orderId, p.id);
  assert.equal(rz.state.payments.get(p.id).status, "captured", "the server captured the authorized payment");
  assert.equal(r.status, 502, "going live fails here on purpose (no Cloudflare in tests) ...");
  assert.equal((await r.json()).paid, PRICE, "... but the response says what was paid");
  let site = await stored(s.slug);
  assert.equal(site.payment.amount, PRICE);
  assert.deepEqual(site.payment.paymentIds, [p.id]);
  assert.equal(site.payment.gateway, "razorpay");
  assert.equal(site.payment.mode, "test");
  // pressing the button again / replaying the same payment never records a second payment
  await payRoute(s, body.orderId, p.id);
  site = await stored(s.slug);
  assert.equal(site.payment.amount, PRICE);
  assert.deepEqual(site.payment.paymentIds, [p.id]);
  // and a paid site refuses to start another order
  const again = await startOrder(s);
  assert.equal(again.res.status, 400);
  assert.match(again.body.error, /nothing to pay/i);
});

test("6. a payment that is only 'created' (not completed) is not accepted", async () => {
  const s = await newSite("Pay Test Pending");
  const { body } = await startOrder(s);
  const p = rz.pay(body.orderId, { status: "created" });
  const r = await payRoute(s, body.orderId, p.id);
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /hasn't been completed/i);
  assert.equal((await stored(s.slug)).payment, undefined);
});

test("7. webhook: a bad or missing signature is refused; a paid-in-the-browser payment is not recorded twice", async () => {
  const s = await newSite("Pay Test Hook A");
  const { body } = await startOrder(s);
  const p = rz.pay(body.orderId);
  let r = await hook(captured(p), "wrong-secret");
  assert.equal(r.status, 401);
  r = await routes.webhook.POST(req("/api/razorpay/webhook", { method: "POST", body: JSON.stringify(captured(p)) }));
  assert.equal(r.status, 401, "no signature header");
  assert.equal((await stored(s.slug)).payment, undefined, "refused webhooks record nothing");
  await payRoute(s, body.orderId, p.id); // the browser records it
  r = await hook(captured(p));
  assert.deepEqual(await r.json(), { ok: true, already: true });
  assert.equal((await stored(s.slug)).payment.amount, PRICE);
});

test("8. webhook alone (customer closed the tab after paying): recorded once, a repeat is a no-op", async () => {
  const s = await newSite("Pay Test Hook B");
  const { body } = await startOrder(s);
  const p = rz.pay(body.orderId);
  let r = await hook(captured(p));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, recorded: true });
  let site = await stored(s.slug);
  assert.equal(site.payment.amount, PRICE);
  assert.deepEqual(site.payment.paymentIds, [p.id]);
  r = await hook(captured(p));
  assert.deepEqual(await r.json(), { ok: true, already: true });
  assert.equal((await stored(s.slug)).payment.amount, PRICE);
  // other events and orders that are not ours are ignored
  r = await hook({ event: "payment.failed", payload: {} });
  assert.equal((await r.json()).ignored, "payment.failed");
});

test("9. webhook with a payment that doesn't match what is due is ignored, nothing is recorded", async () => {
  const s = await newSite("Pay Test Hook C");
  const { body } = await startOrder(s);
  const p = rz.pay(body.orderId, { amount: PRICE * 100 + 500 });
  const r = await hook(captured(p));
  assert.equal((await r.json()).ignored, "mismatch");
  assert.equal((await stored(s.slug)).payment, undefined);
});

test("10. KNOWN GAP (documented, not fixed): a second payment on an already-paid site is ignored, so that money has no record", async () => {
  const s = await newSite("Pay Test Double");
  const first = await startOrder(s);
  // the customer opens checkout twice (two tabs) and pays both orders
  const second = await startOrder(s);
  const p1 = rz.pay(first.body.orderId);
  const p2 = rz.pay(second.body.orderId);
  await payRoute(s, first.body.orderId, p1.id);
  const r = await hook(captured(p2));
  assert.equal((await r.json()).ignored, "nothing due");
  const site = await stored(s.slug);
  assert.deepEqual(site.payment.paymentIds, [p1.id], "only the first payment is on record");
  console.log("  NOTE: payment", p2.id, "was captured by Razorpay but is not recorded or refunded anywhere in our data.");
});
