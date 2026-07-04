import { NextResponse } from "next/server";
import {
  booleanGeneratorPrompt,
  booleanGeneratorResponseSchema,
} from "@/lib/prompts";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { redactContactInfo } from "@/lib/redact";
import { booleanSearchesSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const skills = typeof body?.skills === "string" ? body.skills.trim() : "";
    if (!skills) return jsonError("skills is required.", 400);

    const result = await generateJson({
      prompt: booleanGeneratorPrompt(redactContactInfo(skills)),
      schema: booleanSearchesSchema,
      responseSchema: booleanGeneratorResponseSchema,
      kind: "boolean-generator",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
