import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { SUPABASE_FREE_TIER_MB } from "@/lib/quota-reference";
import type {
  AiUsageRow,
  DbSizeInfo,
  UsageKindSummary,
  UsageSummary,
} from "@/lib/schemas";
import { db } from "@/lib/supabase";

function startOfDay(daysAgo: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return +d;
}

function summarize(rows: AiUsageRow[]): UsageSummary {
  const todayStart = startOfDay(0);
  const weekStart = startOfDay(7);
  const monthStart = startOfDay(30);

  const byKind = new Map<string, UsageKindSummary>();
  let totalToday = 0;
  let totalWeek = 0;
  let totalMonth = 0;

  for (const row of rows) {
    const t = +new Date(row.created_at);
    if (t < monthStart) continue;
    const entry = byKind.get(row.kind) ?? {
      kind: row.kind,
      today: 0,
      this_week: 0,
      this_month: 0,
      errors_this_month: 0,
    };
    entry.this_month += 1;
    totalMonth += 1;
    if (t >= weekStart) {
      entry.this_week += 1;
      totalWeek += 1;
    }
    if (t >= todayStart) {
      entry.today += 1;
      totalToday += 1;
    }
    if (row.status === "error") entry.errors_this_month += 1;
    byKind.set(row.kind, entry);
  }

  return {
    kinds: [...byKind.values()].sort((a, b) => b.this_month - a.this_month),
    total_today: totalToday,
    total_this_week: totalWeek,
    total_this_month: totalMonth,
  };
}

export async function GET() {
  try {
    const monthStart = new Date(startOfDay(30)).toISOString();
    const [usageResult, sizeResult] = await Promise.all([
      db()
        .from("ai_usage")
        .select("id, created_at, kind, status, duration_ms")
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false }),
      db().rpc("db_size_bytes"),
    ]);

    if (usageResult.error) throw new Error(usageResult.error.message);
    if (sizeResult.error) throw new Error(sizeResult.error.message);

    const usage = summarize((usageResult.data ?? []) as AiUsageRow[]);
    const bytes = Number(sizeResult.data ?? 0);
    const mb = bytes / (1024 * 1024);
    const db_size: DbSizeInfo = {
      bytes,
      mb,
      cap_mb: SUPABASE_FREE_TIER_MB,
      pct: Math.min(100, (mb / SUPABASE_FREE_TIER_MB) * 100),
    };

    return NextResponse.json({ usage, db_size });
  } catch (err) {
    return errorResponse(err);
  }
}
