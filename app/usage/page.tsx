"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/client";
import {
  GEMINI_RPD_APPROX,
  QUOTA_REFERENCE_NOTE,
} from "@/lib/quota-reference";
import type { DbSizeInfo, UsageSummary } from "@/lib/schemas";

const KIND_LABELS: Record<string, string> = {
  "analyze-jd": "JD analysis",
  "score-candidate": "Candidate scoring",
  "screening-questions": "Screening questions",
  "extract-pdf": "PDF text extraction",
  "extract-document-text": "Document text extraction",
  "jd-quality": "JD quality check",
  "candidate-messages": "Message drafts",
  "interview-plan": "Interview plan",
  "evaluate-notes": "Notes evaluation",
  "pipeline-digest": "Pipeline digest",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

function barColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-accent";
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [dbSize, setDbSize] = useState<DbSizeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ usage: UsageSummary; db_size: DbSizeInfo }>("/api/usage")
      .then((body) => {
        setUsage(body.usage);
        setDbSize(body.db_size);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loaded = usage && dbSize;
  const dayPct = Math.min(
    100,
    ((usage?.total_today ?? 0) / GEMINI_RPD_APPROX) * 100
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Usage"
        subtitle="AI call volume and database storage — self-tracked, free-tier friendly"
      />
      <ErrorBanner message={error} />
      {!loaded && !error && (
        <div className="flex justify-center py-16 text-stone-400">
          <Spinner />
        </div>
      )}
      {loaded && (
        <div className="flex flex-col gap-4">
          <Card title="Gemini calls today">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {usage.total_today}
              </span>
              <span className="text-sm text-stone-500">
                ~{GEMINI_RPD_APPROX}/day reference
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className={`h-full rounded-full transition-all ${barColor(dayPct)}`}
                style={{ width: `${dayPct}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-stone-400">
              {QUOTA_REFERENCE_NOTE}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-500">This week</p>
                <p className="text-lg font-semibold text-foreground">
                  {usage.total_this_week}
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-500">This month</p>
                <p className="text-lg font-semibold text-foreground">
                  {usage.total_this_month}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Database storage">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {dbSize.mb < 1 ? "<1" : dbSize.mb.toFixed(1)} MB
              </span>
              <span className="text-sm text-stone-500">
                of {dbSize.cap_mb} MB free tier
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className={`h-full rounded-full transition-all ${barColor(dbSize.pct)}`}
                style={{ width: `${Math.max(2, dbSize.pct)}%` }}
              />
            </div>
          </Card>

          <Card title="By feature (last 30 days)">
            {usage.kinds.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-400">
                No AI calls yet.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-stone-100">
                {usage.kinds.map((k) => (
                  <div
                    key={k.kind}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {kindLabel(k.kind)}
                      </p>
                      <p className="text-xs text-stone-400">
                        {k.today} today · {k.this_week} this week
                        {k.errors_this_month > 0 && (
                          <span className="text-red-500">
                            {" "}
                            · {k.errors_this_month} error
                            {k.errors_this_month === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-semibold text-foreground">
                      {k.this_month}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
