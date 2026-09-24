import { describe, it, expect, beforeEach } from "vitest";
import { D1OpportunityRepository, type D1DatabaseLike, type D1PreparedStatementLike } from "../opportunity.js";
import type { Opportunity, JobSnapshot } from "@workit/domain";

class FakeD1PreparedStatement implements D1PreparedStatementLike {
  private boundValues: unknown[] = [];

  constructor(
    private sql: string,
    private dbState: {
      opportunities: Map<string, Record<string, unknown>>;
      jobSnapshots: Map<string, Record<string, unknown>>;
    }
  ) {}

  bind(...values: unknown[]): D1PreparedStatementLike {
    this.boundValues = values;
    return this;
  }

  async run(): Promise<{ success: boolean }> {
    this.execute();
    return { success: true };
  }

  async first<T = unknown>(): Promise<T | null> {
    const res = this.execute();
    return (res[0] as T) || null;
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
    const res = this.execute();
    return { results: res as T[], success: true };
  }

  private execute(): Record<string, unknown>[] {
    const s = this.sql.trim();

    if (s.startsWith("INSERT INTO opportunities")) {
      const [
        id,
        user_id,
        source_provider,
        source_job_id,
        canonical_url,
        company,
        title,
        location,
        work_arrangement,
        employment_type,
        state,
        current_snapshot_id,
        created_at,
        updated_at,
      ] = this.boundValues;

      this.dbState.opportunities.set(id as string, {
        id,
        user_id,
        source_provider,
        source_job_id,
        canonical_url,
        company,
        title,
        location,
        work_arrangement,
        employment_type,
        state,
        current_snapshot_id,
        created_at,
        updated_at,
      });
      return [];
    }

    if (s.startsWith("INSERT INTO job_snapshots")) {
      const [
        id,
        opportunity_id,
        company,
        title,
        location,
        employment_type,
        work_arrangement,
        description_text,
        description_html,
        source_url,
        captured_at,
        content_hash,
      ] = this.boundValues;

      this.dbState.jobSnapshots.set(id as string, {
        id,
        opportunity_id,
        company,
        title,
        location,
        employment_type,
        work_arrangement,
        description_text,
        description_html,
        source_url,
        captured_at,
        content_hash,
      });
      return [];
    }

    if (s.includes("FROM opportunities WHERE id = ? AND user_id = ?")) {
      const [id, userId] = this.boundValues;
      const opp = this.dbState.opportunities.get(id as string);
      if (opp && opp.user_id === userId) {
        return [{ ...opp }];
      }
      return [];
    }

    if (s.includes("FROM job_snapshots WHERE id = ?")) {
      const [id] = this.boundValues;
      const snap = this.dbState.jobSnapshots.get(id as string);
      return snap ? [{ ...snap }] : [];
    }

    if (s.includes("FROM opportunities WHERE user_id = ? AND canonical_url = ?")) {
      const [userId, url] = this.boundValues;
      for (const opp of this.dbState.opportunities.values()) {
        if (opp.user_id === userId && opp.canonical_url === url) {
          return [{ ...opp }];
        }
      }
      return [];
    }

    if (s.includes("SELECT id, source_provider, source_job_id, canonical_url, company, title, location FROM opportunities WHERE user_id = ?")) {
      const [userId] = this.boundValues;
      const list: Record<string, unknown>[] = [];
      for (const opp of this.dbState.opportunities.values()) {
        if (opp.user_id === userId) {
          list.push({ ...opp });
        }
      }
      return list;
    }

    if (s.includes("FROM opportunities WHERE user_id = ?")) {
      const [userId, state] = this.boundValues;
      const list: Record<string, unknown>[] = [];
      for (const opp of this.dbState.opportunities.values()) {
        if (opp.user_id === userId) {
          if (!s.includes("AND state = ?") || opp.state === state) {
            list.push({ ...opp });
          }
        }
      }
      return list;
    }

    return [];
  }
}

class FakeD1Database implements D1DatabaseLike {
  private dbState = {
    opportunities: new Map<string, Record<string, unknown>>(),
    jobSnapshots: new Map<string, Record<string, unknown>>(),
  };

  prepare(query: string): D1PreparedStatementLike {
    return new FakeD1PreparedStatement(query, this.dbState);
  }

  async batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<T[]> {
    const results: unknown[] = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results as T[];
  }
}

describe("D1OpportunityRepository", () => {
  let db: FakeD1Database;
  let repo: D1OpportunityRepository;

  const mockOpp: Opportunity = {
    id: "opp_abc",
    userId: "usr_123",
    sourceProvider: "greenhouse",
    sourceJobId: "gh_789",
    canonicalUrl: "https://boards.greenhouse.io/acme/jobs/789",
    company: "Acme Corp",
    title: "Platform Engineer",
    location: "Jakarta, Indonesia",
    workArrangement: "remote",
    employmentType: "FULL_TIME",
    state: "saved",
    currentSnapshotId: "snap_xyz",
    createdAt: "2026-09-25T00:00:00Z",
    updatedAt: "2026-09-25T00:00:00Z",
  };

  const mockSnap: JobSnapshot = {
    id: "snap_xyz",
    opportunityId: "opp_abc",
    company: "Acme Corp",
    title: "Platform Engineer",
    location: "Jakarta, Indonesia",
    employmentType: "FULL_TIME",
    workArrangement: "remote",
    descriptionText: "Build scalable cloud infrastructure.",
    sourceUrl: "https://boards.greenhouse.io/acme/jobs/789",
    capturedAt: "2026-09-25T00:00:00Z",
    contentHash: "hash123",
  };

  beforeEach(() => {
    db = new FakeD1Database();
    repo = new D1OpportunityRepository(db);
  });

  it("persists opportunity and initial snapshot atomically", async () => {
    await repo.create(mockOpp, mockSnap);

    const fetched = await repo.findById("usr_123", "opp_abc");
    expect(fetched).not.toBeNull();
    expect(fetched!.opportunity.id).toBe("opp_abc");
    expect(fetched!.opportunity.company).toBe("Acme Corp");
    expect(fetched!.opportunity.state).toBe("saved");
    expect(fetched!.currentSnapshot.id).toBe("snap_xyz");
    expect(fetched!.currentSnapshot.descriptionText).toContain("scalable cloud");
  });

  it("finds opportunity by canonical URL", async () => {
    await repo.create(mockOpp, mockSnap);

    const found = await repo.findByUrl("usr_123", "https://boards.greenhouse.io/acme/jobs/789");
    expect(found).not.toBeNull();
    expect(found!.id).toBe("opp_abc");

    const notFound = await repo.findByUrl("usr_123", "https://other.com");
    expect(notFound).toBeNull();
  });

  it("lists summaries scoped to authenticated user_id", async () => {
    await repo.create(mockOpp, mockSnap);
    await repo.create(
      { ...mockOpp, id: "opp_other_user", userId: "usr_999" },
      { ...mockSnap, id: "snap_other", opportunityId: "opp_other_user" }
    );

    const summaries = await repo.listSummaries("usr_123");
    expect(summaries.length).toBe(1);
    expect(summaries[0]!.id).toBe("opp_abc");
  });

  it("filters opportunity list by state", async () => {
    await repo.create(mockOpp, mockSnap);
    await repo.create(
      { ...mockOpp, id: "opp_applying", state: "applying" },
      { ...mockSnap, id: "snap_applying", opportunityId: "opp_applying" }
    );

    const savedOnly = await repo.list("usr_123", { state: "saved" });
    expect(savedOnly.length).toBe(1);
    expect(savedOnly[0]!.id).toBe("opp_abc");

    const all = await repo.list("usr_123");
    expect(all.length).toBe(2);
  });
});
