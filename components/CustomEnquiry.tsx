"use client";
// "Custom website · Let's talk": a button that opens a small form asking for the owner's phone
// number (and, if they like, their name and what they need). We call them back.
import { useState } from "react";

export function TalkButton({ label = "Let’s talk", className = "btn", from = "" }: { label?: string; className?: string; from?: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, name, note, from }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setError(data.error ?? "Couldn't send that. Please try again.");
      setSent(true);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="talk-title" style={{ zIndex: 90 }}>
          <button type="button" className="sheet-scrim" onClick={() => setOpen(false)} aria-label="Close" />
          <form className="sheet talk-sheet" onSubmit={send}>
            {sent ? (
              <>
                <h2 id="talk-title">Thank you!</h2>
                <p>We’ll call you on {phone} to talk about your custom website.</p>
                <button type="button" className="btn" onClick={() => setOpen(false)}>
                  Done
                </button>
              </>
            ) : (
              <>
                <h2 id="talk-title">Custom website, let’s talk</h2>
                <p className="hint">Tell us your phone number and we’ll call you to understand what you need. No payment now.</p>
                <label htmlFor="talk-phone">Your phone number</label>
                <input id="talk-phone" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus required />
                <label htmlFor="talk-name">Your name (optional)</label>
                <input id="talk-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                <label htmlFor="talk-note">What do you need? (optional)</label>
                <textarea id="talk-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                {error && <p className="error">{error}</p>}
                <div className="row">
                  <button className="btn" disabled={busy} aria-busy={busy}>
                    {busy ? "Sending…" : "Call me"}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
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
