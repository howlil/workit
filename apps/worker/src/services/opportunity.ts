import type {
  JobCandidate,
  SaveOpportunityResponse,
  OpportunityCheckResponse,
  OpportunityState,
} from "@workit/contracts";
import {
  type Opportunity,
  type JobSnapshot,
  findDuplicate,
  computeContentHash,
  normalizeUrl,
} from "@workit/domain";
import type { D1OpportunityRepository } from "@workit/db";
import { generateId } from "@workit/shared";

export class OpportunityService {
  constructor(private repo: D1OpportunityRepository) {}

  /**
   * Captures and persists an opportunity with an initial immutable snapshot.
   * Performs duplicate detection before writing.
   */
  async save(userId: string, candidate: JobCandidate): Promise<SaveOpportunityResponse> {
    const existingSummaries = await this.repo.listSummaries(userId);

    // Run duplicate check
    const duplicateCheck = findDuplicate(
      {
        provider: candidate.source.provider,
        sourceJobId: candidate.source.sourceJobId,
        canonicalUrl: candidate.source.canonicalUrl,
        company: candidate.company,
        title: candidate.title,
        location: candidate.location,
      },
      existingSummaries
    );

    if (duplicateCheck.isDuplicate && duplicateCheck.existingOpportunityId) {
      const existing = await this.repo.findById(userId, duplicateCheck.existingOpportunityId);
      return {
        opportunityId: duplicateCheck.existingOpportunityId,
        state: existing ? existing.opportunity.state : "saved",
        snapshotId: existing ? existing.opportunity.currentSnapshotId : "",
        isDuplicate: true,
      };
    }

    const now = new Date().toISOString();
    const opportunityId = `opp_${generateId()}`;
    const snapshotId = `snap_${generateId()}`;
    const contentHash = await computeContentHash(candidate.descriptionText || "");

    const opportunity: Opportunity = {
      id: opportunityId,
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
      currentSnapshotId: snapshotId,
      createdAt: now,
      updatedAt: now,
    };

    const initialSnapshot: JobSnapshot = {
      id: snapshotId,
      opportunityId,
      company: opportunity.company,
      title: opportunity.title,
      location: opportunity.location,
      employmentType: opportunity.employmentType,
      workArrangement: opportunity.workArrangement,
      descriptionText: candidate.descriptionText,
      descriptionHtml: candidate.descriptionHtml,
      sourceUrl: candidate.source.canonicalUrl,
      capturedAt: now,
      contentHash,
    };

    await this.repo.create(opportunity, initialSnapshot);

    return {
      opportunityId,
      state: "saved",
      snapshotId,
      isDuplicate: false,
    };
  }

  /**
   * Checks whether a job with the specified URL or identifiers is already saved.
   */
  async checkExistence(
    userId: string,
    query: { url?: string; provider?: string; sourceJobId?: string }
  ): Promise<OpportunityCheckResponse> {
    if (!query.url && (!query.provider || !query.sourceJobId)) {
      return { exists: false };
    }

    const summaries = await this.repo.listSummaries(userId);

    if (query.provider && query.sourceJobId) {
      const match = summaries.find(
        (s) => s.sourceProvider === query.provider && s.sourceJobId === query.sourceJobId
      );
      if (match) {
        return { exists: true, opportunityId: match.id };
      }
    }

    if (query.url) {
      const normalizedTarget = normalizeUrl(query.url);
      const match = summaries.find((s) => normalizeUrl(s.canonicalUrl) === normalizedTarget);
      if (match) {
        return { exists: true, opportunityId: match.id };
      }
    }

    return { exists: false };
  }

  async getDetail(userId: string, id: string) {
    return this.repo.findById(userId, id);
  }

  async list(userId: string, options: { state?: OpportunityState; limit?: number } = {}) {
    return this.repo.list(userId, options);
  }
}
