"use client";
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { LanguageSwitcher, useI18n, useT } from "@/components/I18nProvider";
import { Logo } from "@/components/Logo";
import { MediaPicker } from "@/components/MediaPicker";
import ShinyText from "@/components/bits/ShinyText/ShinyText";
import { AmbientBg } from "@/components/AmbientBg";
import { Assembling } from "@/components/create/Assembling";
import { Confetti } from "@/components/create/Confetti";
import { MicOrb } from "@/components/create/MicOrb";
import { MicButton } from "@/components/MicButton";
import { ReviseMic } from "@/components/ReviseMic";
import { PayPanel } from "@/components/PayPanel";
import { SharePanel } from "@/components/SharePanel";
import { SiteEditor } from "@/components/SiteEditor";
import { SiteView } from "@/components/site/SiteView";
import type { Uploaded } from "@/components/upload";
import { Rotating } from "@/components/Rotating";
import { LANGUAGES } from "@/components/useSpeech";
import { normaliseWhatsapp } from "@/lib/catalogue";
import { localeForSpeech, nativeName, type Locale, type UiKey } from "@/lib/uitext";
import { PRICES } from "@/lib/prices";
import type { Draft, Live } from "@/lib/schema";
import "./create.css";

type Stage = "speak" | "checking" | "ask" | "building" | "review" | "pay" | "done";
type Question = { question: string; reason: string };
type Result = { slug: string; editKey: string; whatsapp: string };

// What a good description covers. Prices and timings are ticked off when we hear them.
const SAY: { label: UiKey; heard: RegExp | null }[] = [
  { label: "say1", heard: /\b(name|called)\b|ಹೆಸರು|नाम|பெயர்|పేరు/i },
  { label: "say2", heard: /\d{2,}|₹|\brupees?\b|\brs\b|ರೂ|रुपय|ரூ|రూ/i },
  { label: "say3", heard: /\b(am|pm)\b|\d+\s*(to|-)\s*\d+|timing|ಗಂಟೆ|बजे|மணி|గంట/i },
  { label: "say4", heard: /deliver|home/i },
];

function Kicker({ k }: { k: UiKey }) {
  const t = useT();
  return <ShinyText text={t(k)} color="#3a4046" shineColor="#b9c1c6" speed={3} className="cf-kicker" />;
}

export default function CreatePage() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  // After the owner picks a speech language, we offer (never force) to switch the page to it too.
  const [offer, setOffer] = useState<Locale | null>(null);
  const [stage, setStage] = useState<Stage>("speak");
  const [lang, setLang] = useState("English");
  const [transcript, setTranscript] = useState("");
  const [media, setMedia] = useState<Uploaded[]>([]);
  const [aiImages, setAiImages] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  // Phones show the website first (the "magic moment"); the editor is one tap away.
  const [pane, setPane] = useState<"edit" | "preview">("preview");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [confirmWa, setConfirmWa] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  // A light sweeps across the preview whenever the website changes (voice change, edits, theme).
  const [flash, setFlash] = useState(false);
  const draftKey = draft ? JSON.stringify([draft.theme, draft.siteType, draft.headline, draft.items.length, draft.festival ?? null]) : "";
  useEffect(() => {
    if (!draftKey) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 950);
    return () => clearTimeout(t);
  }, [draftKey]); // phone: "Change by voice" sheet over the preview // the "Where should orders come?" sheet
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<string[]>([]);
  const onText = useCallback((t: string) => setTranscript((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t)), []);
  const onAudio = useCallback((b: Blob) => setRecordings((r) => [...r, URL.createObjectURL(b)].slice(-5)), []);

  // Step 1: ask the AI what's missing (name, prices) before building.
  async function check() {
    setErrors([]);
    setStage("checking");
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = (await res.json()) as { questions?: Question[] };
      const qs = data.questions ?? [];
      if (qs.length) {
        setQuestions(qs);
        setAnswers(qs.map(() => ""));
        setStage("ask");
        return;
      }
    } catch {
      // If the check fails or is slow, just build.
    }
    build(transcript);
  }

  function buildWithAnswers() {
    const extra = questions
      .map((q, i) => (answers[i].trim() ? `${q.question} ${answers[i].trim()}` : ""))
      .filter(Boolean)
      .join("\n");
    const full = extra ? `${transcript.trim()}\n${extra}` : transcript;
    setTranscript(full);
    build(full);
  }

  async function build(text: string) {
    setErrors([]);
    setStage("building");
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, media, generateImages: aiImages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? t("errBuild")]);
        setStage("speak");
        return;
      }
      setDraft({ ...(data as Draft), whatsapp: draft?.whatsapp || (data as Draft).whatsapp || "" });
      setStage("review");
      window.scrollTo({ top: 0 });
    } catch {
      setErrors([t("errNetwork")]);
      setStage("speak");
    }
  }

  async function publish(whatsappNumber?: string) {
    if (!draft) return;
    const toSave = whatsappNumber !== undefined ? { ...draft, whatsapp: whatsappNumber } : draft;
    if (whatsappNumber !== undefined) setDraft(toSave);
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toSave) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? [t("errPublish")]);
        setPane("edit"); // show the errors next to the fields that need fixing
        setConfirmWa(false);
        return;
      }
      setConfirmWa(false);
      setResult(data);
      setStage("pay");
      window.scrollTo({ top: 0 });
    } catch {
      setErrors([t("errNetworkShort")]);
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const errorBox =
    errors.length > 0 ? (
      <div className="errors">
        {errors.map((e) => (
          <p key={e}>{e}</p>
        ))}
      </div>
    ) : null;

  if (stage === "review" && draft)
    return (
      <div className="review rv">
        <AmbientBg />
        <header className="review-bar">
          <Logo />
          <LanguageSwitcher />
          <div className="seg mobile-only" role="tablist">
            <button role="tab" aria-selected={pane === "edit"} className={pane === "edit" ? "on" : ""} onClick={() => setPane("edit")}>
              {t("tabEdit")}
            </button>
            <button role="tab" aria-selected={pane === "preview"} className={pane === "preview" ? "on" : ""} onClick={() => setPane("preview")}>
              {t("tabPreview")}
            </button>
          </div>
          <div className="seg desktop-only" role="radiogroup" aria-label={t("previewSizeAria")}>
            <button role="radio" aria-checked={device === "phone"} className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")}>
              {t("devicePhone")}
            </button>
            <button role="radio" aria-checked={device === "desktop"} className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>
              {t("deviceDesktop")}
            </button>
          </div>
          <button className="cf-pill sm rv-bar-cta desktop-only" onClick={() => setConfirmWa(true)} disabled={busy}>
            {t("continueFor", { price: `₹${PRICES[draft.siteType].toLocaleString("en-IN")}` })}
          </button>
        </header>
        <div className="review-body">
          <aside className={`review-edit ${pane === "edit" ? "show" : ""}`}>
            <div className="rv-head">
              <Kicker k="step2of3" />
              <h1>{t("readyTitle")}</h1>
              <p className="hint">{t("readyHint")}</p>
            </div>
            <ReviseMic value={draft} onChange={setDraft} language={lang} onLanguage={setLang} />
            <SiteEditor value={draft} onChange={setDraft} language={lang} showWhatsapp recordings={recordings} />
            <div className="publish-bar">
              {errorBox}
              <div className="row">
                <button className="cf-pill" onClick={() => setConfirmWa(true)} disabled={busy} aria-busy={busy}>
                  {busy ? t("saving") : t("continueFor", { price: `₹${PRICES[draft.siteType].toLocaleString("en-IN")}` })}
                </button>
                <button
                  className="cf-pill ghost"
                  disabled={busy}
                  onClick={() => window.confirm(t("startAgainConfirm")) && setStage("speak")}
                >
                  {t("startAgain")}
                </button>
              </div>
            </div>
          </aside>
          {confirmWa && (
            <WhatsappSheet
              initial={draft.whatsapp}
              busy={busy}
              error={errors.find((e) => /whatsapp/i.test(e)) ?? null}
              onCancel={() => setConfirmWa(false)}
              onConfirm={(n) => publish(n)}
            />
          )}
          <section className={`review-preview ${pane === "preview" ? "show" : ""}`} aria-label={t("tabPreview")}>
            <div className={`device ${device} ${flash ? "flash" : ""}`}>
              <div className="device-scroll">
                <SiteView site={draft} preview />
              </div>
            </div>
            <div className="preview-cta mobile-only">
              <button className="cf-pill sm" onClick={() => setConfirmWa(true)} disabled={busy} aria-busy={busy}>
                {busy ? t("saving") : t("continueFor", { price: `₹${PRICES[draft.siteType].toLocaleString("en-IN")}` })}
              </button>
              <button className="cf-pill ghost sm" onClick={() => setReviseOpen(true)} aria-label={t("changeByVoice")}>
                🎤 {t("changeByVoice")}
              </button>
              <button className="cf-pill ghost sm" onClick={() => setPane("edit")}>
                {t("tabEdit")}
              </button>
            </div>
          </section>
          {reviseOpen && (
            <div className="sheet-wrap revise-sheet" role="dialog" aria-modal="true" aria-label={t("whatChange")}>
              <button className="sheet-scrim" onClick={() => setReviseOpen(false)} aria-label={t("close")} />
              <div className="sheet">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 0 }}>
                  <h2>{t("whatChange")}</h2>
                  <button className="btn ghost sm" onClick={() => setReviseOpen(false)}>
                    {t("seeWebsite")}
                  </button>
                </div>
                <ReviseMic value={draft} onChange={setDraft} language={lang} onLanguage={setLang} compact />
              </div>
            </div>
          )}
        </div>
      </div>
    );

  const stepNow = { speak: 0, checking: 0, ask: 0, building: 1, review: 1, pay: 2, done: 2 }[stage];
  return (
    <div className="cf">
      <AmbientBg />
      <header className="cf-nav">
        <div className="cf-nav-row">
          <Logo />
          <LanguageSwitcher />
          <ol className="cf-track" aria-label={t("stepsAria")}>
            {(["stepSpeak", "stepCheck", "stepLive"] as UiKey[]).map((key, i) => (
              <li key={key} className={i < stepNow ? "done" : i === stepNow ? "now" : ""} aria-current={i === stepNow ? "step" : undefined}>
                <span>{i < stepNow ? "✓" : i + 1}</span>
                {t(key)}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className={`cf-main ${stage === "speak" || stage === "building" ? "wide" : ""}`}>
        {stage === "speak" && (
          <div className="cf-speak">
            <div className="cf-col-a">
            <section className="cf-hero">
              <Kicker k="step1of3" />
              <h1>{t("speakTitle")}</h1>
              <p className="cf-lead">{t("speakLead")}</p>
            </section>

            <div className="cf-langs" role="radiogroup" aria-label={t("speechLangAria")}>
              {LANGUAGES.map((l) => (
                <button key={l.name} type="button" role="radio" aria-checked={lang === l.name} className={lang === l.name ? "on" : ""} onClick={() => {
                    setLang(l.name);
                    const target = localeForSpeech(l.name);
                    setOffer(target !== locale ? target : null);
                  }}>
                  {l.label}
                </button>
              ))}
            </div>

            {offer && (
              <div className="cf-offer" role="status">
                <span>{t("offerSwitch", { lang: nativeName(offer) })}</span>
                <button
                  type="button"
                  className="cf-offer-yes"
                  onClick={() => {
                    setLocale(offer);
                    setOffer(null);
                  }}
                >
                  {t("offerYes")}
                </button>
                <button type="button" className="cf-offer-no" onClick={() => setOffer(null)}>
                  {t("offerNo")}
                </button>
              </div>
            )}

            <MicOrb language={lang} onText={onText} onAudio={onAudio} />

            <ul className="cf-say" aria-label={t("sayAria")}>
              {SAY.map((x) => {
                const done = !!x.heard && x.heard.test(transcript);
                return (
                  <li key={x.label} className={done ? "done" : ""}>
                    <span aria-hidden="true">{done ? "✓" : "•"}</span>
                    {t(x.label)}
                  </li>
                );
              })}
            </ul>
            </div>

            <div className="cf-col-b">
            <section className="cf-card">
              <div className="cf-card-head">
                <label htmlFor="transcript">{t("heardLabel")}</label>
                <span className="cf-muted small">{t("heardHint")}</span>
              </div>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t("heardPlaceholder")}
              />
            </section>

            <section className="cf-card">
              <MediaPicker value={media} onChange={setMedia} />
              <label className="check">
                <input type="checkbox" checked={aiImages} onChange={(e) => setAiImages(e.target.checked)} />
                {t("findPictures")}
              </label>
            </section>

            {errorBox}
            <div className="cf-cta">
              <button className="cf-pill block" onClick={check} disabled={transcript.trim().length < 5}>
                {t("buildMyWebsite")}
              </button>
              {transcript.trim().length < 5 && <p className="cf-muted small">{t("speakFirst")}</p>}
            </div>
            </div>
          </div>
        )}

        {stage === "checking" && (
          <div className="cf-center" aria-live="polite">
            <div className="cf-pulse" aria-hidden="true" />
            <h1>{t("checkingTitle")}</h1>
            <p className="cf-lead">{t("checkingLead")}</p>
            <Rotating className="cf-muted" lines={[t("checking1"), t("checking2"), t("checking3"), t("checking4")]} />
          </div>
        )}

        {stage === "ask" && (
          <>
            <section className="cf-hero">
              <Kicker k="askKicker" />
              <h1>{t("askTitle")}</h1>
              <p className="cf-lead">{t("askLead")}</p>
            </section>
            <div className="cf-questions">
              {questions.map((q, i) => (
                <div key={i} className="cf-card cf-question">
                  <span className="cf-q-num">{i + 1}</span>
                  <p className="cf-q-text">{q.question}</p>
                  <MicButton language={lang} label={t("answerByVoice")} onAudio={onAudio} onText={(t) => setAnswers((a) => a.map((x, j) => (j === i ? t : x)))} />
                  <input
                    aria-label={t("answerAria", { question: q.question })}
                    placeholder={t("answerPlaceholder")}
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                </div>
              ))}
            </div>
            <div className="cf-cta">
              <button className="cf-pill block" onClick={buildWithAnswers}>
                {t("buildMyWebsite")}
              </button>
              <button className="cf-pill ghost block" onClick={() => build(transcript)}>
                {t("skipAndBuild")}
              </button>
            </div>
          </>
        )}

        {stage === "building" && <Assembling withPhotos={media.length > 0} />}

        {stage === "pay" && result && draft && (
          <>
            <section className="cf-hero">
              <Kicker k="step3of3" />
              <h1>{t("payTitle")}</h1>
              <p className="cf-lead">{t("payLead")}</p>
            </section>
            <section className="cf-card">
              <PayPanel
                slug={result.slug}
                editKey={result.editKey}
                siteType={draft.siteType}
                due={PRICES[draft.siteType]}
                onLive={(l) => {
                  setLive(l);
                  setStage("done");
                  window.scrollTo({ top: 0 });
                }}
              />
            </section>
            <p className="cf-muted cf-center-text">
              {t("anotherLook")}{" "}
              <a href={`/p/${result.slug}`} target="_blank" rel="noreferrer">
                {t("openPreview")}
              </a>
            </p>
          </>
        )}

        {stage === "done" && result && (
          <>
            <Confetti />
            <section className="cf-hero">
              <Kicker k="doneKicker" />
              <h1>{t("doneTitle")}</h1>
              <p className="cf-lead">{t("doneLead")}</p>
            </section>
            <section className="cf-card">
              <label htmlFor="live-url">{t("websiteAddress")}</label>
              <div className="link-box">
                <input id="live-url" readOnly value={live?.url ?? ""} onFocus={(e) => e.target.select()} />
                <CopyButton text={live?.url ?? ""} />
                <a className="cf-pill sm" href={live?.url} target="_blank" rel="noreferrer">
                  {t("open")}
                </a>
              </div>
            </section>
            <section className="cf-card cf-warn">
              <label htmlFor="edit-url">{t("saveEditLink")}</label>
              <p className="cf-muted small">{t("saveEditBody")}</p>
              <div className="link-box">
                <input id="edit-url" readOnly value={`${origin}/p/${result.slug}/edit#key=${result.editKey}`} onFocus={(e) => e.target.select()} />
                <CopyButton text={`${origin}/p/${result.slug}/edit#key=${result.editKey}`} />
              </div>
            </section>
            {live && draft && (
              <section className="cf-card">
                <h2>{t("tellCustomers")}</h2>
                <p className="cf-muted small">{t("tellBody")}</p>
                <SharePanel url={live.url} businessName={draft.businessName} headline={draft.headline} themeId={draft.theme.id} accent={draft.theme.accent} />
              </section>
            )}
            <section className="cf-card">
              <h2>{t("checkOrders")}</h2>
              <p className="cf-muted small">{t("checkOrdersBody")}</p>
              <a
                className="cf-pill wa"
                href={`https://wa.me/${result.whatsapp}?text=${encodeURIComponent(`Test order from my website (${live?.url ?? ""})`)}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("sendTest")}
              </a>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// "Where should orders come?" — confirms the owner's WhatsApp number right before publishing.
function WhatsappSheet({
  initial,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  initial: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (n: string) => void;
}) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const ok = normaliseWhatsapp(value) !== null;
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="wa-sheet-title">
      <button className="sheet-scrim" onClick={onCancel} aria-label={t("close")} />
      <form
        className="sheet"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onConfirm(value);
        }}
      >
        <h2 id="wa-sheet-title">{t("waTitle")}</h2>
        <p className="hint">{t("waHint")}</p>
        <label htmlFor="wa-sheet">{t("waLabel")}</label>
        <input id="wa-sheet" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        {value && !ok && <p className="error">{t("waInvalid")}</p>}
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button className="btn" disabled={!ok || busy} aria-busy={busy}>
            {busy ? t("saving") : t("waConfirm")}
          </button>
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
            {t("back")}
          </button>
        </div>
      </form>
    </div>
  );
}
