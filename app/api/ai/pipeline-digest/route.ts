import { NextResponse } from "next/server";
import { bySourceBreakdown, buildFunnel } from "@/lib/analytics";
import { generateJson } from "@/lib/gemini";
import { errorResponse } from "@/lib/http";
import {
  pipelineDigestPrompt,
  pipelineDigestResponseSchema,
} from "@/lib/prompts";
import { pipelineDigestSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST() {
  try {
    const [jobsResult, candidatesResult] = await Promise.all([
      db().from("jobs").select("id, title"),
      db()
        .from("candidates")
        .select("status, source, notes, updated_at"),
    ]);
    if (jobsResult.error) throw new Error(jobsResult.error.message);
    if (candidatesResult.error) throw new Error(candidatesResult.error.message);

    const candidates = candidatesResult.data ?? [];
    const stats = {
      open_roles: jobsResult.data?.length ?? 0,
      total_candidates: candidates.length,
      funnel: buildFunnel(candidates),
      by_source: bySourceBreakdown(candidates),
    };

    const digest = await generateJson({
      prompt: pipelineDigestPrompt(stats),
      schema: pipelineDigestSchema,
      responseSchema: pipelineDigestResponseSchema,
      kind: "pipeline-digest",
    });

    return NextResponse.json(digest);
  } catch (err) {
    return errorResponse(err);
  }
}
