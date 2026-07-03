"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { VoiceInput } from "@/components/VoiceInput";
import { postJson } from "@/lib/client";
import type { AssistantAnswer } from "@/lib/schemas";

type Message = { role: "user" | "assistant"; text: string; citations?: AssistantAnswer["citations"] };

export function ChatBubble() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [asking, setAsking] = useState(false);

  if (pathname === "/login") return null;

  async function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setQuestion("");
    setAsking(true);
    try {
      const result = await postJson<AssistantAnswer>("/api/ai/assistant", {
        question: text,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer, citations: result.citations },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "Something went wrong.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ask the assistant"
        className="fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg hover:bg-accent-hover sm:right-6 sm:bottom-6"
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed right-4 bottom-20 z-30 flex h-[70dvh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-stone-200 bg-surface shadow-xl sm:right-6">
          <div className="border-b border-stone-200 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Ask about your pipeline
            </p>
            <p className="text-xs text-stone-400">
              e.g. &ldquo;which candidates are strong in React?&rdquo;
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-stone-400">
                Ask anything about your jobs and candidates — I&apos;ll answer
                from what&apos;s stored here.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-6 bg-accent-soft text-accent-ink"
                      : "mr-6 bg-stone-50 text-stone-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.citations.map((c) => (
                        <Link
                          key={c.id}
                          href={c.type === "job" ? `/jobs/${c.id}` : `/candidates`}
                          className="rounded-full bg-white px-2 py-0.5 text-xs text-accent underline"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {asking && (
                <div className="mr-6 flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-stone-400">
                  <Spinner className="size-4" />
                  <span className="text-sm">Thinking…</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-stone-200 p-3">
            <div className="flex items-center gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(question)}
                placeholder="Ask a question…"
                className="min-h-11 flex-1 rounded-xl border border-stone-300 px-3 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              <VoiceInput mode="raw" onResult={ask} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
