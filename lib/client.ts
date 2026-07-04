"use client";

// sessionStorage key QuickCapture uses to hand a suspected candidate profile
// off to the "add candidate" page (which needs a job picked first).
export const CANDIDATE_PREFILL_KEY = "hr-assistant:candidate-prefill";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }
  if (res.status === 401) {
    window.location.href = "/login";
    // Navigation is async — never resolve so callers don't briefly render
    // an error before the redirect takes effect.
    return new Promise<T>(() => {});
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export function postJson<T>(path: string, data: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function patchJson<T>(path: string, data: unknown): Promise<T> {
  return api<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
