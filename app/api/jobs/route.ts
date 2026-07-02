import { NextResponse } from "next/server";
import { fileToText } from "@/lib/files";
import { errorResponse, jsonError } from "@/lib/http";
import {
  CANDIDATE_STATUSES,
  type CandidateStatus,
  type JobListItem,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export async function GET() {
  try {
    const { data, error } = await db()
      .from("jobs")
      .select("id, title, created_at, ideal_profile, candidates(status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const jobs: JobListItem[] = (data ?? []).map((row) => {
      const counts = Object.fromEntries(
        CANDIDATE_STATUSES.map((s) => [s, 0])
      ) as Record<CandidateStatus, number>;
      const candidates = (row.candidates ?? []) as { status: CandidateStatus }[];
      for (const c of candidates) {
        if (counts[c.status] !== undefined) counts[c.status] += 1;
      }
      return {
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        analyzed: row.ideal_profile != null,
        counts,
        total: candidates.length,
      };
    });
    return NextResponse.json(jobs);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let title = "";
    let jdText = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      title = String(form.get("title") ?? "").trim();
      jdText = String(form.get("jd_text") ?? "").trim();
      const file = form.get("file");
      if (!jdText && file instanceof File && file.size > 0) {
        jdText = await fileToText(file);
      }
    } else {
      const body = await request.json().catch(() => null);
      title = String(body?.title ?? "").trim();
      jdText = String(body?.jd_text ?? "").trim();
    }

    if (!title) return jsonError("Role title is required.", 400);
    if (!jdText) return jsonError("Paste a JD or upload a file.", 400);

    const { data, error } = await db()
      .from("jobs")
      .insert({ title, jd_text: jdText })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
