"use client";

import { Spinner } from "@/components/Spinner";

const variants = {
  primary:
    "glow-focus bg-accent text-white shadow-sm hover:bg-accent-hover active:bg-accent-hover disabled:bg-subtle disabled:shadow-none",
  secondary:
    "border border-border bg-surface text-foreground/80 hover:bg-subtle active:bg-subtle disabled:text-faint",
  danger:
    "border border-red-200 bg-surface text-red-600 hover:bg-red-50 active:bg-red-100 disabled:text-faint dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 dark:active:bg-red-500/15",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-base font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
