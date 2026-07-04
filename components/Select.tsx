import { ChevronDown } from "lucide-react";

export function Select({
  className = "",
  wrapperClassName = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
}) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        {...props}
        className={`w-full appearance-none pr-9 ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}
