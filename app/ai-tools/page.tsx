"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/PageHeader";
import { Segmented } from "@/components/Segmented";
import { VoiceInput } from "@/components/VoiceInput";
import { postJson } from "@/lib/client";
import { linkedinPeopleSearchUrl } from "@/lib/format";
import {
  TONES,
  type ComposedEmail,
  type JobPost,
  type QuickSummary,
  type RewrittenText,
  type TermExplanation,
  type Tone,
} from "@/lib/schemas";

const TOOLS = [
  "email",
  "rewrite",
  "summarize",
  "explain",
  "job-post",
  "boolean",
] as const;
type Tool = (typeof TOOLS)[number];

const TOOL_LABELS: Record<Tool, string> = {
  email: "Compose email",
  rewrite: "Rewrite & tone",
  summarize: "Summarize",
  explain: "Explain a term",
  "job-post": "Job post writer",
  boolean: "Boolean search",
};

const textareaClass =
  "w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

function useAsync<T>() {
  const [result, setResult] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<T>) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return { result, loading, error, run, setResult };
}

function ComposeEmailTool() {
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<Tone>("formal");
  const { result, loading, error, run } = useAsync<ComposedEmail>();

  return (
    <Card title="Compose an email">
      <p className="mb-3 text-sm text-muted">
        Who it&apos;s to and what it&apos;s about — any email, not just
        candidates or hiring managers.
      </p>
      <Segmented options={TONES} value={tone} onChange={setTone} />
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        placeholder="e.g. Tell the vendor we're pushing the contract review to next week…"
        className={`mt-3 ${textareaClass}`}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <VoiceInput mode="polish" onResult={setBrief} compact />
        <Button
          onClick={() => run(() => postJson("/api/ai/compose-email", { brief, tone }))}
          loading={loading}
          disabled={!brief.trim()}
          className="!min-h-10 !px-4 !text-sm"
        >
          Generate
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl bg-subtle p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {result.subject}
            </p>
            <CopyButton text={`Subject: ${result.subject}\n\n${result.body}`} />
          </div>
          <p className="text-sm whitespace-pre-wrap text-foreground/80">
            {result.body}
          </p>
        </div>
      )}
    </Card>
  );
}

function RewriteTool() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Tone>("formal");
  const { result, loading, error, run } = useAsync<RewrittenText>();

  return (
    <Card title="Rewrite & tone-shift">
      <p className="mb-3 text-sm text-muted">
        Paste any text — a message, a post, a snippet — and shift its tone.
      </p>
      <Segmented options={TONES} value={tone} onChange={setTone} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste text to rewrite…"
        className={`mt-3 ${textareaClass}`}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <VoiceInput mode="raw" onResult={setText} compact />
        <Button
          onClick={() => run(() => postJson("/api/ai/rewrite-text", { text, tone }))}
          loading={loading}
          disabled={!text.trim()}
          className="!min-h-10 !px-4 !text-sm"
        >
          Rewrite
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl bg-subtle p-3">
          <div className="mb-2 flex justify-end">
            <CopyButton text={result.rewritten} />
          </div>
          <p className="text-sm whitespace-pre-wrap text-foreground/80">
            {result.rewritten}
          </p>
        </div>
      )}
    </Card>
  );
}

function SummarizeTool() {
  const [text, setText] = useState("");
  const { result, loading, error, run } = useAsync<QuickSummary>();

  return (
    <Card title="Quick summarize">
      <p className="mb-3 text-sm text-muted">
        Paste a long thread, JD, or notes dump — get the gist fast.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Paste text to summarize…"
        className={textareaClass}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <VoiceInput mode="raw" onResult={setText} compact />
        <Button
          onClick={() => run(() => postJson("/api/ai/quick-summary", { text }))}
          loading={loading}
          disabled={!text.trim()}
          className="!min-h-10 !px-4 !text-sm"
        >
          Summarize
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl bg-subtle p-3">
          <p className="mb-2 text-sm text-foreground/80">{result.summary}</p>
          {result.key_points.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-foreground/80">
              {result.key_points.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function ExplainTool() {
  const [term, setTerm] = useState("");
  const { result, loading, error, run } = useAsync<TermExplanation>();

  return (
    <Card title="Explain a term">
      <p className="mb-3 text-sm text-muted">
        A skill, acronym, or tool you don&apos;t know — get the plain-language
        version and what to ask about it.
      </p>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="e.g. Kubernetes, CI/CD, SOC 2…"
        className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex justify-end">
        <Button
          onClick={() => run(() => postJson("/api/ai/explain-term", { term }))}
          loading={loading}
          disabled={!term.trim()}
          className="!min-h-10 !px-4 !text-sm"
        >
          Explain
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl bg-subtle p-3">
          <p className="mb-2 text-sm text-foreground/80">
            {result.explanation}
          </p>
          <p className="text-sm font-medium text-accent-ink">
            {result.why_it_matters_for_hiring}
          </p>
        </div>
      )}
    </Card>
  );
}

function JobPostTool() {
  const [notes, setNotes] = useState("");
  const { result, loading, error, run } = useAsync<JobPost>();

  return (
    <Card title="Job post writer">
      <p className="mb-3 text-sm text-muted">
        Rough bullet notes in, a polished job post out — ready to publish.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="e.g. Senior backend engineer, 5+ yrs, Node + Postgres, remote OK, must have led a team…"
        className={textareaClass}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <VoiceInput mode="raw" onResult={setNotes} compact />
        <Button
          onClick={() =>
            run(() => postJson("/api/ai/job-post", { rough_notes: notes }))
          }
          loading={loading}
          disabled={!notes.trim()}
          className="!min-h-10 !px-4 !text-sm"
        >
          Write it
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl bg-subtle p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {result.title_suggestion}
            </p>
            <CopyButton text={result.job_post} />
          </div>
          <p className="text-sm whitespace-pre-wrap text-foreground/80">
            {result.job_post}
          </p>
        </div>
      )}
    </Card>
  );
}

function BooleanTool() {
  const [skills, setSkills] = useState("");
  const { result, loading, error, run } = useAsync<{
    linkedin: string[];
    naukri: string[];
    apna_keywords: string[];
  }>();

  return (
    <Card title="Boolean search generator">
      <p className="mb-3 text-sm text-muted">
        A freeform list of skills or keywords — no job record needed yet.
      </p>
      <textarea
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
        rows={3}
        placeholder="e.g. React, TypeScript, Next.js, 3-6 years, fintech background preferred"
        className={textareaClass}
      />
      <div className="mt-2 flex justify-end">
        <Button
          onClick={() => run(() => postJson("/api/ai/boolean-generator", { skills }))}
          loading={loading}
          disabled={!skills.trim()}
          className="!min-h-10 !px-4 !text-sm"
        >
          Generate
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-4 flex flex-col gap-3">
          {(
            [
              ["LinkedIn", result.linkedin, true],
              ["Naukri", result.naukri, false],
            ] as const
          ).map(([label, strings, isLinkedin]) => (
            <div key={label}>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-faint uppercase">
                {label}
              </p>
              <div className="flex flex-col gap-1.5">
                {strings.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 rounded-lg bg-subtle p-2.5"
                  >
                    <code className="min-w-0 flex-1 text-xs break-words text-foreground/80">
                      {s}
                    </code>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isLinkedin && (
                        <a
                          href={linkedinPeopleSearchUrl(s)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Search LinkedIn people with this string"
                          className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-surface"
                        >
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      )}
                      <CopyButton text={s} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {result.apna_keywords.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-faint uppercase">
                Apna keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.apna_keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-subtle px-2.5 py-1 text-xs text-foreground/80"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function AiToolsPage() {
  const [tool, setTool] = useState<Tool>("email");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="AI Tools"
        gradient
        subtitle="Generic AI utilities — not tied to any candidate or job."
      />
      <div className="mb-4">
        <Segmented options={TOOLS} value={tool} onChange={setTool} labels={TOOL_LABELS} />
      </div>
      {tool === "email" && <ComposeEmailTool />}
      {tool === "rewrite" && <RewriteTool />}
      {tool === "summarize" && <SummarizeTool />}
      {tool === "explain" && <ExplainTool />}
      {tool === "job-post" && <JobPostTool />}
      {tool === "boolean" && <BooleanTool />}
    </div>
  );
}
