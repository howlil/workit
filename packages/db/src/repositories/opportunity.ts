import type {
  Opportunity,
  JobSnapshot,
  ExistingOpportunitySummary,
  OpportunityState,
} from "@workit/domain";

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[]; success?: boolean }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<T[]>;
}

interface OpportunityRow {
  id: string;
  user_id: string;
  source_provider: string | null;
  source_job_id: string | null;
  canonical_url: string;
  company: string;
  title: string;
  location: string | null;
  work_arrangement: string | null;
  employment_type: string | null;
  state: string;
  current_snapshot_id: string;
  created_at: string;
  updated_at: string;
}

interface JobSnapshotRow {
  id: string;
  opportunity_id: string;
  company: string;
  title: string;
  location: string | null;
  employment_type: string | null;
  work_arrangement: string | null;
  description_text: string;
  description_html: string | null;
  source_url: string;
  captured_at: string;
  content_hash: string;
}

export class D1OpportunityRepository {
  constructor(private db: D1DatabaseLike) {}

  /**
   * Atomically persists an Opportunity and its initial JobSnapshot using D1 batch.
   */
  async create(opportunity: Opportunity, initialSnapshot: JobSnapshot): Promise<void> {
    const insertOpportunity = this.db
      .prepare(
        `INSERT INTO opportunities (
          id, user_id, source_provider, source_job_id, canonical_url,
          company, title, location, work_arrangement, employment_type,
          state, current_snapshot_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        opportunity.id,
        opportunity.userId,
        opportunity.sourceProvider ?? null,
        opportunity.sourceJobId ?? null,
        opportunity.canonicalUrl,
        opportunity.company,
        opportunity.title,
        opportunity.location ?? null,
        opportunity.workArrangement ?? null,
        opportunity.employmentType ?? null,
        opportunity.state,
        opportunity.currentSnapshotId,
        opportunity.createdAt,
        opportunity.updatedAt
      );

    const insertSnapshot = this.db
      .prepare(
        `INSERT INTO job_snapshots (
          id, opportunity_id, company, title, location,
          employment_type, work_arrangement, description_text,
          description_html, source_url, captured_at, content_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        initialSnapshot.id,
        initialSnapshot.opportunityId,
        initialSnapshot.company,
        initialSnapshot.title,
        initialSnapshot.location ?? null,
        initialSnapshot.employmentType ?? null,
        initialSnapshot.workArrangement ?? null,
        initialSnapshot.descriptionText,
        initialSnapshot.descriptionHtml ?? null,
        initialSnapshot.sourceUrl,
        initialSnapshot.capturedAt,
        initialSnapshot.contentHash
      );

    await this.db.batch([insertOpportunity, insertSnapshot]);
  }

  async findById(
    userId: string,
    id: string
  ): Promise<{ opportunity: Opportunity; currentSnapshot: JobSnapshot } | null> {
    const oppRow = await this.db
      .prepare("SELECT * FROM opportunities WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .first<OpportunityRow>();

    if (!oppRow) return null;

    const snapRow = await this.db
      .prepare("SELECT * FROM job_snapshots WHERE id = ?")
      .bind(oppRow.current_snapshot_id)
      .first<JobSnapshotRow>();

    if (!snapRow) return null;

    return {
      opportunity: this.mapOpportunityRow(oppRow),
      currentSnapshot: this.mapSnapshotRow(snapRow),
    };
  }

  async findByUrl(userId: string, canonicalUrl: string): Promise<Opportunity | null> {
    const row = await this.db
      .prepare("SELECT * FROM opportunities WHERE user_id = ? AND canonical_url = ?")
      .bind(userId, canonicalUrl)
      .first<OpportunityRow>();

    return row ? this.mapOpportunityRow(row) : null;
  }

  async listSummaries(userId: string): Promise<ExistingOpportunitySummary[]> {
    const res = await this.db
      .prepare(
        "SELECT id, source_provider, source_job_id, canonical_url, company, title, location FROM opportunities WHERE user_id = ?"
      )
      .bind(userId)
      .all<OpportunityRow>();

    const rows = res.results || [];
    return rows.map((r) => ({
      id: r.id,
      sourceProvider: r.source_provider ?? undefined,
      sourceJobId: r.source_job_id ?? undefined,
      canonicalUrl: r.canonical_url,
      company: r.company,
      title: r.title,
      location: r.location ?? undefined,
    }));
  }

  async list(
    userId: string,
    options: { state?: OpportunityState; limit?: number } = {}
  ): Promise<Opportunity[]> {
    const limit = options.limit || 50;
    let query = "SELECT * FROM opportunities WHERE user_id = ?";
    const bindings: unknown[] = [userId];

    if (options.state) {
      query += " AND state = ?";
      bindings.push(options.state);
    }

    query += " ORDER BY updated_at DESC LIMIT ?";
    bindings.push(limit);

    const res = await this.db.prepare(query).bind(...bindings).all<OpportunityRow>();
    const rows = res.results || [];
    return rows.map((r) => this.mapOpportunityRow(r));
  }

  private mapOpportunityRow(row: OpportunityRow): Opportunity {
    return {
      id: row.id,
      userId: row.user_id,
      sourceProvider: row.source_provider ?? undefined,
      sourceJobId: row.source_job_id ?? undefined,
      canonicalUrl: row.canonical_url,
      company: row.company,
      title: row.title,
      location: row.location ?? undefined,
      workArrangement: row.work_arrangement ?? undefined,
      employmentType: row.employment_type ?? undefined,
      state: row.state as OpportunityState,
      currentSnapshotId: row.current_snapshot_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSnapshotRow(row: JobSnapshotRow): JobSnapshot {
    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      company: row.company,
      title: row.title,
      location: row.location ?? undefined,
      employmentType: row.employment_type ?? undefined,
      workArrangement: row.work_arrangement ?? undefined,
      descriptionText: row.description_text,
      descriptionHtml: row.description_html ?? undefined,
      sourceUrl: row.source_url,
      capturedAt: row.captured_at,
      contentHash: row.content_hash,
    };
  }
}
