"use client";

import { Spinner } from "@/components/Spinner";

const variants = {
  primary: "bg-sky-600 text-white active:bg-sky-700 disabled:bg-slate-300",
  secondary:
    "bg-white border border-slate-300 text-slate-700 active:bg-slate-100 disabled:text-slate-400",
  danger:
    "bg-white border border-red-300 text-red-600 active:bg-red-50 disabled:text-slate-400",
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
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-medium transition-colors ${variants[variant]} ${className}`}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
