"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { api } from "@/lib/client";
import { matchPoolToJob, type PoolMatch } from "@/lib/talent-match";
import type { IdealProfile, PoolCandidate } from "@/lib/schemas";

export function TalentPoolSuggestions({
  jobId,
  idealProfile,
}: {
  jobId: string;
  idealProfile: IdealProfile;
}) {
  const [matches, setMatches] = useState<PoolMatch[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PoolCandidate[]>("/api/candidates?talent_pool=true").then(
      (pool) => setMatches(matchPoolToJob(idealProfile, pool, jobId)),
      () => {}
    );
  }, [jobId, idealProfile]);

  async function addToRole(match: PoolMatch) {
    if (!match.candidate.resume_text) return;
    setAdding(match.candidate.id);
    setError(null);
    try {
      const res = await fetch("/api/candidates/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          text: match.candidate.resume_text,
          source: match.candidate.source,
          force: true,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.candidate) {
        throw new Error(body?.error ?? "Could not add.");
      }
      setAdded((prev) => ({ ...prev, [match.candidate.id]: body.candidate.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setAdding(null);
    }
  }

  if (matches.length === 0) return null;

  return (
    <Card title="From your talent pool">
      <p className="mb-3 text-sm text-muted">
        People you starred earlier whose skills match this role&apos;s
        must-haves — one tap re-scores them against this JD.
      </p>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <div className="flex flex-col gap-2">
        {matches.slice(0, 5).map((m) => (
          <div
            key={m.candidate.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <Link
                href={`/jobs/${m.candidate.job_id}/candidates/${m.candidate.id}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {m.candidate.name}
              </Link>
              <p className="text-xs text-faint">
                from {m.candidate.job_title}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.matched_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {added[m.candidate.id] ? (
              <Link
                href={`/jobs/${jobId}/candidates/${added[m.candidate.id]}`}
                className="text-sm font-medium text-emerald-700 underline"
              >
                Added — view →
              </Link>
            ) : (
              <Button
                variant="secondary"
                onClick={() => addToRole(m)}
                loading={adding === m.candidate.id}
                className="!min-h-10 !px-3 !text-xs"
              >
                Add to this role
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
