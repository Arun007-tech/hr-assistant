"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { api, postJson } from "@/lib/client";
import type { EmailTemplate } from "@/lib/schemas";

const EMPTY = { name: "", subject: "", greeting: "", signature: "" };

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function load() {
    api<EmailTemplate[]>("/api/email-templates")
      .then(setTemplates)
      .catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) {
      setError("Name and subject are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await postJson("/api/email-templates", form);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await api(`/api/email-templates/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Email templates"
        subtitle="Used to draft outreach messages from your voice notes"
      />
      <ErrorBanner message={error} />

      <Card title="New template" className="mb-4">
        <form onSubmit={create} className="flex flex-col gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Template name (e.g. Candidate outreach)"
            className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Default subject line"
            className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
          <input
            value={form.greeting}
            onChange={(e) => setForm({ ...form, greeting: e.target.value })}
            placeholder="Greeting (e.g. Hi {name},)"
            className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
          <textarea
            value={form.signature}
            onChange={(e) => setForm({ ...form, signature: e.target.value })}
            placeholder="Signature (name, title, contact)"
            rows={3}
            className="rounded-xl border border-border px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
          />
          <Button type="submit" loading={saving}>
            Save template
          </Button>
        </form>
      </Card>

      {!templates && !error && (
        <div className="flex justify-center py-16 text-faint">
          <Spinner />
        </div>
      )}
      {templates?.map((t) => (
        <Card key={t.id} title={t.name} className="mb-3">
          <p className="mb-1 text-sm text-muted">
            <span className="font-medium">Subject:</span> {t.subject}
          </p>
          {t.greeting && (
            <p className="mb-1 text-sm text-muted">
              <span className="font-medium">Greeting:</span> {t.greeting}
            </p>
          )}
          {t.signature && (
            <p className="mb-3 text-sm whitespace-pre-wrap text-muted">
              <span className="font-medium">Signature:</span> {t.signature}
            </p>
          )}
          <Button
            variant="danger"
            onClick={() => remove(t.id)}
            className="!min-h-11 !px-4 !text-sm"
          >
            Delete
          </Button>
        </Card>
      ))}
    </div>
  );
}
