"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import type { DuplicateMatch } from "@/lib/duplicates";

export function DuplicateWarning({
  duplicates,
  onForce,
  onDismiss,
  forcing = false,
}: {
  duplicates: DuplicateMatch[];
  onForce?: () => void;
  onDismiss?: () => void;
  forcing?: boolean;
}) {
  if (duplicates.length === 0) return null;
  const blocking = Boolean(onForce);
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        blocking
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-border bg-subtle text-foreground/80"
      }`}
    >
      <p className="mb-1.5 font-medium">
        {blocking ? "Possible duplicate" : "Also exists elsewhere"}
      </p>
      <ul className="mb-2 flex flex-col gap-1">
        {duplicates.map((d) => (
          <li key={d.id}>
            <Link
              href={`/jobs/${d.job_id}/candidates/${d.id}`}
              className="font-medium underline"
            >
              {d.name}
            </Link>{" "}
            — {d.job_title}
            {d.same_job ? " (this role)" : ""}
            {d.matched_on === "phone" && " · same phone"}
            {d.matched_on === "text" && " · identical profile text"}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {onForce && (
          <Button
            variant="secondary"
            onClick={onForce}
            loading={forcing}
            className="!min-h-10 !px-3 !text-xs"
          >
            Add anyway
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="secondary"
            onClick={onDismiss}
            className="!min-h-10 !px-3 !text-xs"
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
