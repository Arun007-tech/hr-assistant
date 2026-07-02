"use client";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`min-h-11 rounded-full px-4 text-sm font-medium capitalize transition-colors ${
            value === option
              ? "bg-slate-900 text-white"
              : "border border-slate-300 bg-white text-slate-600 active:bg-slate-100"
          }`}
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
}
