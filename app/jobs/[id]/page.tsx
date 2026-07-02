"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CopyButton } from "@/components/CopyButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { ScoreRing } from "@/components/ScoreRing";
import { Segmented } from "@/components/Segmented";
import { Spinner } from "@/components/Spinner";
import { StatusPill } from "@/components/StatusPill";
import { api, patchJson, postJson } from "@/lib/client";
import { formatDate } from "@/lib/format";
import {
  CANDIDATE_STATUSES,
  type InterviewPlan,
  type JdQuality,
  type Job,
  type JobWithCandidates,
} from "@/lib/schemas";

const FILTERS = ["all", ...CANDIDATE_STATUSES] as const;
type Filter = (typeof FILTERS)[number];
const SORTS = ["score", "newest"] as const;
type Sort = (typeof SORTS)[number];

const chipTones = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  stone: "border-stone-200 bg-stone-50 text-stone-600",
  accent: "border-accent-soft bg-accent-soft text-accent-ink",
};

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: keyof typeof chipTones;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${chipTones[tone]}`}
    >
      {children}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-accent";
  return "text-red-600";
}

function SearchStrings({ label, strings }: { label: string; strings: string[] }) {
  if (strings.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-2 text-sm font-semibold text-stone-700">{label}</h3>
      <div className="flex flex-col gap-2">
        {strings.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-lg bg-stone-50 p-3 font-mono text-sm break-words whitespace-pre-wrap text-stone-800">
              {s}
            </code>
            <CopyButton text={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobWithCandidates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("score");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editJdText, setEditJdText] = useState("");
  const [saving, setSaving] = useState(false);
  const [jdQuality, setJdQuality] = useState<JdQuality | null>(null);
  const [checkingQuality, setCheckingQuality] = useState(false);
  const [interviewPlan, setInterviewPlan] = useState<InterviewPlan | null>(
    null
  );
  const [planningInterview, setPlanningInterview] = useState(false);

  useEffect(() => {
    api<JobWithCandidates>(`/api/jobs/${id}`)
      .then(setJob)
      .catch((err) => setError(err.message));
  }, [id]);

  function startEditing() {
    if (!job) return;
    setEditTitle(job.title);
    setEditJdText(job.jd_text);
    setEditing(true);
  }

  async function saveEdits() {
    if (!editTitle.trim() || !editJdText.trim()) {
      setError("Title and job description can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await patchJson<Job>(`/api/jobs/${id}`, {
        title: editTitle.trim(),
        jd_text: editJdText.trim(),
      });
      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setError(null);
    try {
      const updated = await postJson<Job>("/api/ai/analyze-jd", { job_id: id });
      setJob((prev) =>
        prev ? { ...prev, ...updated, candidates: prev.candidates } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runJdQuality() {
    setCheckingQuality(true);
    setError(null);
    try {
      const result = await postJson<JdQuality>("/api/ai/jd-quality", {
        job_id: id,
      });
      setJdQuality(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quality check failed.");
    } finally {
      setCheckingQuality(false);
    }
  }

  async function runInterviewPlan() {
    setPlanningInterview(true);
    setError(null);
    try {
      const result = await postJson<InterviewPlan>("/api/ai/interview-plan", {
        job_id: id,
      });
      setInterviewPlan(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate a plan."
      );
    } finally {
      setPlanningInterview(false);
    }
  }

  async function deleteJob() {
    if (!confirm("Delete this role and all its candidates?")) return;
    try {
      await api(`/api/jobs/${id}`, { method: "DELETE" });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const candidates = useMemo(() => {
    if (!job) return [];
    const list =
      filter === "all"
        ? job.candidates
        : job.candidates.filter((c) => c.status === filter);
    return [...list].sort((a, b) =>
      sort === "score"
        ? (b.score ?? -1) - (a.score ?? -1)
        : +new Date(b.created_at) - +new Date(a.created_at)
    );
  }, [job, filter, sort]);

  if (!job) {
    return (
      <>
        <PageHeader title="Role" backHref="/" />
        <ErrorBanner message={error} />
        {!error && (
          <div className="flex justify-center py-16 text-stone-400">
            <Spinner />
          </div>
        )}
      </>
    );
  }

  const profile = job.ideal_profile;
  const searches = job.boolean_searches;
  const filterLabels = Object.fromEntries(
    FILTERS.map((f) => [
      f,
      `${f} (${
        f === "all"
          ? job.candidates.length
          : job.candidates.filter((c) => c.status === f).length
      })`,
    ])
  ) as Record<Filter, string>;

  return (
    <>
      <PageHeader
        title={job.title}
        subtitle={`Added ${formatDate(job.created_at)}`}
        backHref="/"
        action={
          editing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={saveEdits} loading={saving}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={startEditing}>
                Edit
              </Button>
              <Button variant="danger" onClick={deleteJob}>
                Delete
              </Button>
            </>
          )
        }
      />
      <ErrorBanner message={error} />
      <div className="flex flex-col gap-4">
        {editing && (
          <Card title="Edit role">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Role title
                </span>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Job description
                </span>
                <textarea
                  value={editJdText}
                  onChange={(e) => setEditJdText(e.target.value)}
                  rows={12}
                  className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <p className="text-xs text-stone-400">
                Editing the JD does not automatically re-run analysis — use
                Regenerate below when you&apos;re ready.
              </p>
            </div>
          </Card>
        )}
        {!profile && !editing && (
          <Card title="AI analysis">
            <p className="mb-4 text-sm text-stone-500">
              Generate the ideal candidate profile and Boolean search strings
              for this JD.
            </p>
            <Button onClick={runAnalysis} loading={analyzing}>
              {analyzing ? "Analyzing JD…" : "Analyze JD"}
            </Button>
          </Card>
        )}

        {(profile || searches) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            {profile && (
              <Card
                title="Ideal candidate"
                action={
                  <Button
                    variant="secondary"
                    onClick={runAnalysis}
                    loading={analyzing}
                    className="!min-h-11 !px-4 !text-sm"
                  >
                    Regenerate
                  </Button>
                }
              >
                <p className="mb-4 text-sm leading-relaxed text-stone-600">
                  {profile.summary}
                </p>
                <div className="flex flex-col gap-3 text-sm">
                  <div>
                    <p className="mb-1.5 font-medium text-stone-700">
                      Must have
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.must_have_skills.map((s) => (
                        <Chip key={s} tone="emerald">
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {profile.nice_to_have_skills.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-medium text-stone-700">
                        Nice to have
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.nice_to_have_skills.map((s) => (
                          <Chip key={s} tone="stone">
                            {s}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                  <p>
                    <span className="font-medium text-stone-700">
                      Experience:{" "}
                    </span>
                    <span className="text-stone-600">
                      {profile.experience_range}
                    </span>
                  </p>
                  <div>
                    <p className="mb-1.5 font-medium text-stone-700">
                      Titles to search for
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.likely_titles.map((t) => (
                        <Chip key={t} tone="accent">
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {profile.red_flags.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-medium text-stone-700">
                        Red flags
                      </p>
                      <ul className="flex flex-col gap-1 text-stone-600">
                        {profile.red_flags.map((flag) => (
                          <li key={flag}>⚠️ {flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {searches && (
              <Card title="Search strings">
                <SearchStrings label="LinkedIn" strings={searches.linkedin} />
                <SearchStrings label="Naukri" strings={searches.naukri} />
                {searches.apna_keywords.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-stone-700">
                        Apna keywords
                      </h3>
                      <CopyButton text={searches.apna_keywords.join(", ")} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {searches.apna_keywords.map((k) => (
                        <Chip key={k} tone="stone">
                          {k}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        <Card
          title="Candidates"
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/jobs/${id}/candidates/bulk`)}
                className="!min-h-11 !px-4 !text-sm"
              >
                Bulk upload
              </Button>
              <Button
                onClick={() => router.push(`/jobs/${id}/candidates/new`)}
                className="!min-h-11 !px-4 !text-sm"
              >
                + Add
              </Button>
            </div>
          }
        >
          {job.candidates.length > 0 && (
            <div className="mb-4 flex flex-col gap-2.5">
              <Segmented
                options={FILTERS}
                value={filter}
                onChange={setFilter}
                labels={filterLabels}
              />
              <Segmented
                options={SORTS}
                value={sort}
                onChange={setSort}
                labels={{ score: "By score", newest: "Newest" }}
              />
            </div>
          )}
          {candidates.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400">
              {job.candidates.length === 0
                ? "No candidates yet — add one you found on LinkedIn, Naukri or Apna."
                : "No candidates with this status."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {candidates.map((c) => (
                <Link
                  key={c.id}
                  href={`/jobs/${id}/candidates/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3.5 transition-colors hover:border-stone-300 hover:bg-stone-50 active:bg-stone-100"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {c.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      <span className="capitalize">{c.source}</span> ·{" "}
                      {formatDate(c.created_at)}
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
              ))}
            </div>
          )}
        </Card>

        <Card
          title="JD quality check"
          action={
            jdQuality && (
              <Button
                variant="secondary"
                onClick={runJdQuality}
                loading={checkingQuality}
                className="!min-h-11 !px-4 !text-sm"
              >
                Re-check
              </Button>
            )
          }
        >
          {!jdQuality ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-stone-500">
                Check this JD for clarity and exclusionary language, with
                concrete rewrite suggestions.
              </p>
              <Button onClick={runJdQuality} loading={checkingQuality}>
                {checkingQuality ? "Checking…" : "Check JD quality"}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-4">
                <ScoreRing score={jdQuality.clarity_score} size={72} />
                <p className="text-sm leading-relaxed text-stone-600">
                  {jdQuality.summary}
                </p>
              </div>
              {jdQuality.issues.length > 0 && (
                <div className="mb-4 flex flex-col gap-3">
                  {jdQuality.issues.map((issue, i) => (
                    <div key={i} className="rounded-xl bg-stone-50 p-3 text-sm">
                      <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 capitalize">
                        {issue.type}
                      </span>
                      <p className="text-stone-700">&ldquo;{issue.text}&rdquo;</p>
                      <p className="mt-1 text-stone-500">
                        → {issue.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {jdQuality.rewritten_jd && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-700">
                      Suggested rewrite
                    </h3>
                    <CopyButton text={jdQuality.rewritten_jd} />
                  </div>
                  <pre className="max-h-64 overflow-y-auto rounded-lg bg-stone-50 p-3 font-sans text-sm whitespace-pre-wrap text-stone-700">
                    {jdQuality.rewritten_jd}
                  </pre>
                </div>
              )}
            </>
          )}
        </Card>

        <Card
          title="Interview plan"
          action={
            interviewPlan && (
              <Button
                variant="secondary"
                onClick={runInterviewPlan}
                loading={planningInterview}
                className="!min-h-11 !px-4 !text-sm"
              >
                Regenerate
              </Button>
            )
          }
        >
          {!interviewPlan ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-stone-500">
                Generate a structured multi-round interview loop tailored to
                this role.
              </p>
              <Button onClick={runInterviewPlan} loading={planningInterview}>
                {planningInterview ? "Planning…" : "Generate interview plan"}
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-stone-500">
                Estimated timeline: {interviewPlan.total_estimated_days}
              </p>
              <ol className="flex flex-col gap-4">
                {interviewPlan.rounds.map((round, i) => (
                  <li key={i} className="rounded-xl bg-stone-50 p-4">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-foreground">
                        {i + 1}. {round.name}
                      </p>
                      <span className="shrink-0 text-xs text-stone-500">
                        {round.duration_mins} min
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-stone-600">
                      {round.format}
                    </p>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {round.focus_areas.map((f) => (
                        <Chip key={f} tone="accent">
                          {f}
                        </Chip>
                      ))}
                    </div>
                    <ul className="flex flex-col gap-1 text-sm text-stone-600">
                      {round.sample_questions.map((q) => (
                        <li key={q}>• {q}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>

        {!editing && (
          <details className="rounded-2xl border border-stone-200 bg-surface shadow-[0_1px_2px_rgba(33,28,22,0.04)]">
            <summary className="min-h-12 cursor-pointer px-5 py-3.5 text-base font-semibold text-foreground sm:px-6">
              Job description
            </summary>
            <pre className="border-t border-stone-100 px-5 py-4 font-sans text-sm whitespace-pre-wrap text-stone-600 sm:px-6">
              {job.jd_text}
            </pre>
          </details>
        )}
      </div>
    </>
  );
}
