import { Hono } from "hono";
import {
  D1OpportunityRepository,
  D1ProfileRepository,
  D1ApplicationRepository,
  D1AnswerMemoryRepository,
  type D1DatabaseLike,
} from "@workit/db";
import { OpportunityService } from "./services/opportunity.js";
import { ProfileService } from "./services/profile.js";
import { ApplicationService } from "./services/application.js";
import { AnswerService } from "./services/answers.js";
import { EvidenceService } from "./services/evidence.js";
import { createOpportunityRouter } from "./http/opportunities.js";
import { createProfileRouter } from "./http/profile.js";
import { createApplicationRouter } from "./http/application.js";
import { createAnswerRouter } from "./http/answers.js";
import { createEvidenceRouter } from "./http/evidence.js";

type Bindings = {
  DB?: D1DatabaseLike;
};

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Authentication middleware — extracts authenticated identity
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

// Helpers to instantiate services per request
export function getOpportunityService(db: D1DatabaseLike): OpportunityService {
  const repo = new D1OpportunityRepository(db);
  return new OpportunityService(repo);
}

export function getProfileService(db: D1DatabaseLike): ProfileService {
  const repo = new D1ProfileRepository(db);
  return new ProfileService(repo);
}

export function getApplicationService(db: D1DatabaseLike): ApplicationService {
  const repo = new D1ApplicationRepository(db);
  return new ApplicationService(repo);
}

export function getAnswerService(db: D1DatabaseLike): AnswerService {
  const repo = new D1AnswerMemoryRepository(db);
  return new AnswerService(repo);
}

export function getEvidenceService(db: D1DatabaseLike): EvidenceService {
  const profileRepo = new D1ProfileRepository(db);
  return new EvidenceService(profileRepo);
}

// Memory fallback database for development / tests without active D1 binding
class MemoryD1Database implements D1DatabaseLike {
  private rows = {
    opportunities: new Map<string, any>(),
    jobSnapshots: new Map<string, any>(),
    careerProfiles: new Map<string, any>(),
    profileExperiences: new Map<string, any>(),
    profileFacts: new Map<string, any>(),
    profileEducation: new Map<string, any>(),
    profileSkills: new Map<string, any>(),
    applications: new Map<string, any>(),
    applicationEvents: new Map<string, any>(),
    submittedAnswers: new Map<string, any>(),
    answerMemories: new Map<string, any>(),
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

    // Opportunities & Snapshots
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

    // Career Profiles
    if (s.startsWith("INSERT INTO career_profiles")) {
      const [id, user_id, full_name, email, phone, location, linkedin_url, portfolio_url, github_url, summary, created_at, updated_at] = bound;
      this.rows.careerProfiles.set(id, { id, user_id, full_name, email, phone, location, linkedin_url, portfolio_url, github_url, summary, created_at, updated_at });
      return [];
    }
    if (s.includes("FROM career_profiles WHERE user_id = ?")) {
      const [userId] = bound;
      for (const p of this.rows.careerProfiles.values()) {
        if (p.user_id === userId) return [{ ...p }];
      }
      return [];
    }
    if (s.startsWith("UPDATE career_profiles SET")) {
      const [full_name, email, phone, location, linkedin_url, portfolio_url, github_url, summary, updated_at, id, user_id] = bound;
      const existing = this.rows.careerProfiles.get(id);
      if (existing && existing.user_id === user_id) {
        Object.assign(existing, { full_name, email, phone, location, linkedin_url, portfolio_url, github_url, summary, updated_at });
      }
      return [];
    }

    // Experiences
    if (s.startsWith("INSERT INTO profile_experiences")) {
      const [id, profile_id, company, title, location, start_date, end_date, is_current, description, created_at, updated_at] = bound;
      this.rows.profileExperiences.set(id, { id, profile_id, company, title, location, start_date, end_date, is_current, description, created_at, updated_at });
      return [];
    }
    if (s.includes("FROM profile_experiences WHERE profile_id = ?")) {
      const [profileId] = bound;
      const list: any[] = [];
      for (const exp of this.rows.profileExperiences.values()) {
        if (exp.profile_id === profileId) list.push({ ...exp });
      }
      return list;
    }
    if (s.startsWith("DELETE FROM profile_experiences WHERE id = ?")) {
      const [id] = bound;
      this.rows.profileExperiences.delete(id);
      return [];
    }

    // Experience Facts
    if (s.startsWith("INSERT INTO profile_experience_facts")) {
      const [id, experience_id, fact_text, fact_type, created_at] = bound;
      this.rows.profileFacts.set(id, { id, experience_id, fact_text, fact_type, created_at });
      return [];
    }
    if (s.includes("FROM profile_experience_facts WHERE experience_id = ?")) {
      const [expId] = bound;
      const list: any[] = [];
      for (const fact of this.rows.profileFacts.values()) {
        if (fact.experience_id === expId) list.push({ ...fact });
      }
      return list;
    }

    // Education
    if (s.startsWith("INSERT INTO profile_education")) {
      const [id, profile_id, institution, degree, field_of_study, start_date, end_date, created_at] = bound;
      this.rows.profileEducation.set(id, { id, profile_id, institution, degree, field_of_study, start_date, end_date, created_at });
      return [];
    }
    if (s.includes("FROM profile_education WHERE profile_id = ?")) {
      const [profileId] = bound;
      const list: any[] = [];
      for (const edu of this.rows.profileEducation.values()) {
        if (edu.profile_id === profileId) list.push({ ...edu });
      }
      return list;
    }
    if (s.startsWith("DELETE FROM profile_education WHERE id = ?")) {
      const [id] = bound;
      this.rows.profileEducation.delete(id);
      return [];
    }

    // Skills
    if (s.startsWith("INSERT INTO profile_skills")) {
      const [id, profile_id, name, category, created_at] = bound;
      this.rows.profileSkills.set(id, { id, profile_id, name, category, created_at });
      return [];
    }
    if (s.includes("FROM profile_skills WHERE profile_id = ?")) {
      const [profileId] = bound;
      const list: any[] = [];
      for (const skill of this.rows.profileSkills.values()) {
        if (skill.profile_id === profileId) list.push({ ...skill });
      }
      return list;
    }
    if (s.startsWith("DELETE FROM profile_skills WHERE profile_id = ?")) {
      const [profileId] = bound;
      for (const [key, skill] of this.rows.profileSkills.entries()) {
        if (skill.profile_id === profileId) this.rows.profileSkills.delete(key);
      }
      return [];
    }

    // Applications & Events
    if (s.startsWith("INSERT INTO applications")) {
      const [id, user_id, opportunity_id, state, started_at, submitted_at, submitted_job_snapshot_id, submitted_resume_artifact_id, created_at, updated_at] = bound;
      this.rows.applications.set(id, { id, user_id, opportunity_id, state, started_at, submitted_at, submitted_job_snapshot_id, submitted_resume_artifact_id, created_at, updated_at });
      return [];
    }
    if (s.includes("FROM applications WHERE id = ? AND user_id = ?")) {
      const [id, userId] = bound;
      const app = this.rows.applications.get(id);
      return app && app.user_id === userId ? [{ ...app }] : [];
    }
    if (s.includes("FROM applications WHERE opportunity_id = ? AND user_id = ?")) {
      const [oppId, userId] = bound;
      for (const app of this.rows.applications.values()) {
        if (app.opportunity_id === oppId && app.user_id === userId) return [{ ...app }];
      }
      return [];
    }
    if (s.startsWith("UPDATE applications SET")) {
      const [state, submitted_at, submitted_job_snapshot_id, submitted_resume_artifact_id, updated_at, id, user_id] = bound;
      const app = this.rows.applications.get(id);
      if (app && app.user_id === user_id) {
        Object.assign(app, { state, submitted_at, submitted_job_snapshot_id, submitted_resume_artifact_id, updated_at });
      }
      return [];
    }
    if (s.startsWith("UPDATE opportunities SET")) {
      const [state, updated_at, id, user_id] = bound;
      const opp = this.rows.opportunities.get(id);
      if (opp && opp.user_id === user_id) {
        opp.state = state;
        opp.updated_at = updated_at;
      }
      return [];
    }
    if (s.startsWith("INSERT INTO application_events")) {
      const [id, application_id, from_state, to_state, action, timestamp, metadata_json] = bound;
      this.rows.applicationEvents.set(id, { id, application_id, from_state, to_state, action, timestamp, metadata_json });
      return [];
    }
    if (s.startsWith("INSERT INTO submitted_answers")) {
      const [id, application_id, question_key, question_text, answer_text, created_at] = bound;
      this.rows.submittedAnswers.set(id, { id, application_id, question_key, question_text, answer_text, created_at });
      return [];
    }

    // Answer Memories
    if (s.includes("FROM answer_memories WHERE user_id = ? AND question_key = ?")) {
      const [userId, questionKey] = bound;
      for (const ans of this.rows.answerMemories.values()) {
        if (ans.user_id === userId && ans.question_key === questionKey) return [{ ...ans }];
      }
      return [];
    }
    if (s.startsWith("UPDATE answer_memories SET")) {
      const [question_text, answer_text, category, usage_count, last_used_at, updated_at, id, user_id] = bound;
      const ans = this.rows.answerMemories.get(id);
      if (ans && ans.user_id === user_id) {
        Object.assign(ans, { question_text, answer_text, category, usage_count, last_used_at, updated_at });
      }
      return [];
    }
    if (s.startsWith("INSERT INTO answer_memories")) {
      const [id, user_id, question_key, question_text, answer_text, category, usage_count, last_used_at, created_at, updated_at] = bound;
      this.rows.answerMemories.set(id, { id, user_id, question_key, question_text, answer_text, category, usage_count, last_used_at, created_at, updated_at });
      return [];
    }
    if (s.includes("FROM answer_memories WHERE user_id = ?")) {
      const [userId] = bound;
      const results: any[] = [];
      for (const ans of this.rows.answerMemories.values()) {
        if (ans.user_id === userId) results.push({ ...ans });
      }
      return results.sort((a, b) => b.last_used_at.localeCompare(a.last_used_at));
    }
    if (s.startsWith("DELETE FROM answer_memories WHERE id = ? AND user_id = ?")) {
      const [id, userId] = bound;
      const ans = this.rows.answerMemories.get(id);
      if (ans && ans.user_id === userId) {
        this.rows.answerMemories.delete(id);
      }
      return [];
    }

    return [];
  }
}

export const sharedDevDb = new MemoryD1Database();

const opportunityRouter = createOpportunityRouter((c) => {
  const db = c.env?.DB || sharedDevDb;
  return getOpportunityService(db);
});

const profileRouter = createProfileRouter((c) => {
  const db = c.env?.DB || sharedDevDb;
  return getProfileService(db);
});

const applicationRouter = createApplicationRouter((c) => {
  const db = c.env?.DB || sharedDevDb;
  return getApplicationService(db);
});

const answerRouter = createAnswerRouter((c) => {
  const db = c.env?.DB || sharedDevDb;
  return getAnswerService(db);
});

const evidenceRouter = createEvidenceRouter((c) => {
  const db = c.env?.DB || sharedDevDb;
  return getEvidenceService(db);
});

app.route("/api/opportunities", opportunityRouter);
app.route("/api/profile", profileRouter);
app.route("/api/applications", applicationRouter);
app.route("/api/answers", answerRouter);
app.route("/api/evidence", evidenceRouter);

export default app;
