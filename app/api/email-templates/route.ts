import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { db } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await db()
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const greeting = String(body?.greeting ?? "").trim();
    const signature = String(body?.signature ?? "").trim();
    if (!name) return jsonError("Template name is required.", 400);
    if (!subject) return jsonError("Subject is required.", 400);

    const { data, error } = await db()
      .from("email_templates")
      .insert({ name, subject, greeting, signature })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
