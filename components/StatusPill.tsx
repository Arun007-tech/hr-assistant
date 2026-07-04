import type { CandidateStatus } from "@/lib/schemas";

const styles: Record<CandidateStatus, string> = {
  sourced: "bg-subtle text-foreground/80",
  screening: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  shortlisted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
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
