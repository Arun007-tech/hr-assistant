// Gemini free-tier limits aren't queryable via any API, so these are
// hand-entered reference points (as of the model set in GEMINI_MODEL) for
// comparing self-tracked call counts against. They can drift as Google
// changes free-tier terms — treat as approximate, not authoritative.
export const GEMINI_RPM_APPROX = 15;
export const GEMINI_RPD_APPROX = 1500;
export const QUOTA_REFERENCE_NOTE =
  "Gemini free-tier limits aren't exposed via any API — these are approximate reference points, not a live quota check.";

export const SUPABASE_FREE_TIER_MB = 500;
