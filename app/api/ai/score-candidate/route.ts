import { NextResponse } from "next/server";
import { fileToText } from "@/lib/files";
import { AiError, generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import {
  candidateAnalysisPrompt,
  candidateAnalysisResponseSchema,
} from "@/lib/prompts";
import { redactContactInfo } from "@/lib/redact";
import {
  CANDIDATE_SOURCES,
  candidateAnalysisSchema,
  type CandidateAnalysis,
  type IdealProfile,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

async function analyze(
  jdText: string,
  idealProfile: IdealProfile | null,
  resumeText: string
): Promise<CandidateAnalysis> {
  return generateJson({
    prompt: candidateAnalysisPrompt({
      jdText,
      idealProfile,
      resumeText: redactContactInfo(resumeText),
    }),
    schema: candidateAnalysisSchema,
    responseSchema: candidateAnalysisResponseSchema,
    kind: "score-candidate",
  });
}

async function fetchJob(jobId: string) {
  const { data, error } = await db()
    .from("jobs")
    .select("id, jd_text, ideal_profile")
    .eq("id", jobId)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
}

// Create + score a new candidate (multipart form). `name` is optional — when
// omitted (bulk upload), the AI-extracted candidate_name from the analysis
// is used instead, falling back to a placeholder if analysis itself fails.
async function createAndScore(request: Request) {
  const form = await request.formData();
  const jobId = String(form.get("job_id") ?? "");
  const typedName = String(form.get("name") ?? "").trim();
  const sourceRaw = String(form.get("source") ?? "other");
  const source = (CANDIDATE_SOURCES as readonly string[]).includes(sourceRaw)
    ? sourceRaw
    : "other";

  if (!jobId) return jsonError("job_id is required.", 400);

  let resumeText = String(form.get("resume_text") ?? "").trim();
  const file = form.get("file");
  if (!resumeText && file instanceof File && file.size > 0) {
    resumeText = await fileToText(file);
  }
  if (!resumeText) {
    return jsonError("Paste the resume/profile text or upload a file.", 400);
  }

  const job = await fetchJob(jobId);
  if (!job) return jsonError("Role not found.", 404);

  let analysis: CandidateAnalysis | null = null;
  let aiError: string | null = null;
  try {
    analysis = await analyze(job.jd_text, job.ideal_profile, resumeText);
  } catch (err) {
    if (!(err instanceof AiError)) throw err;
    aiError = err.message;
  }

  const name = typedName || analysis?.candidate_name || "Unnamed candidate";

  const { data: candidate, error } = await db()
    .from("candidates")
    .insert({
      job_id: jobId,
      name,
      source,
      resume_text: resumeText,
      ai_analysis: analysis,
      score: analysis?.score ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return NextResponse.json({ candidate, ai_error: aiError }, { status: 201 });
}

// Re-score an existing candidate (JSON body with candidate_id).
async function rescore(request: Request) {
  const body = await request.json().catch(() => null);
  const candidateId =
    typeof body?.candidate_id === "string" ? body.candidate_id : "";
  if (!candidateId) return jsonError("candidate_id is required.", 400);

  const { data: candidate, error } = await db()
    .from("candidates")
    .select("id, job_id, resume_text")
    .eq("id", candidateId)
    .single();
  if (error?.code === "PGRST116") return jsonError("Candidate not found.", 404);
  if (error) throw new Error(error.message);
  if (!candidate.resume_text) {
    return jsonError("This candidate has no resume text to analyze.", 422);
  }

  const job = await fetchJob(candidate.job_id);
  if (!job) return jsonError("Role not found.", 404);

  const analysis = await analyze(
    job.jd_text,
    job.ideal_profile,
    candidate.resume_text
  );

  const { data: updated, error: updateError } = await db()
    .from("candidates")
    .update({
      ai_analysis: analysis,
      score: analysis.score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .select()
    .single();
  if (updateError) throw new Error(updateError.message);
  return NextResponse.json({ candidate: updated, ai_error: null });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      return await createAndScore(request);
    }
    return await rescore(request);
  } catch (err) {
    return errorResponse(err);
  }
}
