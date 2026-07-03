import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { db } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const updates: Record<string, string> = {};
    if (typeof body?.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body?.subject === "string" && body.subject.trim())
      updates.subject = body.subject.trim();
    if (typeof body?.greeting === "string") updates.greeting = body.greeting;
    if (typeof body?.signature === "string") updates.signature = body.signature;
    if (Object.keys(updates).length === 0) return jsonError("Nothing to update.", 400);

    const { data, error } = await db()
      .from("email_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error?.code === "PGRST116") return jsonError("Template not found.", 404);
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { error } = await db().from("email_templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
