const FILLER_PHRASES = [
  /^please\s+tell\s+us\s+/i,
  /^please\s+describe\s+/i,
  /^please\s+explain\s+/i,
  /^tell\s+us\s+about\s+(a\s+time\s+)?(when\s+)?(you\s+)?/i,
  /^tell\s+us\s+/i,
  /^describe\s+a\s+time\s+(when\s+)?(you\s+)?/i,
  /^describe\s+/i,
  /^explain\s+/i,
  /^can\s+you\s+share\s+(a\s+time\s+)?(when\s+)?(you\s+)?/i,
  /^share\s+/i,
  /^briefly\s+/i,
];

export function normalizeQuestion(raw: string): string {
  if (!raw) return "";

  // 1. Lowercase and replace punctuation/symbols with spaces
  let cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 2. Remove common polite filler prefixes
  for (const regex of FILLER_PHRASES) {
    cleaned = cleaned.replace(regex, "");
  }

  return cleaned.trim();
}

export function extractQuestionTokens(text: string): Set<string> {
  const normalized = normalizeQuestion(text);
  if (!normalized) return new Set();

  const stopWords = new Set([
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
    "by", "of", "about", "your", "you", "our", "we", "us", "is", "are",
  ]);

  const tokens = normalized
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return new Set(tokens);
}
