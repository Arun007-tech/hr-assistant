"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Accent = "sky" | "ocean" | "denim";
export type Style = "charming" | "enterprise" | "glass";
export type Background = "neutral" | "warm" | "cool";

export interface Appearance {
  accent: Accent;
  style: Style;
  background: Background;
}

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "sky",
  style: "charming",
  background: "neutral",
};

const KEYS: Record<keyof Appearance, string> = {
  accent: "hr-assistant:accent",
  style: "hr-assistant:style",
  background: "hr-assistant:background",
};

// Reused by the provider (on mount + cross-tab sync) and by the settings
// page (for live preview of an unsaved draft) — one place that knows how
// appearance state maps onto the DOM.
export function applyToDom(appearance: Appearance) {
  document.documentElement.setAttribute("data-accent", appearance.accent);
  document.documentElement.setAttribute("data-style", appearance.style);
  document.documentElement.setAttribute("data-bg", appearance.background);
}

export function readSavedAppearance(): Appearance {
  if (typeof document === "undefined") return DEFAULT_APPEARANCE;
  return {
    accent:
      (document.documentElement.getAttribute("data-accent") as Accent) ||
      DEFAULT_APPEARANCE.accent,
    style:
      (document.documentElement.getAttribute("data-style") as Style) ||
      DEFAULT_APPEARANCE.style,
    background:
      (document.documentElement.getAttribute("data-bg") as Background) ||
      DEFAULT_APPEARANCE.background,
  };
}

type AppearanceContextValue = {
  saved: Appearance;
  commit: (next: Appearance) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return ctx;
}

// Cosmetic-only preference (accent x style x background), orthogonal to the
// light/dark mode next-themes already handles. Persisted to localStorage;
// a blocking inline script in layout.tsx applies it before first paint so
// there's no flash on reload. Committing here also re-broadcasts via the
// native `storage` event, which every other open tab listens for below —
// that's what makes an applied change show up everywhere, not just the tab
// that changed it.
export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [saved, setSaved] = useState<Appearance>(readSavedAppearance);

  function commit(next: Appearance) {
    setSaved(next);
    applyToDom(next);
    localStorage.setItem(KEYS.accent, next.accent);
    localStorage.setItem(KEYS.style, next.style);
    localStorage.setItem(KEYS.background, next.background);
  }

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== localStorage) return;
      if (!Object.values(KEYS).includes(e.key ?? "")) return;
      const next: Appearance = {
        accent: (localStorage.getItem(KEYS.accent) as Accent) || DEFAULT_APPEARANCE.accent,
        style: (localStorage.getItem(KEYS.style) as Style) || DEFAULT_APPEARANCE.style,
        background:
          (localStorage.getItem(KEYS.background) as Background) ||
          DEFAULT_APPEARANCE.background,
      };
      applyToDom(next);
      setSaved(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AppearanceContext.Provider value={{ saved, commit }}>
      {children}
    </AppearanceContext.Provider>
  );
}
