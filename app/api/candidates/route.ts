import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { CANDIDATE_SOURCES, CANDIDATE_STATUSES } from "@/lib/schemas";
import { db } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("job_id");
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const minScore = url.searchParams.get("min_score");
    const maxScore = url.searchParams.get("max_score");
    const q = url.searchParams.get("q");

    let query = db()
      .from("candidates")
      .select(
        "id, name, source, score, status, created_at, job_id, notes, phone, updated_at, jobs(title)"
      )
      .order("created_at", { ascending: false });

    if (jobId) query = query.eq("job_id", jobId);
    if (status && (CANDIDATE_STATUSES as readonly string[]).includes(status)) {
      query = query.eq("status", status);
    }
    if (source && (CANDIDATE_SOURCES as readonly string[]).includes(source)) {
      query = query.eq("source", source);
    }
    if (minScore) query = query.gte("score", Number(minScore));
    if (maxScore) query = query.lte("score", Number(maxScore));
    if (q) query = query.ilike("name", `%${q}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const candidates = (data ?? []).map(({ jobs, ...rest }) => {
      const job = Array.isArray(jobs) ? jobs[0] : jobs;
      return { ...rest, job_title: job?.title ?? "" };
    });

    return NextResponse.json(candidates);
  } catch (err) {
    return errorResponse(err);
  }
}
