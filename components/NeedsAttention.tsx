"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { findStale, type SlaDays } from "@/lib/analytics";
import { api, patchJson } from "@/lib/client";
import type { CandidateWithJob } from "@/lib/schemas";

const DEFAULT_SLA: SlaDays = { sourced: 7, screening: 7 };

export function NeedsAttention() {
  const [candidates, setCandidates] = useState<CandidateWithJob[] | null>(
    null
  );
  const [sla, setSla] = useState<SlaDays>(DEFAULT_SLA);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SlaDays>(DEFAULT_SLA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<CandidateWithJob[]>("/api/candidates").then(setCandidates, () => {});
    api<{ sla_days: SlaDays }>("/api/settings").then(
      (s) => setSla(s.sla_days),
      () => {}
    );
  }, []);

  async function saveSla() {
    setSaving(true);
    try {
      const updated = await patchJson<{ sla_days: SlaDays }>("/api/settings", {
        sla_days: draft,
      });
      setSla(updated.sla_days);
      setEditing(false);
    } catch {
      // keep editor open; nothing destructive happened
    } finally {
      setSaving(false);
    }
  }

  if (!candidates) return null;
  const stale = findStale(candidates, sla).slice(0, 5);
  if (stale.length === 0 && !editing) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          Needs attention
        </p>
        <button
          type="button"
          aria-label="Adjust follow-up thresholds"
          onClick={() => {
            setDraft(sla);
            setEditing((v) => !v);
          }}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-amber-700 transition-colors hover:bg-amber-100 active:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/15 dark:active:bg-amber-500/15"
        >
          <Settings className="size-[18px]" aria-hidden />
        </button>
      </div>

      {editing && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl bg-white/70 p-3 dark:bg-black/20">
          {(["sourced", "screening"] as const).map((status) => (
            <label key={status} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-amber-900 capitalize dark:text-amber-300">
                {status} — flag after (days)
              </span>
              <input
                type="number"
                min={1}
                max={90}
                value={draft[status]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [status]: Number(e.target.value) }))
                }
                className="min-h-10 w-24 rounded-lg border border-amber-200 bg-white px-3 text-sm text-foreground focus:border-accent focus:outline-none dark:border-amber-500/20 dark:bg-surface"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={saveSla}
            disabled={saving}
            className="min-h-10 rounded-lg bg-amber-700 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {stale.map(({ candidate, days_stale }) => (
          <Link
            key={candidate.id}
            href={`/jobs/${candidate.job_id}/candidates/${candidate.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-amber-100 dark:hover:bg-amber-500/15"
          >
            <span className="min-w-0 truncate text-amber-900 dark:text-amber-300">
              <span className="font-medium">{candidate.name}</span>
              <span className="text-amber-700 dark:text-amber-400">
                {" "}
                — {candidate.job_title}
              </span>
            </span>
            <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
              {days_stale}d in {candidate.status}, no notes
            </span>
          </Link>
        ))}
        {stale.length === 0 && (
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Nothing overdue with the current thresholds.
          </p>
        )}
      </div>
    </div>
  );
}
