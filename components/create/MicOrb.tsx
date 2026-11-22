"use client";
// The big round mic on the "Tell us about your business" screen. While recording, the bars
// follow the owner's voice live (Web Audio analyser), so they can see it's listening.
import { useEffect, useRef } from "react";
import { useT } from "../I18nProvider";
import { Hustle } from "./Hustle";
import { useSpeech } from "../useSpeech";

const BARS = 32;

export function MicOrb({ language, onText, onAudio }: { language: string; onText: (t: string) => void; onAudio?: (b: Blob) => void }) {
  const t = useT();
  const { supported, state, seconds, error, start, stop, cancel, cancelUpload, stream, maxSeconds } = useSpeech(language, onText, onAudio);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const orb = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!stream) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const draw = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < BARS; i++) {
        // Voices sit in the lower bins; spread them across the bars, mirrored from the middle.
        const v = data[Math.min(data.length - 1, 1 + Math.floor((Math.abs(i - BARS / 2) / (BARS / 2)) * 34))] / 255;
        sum += v;
        const el = bars.current[i];
        if (el) el.style.transform = `scaleY(${0.12 + v * 0.95})`;
      }
      orb.current?.style.setProperty("--level", String(Math.min(1, (sum / BARS) * 2.2)));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ctx.close().catch(() => {});
      bars.current.forEach((el) => el && (el.style.transform = ""));
      orb.current?.style.setProperty("--level", "0");
    };
  }, [stream]);

  if (!supported) return <p className="cf-muted">{t("micUnsupported")}</p>;
  const recording = state === "recording";
  const left = maxSeconds - seconds;
  return (
    <div className={`cf-mic is-${state}`}>
      <button
        ref={orb}
        type="button"
        className="cf-orb"
        onClick={recording ? stop : start}
        disabled={state === "transcribing"}
        aria-pressed={recording}
        aria-label={recording ? t("micStop") : t("micStart")}
      >
        <span className="cf-orb-ring" aria-hidden="true" />
        <span className="cf-orb-ring r2" aria-hidden="true" />
        {recording ? (
          <span className="cf-orb-stop" aria-hidden="true" />
        ) : state === "transcribing" ? (
          // While the words are being written down, a little runner hurries inside the button, where the mic icon was.
          <Hustle variant="run" orb />
        ) : (
          <svg className="cf-orb-wave" viewBox="0 0 48 48" width="52" height="52" aria-hidden="true">
            {[8, 15, 22, 29, 36].map((x, i) => (
              <line key={x} x1={x + 2} x2={x + 2} y1={24 - [6, 13, 19, 13, 6][i]} y2={24 + [6, 13, 19, 13, 6][i]} stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </svg>
        )}
      </button>
      {recording && (
        <button type="button" className="cf-mic-x" onClick={cancel} aria-label={t("micCancelAria")} title={t("micCancelTitle")}>
          ×
        </button>
      )}
      <div className="cf-wave" aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} ref={(el) => void (bars.current[i] = el)} />
        ))}
      </div>
      <p className="cf-mic-label" aria-live="polite">
        {recording
          ? t("micListening", { time: `0:${String(seconds).padStart(2, "0")}`, left: left <= 10 ? t("micLeft", { s: left }) : "" })
          : state === "transcribing"
            ? t("micWriting")
            : t("micTap")}
      </p>
      {state === "transcribing" && (
        <button type="button" className="cf-mic-stop" onClick={cancelUpload}>
          {t("micCancelTitle")}
        </button>
      )}
      {error && <p className="cf-error">{error}</p>}
    </div>
  );
}
