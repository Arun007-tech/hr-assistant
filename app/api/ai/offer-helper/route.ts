import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { offerHelperPrompt, offerHelperResponseSchema } from "@/lib/prompts";
import { offerHelperSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const candidateId =
      typeof body?.candidate_id === "string" ? body.candidate_id : "";
    const expectedCtc =
      typeof body?.expected_ctc === "string" ? body.expected_ctc.trim() : "";
    const offeredBand =
      typeof body?.offered_band === "string" ? body.offered_band.trim() : "";
    const context = typeof body?.context === "string" ? body.context.trim() : "";
    if (!candidateId) return jsonError("candidate_id is required.", 400);
    if (!expectedCtc) return jsonError("Expected CTC is required.", 400);
    if (!offeredBand) return jsonError("Offered band is required.", 400);

    const { data: candidate, error } = await db()
      .from("candidates")
      .select("name")
      .eq("id", candidateId)
      .single();
    if (error?.code === "PGRST116") return jsonError("Candidate not found.", 404);
    if (error) throw new Error(error.message);

    const result = await generateJson({
      prompt: offerHelperPrompt({
        candidateName: candidate.name,
        expectedCtc,
        offeredBand,
        context: context || undefined,
      }),
      schema: offerHelperSchema,
      responseSchema: offerHelperResponseSchema,
      kind: "offer-helper",
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
