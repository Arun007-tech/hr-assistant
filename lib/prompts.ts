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
