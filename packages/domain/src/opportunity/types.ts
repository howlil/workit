export type OpportunityState =
  | "saved"
  | "applying"
  | "applied"
  | "interview"
  | "offer"
  | "closed";

export interface Opportunity {
  id: string;
  userId: string;

  sourceProvider?: string;
  sourceJobId?: string;
  canonicalUrl: string;

  company: string;
  title: string;
  location?: string;
  workArrangement?: string;
  employmentType?: string;

  state: OpportunityState;
  currentSnapshotId: string;

  createdAt: string;
  updatedAt: string;
}

export interface JobSnapshot {
  id: string;
  opportunityId: string;

  company: string;
  title: string;
  location?: string;
  employmentType?: string;
  workArrangement?: string;

  descriptionText: string;
  descriptionHtml?: string;

  sourceUrl: string;
  capturedAt: string;
  contentHash: string;
}
