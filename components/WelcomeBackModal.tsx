"use client";

import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/Button";

export function WelcomeBackModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="anim-panel card-shadow relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle"
        >
          <X className="size-4" aria-hidden />
        </button>
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Sparkles className="size-7" aria-hidden />
        </span>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Welcome back, Pavi
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Hope you have a wonderful experience with this new tool, curated
          just for you.
        </p>
        <Button onClick={onClose} className="mt-5 w-full">
          Let&apos;s go
        </Button>
      </div>
    </div>
  );
}
