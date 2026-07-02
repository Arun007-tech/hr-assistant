import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { db } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { data, error } = await db()
      .from("jobs")
      .select(
        "*, candidates(id, name, source, score, status, created_at)"
      )
      .eq("id", id)
      .single();
    if (error?.code === "PGRST116") return jsonError("Role not found.", 404);
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const updates: Record<string, string> = {};
    if (typeof body?.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (typeof body?.jd_text === "string" && body.jd_text.trim()) {
      updates.jd_text = body.jd_text.trim();
    }
    if (Object.keys(updates).length === 0) {
      return jsonError("Nothing to update.", 400);
    }
    const { data, error } = await db()
      .from("jobs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error?.code === "PGRST116") return jsonError("Role not found.", 404);
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { error } = await db().from("jobs").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
