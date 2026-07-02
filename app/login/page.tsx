"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Login failed");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80dvh] items-center justify-center">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-surface p-6 shadow-[0_1px_2px_rgba(33,28,22,0.04)] sm:p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
            HR
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            HR Assistant
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Enter your PIN to continue.
          </p>
        </div>
        <ErrorBanner message={error} />
        <input
          type="password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="mb-4 w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none"
        />
        <Button type="submit" loading={loading} className="w-full">
          Unlock
        </Button>
      </form>
    </div>
  );
}
