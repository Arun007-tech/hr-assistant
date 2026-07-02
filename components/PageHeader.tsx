import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover active:text-accent-hover"
        >
          ← Back
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 gap-2">{action}</div>}
      </div>
    </header>
  );
}
