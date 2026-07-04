import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { db } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await db()
      .from("captures")
      .select(
        "id, created_at, kind, text, candidate_id, job_id, done, candidates(name), jobs(title)"
      )
      .eq("done", false)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    type Row = Record<string, unknown> & {
      candidates: { name: string } | { name: string }[] | null;
      jobs: { title: string } | { title: string }[] | null;
    };
    const captures = ((data ?? []) as unknown as Row[]).map(
      ({ candidates, jobs, ...rest }) => {
        const candidate = Array.isArray(candidates) ? candidates[0] : candidates;
        const job = Array.isArray(jobs) ? jobs[0] : jobs;
        return {
          ...rest,
          candidate_name: candidate?.name ?? null,
          job_title: job?.title ?? null,
        };
      }
    );

    return NextResponse.json(captures);
  } catch (err) {
    return errorResponse(err);
  }
}
