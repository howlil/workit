export type RequirementMatchStatus = "matched" | "partial" | "missing";

export interface JobRequirement {
  id: string;
  text: string;
  type: "skill" | "experience" | "education" | "generic";
  keywords: string[];
}

export interface RequirementMatch {
  requirement: string;
  status: RequirementMatchStatus;
  score: number;
  evidenceFactIds: string[];
  evidenceSummary: string;
}

export interface JobMatchAnalysis {
  overallScore: number;
  matchedCount: number;
  partialCount: number;
  missingCount: number;
  totalRequirements: number;
  matches: RequirementMatch[];
}
