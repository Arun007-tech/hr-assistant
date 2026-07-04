import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { db } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    if (typeof body?.done !== "boolean") {
      return jsonError("done (boolean) is required.", 400);
    }
    const { data, error } = await db()
      .from("captures")
      .update({ done: body.done })
      .eq("id", id)
      .select("id, done")
      .single();
    if (error?.code === "PGRST116") return jsonError("Not found.", 404);
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
