import type { D1ResumeRepository, D1ProfileRepository } from "@workit/db";
import { parseResume } from "@workit/domain";
import type {
  ParseResumeRequest,
  ParseResumeResponse,
  ConfirmResumeDraftRequest,
  ConfirmResumeDraftResponse,
  ResumeArtifact,
} from "@workit/contracts";

export class ResumeService {
  constructor(
    private resumeRepo: D1ResumeRepository,
    private profileRepo: D1ProfileRepository
  ) {}

  async parseAndSave(
    userId: string,
    input: ParseResumeRequest
  ): Promise<ParseResumeResponse> {
    const draft = parseResume(input.rawText);
    const artifact = await this.resumeRepo.save(userId, {
      fileName: input.fileName,
      mimeType: input.mimeType || "text/plain",
      fileSize: input.rawText.length,
      rawText: input.rawText,
    });

    return {
      artifactId: artifact.id,
      draft,
    };
  }

  async confirmDraft(
    userId: string,
    req: ConfirmResumeDraftRequest
  ): Promise<ConfirmResumeDraftResponse> {
    const { draft } = req;

    // 1. Update Identity
    if (draft.identity && Object.keys(draft.identity).length > 0) {
      await this.profileRepo.updateIdentity(userId, draft.identity);
    }

    // 2. Add Experiences
    if (draft.experiences && draft.experiences.length > 0) {
      for (const exp of draft.experiences) {
        await this.profileRepo.addExperience(userId, exp);
      }
    }

    // 3. Add Education
    if (draft.education && draft.education.length > 0) {
      for (const edu of draft.education) {
        await this.profileRepo.addEducation(userId, edu);
      }
    }

    // 4. Update / Append Skills
    if (draft.skills && draft.skills.length > 0) {
      const current = await this.profileRepo.getOrCreateProfile(userId);
      const existingSkillNames = current.skills.map((s) => s.name);
      const mergedSkills = Array.from(new Set([...existingSkillNames, ...draft.skills]));
      await this.profileRepo.setSkills(userId, mergedSkills);
    }

    const updatedProfile = await this.profileRepo.getOrCreateProfile(userId);
    return {
      success: true,
      profile: updatedProfile,
    };
  }

  async list(userId: string): Promise<ResumeArtifact[]> {
    return this.resumeRepo.list(userId);
  }

  async getById(userId: string, id: string): Promise<ResumeArtifact | null> {
    return this.resumeRepo.getById(userId, id);
  }
}
