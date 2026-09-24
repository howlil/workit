import type { D1ProfileRepository } from "@workit/db";
import {
  extractRequirements,
  matchRequirements,
  type JobMatchAnalysis,
} from "@workit/domain";

export class EvidenceService {
  constructor(private profileRepo: D1ProfileRepository) {}

  async matchJob(userId: string, jobDescription: string): Promise<JobMatchAnalysis> {
    const fullProfile = await this.profileRepo.getOrCreateProfile(userId);
    const requirements = extractRequirements(jobDescription);
    return matchRequirements(requirements, fullProfile);
  }
}
