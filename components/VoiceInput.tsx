"use client";

import { useRef, useState } from "react";
import { postJson } from "@/lib/client";

const CANDIDATE_MIME_TYPES = ["audio/mp4", "audio/webm", "audio/ogg"];

function pickMimeType(): string {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function VoiceInput({
  onResult,
  mode = "polish",
  className = "",
}: {
  onResult: (text: string) => void;
  mode?: "raw" | "polish";
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "recording" | "processing" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Mic not available in this browser.");
      setState("error");
      return;
    }
    const mimeType = pickMimeType();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");
        try {
          const blob = new Blob(chunksRef.current, {
            type: mimeType || "audio/webm",
          });
          const base64 = await blobToBase64(blob);
          const { text } = await postJson<{ text: string }>("/api/ai/transcribe", {
            audio_base64: base64,
            mime_type: mimeType || "audio/webm",
            mode,
          });
          onResult(text);
          setState("idle");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transcription failed.");
          setState("error");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Mic permission denied.");
      setState("error");
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={state === "processing"}
        aria-label={state === "recording" ? "Stop recording" : "Start voice input"}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full text-lg transition-colors disabled:opacity-50 ${
          state === "recording"
            ? "animate-pulse bg-red-500 text-white"
            : "bg-accent-soft text-accent-ink hover:bg-accent-soft/80"
        }`}
      >
        {state === "processing" ? "…" : state === "recording" ? "■" : "🎤"}
      </button>
      {state === "recording" && (
        <span className="text-xs text-stone-500">Recording — tap to stop</span>
      )}
      {state === "processing" && (
        <span className="text-xs text-stone-500">Transcribing…</span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
