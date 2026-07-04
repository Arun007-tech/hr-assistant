"use client";

import { createContext, useContext, useState } from "react";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";

const QuickCaptureContext = createContext<{ open: () => void } | null>(null);

export function useQuickCapture() {
  const ctx = useContext(QuickCaptureContext);
  if (!ctx) {
    throw new Error("useQuickCapture must be used within QuickCaptureProvider");
  }
  return ctx;
}

// Global "say or paste anything" capture — one entry point for both voice
// dictation and pasted text, backed by /api/ai/capture which classifies the
// input and routes it (todo, note, draft reply, or a candidate to add).
export function QuickCaptureProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <QuickCaptureContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {open && <QuickCaptureModal onClose={() => setOpen(false)} />}
    </QuickCaptureContext.Provider>
  );
}
