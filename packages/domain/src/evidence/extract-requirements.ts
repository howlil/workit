import type { JobRequirement } from "./types";

const TECH_KEYWORDS = [
  "react",
  "typescript",
  "javascript",
  "node.js",
  "nodejs",
  "graphql",
  "rest",
  "python",
  "go",
  "golang",
  "rust",
  "java",
  "sql",
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "tailwind",
  "css",
  "html",
  "next.js",
  "nextjs",
  "vue",
  "angular",
  "git",
  "ci/cd",
  "vitest",
  "jest",
  "playwright",
];

export function extractRequirements(text: string): JobRequirement[] {
  if (!text || text.trim().length === 0) return [];

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bulletLines: string[] = [];
  let inRequirementsSection = false;

  for (const line of rawLines) {
    const lower = line.toLowerCase();
    if (
      lower.includes("requirement") ||
      lower.includes("qualification") ||
      lower.includes("what you need") ||
      lower.includes("must have") ||
      lower.includes("who you are")
    ) {
      inRequirementsSection = true;
      continue;
    }

    const isBullet = /^[-*•·–—]\s+|^\d+[\.\)]\s+/.test(line);
    if (isBullet) {
      const cleaned = line.replace(/^[-*•·–—]\s+|^\d+[\.\)]\s+/, "").trim();
      if (cleaned.length > 3) {
        bulletLines.push(cleaned);
      }
    } else if (inRequirementsSection && line.length > 5 && !line.endsWith(":")) {
      bulletLines.push(line);
    }
  }

  // If bullet lines were found, treat them as requirements
  const candidateTexts: string[] = bulletLines.length > 0 ? bulletLines : [];

  // Fallback: If no bullet lines, split by sentences or detect tech keywords
  if (candidateTexts.length === 0) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    for (const s of sentences) {
      const lower = s.toLowerCase();
      const hasTech = TECH_KEYWORDS.some((kw) => lower.includes(kw));
      const hasExp = /year|experience|degree|proficien/i.test(lower);
      if (hasTech || hasExp) {
        candidateTexts.push(s);
      }
    }
  }

  // If still empty, check for comma-separated or keyword occurrences
  if (candidateTexts.length === 0) {
    const lower = text.toLowerCase();
    for (const kw of TECH_KEYWORDS) {
      if (lower.includes(kw)) {
        candidateTexts.push(kw.charAt(0).toUpperCase() + kw.slice(1));
      }
    }
  }

  let index = 1;
  return candidateTexts.map((itemText) => {
    const lower = itemText.toLowerCase();
    const keywords: string[] = [];

    for (const kw of TECH_KEYWORDS) {
      if (lower.includes(kw)) {
        keywords.push(kw);
      }
    }

    let type: JobRequirement["type"] = "generic";
    if (
      lower.includes("degree") ||
      lower.includes("bachelor") ||
      lower.includes("master") ||
      lower.includes("university") ||
      lower.includes("computer science")
    ) {
      type = "education";
    } else if (
      /(\d+\+?\s*years?)|(experience\s+with)|(prior\s+experience)/i.test(lower)
    ) {
      type = "experience";
    } else if (keywords.length > 0) {
      type = "skill";
    }

    return {
      id: `req_${index++}`,
      text: itemText,
      type,
      keywords,
    };
  });
}
