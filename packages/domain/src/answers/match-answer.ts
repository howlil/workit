import type { AnswerMemoryItem, AnswerMatchResult } from "./types";
import { normalizeQuestion, extractQuestionTokens } from "./normalize-question";

export function findBestAnswerMatch(
  queryQuestion: string,
  items: AnswerMemoryItem[],
  threshold = 0.45
): AnswerMatchResult | null {
  if (!queryQuestion || items.length === 0) {
    return null;
  }

  const normalizedQuery = normalizeQuestion(queryQuestion);
  if (!normalizedQuery) {
    return null;
  }

  const queryTokens = extractQuestionTokens(queryQuestion);

  let bestResult: AnswerMatchResult | null = null;

  for (const item of items) {
    // 1. Exact normalized match
    if (item.questionKey === normalizedQuery) {
      return {
        item,
        similarityScore: 1.0,
        matchStrategy: "exact",
      };
    }

    // 2. Token overlap similarity (Jaccard similarity)
    const itemTokens = extractQuestionTokens(item.questionText);
    if (queryTokens.size === 0 || itemTokens.size === 0) continue;

    let intersectionCount = 0;
    for (const token of queryTokens) {
      if (itemTokens.has(token)) {
        intersectionCount++;
      }
    }

    const unionCount = new Set([...queryTokens, ...itemTokens]).size;
    const jaccardScore = unionCount > 0 ? intersectionCount / unionCount : 0;

    // Scale confidence by intersection size
    if (intersectionCount >= 2 && jaccardScore >= threshold) {
      if (!bestResult || jaccardScore > bestResult.similarityScore) {
        bestResult = {
          item,
          similarityScore: Number(jaccardScore.toFixed(2)),
          matchStrategy: "token_overlap",
        };
      }
    }
  }

  return bestResult;
}
