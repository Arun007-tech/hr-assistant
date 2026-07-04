export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface p-4 card-shadow sm:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
