import { NextResponse } from "next/server";
import {
  callNotesEvaluationPrompt,
  callNotesEvaluationResponseSchema,
} from "@/lib/prompts";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { redactContactInfo } from "@/lib/redact";
import { callNotesEvaluationSchema } from "@/lib/schemas";
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
      .select("id, name, notes, ai_analysis, jobs(jd_text)")
      .eq("id", candidateId)
      .single();
    if (error?.code === "PGRST116") return jsonError("Candidate not found.", 404);
    if (error) throw new Error(error.message);
    if (!candidate.notes.trim()) {
      return jsonError("This candidate has no notes to evaluate.", 422);
    }
    const job = Array.isArray(candidate.jobs)
      ? candidate.jobs[0]
      : candidate.jobs;

    const result = await generateJson({
      prompt: callNotesEvaluationPrompt({
        jdText: job?.jd_text ?? "",
        analysis: candidate.ai_analysis,
        notes: redactContactInfo(candidate.notes),
        candidateName: candidate.name,
      }),
      schema: callNotesEvaluationSchema,
      responseSchema: callNotesEvaluationResponseSchema,
      kind: "evaluate-notes",
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
