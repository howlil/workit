import type {
  Application,
  ApplicationAction,
  ApplicationEvent,
} from "./types";

export class InvalidStateTransitionError extends Error {
  constructor(fromState: string, actionType: string) {
    super(`Cannot transition application from state '${fromState}' via action '${actionType}'`);
    this.name = "InvalidStateTransitionError";
  }
}

export function transitionApplication(
  current: Application,
  action: ApplicationAction,
  eventId = `evt_${Date.now()}`
): { nextApplication: Application; event: ApplicationEvent } {
  const fromState = current.state;
  const now = new Date().toISOString();

  let nextState = current.state;
  let metadata: Record<string, unknown> | undefined;

  switch (action.type) {
    case "START_APPLICATION": {
      if (fromState !== "draft") {
        throw new InvalidStateTransitionError(fromState, action.type);
      }
      nextState = "applying";
      break;
    }

    case "CONFIRM_SUBMISSION": {
      if (fromState !== "applying") {
        throw new InvalidStateTransitionError(fromState, action.type);
      }
      nextState = "applied";
      metadata = {
        submittedAt: action.submittedAt,
        snapshotId: action.snapshotId,
        resumeArtifactId: action.resumeArtifactId,
      };
      break;
    }

    case "MARK_INTERVIEWING": {
      if (fromState !== "applied") {
        throw new InvalidStateTransitionError(fromState, action.type);
      }
      nextState = "interviewing";
      break;
    }

    case "MARK_OFFERED": {
      if (fromState !== "interviewing") {
        throw new InvalidStateTransitionError(fromState, action.type);
      }
      nextState = "offered";
      break;
    }

    case "MARK_REJECTED": {
      if (fromState !== "applied" && fromState !== "interviewing") {
        throw new InvalidStateTransitionError(fromState, action.type);
      }
      nextState = "rejected";
      break;
    }

    case "WITHDRAW": {
      if (fromState === "rejected" || fromState === "withdrawn") {
        throw new InvalidStateTransitionError(fromState, action.type);
      }
      nextState = "withdrawn";
      break;
    }

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unhandled action type: ${(exhaustiveCheck as any).type}`);
    }
  }

  const nextApplication: Application = {
    ...current,
    state: nextState,
    updatedAt: now,
    submittedAt:
      action.type === "CONFIRM_SUBMISSION"
        ? action.submittedAt
        : current.submittedAt,
    submittedJobSnapshotId:
      action.type === "CONFIRM_SUBMISSION"
        ? action.snapshotId
        : current.submittedJobSnapshotId,
    submittedResumeArtifactId:
      action.type === "CONFIRM_SUBMISSION"
        ? action.resumeArtifactId
        : current.submittedResumeArtifactId,
  };

  const event: ApplicationEvent = {
    id: eventId,
    applicationId: current.id,
    fromState,
    toState: nextState,
    action: action.type,
    timestamp: now,
    metadata,
  };

  return { nextApplication, event };
}
