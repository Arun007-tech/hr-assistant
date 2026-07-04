"use client";

import { Star } from "lucide-react";
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
  type OfferHelper,
} from "@/lib/schemas";

const recommendationStyles: Record<string, string> = {
  advance: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  hold: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  reject: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

type CandidateDetail = Candidate & { job_title: string };

const focusLabels: Record<string, { label: string; className: string }> = {
  must_have: { label: "Must-have", className: "bg-accent-soft text-accent-ink" },
  gap: { label: "Gap", className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  experience: { label: "Experience", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" },
  behavioral: { label: "Behavioral", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400" },
  logistics: { label: "Logistics", className: "bg-subtle text-muted" },
  claims: { label: "Claims", className: "bg-accent-soft text-accent-ink" },
  performance: { label: "Performance", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400" },
  collaboration: { label: "Collaboration", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" },
  integrity: { label: "Integrity", className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
};

function QuestionList({
  questions,
}: {
  questions: { question: string; focus: string; listen_for: string }[];
}) {
  return (
    <ol className="flex flex-col gap-4">
      {questions.map((q, i) => {
        const focus = focusLabels[q.focus] ?? focusLabels.experience;
        return (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <span className="text-sm font-bold text-faint">{i + 1}.</span>
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
              <span className="text-sm text-muted">
                Listen for: {q.listen_for}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

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
  const [generatingRef, setGeneratingRef] = useState(false);
  const [expectedCtc, setExpectedCtc] = useState("");
  const [offeredBand, setOfferedBand] = useState("");
  const [offerHelp, setOfferHelp] = useState<OfferHelper | null>(null);
  const [generatingOffer, setGeneratingOffer] = useState(false);

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

  async function toggleTalentPool() {
    if (!candidate) return;
    const next = !candidate.talent_pool;
    merge({ ...candidate, talent_pool: next });
    try {
      await patchJson(`/api/candidates/${cid}`, { talent_pool: next });
    } catch (err) {
      merge({ ...candidate, talent_pool: !next });
      setError(err instanceof Error ? err.message : "Could not update.");
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

  async function generateReferenceQuestions() {
    setGeneratingRef(true);
    setError(null);
    try {
      const updated = await postJson<Candidate>(
        "/api/ai/reference-questions",
        { candidate_id: cid }
      );
      merge(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate questions."
      );
    } finally {
      setGeneratingRef(false);
    }
  }

  async function generateOfferHelp() {
    setGeneratingOffer(true);
    setError(null);
    try {
      const result = await postJson<OfferHelper>("/api/ai/offer-helper", {
        candidate_id: cid,
        expected_ctc: expectedCtc.trim(),
        offered_band: offeredBand.trim(),
      });
      setOfferHelp(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not prepare negotiation notes."
      );
    } finally {
      setGeneratingOffer(false);
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
          <div className="flex justify-center py-16 text-faint">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  const analysis = candidate.ai_analysis;
  const questions = candidate.screening_questions?.questions ?? [];
  const refQuestions = candidate.reference_questions?.questions ?? [];

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
                <span className="text-sm font-medium text-foreground/80">
                  Name
                </span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/80">
                  Source
                </span>
                <Segmented
                  options={CANDIDATE_SOURCES}
                  value={editSource}
                  onChange={setEditSource}
                />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/80">
                  Phone (for WhatsApp/SMS quick-share, +91XXXXXXXXXX)
                </span>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/80">
                  Resume / profile text
                </span>
                <textarea
                  value={editResumeText}
                  onChange={(e) => setEditResumeText(e.target.value)}
                  rows={10}
                  className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <p className="text-xs text-faint">
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
          <button
            type="button"
            onClick={toggleTalentPool}
            className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
              candidate.talent_pool
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                : "border-border bg-surface text-muted hover:bg-subtle active:bg-subtle"
            }`}
          >
            <Star
              className="size-4"
              fill={candidate.talent_pool ? "currentColor" : "none"}
              aria-hidden
            />
            {candidate.talent_pool ? "In talent pool" : "Add to talent pool"}
          </button>
          <p className="mt-1.5 text-xs text-faint">
            Pool candidates get suggested automatically when a new role
            matches their skills.
          </p>
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
              <p className="text-sm text-muted">
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
                  <p className="mt-1 text-sm leading-relaxed text-muted">
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
                      <p className="text-sm font-medium text-foreground">
                        {s.skill}
                      </p>
                      <p className="text-sm text-muted">{s.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mb-3 text-sm leading-relaxed text-muted">
                <span className="font-medium text-foreground/80">Experience: </span>
                {analysis.experience_relevance}
              </p>
              {analysis.gaps.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-foreground/80">
                    Gaps to probe
                  </p>
                  <ul className="flex flex-col gap-1 text-sm text-muted">
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
              <p className="text-sm text-muted">
                Generate call questions tailored to this JD and this
                candidate&apos;s gaps.
              </p>
              <Button onClick={generateQuestions} loading={generating}>
                {generating ? "Writing questions…" : "Generate questions"}
              </Button>
            </div>
          ) : (
            <QuestionList questions={questions} />
          )}
        </Card>

        <Card
          title="Reference-check questions"
          action={
            refQuestions.length > 0 && (
              <Button
                variant="secondary"
                onClick={generateReferenceQuestions}
                loading={generatingRef}
                className="!min-h-11 !px-4 !text-sm"
              >
                Regenerate
              </Button>
            )
          }
        >
          {refQuestions.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted">
                Questions for a former manager or colleague — verifies what
                the candidate claimed, from a third party.
              </p>
              <Button onClick={generateReferenceQuestions} loading={generatingRef}>
                {generatingRef ? "Writing questions…" : "Generate questions"}
              </Button>
            </div>
          ) : (
            <QuestionList questions={refQuestions} />
          )}
        </Card>

        <Card title="Offer & negotiation helper">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/80">
                  Candidate&apos;s expected CTC
                </span>
                <input
                  value={expectedCtc}
                  onChange={(e) => setExpectedCtc(e.target.value)}
                  placeholder="e.g. ₹28 LPA"
                  className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground/80">
                  Offered band
                </span>
                <input
                  value={offeredBand}
                  onChange={(e) => setOfferedBand(e.target.value)}
                  placeholder="e.g. ₹22-25 LPA"
                  className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
                />
              </label>
            </div>
            <Button
              onClick={generateOfferHelp}
              loading={generatingOffer}
              disabled={!expectedCtc.trim() || !offeredBand.trim()}
            >
              {generatingOffer
                ? "Preparing…"
                : offerHelp
                  ? "Regenerate"
                  : "Prepare negotiation notes"}
            </Button>

            {offerHelp && (
              <div className="mt-2 flex flex-col gap-4">
                <p className="text-sm leading-relaxed text-muted">
                  {offerHelp.summary}
                </p>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-foreground/80">
                    Talking points
                  </p>
                  <ul className="flex flex-col gap-1 text-sm text-muted">
                    {offerHelp.talking_points.map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                </div>
                {offerHelp.risks.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-foreground/80">
                      Risks
                    </p>
                    <ul className="flex flex-col gap-1 text-sm text-muted">
                      {offerHelp.risks.map((r) => (
                        <li key={r}>⚠️ {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground/80">
                      Counter script
                    </p>
                    <CopyButton text={offerHelp.counter_script} />
                  </div>
                  <p className="rounded-lg bg-subtle p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                    {offerHelp.counter_script}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  <span className="font-medium text-foreground/80">
                    Suggested close:{" "}
                  </span>
                  {offerHelp.suggested_close}
                </p>
              </div>
            )}
          </div>
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
              <p className="text-sm text-muted">
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
                    <h3 className="text-sm font-semibold text-foreground/80">
                      {label}
                    </h3>
                    <CopyButton text={text} />
                  </div>
                  <p className="rounded-lg bg-subtle p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
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
            <span className="text-xs text-faint">
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
            className="w-full rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
          <div className="mt-2">
            <VoiceInput
              onResult={(text) =>
                setNotes((prev) => (prev.trim() ? `${prev}\n${text}` : text))
              }
              hint="Speak freely — filler words get cleaned up and added below."
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
                <div className="mt-3 rounded-xl bg-subtle p-3">
                  <span
                    className={`mb-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${recommendationStyles[notesEval.recommendation]}`}
                  >
                    {notesEval.recommendation}
                  </span>
                  <p className="mb-2 text-sm text-muted">
                    {notesEval.rationale}
                  </p>
                  {notesEval.strengths.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-foreground/80">
                        Strengths
                      </p>
                      <ul className="text-sm text-muted">
                        {notesEval.strengths.map((s) => (
                          <li key={s}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {notesEval.concerns.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground/80">
                        Concerns
                      </p>
                      <ul className="text-sm text-muted">
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
          <details className="rounded-2xl border border-border bg-surface card-shadow">
            <summary className="min-h-12 cursor-pointer px-5 py-3.5 text-base font-semibold text-foreground sm:px-6">
              Resume / profile text
            </summary>
            <pre className="border-t border-border px-5 py-4 font-sans text-sm whitespace-pre-wrap text-muted sm:px-6">
              {candidate.resume_text}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
