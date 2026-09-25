import type {
  JobCandidate,
  SaveOpportunityResponse,
  OpportunityCheckResponse,
  OpportunityState,
  FullCareerProfile,
  CareerProfile,
  ProfileExperience,
  ProfileEducation,
  ProfileSkill,
  UpdateProfileIdentityRequest,
  CreateExperienceRequest,
  CreateEducationRequest,
  StartApplicationResponse,
  ConfirmSubmissionRequest,
  ConfirmSubmissionResponse,
  ApplicationDetailResponse,
  SaveAnswerMemoryRequest,
  ListAnswerMemoriesResponse,
  FindAnswerMatchRequest,
  FindAnswerMatchResponse,
  JobMatchResponse,
  ParseResumeResponse,
  ConfirmResumeDraftResponse,
  ResumeDraftProfile,
  ResumeArtifact,
  SearchResultItem,
  GlobalSearchResponse,
} from "@workit/contracts";

import {
  type Opportunity,
  type JobSnapshot,
  type AnswerMemoryItem,
  type JobMatchAnalysis,
  normalizeUrl,
  normalizeQuestion,
  findBestAnswerMatch,
  extractRequirements,
  matchRequirements,
  parseResume,
} from "@workit/domain";


const DEFAULT_API_BASE = "http://localhost:8787";

export interface StoredOpportunityItem {
  opportunity: Opportunity;
  currentSnapshot: JobSnapshot;
}

export class WorkitApiClient {
  constructor(private baseUrl: string = DEFAULT_API_BASE) {}

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, "");
  }

  async saveOpportunity(
    candidate: JobCandidate,
    userId = "usr_default"
  ): Promise<SaveOpportunityResponse> {
    const now = new Date().toISOString();
    const fallbackId = `opp_${Date.now()}`;
    const fallbackSnapId = `snap_${Date.now()}`;

    const localOpp: Opportunity = {
      id: fallbackId,
      userId,
      sourceProvider: candidate.source.provider,
      sourceJobId: candidate.source.sourceJobId,
      canonicalUrl: candidate.source.canonicalUrl,
      company: candidate.company || "Unknown Company",
      title: candidate.title || "Untitled Job",
      location: candidate.location,
      workArrangement: candidate.workArrangement,
      employmentType: candidate.employmentType,
      state: "saved",
      currentSnapshotId: fallbackSnapId,
      createdAt: now,
      updatedAt: now,
    };

    const localSnap: JobSnapshot = {
      id: fallbackSnapId,
      opportunityId: fallbackId,
      company: localOpp.company,
      title: localOpp.title,
      location: localOpp.location,
      employmentType: localOpp.employmentType,
      workArrangement: localOpp.workArrangement,
      descriptionText: candidate.descriptionText,
      descriptionHtml: candidate.descriptionHtml,
      sourceUrl: candidate.source.canonicalUrl,
      capturedAt: now,
      contentHash: "hash",
    };

    try {
      const res = await fetch(`${this.baseUrl}/api/opportunities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ candidate }),
      });

      if (res.ok) {
        const data = (await res.json()) as SaveOpportunityResponse;
        localOpp.id = data.opportunityId;
        localOpp.state = data.state;
        localOpp.currentSnapshotId = data.snapshotId;
        localSnap.id = data.snapshotId;
        localSnap.opportunityId = data.opportunityId;

        await this.persistLocalItem(localOpp, localSnap);
        await this.recordSavedUrl(candidate.source.canonicalUrl, data.opportunityId);
        return data;
      }
    } catch {
      // Backend offline; fall through to local persistence
    }

    await this.persistLocalItem(localOpp, localSnap);
    await this.recordSavedUrl(candidate.source.canonicalUrl, fallbackId);

    return {
      opportunityId: fallbackId,
      state: "saved",
      snapshotId: fallbackSnapId,
      isDuplicate: false,
    };
  }

  async checkOpportunity(
    url: string,
    userId = "usr_default"
  ): Promise<OpportunityCheckResponse> {
    try {
      const endpoint = `${this.baseUrl}/api/opportunities/check?url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint, {
        headers: { "x-user-id": userId },
      });

      if (res.ok) {
        const data = (await res.json()) as OpportunityCheckResponse;
        if (data.exists) {
          return data;
        }
      }
    } catch {
      // Fall through to local cache
    }

    return this.checkSavedUrl(url);
  }

  async listOpportunities(
    options: { state?: OpportunityState; limit?: number } = {},
    userId = "usr_default"
  ): Promise<Opportunity[]> {
    try {
      let endpoint = `${this.baseUrl}/api/opportunities`;
      const params = new URLSearchParams();
      if (options.state) params.append("state", options.state);
      if (options.limit) params.append("limit", String(options.limit));
      if (params.toString()) endpoint += `?${params.toString()}`;

      const res = await fetch(endpoint, {
        headers: { "x-user-id": userId },
      });

      if (res.ok) {
        const data = (await res.json()) as { items: Opportunity[] };
        return data.items || [];
      }
    } catch {
      // Fall through to local list
    }

    return this.listLocalOpportunities(options.state);
  }

  async getOpportunityDetail(
    id: string,
    userId = "usr_default"
  ): Promise<StoredOpportunityItem | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/opportunities/${id}`, {
        headers: { "x-user-id": userId },
      });

      if (res.ok) {
        return (await res.json()) as StoredOpportunityItem;
      }
    } catch {
      // Fall through to local detail
    }

    return this.getLocalOpportunityDetail(id);
  }

  private async recordSavedUrl(url: string, id: string): Promise<void> {
    const key = `workit_saved_${normalizeUrl(url)}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: id });
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, id);
    }
  }

  private async checkSavedUrl(url: string): Promise<OpportunityCheckResponse> {
    const key = `workit_saved_${normalizeUrl(url)}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const items = await chrome.storage.local.get(key);
      if (items && items[key]) {
        return { exists: true, opportunityId: items[key], state: "saved" };
      }
    } else if (typeof localStorage !== "undefined") {
      const val = localStorage.getItem(key);
      if (val) {
        return { exists: true, opportunityId: val, state: "saved" };
      }
    }
    return { exists: false };
  }

  private async persistLocalItem(opportunity: Opportunity, snapshot: JobSnapshot): Promise<void> {
    const key = `workit_item_${opportunity.id}`;
    const record: StoredOpportunityItem = { opportunity, currentSnapshot: snapshot };

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: record });
      const indexItems = await chrome.storage.local.get("workit_index");
      const ids: string[] = indexItems["workit_index"] || [];
      if (!ids.includes(opportunity.id)) {
        ids.unshift(opportunity.id);
        await chrome.storage.local.set({ workit_index: ids });
      }
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(record));
      const raw = localStorage.getItem("workit_index");
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(opportunity.id)) {
        ids.unshift(opportunity.id);
        localStorage.setItem("workit_index", JSON.stringify(ids));
      }
    }
  }

  private async listLocalOpportunities(stateFilter?: OpportunityState): Promise<Opportunity[]> {
    const ids: string[] = [];

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const indexItems = await chrome.storage.local.get("workit_index");
      ids.push(...(indexItems["workit_index"] || []));
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem("workit_index");
      if (raw) ids.push(...JSON.parse(raw));
    }

    const items: Opportunity[] = [];
    for (const id of ids) {
      const detail = await this.getLocalOpportunityDetail(id);
      if (detail) {
        if (!stateFilter || detail.opportunity.state === stateFilter) {
          items.push(detail.opportunity);
        }
      }
    }
    return items;
  }

  private async getLocalOpportunityDetail(id: string): Promise<StoredOpportunityItem | null> {
    const key = `workit_item_${id}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(key);
      return data[key] || null;
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  }

  // --- Profile Methods (S5) ---

  async getProfile(userId = "usr_default"): Promise<FullCareerProfile> {
    try {
      const res = await fetch(`${this.baseUrl}/api/profile`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = (await res.json()) as FullCareerProfile;
        await this.saveLocalProfile(data, userId);
        return data;
      }
    } catch {
      // Backend offline; fall through to local cache
    }
    return this.getLocalProfile(userId);
  }

  async updateProfileIdentity(
    req: UpdateProfileIdentityRequest,
    userId = "usr_default"
  ): Promise<CareerProfile> {
    try {
      const res = await fetch(`${this.baseUrl}/api/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const updated = (await res.json()) as CareerProfile;
        const local = await this.getLocalProfile(userId);
        local.profile = updated;
        await this.saveLocalProfile(local, userId);
        return updated;
      }
    } catch {
      // Backend offline; fall through to local cache
    }

    const local = await this.getLocalProfile(userId);
    local.profile = {
      ...local.profile,
      ...req,
      updatedAt: new Date().toISOString(),
    };
    await this.saveLocalProfile(local, userId);
    return local.profile;
  }

  async addExperience(
    req: CreateExperienceRequest,
    userId = "usr_default"
  ): Promise<ProfileExperience> {
    try {
      const res = await fetch(`${this.baseUrl}/api/profile/experiences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const exp = (await res.json()) as ProfileExperience;
        const local = await this.getLocalProfile(userId);
        local.experiences.unshift(exp);
        await this.saveLocalProfile(local, userId);
        return exp;
      }
    } catch {
      // Backend offline; fall through to local cache
    }

    const local = await this.getLocalProfile(userId);
    const expId = `exp_${Date.now()}`;
    const exp: ProfileExperience = {
      id: expId,
      profileId: local.profile.id,
      company: req.company,
      title: req.title,
      location: req.location,
      startDate: req.startDate,
      endDate: req.endDate,
      isCurrent: Boolean(req.isCurrent),
      description: req.description,
      facts: (req.facts || []).map((factText, idx) => ({
        id: `fact_${Date.now()}_${idx}`,
        experienceId: expId,
        factText: factText.trim(),
        factType: "achievement",
      })),
    };
    local.experiences.unshift(exp);
    await this.saveLocalProfile(local, userId);
    return exp;
  }

  async deleteExperience(id: string, userId = "usr_default"): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/profile/experiences/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });
    } catch {
      // Backend offline
    }

    const local = await this.getLocalProfile(userId);
    local.experiences = local.experiences.filter((e) => e.id !== id);
    await this.saveLocalProfile(local, userId);
  }

  async addEducation(
    req: CreateEducationRequest,
    userId = "usr_default"
  ): Promise<ProfileEducation> {
    try {
      const res = await fetch(`${this.baseUrl}/api/profile/education`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const edu = (await res.json()) as ProfileEducation;
        const local = await this.getLocalProfile(userId);
        local.education.unshift(edu);
        await this.saveLocalProfile(local, userId);
        return edu;
      }
    } catch {
      // Backend offline
    }

    const local = await this.getLocalProfile(userId);
    const edu: ProfileEducation = {
      id: `edu_${Date.now()}`,
      profileId: local.profile.id,
      institution: req.institution,
      degree: req.degree,
      fieldOfStudy: req.fieldOfStudy,
      startDate: req.startDate,
      endDate: req.endDate,
    };
    local.education.unshift(edu);
    await this.saveLocalProfile(local, userId);
    return edu;
  }

  async deleteEducation(id: string, userId = "usr_default"): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/profile/education/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });
    } catch {
      // Backend offline
    }

    const local = await this.getLocalProfile(userId);
    local.education = local.education.filter((e) => e.id !== id);
    await this.saveLocalProfile(local, userId);
  }

  async setSkills(skills: string[], userId = "usr_default"): Promise<ProfileSkill[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/profile/skills`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ skills }),
      });
      if (res.ok) {
        const data = (await res.json()) as { skills: ProfileSkill[] };
        const local = await this.getLocalProfile(userId);
        local.skills = data.skills;
        await this.saveLocalProfile(local, userId);
        return data.skills;
      }
    } catch {
      // Backend offline
    }

    const local = await this.getLocalProfile(userId);
    const skillList: ProfileSkill[] = skills
      .filter((s) => s.trim().length > 0)
      .map((name, idx) => ({
        id: `skl_${Date.now()}_${idx}`,
        profileId: local.profile.id,
        name: name.trim(),
      }));
    local.skills = skillList;
    await this.saveLocalProfile(local, userId);
    return skillList;
  }

  private async getLocalProfile(userId = "usr_default"): Promise<FullCareerProfile> {
    const key = `workit_profile_${userId}`;
    let data: FullCareerProfile | null = null;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const items = await chrome.storage.local.get(key);
      data = items[key] || null;
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      data = raw ? JSON.parse(raw) : null;
    }

    if (data && data.profile) {
      return data;
    }

    const now = new Date().toISOString();
    const defaultProfile: FullCareerProfile = {
      profile: {
        id: `prof_${userId}`,
        userId,
        fullName: "Alex Developer",
        email: "alex@example.com",
        phone: "+1 555-0199",
        location: "San Francisco, CA",
        linkedinUrl: "https://linkedin.com/in/alexdev",
        portfolioUrl: "https://alexdev.me",
        githubUrl: "https://github.com/alexdev",
        summary: "Full-stack engineer specializing in TypeScript, React, and cloud architectures.",
        createdAt: now,
        updatedAt: now,
      },
      experiences: [],
      education: [],
      skills: [],
    };
    await this.saveLocalProfile(defaultProfile, userId);
    return defaultProfile;
  }

  private async saveLocalProfile(profile: FullCareerProfile, userId = "usr_default"): Promise<void> {
    const key = `workit_profile_${userId}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: profile });
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(profile));
    }
  }

  // --- Application Lifecycle Methods (S7) ---

  async startApplication(
    opportunityId: string,
    userId = "usr_default"
  ): Promise<StartApplicationResponse> {
    const now = new Date().toISOString();
    const fallbackAppId = `app_${Date.now()}`;

    try {
      const res = await fetch(`${this.baseUrl}/api/applications/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ opportunityId }),
      });
      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as any;
        throw new Error(errorData.error || `Failed to start application (${res.status})`);
      }
      const data = (await res.json()) as StartApplicationResponse;
      await this.updateLocalOpportunityState(opportunityId, "applying");
      return data;
    } catch (err: any) {
      // If server returned an explicit error response, propagate it
      if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
        throw err;
      }
      // Backend offline; fall through to local fallback
    }

    await this.updateLocalOpportunityState(opportunityId, "applying");

    return {
      application: {
        id: fallbackAppId,
        userId,
        opportunityId,
        state: "applying",
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      event: {
        id: `evt_${Date.now()}`,
        applicationId: fallbackAppId,
        fromState: "draft",
        toState: "applying",
        action: "START_APPLICATION",
        timestamp: now,
      },
    };
  }

  async confirmSubmission(
    applicationId: string,
    req: ConfirmSubmissionRequest,
    opportunityId?: string,
    userId = "usr_default"
  ): Promise<ConfirmSubmissionResponse> {
    const now = new Date().toISOString();

    try {
      const res = await fetch(`${this.baseUrl}/api/applications/${applicationId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as any;
        throw new Error(errorData.error || `Failed to confirm submission (${res.status})`);
      }
      const data = (await res.json()) as ConfirmSubmissionResponse;
      if (opportunityId) {
        await this.updateLocalOpportunityState(opportunityId, "applied");
      }
      return data;
    } catch (err: any) {
      // If server returned an explicit error response, propagate it
      if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
        throw err;
      }
      // Backend offline; fall through to local fallback
    }

    if (opportunityId) {
      await this.updateLocalOpportunityState(opportunityId, "applied");
    }

    return {
      application: {
        id: applicationId,
        userId,
        opportunityId: opportunityId || "",
        state: "applied",
        startedAt: now,
        submittedAt: req.submittedAt || now,
        submittedJobSnapshotId: req.snapshotId,
        submittedResumeArtifactId: req.resumeArtifactId,
        createdAt: now,
        updatedAt: now,
      },
      event: {
        id: `evt_${Date.now()}`,
        applicationId,
        fromState: "applying",
        toState: "applied",
        action: "CONFIRM_SUBMISSION",
        timestamp: now,
        metadata: { snapshotId: req.snapshotId },
      },
      answers: [],
    };
  }

  async getApplication(
    opportunityId: string,
    userId = "usr_default"
  ): Promise<ApplicationDetailResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/applications/by-opportunity/${opportunityId}`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        return (await res.json()) as ApplicationDetailResponse;
      }
    } catch {
      // Fall through
    }
    return null;
  }

  async updateLocalOpportunityState(opportunityId: string, newState: OpportunityState): Promise<void> {
    const item = await this.getLocalOpportunityDetail(opportunityId);
    if (item) {
      item.opportunity.state = newState;
      item.opportunity.updatedAt = new Date().toISOString();
      await this.persistLocalItem(item.opportunity, item.currentSnapshot);
    }
  }

  // --- Answer Memory ---

  private async getLocalAnswers(userId: string): Promise<AnswerMemoryItem[]> {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const key = `workit_answers_${userId}`;
        const res = await chrome.storage.local.get([key]);
        return (res[key] as AnswerMemoryItem[]) || [];
      } else if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(`workit_answers_${userId}`);
        return raw ? JSON.parse(raw) : [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  private async setLocalAnswers(userId: string, items: AnswerMemoryItem[]): Promise<void> {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [`workit_answers_${userId}`]: items });
      } else if (typeof localStorage !== "undefined") {
        localStorage.setItem(`workit_answers_${userId}`, JSON.stringify(items));
      }
    } catch {
      // Fallback
    }
  }

  async saveAnswer(
    req: SaveAnswerMemoryRequest,
    userId = "usr_default"
  ): Promise<AnswerMemoryItem> {
    const questionKey = normalizeQuestion(req.questionText);
    const now = new Date().toISOString();

    try {
      const res = await fetch(`${this.baseUrl}/api/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(req),
      });

      if (res.ok) {
        const item = (await res.json()) as AnswerMemoryItem;
        const current = await this.getLocalAnswers(userId);
        const filtered = current.filter((a) => a.id !== item.id && a.questionKey !== item.questionKey);
        await this.setLocalAnswers(userId, [item, ...filtered]);
        return item;
      }
    } catch {
      // Server not reachable, fall back to local storage
    }

    const current = await this.getLocalAnswers(userId);
    const existingIndex = current.findIndex((a) => a.questionKey === questionKey);
    let item: AnswerMemoryItem;

    if (existingIndex >= 0 && current[existingIndex]) {
      const existing = current[existingIndex]!;
      item = {
        ...existing,
        questionText: req.questionText,
        answerText: req.answerText,
        category: req.category ?? existing.category,
        usageCount: existing.usageCount + 1,
        lastUsedAt: now,
        updatedAt: now,
      };
      current[existingIndex] = item;
    } else {
      item = {
        id: `ans_${Date.now()}`,
        userId,
        questionKey,
        questionText: req.questionText,
        answerText: req.answerText,
        category: req.category,
        usageCount: 1,
        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      current.unshift(item);
    }

    await this.setLocalAnswers(userId, current);
    return item;
  }

  async listAnswers(userId = "usr_default"): Promise<ListAnswerMemoriesResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/answers`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = (await res.json()) as ListAnswerMemoriesResponse;
        await this.setLocalAnswers(userId, data.answers);
        return data;
      }
    } catch {
      // Server not reachable
    }

    const answers = await this.getLocalAnswers(userId);
    return { answers };
  }

  async findAnswerMatch(
    req: FindAnswerMatchRequest,
    userId = "usr_default"
  ): Promise<FindAnswerMatchResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/answers/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        return (await res.json()) as FindAnswerMatchResponse;
      }
    } catch {
      // Fallback to local matching
    }

    const answers = await this.getLocalAnswers(userId);
    const match = findBestAnswerMatch(req.questionText, answers, req.threshold);
    return { match };
  }

  async deleteAnswer(id: string, userId = "usr_default"): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/answers/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });
    } catch {
      // Fallback
    }

    const current = await this.getLocalAnswers(userId);
    const filtered = current.filter((a) => a.id !== id);
    await this.setLocalAnswers(userId, filtered);
  }

  // --- Evidence Match ---

  async matchJobEvidence(
    jobDescription: string,
    userId = "usr_default"
  ): Promise<JobMatchAnalysis> {
    try {
      const res = await fetch(`${this.baseUrl}/api/evidence/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ jobDescription }),
      });
      if (res.ok) {
        const data = (await res.json()) as JobMatchResponse;
        return data.analysis;
      }
    } catch {
      // Fallback to local profile matching
    }

    const profile = await this.getProfile(userId);
    const requirements = extractRequirements(jobDescription);
    return matchRequirements(requirements, profile);
  }

  // --- Resume Import (S10) ---

  async parseResumeText(
    fileName: string,
    rawText: string,
    mimeType = "text/plain",
    userId = "usr_default"
  ): Promise<ParseResumeResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/resume/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ fileName, mimeType, rawText }),
      });
      if (res.ok) {
        return (await res.json()) as ParseResumeResponse;
      }
    } catch {
      // Fallback to local parsing
    }

    const draft = parseResume(rawText);
    const artifactId = `res_${Date.now()}`;
    const artifact: ResumeArtifact = {
      id: artifactId,
      userId,
      fileName,
      mimeType,
      fileSize: rawText.length,
      rawText,
      createdAt: new Date().toISOString(),
    };

    const existingResumes = await this.listLocalResumes(userId);
    await this.saveLocalResumes([artifact, ...existingResumes], userId);

    return {
      artifactId,
      draft,
    };
  }

  async confirmResumeDraft(
    draft: ResumeDraftProfile,
    artifactId?: string,
    userId = "usr_default"
  ): Promise<ConfirmResumeDraftResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/resume/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ draft, artifactId }),
      });
      if (res.ok) {
        const data = (await res.json()) as ConfirmResumeDraftResponse;
        await this.saveLocalProfile(data.profile, userId);
        return data;
      }
    } catch {
      // Fallback to local updates
    }

    // 1. Update identity
    if (draft.identity && Object.keys(draft.identity).length > 0) {
      await this.updateProfileIdentity(draft.identity, userId);
    }

    // 2. Add experiences
    for (const exp of draft.experiences) {
      await this.addExperience(exp, userId);
    }

    // 3. Add education
    for (const edu of draft.education) {
      await this.addEducation(edu, userId);
    }

    // 4. Update skills
    if (draft.skills && draft.skills.length > 0) {
      const curr = await this.getProfile(userId);
      const existingNames = curr.skills.map((s) => s.name);
      const merged = Array.from(new Set([...existingNames, ...draft.skills]));
      await this.setSkills(merged, userId);
    }

    const updatedProfile = await this.getProfile(userId);
    return {
      success: true,
      profile: updatedProfile,
    };
  }

  async listResumes(userId = "usr_default"): Promise<ResumeArtifact[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/resume`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = (await res.json()) as { resumes: ResumeArtifact[] };
        await this.saveLocalResumes(data.resumes, userId);
        return data.resumes;
      }
    } catch {
      // Fallback
    }

    return this.listLocalResumes(userId);
  }

  private async listLocalResumes(userId = "usr_default"): Promise<ResumeArtifact[]> {
    const key = `workit_resumes_${userId}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const res = await chrome.storage.local.get(key);
      return (res[key] as ResumeArtifact[]) || [];
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    }
    return [];
  }

  private async saveLocalResumes(resumes: ResumeArtifact[], userId = "usr_default"): Promise<void> {
    const key = `workit_resumes_${userId}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: resumes });
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(resumes));
    }
  }

  // --- Global Search (S12) ---

  async searchGlobal(query: string, userId = "usr_default"): Promise<SearchResultItem[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    try {
      const res = await fetch(`${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = (await res.json()) as GlobalSearchResponse;
        return data.results;
      }
    } catch {
      // Fallback to local search
    }

    const results: SearchResultItem[] = [];

    // 1. Search local opportunities
    const opps = await this.listLocalOpportunities();
    for (const opp of opps) {
      if (
        opp.title.toLowerCase().includes(q) ||
        opp.company.toLowerCase().includes(q) ||
        opp.location?.toLowerCase().includes(q) ||
        opp.state.toLowerCase().includes(q)
      ) {
        results.push({
          id: opp.id,
          type: "opportunity",
          title: opp.title,
          subtitle: `${opp.company}${opp.location ? ` • ${opp.location}` : ""} (${opp.state})`,
          metadata: { state: opp.state, company: opp.company },
        });
      }
    }

    // 2. Search local answers
    const answers = await this.getLocalAnswers(userId);
    for (const ans of answers) {
      if (
        ans.questionText.toLowerCase().includes(q) ||
        ans.answerText.toLowerCase().includes(q) ||
        ans.category?.toLowerCase().includes(q)
      ) {
        results.push({
          id: ans.id,
          type: "answer",
          title: ans.questionText,
          subtitle: ans.category ? `Category: ${ans.category}` : "Answer Memory",
          snippet: ans.answerText.length > 80 ? `${ans.answerText.slice(0, 80)}...` : ans.answerText,
        });
      }
    }

    // 3. Search local profile
    const profile = await this.getLocalProfile(userId);
    if (
      profile.profile.fullName.toLowerCase().includes(q) ||
      profile.profile.summary?.toLowerCase().includes(q)
    ) {
      results.push({
        id: profile.profile.id,
        type: "profile",
        title: profile.profile.fullName,
        subtitle: "Profile Identity & Summary",
        snippet: profile.profile.summary,
      });
    }

    for (const exp of profile.experiences) {
      const matchExp =
        exp.company.toLowerCase().includes(q) ||
        exp.title.toLowerCase().includes(q) ||
        exp.facts.some((f) => f.factText.toLowerCase().includes(q));

      if (matchExp) {
        const matchingFact = exp.facts.find((f) => f.factText.toLowerCase().includes(q));
        results.push({
          id: exp.id,
          type: "profile",
          title: `${exp.title} at ${exp.company}`,
          subtitle: `Experience (${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate || ""})`,
          snippet: matchingFact ? matchingFact.factText : exp.description,
        });
      }
    }

    const matchingSkills = profile.skills.filter((s) => s.name.toLowerCase().includes(q));
    if (matchingSkills.length > 0) {
      results.push({
        id: "profile_skills",
        type: "profile",
        title: `Skills: ${matchingSkills.map((s) => s.name).join(", ")}`,
        subtitle: `${matchingSkills.length} matching skill${matchingSkills.length > 1 ? "s" : ""}`,
      });
    }

    return results;
  }
}



export const workitApiClient = new WorkitApiClient();
