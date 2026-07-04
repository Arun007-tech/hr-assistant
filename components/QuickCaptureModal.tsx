"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { CopyButton } from "@/components/CopyButton";
import { Select } from "@/components/Select";
import { VoiceInput } from "@/components/VoiceInput";
import { api, CANDIDATE_PREFILL_KEY, postJson } from "@/lib/client";
import type { Capture, CaptureAction, JobListItem } from "@/lib/schemas";

type Result = { action: CaptureAction; capture: Capture | null };

const ACTION_LABEL: Record<CaptureAction["action"], string> = {
  todo: "Saved as a to-do",
  note: "Saved as a note",
  draft_reply: "Drafted a reply",
  add_candidate: "Looks like a new candidate",
};

export function QuickCaptureModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const [jobs, setJobs] = useState<JobListItem[] | null>(null);
  const [jobId, setJobId] = useState("");
  const [capturedRaw, setCapturedRaw] = useState("");

  async function submit(override?: string) {
    const payload = (override ?? text).trim();
    if (!payload) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await postJson<Result>("/api/ai/capture", { text: payload });
      setResult(res);
      setCapturedRaw(payload);
      setText("");
      if (res.action.action === "add_candidate" && !jobs) {
        api<JobListItem[]>("/api/jobs").then(setJobs, () => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not capture that.");
    } finally {
      setSubmitting(false);
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

  function goAddCandidate() {
    if (!jobId || !result) return;
    sessionStorage.setItem(
      CANDIDATE_PREFILL_KEY,
      JSON.stringify({ name: result.action.text, text: capturedRaw })
    );
    router.push(`/jobs/${jobId}/candidates/new`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="anim-panel w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Say or paste anything
            </p>
            <p className="text-xs text-faint">
              A to-do, a note, a message to reply to, a profile to add — I&apos;ll
              figure out what to do with it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Dictate with the mic, or paste/type here…"
            className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="text-xs font-medium text-accent hover:text-accent-hover"
            >
              Paste from clipboard
            </button>
            <VoiceInput mode="polish" onResult={(t) => submit(t)} compact />
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          {result && (
            <div className="mt-4 rounded-xl bg-subtle p-3">
              <p className="mb-1.5 text-sm font-semibold text-foreground">
                {ACTION_LABEL[result.action.action]}
              </p>

              {(result.action.action === "todo" ||
                result.action.action === "note") && (
                <p className="text-sm text-foreground/80">
                  {result.action.text}
                </p>
              )}

              {result.action.action === "draft_reply" && (
                <div>
                  <p className="mb-2 text-sm whitespace-pre-wrap text-foreground/80">
                    {result.action.draft_reply}
                  </p>
                  <CopyButton text={result.action.draft_reply ?? ""} />
                </div>
              )}

              {result.action.action === "add_candidate" && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-foreground/80">
                    {result.action.text} — pick a role to add them to:
                  </p>
                  <Select
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    className="min-h-10 rounded-lg border border-border bg-surface pl-3 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">— Choose a role… —</option>
                    {jobs?.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))}
                  </Select>
                  <Button
                    onClick={goAddCandidate}
                    disabled={!jobId}
                    className="!min-h-10 !px-4 !text-sm"
                  >
                    Continue
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <Button
            onClick={() => submit()}
            loading={submitting}
            disabled={!text.trim()}
            className="w-full"
          >
            {submitting ? "Thinking…" : "Capture"}
          </Button>
        </div>
      </div>
    </div>
  );
}
