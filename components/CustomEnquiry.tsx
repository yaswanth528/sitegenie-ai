"use client";
// "Custom website · Let's talk": a button that opens a small form asking for the owner's phone
// number (and, if they like, their name and what they need). We call them back.
import { useState } from "react";
import { useT } from "./I18nProvider";
import type { UiKey } from "@/lib/uitext";

export function TalkButton({ labelKey = "letsTalk", className = "btn", from = "" }: { labelKey?: UiKey; className?: string; from?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiKey | null>(null);
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (phone.replace(/\D/g, "").length < 10) return setError("talkErrPhone");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, name, note, from }) });
      if (!res.ok) return setError(res.status === 400 ? "talkErrPhone" : "talkErrSend");
      setSent(true);
    } catch {
      setError("errNetwork");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {t(labelKey)}
      </button>
      {open && (
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="talk-title" style={{ zIndex: 90 }}>
          <button type="button" className="sheet-scrim" onClick={() => setOpen(false)} aria-label={t("close")} />
          <form className="sheet talk-sheet" onSubmit={send} noValidate>
            {sent ? (
              <>
                <h2 id="talk-title">{t("talkThanks")}</h2>
                <p>{t("talkThanksBody", { phone })}</p>
                <button type="button" className="btn" onClick={() => setOpen(false)}>
                  {t("talkDone")}
                </button>
              </>
            ) : (
              <>
                <h2 id="talk-title">{t("talkTitle")}</h2>
                <p className="hint">{t("talkIntro")}</p>
                <label htmlFor="talk-phone">{t("talkPhone")}</label>
                <input id="talk-phone" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
                <label htmlFor="talk-name">{t("talkName")}</label>
                <input id="talk-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                <label htmlFor="talk-note">{t("talkNote")}</label>
                <textarea id="talk-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                {error && <p className="error">{t(error)}</p>}
                <div className="row">
                  <button className="btn" disabled={busy} aria-busy={busy}>
                    {busy ? t("talkSending") : t("talkSend")}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={busy}>
                    {t("talkCancel")}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
