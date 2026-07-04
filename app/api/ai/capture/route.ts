import { NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { errorResponse, jsonError } from "@/lib/http";
import { captureActionResponseSchema, captureRoutingPrompt } from "@/lib/prompts";
import { redactContactInfo } from "@/lib/redact";
import { captureActionSchema } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

const MAX_TEXT_CHARS = 4000;

// Quick capture: classifies dictated/pasted text into a todo, a note, a
// drafted reply, or a "this looks like a new candidate" nudge — then saves
// todo/note straight to the captures inbox. draft_reply/add_candidate are
// handled entirely client-side (nothing to save server-side for those).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const raw = typeof body?.text === "string" ? body.text.trim() : "";
    if (!raw) return jsonError("Nothing to capture.", 400);
    const text = raw.slice(0, MAX_TEXT_CHARS);

    const [candidatesResult, jobsResult] = await Promise.all([
      db().from("candidates").select("id, name, job_id"),
      db().from("jobs").select("id, title"),
    ]);
    if (candidatesResult.error) throw new Error(candidatesResult.error.message);
    if (jobsResult.error) throw new Error(jobsResult.error.message);

    const action = await generateJson({
      prompt: captureRoutingPrompt({
        raw: redactContactInfo(text),
        candidates: candidatesResult.data ?? [],
        jobs: jobsResult.data ?? [],
      }),
      schema: captureActionSchema,
      responseSchema: captureActionResponseSchema,
      kind: "capture",
    });

    if (action.action !== "todo" && action.action !== "note") {
      return NextResponse.json({ action, capture: null });
    }

    const { data: capture, error } = await db()
      .from("captures")
      .insert({
        kind: action.action,
        text: action.text,
        candidate_id: action.candidate_id,
        job_id: action.job_id,
      })
      .select("id, created_at, kind, text, candidate_id, job_id, done")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ action, capture });
  } catch (err) {
    return errorResponse(err);
  }
}
