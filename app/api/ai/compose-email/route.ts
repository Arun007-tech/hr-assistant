import { NextResponse } from "next/server";
import { composeEmailPrompt, composedEmailResponseSchema } from "@/lib/prompts";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { redactContactInfo } from "@/lib/redact";
import { composedEmailSchema, TONES, type Tone } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
    const tone: Tone = TONES.includes(body?.tone) ? body.tone : "formal";
    if (!brief) return jsonError("brief is required.", 400);

    const result = await generateJson({
      prompt: composeEmailPrompt({ brief: redactContactInfo(brief), tone }),
      schema: composedEmailSchema,
      responseSchema: composedEmailResponseSchema,
      kind: "compose-email",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
