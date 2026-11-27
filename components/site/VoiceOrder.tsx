"use client";
// "Order by voice" for customers on a shop page. The shopper taps the mic (or types), says what they
// want in their own words ("two kurti and one cotton saree, medium"), and sees a list to check:
// what we understood, how many, which size. Only when they tap "Add to cart" does anything reach
// the cart. The matching is done by /api/voice-order/<slug> against the shop's real products.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "@/lib/catalogue";
import type { MatchedLine } from "@/lib/voiceOrder";
import { LANGUAGES, useSpeech } from "../useSpeech";

type Result = { via: "gemini" | "local"; heard: string; lines: MatchedLine[]; soldOut: { name: string; heard: string }[]; notFound: string[] };
export type VoiceLine = { index: number; optionIndex: number; qty: number };

type CopyKey = "open" | "title" | "hint" | "tap" | "stop" | "writing" | "typeLabel" | "find" | "finding" | "heard" | "check" | "add" | "again" | "soldOut" | "notFound" | "nothing" | "close" | "size" | "remove" | "network" | "noMic" | "voiceOff";

// Short interface text in the languages shoppers most often use here; any other language falls back to English.
const COPY: Record<"English" | "Hindi" | "Kannada", Record<CopyKey, string>> = {
  English: {
    open: "Order by voice",
    title: "Say what you want",
    hint: "For example: “2 kurti and 1 cotton saree”. Say it in any language.",
    tap: "Tap and speak",
    stop: "Tap to stop",
    writing: "Listening…",
    typeLabel: "Or type your order",
    find: "Find these items",
    finding: "Finding…",
    heard: "We heard",
    check: "Check your order",
    add: "Add to cart",
    again: "Say it again",
    soldOut: "Sold out right now:",
    notFound: "Not found in this shop:",
    nothing: "We couldn't match anything. Try again with the product names.",
    close: "Close",
    size: "Choice",
    remove: "Remove",
    network: "Network error. Check your connection and try again.",
    noMic: "Your browser can't record here. Type your order instead.",
    voiceOff: "Voice isn't available right now. Type your order instead.",
  },
  Hindi: {
    open: "बोलकर ऑर्डर करें",
    title: "बताइए आपको क्या चाहिए",
    hint: "जैसे: “2 कुर्ती और 1 कॉटन साड़ी”। किसी भी भाषा में बोलिए।",
    tap: "दबाकर बोलिए",
    stop: "रोकने के लिए दबाएँ",
    writing: "सुन रहे हैं…",
    typeLabel: "या यहाँ लिखिए",
    find: "सामान खोजें",
    finding: "खोज रहे हैं…",
    heard: "हमने सुना",
    check: "अपना ऑर्डर जाँचिए",
    add: "कार्ट में डालें",
    again: "फिर से बोलें",
    soldOut: "अभी उपलब्ध नहीं:",
    notFound: "इस दुकान में नहीं मिला:",
    nothing: "कुछ मिल नहीं पाया। सामान का नाम बोलकर फिर कोशिश कीजिए।",
    close: "बंद करें",
    size: "विकल्प",
    remove: "हटाएँ",
    network: "नेटवर्क की समस्या। फिर कोशिश कीजिए।",
    noMic: "यहाँ रिकॉर्डिंग नहीं हो सकती। अपना ऑर्डर लिखिए।",
    voiceOff: "अभी आवाज़ काम नहीं कर रही। अपना ऑर्डर लिखिए।",
  },
  Kannada: {
    open: "ಮಾತಿನ ಮೂಲಕ ಆರ್ಡರ್ ಮಾಡಿ",
    title: "ನಿಮಗೆ ಏನು ಬೇಕು ಹೇಳಿ",
    hint: "ಉದಾಹರಣೆ: “2 ಕುರ್ತಿ ಮತ್ತು 1 ಕಾಟನ್ ಸೀರೆ”. ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ ಹೇಳಿ.",
    tap: "ಒತ್ತಿ ಮಾತನಾಡಿ",
    stop: "ನಿಲ್ಲಿಸಲು ಒತ್ತಿ",
    writing: "ಕೇಳುತ್ತಿದ್ದೇವೆ…",
    typeLabel: "ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ",
    find: "ವಸ್ತುಗಳನ್ನು ಹುಡುಕಿ",
    finding: "ಹುಡುಕುತ್ತಿದ್ದೇವೆ…",
    heard: "ನಾವು ಕೇಳಿದ್ದು",
    check: "ನಿಮ್ಮ ಆರ್ಡರ್ ಪರಿಶೀಲಿಸಿ",
    add: "ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ",
    again: "ಮತ್ತೆ ಹೇಳಿ",
    soldOut: "ಈಗ ಲಭ್ಯವಿಲ್ಲ:",
    notFound: "ಈ ಅಂಗಡಿಯಲ್ಲಿ ಸಿಗಲಿಲ್ಲ:",
    nothing: "ಏನೂ ಹೊಂದಾಣಿಕೆಯಾಗಲಿಲ್ಲ. ವಸ್ತುವಿನ ಹೆಸರು ಹೇಳಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    close: "ಮುಚ್ಚಿ",
    size: "ಆಯ್ಕೆ",
    remove: "ತೆಗೆಯಿರಿ",
    network: "ನೆಟ್‌ವರ್ಕ್ ಸಮಸ್ಯೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    noMic: "ಇಲ್ಲಿ ರೆಕಾರ್ಡ್ ಮಾಡಲು ಆಗುವುದಿಲ್ಲ. ನಿಮ್ಮ ಆರ್ಡರ್ ಬರೆಯಿರಿ.",
    voiceOff: "ಧ್ವನಿ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಆರ್ಡರ್ ಬರೆಯಿರಿ.",
  },
};
type Copy = Record<CopyKey, string>;
const copyFor = (language: string | undefined): Copy => (COPY as Record<string, Copy>)[language ?? ""] ?? COPY.English;
const speechLanguage = (language: string | undefined) => (LANGUAGES.some((l) => l.name === language) ? language! : "English");

export function VoiceOrder({ slug, language, onAdd }: { slug: string; language?: string; onAdd: (lines: VoiceLine[]) => void }) {
  const c = copyFor(language);
  const [open, setOpen] = useState(false);
  const [speak, setSpeak] = useState(speechLanguage(language));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [edits, setEdits] = useState<MatchedLine[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  // The panel is drawn at the end of the shop page (.site), like the cart drawer: placed inside the products
  // section it would be positioned against that section instead of the screen.
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => setSpeak(speechLanguage(language)), [language]);
  useEffect(() => {
    if (!open) return;
    setHost(openRef.current?.closest(".site") ?? document.body);
  }, [open]);
  useEffect(() => {
    if (!open || !host) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, host]);

  const find = useCallback(
    async (transcript: string) => {
      const said = transcript.trim();
      if (said.length < 2) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/voice-order/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: said }) });
        const data = (await res.json()) as Result & { error?: string };
        if (!res.ok) return setError(data.error ?? c.network);
        setText(said);
        setResult(data);
        setEdits(data.lines);
      } catch {
        setError(c.network);
      } finally {
        setBusy(false);
      }
    },
    [slug, c.network],
  );

  const { supported, state, seconds, error: micError, start, stop } = useSpeech(speak, (t) => {
    setText(t);
    find(t);
  });

  const patch = (i: number, p: Partial<MatchedLine>) => setEdits((es) => es.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const reset = () => {
    setResult(null);
    setEdits([]);
    setError(null);
  };
  const add = () => {
    onAdd(edits.filter((l) => l.qty > 0).map((l) => ({ index: l.index, optionIndex: l.optionIndex, qty: l.qty })));
    setOpen(false);
    setText("");
    reset();
  };
  const total = edits.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0);
  const recording = state === "recording";

  return (
    <>
      <button ref={openRef} type="button" className="s-btn s-btn-ghost s-btn-sm s-vo-open" onClick={() => setOpen(true)}>
        <span aria-hidden>🎤</span> {c.open}
      </button>
      {open &&
        host &&
        createPortal(
        <div className="s-drawer-wrap" role="dialog" aria-modal="true" aria-label={c.open}>
          <button className="s-drawer-scrim" onClick={() => setOpen(false)} aria-label={c.close} tabIndex={-1} />
          <div className="s-drawer s-vo">
            <div className="s-drawer-head">
              <h2>{result ? c.check : c.title}</h2>
              <button ref={closeRef} className="s-close" onClick={() => setOpen(false)} aria-label={c.close}>
                ×
              </button>
            </div>

            {!result && (
              <>
                <p className="s-muted s-small">{c.hint}</p>
                <select className="s-vo-lang" aria-label="Language" value={speak} onChange={(e) => setSpeak(e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.label}
                    </option>
                  ))}
                </select>
                {supported ? (
                  <button type="button" className={`s-vo-mic ${recording ? "on" : ""}`} onClick={recording ? stop : start} disabled={state === "transcribing" || busy} aria-pressed={recording}>
                    <span className="s-vo-dot" aria-hidden />
                    {recording ? `${c.stop} · 0:${String(seconds).padStart(2, "0")}` : state === "transcribing" || busy ? c.writing : c.tap}
                  </button>
                ) : (
                  <p className="s-muted s-small">{c.noMic}</p>
                )}
                {micError && (
                  <p className="s-vo-note" role="alert">
                    {micError} {c.voiceOff}
                  </p>
                )}
                <label className="s-vo-label" htmlFor="s-vo-text">
                  {c.typeLabel}
                </label>
                <textarea id="s-vo-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={busy} maxLength={600} />
                <button type="button" className="s-btn" onClick={() => find(text)} disabled={busy || text.trim().length < 2} aria-busy={busy}>
                  {busy ? c.finding : c.find}
                </button>
              </>
            )}

            {error && (
              <p className="s-vo-note" role="alert">
                {error}
              </p>
            )}

            {result && (
              <div aria-live="polite" className="s-vo-result">
                <p className="s-muted s-small">
                  {c.heard}: “{result.heard}”
                </p>
                {edits.length > 0 ? (
                  <ul className="s-lines">
                    {edits.map((l, i) => (
                      <li key={`${l.index}:${i}`} className="s-vo-line">
                        <div>
                          <strong>{l.name}</strong>
                          {l.options.length > 0 && (
                            <select
                              aria-label={`${c.size}: ${l.name}`}
                              value={l.optionIndex}
                              onChange={(e) => patch(i, { optionIndex: Number(e.target.value), option: l.options[Number(e.target.value)], optionGuessed: false })}
                            >
                              {l.options.map((o, k) => (
                                <option key={o} value={k}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          )}
                          <span className="s-muted s-small">{l.price === null ? "" : formatPrice(l.price)}</span>
                        </div>
                        <div className="s-qty">
                          <button type="button" aria-label={`− ${l.name}`} onClick={() => (l.qty <= 1 ? setEdits((es) => es.filter((_, k) => k !== i)) : patch(i, { qty: l.qty - 1 }))}>
                            −
                          </button>
                          <span>{l.qty}</span>
                          <button type="button" aria-label={`+ ${l.name}`} onClick={() => patch(i, { qty: Math.min(99, l.qty + 1) })}>
                            +
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="s-vo-note">{c.nothing}</p>
                )}
                {result.soldOut.length > 0 && (
                  <p className="s-vo-note">
                    {c.soldOut} {result.soldOut.map((s) => s.name).join(", ")}
                  </p>
                )}
                {result.notFound.length > 0 && (
                  <p className="s-vo-note">
                    {c.notFound} {result.notFound.map((n) => `“${n}”`).join(", ")}
                  </p>
                )}
                {edits.length > 0 && (
                  <button type="button" className="s-btn s-btn-block" onClick={add}>
                    {c.add}
                    {total > 0 ? ` · ${formatPrice(total)}` : ""}
                  </button>
                )}
                <button type="button" className="s-btn s-btn-ghost s-btn-block" onClick={reset}>
                  {c.again}
                </button>
              </div>
            )}
          </div>
        </div>,
          host,
        )}
    </>
  );
}
