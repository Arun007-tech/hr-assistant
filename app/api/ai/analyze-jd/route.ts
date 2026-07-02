import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { jdAnalysisPrompt, jdAnalysisResponseSchema } from "@/lib/prompts";
import { jdAnalysisSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const jobId = typeof body?.job_id === "string" ? body.job_id : "";
    if (!jobId) return jsonError("job_id is required.", 400);

    const { data: job, error } = await db()
      .from("jobs")
      .select("id, jd_text")
      .eq("id", jobId)
      .single();
    if (error?.code === "PGRST116") return jsonError("Role not found.", 404);
    if (error) throw new Error(error.message);

    const analysis = await generateJson({
      prompt: jdAnalysisPrompt(job.jd_text),
      schema: jdAnalysisSchema,
      responseSchema: jdAnalysisResponseSchema,
    });

    const { data: updated, error: updateError } = await db()
      .from("jobs")
      .update({
        ideal_profile: analysis.ideal_profile,
        boolean_searches: analysis.boolean_searches,
      })
      .eq("id", jobId)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
