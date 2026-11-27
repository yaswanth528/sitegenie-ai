// Voice ordering for customers: a shopper says (or types) what they want, in their own words and
// language, and we work out which of the shop's products they mean, how many of each, and which
// option (size, weight...) so the cart can be filled for them.
//
// Two ways to match, and both end in the same safety check (resolveMatches):
//   1. Gemini reads the sentence (lib/ai.ts matchOrder): best for messy speech and many languages.
//   2. matchLocally: plain code, no key and no network. Handles "2 kurti and 1 saree", number words
//      in English, Hindi and Kannada, native digits, "a dozen", and small spelling slips. It is what
//      keeps ordering working when no Gemini key is set (for example in a fresh Docker run).
// Whatever produced the matches, nothing reaches the cart until the shopper confirms the list, and
// prices always come from the shop's saved products, never from the sentence.
import type { Product } from "./schema";

export type RawMatch = {
  index: number | null; // which product in the shop's list; null = nothing in the shop fits
  qty: number | null; // null = not said (counts as 1)
  option: string | null; // the size / weight / colour they said, if any
  heard: string; // the words that were matched, shown back to the shopper
};

export type MatchedLine = {
  index: number;
  name: string;
  price: number | null;
  qty: number;
  option: string | null; // the chosen option, null if the product has none
  optionIndex: number; // -1 if the product has no options
  options: string[]; // all choices, so the shopper can change it before adding
  optionGuessed: boolean; // the product has options but none was said: the first one is pre-selected
  heard: string;
};

export type VoiceOrderResult = {
  lines: MatchedLine[];
  soldOut: { name: string; heard: string }[];
  notFound: string[]; // what the shopper said that the shop doesn't sell (or we could not place)
};

export const MAX_QTY = 99;
export const MAX_TRANSCRIPT = 600;

// ---------- text helpers ----------

// First code point of each script's digit zero, so "೨" (Kannada 2) or "३" (Devanagari 3) becomes 2 and 3.
const DIGIT_ZEROS = [0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66];

export function asciiDigits(text: string): string {
  return text.replace(/\p{Nd}/gu, (ch) => {
    const code = ch.codePointAt(0)!;
    const zero = DIGIT_ZEROS.find((z) => code >= z && code <= z + 9);
    return zero === undefined ? ch : String(code - zero);
  });
}

// Lower case, native digits to 0-9, punctuation to spaces; letters of every script are kept.
export function normalise(text: string): string {
  return asciiDigits(text.normalize("NFKC"))
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{Nd}.]+/gu, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Number words people actually say when shopping, in English, Hindi (Latin and Devanagari) and Kannada
// (Latin and Kannada script). Not exhaustive: Gemini covers the long tail, and the shopper confirms the list.
const NUMBER_WORDS: Record<string, number> = {
  // English
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, dozen: 12, couple: 2, pair: 2,
  // Hindi
  ek: 1, एक: 1, do: 2, दो: 2, teen: 3, तीन: 3, char: 4, chaar: 4, चार: 4, paanch: 5, panch: 5, पाँच: 5, पांच: 5,
  chhe: 6, cheh: 6, छह: 6, saat: 7, सात: 7, aath: 8, आठ: 8, nau: 9, नौ: 9, das: 10, दस: 10, darjan: 12, दर्जन: 12,
  // Kannada
  ondu: 1, ಒಂದು: 1, eradu: 2, ಎರಡು: 2, mooru: 3, ಮೂರು: 3, naalku: 4, nalku: 4, ನಾಲ್ಕು: 4, aidu: 5, ಐದು: 5,
  aaru: 6, ಆರು: 6, ezhu: 7, elu: 7, ಏಳು: 7, entu: 8, ಎಂಟು: 8, ombattu: 9, ಒಂಬತ್ತು: 9, hattu: 10, ಹತ್ತು: 10,
};

// Words that join two items in a sentence ("2 kurti AND 1 saree"), in the same three languages.
const JOINERS = new Set(["and", "plus", "also", "then", "with", "aur", "और", "mattu", "mathu", "ಮತ್ತು", "ಹಾಗೂ"]);

// Words that carry no product meaning: filler and units. Dropped before matching names.
const FILLER = new Set([
  "i", "want", "need", "please", "give", "me", "get", "order", "send", "add", "to", "my", "cart", "of", "the", "some", "for",
  "kg", "kgs", "kilo", "kilos", "gram", "grams", "g", "piece", "pieces", "pcs", "packet", "packets", "box", "boxes", "plate", "plates",
  "chahiye", "dijiye", "kodi", "beku", "ಬೇಕು", "ಕೊಡಿ", "चाहिए", "दीजिए", "ದಯವಿಟ್ಟು",
]);

const stem = (w: string) => (w.length > 3 && w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

// True when two words are the same or one typing/hearing slip apart (kurti / kurthi, saree / sari).
function close(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.slice(i) === l.slice(i + 1);
}

// Spellings shoppers use for the same thing; both sides of a comparison go through this.
const SPELLINGS: Record<string, string> = { sari: "saree", saris: "saree", sarees: "saree", ladoo: "laddu", laddoo: "laddu", ladu: "laddu", ladoos: "laddu", laddus: "laddu" };

const wordsOf = (text: string) => normalise(text).split(" ").filter(Boolean).map((w) => SPELLINGS[w] ?? w);
const keyWords = (text: string) => wordsOf(text).filter((w) => !FILLER.has(w) && !(w in NUMBER_WORDS) && !/^\d/.test(w)).map(stem);

// ---------- the local matcher ----------

// Weight and volume words: "500 g", "1 kg". A number right before one of these is a size or weight, not a head-count,
// when the product has that as a choice (the product's own options decide, see matchLocally).
const UNITS = new Set(["g", "gm", "gms", "gram", "grams", "kg", "kgs", "kilo", "kilos", "ml", "l", "litre", "litres", "liter", "liters"]);

// A number the shopper said in this piece of the sentence: a digit string or a number word.
function quantityIn(words: string[]): number | null {
  for (const w of words) {
    if (/^\d+(\.\d+)?$/.test(w)) {
      const n = Number(w);
      if (n >= 1) return Math.min(MAX_QTY, Math.round(n));
    }
    if (w in NUMBER_WORDS) return NUMBER_WORDS[w];
  }
  return null;
}

// Cut the sentence into one piece per product: at commas and full stops, at joiner words, and
// before a number that follows a product name ("kurti 2 saree 1" or "2 kurti 1 saree").
function pieces(text: string): string[] {
  const rough = asciiDigits(text.normalize("NFKC")).toLowerCase().split(/[,;\n]|\.(?!\d)/);
  const out: string[] = [];
  for (const chunk of rough) {
    const words = chunk.replace(/[^\p{L}\p{M}\p{Nd}.\s]+/gu, " ").split(/\s+/).filter(Boolean);
    let cur: string[] = [];
    let sawName = false;
    let bareNumber = false; // the piece already has a head-count that isn't attached to a unit ("1 kaju katli ...")
    for (let k = 0; k < words.length; k++) {
      const w = words[k];
      if (JOINERS.has(w)) {
        if (cur.length) out.push(cur.join(" "));
        cur = [];
        sawName = false;
        bareNumber = false;
        continue;
      }
      const isNum = /^\d+$/.test(w) || (w in NUMBER_WORDS && w !== "a" && w !== "an" && w !== "do" && w !== "का");
      const withUnit = isNum && UNITS.has(words[k + 1] ?? "");
      // A number after a product name starts the next product ("kurti 2 saree 1"), except a weight/size that
      // belongs to the product before it ("1 kaju katli 500 g").
      if (isNum && sawName && !(withUnit && bareNumber)) {
        out.push(cur.join(" "));
        cur = [];
        sawName = false;
        bareNumber = false;
      }
      cur.push(w);
      if (isNum && !withUnit) bareNumber = true;
      if (!isNum && !FILLER.has(w) && !(w in NUMBER_WORDS)) sawName = true;
    }
    if (cur.length) out.push(cur.join(" "));
  }
  return out.map((p) => p.trim()).filter((p) => p.length > 1);
}

// How well does this piece of speech name this product? 0 to 1: the share of the product's own
// words that were said (so "cotton kurti" scores 1 for "2 cotton kurti" and 0.5 for "kurti").
function score(item: Product, spoken: string[]): number {
  const own = keyWords(item.name);
  if (!own.length) return 0;
  const hit = own.filter((w) => spoken.some((s) => close(s, w))).length;
  // Words the shopper said that the product name doesn't have lower the score a little, so
  // "mysore silk saree" beats "silk saree" when all three words were said.
  const extra = spoken.filter((s) => !own.some((w) => close(s, w))).length;
  return hit / own.length - Math.min(0.3, extra * 0.05);
}

export function matchLocally(items: Product[], transcript: string): RawMatch[] {
  const out: RawMatch[] = [];
  for (const piece of pieces(transcript.slice(0, MAX_TRANSCRIPT))) {
    const words = wordsOf(piece);
    const spoken = keyWords(piece);
    if (!spoken.length) continue; // only a number or filler: nothing to match
    let best = -1;
    let bestScore = 0;
    items.forEach((it, i) => {
      const s = score(it, spoken);
      if (s > bestScore + 1e-9 || (Math.abs(s - bestScore) < 1e-9 && s > 0 && keyWords(it.name).length > keyWords(items[best]?.name ?? "").length)) {
        best = i;
        bestScore = s;
      }
    });
    // Quantity from the words left once an option such as "500 g" has been taken out of them.
    const quantity = (rest: string[]) => {
      let qty = quantityIn(rest);
      if (rest.includes("dozen") || rest.includes("darjan") || rest.includes("दर्जन")) qty = (qty && qty !== 12 ? qty : 1) * 12;
      return qty;
    };
    if (best < 0 || bestScore < 0.5) {
      out.push({ index: null, qty: quantity(words), option: null, heard: piece });
      continue;
    }
    // An option said in the same piece: "medium kurti", "500 g laddu". Whole-word match against the choices.
    const item = items[best];
    const rest = [...words];
    const option =
      item.options?.find((o) => {
        const ow = wordsOf(o);
        return ow.length > 0 && ow.every((w) => words.includes(w));
      }) ?? null;
    if (option) for (const w of wordsOf(option)) rest.splice(rest.indexOf(w), 1);
    out.push({ index: best, qty: quantity(rest), option, heard: piece });
  }
  return out;
}

// ---------- the safety check shared by both matchers ----------

const optionKey = (s: string) => normalise(s).replace(/\s+/g, "");

// Turn raw matches (from Gemini or from matchLocally) into lines that are safe to show and add:
// real product, in stock, sensible quantity, a real option. Repeats of the same product are merged.
export function resolveMatches(items: Product[], raw: RawMatch[]): VoiceOrderResult {
  const lines: MatchedLine[] = [];
  const soldOut: VoiceOrderResult["soldOut"] = [];
  const notFound: string[] = [];
  for (const m of raw) {
    const heard = String(m.heard ?? "").trim().slice(0, 80);
    const i = m.index;
    if (i === null || i === undefined || !Number.isInteger(i) || i < 0 || i >= items.length) {
      if (heard) notFound.push(heard);
      continue;
    }
    const item = items[i];
    if (item.inStock === false) {
      if (!soldOut.some((s) => s.name === item.name)) soldOut.push({ name: item.name, heard });
      continue;
    }
    const qty = Number.isFinite(m.qty) && m.qty! >= 1 ? Math.min(MAX_QTY, Math.round(m.qty!)) : 1;
    const options = item.options ?? [];
    let optionIndex = -1;
    let guessed = false;
    if (options.length) {
      const said = m.option ? optionKey(m.option) : "";
      optionIndex = said ? options.findIndex((o) => optionKey(o) === said) : -1;
      if (optionIndex < 0) {
        optionIndex = 0;
        guessed = true;
      }
    }
    const option = optionIndex >= 0 ? options[optionIndex] : null;
    const same = lines.find((l) => l.index === i && l.optionIndex === optionIndex);
    if (same) same.qty = Math.min(MAX_QTY, same.qty + qty);
    else lines.push({ index: i, name: item.name, price: item.price, qty, option, optionIndex, options, optionGuessed: guessed, heard });
  }
  return { lines, soldOut, notFound };
}
