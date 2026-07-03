import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { assistantAnswerResponseSchema, assistantPrompt } from "@/lib/prompts";
import { assistantAnswerSchema } from "@/lib/schemas";
import { buildDataSnapshot } from "@/lib/snapshot";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) return jsonError("question is required.", 400);

    const snapshot = await buildDataSnapshot();
    const answer = await generateJson({
      prompt: assistantPrompt(question, snapshot),
      schema: assistantAnswerSchema,
      responseSchema: assistantAnswerResponseSchema,
      kind: "assistant",
    });
    return NextResponse.json(answer);
  } catch (err) {
    return errorResponse(err);
  }
}
