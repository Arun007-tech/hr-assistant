"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { postJson } from "@/lib/client";
import type { Job } from "@/lib/schemas";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the role a title.");
    if (!jdText.trim() && !file)
      return setError("Paste the JD or upload a file.");

    const form = new FormData();
    form.set("title", title.trim());
    form.set("jd_text", jdText.trim());
    if (file) form.set("file", file);

    try {
      setStage(file && !jdText.trim() ? "Reading file…" : "Saving role…");
      const res = await fetch("/api/jobs", { method: "POST", body: form });
      const job = (await res.json().catch(() => null)) as Job | null;
      if (!res.ok || !job) {
        throw new Error(
          (job as { error?: string } | null)?.error ?? "Could not save the role."
        );
      }
      setStage("Analyzing JD — building profile and search strings…");
      try {
        await postJson("/api/ai/analyze-jd", { job_id: job.id });
      } catch {
        // Analysis can be retried from the role page; don't lose the saved JD.
      }
      router.replace(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage(null);
    }
  }

  function pickFile(picked: File | null) {
    if (picked && picked.size > MAX_FILE_BYTES) {
      setError("File is too large — keep uploads under 4MB.");
      return;
    }
    setError(null);
    setFile(picked);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New role" backHref="/" />
      <ErrorBanner message={error} />
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-surface p-5 shadow-[0_1px_2px_rgba(33,28,22,0.04)] sm:p-6"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Role title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Backend Engineer — Bengaluru"
            className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">
            Job description
          </span>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={12}
            placeholder="Paste the full JD here…"
            className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-stone-400">or</span>
          <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-surface px-5 text-base font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100">
            {file ? file.name : "Upload PDF / DOCX / TXT"}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <Button type="submit" loading={stage !== null}>
          {stage ?? "Save & analyze"}
        </Button>
      </form>
    </div>
  );
}
