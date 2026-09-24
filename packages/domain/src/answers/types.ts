export interface AnswerMemoryItem {
  id: string;
  userId: string;
  questionKey: string;
  questionText: string;
  answerText: string;
  category?: string;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type AnswerMatchStrategy = "exact" | "token_overlap" | "normalized";

export interface AnswerMatchResult {
  item: AnswerMemoryItem;
  similarityScore: number;
  matchStrategy: AnswerMatchStrategy;
}
