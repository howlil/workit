import type {
  FullCareerProfile,
  CareerProfile,
  ProfileExperience,
  ProfileEducation,
  ProfileSkill,
  UpdateProfileIdentityRequest,
  CreateExperienceRequest,
  CreateEducationRequest,
} from "@workit/contracts";
import type { D1ProfileRepository } from "@workit/db";

export class ProfileService {
  constructor(private repo: D1ProfileRepository) {}

  async getProfile(userId: string): Promise<FullCareerProfile> {
    return this.repo.getOrCreateProfile(userId);
  }

  async updateIdentity(
    userId: string,
    data: UpdateProfileIdentityRequest
  ): Promise<CareerProfile> {
    return this.repo.updateIdentity(userId, data);
  }

  async addExperience(
    userId: string,
    data: CreateExperienceRequest
  ): Promise<ProfileExperience> {
    return this.repo.addExperience(userId, data);
  }

  async deleteExperience(userId: string, experienceId: string): Promise<void> {
    return this.repo.deleteExperience(userId, experienceId);
  }

  async addEducation(
    userId: string,
    data: CreateEducationRequest
  ): Promise<ProfileEducation> {
    return this.repo.addEducation(userId, data);
  }

  async deleteEducation(userId: string, educationId: string): Promise<void> {
    return this.repo.deleteEducation(userId, educationId);
  }

  async setSkills(userId: string, skills: string[]): Promise<ProfileSkill[]> {
    return this.repo.setSkills(userId, skills);
  }
}
