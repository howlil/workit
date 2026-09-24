import type {
  Application,
  ApplicationEvent,
  SubmittedAnswer,
} from "@workit/domain";

export interface StartApplicationRequest {
  opportunityId: string;
}

export interface StartApplicationResponse {
  application: Application;
  event: ApplicationEvent;
}

export interface ConfirmSubmissionRequest {
  snapshotId: string;
  submittedAt?: string;
  resumeArtifactId?: string;
  answers?: Array<{
    questionKey: string;
    questionText: string;
    answerText: string;
  }>;
}

export interface ConfirmSubmissionResponse {
  application: Application;
  event: ApplicationEvent;
  answers: SubmittedAnswer[];
}

export interface ApplicationDetailResponse {
  application: Application;
  answers: SubmittedAnswer[];
}
