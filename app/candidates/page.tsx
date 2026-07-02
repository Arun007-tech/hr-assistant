"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Spinner } from "@/components/Spinner";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/format";
import {
  CANDIDATE_SOURCES,
  CANDIDATE_STATUSES,
  type CandidateWithJob,
  type JobListItem,
} from "@/lib/schemas";

const STATUS_FILTERS = ["all", ...CANDIDATE_STATUSES] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-accent";
  return "text-red-600";
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateWithJob[] | null>(
    null
  );
  const [jobs, setJobs] = useState<JobListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jobFilter, setJobFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 900);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<JobListItem[]>("/api/jobs")
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (jobFilter) params.set("job_id", jobFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

    api<CandidateWithJob[]>(`/api/candidates?${params.toString()}`)
      .then((data) => {
        setCandidates(data);
        setSelected((prev) => {
          const ids = new Set(data.map((c) => c.id));
          return new Set([...prev].filter((id) => ids.has(id)));
        });
      })
      .catch((err) => setError(err.message));
  }, [statusFilter, jobFilter, sourceFilter, debouncedSearch]);

  const selectedJobId = useMemo(() => {
    if (selected.size === 0 || !candidates) return null;
    const first = candidates.find((c) => selected.has(c.id));
    return first?.job_id ?? null;
  }, [selected, candidates]);

  function toggleSelect(candidate: CandidateWithJob) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(candidate.id)) {
        next.delete(candidate.id);
        return next;
      }
      // Comparison only makes sense within the same job (scores/skills are
      // relative to that job's JD) — switching jobs resets the selection.
      if (selectedJobId && candidate.job_id !== selectedJobId) {
        return new Set([candidate.id]);
      }
      if (next.size >= 4) return next;
      next.add(candidate.id);
      return next;
    });
  }

  function goCompare() {
    router.push(`/candidates/compare?ids=${[...selected].join(",")}`);
  }

  return (
    <div className="mx-auto max-w-5xl pb-20">
      <PageHeader
        title="Candidates"
        subtitle="Across all roles — filter, search, compare"
      />
      <ErrorBanner message={error} />

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-surface p-4 shadow-[0_1px_2px_rgba(33,28,22,0.04)] sm:p-5">
        <Segmented
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="min-h-11 flex-1 rounded-xl border border-stone-300 px-4 py-2 text-base text-foreground focus:border-accent focus:outline-none"
          />
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="min-h-11 rounded-xl border border-stone-300 bg-surface px-4 py-2 text-base text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">All roles</option>
            {jobs?.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="min-h-11 rounded-xl border border-stone-300 bg-surface px-4 py-2 text-base text-foreground capitalize focus:border-accent focus:outline-none"
          >
            <option value="">All sources</option>
            {CANDIDATE_SOURCES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!candidates && !error && (
        <div className="flex justify-center py-16 text-stone-400">
          <Spinner />
        </div>
      )}

      {candidates && candidates.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-surface p-10 text-center">
          <p className="text-sm text-stone-500">
            No candidates match these filters.
          </p>
        </div>
      )}

      {candidates && candidates.length > 0 && (
        <div className="flex flex-col gap-2">
          {candidates.map((c) => {
            const disabled =
              selectedJobId !== null &&
              c.job_id !== selectedJobId &&
              !selected.has(c.id);
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-xl border border-stone-200 bg-surface px-4 py-3.5 transition-colors ${
                  disabled ? "opacity-40" : "hover:border-stone-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  disabled={disabled}
                  onChange={() => toggleSelect(c)}
                  className="size-5 shrink-0 accent-[var(--accent)]"
                  aria-label={`Select ${c.name} for comparison`}
                />
                <Link
                  href={`/jobs/${c.job_id}/candidates/${c.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-stone-400">
                      {c.job_title} · <span className="capitalize">{c.source}</span>{" "}
                      · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {c.score != null && (
                      <span
                        className={`text-lg font-bold ${scoreColor(c.score)}`}
                      >
                        {c.score}
                      </span>
                    )}
                    <StatusPill status={c.status} />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {selected.size >= 2 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-surface/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm text-stone-600">
              {selected.size} candidate{selected.size === 1 ? "" : "s"}{" "}
              selected
            </p>
            <Button onClick={goCompare}>Compare ({selected.size})</Button>
          </div>
        </div>
      )}
    </div>
  );
}
