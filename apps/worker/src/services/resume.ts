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
    const updatedProfile = await this.profileRepo.batchImportProfile(userId, req.draft);
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
