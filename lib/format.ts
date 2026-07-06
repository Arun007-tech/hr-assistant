export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Scopes the query to LinkedIn's People search specifically — pasting a
// boolean string into LinkedIn's general top search bar can land on Jobs,
// Posts, or Companies results depending on what's currently selected there.
// This URL forces the People tab regardless.
export function linkedinPeopleSearchUrl(query: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}
