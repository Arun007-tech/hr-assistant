import { z } from "zod";

export const CANDIDATE_STATUSES = [
  "sourced",
  "screening",
  "shortlisted",
  "rejected",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_SOURCES = ["linkedin", "naukri", "apna", "other"] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

export const idealProfileSchema = z.object({
  summary: z.string(),
  must_have_skills: z.array(z.string()),
  nice_to_have_skills: z.array(z.string()),
  experience_range: z.string(),
  likely_titles: z.array(z.string()),
  red_flags: z.array(z.string()),
});

export const booleanSearchesSchema = z.object({
  linkedin: z.array(z.string()),
  naukri: z.array(z.string()),
  apna_keywords: z.array(z.string()),
});

export const jdAnalysisSchema = z.object({
  ideal_profile: idealProfileSchema,
  boolean_searches: booleanSearchesSchema,
});

export const candidateAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.string(),
  summary: z.string(),
  skills_match: z.array(
    z.object({
      skill: z.string(),
      status: z.enum(["strong", "partial", "missing"]),
      evidence: z.string(),
    })
  ),
  experience_relevance: z.string(),
  gaps: z.array(z.string()),
});

export const screeningQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      focus: z.enum(["must_have", "gap", "experience", "behavioral", "logistics"]),
      listen_for: z.string(),
    })
  ),
});

export type IdealProfile = z.infer<typeof idealProfileSchema>;
export type BooleanSearches = z.infer<typeof booleanSearchesSchema>;
export type JdAnalysis = z.infer<typeof jdAnalysisSchema>;
export type CandidateAnalysis = z.infer<typeof candidateAnalysisSchema>;
export type ScreeningQuestions = z.infer<typeof screeningQuestionsSchema>;

export interface Job {
  id: string;
  title: string;
  jd_text: string;
  ideal_profile: IdealProfile | null;
  boolean_searches: BooleanSearches | null;
  created_at: string;
}

export interface CandidateSummary {
  id: string;
  name: string;
  source: CandidateSource;
  score: number | null;
  status: CandidateStatus;
  created_at: string;
}

export interface Candidate extends CandidateSummary {
  job_id: string;
  resume_text: string | null;
  ai_analysis: CandidateAnalysis | null;
  screening_questions: ScreeningQuestions | null;
  notes: string;
  updated_at: string;
}

export interface JobWithCandidates extends Job {
  candidates: CandidateSummary[];
}

export interface JobListItem {
  id: string;
  title: string;
  created_at: string;
  analyzed: boolean;
  counts: Record<CandidateStatus, number>;
  total: number;
}
