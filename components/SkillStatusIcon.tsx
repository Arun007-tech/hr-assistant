const skillIcon = {
  strong: { symbol: "✓", className: "text-emerald-600" },
  partial: { symbol: "~", className: "text-amber-600" },
  missing: { symbol: "✕", className: "text-red-500" },
};

export function SkillStatusIcon({
  status,
}: {
  status: "strong" | "partial" | "missing";
}) {
  const { symbol, className } = skillIcon[status];
  return (
    <span className={`w-4 shrink-0 text-center font-bold ${className}`}>
      {symbol}
    </span>
  );
}
