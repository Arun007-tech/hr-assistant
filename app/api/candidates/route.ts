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
    const poolOnly = url.searchParams.get("talent_pool") === "true";

    // Pool queries also need the analysis + resume text for skill matching
    // and re-adding to another role; the normal list stays lightweight.
    const fields = poolOnly
      ? "id, name, source, score, status, created_at, job_id, notes, phone, talent_pool, updated_at, resume_text, ai_analysis, jobs(title)"
      : "id, name, source, score, status, created_at, job_id, notes, phone, talent_pool, updated_at, jobs(title)";

    let query = db()
      .from("candidates")
      .select(fields)
      .order("created_at", { ascending: false });

    if (poolOnly) query = query.eq("talent_pool", true);
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

    type Row = Record<string, unknown> & {
      jobs: { title: string } | { title: string }[] | null;
    };
    const candidates = ((data ?? []) as unknown as Row[]).map(
      ({ jobs, ...rest }) => {
        const job = Array.isArray(jobs) ? jobs[0] : jobs;
        return { ...rest, job_title: job?.title ?? "" };
      }
    );

    return NextResponse.json(candidates);
  } catch (err) {
    return errorResponse(err);
  }
}
