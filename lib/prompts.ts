import "server-only";
import { Type } from "@google/genai";
import type {
  CandidateAnalysis,
  EmailTemplate,
  IdealProfile,
  Tone,
} from "@/lib/schemas";

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

export const emailDraftResponseSchema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    body: { type: Type.STRING },
  },
  required: ["subject", "body"],
};

export function emailDraftPrompt(input: {
  template: EmailTemplate;
  transcript: string;
  candidateContext?: string;
}): string {
  const contextBlock = input.candidateContext
    ? `\nCANDIDATE CONTEXT (for reference, do not invent facts beyond this):\n"""\n${input.candidateContext}\n"""\n`
    : "";
  return `You are a recruiter's assistant turning a spoken note into a polished
email, using her saved template as the voice/structure guide.

TEMPLATE (subject line style, greeting style, sign-off — mirror the tone):
Subject: ${input.template.subject}
Greeting: ${input.template.greeting}
Signature: ${input.template.signature}
${contextBlock}
WHAT SHE SAID (spoken, may be rough — capture her intent, not her exact words):
"""
${input.transcript}
"""

Produce:
- subject: a subject line for this specific message, adapted from the template style
- body: full email body, opening with a greeting in her style, the message content
  written clearly and professionally from what she said, closing with her signature.
  Do not invent details she didn't mention.`;
}

export const assistantAnswerResponseSchema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["job", "candidate"] },
          id: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ["type", "id", "label"],
      },
    },
  },
  required: ["answer", "citations"],
};

export function assistantPrompt(question: string, snapshot: unknown): string {
  return `You are a recruiter's assistant answering a natural-language question
about her current jobs and candidates. Use ONLY the data below — never invent
candidates, scores, or facts not present here.

Answer conversationally but concisely (2-6 sentences, or a short list if the
question calls for one). When you mention a specific job or candidate, add a
citation entry: {type, id, label} using the id from the data below.

If the data doesn't contain enough to answer, say so plainly.

DATA SNAPSHOT (jobs + candidates, current state):
"""
${JSON.stringify(snapshot, null, 2)}
"""

QUESTION: ${question}`;
}

export const offerHelperResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    talking_points: stringArray,
    risks: stringArray,
    counter_script: { type: Type.STRING },
    suggested_close: { type: Type.STRING },
  },
  required: ["summary", "talking_points", "risks", "counter_script", "suggested_close"],
};

export function offerHelperPrompt(input: {
  candidateName: string;
  expectedCtc: string;
  offeredBand: string;
  context?: string;
}): string {
  return `You are helping a recruiter prepare for a compensation negotiation
with ${input.candidateName}.

Candidate's expected CTC: ${input.expectedCtc}
Role's offered band: ${input.offeredBand}
${input.context ? `Additional context: ${input.context}\n` : ""}
Produce:
- summary: 2-3 sentences on the gap (if any) and overall negotiation posture
- talking_points: 3-5 concrete points she can raise to justify the offer
  (growth path, non-cash benefits, market context, role scope) — practical,
  not generic filler
- risks: 2-4 things that could go wrong in this negotiation (walk-away risk,
  competing offers, internal equity issues) — name them plainly
- counter_script: a short, natural spoken script she could literally say if
  the candidate pushes back on the number
- suggested_close: one or two sentences on how to end the call productively
  regardless of outcome

Keep it grounded in the numbers given — do not invent market data you don't have.`;
}

export const referenceQuestionsResponseSchema = {
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
            enum: ["claims", "performance", "collaboration", "integrity", "logistics"],
          },
          listen_for: { type: Type.STRING },
        },
        required: ["question", "focus", "listen_for"],
      },
    },
  },
  required: ["questions"],
};

export function referenceQuestionsPrompt(input: {
  jdText: string;
  candidateName: string;
  analysis: CandidateAnalysis | null;
}): string {
  const claimsBlock = input.analysis
    ? `\nCLAIMS TO VERIFY (from the candidate's own resume/interview):\n${JSON.stringify(
        { summary: input.analysis.summary, skills: input.analysis.skills_match.map((s) => s.skill) },
        null,
        2
      )}\n`
    : "";
  return `Create reference-check questions for a former manager/colleague of
${input.candidateName}, who is being considered for this role. These are
different from screening questions — they verify what the candidate already
claimed, from a third party's perspective.

Produce 8-10 questions covering:
- claims: verify specific things the candidate said about their role/impact
- performance: how they actually performed, strengths and weaknesses
- collaboration: how they worked with others, team dynamics
- integrity: reliability, honesty, whether the reference would rehire them
- logistics: reason for leaving, rehire eligibility, notice period behavior

For each, set focus to one of claims|performance|collaboration|integrity|logistics
and give listen_for: one line on what a good vs concerning answer sounds like.

JOB DESCRIPTION:
"""
${input.jdText}
"""
${claimsBlock}`;
}

export const captureActionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ["todo", "note", "draft_reply", "add_candidate"],
    },
    text: { type: Type.STRING },
    candidate_id: { type: Type.STRING, nullable: true },
    job_id: { type: Type.STRING, nullable: true },
    draft_reply: { type: Type.STRING, nullable: true },
  },
  required: ["action", "text", "candidate_id", "job_id", "draft_reply"],
};

export function captureRoutingPrompt(input: {
  raw: string;
  candidates: { id: string; name: string; job_id: string }[];
  jobs: { id: string; title: string }[];
}): string {
  return `A technical recruiter just dictated or pasted something into a
general-purpose "quick capture" box — it is not tied to any specific
candidate or job screen. Decide what she most likely wants done with it and
respond with exactly one action:

- "todo": a task or reminder for later (e.g. "follow up with Rohan Thursday",
  "renew the job posting", "call the client back"). Set text to a clean,
  short version of the task. If a candidate or job is clearly named, set
  candidate_id/job_id to its id from the lists below; otherwise null.
- "note": information worth remembering, not an action (e.g. "Priya said
  she's open to relocating"). Same id-matching rules as todo.
- "draft_reply": the input reads like a message FROM someone (a candidate,
  hiring manager, vendor) that expects a reply (e.g. pasted WhatsApp/email
  text asking a question). Set draft_reply to a short, professional reply
  in her voice (first person, as the recruiter), and text to a one-line
  description of what the reply is about.
- "add_candidate": the input reads like a resume, LinkedIn/Naukri profile,
  or bio of a NEW person she's considering (long block describing someone's
  skills/experience, not a message to her). Set text to the person's name if
  you can identify one, otherwise a short description. Do not set
  candidate_id (this is a new person, not an existing one).

Only set candidate_id/job_id when a name/title is clearly, unambiguously
present in both the input and the list below — never guess. Fields not used
by the chosen action must be null.

EXISTING CANDIDATES (id, name, job_id):
"""
${JSON.stringify(input.candidates)}
"""

EXISTING JOBS (id, title):
"""
${JSON.stringify(input.jobs)}
"""

CAPTURED INPUT (verbatim, may be rough speech-to-text or a raw paste):
"""
${input.raw}
"""`;
}

// Generic AI tools (/ai-tools) — freeform, not tied to a candidate or job record.

export const composedEmailResponseSchema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    body: { type: Type.STRING },
  },
  required: ["subject", "body"],
};

export function composeEmailPrompt(input: { brief: string; tone: Tone }): string {
  return `A recruiter needs to send an email. Write it in a ${input.tone} tone,
first person (as the recruiter, sender), ready to send with minimal editing.
Include a greeting and a sign-off placeholder like "[Your name]".

WHAT SHE TOLD YOU ABOUT IT (who it's to, what it's about — may be rough notes):
"""
${input.brief}
"""`;
}

export const rewrittenTextResponseSchema = {
  type: Type.OBJECT,
  properties: {
    rewritten: { type: Type.STRING },
  },
  required: ["rewritten"],
};

export function rewriteTextPrompt(input: { text: string; tone: Tone }): string {
  return `Rewrite the text below in a ${input.tone} tone. Keep the same
meaning and length in the same ballpark — don't pad it out or cut content,
just change how it reads. Return only the rewritten text, no commentary.

TEXT:
"""
${input.text}
"""`;
}

export const quickSummaryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    key_points: stringArray,
  },
  required: ["summary", "key_points"],
};

export function quickSummaryPrompt(text: string): string {
  return `Summarize the text below for a busy recruiter who needs to catch up
fast before a call or a decision. Produce:
- summary: 2-3 sentences, the gist
- key_points: 3-6 short bullet points of anything actionable or notable

TEXT:
"""
${text}
"""`;
}

export const termExplanationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    explanation: { type: Type.STRING },
    why_it_matters_for_hiring: { type: Type.STRING },
  },
  required: ["explanation", "why_it_matters_for_hiring"],
};

export function termExplanationPrompt(term: string): string {
  return `Explain the following skill, tool, acronym, or technical term to a
non-technical technical recruiter who needs to screen for it but doesn't work
with it hands-on. Produce:
- explanation: plain-language, 2-4 sentences, no jargon left unexplained
- why_it_matters_for_hiring: 1-2 sentences on what to look for or ask about
  when a candidate claims this skill

TERM:
"""
${term}
"""`;
}

export const jobPostResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title_suggestion: { type: Type.STRING },
    job_post: { type: Type.STRING },
  },
  required: ["title_suggestion", "job_post"],
};

export function jobPostPrompt(roughNotes: string): string {
  return `Turn the rough notes below into a polished, well-structured job
post ready to publish on LinkedIn/Naukri. Include sections for a short intro,
responsibilities, requirements, and nice-to-haves where the notes support
them. Do not invent requirements that aren't implied by the notes.

Produce:
- title_suggestion: a clean job title for this role
- job_post: the full post, formatted with line breaks between sections

ROUGH NOTES:
"""
${roughNotes}
"""`;
}

export const booleanGeneratorResponseSchema = {
  type: Type.OBJECT,
  properties: {
    linkedin: stringArray,
    naukri: stringArray,
    apna_keywords: stringArray,
  },
  required: ["linkedin", "naukri", "apna_keywords"],
};

export function booleanGeneratorPrompt(skillsOrKeywords: string): string {
  return `A recruiter wants to source candidates and gave you a freeform list
of skills/keywords (no full job description exists yet). Produce Boolean
search strings the recruiter will paste manually into each platform:
- linkedin: 3-4 full Boolean strings using AND, OR, NOT, quotes and
  parentheses. Include one broad variant and one narrow/precise variant.
  Include common synonyms and abbreviations (e.g. "Kubernetes" OR "K8s").
- naukri: 3-4 keyword strings for Naukri's keyword search — shorter,
  keyword-dense, no location/experience (those are separate filters there).
- apna_keywords: 5-8 short single keywords or two-word phrases.

SKILLS / KEYWORDS:
"""
${skillsOrKeywords}
"""`;
}
