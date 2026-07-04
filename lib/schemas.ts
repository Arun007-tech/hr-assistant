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
  candidate_name: z.string().optional(),
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

export const jdQualitySchema = z.object({
  clarity_score: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      type: z.enum(["unclear", "exclusionary", "vague", "jargon"]),
      text: z.string(),
      suggestion: z.string(),
    })
  ),
  rewritten_jd: z.string().nullable(),
  summary: z.string(),
});
export type JdQuality = z.infer<typeof jdQualitySchema>;

export const candidateMessagesSchema = z.object({
  outreach: z.string(),
  rejection: z.string(),
  hiring_manager_summary: z.string(),
});
export type CandidateMessages = z.infer<typeof candidateMessagesSchema>;

export const interviewPlanSchema = z.object({
  rounds: z.array(
    z.object({
      name: z.string(),
      format: z.string(),
      duration_mins: z.number(),
      focus_areas: z.array(z.string()),
      sample_questions: z.array(z.string()),
    })
  ),
  total_estimated_days: z.string(),
});
export type InterviewPlan = z.infer<typeof interviewPlanSchema>;

export const callNotesEvaluationSchema = z.object({
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  recommendation: z.enum(["advance", "hold", "reject"]),
  rationale: z.string(),
});
export type CallNotesEvaluation = z.infer<typeof callNotesEvaluationSchema>;

export const pipelineDigestSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  stat_callouts: z.array(z.object({ label: z.string(), value: z.string() })),
});
export type PipelineDigest = z.infer<typeof pipelineDigestSchema>;

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
  reference_questions: ReferenceQuestions | null;
  notes: string;
  phone: string | null;
  talent_pool: boolean;
  updated_at: string;
}

export interface JobWithCandidates extends Job {
  candidates: CandidateSummary[];
}

export interface CandidateWithJob extends CandidateSummary {
  job_id: string;
  job_title: string;
  notes: string;
  phone: string | null;
  talent_pool: boolean;
  updated_at: string;
}

export interface PoolCandidate extends CandidateWithJob {
  resume_text: string | null;
  ai_analysis: CandidateAnalysis | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  greeting: string;
  signature: string;
  created_at: string;
}

export const emailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type EmailDraft = z.infer<typeof emailDraftSchema>;

export const offerHelperSchema = z.object({
  summary: z.string(),
  talking_points: z.array(z.string()),
  risks: z.array(z.string()),
  counter_script: z.string(),
  suggested_close: z.string(),
});
export type OfferHelper = z.infer<typeof offerHelperSchema>;

export const referenceQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      focus: z.enum([
        "claims",
        "performance",
        "collaboration",
        "integrity",
        "logistics",
      ]),
      listen_for: z.string(),
    })
  ),
});
export type ReferenceQuestions = z.infer<typeof referenceQuestionsSchema>;

export const assistantAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(
    z.object({
      type: z.enum(["job", "candidate"]),
      id: z.string(),
      label: z.string(),
    })
  ),
});
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;

export interface JobListItem {
  id: string;
  title: string;
  created_at: string;
  analyzed: boolean;
  counts: Record<CandidateStatus, number>;
  total: number;
}

export interface AiUsageRow {
  id: string;
  created_at: string;
  kind: string;
  status: "ok" | "error";
  duration_ms: number;
}

export interface UsageKindSummary {
  kind: string;
  today: number;
  this_week: number;
  this_month: number;
  errors_this_month: number;
}

export interface UsageSummary {
  kinds: UsageKindSummary[];
  total_today: number;
  total_this_week: number;
  total_this_month: number;
}

export interface DbSizeInfo {
  bytes: number;
  mb: number;
  cap_mb: number;
  pct: number;
}

// Quick capture: anything dictated or pasted through the global capture
// button gets routed to one of these actions.
export const captureActionSchema = z.object({
  action: z.enum(["todo", "note", "draft_reply", "add_candidate"]),
  text: z.string(),
  candidate_id: z.string().nullable(),
  job_id: z.string().nullable(),
  draft_reply: z.string().nullable(),
});
export type CaptureAction = z.infer<typeof captureActionSchema>;

export interface Capture {
  id: string;
  created_at: string;
  kind: "todo" | "note";
  text: string;
  candidate_id: string | null;
  job_id: string | null;
  candidate_name: string | null;
  job_title: string | null;
  done: boolean;
}

// Generic AI tools (/ai-tools) — not tied to a candidate or job record.
export const TONES = ["formal", "friendly", "concise", "assertive"] as const;
export type Tone = (typeof TONES)[number];

export const composedEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type ComposedEmail = z.infer<typeof composedEmailSchema>;

export const rewrittenTextSchema = z.object({
  rewritten: z.string(),
});
export type RewrittenText = z.infer<typeof rewrittenTextSchema>;

export const quickSummarySchema = z.object({
  summary: z.string(),
  key_points: z.array(z.string()),
});
export type QuickSummary = z.infer<typeof quickSummarySchema>;

export const termExplanationSchema = z.object({
  explanation: z.string(),
  why_it_matters_for_hiring: z.string(),
});
export type TermExplanation = z.infer<typeof termExplanationSchema>;

export const jobPostSchema = z.object({
  title_suggestion: z.string(),
  job_post: z.string(),
});
export type JobPost = z.infer<typeof jobPostSchema>;
