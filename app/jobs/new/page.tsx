"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { postJson } from "@/lib/client";
import type { Job } from "@/lib/schemas";

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

  return (
    <>
      <PageHeader title="New role" backHref="/" />
      <ErrorBanner message={error} />
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Role title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Backend Engineer — Bengaluru"
            className="rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-sky-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">
            Job description
          </span>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={12}
            placeholder="Paste the full JD here…"
            className="rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-sky-500 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">or</span>
          <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-base font-medium text-slate-700 active:bg-slate-100">
            {file ? file.name : "Upload PDF / DOCX / TXT"}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <Button type="submit" loading={stage !== null}>
          {stage ?? "Save & analyze"}
        </Button>
      </form>
    </>
  );
}
