"use client";

import { Send, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { findStale, type SlaDays } from "@/lib/analytics";
import { api, patchJson, postJson } from "@/lib/client";
import type {
  AssistantAnswer,
  CandidateWithJob,
  Capture,
  PipelineDigest,
} from "@/lib/schemas";

const DEFAULT_SLA: SlaDays = { sourced: 7, screening: 7 };

// One home-screen panel that replaces three previously-separate surfaces:
// the stale-candidate nudge, the pipeline digest (previously analytics-only),
// and a quick version of the "ask anything" assistant. Both AI calls below
// are opt-in button presses, never automatic — the app runs on Gemini's free
// tier and this page loads every time she opens the app.
export function TodayBrief() {
  const [candidates, setCandidates] = useState<CandidateWithJob[] | null>(
    null
  );
  const [sla, setSla] = useState<SlaDays>(DEFAULT_SLA);
  const [editingSla, setEditingSla] = useState(false);
  const [slaDraft, setSlaDraft] = useState<SlaDays>(DEFAULT_SLA);
  const [savingSla, setSavingSla] = useState(false);

  const [digest, setDigest] = useState<PipelineDigest | null>(null);
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const [captures, setCaptures] = useState<Capture[] | null>(null);

  useEffect(() => {
    api<CandidateWithJob[]>("/api/candidates").then(setCandidates, () => {});
    api<{ sla_days: SlaDays }>("/api/settings").then(
      (s) => setSla(s.sla_days),
      () => {}
    );
    api<Capture[]>("/api/captures").then(setCaptures, () => {});
  }, []);

  async function resolveCapture(id: string) {
    setCaptures((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    try {
      await patchJson(`/api/captures/${id}`, { done: true });
    } catch {
      // best-effort — a stray still-open capture is harmless, re-fetch next load
    }
  }

  async function saveSla() {
    setSavingSla(true);
    try {
      const updated = await patchJson<{ sla_days: SlaDays }>(
        "/api/settings",
        { sla_days: slaDraft }
      );
      setSla(updated.sla_days);
      setEditingSla(false);
    } catch {
      // keep editor open; nothing destructive happened
    } finally {
      setSavingSla(false);
    }
  }

  async function getDigest() {
    setLoadingDigest(true);
    setDigestError(null);
    try {
      const result = await postJson<PipelineDigest>(
        "/api/ai/pipeline-digest",
        {}
      );
      setDigest(result);
    } catch (err) {
      setDigestError(
        err instanceof Error ? err.message : "Could not generate the brief."
      );
    } finally {
      setLoadingDigest(false);
    }
  }

  async function ask() {
    const text = question.trim();
    if (!text) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const result = await postJson<AssistantAnswer>("/api/ai/assistant", {
        question: text,
      });
      setAnswer(result);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  }

  const stale = candidates ? findStale(candidates, sla).slice(0, 5) : [];

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 card-shadow sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-accent" aria-hidden />
          Today
        </p>
        {!digest && (
          <button
            type="button"
            onClick={getDigest}
            disabled={loadingDigest}
            className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            {loadingDigest ? <Spinner className="size-3.5" /> : null}
            {loadingDigest ? "Thinking…" : "Get today's brief"}
          </button>
        )}
      </div>

      {digestError && <p className="text-xs text-red-500">{digestError}</p>}

      {digest && (
        <div className="rounded-xl bg-accent-soft/60 px-3 py-2.5">
          <p className="mb-1 text-sm font-semibold text-accent-ink">
            {digest.headline}
          </p>
          <p className="mb-2 text-sm leading-relaxed text-foreground/80">
            {digest.summary}
          </p>
          {digest.stat_callouts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {digest.stat_callouts.map((s) => (
                <span
                  key={s.label}
                  className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-accent-ink"
                >
                  {s.label}: {s.value}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overdue follow-ups — same logic as before, just folded into one panel. */}
      {(stale.length > 0 || editingSla) && (
        <div className="border-t border-border pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-faint uppercase">
              Needs attention
            </p>
            <button
              type="button"
              aria-label="Adjust follow-up thresholds"
              onClick={() => {
                setSlaDraft(sla);
                setEditingSla((v) => !v);
              }}
              className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle"
            >
              <Settings className="size-4" aria-hidden />
            </button>
          </div>

          {editingSla && (
            <div className="mb-2 flex flex-wrap items-end gap-3 rounded-xl bg-subtle p-3">
              {(["sourced", "screening"] as const).map((status) => (
                <label key={status} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground/80 capitalize">
                    {status} — flag after (days)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={slaDraft[status]}
                    onChange={(e) =>
                      setSlaDraft((d) => ({
                        ...d,
                        [status]: Number(e.target.value),
                      }))
                    }
                    className="min-h-10 w-24 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={saveSla}
                disabled={savingSla}
                className="min-h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors disabled:opacity-50"
              >
                {savingSla ? "Saving…" : "Save"}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {stale.map(({ candidate, days_stale }) => (
              <Link
                key={candidate.id}
                href={`/jobs/${candidate.job_id}/candidates/${candidate.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-subtle"
              >
                <span className="min-w-0 truncate text-foreground/80">
                  <span className="font-medium text-foreground">
                    {candidate.name}
                  </span>{" "}
                  — {candidate.job_title}
                </span>
                <span className="shrink-0 text-xs text-faint">
                  {days_stale}d in {candidate.status}
                </span>
              </Link>
            ))}
            {stale.length === 0 && (
              <p className="text-sm text-faint">
                Nothing overdue with the current thresholds.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Captured to-dos/notes — from the "Say or paste anything" button. */}
      {captures && captures.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-faint uppercase">
            To-dos &amp; notes
          </p>
          <div className="flex flex-col gap-1">
            {captures.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => resolveCapture(c.id)}
                  aria-label={
                    c.kind === "todo" ? "Mark done" : "Dismiss note"
                  }
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1 text-foreground/80">
                  {c.text}
                  {(c.candidate_name || c.job_title) && (
                    <Link
                      href={
                        c.candidate_id && c.job_id
                          ? `/jobs/${c.job_id}/candidates/${c.candidate_id}`
                          : "/candidates"
                      }
                      className="ml-1.5 text-xs text-accent underline"
                    >
                      {c.candidate_name ?? c.job_title}
                    </Link>
                  )}
                </span>
                <span className="shrink-0 text-xs text-faint capitalize">
                  {c.kind}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ask anything, right here — same assistant the chat bubble uses. */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask anything about your pipeline…"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-border px-3 text-sm text-foreground focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={ask}
            disabled={asking || !question.trim()}
            aria-label="Ask"
            className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {asking ? <Spinner className="size-4" /> : <Send className="size-4" aria-hidden />}
          </button>
        </div>
        {askError && <p className="mt-2 text-xs text-red-500">{askError}</p>}
        {answer && (
          <div className="mt-2 rounded-xl bg-subtle px-3 py-2 text-sm text-foreground/80">
            <p className="whitespace-pre-wrap">{answer.answer}</p>
            {answer.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {answer.citations.map((c) => (
                  <Link
                    key={c.id}
                    href={c.type === "job" ? `/jobs/${c.id}` : "/candidates"}
                    className="rounded-full bg-surface px-2 py-0.5 text-xs text-accent underline"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
