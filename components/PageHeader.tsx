import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
  gradient = false,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  gradient?: boolean;
}) {
  return (
    <header className="mb-4">
      {backHref && (
        <Link
          href={backHref}
          className="mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover active:text-accent-hover"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className={`text-xl font-bold tracking-tight sm:text-2xl ${
              gradient
                ? "bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent"
                : "text-foreground"
            }`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 gap-2">{action}</div>}
      </div>
    </header>
  );
}
