"use client";

import { ClipboardPaste, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { DuplicateWarning } from "@/components/DuplicateWarning";
import { Segmented } from "@/components/Segmented";
import { Select } from "@/components/Select";
import { api } from "@/lib/client";
import type { DuplicateMatch } from "@/lib/duplicates";
import {
  CANDIDATE_SOURCES,
  type Candidate,
  type CandidateSource,
  type JobListItem,
} from "@/lib/schemas";

export function QuickAdd() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<JobListItem[] | null>(null);
  const [jobId, setJobId] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState<CandidateSource>("linkedin");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Candidate | null>(null);
  const [blockers, setBlockers] = useState<DuplicateMatch[]>([]);
  const [notices, setNotices] = useState<DuplicateMatch[]>([]);
  const [pendingText, setPendingText] = useState("");

  if (pathname === "/login") return null;

  function toggle() {
    setOpen((v) => !v);
    if (!jobs) {
      api<JobListItem[]>("/api/jobs").then(setJobs, () => {});
    }
  }

  async function submit(force: boolean, textOverride?: string) {
    const payload = (textOverride ?? text).trim();
    if (!payload || !jobId) return;
    setSaving(true);
    setError(null);
    setResult(null);
    setBlockers([]);
    setNotices([]);
    try {
      const res = await fetch("/api/candidates/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, text: payload, source, force }),
      });
      const body = (await res.json().catch(() => null)) as {
        candidate?: Candidate;
        ai_error?: string | null;
        error?: string;
        duplicates?: DuplicateMatch[];
      } | null;
      if (res.status === 409 && body?.duplicates) {
        setBlockers(body.duplicates);
        setPendingText(payload);
        return;
      }
      if (!res.ok || !body?.candidate) {
        throw new Error(body?.error ?? "Could not add candidate.");
      }
      setResult(body.candidate);
      setText("");
      if (body.duplicates?.length) setNotices(body.duplicates);
      if (body.ai_error) setError(body.ai_error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add candidate.");
    } finally {
      setSaving(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip);
    } catch {
      setError("Couldn't read clipboard — paste manually into the box.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Quick add candidate"
        className="fixed bottom-4 left-4 z-30 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:opacity-90 active:scale-95 sm:bottom-6 sm:left-6"
      >
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <ClipboardPaste className="size-6" aria-hidden />
        )}
      </button>

      {open && (
        <div className="anim-panel fixed bottom-20 left-4 z-30 flex max-h-[70dvh] w-[calc(100vw-2rem)] max-w-sm origin-bottom-left flex-col rounded-2xl border border-border bg-surface shadow-xl sm:bottom-24 sm:left-6">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Quick add candidate
            </p>
            <p className="text-xs text-faint">
              Paste a profile from LinkedIn/Naukri — name is picked up
              automatically and it&apos;s scored against the role you choose.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <Select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              wrapperClassName="mb-3"
              className="min-h-11 rounded-xl border border-border bg-surface pl-3 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">— Score against role… —</option>
              {jobs?.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
            <Segmented options={CANDIDATE_SOURCES} value={source} onChange={setSource} />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Paste profile text…"
              className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="mt-2 text-xs font-medium text-accent hover:text-accent-hover"
            >
              Paste from clipboard
            </button>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            {blockers.length > 0 && (
              <div className="mt-3">
                <DuplicateWarning
                  duplicates={blockers}
                  onForce={() => submit(true, pendingText)}
                  onDismiss={() => setBlockers([])}
                  forcing={saving}
                />
              </div>
            )}
            {notices.length > 0 && (
              <div className="mt-3">
                <DuplicateWarning
                  duplicates={notices}
                  onDismiss={() => setNotices([])}
                />
              </div>
            )}
            {result && (
              <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                Added <span className="font-medium">{result.name}</span>
                {result.score != null && <> — score {result.score}</>}.{" "}
                <Link
                  href={`/jobs/${result.job_id}/candidates/${result.id}`}
                  className="underline"
                >
                  View
                </Link>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <Button
              onClick={() => submit(false)}
              loading={saving}
              disabled={!text.trim() || !jobId}
              className="w-full"
            >
              {saving ? "Scoring…" : "Add & score"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
