"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { api } from "@/lib/client";
import type { CommandItem } from "@/lib/command-index";
import type { CandidateWithJob, JobListItem } from "@/lib/schemas";

const CommandPaletteContext = createContext<{ open: () => void } | null>(
  null
);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within CommandPaletteProvider"
    );
  }
  return ctx;
}

async function loadIndex(): Promise<CommandItem[]> {
  const [jobs, candidates] = await Promise.all([
    api<JobListItem[]>("/api/jobs"),
    api<CandidateWithJob[]>("/api/candidates"),
  ]);
  const jobItems: CommandItem[] = jobs.map((j) => ({
    type: "job",
    id: j.id,
    label: j.title,
    sublabel: "Role",
    href: `/jobs/${j.id}`,
  }));
  const candidateItems: CommandItem[] = candidates.map((c) => ({
    type: "candidate",
    id: c.id,
    label: c.name,
    sublabel: c.job_title,
    href: `/jobs/${c.job_id}/candidates/${c.id}`,
  }));
  return [...jobItems, ...candidateItems];
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<CommandItem[] | null>(null);

  function openPalette() {
    setOpen(true);
    if (!index) loadIndex().then(setIndex);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev && !index) loadIndex().then(setIndex);
          return !prev;
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index]);

  return (
    <CommandPaletteContext.Provider value={{ open: openPalette }}>
      {children}
      {open && (
        <CommandPalette index={index} onClose={() => setOpen(false)} />
      )}
    </CommandPaletteContext.Provider>
  );
}
