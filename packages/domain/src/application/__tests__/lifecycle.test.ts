import { describe, it, expect } from "vitest";
import {
  transitionApplication,
  InvalidStateTransitionError,
} from "../lifecycle";
import type { Application } from "../types";

describe("Application Lifecycle Domain Rules", () => {
  const baseApp: Application = {
    id: "app_123",
    userId: "usr_1",
    opportunityId: "opp_1",
    state: "draft",
    startedAt: "2026-09-25T00:00:00Z",
    createdAt: "2026-09-25T00:00:00Z",
    updatedAt: "2026-09-25T00:00:00Z",
  };

  it("transitions draft -> applying via START_APPLICATION", () => {
    const { nextApplication, event } = transitionApplication(baseApp, {
      type: "START_APPLICATION",
    });

    expect(nextApplication.state).toBe("applying");
    expect(event.fromState).toBe("draft");
    expect(event.toState).toBe("applying");
    expect(event.action).toBe("START_APPLICATION");
  });

  it("transitions applying -> applied via CONFIRM_SUBMISSION with frozen snapshot ref", () => {
    const applyingApp: Application = { ...baseApp, state: "applying" };
    const submittedAt = "2026-09-25T01:00:00Z";
    const snapshotId = "snap_frozen_123";

    const { nextApplication, event } = transitionApplication(applyingApp, {
      type: "CONFIRM_SUBMISSION",
      submittedAt,
      snapshotId,
    });

    expect(nextApplication.state).toBe("applied");
    expect(nextApplication.submittedAt).toBe(submittedAt);
    expect(nextApplication.submittedJobSnapshotId).toBe(snapshotId);
    expect(event.action).toBe("CONFIRM_SUBMISSION");
  });

  it("throws InvalidStateTransitionError when submitting directly from draft", () => {
    expect(() =>
      transitionApplication(baseApp, {
        type: "CONFIRM_SUBMISSION",
        submittedAt: "2026-09-25T01:00:00Z",
        snapshotId: "snap_1",
      })
    ).toThrow(InvalidStateTransitionError);
  });

  it("transitions applied -> interviewing", () => {
    const appliedApp: Application = { ...baseApp, state: "applied" };
    const { nextApplication } = transitionApplication(appliedApp, {
      type: "MARK_INTERVIEWING",
    });
    expect(nextApplication.state).toBe("interviewing");
  });

  it("allows withdrawing from applying or applied", () => {
    const applyingApp: Application = { ...baseApp, state: "applying" };
    const { nextApplication } = transitionApplication(applyingApp, {
      type: "WITHDRAW",
    });
    expect(nextApplication.state).toBe("withdrawn");
  });
});
