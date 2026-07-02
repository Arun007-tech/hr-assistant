"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { ScoreRing } from "@/components/ScoreRing";
import { Segmented } from "@/components/Segmented";
import { Spinner } from "@/components/Spinner";
import { api, patchJson, postJson } from "@/lib/client";
import {
  CANDIDATE_STATUSES,
  type Candidate,
  type CandidateStatus,
} from "@/lib/schemas";

type CandidateDetail = Candidate & { job_title: string };

const skillIcon = {
  strong: { symbol: "✓", className: "text-emerald-600" },
  partial: { symbol: "~", className: "text-amber-600" },
  missing: { symbol: "✕", className: "text-red-500" },
};

const focusLabels: Record<string, { label: string; className: string }> = {
  must_have: { label: "Must-have", className: "bg-accent-soft text-accent-ink" },
  gap: { label: "Gap", className: "bg-red-100 text-red-700" },
  experience: { label: "Experience", className: "bg-violet-100 text-violet-700" },
  behavioral: { label: "Behavioral", className: "bg-amber-100 text-amber-800" },
  logistics: { label: "Logistics", className: "bg-stone-100 text-stone-600" },
};

export default function CandidatePage() {
  const { id, cid } = useParams<{ id: string; cid: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState("");
  const savedNotes = useRef("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    api<CandidateDetail>(`/api/candidates/${cid}`)
      .then((c) => {
        setCandidate(c);
        setNotes(c.notes);
        savedNotes.current = c.notes;
      })
      .catch((err) => setError(err.message));
  }, [cid]);

  useEffect(() => {
    if (notes === savedNotes.current) return;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        await patchJson(`/api/candidates/${cid}`, { notes });
        savedNotes.current = notes;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [notes, cid]);

  function merge(updated: Candidate) {
    setCandidate((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  async function setStatus(status: CandidateStatus) {
    if (!candidate) return;
    const previous = candidate.status;
    setCandidate({ ...candidate, status });
    try {
      await patchJson(`/api/candidates/${cid}`, { status });
    } catch (err) {
      setCandidate((prev) => (prev ? { ...prev, status: previous } : prev));
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  async function rescore() {
    setScoring(true);
    setError(null);
    try {
      const body = await postJson<{ candidate: Candidate }>(
        "/api/ai/score-candidate",
        { candidate_id: cid }
      );
      merge(body.candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setScoring(false);
    }
  }

  async function generateQuestions() {
    setGenerating(true);
    setError(null);
    try {
      const updated = await postJson<Candidate>("/api/ai/screening-questions", {
        candidate_id: cid,
      });
      merge(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate questions."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function deleteCandidate() {
    if (!confirm("Delete this candidate? This cannot be undone.")) return;
    try {
      await api(`/api/candidates/${cid}`, { method: "DELETE" });
      router.replace(`/jobs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  if (!candidate) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Candidate" backHref={`/jobs/${id}`} />
        <ErrorBanner message={error} />
        {!error && (
          <div className="flex justify-center py-16 text-stone-400">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  const analysis = candidate.ai_analysis;
  const questions = candidate.screening_questions?.questions ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={candidate.name}
        subtitle={`${candidate.job_title} · via ${candidate.source}`}
        backHref={`/jobs/${id}`}
        action={
          <Button variant="danger" onClick={deleteCandidate}>
            Delete
          </Button>
        }
      />
      <ErrorBanner message={error} />
      <div className="flex flex-col gap-4">
        <Card title="Status">
          <Segmented
            options={CANDIDATE_STATUSES}
            value={candidate.status}
            onChange={setStatus}
          />
        </Card>

        <Card
          title="Fit score"
          action={
            analysis && (
              <Button
                variant="secondary"
                onClick={rescore}
                loading={scoring}
                className="!min-h-11 !px-4 !text-sm"
              >
                Re-score
              </Button>
            )
          }
        >
          {!analysis ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-stone-500">
                No AI analysis yet for this candidate.
              </p>
              <Button onClick={rescore} loading={scoring}>
                {scoring ? "Scoring against the JD…" : "Run analysis"}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-4">
                <ScoreRing score={candidate.score} />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {analysis.verdict}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    {analysis.summary}
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-col gap-2">
                {analysis.skills_match.map((s) => (
                  <div key={s.skill} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 w-4 shrink-0 text-center font-bold ${skillIcon[s.status].className}`}
                    >
                      {skillIcon[s.status].symbol}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800">
                        {s.skill}
                      </p>
                      <p className="text-sm text-stone-500">{s.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mb-3 text-sm leading-relaxed text-stone-600">
                <span className="font-medium text-stone-700">Experience: </span>
                {analysis.experience_relevance}
              </p>
              {analysis.gaps.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-stone-700">
                    Gaps to probe
                  </p>
                  <ul className="flex flex-col gap-1 text-sm text-stone-600">
                    {analysis.gaps.map((gap) => (
                      <li key={gap}>• {gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>

        <Card
          title="Screening questions"
          action={
            questions.length > 0 && (
              <Button
                variant="secondary"
                onClick={generateQuestions}
                loading={generating}
                className="!min-h-11 !px-4 !text-sm"
              >
                Regenerate
              </Button>
            )
          }
        >
          {questions.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-stone-500">
                Generate call questions tailored to this JD and this
                candidate&apos;s gaps.
              </p>
              <Button onClick={generateQuestions} loading={generating}>
                {generating ? "Writing questions…" : "Generate questions"}
              </Button>
            </div>
          ) : (
            <ol className="flex flex-col gap-4">
              {questions.map((q, i) => {
                const focus = focusLabels[q.focus] ?? focusLabels.experience;
                return (
                  <li key={i} className="flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold text-stone-400">
                        {i + 1}.
                      </span>
                      <p className="text-[15px] font-medium text-foreground">
                        {q.question}
                      </p>
                    </div>
                    <div className="ml-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${focus.className}`}
                      >
                        {focus.label}
                      </span>
                      <span className="text-sm text-stone-500">
                        Listen for: {q.listen_for}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card
          title="Notes"
          action={
            <span className="text-xs text-stone-400">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved ✓"}
              {saveState === "error" && (
                <span className="text-red-500">Not saved — check connection</span>
              )}
            </span>
          }
        >
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Call notes, availability, impressions…"
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
        </Card>

        {candidate.resume_text && (
          <details className="rounded-2xl border border-stone-200 bg-surface shadow-[0_1px_2px_rgba(33,28,22,0.04)]">
            <summary className="min-h-12 cursor-pointer px-5 py-3.5 text-base font-semibold text-foreground sm:px-6">
              Resume / profile text
            </summary>
            <pre className="border-t border-stone-100 px-5 py-4 font-sans text-sm whitespace-pre-wrap text-stone-600 sm:px-6">
              {candidate.resume_text}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
