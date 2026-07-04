import "server-only";
import { findDuplicates, type DuplicateMatch } from "@/lib/duplicates";
import { db } from "@/lib/supabase";

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
}

export type { DuplicateMatch };

// Matches new candidate input against everyone already stored. `name`/`phone`
// hit via the fuzzy matcher; `resumeText` catches paste-the-same-profile-twice
// on the same job before any AI call is spent.
export async function findExistingMatches(input: {
  jobId: string;
  name?: string;
  phone?: string | null;
  resumeText?: string;
}): Promise<DuplicateMatch[]> {
  const { data, error } = await db()
    .from("candidates")
    .select("id, name, phone, job_id, resume_text, jobs(title)");
  if (error) throw new Error(error.message);

  const existing = (data ?? []).map(({ jobs, ...c }) => {
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    return { ...c, job_title: job?.title ?? "" };
  });

  const matches = input.name
    ? findDuplicates(input.name, input.phone ?? null, input.jobId, existing)
    : [];

  if (input.resumeText) {
    const needle = normalizeText(input.resumeText);
    if (needle.length >= 100) {
      for (const c of existing) {
        if (c.job_id !== input.jobId || !c.resume_text) continue;
        if (matches.some((m) => m.id === c.id)) continue;
        if (normalizeText(c.resume_text) === needle) {
          matches.unshift({
            id: c.id,
            name: c.name,
            job_id: c.job_id,
            job_title: c.job_title,
            same_job: true,
            matched_on: "text",
          });
        }
      }
    }
  }
  return matches;
}
