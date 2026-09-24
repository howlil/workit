import type {
  ResumeArtifact,
  ResumeDraftProfile,
  ResumeIdentityDraft,
  ResumeExperienceDraft,
  ResumeEducationDraft,
  FullCareerProfile,
} from "@workit/domain";

export type {
  ResumeArtifact,
  ResumeDraftProfile,
  ResumeIdentityDraft,
  ResumeExperienceDraft,
  ResumeEducationDraft,
};

export interface ParseResumeRequest {
  fileName: string;
  mimeType?: string;
  rawText: string;
}

export interface ParseResumeResponse {
  artifactId: string;
  draft: ResumeDraftProfile;
}

export interface ConfirmResumeDraftRequest {
  artifactId?: string;
  draft: ResumeDraftProfile;
}

export interface ConfirmResumeDraftResponse {
  success: boolean;
  profile: FullCareerProfile;
}

export interface ListResumesResponse {
  resumes: ResumeArtifact[];
}
