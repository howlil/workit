import { describe, it, expect, beforeEach } from "vitest";
import app from "../index";

describe("Worker Applications API", () => {
  const userId = "usr_app_test";
  let opportunityId: string;
  let snapshotId: string;

  beforeEach(async () => {
    // 1. Create an opportunity first
    const saveRes = await app.request("/api/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        candidate: {
          source: {
            canonicalUrl: `https://example.com/jobs/${Date.now()}`,
          },
          title: "Staff Engineer",
          company: "Acme Corp",
          descriptionText: "Looking for a staff engineer.",
          extraction: { strategy: "generic", confidence: 0.9 },
        },
      }),
    });

    const saved = (await saveRes.json()) as any;
    opportunityId = saved.opportunityId;
    snapshotId = saved.snapshotId;
  });

  it("POST /api/applications/start — starts applying and transitions opportunity state to applying", async () => {
    const res = await app.request("/api/applications/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ opportunityId }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.application.opportunityId).toBe(opportunityId);
    expect(data.application.state).toBe("applying");
    expect(data.event.action).toBe("START_APPLICATION");

    // Verify opportunity state updated
    const oppRes = await app.request(`/api/opportunities/${opportunityId}`, {
      headers: { "x-user-id": userId },
    });
    const oppData = (await oppRes.json()) as any;
    expect(oppData.opportunity.state).toBe("applying");
  });

  it("POST /api/applications/:id/submit — confirms submission, freezes snapshot, transitions state to applied", async () => {
    // Start first
    const startRes = await app.request("/api/applications/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ opportunityId }),
    });
    const startData = (await startRes.json()) as any;
    const appId = startData.application.id;

    // Confirm submission
    const submitRes = await app.request(`/api/applications/${appId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        snapshotId,
        answers: [
          {
            questionKey: "years_experience",
            questionText: "How many years of experience?",
            answerText: "7 years",
          },
        ],
      }),
    });

    expect(submitRes.status).toBe(200);
    const submitData = (await submitRes.json()) as any;
    expect(submitData.application.state).toBe("applied");
    expect(submitData.application.submittedJobSnapshotId).toBe(snapshotId);
    expect(submitData.application.submittedAt).toBeDefined();
    expect(submitData.answers.length).toBe(1);

    // Verify opportunity state is now applied
    const oppRes = await app.request(`/api/opportunities/${opportunityId}`, {
      headers: { "x-user-id": userId },
    });
    const oppData = (await oppRes.json()) as any;
    expect(oppData.opportunity.state).toBe("applied");

    // Verify GET /api/applications/by-opportunity/:opportunityId returns the submitted answers
    const detailRes = await app.request(`/api/applications/by-opportunity/${opportunityId}`, {
      headers: { "x-user-id": userId },
    });
    expect(detailRes.status).toBe(200);
    const detailData = (await detailRes.json()) as any;
    expect(detailData.application.state).toBe("applied");
    expect(detailData.answers.length).toBe(1);
    expect(detailData.answers[0].questionKey).toBe("years_experience");
    expect(detailData.answers[0].answerText).toBe("7 years");
  });
});
