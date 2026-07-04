import {
  CANDIDATE_SOURCES,
  CANDIDATE_STATUSES,
  type CandidateSource,
  type CandidateStatus,
} from "@/lib/schemas";

export interface FunnelStage {
  status: CandidateStatus;
  count: number;
  pct_of_total: number;
}

export interface SourceBreakdown {
  source: CandidateSource;
  count: number;
  pct_of_total: number;
}

interface CandidateLike {
  status: CandidateStatus;
  source: CandidateSource;
  notes: string;
  updated_at: string;
}

export function buildFunnel(candidates: CandidateLike[]): FunnelStage[] {
  const total = candidates.length;
  return CANDIDATE_STATUSES.map((status) => {
    const count = candidates.filter((c) => c.status === status).length;
    return {
      status,
      count,
      pct_of_total: total === 0 ? 0 : (count / total) * 100,
    };
  });
}

export function bySourceBreakdown(candidates: CandidateLike[]): SourceBreakdown[] {
  const total = candidates.length;
  return CANDIDATE_SOURCES.map((source) => {
    const count = candidates.filter((c) => c.source === source).length;
    return {
      source,
      count,
      pct_of_total: total === 0 ? 0 : (count / total) * 100,
    };
  }).filter((s) => s.count > 0);
}

export interface StaleCandidate<T> {
  candidate: T;
  days_stale: number;
}

export interface SlaDays {
  sourced: number;
  screening: number;
}

export function findStale<T extends CandidateLike>(
  candidates: T[],
  slaDays: SlaDays = { sourced: 7, screening: 7 }
): StaleCandidate<T>[] {
  const dayMs = 24 * 60 * 60 * 1000;
  return candidates
    .filter((c) => {
      if (c.status !== "sourced" && c.status !== "screening") return false;
      if (c.notes.trim() !== "") return false;
      const cutoff = Date.now() - slaDays[c.status] * dayMs;
      return +new Date(c.updated_at) < cutoff;
    })
    .map((candidate) => ({
      candidate,
      days_stale: Math.floor(
        (Date.now() - +new Date(candidate.updated_at)) / (24 * 60 * 60 * 1000)
      ),
    }))
    .sort((a, b) => b.days_stale - a.days_stale);
}
