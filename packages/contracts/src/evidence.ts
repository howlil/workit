import type {
  JobRequirement,
  RequirementMatch,
  RequirementMatchStatus,
  JobMatchAnalysis,
} from "@workit/domain";

export type {
  JobRequirement,
  RequirementMatch,
  RequirementMatchStatus,
  JobMatchAnalysis,
};

export interface JobMatchRequest {
  jobDescription: string;
}

export interface JobMatchResponse {
  analysis: JobMatchAnalysis;
}
