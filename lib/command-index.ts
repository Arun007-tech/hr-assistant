export interface CommandItem {
  type: "job" | "candidate";
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

// Simple subsequence match: every character of the query must appear in
// order in the label/sublabel. Scores tighter (more consecutive) matches
// higher so "priy" ranks "Priya Sharma" above a looser coincidental match.
function subsequenceScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (q.length === 0) return 0;
  if (t.includes(q)) return 1000 - t.indexOf(q);

  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      streak++;
      score += streak;
    } else {
      streak = 0;
    }
  }
  return qi === q.length ? score : -1;
}

export function filterIndex(
  items: CommandItem[],
  query: string,
  limit = 8
): CommandItem[] {
  const trimmed = query.trim();
  if (!trimmed) return items.slice(0, limit);

  return items
    .map((item) => {
      const labelScore = subsequenceScore(item.label, trimmed);
      const subScore = subsequenceScore(item.sublabel, trimmed) - 500;
      return { item, score: Math.max(labelScore, subScore) };
    })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}
