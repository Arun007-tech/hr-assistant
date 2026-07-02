const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_CANDIDATE_RE = /\+?[\d\s().-]{10,18}/g;

// Sent-to-AI text only; the original stays in the database untouched.
export function redactContactInfo(text: string): string {
  return text
    .replace(EMAIL_RE, "[email removed]")
    .replace(PHONE_CANDIDATE_RE, (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13
        ? "[phone removed]"
        : match;
    });
}
