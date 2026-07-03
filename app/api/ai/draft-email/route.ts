import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { emailDraftPrompt, emailDraftResponseSchema } from "@/lib/prompts";
import { redactContactInfo } from "@/lib/redact";
import { emailDraftSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const templateId = typeof body?.template_id === "string" ? body.template_id : "";
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
    const candidateId =
      typeof body?.candidate_id === "string" ? body.candidate_id : "";
    if (!templateId) return jsonError("template_id is required.", 400);
    if (!transcript) return jsonError("transcript is required.", 400);

    const { data: template, error } = await db()
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single();
    if (error?.code === "PGRST116") return jsonError("Template not found.", 404);
    if (error) throw new Error(error.message);

    let candidateContext: string | undefined;
    if (candidateId) {
      const { data: candidate } = await db()
        .from("candidates")
        .select("name, ai_analysis")
        .eq("id", candidateId)
        .single();
      if (candidate) {
        candidateContext = redactContactInfo(
          `${candidate.name}: ${candidate.ai_analysis?.summary ?? ""}`
        );
      }
    }

    const draft = await generateJson({
      prompt: emailDraftPrompt({ template, transcript, candidateContext }),
      schema: emailDraftSchema,
      responseSchema: emailDraftResponseSchema,
      kind: "draft-email",
    });
    return NextResponse.json(draft);
  } catch (err) {
    return errorResponse(err);
  }
}
