"use client";

import { Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  applyToDom,
  useAppearance,
  type Accent,
  type Appearance,
  type Background,
  type Style,
} from "@/components/AppearanceProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";

const MODES = ["light", "dark", "system"] as const;

const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: "sky", label: "Sky", swatch: "#0ea5e9" },
  { value: "ocean", label: "Ocean", swatch: "#0891b2" },
  { value: "denim", label: "Denim", swatch: "#3b6ea5" },
];

const STYLES: { value: Style; label: string; description: string }[] = [
  {
    value: "charming",
    label: "Charming",
    description: "Warm, rounded, soft glowing shadows.",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    description: "Flat, crisp, minimal — just a clean border.",
  },
  {
    value: "glass",
    label: "Liquid glass",
    description: "Frosted, saturated blur with a colorful wash behind it.",
  },
];

const BACKGROUNDS: { value: Background; label: string; swatch: string }[] = [
  { value: "neutral", label: "Neutral", swatch: "#eef2f6" },
  { value: "warm", label: "Warm", swatch: "#f3ece0" },
  { value: "cool", label: "Cool", swatch: "#e3ecf7" },
];

function sameAppearance(a: Appearance, b: Appearance): boolean {
  return (
    a.accent === b.accent && a.style === b.style && a.background === b.background
  );
}

export default function AppearancePage() {
  const { saved, commit } = useAppearance();
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<Appearance>(saved);
  const [applied, setApplied] = useState(false);

  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  // Live preview: every draft change re-skins the current tab immediately,
  // but nothing is saved or broadcast to other tabs until "Apply changes."
  useEffect(() => {
    applyToDom(draft);
  }, [draft]);

  // Leaving the page without applying reverts to whatever is actually
  // saved (which may have moved if another tab applied a change meanwhile).
  useEffect(() => {
    return () => applyToDom(savedRef.current);
  }, []);

  const dirty = !sameAppearance(draft, saved);

  function apply() {
    commit(draft);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Appearance"
        gradient
        subtitle="Pick a look — preview it live, then apply to save it everywhere."
      />

      <div className="flex flex-col gap-4">
        <Card title="Mode">
          <Segmented
            options={MODES}
            value={(theme as (typeof MODES)[number]) ?? "system"}
            onChange={setTheme}
          />
        </Card>

        <Card title="Style">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STYLES.map((s) => {
              const active = draft.style === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, style: s.value }))}
                  data-style={s.value}
                  className="text-left"
                >
                  <span
                    className={`card-shadow relative flex flex-col gap-2 rounded-2xl border p-4 transition-colors ${
                      active
                        ? "border-accent"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-accent text-white">
                        <Check className="size-3.5" aria-hidden />
                      </span>
                    )}
                    <span className="text-sm font-semibold text-foreground">
                      {s.label}
                    </span>
                    <span className="text-xs text-muted">
                      {s.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Accent color">
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => {
              const active = draft.accent === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, accent: a.value }))}
                  aria-label={`Use ${a.label} accent`}
                  aria-pressed={active}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-full border-2 transition-transform ${
                      active
                        ? "border-foreground scale-105"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: a.swatch }}
                  >
                    {active && (
                      <Check className="size-5 text-white" aria-hidden />
                    )}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Background">
          <div className="flex flex-wrap gap-3">
            {BACKGROUNDS.map((b) => {
              const active = draft.background === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, background: b.value }))}
                  aria-label={`Use ${b.label} background`}
                  aria-pressed={active}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-full border-2 transition-transform ${
                      active
                        ? "border-foreground scale-105"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: b.swatch }}
                  >
                    {active && (
                      <Check className="size-5 text-foreground" aria-hidden />
                    )}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {b.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="sticky bottom-4 mt-5 flex items-center justify-end gap-3 rounded-2xl border border-border bg-surface p-3 card-shadow">
        {applied && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Applied ✓
          </span>
        )}
        <Button onClick={apply} disabled={!dirty} className="!px-6">
          Apply changes
        </Button>
      </div>
    </div>
  );
}
