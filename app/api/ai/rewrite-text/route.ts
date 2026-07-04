import { NextResponse } from "next/server";
import { rewriteTextPrompt, rewrittenTextResponseSchema } from "@/lib/prompts";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { redactContactInfo } from "@/lib/redact";
import { rewrittenTextSchema, TONES, type Tone } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const tone: Tone = TONES.includes(body?.tone) ? body.tone : "formal";
    if (!text) return jsonError("text is required.", 400);

    const result = await generateJson({
      prompt: rewriteTextPrompt({ text: redactContactInfo(text), tone }),
      schema: rewrittenTextSchema,
      responseSchema: rewrittenTextResponseSchema,
      kind: "rewrite-text",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
