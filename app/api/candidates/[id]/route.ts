import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { CANDIDATE_SOURCES, CANDIDATE_STATUSES } from "@/lib/schemas";
import { db } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { data, error } = await db()
      .from("candidates")
      .select("*, jobs(title)")
      .eq("id", id)
      .single();
    if (error?.code === "PGRST116") return jsonError("Candidate not found.", 404);
    if (error) throw new Error(error.message);
    const { jobs, ...candidate } = data;
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    return NextResponse.json({ ...candidate, job_title: job?.title ?? "" });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const updates: Record<string, string> = {};

    if (typeof body?.status === "string") {
      if (!(CANDIDATE_STATUSES as readonly string[]).includes(body.status)) {
        return jsonError("Invalid status.", 400);
      }
      updates.status = body.status;
    }
    if (typeof body?.source === "string") {
      if (!(CANDIDATE_SOURCES as readonly string[]).includes(body.source)) {
        return jsonError("Invalid source.", 400);
      }
      updates.source = body.source;
    }
    if (typeof body?.notes === "string") updates.notes = body.notes;
    if (typeof body?.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (Object.keys(updates).length === 0) {
      return jsonError("Nothing to update.", 400);
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await db()
      .from("candidates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error?.code === "PGRST116") return jsonError("Candidate not found.", 404);
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { error } = await db().from("candidates").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
