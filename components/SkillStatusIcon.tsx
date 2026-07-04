import { Check, Minus, X } from "lucide-react";

const skillIcon = {
  strong: { Icon: Check, className: "text-emerald-600 dark:text-emerald-400" },
  partial: { Icon: Minus, className: "text-amber-600 dark:text-amber-400" },
  missing: { Icon: X, className: "text-red-500 dark:text-red-400" },
};

export function SkillStatusIcon({
  status,
}: {
  status: "strong" | "partial" | "missing";
}) {
  const { Icon, className } = skillIcon[status];
  return (
    <span className={`flex w-4 shrink-0 items-center justify-center ${className}`}>
      <Icon className="size-3.5" strokeWidth={3} aria-hidden />
    </span>
  );
}
