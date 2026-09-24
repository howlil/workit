import type {
  AnswerMemoryItem,
  AnswerMatchResult,
} from "@workit/domain";
import { normalizeQuestion, findBestAnswerMatch } from "@workit/domain";
import type { D1DatabaseLike } from "./opportunity";
import { generateId } from "@workit/shared";

interface AnswerMemoryRow {
  id: string;
  user_id: string;
  question_key: string;
  question_text: string;
  answer_text: string;
  category: string | null;
  usage_count: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertAnswerMemoryInput {
  questionText: string;
  answerText: string;
  category?: string;
}

export class D1AnswerMemoryRepository {
  constructor(private db: D1DatabaseLike) {}

  async upsert(userId: string, input: UpsertAnswerMemoryInput): Promise<AnswerMemoryItem> {
    const questionKey = normalizeQuestion(input.questionText);
    const now = new Date().toISOString();

    const existingRow = await this.db
      .prepare("SELECT * FROM answer_memories WHERE user_id = ? AND question_key = ?")
      .bind(userId, questionKey)
      .first<AnswerMemoryRow>();

    if (existingRow) {
      const updatedUsage = existingRow.usage_count + 1;
      await this.db
        .prepare(
          `UPDATE answer_memories SET
            question_text = ?, answer_text = ?, category = ?,
            usage_count = ?, last_used_at = ?, updated_at = ?
          WHERE id = ? AND user_id = ?`
        )
        .bind(
          input.questionText,
          input.answerText,
          input.category ?? existingRow.category,
          updatedUsage,
          now,
          now,
          existingRow.id,
          userId
        )
        .run();

      return {
        id: existingRow.id,
        userId,
        questionKey,
        questionText: input.questionText,
        answerText: input.answerText,
        category: input.category ?? existingRow.category ?? undefined,
        usageCount: updatedUsage,
        lastUsedAt: now,
        createdAt: existingRow.created_at,
        updatedAt: now,
      };
    }

    const id = `ans_${generateId()}`;
    await this.db
      .prepare(
        `INSERT INTO answer_memories (
          id, user_id, question_key, question_text, answer_text,
          category, usage_count, last_used_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        questionKey,
        input.questionText,
        input.answerText,
        input.category ?? null,
        1,
        now,
        now,
        now
      )
      .run();

    return {
      id,
      userId,
      questionKey,
      questionText: input.questionText,
      answerText: input.answerText,
      category: input.category,
      usageCount: 1,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  async list(userId: string): Promise<AnswerMemoryItem[]> {
    const res = await this.db
      .prepare("SELECT * FROM answer_memories WHERE user_id = ? ORDER BY last_used_at DESC")
      .bind(userId)
      .all<AnswerMemoryRow>();

    const rows = res.results || [];
    return rows.map((r) => this.mapRow(r));
  }

  async findBestMatch(userId: string, question: string): Promise<AnswerMatchResult | null> {
    const allAnswers = await this.list(userId);
    return findBestAnswerMatch(question, allAnswers);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM answer_memories WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();
  }

  private mapRow(row: AnswerMemoryRow): AnswerMemoryItem {
    return {
      id: row.id,
      userId: row.user_id,
      questionKey: row.question_key,
      questionText: row.question_text,
      answerText: row.answer_text,
      category: row.category ?? undefined,
      usageCount: row.usage_count,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
