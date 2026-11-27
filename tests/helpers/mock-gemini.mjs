// A fake Gemini API for tests: runs on this computer, answers with canned synthetic data, and records every
// call so tests can count them. No network, no key, no cost. Point the real SDK at it with
// GOOGLE_GEMINI_BASE_URL (the SDK supports that variable). Results from this fake prove our own code's
// behaviour only. They do not prove the real Gemini behaves the same.
import http from "node:http";

export const SAMPLE_TRANSCRIPT =
  "Sample Silks in Bengaluru. We sell Mysore silk saree for 4500 rupees, cotton saree for 1200 rupees and cotton kurti for 800 rupees. Open 10 am to 9 pm. WhatsApp 9876543210.";

const PLAN = {
  businessName: "Sample Silks",
  language: "English",
  category: "women's ethnic wear",
  industry: "ethnic-wear",
  ownerStyleRequest: false,
  themeId: "boutique",
  accent: 0,
  layout: "lookbook",
  heroStyle: "split",
  headline: "Silks for every celebration",
  subheadline: "Mysore silk and cotton sarees, and kurtis for every day.",
  about: null,
  highlights: ["Open 10 am to 9 pm"],
  area: "Bengaluru",
  address: null,
  hours: "10 am - 9 pm",
  whatsapp: "9876543210",
  items: [
    ["Mysore silk saree", 4500, "mysore silk saree"],
    ["Cotton saree", 1200, "cotton saree"],
    ["Cotton kurti", 800, "cotton kurti"],
  ].map(([name, price, query]) => ({
    name,
    price,
    unit: null,
    lowConfidence: false,
    description: `${name}.`,
    mediaIndex: null,
    imagePrompt: `${name}, product photo, plain background`,
    imageQuery: query,
    category: null,
    askPrice: false,
    optionName: null,
    optionChoices: [],
  })),
  heroMediaIndex: null,
  galleryMediaIndexes: [],
  heroImagePrompt: "an inviting Indian saree shop interior, no text",
  heroImageQuery: "indian saree shop",
};

const REVISION = {
  question: null,
  businessName: null,
  headline: "Silks you will love",
  subheadline: null,
  about: null,
  highlights: null,
  themeId: null,
  accent: null,
  heroStyle: null,
  layout: null,
  area: null,
  address: null,
  hours: null,
  festival: null,
  festivalMessage: null,
  newHeroPhoto: null,
  items: [{ op: "update", index: 1, name: null, price: 1100, unit: null, description: null, category: null, badge: null, inStock: null, askPrice: null, newPhoto: null }],
};

const PATCH = { ops: [{ op: "set_price", index: 1, name: null, price: 1100 }], ambiguity: null };

// 1x1 JPEG, only used if a test turns image generation on.
const TINY_JPEG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

function kindOf(body) {
  const input = body.input;
  const parts = Array.isArray(input) ? input : [{ type: "text", text: String(input) }];
  const text = parts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
  if (body.response_format?.type === "image") return "image";
  if (parts.some((p) => p.type === "audio")) return "transcribe";
  if (text.includes("list what is important and missing")) return "check";
  if (text.includes("You are planning a small business's website")) return "plan";
  if (text.includes("turn a business owner's spoken edit request into a patch")) return "interpretEdit";
  if (text.includes("You are editing a small business's website")) return "revise";
  if (text.includes("Translate this small shop's website text")) return "translate";
  if (text.includes("You match a customer's spoken or typed order")) return "matchOrder";
  return "unknown";
}

export async function startMockGemini() {
  const state = { calls: [], orderMatches: [], transcript: SAMPLE_TRANSCRIPT, gaps: [], failNext: [], failAll: false, hangNext: [], hangAll: false };
  const hung = new Set(); // requests the fake never answers (a stuck Gemini), closed when the fake shuts down
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    if (req.method !== "POST" || !req.url.includes("/interactions")) {
      res.writeHead(404).end("{}");
      return;
    }
    const body = JSON.parse(raw || "{}");
    const kind = kindOf(body);
    const parts = Array.isArray(body.input) ? body.input : [];
    state.calls.push({
      kind,
      model: body.model,
      audioBytes: parts.filter((p) => p.type === "audio").reduce((n, p) => n + Buffer.byteLength(p.data ?? "", "base64"), 0),
      images: parts.filter((p) => p.type === "image").length,
      promptHasLanguage: (parts.map((p) => p.text ?? "").join(" ") + String(typeof body.input === "string" ? body.input : "")).match(/The owner picked ([A-Za-z]+)/)?.[1] ?? null,
    });
    if (state.hangAll || state.hangNext.includes(kind)) {
      if (!state.hangAll) state.hangNext.splice(state.hangNext.indexOf(kind), 1);
      hung.add(res);
      res.on("close", () => hung.delete(res));
      return; // never answer
    }
    if (state.failAll || state.failNext.includes(kind)) {
      if (!state.failAll) state.failNext.splice(state.failNext.indexOf(kind), 1);
      res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: "mock: model unavailable" } }));
      return;
    }
    const text = (t) => [{ type: "model_output", content: [{ type: "text", text: t }] }];
    let steps;
    if (kind === "transcribe") steps = text(state.transcript);
    else if (kind === "check") steps = text(JSON.stringify({ questions: state.gaps }));
    else if (kind === "plan") steps = text(JSON.stringify(PLAN));
    else if (kind === "interpretEdit") steps = text(JSON.stringify(PATCH));
    else if (kind === "revise") steps = text(JSON.stringify(REVISION));
    else if (kind === "matchOrder") steps = text(JSON.stringify({ orders: state.orderMatches }));
    else if (kind === "image") steps = [{ type: "model_output", content: [{ type: "image", data: TINY_JPEG, mime_type: "image/jpeg" }] }];
    else steps = text("{}");
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: `mock_${state.calls.length}`, status: "completed", model: body.model, steps }));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, state, count: (kind) => state.calls.filter((c) => c.kind === kind).length, close: () => new Promise((r) => { for (const h of hung) h.destroy(); server.close(r); }) };
}
