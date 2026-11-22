// MOCK-TESTED END-TO-END FLOW (server side), with synthetic data and a fake Gemini.
//
//   audio -> /api/transcribe -> transcript -> /api/check -> /api/build -> /api/pages (save)
//         -> voice edit (/api/pages/[slug] POST preview, PUT save, DELETE undo) -> "not happy" edit (/api/revise)
//
// It runs the app's own route handlers, so it exercises our real validation, mapping, saving and error handling.
// The model is fake (tests/helpers/mock-gemini.mjs) and the network is blocked, so: no paid call, no publishing,
// no account. A pass here does NOT prove the live site works: real Gemini, Vercel, Cloudflare and browsers are untested.
//
// Run:  node --import ./tests/helpers/register.mjs --test tests/flow.mock.test.mjs
import assert from "node:assert/strict";
import { rm, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SAMPLE_TRANSCRIPT, startMockGemini } from "./helpers/mock-gemini.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => import(pathToFileURL(path.join(root, p)).href);
const req = (url, init = {}) => new Request(`http://test.local${url}`, init);
const json = (url, body, headers = {}) => req(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const ctx = (slug) => ({ params: Promise.resolve({ slug }) });

let mock, routes;
const blockedHosts = new Set();
const createdSlugs = [];

before(async () => {
  mock = await startMockGemini();
  // Nothing real may be reachable: clear every service setting, point Gemini at the fake, block other hosts.
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
  routes = {
    transcribe: await load("app/api/transcribe/route.ts"),
    check: await load("app/api/check/route.ts"),
    build: await load("app/api/build/route.ts"),
    pages: await load("app/api/pages/route.ts"),
    page: await load("app/api/pages/[slug]/route.ts"),
    revise: await load("app/api/revise/route.ts"),
  };
});

after(async () => {
  await mock?.close();
  for (const slug of createdSlugs) await rm(path.join(root, "data", "catalogues", `${slug}.json`), { force: true });
  // also remove anything this test saved under uploads/ (nothing expected: pictures are off or blocked)
  const up = path.join(root, "data", "uploads");
  for (const f of await readdir(up).catch(() => [])) if (Date.now() - Number(parseInt(f.split("-")[0], 36)) < 600000) await rm(path.join(up, f), { force: true });
});

const audioForm = (bytes, type = "audio/webm", language = "English") => {
  const f = new FormData();
  f.append("audio", new Blob([new Uint8Array(bytes)], { type }), "recording");
  f.append("language", language);
  return f;
};

test("1. recording -> transcription: audio is sent to Gemini with the chosen speech language, transcript comes back", async () => {
  const before = mock.count("transcribe");
  const res = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(3000, "audio/webm;codecs=opus", "Kannada") }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).transcript, SAMPLE_TRANSCRIPT);
  const call = mock.state.calls.filter((c) => c.kind === "transcribe").at(-1);
  assert.equal(mock.count("transcribe"), before + 1, "exactly one model call for one recording");
  assert.equal(call.model, "gemini-3.5-flash");
  assert.equal(call.audioBytes, 3000, "the audio bytes reach the model unchanged");
  assert.equal(call.promptHasLanguage, "Kannada", "the speech language the owner picked is passed as a hint");
});

test("2. transcription failures: bad input is refused before any model call; model failures degrade safely", async () => {
  const calls = mock.state.calls.length;
  let r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: new FormData() }));
  assert.equal(r.status, 400, "no audio -> 400");
  r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(5 * 1024 * 1024) }));
  assert.equal(r.status, 413, "over 4 MB -> 413");
  r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(500, "video/x-msvideo") }));
  assert.equal(r.status, 415, "unsupported format -> 415");
  assert.equal(mock.state.calls.length, calls, "refused requests made no model call");

  // Transcription retries the main model once (lib/ai.ts sets the retry count and a time limit per try),
  // so one blip is absorbed silently, on the same model, at the price of an extra request.
  let full = mock.count("transcribe");
  mock.state.failNext.push("transcribe"); // one transient failure
  r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(800) }));
  assert.equal(r.status, 200, "a single failure is retried and succeeds");
  assert.equal(mock.count("transcribe") - full, 2, "a retry costs a second request");

  // Only when the first model keeps failing (its try and its one retry) does the app fall back to the everyday model.
  full = mock.count("transcribe");
  mock.state.failNext.push(...Array(2).fill("transcribe"));
  r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(800) }));
  assert.equal(r.status, 200, "falls back to the everyday model");
  const models = mock.state.calls.filter((c) => c.kind === "transcribe").slice(full).map((c) => c.model);
  assert.equal(models.length, 3, "2 failed requests on the first model (try + one retry), then 1 on the fallback");
  assert.equal(models.at(-1), "gemini-3.5-flash-lite");

  mock.state.transcript = "";
  r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(800) }));
  assert.equal(r.status, 422, "silence -> friendly 422");
  mock.state.transcript = SAMPLE_TRANSCRIPT;

  mock.state.failAll = true;
  r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(800) }));
  assert.equal(r.status, 502, "both models down -> 502, no crash");
  mock.state.failAll = false;
});

test("2b. a STUCK Gemini (never answers) ends quickly with a clear 503 the browser can read, not a 5-minute hang", async () => {
  // 2026-11-22 on the live site a recording hung for 300 s and the browser showed "Network error".
  process.env.GEMINI_TRANSCRIBE_TIMEOUT_MS = "700"; // real value is 20 s per try; shortened so the test is fast
  try {
    mock.state.hangAll = true;
    const calls = mock.count("transcribe");
    const t0 = Date.now();
    const r = await routes.transcribe.POST(req("/api/transcribe", { method: "POST", body: audioForm(800) }));
    const took = Date.now() - t0;
    assert.equal(r.status, 503, "a stuck model -> 503 JSON, not a crash or a hang");
    assert.match((await r.json()).error, /busy right now/i);
    assert.ok(took < 15000, `ended in ${took} ms`);
    const models = mock.state.calls.filter((c) => c.kind === "transcribe").slice(calls).map((c) => c.model);
    assert.deepEqual(models, ["gemini-3.5-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"], "main model try + one retry, then the fallback once");
  } finally {
    mock.state.hangAll = false;
    delete process.env.GEMINI_TRANSCRIBE_TIMEOUT_MS;
  }
});

test("3. editable transcript -> gap check: questions are returned, and a failing check never blocks building", async () => {
  let r = await routes.check.POST(json("/api/check", { transcript: SAMPLE_TRANSCRIPT }));
  assert.deepEqual((await r.json()).questions, []);
  mock.state.gaps = [{ question: "What is the price of the kurti?", reason: "missing_price" }];
  r = await routes.check.POST(json("/api/check", { transcript: "kurti, saree" }));
  assert.equal((await r.json()).questions.length, 1);
  mock.state.gaps = [];
  mock.state.failAll = true;
  const beforeCheck = mock.count("check");
  r = await routes.check.POST(json("/api/check", { transcript: SAMPLE_TRANSCRIPT }));
  assert.deepEqual(await r.json(), { questions: [] }, "check failure is swallowed");
  console.log(`  one failing check call produced ${mock.count("check") - beforeCheck} requests to the model (SDK retries)`);
  assert.ok(mock.count("check") - beforeCheck > 1, "the SDK retried the failing request");
  mock.state.failAll = false;
  r = await routes.check.POST(json("/api/check", { transcript: "hi" }));
  assert.deepEqual(await r.json(), { questions: [] }, "too-short text makes no model call");
});

let draft;
test("4. website creation: transcript -> draft (one planning call, no pictures when the owner turns them off)", async () => {
  const plans = mock.count("plan"), images = mock.count("image");
  const res = await routes.build.POST(json("/api/build", { transcript: SAMPLE_TRANSCRIPT, media: [], generateImages: false }));
  assert.equal(res.status, 200);
  draft = await res.json();
  assert.equal(draft.businessName, "Sample Silks");
  assert.equal(draft.siteType, "static");
  assert.deepEqual(draft.items.map((i) => [i.name, i.price]), [["Mysore silk saree", 4500], ["Cotton saree", 1200], ["Cotton kurti", 800]]);
  assert.equal(draft.whatsapp, "9876543210");
  assert.equal(draft.theme.layout, "lookbook", "the layout chosen from the reference industry reaches the draft");
  assert.ok(draft.items.every((i) => i.image === null) && draft.hero === null, "no pictures when generateImages is false");
  assert.equal(mock.count("plan") - plans, 1, "one planning call per build");
  assert.equal(mock.count("image") - images, 0, "no image-model call");
  assert.equal(blockedHosts.size, 0, "no outside host was even attempted");
});

test("5. build failure modes: too short, too long, model down", async () => {
  let r = await routes.build.POST(json("/api/build", { transcript: "hi" }));
  assert.equal(r.status, 400);
  r = await routes.build.POST(json("/api/build", { transcript: "x".repeat(6001) }));
  assert.equal(r.status, 400);
  mock.state.failAll = true;
  r = await routes.build.POST(json("/api/build", { transcript: SAMPLE_TRANSCRIPT, generateImages: false }));
  assert.equal(r.status, 502, "model failure -> 502 with an error message, not a crash");
  assert.ok((await r.json()).error);
  mock.state.failAll = false;
});

test("6. missing photos with picture search ON but every picture source unreachable: build still succeeds, products get no picture", async () => {
  const res = await routes.build.POST(json("/api/build", { transcript: SAMPLE_TRANSCRIPT, media: [], generateImages: true }));
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.ok(d.items.every((i) => i.image === null), "no picture found -> image stays null (the site shows a name tile)");
  assert.ok(blockedHosts.has("commons.wikimedia.org"), "the key-less Wikimedia search was attempted (and blocked here)");
  assert.ok(![...blockedHosts].some((h) => /unsplash|pixabay|pexels|cloudflare/.test(h)), "keyed sources are skipped without keys");
});

let site;
test("7. save: publishing the draft stores it; a missing WhatsApp number is refused", async () => {
  let r = await routes.pages.POST(json("/api/pages", { ...draft, whatsapp: "" }));
  assert.equal(r.status, 400, "WhatsApp number is required to publish");
  r = await routes.pages.POST(json("/api/pages", draft));
  assert.equal(r.status, 200);
  site = await r.json();
  createdSlugs.push(site.slug);
  assert.match(site.slug, /^sample-silks/);
  assert.ok(site.editKey.length >= 20);
  const stored = JSON.parse(await readFile(path.join(root, "data", "catalogues", `${site.slug}.json`), "utf8"));
  assert.equal(stored.items.length, 3);
  assert.ok(stored.editKeyHash && !JSON.stringify(stored).includes(site.editKey), "only a hash of the edit key is stored");
});

const priceOf = async (name) => JSON.parse(await readFile(path.join(root, "data", "catalogues", `${site.slug}.json`), "utf8")).items.find((i) => i.name === name).price;
test("8. voice edit: preview shows before/after and saves nothing; approving saves; undo restores", async () => {
  const headers = { "x-edit-key": site.editKey };
  let r = await routes.page.POST(json(`/api/pages/${site.slug}`, { request: "change cotton saree to 1100" }), ctx(site.slug));
  assert.equal(r.status, 403, "no edit key -> refused");
  r = await routes.page.POST(json(`/api/pages/${site.slug}`, { request: "change cotton saree to 1100" }, headers), ctx(site.slug));
  assert.equal(r.status, 200);
  const prev = await r.json();
  assert.equal(prev.before.items[1].price, 1200);
  assert.equal(prev.after.items[1].price, 1100);
  assert.equal(await priceOf("Cotton saree"), 1200, "preview alone does not change the saved site");

  r = await routes.page.PUT(req(`/api/pages/${site.slug}`, { method: "PUT", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ patch: prev.patch }) }), ctx(site.slug));
  assert.equal(r.status, 200);
  assert.equal(await priceOf("Cotton saree"), 1100, "approved edit is saved");
  assert.equal((await r.json()).canUndo, true);

  r = await routes.page.DELETE(req(`/api/pages/${site.slug}`, { method: "DELETE", headers }), ctx(site.slug));
  assert.equal(r.status, 200);
  assert.equal(await priceOf("Cotton saree"), 1200, "undo restores the previous version");
});

test("9. voice edit safety: wrong edit key is refused; nothing to change is refused", async () => {
  let r = await routes.page.POST(json(`/api/pages/${site.slug}`, { request: "x" }, { "x-edit-key": "wrong-key" }), ctx(site.slug));
  assert.equal(r.status, 403);
  r = await routes.page.POST(json(`/api/pages/${site.slug}`, { request: "  " }, { "x-edit-key": site.editKey }), ctx(site.slug));
  assert.equal(r.status, 400);
  mock.state.failAll = true;
  r = await routes.page.POST(json(`/api/pages/${site.slug}`, { request: "change cotton saree to 1100" }, { "x-edit-key": site.editKey }), ctx(site.slug));
  assert.equal(r.status, 502, "model failure during an edit -> 502, site untouched");
  mock.state.failAll = false;
  assert.equal(await priceOf("Cotton saree"), 1200);
});

test("10. 'Not happy? Say what to change' (whole-site edit): changes are applied to the draft and summarised; nothing saved", async () => {
  const res = await routes.revise.POST(json("/api/revise", { content: draft, request: "make the headline friendlier and cotton saree 1100" }));
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.equal(out.content.headline, "Silks you will love");
  assert.equal(out.content.items[1].price, 1100);
  assert.ok(out.summary.length >= 2, `summary lists what changed: ${JSON.stringify(out.summary)}`);
  assert.equal(await priceOf("Cotton saree"), 1200, "revise returns a draft; saving is a separate step");
  mock.state.failAll = true;
  const bad = await routes.revise.POST(json("/api/revise", { content: draft, request: "make it better" }));
  assert.equal(bad.status, 502);
  mock.state.failAll = false;
});

test("11. model-call accounting for one full session (feeds the cost audit; mock counts, not real usage)", () => {
  const by = Object.fromEntries(["transcribe", "check", "plan", "interpretEdit", "revise", "image"].map((k) => [k, mock.count(k)]));
  console.log("  model calls made by this whole test file:", JSON.stringify(by));
  assert.equal(by.image, 0, "image generation is off by default (needs GEMINI_IMAGES=on)");
});
