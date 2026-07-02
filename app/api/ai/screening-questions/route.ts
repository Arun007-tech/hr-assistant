import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import {
  screeningQuestionsPrompt,
  screeningQuestionsResponseSchema,
} from "@/lib/prompts";
import { redactContactInfo } from "@/lib/redact";
import { screeningQuestionsSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const candidateId =
      typeof body?.candidate_id === "string" ? body.candidate_id : "";
    if (!candidateId) return jsonError("candidate_id is required.", 400);

    const { data: candidate, error } = await db()
      .from("candidates")
      .select("id, name, resume_text, ai_analysis, jobs(jd_text)")
      .eq("id", candidateId)
      .single();
    if (error?.code === "PGRST116") return jsonError("Candidate not found.", 404);
    if (error) throw new Error(error.message);
    if (!candidate.resume_text) {
      return jsonError("This candidate has no resume text.", 422);
    }
    const job = Array.isArray(candidate.jobs)
      ? candidate.jobs[0]
      : candidate.jobs;

    const questions = await generateJson({
      prompt: screeningQuestionsPrompt({
        jdText: job?.jd_text ?? "",
        candidateName: candidate.name,
        analysis: candidate.ai_analysis,
        resumeText: redactContactInfo(candidate.resume_text),
      }),
      schema: screeningQuestionsSchema,
      responseSchema: screeningQuestionsResponseSchema,
    });

    const { data: updated, error: updateError } = await db()
      .from("candidates")
      .update({
        screening_questions: questions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
