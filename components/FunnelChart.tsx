import type { FunnelStage } from "@/lib/analytics";

const STAGE_COLOR: Record<string, string> = {
  sourced: "#a8a29e",
  screening: "#d97706",
  shortlisted: "#059669",
  rejected: "#dc2626",
};

const STAGE_LABEL: Record<string, string> = {
  sourced: "Sourced",
  screening: "Screening",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
};

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage, i) => (
        <div key={stage.status} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm font-medium text-muted">
            {STAGE_LABEL[stage.status]}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-subtle">
            <div
              className="anim-bar h-full rounded-md transition-all"
              style={
                {
                  width: `${(stage.count / max) * 100}%`,
                  backgroundColor: STAGE_COLOR[stage.status],
                  minWidth: stage.count > 0 ? "8px" : "0",
                  "--stagger": i,
                } as React.CSSProperties
              }
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-semibold text-foreground">
            {stage.count}
          </span>
        </div>
      ))}
    </div>
  );
}
