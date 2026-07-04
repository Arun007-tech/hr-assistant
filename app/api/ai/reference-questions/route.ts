import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import {
  referenceQuestionsPrompt,
  referenceQuestionsResponseSchema,
} from "@/lib/prompts";
import { referenceQuestionsSchema } from "@/lib/schemas";
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
      .select("id, name, ai_analysis, jobs(jd_text)")
      .eq("id", candidateId)
      .single();
    if (error?.code === "PGRST116") return jsonError("Candidate not found.", 404);
    if (error) throw new Error(error.message);
    const job = Array.isArray(candidate.jobs) ? candidate.jobs[0] : candidate.jobs;

    const questions = await generateJson({
      prompt: referenceQuestionsPrompt({
        jdText: job?.jd_text ?? "",
        candidateName: candidate.name,
        analysis: candidate.ai_analysis,
      }),
      schema: referenceQuestionsSchema,
      responseSchema: referenceQuestionsResponseSchema,
      kind: "reference-questions",
    });

    const { data: updated, error: updateError } = await db()
      .from("candidates")
      .update({
        reference_questions: questions,
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
