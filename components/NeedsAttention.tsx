"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { findStale } from "@/lib/analytics";
import { api } from "@/lib/client";
import type { CandidateWithJob } from "@/lib/schemas";

export function NeedsAttention() {
  const [candidates, setCandidates] = useState<CandidateWithJob[] | null>(
    null
  );

  useEffect(() => {
    api<CandidateWithJob[]>("/api/candidates").then(setCandidates, () => {});
  }, []);

  if (!candidates) return null;
  const stale = findStale(candidates).slice(0, 5);
  if (stale.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <p className="mb-2 text-sm font-semibold text-amber-900">
        Needs attention
      </p>
      <div className="flex flex-col gap-1.5">
        {stale.map(({ candidate, days_stale }) => (
          <Link
            key={candidate.id}
            href={`/jobs/${candidate.job_id}/candidates/${candidate.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-amber-100"
          >
            <span className="min-w-0 truncate text-amber-900">
              <span className="font-medium">{candidate.name}</span>
              <span className="text-amber-700">
                {" "}
                — {candidate.job_title}
              </span>
            </span>
            <span className="shrink-0 text-xs text-amber-700">
              {days_stale}d in {candidate.status}, no notes
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
