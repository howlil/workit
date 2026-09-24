import type { JobCandidate } from "../candidate.js";
import type { OpportunityState } from "@workit/domain";

export type { OpportunityState };

export interface SaveOpportunityRequest {
  candidate: JobCandidate;
}

export interface SaveOpportunityResponse {
  opportunityId: string;
  state: OpportunityState;
  snapshotId: string;
  isDuplicate?: boolean;
}

export interface OpportunityCheckResponse {
  exists: boolean;
  opportunityId?: string;
  state?: OpportunityState;
}
