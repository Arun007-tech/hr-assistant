"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`min-h-11 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors ${
        copied
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-subtle text-foreground/80 hover:bg-subtle active:bg-subtle"
      }`}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
