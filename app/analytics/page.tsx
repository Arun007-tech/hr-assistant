"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FunnelChart } from "@/components/FunnelChart";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { api, postJson } from "@/lib/client";
import { bySourceBreakdown, buildFunnel } from "@/lib/analytics";
import type { CandidateWithJob, JobListItem, PipelineDigest } from "@/lib/schemas";

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  apna: "Apna",
  other: "Other",
};

export default function AnalyticsPage() {
  const [candidates, setCandidates] = useState<CandidateWithJob[] | null>(
    null
  );
  const [jobs, setJobs] = useState<JobListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState("");
  const [digest, setDigest] = useState<PipelineDigest | null>(null);
  const [generatingDigest, setGeneratingDigest] = useState(false);

  useEffect(() => {
    Promise.all([
      api<CandidateWithJob[]>("/api/candidates"),
      api<JobListItem[]>("/api/jobs"),
    ])
      .then(([c, j]) => {
        setCandidates(c);
        setJobs(j);
      })
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    return jobFilter
      ? candidates.filter((c) => c.job_id === jobFilter)
      : candidates;
  }, [candidates, jobFilter]);

  const funnel = useMemo(() => buildFunnel(filtered), [filtered]);
  const sources = useMemo(() => bySourceBreakdown(filtered), [filtered]);
  const maxSourceCount = Math.max(1, ...sources.map((s) => s.count));

  async function generateDigest() {
    setGeneratingDigest(true);
    setError(null);
    try {
      const result = await postJson<PipelineDigest>(
        "/api/ai/pipeline-digest",
        {}
      );
      setDigest(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate digest."
      );
    } finally {
      setGeneratingDigest(false);
    }
  }

  if (!candidates || !jobs) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Analytics" />
        <ErrorBanner message={error} />
        {!error && (
          <div className="flex justify-center py-16 text-stone-400">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Analytics"
        subtitle="Pipeline funnel and sourcing breakdown"
      />
      <ErrorBanner message={error} />

      <div className="mb-4">
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="min-h-11 rounded-xl border border-stone-300 bg-surface px-4 py-2 text-base text-foreground focus:border-accent focus:outline-none"
        >
          <option value="">All roles</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Pipeline funnel">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400">
              No candidates yet.
            </p>
          ) : (
            <FunnelChart stages={funnel} />
          )}
        </Card>

        <Card title="Sourcing channels">
          {sources.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400">
              No candidates yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sources.map((s) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm font-medium text-stone-600">
                    {SOURCE_LABELS[s.source] ?? s.source}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-stone-100">
                    <div
                      className="h-full rounded-md bg-accent transition-all"
                      style={{
                        width: `${(s.count / maxSourceCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold text-foreground">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Weekly digest"
          action={
            <Button
              variant="secondary"
              onClick={generateDigest}
              loading={generatingDigest}
              className="!min-h-11 !px-4 !text-sm"
            >
              {digest ? "Regenerate" : "Generate"}
            </Button>
          }
        >
          {!digest ? (
            <p className="text-sm text-stone-500">
              Generate an AI-written summary of your current pipeline —
              useful for a quick status update to a hiring manager.
            </p>
          ) : (
            <div>
              <p className="mb-2 font-semibold text-foreground">
                {digest.headline}
              </p>
              <p className="mb-3 text-sm leading-relaxed text-stone-600">
                {digest.summary}
              </p>
              {digest.stat_callouts.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {digest.stat_callouts.map((s) => (
                    <span
                      key={s.label}
                      className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink"
                    >
                      {s.label}: {s.value}
                    </span>
                  ))}
                </div>
              )}
              {digest.highlights.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm text-stone-600">
                  {digest.highlights.map((h) => (
                    <li key={h}>• {h}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
