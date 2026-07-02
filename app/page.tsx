"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/format";
import type { JobListItem } from "@/lib/schemas";

const countStyles: Record<string, string> = {
  sourced: "bg-slate-100 text-slate-700",
  screening: "bg-amber-100 text-amber-800",
  shortlisted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
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

  async function lock() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Your open positions and candidate pipelines"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={lock} aria-label="Lock app">
              Lock
            </Button>
            <Button onClick={() => router.push("/jobs/new")}>+ New role</Button>
          </div>
        }
      />
      <ErrorBanner message={error} />
      {!jobs && !error && (
        <div className="flex justify-center py-16 text-slate-400">
          <Spinner />
        </div>
      )}
      {jobs && jobs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="mb-1 text-lg font-semibold text-slate-700">
            No roles yet
          </p>
          <p className="mb-5 text-sm text-slate-500">
            Paste a job description to get an ideal candidate profile and
            ready-to-use search strings.
          </p>
          <Button onClick={() => router.push("/jobs/new")}>
            Add your first role
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {jobs?.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors active:bg-slate-50"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {job.title}
              </h2>
              <span className="shrink-0 text-xs text-slate-400">
                {formatDate(job.created_at)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {job.total === 0 ? (
                <span className="text-sm text-slate-400">
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
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
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
