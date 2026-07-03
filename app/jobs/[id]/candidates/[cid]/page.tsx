"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CopyButton } from "@/components/CopyButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { QuickShare } from "@/components/QuickShare";
import { ScoreRing } from "@/components/ScoreRing";
import { Segmented } from "@/components/Segmented";
import { SkillStatusIcon } from "@/components/SkillStatusIcon";
import { Spinner } from "@/components/Spinner";
import { VoiceInput } from "@/components/VoiceInput";
import { api, patchJson, postJson } from "@/lib/client";
import {
  CANDIDATE_SOURCES,
  CANDIDATE_STATUSES,
  type CallNotesEvaluation,
  type Candidate,
  type CandidateMessages,
  type CandidateSource,
  type CandidateStatus,
  type EmailTemplate,
} from "@/lib/schemas";

const recommendationStyles: Record<string, string> = {
  advance: "bg-emerald-100 text-emerald-800",
  hold: "bg-amber-100 text-amber-800",
  reject: "bg-red-100 text-red-700",
};

type CandidateDetail = Candidate & { job_title: string };

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
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSource, setEditSource] = useState<CandidateSource>("linkedin");
  const [editResumeText, setEditResumeText] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [messages, setMessages] = useState<CandidateMessages | null>(null);
  const [draftingMessages, setDraftingMessages] = useState(false);
  const [notesEval, setNotesEval] = useState<CallNotesEvaluation | null>(
    null
  );
  const [evaluatingNotes, setEvaluatingNotes] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    api<CandidateDetail>(`/api/candidates/${cid}`)
      .then((c) => {
        setCandidate(c);
        setNotes(c.notes);
        savedNotes.current = c.notes;
      })
      .catch((err) => setError(err.message));
    api<EmailTemplate[]>("/api/email-templates").then(setTemplates, () => {});
  }, [cid]);

  function startEditing() {
    if (!candidate) return;
    setEditName(candidate.name);
    setEditSource(candidate.source);
    setEditResumeText(candidate.resume_text ?? "");
    setEditPhone(candidate.phone ?? "");
    setEditing(true);
  }

  async function saveCandidateEdits() {
    if (!editName.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await patchJson<Candidate>(`/api/candidates/${cid}`, {
        name: editName.trim(),
        source: editSource,
        resume_text: editResumeText.trim(),
        phone: editPhone.trim(),
      });
      merge(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

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

  async function draftMessages() {
    setDraftingMessages(true);
    setError(null);
    try {
      const result = await postJson<CandidateMessages>(
        "/api/ai/candidate-messages",
        { candidate_id: cid }
      );
      setMessages(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft messages.");
    } finally {
      setDraftingMessages(false);
    }
  }

  async function evaluateNotes() {
    setEvaluatingNotes(true);
    setError(null);
    try {
      const result = await postJson<CallNotesEvaluation>(
        "/api/ai/evaluate-notes",
        { candidate_id: cid }
      );
      setNotesEval(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not evaluate notes."
      );
    } finally {
      setEvaluatingNotes(false);
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
          editing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button onClick={saveCandidateEdits} loading={savingEdit}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={startEditing}>
                Edit
              </Button>
              <Button variant="danger" onClick={deleteCandidate}>
                Delete
              </Button>
            </>
          )
        }
      />
      <ErrorBanner message={error} />
      <div className="flex flex-col gap-4">
        {editing && (
          <Card title="Edit candidate">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Name
                </span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Source
                </span>
                <Segmented
                  options={CANDIDATE_SOURCES}
                  value={editSource}
                  onChange={setEditSource}
                />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Phone (for WhatsApp/SMS quick-share, +91XXXXXXXXXX)
                </span>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-stone-700">
                  Resume / profile text
                </span>
                <textarea
                  value={editResumeText}
                  onChange={(e) => setEditResumeText(e.target.value)}
                  rows={10}
                  className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <p className="text-xs text-stone-400">
                Editing the resume text does not automatically re-score — use
                Re-score below when you&apos;re ready.
              </p>
            </div>
          </Card>
        )}
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
                    <span className="mt-0.5">
                      <SkillStatusIcon status={s.status} />
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
          title="Draft messages"
          action={
            messages && (
              <Button
                variant="secondary"
                onClick={draftMessages}
                loading={draftingMessages}
                className="!min-h-11 !px-4 !text-sm"
              >
                Regenerate
              </Button>
            )
          }
        >
          {!messages ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-stone-500">
                Generate ready-to-send outreach, rejection, and hiring-manager
                summary drafts for this candidate.
              </p>
              <Button onClick={draftMessages} loading={draftingMessages}>
                {draftingMessages ? "Drafting…" : "Generate drafts"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {(
                [
                  ["Outreach", messages.outreach],
                  ["Rejection", messages.rejection],
                  ["Hiring manager summary", messages.hiring_manager_summary],
                ] as const
              ).map(([label, text]) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-700">
                      {label}
                    </h3>
                    <CopyButton text={text} />
                  </div>
                  <p className="rounded-lg bg-stone-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-stone-700">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <QuickShare
          candidateId={cid}
          phone={candidate.phone}
          templates={templates}
        />

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
          <div className="mt-2">
            <VoiceInput
              onResult={(text) =>
                setNotes((prev) => (prev.trim() ? `${prev}\n${text}` : text))
              }
            />
          </div>
          {notes.trim().length > 0 && (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={evaluateNotes}
                loading={evaluatingNotes}
                className="!min-h-11 !px-4 !text-sm"
              >
                {evaluatingNotes
                  ? "Evaluating…"
                  : notesEval
                    ? "Re-evaluate notes"
                    : "Evaluate notes"}
              </Button>
              {notesEval && (
                <div className="mt-3 rounded-xl bg-stone-50 p-3">
                  <span
                    className={`mb-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${recommendationStyles[notesEval.recommendation]}`}
                  >
                    {notesEval.recommendation}
                  </span>
                  <p className="mb-2 text-sm text-stone-600">
                    {notesEval.rationale}
                  </p>
                  {notesEval.strengths.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-stone-700">
                        Strengths
                      </p>
                      <ul className="text-sm text-stone-600">
                        {notesEval.strengths.map((s) => (
                          <li key={s}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {notesEval.concerns.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-stone-700">
                        Concerns
                      </p>
                      <ul className="text-sm text-stone-600">
                        {notesEval.concerns.map((c) => (
                          <li key={c}>• {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {candidate.resume_text && !editing && (
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
