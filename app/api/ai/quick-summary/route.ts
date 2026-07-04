import { NextResponse } from "next/server";
import { quickSummaryPrompt, quickSummaryResponseSchema } from "@/lib/prompts";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { redactContactInfo } from "@/lib/redact";
import { quickSummarySchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return jsonError("text is required.", 400);

    const result = await generateJson({
      prompt: quickSummaryPrompt(redactContactInfo(text)),
      schema: quickSummarySchema,
      responseSchema: quickSummaryResponseSchema,
      kind: "quick-summary",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
