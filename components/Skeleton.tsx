export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 card-shadow">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 !rounded-full" />
        <Skeleton className="h-6 w-16 !rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <Skeleton className="mb-1.5 h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-14" />
    </div>
  );
}
