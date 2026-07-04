import { NextResponse } from "next/server";
import { termExplanationPrompt, termExplanationResponseSchema } from "@/lib/prompts";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { termExplanationSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const term = typeof body?.term === "string" ? body.term.trim() : "";
    if (!term) return jsonError("term is required.", 400);

    const result = await generateJson({
      prompt: termExplanationPrompt(term),
      schema: termExplanationSchema,
      responseSchema: termExplanationResponseSchema,
      kind: "explain-term",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
