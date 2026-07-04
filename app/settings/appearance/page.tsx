"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import {
  useAppearance,
  type Accent,
  type Style,
} from "@/components/AppearanceProvider";

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
    description: "Frosted, translucent surfaces with a soft glow.",
  },
];

export default function AppearancePage() {
  const { accent, style, setAccent, setStyle } = useAppearance();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Appearance"
        gradient
        subtitle="Pick a color and a mood — applies instantly, everywhere."
      />

      <div className="flex flex-col gap-4">
        <Card title="Style">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STYLES.map((s) => {
              const active = style === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
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
              const active = accent === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAccent(a.value)}
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
      </div>
    </div>
  );
}
