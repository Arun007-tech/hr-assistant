"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import {
  CANDIDATE_SOURCES,
  type Candidate,
  type CandidateSource,
} from "@/lib/schemas";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export default function NewCandidatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [source, setSource] = useState<CandidateSource>("linkedin");
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile(picked: File | null) {
    if (picked && picked.size > MAX_FILE_BYTES) {
      setError("File is too large — keep uploads under 4MB.");
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Enter the candidate's name.");
    if (!resumeText.trim() && !file) {
      return setError("Paste the resume/profile text or upload a file.");
    }

    const form = new FormData();
    form.set("job_id", id);
    form.set("name", name.trim());
    form.set("source", source);
    form.set("resume_text", resumeText.trim());
    if (file) form.set("file", file);

    try {
      setStage(
        file && !resumeText.trim()
          ? "Reading file & scoring against the JD…"
          : "Scoring against the JD…"
      );
      const res = await fetch("/api/ai/score-candidate", {
        method: "POST",
        body: form,
      });
      const body = (await res.json().catch(() => null)) as {
        candidate?: Candidate;
        ai_error?: string | null;
        error?: string;
      } | null;
      if (!res.ok || !body?.candidate) {
        throw new Error(body?.error ?? "Could not save the candidate.");
      }
      router.replace(`/jobs/${id}/candidates/${body.candidate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add candidate" backHref={`/jobs/${id}`} />
      <ErrorBanner message={error} />
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-surface p-5 shadow-[0_1px_2px_rgba(33,28,22,0.04)] sm:p-6"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Candidate name"
            className="rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">Source</span>
          <Segmented
            options={CANDIDATE_SOURCES}
            value={source}
            onChange={setSource}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">
            Resume / profile text
          </span>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={12}
            placeholder="Paste the resume or the candidate's profile text here…"
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
          {stage ?? "Save & score"}
        </Button>
        <p className="text-xs text-stone-400">
          Contact details (email, phone) are removed before the resume is sent
          to the AI. The full text stays in your own database.
        </p>
      </form>
    </div>
  );
}
