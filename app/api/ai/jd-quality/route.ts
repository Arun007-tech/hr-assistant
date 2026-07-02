import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { jdQualityPrompt, jdQualityResponseSchema } from "@/lib/prompts";
import { jdQualitySchema } from "@/lib/schemas";
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

    const result = await generateJson({
      prompt: jdQualityPrompt(job.jd_text),
      schema: jdQualitySchema,
      responseSchema: jdQualityResponseSchema,
      kind: "jd-quality",
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
