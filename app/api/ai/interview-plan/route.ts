import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import {
  interviewPlanPrompt,
  interviewPlanResponseSchema,
} from "@/lib/prompts";
import { interviewPlanSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const jobId = typeof body?.job_id === "string" ? body.job_id : "";
    if (!jobId) return jsonError("job_id is required.", 400);

    const { data: job, error } = await db()
      .from("jobs")
      .select("id, jd_text, ideal_profile")
      .eq("id", jobId)
      .single();
    if (error?.code === "PGRST116") return jsonError("Role not found.", 404);
    if (error) throw new Error(error.message);

    const result = await generateJson({
      prompt: interviewPlanPrompt({
        jdText: job.jd_text,
        idealProfile: job.ideal_profile,
      }),
      schema: interviewPlanSchema,
      responseSchema: interviewPlanResponseSchema,
      kind: "interview-plan",
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
