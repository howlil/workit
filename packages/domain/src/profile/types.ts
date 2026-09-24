export interface CareerProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileExperienceFact {
  id: string;
  experienceId: string;
  factText: string;
  factType?: "achievement" | "responsibility" | "metric" | "technology";
}

export interface ProfileExperience {
  id: string;
  profileId: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  facts: ProfileExperienceFact[];
}

export interface ProfileEducation {
  id: string;
  profileId: string;
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProfileSkill {
  id: string;
  profileId: string;
  name: string;
  category?: string;
}

export interface FullCareerProfile {
  profile: CareerProfile;
  experiences: ProfileExperience[];
  education: ProfileEducation[];
  skills: ProfileSkill[];
}
