import type { IdealProfile, PoolCandidate } from "@/lib/schemas";

export interface PoolMatch {
  candidate: PoolCandidate;
  matched_skills: string[];
}

function norm(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
}

// Overlap between a role's must-have skills and a pooled candidate's proven
// (strong/partial) skills from their stored analysis. Pure string matching —
// no AI call.
export function matchPoolToJob(
  idealProfile: IdealProfile,
  pool: PoolCandidate[],
  jobId: string
): PoolMatch[] {
  const wanted = idealProfile.must_have_skills.map((s) => ({
    raw: s,
    n: norm(s),
  }));
  if (wanted.length === 0) return [];

  return pool
    .filter((c) => c.job_id !== jobId && c.ai_analysis)
    .map((candidate) => {
      const proven = candidate
        .ai_analysis!.skills_match.filter((s) => s.status !== "missing")
        .map((s) => norm(s.skill));
      const matched = wanted
        .filter((w) => proven.some((p) => p.includes(w.n) || w.n.includes(p)))
        .map((w) => w.raw);
      return { candidate, matched_skills: matched };
    })
    .filter((m) => m.matched_skills.length >= 2)
    .sort((a, b) => b.matched_skills.length - a.matched_skills.length);
}
