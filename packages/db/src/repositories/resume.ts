import type { ResumeArtifact } from "@workit/domain";
import type { D1DatabaseLike } from "./opportunity.js";
import { generateId } from "@workit/shared";

interface ResumeArtifactRow {
  id: string;
  user_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  raw_text: string;
  created_at: string;
}

export interface SaveResumeArtifactInput {
  fileName: string;
  mimeType: string;
  fileSize: number;
  rawText: string;
}

export class D1ResumeRepository {
  constructor(private db: D1DatabaseLike) {}

  async save(userId: string, input: SaveResumeArtifactInput): Promise<ResumeArtifact> {
    const id = `res_${generateId()}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO resume_artifacts (
          id, user_id, file_name, mime_type, file_size, raw_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        input.fileName,
        input.mimeType,
        input.fileSize,
        input.rawText,
        now
      )
      .run();

    return {
      id,
      userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      rawText: input.rawText,
      createdAt: now,
    };
  }

  async list(userId: string): Promise<ResumeArtifact[]> {
    const res = await this.db
      .prepare("SELECT * FROM resume_artifacts WHERE user_id = ? ORDER BY created_at DESC")
      .bind(userId)
      .all<ResumeArtifactRow>();

    const rows = res.results || [];
    return rows.map((r) => this.mapRow(r));
  }

  async getById(userId: string, id: string): Promise<ResumeArtifact | null> {
    const row = await this.db
      .prepare("SELECT * FROM resume_artifacts WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .first<ResumeArtifactRow>();

    return row ? this.mapRow(row) : null;
  }

  async getLatest(userId: string): Promise<ResumeArtifact | null> {
    const row = await this.db
      .prepare("SELECT * FROM resume_artifacts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(userId)
      .first<ResumeArtifactRow>();

    return row ? this.mapRow(row) : null;
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM resume_artifacts WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();
  }

  private mapRow(row: ResumeArtifactRow): ResumeArtifact {
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      rawText: row.raw_text,
      createdAt: row.created_at,
    };
  }
}
