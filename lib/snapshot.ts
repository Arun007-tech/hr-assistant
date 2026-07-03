import "server-only";
import { db } from "@/lib/supabase";

// Compact jobs+candidates snapshot for the assistant's context. No PII
// (phone excluded); resume text summarized via existing ai_analysis, not
// sent raw, to keep the prompt small and avoid re-exposing full resumes.
export async function buildDataSnapshot() {
  const [jobsResult, candidatesResult] = await Promise.all([
    db()
      .from("jobs")
      .select("id, title, jd_text, ideal_profile"),
    db()
      .from("candidates")
      .select(
        "id, name, job_id, source, status, score, ai_analysis, notes, created_at"
      ),
  ]);
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (candidatesResult.error) throw new Error(candidatesResult.error.message);

  const jobs = (jobsResult.data ?? []).map((j) => ({
    id: j.id,
    title: j.title,
    must_have_skills: j.ideal_profile?.must_have_skills ?? [],
    jd_excerpt: (j.jd_text ?? "").slice(0, 300),
  }));

  const candidates = (candidatesResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    job_id: c.job_id,
    source: c.source,
    status: c.status,
    score: c.score,
    verdict: c.ai_analysis?.verdict ?? null,
    summary: c.ai_analysis?.summary ?? null,
    skills_match: c.ai_analysis?.skills_match ?? [],
    gaps: c.ai_analysis?.gaps ?? [],
    notes: c.notes,
  }));

  return { jobs, candidates };
}
