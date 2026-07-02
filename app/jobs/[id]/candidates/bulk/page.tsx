"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { Spinner } from "@/components/Spinner";
import {
  CANDIDATE_SOURCES,
  type Candidate,
  type CandidateSource,
} from "@/lib/schemas";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

type RowStatus = "queued" | "scoring" | "done" | "error";

interface Row {
  file: File;
  status: RowStatus;
  candidateId?: string;
  name?: string;
  score?: number | null;
  error?: string;
}

export default function BulkUploadPage() {
  const { id } = useParams<{ id: string }>();
  const [source, setSource] = useState<CandidateSource>("linkedin");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  function pickFiles(files: FileList | null) {
    if (!files) return;
    const oversized = [...files].filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setPickError(
        `${oversized.length} file(s) exceed 4MB and were skipped: ${oversized
          .map((f) => f.name)
          .join(", ")}`
      );
    } else {
      setPickError(null);
    }
    const ok = [...files].filter((f) => f.size <= MAX_FILE_BYTES);
    setRows(ok.map((file) => ({ file, status: "queued" as RowStatus })));
  }

  async function runAll() {
    setRunning(true);
    // Sequential, not parallel: each request is independent so a single slow
    // or failed file never blocks the rest, and no batch request risks the
    // 60s serverless timeout.
    for (let i = 0; i < rows.length; i++) {
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "scoring" } : r))
      );
      const form = new FormData();
      form.set("job_id", id);
      form.set("source", source);
      form.set("file", rows[i].file);
      try {
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
          throw new Error(body?.error ?? "Could not score this file.");
        }
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "done",
                  candidateId: body.candidate!.id,
                  name: body.candidate!.name,
                  score: body.candidate!.score,
                }
              : r
          )
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "error",
                  error: err instanceof Error ? err.message : "Failed.",
                }
              : r
          )
        );
      }
    }
    setRunning(false);
  }

  const doneCount = rows.filter((r) => r.status === "done").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Bulk upload" backHref={`/jobs/${id}`} />
      <ErrorBanner message={pickError} />

      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-surface p-5 shadow-[0_1px_2px_rgba(33,28,22,0.04)] sm:p-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">
            Source (applies to all files)
          </span>
          <Segmented
            options={CANDIDATE_SOURCES}
            value={source}
            onChange={setSource}
          />
        </div>

        <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-surface px-5 text-base font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100">
          {rows.length > 0
            ? `${rows.length} file${rows.length === 1 ? "" : "s"} selected`
            : "Select resumes (PDF / DOCX / TXT)"}
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            className="hidden"
            disabled={running}
            onChange={(e) => pickFiles(e.target.files)}
          />
        </label>

        <p className="text-xs text-stone-400">
          Names are extracted automatically from each resume by the AI.
          Contact details are removed before the resume is sent to the AI —
          the full text stays in your own database.
        </p>

        {rows.length > 0 && (
          <Button onClick={runAll} loading={running} disabled={rows.length === 0}>
            {running
              ? `Scoring ${doneCount + errorCount + 1} of ${rows.length}…`
              : `Score all ${rows.length} resumes`}
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.name ?? row.file.name}
                </p>
                {row.status === "error" && (
                  <p className="truncate text-xs text-red-500">{row.error}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.status === "queued" && (
                  <span className="text-xs text-stone-400">Queued</span>
                )}
                {row.status === "scoring" && <Spinner className="size-4" />}
                {row.status === "done" && (
                  <>
                    {row.score != null && (
                      <span className="text-sm font-semibold text-emerald-600">
                        {row.score}
                      </span>
                    )}
                    {row.candidateId && (
                      <Link
                        href={`/jobs/${id}/candidates/${row.candidateId}`}
                        className="text-xs font-medium text-accent hover:text-accent-hover"
                      >
                        View →
                      </Link>
                    )}
                  </>
                )}
                {row.status === "error" && (
                  <span className="text-xs font-medium text-red-500">
                    Failed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
