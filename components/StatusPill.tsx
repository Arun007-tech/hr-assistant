import type { CandidateStatus } from "@/lib/schemas";

const styles: Record<CandidateStatus, string> = {
  sourced: "bg-stone-100 text-stone-700",
  screening: "bg-amber-100 text-amber-800",
  shortlisted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

export function StatusPill({ status }: { status: CandidateStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
