import { describe, it, expect } from "vitest";
import { normalizeQuestion, extractQuestionTokens } from "../normalize-question";
import { findBestAnswerMatch } from "../match-answer";
import type { AnswerMemoryItem } from "../types";

describe("Answer Memory Domain Logic", () => {
  describe("normalizeQuestion", () => {
    it("strips polite prefixes and punctuation", () => {
      expect(normalizeQuestion("Please tell us: why do you want to work here?")).toBe(
        "why do you want to work here"
      );
      expect(normalizeQuestion("Describe a time you resolved a major production incident.")).toBe(
        "resolved a major production incident"
      );
    });

    it("extracts meaningful tokens without stop words", () => {
      const tokens = extractQuestionTokens("Why do you want to join our engineering team?");
      expect(tokens.has("join")).toBe(true);
      expect(tokens.has("engineering")).toBe(true);
      expect(tokens.has("team")).toBe(true);
      expect(tokens.has("you")).toBe(false); // Stop word
      expect(tokens.has("to")).toBe(false); // Stop word
    });
  });

  describe("findBestAnswerMatch", () => {
    const memoryItems: AnswerMemoryItem[] = [
      {
        id: "ans_1",
        userId: "usr_1",
        questionKey: "why do you want to work here",
        questionText: "Why do you want to work here?",
        answerText: "I admire the company culture and engineering velocity.",
        category: "motivation",
        usageCount: 3,
        lastUsedAt: "2026-09-25T00:00:00Z",
        createdAt: "2026-09-20T00:00:00Z",
        updatedAt: "2026-09-25T00:00:00Z",
      },
      {
        id: "ans_2",
        userId: "usr_1",
        questionKey: "describe leadership experience",
        questionText: "Describe a time you demonstrated leadership.",
        answerText: "I led a cross-functional squad of 5 engineers to migrate database schemas.",
        category: "behavioral",
        usageCount: 1,
        lastUsedAt: "2026-09-22T00:00:00Z",
        createdAt: "2026-09-22T00:00:00Z",
        updatedAt: "2026-09-22T00:00:00Z",
      },
    ];

    it("matches exact normalized question", () => {
      const match = findBestAnswerMatch("Please tell us, why do you want to work here?", memoryItems);
      expect(match).not.toBeNull();
      expect(match?.item.id).toBe("ans_1");
      expect(match?.similarityScore).toBe(1.0);
      expect(match?.matchStrategy).toBe("exact");
    });

    it("matches question with high token overlap", () => {
      const match = findBestAnswerMatch("Can you tell us why you want to work here?", memoryItems);
      expect(match).not.toBeNull();
      expect(match?.item.id).toBe("ans_1");
      expect(match?.similarityScore).toBeGreaterThanOrEqual(0.5);
    });

    it("returns null when no question matches threshold", () => {
      const match = findBestAnswerMatch("What is your expected salary?", memoryItems);
      expect(match).toBeNull();
    });
  });
});
