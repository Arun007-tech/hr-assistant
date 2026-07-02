"use client";

import { Spinner } from "@/components/Spinner";

const variants = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-hover active:bg-accent-hover disabled:bg-stone-300 disabled:shadow-none",
  secondary:
    "border border-stone-300 bg-surface text-stone-700 hover:bg-stone-50 active:bg-stone-100 disabled:text-stone-400",
  danger:
    "border border-red-200 bg-surface text-red-600 hover:bg-red-50 active:bg-red-100 disabled:text-stone-400",
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
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-base font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
