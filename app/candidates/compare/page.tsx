"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { ScoreRing } from "@/components/ScoreRing";
import { SkillStatusIcon } from "@/components/SkillStatusIcon";
import { Spinner } from "@/components/Spinner";
import { api } from "@/lib/client";
import type { Candidate } from "@/lib/schemas";

type CandidateDetail = Candidate & { job_title: string };

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16 text-stone-400">
          <Spinner />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);

  const [candidates, setCandidates] = useState<CandidateDetail[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length < 2) return;
    Promise.all(
      ids.map((id) => api<CandidateDetail>(`/api/candidates/${id}`))
    )
      .then(setCandidates)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const backHref =
    candidates && candidates[0] ? `/jobs/${candidates[0].job_id}` : "/candidates";

  if (ids.length < 2) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Compare candidates" backHref="/candidates" />
        <ErrorBanner message="Select at least 2 candidates from the same role to compare." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Compare candidates" backHref="/candidates" />
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!candidates) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Compare candidates" backHref="/candidates" />
        <div className="flex justify-center py-16 text-stone-400">
          <Spinner />
        </div>
      </div>
    );
  }

  const allSkills = [
    ...new Set(
      candidates.flatMap((c) =>
        (c.ai_analysis?.skills_match ?? []).map((s) => s.skill)
      )
    ),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Compare candidates"
        subtitle={candidates[0]?.job_title}
        backHref={backHref}
      />

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(candidates.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {candidates.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-stone-200 bg-surface p-4 shadow-[0_1px_2px_rgba(33,28,22,0.04)]"
          >
            <p className="mb-3 truncate font-semibold text-foreground">
              {c.name}
            </p>
            <div className="mb-3 flex justify-center">
              <ScoreRing score={c.score} size={72} />
            </div>
            {c.ai_analysis ? (
              <p className="mb-3 text-center text-xs text-stone-500">
                {c.ai_analysis.verdict}
              </p>
            ) : (
              <p className="mb-3 text-center text-xs text-stone-400">
                Not yet analyzed
              </p>
            )}
          </div>
        ))}
      </div>

      {allSkills.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-surface shadow-[0_1px_2px_rgba(33,28,22,0.04)]">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="p-3 font-medium text-stone-500">Skill</th>
                {candidates.map((c) => (
                  <th
                    key={c.id}
                    className="p-3 text-center font-medium text-stone-500"
                  >
                    <span className="truncate">{c.name.split(" ")[0]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSkills.map((skill) => (
                <tr key={skill} className="border-b border-stone-100 last:border-0">
                  <td className="p-3 text-stone-700">{skill}</td>
                  {candidates.map((c) => {
                    const match = c.ai_analysis?.skills_match.find(
                      (s) => s.skill === skill
                    );
                    return (
                      <td key={c.id} className="p-3 text-center">
                        {match ? (
                          <SkillStatusIcon status={match.status} />
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-4" style={{
        gridTemplateColumns: `repeat(${Math.min(candidates.length, 4)}, minmax(0, 1fr))`,
      }}>
        {candidates.map((c) => (
          <div key={c.id} className="text-sm">
            {c.ai_analysis?.gaps && c.ai_analysis.gaps.length > 0 && (
              <>
                <p className="mb-1.5 font-medium text-stone-700">Gaps</p>
                <ul className="flex flex-col gap-1 text-stone-600">
                  {c.ai_analysis.gaps.map((g) => (
                    <li key={g}>• {g}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
