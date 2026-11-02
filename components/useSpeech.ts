"use client";
// Records the owner's voice with MediaRecorder and sends it to /api/transcribe,
// where Gemini turns it into text. Owners can always type instead.
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";

export type RecorderState = "idle" | "recording" | "transcribing";
const MAX_SECONDS = 60;

function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

export function useSpeech(language: string, onText: (text: string) => void, onAudio?: (recording: Blob) => void) {
  const t = useT();
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null); // while recording, for a live waveform
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const discard = useRef(false); // the owner tapped the small cross: throw the recording away

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
    return () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const upload = useCallback(
    async (blob: Blob) => {
      setState("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "recording");
        form.append("language", language);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) setError(t("micNotUnderstood"));
        else onText(data.transcript);
      } catch {
        setError(t("micNetwork"));
      } finally {
        setState("idle");
      }
    },
    [language, onText, t],
  );

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const cancel = useCallback(() => {
    discard.current = true;
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    setSeconds(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t("micBlocked"));
      return;
    }
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" });
      if (discard.current) {
        discard.current = false;
        setState("idle");
        return;
      }
      if (blob.size > 0) {
        onAudio?.(blob); // kept in the browser so the owner can replay it during review
        upload(blob);
      }
      else setState("idle");
    };
    recorder.current = rec;
    discard.current = false;
    // If the mic is cut off in the middle (call, unplugged headset, browser error), keep
    // what was already said instead of losing it.
    rec.onerror = () => stop();
    stream.getAudioTracks().forEach((t) => (t.onended = () => stop()));
    rec.start();
    setStream(stream);
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
  }, [stop, upload, onAudio, t]);

  return { supported, state, seconds, error, start, stop, cancel, stream, maxSeconds: MAX_SECONDS };
}

// The language name is passed to Gemini as a hint; the code is for read-back speech.
export const LANGUAGES = [
  { name: "English", code: "en-IN", label: "English" },
  { name: "Kannada", code: "kn-IN", label: "ಕನ್ನಡ Kannada" },
  { name: "Hindi", code: "hi-IN", label: "हिन्दी Hindi" },
  { name: "Tamil", code: "ta-IN", label: "தமிழ் Tamil" },
  { name: "Telugu", code: "te-IN", label: "తెలుగు Telugu" },
];
