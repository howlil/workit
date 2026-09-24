export type {
  CareerProfile,
  ProfileExperienceFact,
  ProfileExperience,
  ProfileEducation,
  ProfileSkill,
  FullCareerProfile,
} from "@workit/domain";

export interface UpdateProfileIdentityRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  summary?: string;
}

export interface CreateExperienceRequest {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  facts?: string[];
}

export interface CreateEducationRequest {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSkillsRequest {
  skills: string[];
}
