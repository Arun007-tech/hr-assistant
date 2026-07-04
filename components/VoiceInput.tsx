"use client";

import { Sparkles } from "lucide-react";
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

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5">
      <path
        d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function VoiceInput({
  onResult,
  mode = "polish",
  className = "",
  hint,
  compact = false,
}: {
  onResult: (text: string) => void;
  mode?: "raw" | "polish";
  className?: string;
  hint?: string;
  /** Icon-only, no label/hint — for tight inline spaces (e.g. next to another input). */
  compact?: boolean;
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
    <div className={className}>
      <div className="inline-flex items-center gap-2.5">
        <button
          type="button"
          onClick={state === "recording" ? stop : start}
          disabled={state === "processing"}
          aria-label={
            state === "recording"
              ? "Stop recording"
              : "Start voice input — transcribed and polished by AI"
          }
          className={`relative flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
            compact ? "size-9" : "size-10"
          } ${
            state === "recording"
              ? "animate-pulse bg-red-500 text-white"
              : "bg-accent-soft text-accent-ink hover:bg-accent-soft/80"
          }`}
        >
          {state === "processing" ? (
            <span className="text-sm">…</span>
          ) : state === "recording" ? (
            <StopIcon />
          ) : (
            <MicIcon />
          )}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-accent ring-2 ring-surface"
          >
            <Sparkles className="size-2.5 text-white" />
          </span>
        </button>
        {!compact && (
          <span className="text-sm text-faint">
            {state === "recording"
              ? "Recording — tap to stop"
              : state === "processing"
                ? "Transcribing…"
                : "Talk to your assistant"}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !compact && state === "idle" && (
        <p className="mt-1 text-xs text-faint">{hint}</p>
      )}
    </div>
  );
}
