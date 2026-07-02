import "server-only";
import { Type } from "@google/genai";
import type { CandidateAnalysis, IdealProfile } from "@/lib/schemas";

const stringArray = { type: Type.ARRAY, items: { type: Type.STRING } };

export const jdAnalysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    ideal_profile: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        must_have_skills: stringArray,
        nice_to_have_skills: stringArray,
        experience_range: { type: Type.STRING },
        likely_titles: stringArray,
        red_flags: stringArray,
      },
      required: [
        "summary",
        "must_have_skills",
        "nice_to_have_skills",
        "experience_range",
        "likely_titles",
        "red_flags",
      ],
    },
    boolean_searches: {
      type: Type.OBJECT,
      properties: {
        linkedin: stringArray,
        naukri: stringArray,
        apna_keywords: stringArray,
      },
      required: ["linkedin", "naukri", "apna_keywords"],
    },
  },
  required: ["ideal_profile", "boolean_searches"],
};

export function jdAnalysisPrompt(jdText: string): string {
  return `You are an expert technical recruiting assistant for the Indian job market.
Analyze the job description below and produce:

1. ideal_profile — the profile of the ideal candidate:
   - summary: 2-3 sentences describing who to look for
   - must_have_skills: hard requirements only (skills, tools, certifications)
   - nice_to_have_skills: genuinely optional extras
   - experience_range: e.g. "4-7 years, at least 2 in backend"
   - likely_titles: job titles such candidates actually hold (include Indian-market variants)
   - red_flags: signals in a profile that suggest a poor fit for THIS role

2. boolean_searches — search strings the recruiter will paste manually into each platform:
   - linkedin: 3-4 full Boolean strings using AND, OR, NOT, quotes and parentheses.
     Include one broad variant, one narrow/precise variant, and one title-focused variant.
     Include common synonyms and abbreviations (e.g. "Kubernetes" OR "K8s").
   - naukri: 3-4 keyword strings for Naukri's keyword search (Boolean AND/OR/NOT and
     quotes are supported there, but keep strings shorter and keyword-dense; do not
     include location or experience — those are separate filters on Naukri).
   - apna_keywords: 5-8 short single keywords or two-word phrases (Apna search is basic).

Base everything strictly on the job description. Do not invent requirements.

JOB DESCRIPTION:
"""
${jdText}
"""`;
}

export const candidateAnalysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    candidate_name: { type: Type.STRING },
    score: { type: Type.INTEGER },
    verdict: { type: Type.STRING },
    summary: { type: Type.STRING },
    skills_match: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          status: {
            type: Type.STRING,
            enum: ["strong", "partial", "missing"],
          },
          evidence: { type: Type.STRING },
        },
        required: ["skill", "status", "evidence"],
      },
    },
    experience_relevance: { type: Type.STRING },
    gaps: stringArray,
  },
  required: [
    "candidate_name",
    "score",
    "verdict",
    "summary",
    "skills_match",
    "experience_relevance",
    "gaps",
  ],
};

export function candidateAnalysisPrompt(input: {
  jdText: string;
  idealProfile: IdealProfile | null;
  resumeText: string;
}): string {
  const profileBlock = input.idealProfile
    ? `\nIDEAL CANDIDATE PROFILE (already derived from this JD):\n${JSON.stringify(input.idealProfile, null, 2)}\n`
    : "";
  return `You are an expert technical recruiter evaluating a candidate against a job description.

Score the candidate's fit from 0-100:
- 85-100: exceptional fit, meets all must-haves with strong evidence
- 70-84: strong fit, meets most must-haves, minor gaps
- 50-69: partial fit, notable gaps in must-haves
- below 50: weak fit

Produce:
- candidate_name: the candidate's full name as it appears in the resume text.
  If no name can be found, use "Unnamed candidate".
- score and a one-line verdict
- summary: 2-3 sentences on overall fit
- skills_match: one entry per must-have skill and per important nice-to-have from the JD.
  status "strong" (clear evidence), "partial" (adjacent or shallow evidence), or
  "missing" (not mentioned). evidence: one line quoting or paraphrasing the resume,
  or "not mentioned".
- experience_relevance: 2-3 sentences on seniority, domain and industry fit
- gaps: concrete missing or unverified things worth probing on a screening call

Contact details were removed from the resume text — ignore their absence.
Judge content only; do not penalize formatting or writing style.

JOB DESCRIPTION:
"""
${input.jdText}
"""
${profileBlock}
CANDIDATE RESUME / PROFILE:
"""
${input.resumeText}
"""`;
}

export const screeningQuestionsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          focus: {
            type: Type.STRING,
            enum: ["must_have", "gap", "experience", "behavioral", "logistics"],
          },
          listen_for: { type: Type.STRING },
        },
        required: ["question", "focus", "listen_for"],
      },
    },
  },
  required: ["questions"],
};

export function screeningQuestionsPrompt(input: {
  jdText: string;
  candidateName: string;
  analysis: CandidateAnalysis | null;
  resumeText: string;
}): string {
  const analysisBlock = input.analysis
    ? `\nFIT ANALYSIS (verify the gaps and partial skills below):\n${JSON.stringify(
        {
          gaps: input.analysis.gaps,
          partial_or_missing: input.analysis.skills_match.filter(
            (s) => s.status !== "strong"
          ),
        },
        null,
        2
      )}\n`
    : "";
  return `Create screening call questions for a 20-30 minute recruiter phone screen with ${input.candidateName}.
The recruiter is not an engineer: questions must be answerable verbally and checkable
against the "listen_for" hint without deep technical knowledge.

Produce 8-12 questions:
- verify each must-have skill the resume does not clearly prove
- probe each identified gap directly but politely
- 1-2 questions on depth of their most relevant experience (projects, scale, role)
- 1-2 behavioral questions relevant to this role
- end with logistics: notice period, current/expected compensation, work location

Order: easy warm-up first, logistics last. For each question set focus to one of
must_have | gap | experience | behavioral | logistics, and give listen_for: one line
describing what a good answer sounds like.

JOB DESCRIPTION:
"""
${input.jdText}
"""
${analysisBlock}
CANDIDATE RESUME / PROFILE:
"""
${input.resumeText}
"""`;
}

export const jdQualityResponseSchema = {
  type: Type.OBJECT,
  properties: {
    clarity_score: { type: Type.INTEGER },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["unclear", "exclusionary", "vague", "jargon"],
          },
          text: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ["type", "text", "suggestion"],
      },
    },
    rewritten_jd: { type: Type.STRING },
    summary: { type: Type.STRING },
  },
  required: ["clarity_score", "issues", "rewritten_jd", "summary"],
};

export function jdQualityPrompt(jdText: string): string {
  return `You are an expert in inclusive, clear technical job description writing.

Review the job description below for:
- unclear: ambiguous requirements or responsibilities a candidate couldn't self-assess against
- exclusionary: language that discourages qualified candidates without a real business reason
  (e.g. unnecessary degree requirements, "young and energetic", gendered language, unrealistic
  "10+ years" for junior tools, excessive jargon-stacking)
- vague: filler phrases that convey no real signal ("fast-paced environment", "wear many hats"
  used without specifics)
- jargon: internal or obscure terms that would confuse an external candidate

Produce:
- clarity_score: 0-100, how clear and welcoming this JD is to a strong, diverse candidate pool
- issues: each flagged span of text (quote or paraphrase it in "text"), its type, and a concrete
  "suggestion" for how to fix it
- rewritten_jd: a full rewritten version of the JD fixing the flagged issues while preserving all
  genuine requirements — do not soften real must-haves, only fix clarity/bias/vagueness
- summary: 2-3 sentence overview of the JD's main strengths and weaknesses

JOB DESCRIPTION:
"""
${jdText}
"""`;
}

export const candidateMessagesResponseSchema = {
  type: Type.OBJECT,
  properties: {
    outreach: { type: Type.STRING },
    rejection: { type: Type.STRING },
    hiring_manager_summary: { type: Type.STRING },
  },
  required: ["outreach", "rejection", "hiring_manager_summary"],
};

export function candidateMessagesPrompt(input: {
  jdText: string;
  candidateName: string;
  analysis: CandidateAnalysis | null;
  resumeText: string;
}): string {
  const analysisBlock = input.analysis
    ? `\nFIT ANALYSIS:\n${JSON.stringify({ score: input.analysis.score, verdict: input.analysis.verdict, summary: input.analysis.summary }, null, 2)}\n`
    : "";
  return `You are a technical recruiter drafting three short pieces of written
communication for the candidate ${input.candidateName}, for this role. Write
in a warm, professional, concise tone — these should be ready to copy and paste
with minimal editing.

Produce:
- outreach: a short LinkedIn/Naukri connection or InMail message inviting them
  to discuss this specific role, referencing 1-2 concrete things from their
  background that make them a fit. 3-5 sentences max.
- rejection: a polite, respectful rejection message for after screening —
  no specific negative feedback, keep it warm and leave the door open for
  future roles. 3-4 sentences.
- hiring_manager_summary: a short internal blurb (4-6 sentences) summarizing
  this candidate for a hiring manager who hasn't seen the resume — fit,
  standout strengths, and any notable gaps, written efficiently.

JOB DESCRIPTION:
"""
${input.jdText}
"""
${analysisBlock}
CANDIDATE RESUME / PROFILE:
"""
${input.resumeText}
"""`;
}

export const interviewPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    rounds: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          format: { type: Type.STRING },
          duration_mins: { type: Type.INTEGER },
          focus_areas: stringArray,
          sample_questions: stringArray,
        },
        required: [
          "name",
          "format",
          "duration_mins",
          "focus_areas",
          "sample_questions",
        ],
      },
    },
    total_estimated_days: { type: Type.STRING },
  },
  required: ["rounds", "total_estimated_days"],
};

export function interviewPlanPrompt(input: {
  jdText: string;
  idealProfile: IdealProfile | null;
}): string {
  const profileBlock = input.idealProfile
    ? `\nIDEAL CANDIDATE PROFILE:\n${JSON.stringify(input.idealProfile, null, 2)}\n`
    : "";
  return `You are a technical hiring process designer. Propose a structured
interview loop for this role, appropriate to its seniority and the must-have
skills in the JD.

Produce 3-5 rounds (e.g. recruiter screen, technical/coding round, system
design or domain round, hiring manager round, culture/values round — adapt
to the actual role, don't force rounds that don't fit a junior or non-engineering
role). For each round give:
- name (e.g. "Technical Screen")
- format (e.g. "45-min live coding, shared screen" or "Take-home + review call")
- duration_mins
- focus_areas: 2-4 things this round should evaluate
- sample_questions: 2-4 concrete sample questions or prompts an interviewer
  could actually ask

Also give total_estimated_days: a rough estimate of calendar days from first
screen to offer decision if scheduling goes smoothly (e.g. "10-14 days").

JOB DESCRIPTION:
"""
${input.jdText}
"""
${profileBlock}`;
}

export const callNotesEvaluationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    strengths: stringArray,
    concerns: stringArray,
    recommendation: {
      type: Type.STRING,
      enum: ["advance", "hold", "reject"],
    },
    rationale: { type: Type.STRING },
  },
  required: ["strengths", "concerns", "recommendation", "rationale"],
};

export function callNotesEvaluationPrompt(input: {
  jdText: string;
  analysis: CandidateAnalysis | null;
  notes: string;
  candidateName: string;
}): string {
  const analysisBlock = input.analysis
    ? `\nRESUME-BASED FIT ANALYSIS:\n${JSON.stringify({ score: input.analysis.score, verdict: input.analysis.verdict, gaps: input.analysis.gaps }, null, 2)}\n`
    : "";
  return `You are a technical recruiter's assistant, turning free-text call
notes into a structured evaluation after a screening call with ${input.candidateName}.

Using the notes below (plus the resume-based analysis for context, if present),
produce:
- strengths: concrete positives that came up on the call
- concerns: concrete concerns or open questions from the call
- recommendation: "advance" (move to next round), "hold" (need more info /
  unclear), or "reject" (not a fit)
- rationale: 2-3 sentences explaining the recommendation, grounded only in
  what's actually in the notes — do not invent details not mentioned

Contact details were removed from the notes — ignore their absence.

JOB DESCRIPTION:
"""
${input.jdText}
"""
${analysisBlock}
CALL NOTES:
"""
${input.notes}
"""`;
}

export const pipelineDigestResponseSchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING },
    summary: { type: Type.STRING },
    highlights: stringArray,
    stat_callouts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
        },
        required: ["label", "value"],
      },
    },
  },
  required: ["headline", "summary", "highlights", "stat_callouts"],
};

export function pipelineDigestPrompt(stats: unknown): string {
  return `You are helping a technical recruiter write a short status update on
their current hiring pipeline, to share with a hiring manager or her own notes.

Using only the aggregate stats below (no candidate names or personal details
are included — do not invent any), produce:
- headline: one punchy sentence summarizing where things stand
- summary: 2-4 sentences, plain and concrete, no fluff
- highlights: 2-5 short bullet-style observations worth calling out
  (e.g. a role moving fast, a role with no movement, a source performing well)
- stat_callouts: 2-4 label/value pairs to display as chips (e.g. "Open roles" / "4")

Keep tone professional but warm, like an update from a recruiter who's on top
of things. Do not fabricate numbers not present in the stats.

PIPELINE STATS:
"""
${JSON.stringify(stats, null, 2)}
"""`;
}
