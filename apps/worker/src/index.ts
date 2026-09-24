import { Hono } from "hono";
import { D1OpportunityRepository, type D1DatabaseLike } from "@workit/db";
import { OpportunityService } from "./services/opportunity.js";
import { createOpportunityRouter } from "./http/opportunities.js";

type Bindings = {
  DB?: D1DatabaseLike;
};

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Authentication middleware — extracts authenticated identity
// In production: derived from token / Cloudflare Access. In dev: defaults to trusted test user.
app.use("*", async (c, next) => {
  const userIdHeader = c.req.header("x-user-id");
  const userId = userIdHeader || "usr_default";
  c.set("userId", userId);
  await next();
});

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", service: "workit-api" });
});

// Helper to instantiate OpportunityService per request
export function getOpportunityService(db: D1DatabaseLike): OpportunityService {
  const repo = new D1OpportunityRepository(db);
  return new OpportunityService(repo);
}

// Memory fallback database for development / tests without active D1 binding
class MemoryD1Database implements D1DatabaseLike {
  private rows = {
    opportunities: new Map<string, any>(),
    jobSnapshots: new Map<string, any>(),
  };

  prepare(sql: string) {
    const self = this;
    const stmt = {
      bound: [] as any[],
      bind(...args: any[]) {
        stmt.bound = args;
        return stmt;
      },
      first: async <T = any>() => {
        const res = self.execute(sql, stmt.bound);
        return (res[0] as T) || null;
      },
      all: async <T = any>() => {
        const res = self.execute(sql, stmt.bound);
        return { results: res as T[], success: true };
      },
      run: async () => {
        self.execute(sql, stmt.bound);
        return { success: true };
      },
    };
    return stmt;
  }

  async batch<T = unknown>(statements: any[]): Promise<T[]> {
    for (const stmt of statements) {
      await stmt.run();
    }
    return [] as T[];
  }

  private execute(sql: string, bound: any[]): any[] {
    const s = sql.trim();
    if (s.startsWith("INSERT INTO opportunities")) {
      const [id, user_id, source_provider, source_job_id, canonical_url, company, title, location, work_arrangement, employment_type, state, current_snapshot_id, created_at, updated_at] = bound;
      this.rows.opportunities.set(id, { id, user_id, source_provider, source_job_id, canonical_url, company, title, location, work_arrangement, employment_type, state, current_snapshot_id, created_at, updated_at });
      return [];
    }
    if (s.startsWith("INSERT INTO job_snapshots")) {
      const [id, opportunity_id, company, title, location, employment_type, work_arrangement, description_text, description_html, source_url, captured_at, content_hash] = bound;
      this.rows.jobSnapshots.set(id, { id, opportunity_id, company, title, location, employment_type, work_arrangement, description_text, description_html, source_url, captured_at, content_hash });
      return [];
    }
    if (s.includes("FROM opportunities WHERE id = ? AND user_id = ?")) {
      const [id, userId] = bound;
      const opp = this.rows.opportunities.get(id);
      return opp && opp.user_id === userId ? [{ ...opp }] : [];
    }
    if (s.includes("FROM job_snapshots WHERE id = ?")) {
      const [id] = bound;
      const snap = this.rows.jobSnapshots.get(id);
      return snap ? [{ ...snap }] : [];
    }
    if (s.includes("FROM opportunities WHERE user_id = ? AND canonical_url = ?")) {
      const [userId, url] = bound;
      for (const opp of this.rows.opportunities.values()) {
        if (opp.user_id === userId && opp.canonical_url === url) return [{ ...opp }];
      }
      return [];
    }
    if (s.includes("SELECT id, source_provider, source_job_id, canonical_url, company, title, location FROM opportunities WHERE user_id = ?")) {
      const [userId] = bound;
      const list: any[] = [];
      for (const opp of this.rows.opportunities.values()) {
        if (opp.user_id === userId) list.push({ ...opp });
      }
      return list;
    }
    if (s.includes("FROM opportunities WHERE user_id = ?")) {
      const [userId, state] = bound;
      const list: any[] = [];
      for (const opp of this.rows.opportunities.values()) {
        if (opp.user_id === userId) {
          if (!s.includes("AND state = ?") || opp.state === state) list.push({ ...opp });
        }
      }
      return list;
    }
    return [];
  }
}

export const sharedDevDb = new MemoryD1Database();

const opportunityRouter = createOpportunityRouter((c) => {
  const db = c.env?.DB || sharedDevDb;
  return getOpportunityService(db);
});

app.route("/api/opportunities", opportunityRouter);

export default app;
