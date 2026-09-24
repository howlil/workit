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
export type {
  CareerProfile,
  ProfileExperienceFact,
  ProfileExperience,
  ProfileEducation,
  ProfileSkill,
  FullCareerProfile,
} from "./profile/types.js";
export type {
  Application,
  ApplicationState,
  ApplicationAction,
  ApplicationEvent,
  SubmittedAnswer,
} from "./application/types.js";
export {
  transitionApplication,
  InvalidStateTransitionError,
} from "./application/lifecycle.js";
export type {
  AnswerMemoryItem,
  AnswerMatchResult,
  AnswerMatchStrategy,
} from "./answers/types.js";
export {
  normalizeQuestion,
  extractQuestionTokens,
} from "./answers/normalize-question.js";
export { findBestAnswerMatch } from "./answers/match-answer.js";


