export interface DuplicateMatch {
  id: string;
  name: string;
  job_id: string;
  job_title: string;
  same_job: boolean;
  matched_on: "name" | "phone" | "text";
}

interface ExistingCandidate {
  id: string;
  name: string;
  phone: string | null;
  job_id: string;
  job_title: string;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Names match when normalized-equal, or when one's tokens are a subset of the
// other's (handles "Priya Sharma" vs "Priya Sharma (Edited)" / initials order).
function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  if (ta.size < 2 || tb.size < 2) return false;
  const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  return [...small].every((t) => large.has(t));
}

export function findDuplicates(
  name: string,
  phone: string | null,
  targetJobId: string,
  existing: ExistingCandidate[]
): DuplicateMatch[] {
  const phoneDigits = phone ? digitsOnly(phone) : "";
  const matches: DuplicateMatch[] = [];
  for (const c of existing) {
    const phoneHit =
      phoneDigits.length >= 10 &&
      c.phone != null &&
      digitsOnly(c.phone) === phoneDigits;
    const nameHit = namesMatch(name, c.name);
    if (!phoneHit && !nameHit) continue;
    matches.push({
      id: c.id,
      name: c.name,
      job_id: c.job_id,
      job_title: c.job_title,
      same_job: c.job_id === targetJobId,
      matched_on: phoneHit ? "phone" : "name",
    });
  }
  return matches.sort((a, b) => Number(b.same_job) - Number(a.same_job));
}
