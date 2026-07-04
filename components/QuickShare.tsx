"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CopyButton } from "@/components/CopyButton";
import { VoiceInput } from "@/components/VoiceInput";
import { postJson } from "@/lib/client";
import type { EmailDraft, EmailTemplate } from "@/lib/schemas";

function toWhatsAppDigits(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function QuickShare({
  candidateId,
  phone,
  templates,
}: {
  candidateId: string;
  phone: string | null;
  templates: EmailTemplate[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!templateId || !transcript.trim()) return;
    setDrafting(true);
    setError(null);
    try {
      const result = await postJson<EmailDraft>("/api/ai/draft-email", {
        template_id: templateId,
        transcript,
        candidate_id: candidateId,
      });
      setDraft(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft message.");
    } finally {
      setDrafting(false);
    }
  }

  if (templates.length === 0) return null;

  const messageText = draft ? `${draft.subject}\n\n${draft.body}` : "";
  const digits = phone ? toWhatsAppDigits(phone) : "";

  return (
    <Card title="Quick share">
      <p className="mb-3 text-sm text-muted">
        Speak what you want to say — draft it, then send via WhatsApp, SMS, or
        copy for email.
      </p>
      <select
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        className="mb-3 min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-base text-foreground focus:border-accent focus:outline-none"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <VoiceInput
        mode="raw"
        onResult={setTranscript}
        className="mb-3"
        hint="Say what you want the message to cover — it's turned into a full draft using your template."
      />
      {transcript && (
        <p className="mb-3 rounded-lg bg-subtle p-3 text-sm text-muted italic">
          &ldquo;{transcript}&rdquo;
        </p>
      )}
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <Button
        onClick={generate}
        loading={drafting}
        disabled={!transcript.trim()}
        className="!min-h-11 !px-4 !text-sm"
      >
        {drafting ? "Drafting…" : "Draft message"}
      </Button>

      {draft && (
        <div className="mt-4">
          <div className="mb-3 rounded-lg bg-subtle p-3">
            <p className="mb-1.5 text-sm font-semibold text-foreground/80">
              {draft.subject}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
              {draft.body}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {digits && (
              <a
                href={`https://wa.me/${digits}?text=${encodeURIComponent(draft.body)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
              >
                WhatsApp
              </a>
            )}
            {phone && (
              <a
                href={`sms:${phone}?body=${encodeURIComponent(draft.body)}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground/80 hover:bg-subtle"
              >
                SMS
              </a>
            )}
            <a
              href={`mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground/80 hover:bg-subtle"
            >
              Email
            </a>
            <CopyButton text={messageText} />
          </div>
          {!phone && (
            <p className="mt-2 text-xs text-faint">
              Add a phone number (Edit candidate) to enable WhatsApp/SMS.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
