export type ApplicationState =
  | "draft"
  | "applying"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

export type ApplicationAction =
  | { type: "START_APPLICATION" }
  | {
      type: "CONFIRM_SUBMISSION";
      submittedAt: string;
      snapshotId: string;
      resumeArtifactId?: string;
    }
  | { type: "MARK_INTERVIEWING" }
  | { type: "MARK_OFFERED" }
  | { type: "MARK_REJECTED" }
  | { type: "WITHDRAW" };

export interface Application {
  id: string;
  userId: string;
  opportunityId: string;
  state: ApplicationState;
  startedAt: string;
  submittedAt?: string;
  submittedJobSnapshotId?: string;
  submittedResumeArtifactId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  fromState: ApplicationState;
  toState: ApplicationState;
  action: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SubmittedAnswer {
  id: string;
  applicationId: string;
  questionKey: string;
  questionText: string;
  answerText: string;
  createdAt: string;
}
