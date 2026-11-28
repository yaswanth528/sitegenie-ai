import { NextResponse } from "next/server";
import { matchOrder } from "@/lib/ai";
import { limit } from "@/lib/ratelimit";
import { getPublicSite, validSlug } from "@/lib/store";
import { MAX_TRANSCRIPT, matchLocally, resolveMatches, type RawMatch } from "@/lib/voiceOrder";

// A customer says (or types) what they want. We work out which of this shop's products they mean and send back
// lines for the shopper to confirm; nothing is added to a cart or ordered here. The product list comes from the
// shop's saved site, never from the browser, so a customer can't point us at products that aren't there.
// Gemini reads the sentence when a key is set and it answers in time; otherwise (or when it fails) plain code
// matches it, so ordering by typing keeps working with no key at all.
export const maxDuration = 30;

const GEMINI_ORDER_MS = 12_000;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("The order model took too long")), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const stop = await limit(req, "voiceOrder");
  if (stop) return stop;
  const { slug } = await params;
  if (!validSlug(slug)) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  let transcript = "";
  try {
    const body = (await req.json()) as { transcript?: unknown };
    transcript = typeof body.transcript === "string" ? body.transcript.trim().slice(0, MAX_TRANSCRIPT) : "";
  } catch {
    return NextResponse.json({ error: "Send the order as JSON." }, { status: 400 });
  }
  if (transcript.length < 2) return NextResponse.json({ error: "We didn't catch what you want. Try again, or type it." }, { status: 400 });

  const site = await getPublicSite(slug);
  if (!site) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  if (!site.items.length) return NextResponse.json({ error: "This shop has no products yet." }, { status: 409 });

  let raw: RawMatch[] | null = null;
  let via: "gemini" | "local" = "local";
  if (process.env.GEMINI_API_KEY) {
    try {
      raw = await withTimeout(matchOrder(site.items, transcript), GEMINI_ORDER_MS);
      via = "gemini";
    } catch (err) {
      console.error("voice-order: Gemini failed, matching with plain code:", (err as Error).message);
    }
  }
  let result = resolveMatches(site.items, raw ?? matchLocally(site.items, transcript));
  // Gemini answered but found nothing at all: give the plain matcher a go before saying "nothing found".
  if (via === "gemini" && !result.lines.length && !result.soldOut.length) {
    const local = resolveMatches(site.items, matchLocally(site.items, transcript));
    if (local.lines.length || local.soldOut.length) {
      result = local;
      via = "local";
    }
  }
  return NextResponse.json({ via, heard: transcript, ...result });
}
