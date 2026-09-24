export interface ResumeIdentityDraft {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  summary?: string;
}

export interface ResumeExperienceDraft {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  facts?: string[];
}

export interface ResumeEducationDraft {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResumeDraftProfile {
  identity: ResumeIdentityDraft;
  experiences: ResumeExperienceDraft[];
  education: ResumeEducationDraft[];
  skills: string[];
}

export interface ResumeArtifact {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  rawText: string;
  createdAt: string;
}
