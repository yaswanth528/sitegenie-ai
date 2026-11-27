// MOCK-TESTED: customer voice ordering. A shopper says or types an order; we match it to the shop's products;
// the shopper confirms; only then does anything reach the cart.
//
//   - lib/voiceOrder.ts: the plain-code matcher (no key, no network) and the safety check that every match passes through
//   - /api/voice-order/[slug]: with a fake Gemini, with Gemini failing, and with no key at all
//
// The model is fake (tests/helpers/mock-gemini.mjs) and the network is blocked, so no paid call is made. A pass proves
// our own code behaves as written; it does not prove real Gemini matches real speech this well.
//
// Run:  node --import ./tests/helpers/register.mjs --test tests/voice-order.mock.test.mjs
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { startMockGemini } from "./helpers/mock-gemini.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => import(pathToFileURL(path.join(root, p)).href);
const post = (body) => new Request("http://test.local/api/voice-order/x", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": `10.0.0.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify(body) });
const ctx = (slug) => ({ params: Promise.resolve({ slug }) });

const product = (name, price, extra = {}) => ({ name, price, unit: null, lowConfidence: false, description: `${name}.`, image: null, ...extra });
const ITEMS = [
  product("Cotton kurti", 800, { optionName: "Size", options: ["S", "M", "L"] }), // 0
  product("Mysore silk saree", 4500), // 1
  product("Cotton saree", 1200), // 2
  product("Gulab jamun", 20, { unit: "per piece" }), // 3
  product("Kaju katli", 450, { options: ["250 g", "500 g"] }), // 4
  product("Mango", 120, { inStock: false }), // 5
  product("Besan laddu", 300), // 6
];
const SLUG = "voice-order-test-shop";

let mock, vo, route, store;
const blockedHosts = new Set();

before(async () => {
  mock = await startMockGemini();
  for (const k of Object.keys(process.env)) if (/^(CLOUDFLARE_|BLOB_|UNSPLASH_|PIXABAY_|PEXELS_|GITHUB_|RAZORPAY_|WHATSAPP_|BREVO_|GEMINI_)/.test(k) || k === "VERCEL") delete process.env[k];
  process.env.GEMINI_API_KEY = "mock-key-not-real";
  process.env.GOOGLE_GEMINI_BASE_URL = mock.url;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url ?? String(input));
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return realFetch(input, init);
    blockedHosts.add(url.hostname);
    return Promise.reject(new TypeError(`blocked in tests: ${url.hostname}`));
  };
  vo = await load("lib/voiceOrder.ts");
  route = await load("app/api/voice-order/[slug]/route.ts");
  store = await load("lib/store.ts");
  await store.saveSite(
    {
      slug: SLUG,
      whatsapp: "919876543210",
      editKeyHash: "x",
      updatedAt: new Date().toISOString(),
      businessName: "Voice Order Test Shop",
      category: "mixed",
      language: "English",
      siteType: "dynamic",
      theme: { id: "bazaar", accent: 0, heroStyle: "full" },
      headline: "Test",
      subheadline: "Test",
      about: null,
      highlights: [],
      area: null,
      address: null,
      hours: null,
      hero: null,
      gallery: [],
      items: ITEMS,
    },
    "test fixture",
  );
});

after(async () => {
  await mock?.close();
  await rm(path.join(root, "data", "catalogues", `${SLUG}.json`), { force: true });
});

const idx = (m) => m.map((x) => [x.index, x.qty]);

// ---------- the plain-code matcher ----------

test("1. 'two items with numbers': digits and 'and' split the sentence into products with quantities", () => {
  const m = vo.matchLocally(ITEMS, "2 cotton kurti and 1 mysore silk saree");
  assert.deepEqual(idx(m), [[0, 2], [1, 1]]);
});

test("2. number words in English, Hindi and Kannada, and a dozen", () => {
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "three gulab jamun")), [[3, 3]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "teen gulab jamun aur ek cotton saree")), [[3, 3], [2, 1]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "eradu gulab jamun")), [[3, 2]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "ಎರಡು gulab jamun")), [[3, 2]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "a dozen gulab jamun")), [[3, 12]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "two dozen gulab jamun")), [[3, 24]]);
});

test("3. native digits (Devanagari, Kannada) count as numbers", () => {
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "३ gulab jamun")), [[3, 3]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "೨ cotton kurti")), [[0, 2]]);
  assert.equal(vo.asciiDigits("೦೧೨೩೪೫೬೭೮೯ ०१२ 45"), "0123456789 012 45");
});

test("4. small spelling slips and plural forms still match; 'sari' is a saree", () => {
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "1 cotton kurthi")), [[0, 1]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "2 cotton saris")), [[2, 2]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "2 besan ladoo")), [[6, 2]]);
});

test("5. the more specific product wins: 'mysore silk saree' is not 'cotton saree'", () => {
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "one mysore silk saree")), [[1, 1]]);
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "one cotton saree")), [[2, 1]]);
});

test("6. an option said in the sentence is picked up ('500 g', 'M')", () => {
  const m = vo.matchLocally(ITEMS, "1 kaju katli 500 g and 2 cotton kurti M");
  assert.equal(m[0].option, "500 g");
  assert.equal(m[1].option, "M");
});

test("7. what the shop doesn't sell comes back as not found, never as a wrong product", () => {
  const m = vo.matchLocally(ITEMS, "2 cotton kurti and 3 dragon fruit");
  assert.equal(m[0].index, 0);
  assert.equal(m[1].index, null);
  assert.match(m[1].heard, /dragon fruit/);
});

test("8. filler and polite words are ignored: 'please give me ... chahiye'", () => {
  assert.deepEqual(idx(vo.matchLocally(ITEMS, "please give me 2 gulab jamun chahiye")), [[3, 2]]);
  assert.deepEqual(vo.matchLocally(ITEMS, "hello there"), [{ index: null, qty: null, option: null, heard: "hello there" }]);
  assert.deepEqual(vo.matchLocally(ITEMS, ""), []);
});

// ---------- the safety check ----------

test("9. resolveMatches: bad indexes, sold-out items, wild quantities and wrong options are all made safe", () => {
  const r = vo.resolveMatches(ITEMS, [
    { index: 99, qty: 1, option: null, heard: "ghost" }, // no such product
    { index: -1, qty: 1, option: null, heard: "negative" },
    { index: 1.5, qty: 1, option: null, heard: "fraction" },
    { index: 5, qty: 2, option: null, heard: "mango" }, // sold out
    { index: 0, qty: 500, option: "XXL", heard: "kurti" }, // too many, option the shop doesn't have
    { index: 3, qty: -4, option: null, heard: "jamun" }, // nonsense qty counts as 1
    { index: 4, qty: 1, option: "500g", heard: "katli" }, // spacing differs, still the 500 g option
  ]);
  assert.deepEqual(r.notFound, ["ghost", "negative", "fraction"]);
  assert.deepEqual(r.soldOut, [{ name: "Mango", heard: "mango" }]);
  const kurti = r.lines.find((l) => l.index === 0);
  assert.equal(kurti.qty, 99);
  assert.equal(kurti.option, "S"); // first option, flagged as a guess
  assert.equal(kurti.optionGuessed, true);
  assert.equal(r.lines.find((l) => l.index === 3).qty, 1);
  const katli = r.lines.find((l) => l.index === 4);
  assert.equal(katli.option, "500 g");
  assert.equal(katli.optionGuessed, false);
  assert.equal(r.lines.find((l) => l.index === 3).price, 20); // the shop's price, from the product
});

test("10. resolveMatches merges the same product said twice and caps the total at 99", () => {
  const r = vo.resolveMatches(ITEMS, [
    { index: 3, qty: 10, option: null, heard: "jamun" },
    { index: 3, qty: 5, option: null, heard: "jamun again" },
    { index: 3, qty: 90, option: null, heard: "more jamun" },
    { index: 0, qty: 1, option: "S", heard: "kurti s" },
    { index: 0, qty: 1, option: "L", heard: "kurti l" }, // different size: its own line
  ]);
  assert.equal(r.lines.length, 3);
  assert.equal(r.lines.find((l) => l.index === 3).qty, 99);
});

// ---------- the API route ----------

test("11. with Gemini: the model's answer is used, made safe, and costs exactly one call", async () => {
  mock.state.orderMatches = [
    { index: 2, qty: 3, option: null, heard: "teen cotton saree" },
    { index: 99, qty: 1, option: null, heard: "made up product" },
    { index: 5, qty: 1, option: null, heard: "mango" },
    { index: 0, qty: 400, option: "M", heard: "kurti" },
  ];
  const before = mock.count("matchOrder");
  const res = await route.POST(post({ transcript: "teen cotton saree aur ek kurti medium" }), ctx(SLUG));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.via, "gemini");
  assert.equal(mock.count("matchOrder") - before, 1);
  assert.deepEqual(body.lines.map((l) => [l.index, l.qty, l.option]), [[2, 3, null], [0, 99, "M"]]);
  assert.deepEqual(body.notFound, ["made up product"]);
  assert.equal(body.soldOut[0].name, "Mango");
});

test("12. prices come from the shop, never from what the customer said", async () => {
  mock.state.orderMatches = [{ index: 0, qty: 1, option: "S", heard: "kurti for 1 rupee" }];
  const res = await route.POST(post({ transcript: "one cotton kurti for 1 rupee" }), ctx(SLUG));
  const body = await res.json();
  assert.equal(body.lines[0].price, 800);
});

test("13. Gemini down: plain code still matches the order, with no crash", async () => {
  mock.state.failAll = true; // the Gemini library retries a failed call once, so fail every call, not just the next
  let res;
  try {
    res = await route.POST(post({ transcript: "2 cotton kurti and 1 gulab jamun" }), ctx(SLUG));
  } finally {
    mock.state.failAll = false;
  }
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.via, "local");
  assert.deepEqual(body.lines.map((l) => [l.index, l.qty]), [[0, 2], [3, 1]]);
});

test("14. Gemini answers with nothing: plain code gets a go before 'nothing found'", async () => {
  mock.state.orderMatches = [];
  const res = await route.POST(post({ transcript: "3 gulab jamun" }), ctx(SLUG));
  const body = await res.json();
  assert.equal(body.via, "local");
  assert.deepEqual(body.lines.map((l) => [l.index, l.qty]), [[3, 3]]);
});

test("15. no key at all (a fresh Docker run): typing an order works and Gemini is never called", async () => {
  const key = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const before = mock.count("matchOrder");
    const res = await route.POST(post({ transcript: "ek kaju katli 500 g aur do cotton saree" }), ctx(SLUG));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.via, "local");
    assert.equal(mock.count("matchOrder"), before);
    assert.deepEqual(body.lines.map((l) => [l.index, l.qty, l.option]), [[4, 1, "500 g"], [2, 2, null]]);
  } finally {
    process.env.GEMINI_API_KEY = key;
  }
});

test("16. bad requests: unknown shop, bad slug, empty or non-text order, broken JSON", async () => {
  assert.equal((await route.POST(post({ transcript: "2 kurti" }), ctx("no-such-shop-123"))).status, 404);
  assert.equal((await route.POST(post({ transcript: "2 kurti" }), ctx("../etc/passwd"))).status, 404);
  assert.equal((await route.POST(post({ transcript: "" }), ctx(SLUG))).status, 400);
  assert.equal((await route.POST(post({ transcript: 42 }), ctx(SLUG))).status, 400);
  const broken = new Request("http://test.local/api/voice-order/x", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "10.9.9.9" }, body: "{not json" });
  assert.equal((await route.POST(broken, ctx(SLUG))).status, 400);
});

test("17. a very long order is cut off before matching; nothing real was contacted", async () => {
  mock.state.orderMatches = [];
  const res = await route.POST(post({ transcript: "2 cotton kurti ".repeat(2000) }), ctx(SLUG));
  assert.equal(res.status, 200);
  assert.deepEqual([...blockedHosts], []);
});
