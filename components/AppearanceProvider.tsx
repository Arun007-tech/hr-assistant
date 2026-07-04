"use client";

import { createContext, useContext, useState } from "react";

export type Accent = "sky" | "ocean" | "denim";
export type Style = "charming" | "enterprise" | "glass";

const ACCENT_KEY = "hr-assistant:accent";
const STYLE_KEY = "hr-assistant:style";

type AppearanceContextValue = {
  accent: Accent;
  style: Style;
  setAccent: (accent: Accent) => void;
  setStyle: (style: Style) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return ctx;
}

// Cosmetic-only preference (accent color x visual style), orthogonal to the
// light/dark mode next-themes already handles. Persisted to localStorage,
// per-device — this isn't pipeline data, so it doesn't need to round-trip
// through the server. A blocking inline script in layout.tsx applies it
// before first paint so there's no flash on reload; this provider just
// keeps React state in sync for the settings page to read/update.
export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accent, setAccentState] = useState<Accent>(() => {
    if (typeof document === "undefined") return "sky";
    const attr = document.documentElement.getAttribute("data-accent");
    return (attr as Accent) || "sky";
  });
  const [style, setStyleState] = useState<Style>(() => {
    if (typeof document === "undefined") return "charming";
    const attr = document.documentElement.getAttribute("data-style");
    return (attr as Style) || "charming";
  });

  function setAccent(next: Accent) {
    setAccentState(next);
    localStorage.setItem(ACCENT_KEY, next);
    document.documentElement.setAttribute("data-accent", next);
  }

  function setStyle(next: Style) {
    setStyleState(next);
    localStorage.setItem(STYLE_KEY, next);
    document.documentElement.setAttribute("data-style", next);
  }

  return (
    <AppearanceContext.Provider value={{ accent, style, setAccent, setStyle }}>
      {children}
    </AppearanceContext.Provider>
  );
}
