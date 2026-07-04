import { NextResponse } from "next/server";
import { jobPostPrompt, jobPostResponseSchema } from "@/lib/prompts";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { redactContactInfo } from "@/lib/redact";
import { jobPostSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const roughNotes =
      typeof body?.rough_notes === "string" ? body.rough_notes.trim() : "";
    if (!roughNotes) return jsonError("rough_notes is required.", 400);

    const result = await generateJson({
      prompt: jobPostPrompt(redactContactInfo(roughNotes)),
      schema: jobPostSchema,
      responseSchema: jobPostResponseSchema,
      kind: "job-post",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
