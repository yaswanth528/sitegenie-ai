"use client";
import { useT } from "./I18nProvider";
import { useSpeech } from "./useSpeech";

export function MicButton({ language, onText, onAudio, label }: { language: string; onText: (t: string) => void; onAudio?: (b: Blob) => void; label?: string }) {
  const t = useT();
  const { supported, state, seconds, error, start, stop } = useSpeech(language, onText, onAudio);
  if (!supported) return <p className="hint">{t("micUnsupported")}</p>;
  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic ${state === "recording" ? "on" : ""}`}
        onClick={state === "recording" ? stop : start}
        disabled={state === "transcribing"}
        aria-busy={state === "transcribing"}
        aria-pressed={state === "recording"}
      >
        <span className="mic-dot" aria-hidden />
        {state === "recording" ? `${t("micStop")} · 0:${String(seconds).padStart(2, "0")}` : state === "transcribing" ? t("micWriting") : (label ?? t("micTap"))}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
