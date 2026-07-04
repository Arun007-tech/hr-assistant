"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { NeedsAttention } from "@/components/NeedsAttention";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonCard } from "@/components/Skeleton";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/format";
import type { JobListItem } from "@/lib/schemas";

const countStyles: Record<string, string> = {
  sourced: "bg-subtle text-foreground/80",
  screening: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  shortlisted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<JobListItem[]>("/api/jobs")
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-10 -z-10 size-56 rounded-full bg-accent/15 blur-3xl"
        />
        <PageHeader
          title="Roles"
          gradient
          subtitle="Your open positions and candidate pipelines"
          action={
            <Button onClick={() => router.push("/jobs/new")}>
              + New role
            </Button>
          }
        />
      </div>
      <ErrorBanner message={error} />
      <NeedsAttention />
      {!jobs && !error && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {jobs && jobs.length === 0 && (
        <div className="anim-rise rounded-2xl border border-dashed border-border bg-surface p-10 text-center sm:p-16">
          <p className="mb-1 text-lg font-semibold text-foreground">
            No roles yet
          </p>
          <p className="mx-auto mb-5 max-w-sm text-sm text-muted">
            Paste a job description to get an ideal candidate profile and
            ready-to-use search strings.
          </p>
          <Button onClick={() => router.push("/jobs/new")}>
            Add your first role
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {jobs?.map((job, i) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="group anim-rise rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md active:translate-y-0 active:scale-[0.98] active:bg-subtle"
            style={{ "--stagger": i } as React.CSSProperties}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground group-hover:text-accent">
                {job.title}
              </h2>
              <span className="shrink-0 text-xs text-faint">
                {formatDate(job.created_at)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {job.total === 0 ? (
                <span className="text-sm text-faint">
                  No candidates yet
                </span>
              ) : (
                Object.entries(job.counts)
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => (
                    <span
                      key={status}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${countStyles[status]}`}
                    >
                      {count} {status}
                    </span>
                  ))
              )}
              {!job.analyzed && (
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
                  JD not analyzed
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
