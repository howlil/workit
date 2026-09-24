export type { Opportunity, JobSnapshot, OpportunityState } from "./opportunity/types.js";
export { computeContentHash } from "./opportunity/snapshot.js";
export {
  findDuplicate,
  normalizeUrl,
  type DuplicateMatchResult,
  type DuplicateMatchStrategy,
  type CandidateIdentity,
  type ExistingOpportunitySummary,
} from "./opportunity/duplicate.js";
