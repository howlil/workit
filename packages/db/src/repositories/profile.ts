import type {
  CareerProfile,
  ProfileExperience,
  ProfileExperienceFact,
  ProfileEducation,
  ProfileSkill,
  FullCareerProfile,
} from "@workit/domain";
import type { D1DatabaseLike } from "./opportunity";
import { generateId } from "@workit/shared";

export interface UpdateProfileIdentityInput {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  summary?: string;
}

export interface CreateExperienceInput {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  facts?: string[];
}

export interface CreateEducationInput {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

interface CareerProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileExperienceRow {
  id: string;
  profile_id: string;
  company: string;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileFactRow {
  id: string;
  experience_id: string;
  fact_text: string;
  fact_type: string | null;
  created_at: string;
}

interface ProfileEducationRow {
  id: string;
  profile_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface ProfileSkillRow {
  id: string;
  profile_id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export class D1ProfileRepository {
  constructor(private db: D1DatabaseLike) {}

  async getOrCreateProfile(
    userId: string,
    defaultName = "My Name",
    defaultEmail = "user@example.com"
  ): Promise<FullCareerProfile> {
    let profileRow = await this.db
      .prepare("SELECT * FROM career_profiles WHERE user_id = ?")
      .bind(userId)
      .first<CareerProfileRow>();

    const now = new Date().toISOString();

    if (!profileRow) {
      const newId = `prof_${generateId()}`;
      await this.db
        .prepare(
          `INSERT INTO career_profiles (
            id, user_id, full_name, email, phone, location,
            linkedin_url, portfolio_url, github_url, summary,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          newId,
          userId,
          defaultName,
          defaultEmail,
          null,
          null,
          null,
          null,
          null,
          null,
          now,
          now
        )
        .run();

      profileRow = {
        id: newId,
        user_id: userId,
        full_name: defaultName,
        email: defaultEmail,
        phone: null,
        location: null,
        linkedin_url: null,
        portfolio_url: null,
        github_url: null,
        summary: null,
        created_at: now,
        updated_at: now,
      };
    }

    const profileId = profileRow.id;

    // Load experiences
    const expRes = await this.db
      .prepare("SELECT * FROM profile_experiences WHERE profile_id = ? ORDER BY start_date DESC")
      .bind(profileId)
      .all<ProfileExperienceRow>();
    const expRows = expRes.results || [];

    const experiences: ProfileExperience[] = [];
    for (const exp of expRows) {
      const factRes = await this.db
        .prepare("SELECT * FROM profile_experience_facts WHERE experience_id = ? ORDER BY created_at ASC")
        .bind(exp.id)
        .all<ProfileFactRow>();
      const factRows = factRes.results || [];

      experiences.push({
        id: exp.id,
        profileId: exp.profile_id,
        company: exp.company,
        title: exp.title,
        location: exp.location ?? undefined,
        startDate: exp.start_date,
        endDate: exp.end_date ?? undefined,
        isCurrent: Boolean(exp.is_current),
        description: exp.description ?? undefined,
        facts: factRows.map((f) => ({
          id: f.id,
          experienceId: f.experience_id,
          factText: f.fact_text,
          factType: (f.fact_type as any) || "achievement",
        })),
      });
    }

    // Load education
    const eduRes = await this.db
      .prepare("SELECT * FROM profile_education WHERE profile_id = ? ORDER BY start_date DESC")
      .bind(profileId)
      .all<ProfileEducationRow>();
    const eduRows = eduRes.results || [];

    const education: ProfileEducation[] = eduRows.map((e) => ({
      id: e.id,
      profileId: e.profile_id,
      institution: e.institution,
      degree: e.degree ?? undefined,
      fieldOfStudy: e.field_of_study ?? undefined,
      startDate: e.start_date ?? undefined,
      endDate: e.end_date ?? undefined,
    }));

    // Load skills
    const skillRes = await this.db
      .prepare("SELECT * FROM profile_skills WHERE profile_id = ? ORDER BY name ASC")
      .bind(profileId)
      .all<ProfileSkillRow>();
    const skillRows = skillRes.results || [];

    const skills: ProfileSkill[] = skillRows.map((s) => ({
      id: s.id,
      profileId: s.profile_id,
      name: s.name,
      category: s.category ?? undefined,
    }));

    return {
      profile: this.mapProfileRow(profileRow),
      experiences,
      education,
      skills,
    };
  }

  async updateIdentity(
    userId: string,
    data: UpdateProfileIdentityInput
  ): Promise<CareerProfile> {
    const full = await this.getOrCreateProfile(userId);
    const now = new Date().toISOString();

    const updated: CareerProfile = {
      ...full.profile,
      fullName: data.fullName ?? full.profile.fullName,
      email: data.email ?? full.profile.email,
      phone: data.phone ?? full.profile.phone,
      location: data.location ?? full.profile.location,
      linkedinUrl: data.linkedinUrl ?? full.profile.linkedinUrl,
      portfolioUrl: data.portfolioUrl ?? full.profile.portfolioUrl,
      githubUrl: data.githubUrl ?? full.profile.githubUrl,
      summary: data.summary ?? full.profile.summary,
      updatedAt: now,
    };

    await this.db
      .prepare(
        `UPDATE career_profiles SET
          full_name = ?, email = ?, phone = ?, location = ?,
          linkedin_url = ?, portfolio_url = ?, github_url = ?, summary = ?,
          updated_at = ?
        WHERE id = ? AND user_id = ?`
      )
      .bind(
        updated.fullName,
        updated.email,
        updated.phone ?? null,
        updated.location ?? null,
        updated.linkedinUrl ?? null,
        updated.portfolioUrl ?? null,
        updated.githubUrl ?? null,
        updated.summary ?? null,
        now,
        updated.id,
        userId
      )
      .run();

    return updated;
  }

  async addExperience(
    userId: string,
    data: CreateExperienceInput
  ): Promise<ProfileExperience> {
    const full = await this.getOrCreateProfile(userId);
    const expId = `exp_${generateId()}`;
    const now = new Date().toISOString();

    const insertExp = this.db
      .prepare(
        `INSERT INTO profile_experiences (
          id, profile_id, company, title, location,
          start_date, end_date, is_current, description,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        expId,
        full.profile.id,
        data.company,
        data.title,
        data.location ?? null,
        data.startDate,
        data.endDate ?? null,
        data.isCurrent ? 1 : 0,
        data.description ?? null,
        now,
        now
      );

    const stmts = [insertExp];
    const facts: ProfileExperienceFact[] = [];

    if (data.facts && data.facts.length > 0) {
      for (const factText of data.facts) {
        if (!factText.trim()) continue;
        const factId = `fact_${generateId()}`;
        stmts.push(
          this.db
            .prepare(
              "INSERT INTO profile_experience_facts (id, experience_id, fact_text, fact_type, created_at) VALUES (?, ?, ?, ?, ?)"
            )
            .bind(factId, expId, factText.trim(), "achievement", now)
        );
        facts.push({
          id: factId,
          experienceId: expId,
          factText: factText.trim(),
          factType: "achievement",
        });
      }
    }

    await this.db.batch(stmts);

    return {
      id: expId,
      profileId: full.profile.id,
      company: data.company,
      title: data.title,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: Boolean(data.isCurrent),
      description: data.description,
      facts,
    };
  }

  async deleteExperience(userId: string, experienceId: string): Promise<void> {
    const full = await this.getOrCreateProfile(userId);
    await this.db
      .prepare("DELETE FROM profile_experiences WHERE id = ? AND profile_id = ?")
      .bind(experienceId, full.profile.id)
      .run();
  }

  async addEducation(
    userId: string,
    data: CreateEducationInput
  ): Promise<ProfileEducation> {
    const full = await this.getOrCreateProfile(userId);
    const eduId = `edu_${generateId()}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO profile_education (
          id, profile_id, institution, degree, field_of_study,
          start_date, end_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        eduId,
        full.profile.id,
        data.institution,
        data.degree ?? null,
        data.fieldOfStudy ?? null,
        data.startDate ?? null,
        data.endDate ?? null,
        now
      )
      .run();

    return {
      id: eduId,
      profileId: full.profile.id,
      institution: data.institution,
      degree: data.degree,
      fieldOfStudy: data.fieldOfStudy,
      startDate: data.startDate,
      endDate: data.endDate,
    };
  }

  async deleteEducation(userId: string, educationId: string): Promise<void> {
    const full = await this.getOrCreateProfile(userId);
    await this.db
      .prepare("DELETE FROM profile_education WHERE id = ? AND profile_id = ?")
      .bind(educationId, full.profile.id)
      .run();
  }

  async setSkills(userId: string, skills: string[]): Promise<ProfileSkill[]> {
    const full = await this.getOrCreateProfile(userId);
    const profileId = full.profile.id;
    const now = new Date().toISOString();

    const deleteOld = this.db
      .prepare("DELETE FROM profile_skills WHERE profile_id = ?")
      .bind(profileId);

    const stmts = [deleteOld];
    const result: ProfileSkill[] = [];

    for (const name of skills) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const skillId = `skl_${generateId()}`;
      stmts.push(
        this.db
          .prepare(
            "INSERT INTO profile_skills (id, profile_id, name, category, created_at) VALUES (?, ?, ?, ?, ?)"
          )
          .bind(skillId, profileId, trimmed, null, now)
      );
      result.push({
        id: skillId,
        profileId,
        name: trimmed,
      });
    }

    await this.db.batch(stmts);
    return result;
  }

  private mapProfileRow(row: CareerProfileRow): CareerProfile {
    return {
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone ?? undefined,
      location: row.location ?? undefined,
      linkedinUrl: row.linkedin_url ?? undefined,
      portfolioUrl: row.portfolio_url ?? undefined,
      githubUrl: row.github_url ?? undefined,
      summary: row.summary ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
