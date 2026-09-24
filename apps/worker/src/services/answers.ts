import type { D1AnswerMemoryRepository } from "@workit/db";
import type {
  SaveAnswerMemoryRequest,
  ListAnswerMemoriesResponse,
  FindAnswerMatchResponse,
} from "@workit/contracts";
import type { AnswerMemoryItem } from "@workit/domain";

export class AnswerService {
  constructor(private repo: D1AnswerMemoryRepository) {}

  async save(userId: string, input: SaveAnswerMemoryRequest): Promise<AnswerMemoryItem> {
    return this.repo.upsert(userId, {
      questionText: input.questionText,
      answerText: input.answerText,
      category: input.category,
    });
  }

  async list(userId: string): Promise<ListAnswerMemoriesResponse> {
    const answers = await this.repo.list(userId);
    return { answers };
  }

  async findMatch(
    userId: string,
    questionText: string,
    _threshold?: number
  ): Promise<FindAnswerMatchResponse> {
    const match = await this.repo.findBestMatch(userId, questionText);
    return { match };
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.repo.delete(userId, id);
  }
}
