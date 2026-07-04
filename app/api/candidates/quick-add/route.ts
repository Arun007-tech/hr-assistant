import { NextResponse } from "next/server";
import { findExistingMatches } from "@/lib/duplicates-server";
import { AiError, generateJson } from "@/lib/gemini";
import { errorResponse, HttpError } from "@/lib/http";
import { candidateAnalysisPrompt, candidateAnalysisResponseSchema } from "@/lib/prompts";
import { redactContactInfo } from "@/lib/redact";
import {
  CANDIDATE_SOURCES,
  candidateAnalysisSchema,
  type CandidateAnalysis,
  type CandidateSource,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

const MAX_TEXT_CHARS = 20000;

// Paste-based add: profile text copied from LinkedIn/Naukri goes straight to
// scoring; the AI extracts the candidate's name from the text.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const jobId = typeof body?.job_id === "string" ? body.job_id : "";
    const rawText = typeof body?.text === "string" ? body.text.trim() : "";
    const sourceRaw = typeof body?.source === "string" ? body.source : "linkedin";
    if (!jobId) throw new HttpError("Pick a role first.", 400);
    if (!rawText) throw new HttpError("Paste the profile text first.", 400);

    const { data: job, error: jobError } = await db()
      .from("jobs")
      .select("id, jd_text, ideal_profile")
      .eq("id", jobId)
      .single();
    if (jobError?.code === "PGRST116") throw new HttpError("Role not found.", 404);
    if (jobError) throw new Error(jobError.message);

    const text = rawText.slice(0, MAX_TEXT_CHARS);
    const source: CandidateSource = (
      CANDIDATE_SOURCES as readonly string[]
    ).includes(sourceRaw)
      ? (sourceRaw as CandidateSource)
      : "linkedin";

    // Identical text on the same job (paste-twice) blocks before spending an
    // AI call; force=true overrides.
    const force = body?.force === true;
    const textMatches = await findExistingMatches({
      jobId: job.id,
      resumeText: text,
    });
    if (!force && textMatches.some((m) => m.same_job)) {
      return NextResponse.json(
        { duplicates: textMatches.filter((m) => m.same_job) },
        { status: 409 }
      );
    }

    let analysis: CandidateAnalysis | null = null;
    let aiError: string | null = null;
    try {
      analysis = await generateJson({
        prompt: candidateAnalysisPrompt({
          jdText: job.jd_text,
          idealProfile: job.ideal_profile,
          resumeText: redactContactInfo(text),
        }),
        schema: candidateAnalysisSchema,
        responseSchema: candidateAnalysisResponseSchema,
        kind: "score-candidate",
      });
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      aiError = err.message;
    }

    const name = analysis?.candidate_name?.trim() || "Unnamed candidate";
    // Name is only known after analysis — surface matches as a notice rather
    // than blocking (the AI call is already spent).
    const nameMatches =
      name !== "Unnamed candidate"
        ? await findExistingMatches({ jobId: job.id, name })
        : [];

    const { data: candidate, error } = await db()
      .from("candidates")
      .insert({
        job_id: job.id,
        name,
        source,
        resume_text: text,
        ai_analysis: analysis,
        score: analysis?.score ?? null,
      })
      .select("id, name, score, job_id")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json(
      { candidate, ai_error: aiError, duplicates: nameMatches },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
