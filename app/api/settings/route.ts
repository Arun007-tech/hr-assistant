import { NextResponse } from "next/server";
import { errorResponse, jsonError } from "@/lib/http";
import { db } from "@/lib/supabase";

const DEFAULT_SLA = { sourced: 7, screening: 7 };

async function getOrCreate() {
  const { data: existing } = await db()
    .from("app_settings")
    .select("sla_days")
    .eq("id", 1)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await db()
    .from("app_settings")
    .insert({ id: 1, sla_days: DEFAULT_SLA })
    .select("sla_days")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function GET() {
  try {
    const settings = await getOrCreate();
    return NextResponse.json(settings);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    await getOrCreate();
    const body = await request.json().catch(() => null);
    const sla = body?.sla_days;
    const sourced = Number(sla?.sourced);
    const screening = Number(sla?.screening);
    if (
      !Number.isInteger(sourced) ||
      !Number.isInteger(screening) ||
      sourced < 1 ||
      screening < 1 ||
      sourced > 90 ||
      screening > 90
    ) {
      return jsonError("SLA days must be whole numbers between 1 and 90.", 400);
    }
    const { data, error } = await db()
      .from("app_settings")
      .update({ sla_days: { sourced, screening } })
      .eq("id", 1)
      .select("sla_days")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
