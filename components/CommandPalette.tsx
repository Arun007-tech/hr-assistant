"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { filterIndex, type CommandItem } from "@/lib/command-index";

export function CommandPalette({
  index,
  onClose,
}: {
  index: CommandItem[] | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = index ? filterIndex(index, query) : [];
  const safeActiveIdx = Math.min(activeIdx, Math.max(0, results.length - 1));

  function go(item: CommandItem) {
    router.push(item.href);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(Math.min(safeActiveIdx + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(Math.max(safeActiveIdx - 1, 0));
    } else if (e.key === "Enter" && results[safeActiveIdx]) {
      e.preventDefault();
      go(results[safeActiveIdx]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Jump to a role or candidate…"
          className="w-full border-b border-border px-5 py-4 text-base text-foreground focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto p-2">
          {!index && (
            <p className="px-3 py-4 text-sm text-faint">Loading…</p>
          )}
          {index && results.length === 0 && (
            <p className="px-3 py-4 text-sm text-faint">No matches.</p>
          )}
          {results.map((item, i) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => go(item)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                i === safeActiveIdx ? "bg-accent-soft" : ""
              }`}
            >
              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                {item.label}
              </span>
              <span className="shrink-0 text-xs text-faint">
                {item.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
