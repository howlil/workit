import type {
  Application,
  ApplicationAction,
  ApplicationEvent,
  SubmittedAnswer,
  ApplicationState,
} from "@workit/domain";
import { transitionApplication } from "@workit/domain";
import type { D1DatabaseLike } from "./opportunity";
import { generateId } from "@workit/shared";

interface ApplicationRow {
  id: string;
  user_id: string;
  opportunity_id: string;
  state: string;
  started_at: string;
  submitted_at: string | null;
  submitted_job_snapshot_id: string | null;
  submitted_resume_artifact_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SubmittedAnswerRow {
  id: string;
  application_id: string;
  question_key: string;
  question_text: string;
  answer_text: string;
  created_at: string;
}

export class D1ApplicationRepository {
  constructor(private db: D1DatabaseLike) {}

  async createOrGetForOpportunity(
    userId: string,
    opportunityId: string
  ): Promise<Application> {
    const existing = await this.findByOpportunity(userId, opportunityId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const id = `app_${generateId()}`;

    await this.db
      .prepare(
        `INSERT INTO applications (
          id, user_id, opportunity_id, state, started_at,
          submitted_at, submitted_job_snapshot_id, submitted_resume_artifact_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        opportunityId,
        "draft",
        now,
        null,
        null,
        null,
        now,
        now
      )
      .run();

    return {
      id,
      userId,
      opportunityId,
      state: "draft",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(userId: string, applicationId: string): Promise<Application | null> {
    const row = await this.db
      .prepare("SELECT * FROM applications WHERE id = ? AND user_id = ?")
      .bind(applicationId, userId)
      .first<ApplicationRow>();

    return row ? this.mapRow(row) : null;
  }

  async findByOpportunity(userId: string, opportunityId: string): Promise<Application | null> {
    const row = await this.db
      .prepare("SELECT * FROM applications WHERE opportunity_id = ? AND user_id = ?")
      .bind(opportunityId, userId)
      .first<ApplicationRow>();

    return row ? this.mapRow(row) : null;
  }

  async transition(
    userId: string,
    applicationId: string,
    action: ApplicationAction
  ): Promise<{ application: Application; event: ApplicationEvent }> {
    const current = await this.findById(userId, applicationId);
    if (!current) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const { nextApplication, event } = transitionApplication(current, action);

    // Atomically update Application, Opportunity state, and record Event
    const updateApp = this.db
      .prepare(
        `UPDATE applications SET
          state = ?, submitted_at = ?, submitted_job_snapshot_id = ?,
          submitted_resume_artifact_id = ?, updated_at = ?
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        nextApplication.state,
        nextApplication.submittedAt ?? null,
        nextApplication.submittedJobSnapshotId ?? null,
        nextApplication.submittedResumeArtifactId ?? null,
        nextApplication.updatedAt,
        applicationId,
        userId
      );

    const updateOpp = this.db
      .prepare(
        `UPDATE opportunities SET
          state = ?, updated_at = ?
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        nextApplication.state,
        nextApplication.updatedAt,
        current.opportunityId,
        userId
      );

    const insertEvent = this.db
      .prepare(
        `INSERT INTO application_events (
          id, application_id, from_state, to_state, action, timestamp, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        event.id,
        event.applicationId,
        event.fromState,
        event.toState,
        event.action,
        event.timestamp,
        event.metadata ? JSON.stringify(event.metadata) : null
      );

    await this.db.batch([updateApp, updateOpp, insertEvent]);

    return { application: nextApplication, event };
  }

  /**
   * Atomically confirms submission, updates Application & Opportunity states, records an event,
   * and persists all submitted answers in a SINGLE D1 batch transaction.
   */
  async confirmSubmission(
    userId: string,
    applicationId: string,
    data: {
      snapshotId: string;
      submittedAt?: string;
      resumeArtifactId?: string;
      answers?: Array<{ questionKey: string; questionText: string; answerText: string }>;
    }
  ): Promise<{ application: Application; event: ApplicationEvent; answers: SubmittedAnswer[] }> {
    const current = await this.findById(userId, applicationId);
    if (!current) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const submittedAt = data.submittedAt || new Date().toISOString();
    const { nextApplication, event } = transitionApplication(current, {
      type: "CONFIRM_SUBMISSION",
      submittedAt,
      snapshotId: data.snapshotId,
      resumeArtifactId: data.resumeArtifactId,
    });

    const updateApp = this.db
      .prepare(
        `UPDATE applications SET
          state = ?, submitted_at = ?, submitted_job_snapshot_id = ?,
          submitted_resume_artifact_id = ?, updated_at = ?
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        nextApplication.state,
        nextApplication.submittedAt ?? null,
        nextApplication.submittedJobSnapshotId ?? null,
        nextApplication.submittedResumeArtifactId ?? null,
        nextApplication.updatedAt,
        applicationId,
        userId
      );

    const updateOpp = this.db
      .prepare(
        `UPDATE opportunities SET
          state = ?, updated_at = ?
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        nextApplication.state,
        nextApplication.updatedAt,
        current.opportunityId,
        userId
      );

    const insertEvent = this.db
      .prepare(
        `INSERT INTO application_events (
          id, application_id, from_state, to_state, action, timestamp, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        event.id,
        event.applicationId,
        event.fromState,
        event.toState,
        event.action,
        event.timestamp,
        event.metadata ? JSON.stringify(event.metadata) : null
      );

    const stmts = [updateApp, updateOpp, insertEvent];
    const results: SubmittedAnswer[] = [];

    if (data.answers && data.answers.length > 0) {
      const now = new Date().toISOString();
      for (const ans of data.answers) {
        const id = `ans_${generateId()}`;
        stmts.push(
          this.db
            .prepare(
              `INSERT INTO submitted_answers (
                id, application_id, question_key, question_text, answer_text, created_at
              ) VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(id, applicationId, ans.questionKey, ans.questionText, ans.answerText, now)
        );
        results.push({
          id,
          applicationId,
          questionKey: ans.questionKey,
          questionText: ans.questionText,
          answerText: ans.answerText,
          createdAt: now,
        });
      }
    }

    // Atomic batch for all changes
    await this.db.batch(stmts);

    return { application: nextApplication, event, answers: results };
  }

  async findSubmittedAnswers(applicationId: string): Promise<SubmittedAnswer[]> {
    const res = await this.db
      .prepare(
        "SELECT id, application_id, question_key, question_text, answer_text, created_at FROM submitted_answers WHERE application_id = ? ORDER BY created_at ASC"
      )
      .bind(applicationId)
      .all<SubmittedAnswerRow>();

    const rows = res.results || [];
    return rows.map((r) => ({
      id: r.id,
      applicationId: r.application_id,
      questionKey: r.question_key,
      questionText: r.question_text,
      answerText: r.answer_text,
      createdAt: r.created_at,
    }));
  }

  async recordSubmittedAnswers(
    applicationId: string,
    answers: Array<{ questionKey: string; questionText: string; answerText: string }>
  ): Promise<SubmittedAnswer[]> {
    const now = new Date().toISOString();
    const stmts = [];
    const results: SubmittedAnswer[] = [];

    for (const ans of answers) {
      const id = `ans_${generateId()}`;
      stmts.push(
        this.db
          .prepare(
            `INSERT INTO submitted_answers (
              id, application_id, question_key, question_text, answer_text, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(id, applicationId, ans.questionKey, ans.questionText, ans.answerText, now)
      );
      results.push({
        id,
        applicationId,
        questionKey: ans.questionKey,
        questionText: ans.questionText,
        answerText: ans.answerText,
        createdAt: now,
      });
    }

    if (stmts.length > 0) {
      await this.db.batch(stmts);
    }

    return results;
  }

  private mapRow(row: ApplicationRow): Application {
    return {
      id: row.id,
      userId: row.user_id,
      opportunityId: row.opportunity_id,
      state: row.state as ApplicationState,
      startedAt: row.started_at,
      submittedAt: row.submitted_at ?? undefined,
      submittedJobSnapshotId: row.submitted_job_snapshot_id ?? undefined,
      submittedResumeArtifactId: row.submitted_resume_artifact_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
