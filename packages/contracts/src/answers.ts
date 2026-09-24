import type { AnswerMemoryItem, AnswerMatchResult } from "@workit/domain";

export interface SaveAnswerMemoryRequest {
  questionText: string;
  answerText: string;
  category?: string;
}

export interface ListAnswerMemoriesResponse {
  answers: AnswerMemoryItem[];
}

export interface FindAnswerMatchRequest {
  questionText: string;
  threshold?: number;
}

export interface FindAnswerMatchResponse {
  match: AnswerMatchResult | null;
}
