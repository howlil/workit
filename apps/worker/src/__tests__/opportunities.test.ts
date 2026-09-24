import { describe, it, expect } from "vitest";
import app from "../index.js";
import type { JobCandidate } from "@workit/contracts";

describe("Worker API — /api/opportunities", () => {
  const candidate: JobCandidate = {
    source: {
      canonicalUrl: "https://boards.greenhouse.io/stripe/jobs/55555",
      provider: "greenhouse",
      sourceJobId: "stripe-55555",
    },
    company: "Stripe",
    title: "Staff Software Engineer, Infrastructure",
    location: "Remote - US",
    employmentType: "Full-time",
    workArrangement: "remote",
    descriptionText: "Join Stripe Infrastructure to build globally resilient financial systems.",
    extractedAt: "2026-09-25T00:00:00Z",
    extraction: {
      strategy: "json-ld",
      confidence: 0.95,
    },
  };

  it("POST /api/opportunities creates a new opportunity and snapshot", async () => {
    const res = await app.request("/api/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr_test_1",
      },
      body: JSON.stringify({ candidate }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.opportunityId).toBeDefined();
    expect(body.opportunityId).toMatch(/^opp_/);
    expect(body.state).toBe("saved");
    expect(body.snapshotId).toMatch(/^snap_/);
    expect(body.isDuplicate).toBe(false);

    // Verify GET /:id returns the newly created opportunity and snapshot
    const getRes = await app.request(`/api/opportunities/${body.opportunityId}`, {
      headers: { "x-user-id": "usr_test_1" },
    });
    expect(getRes.status).toBe(200);
    const detail = (await getRes.json()) as any;
    expect(detail.opportunity.company).toBe("Stripe");
    expect(detail.currentSnapshot.descriptionText).toContain("financial systems");
  });

  it("POST /api/opportunities detects duplicates and returns existing ID", async () => {
    const res = await app.request("/api/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr_test_1",
      },
      body: JSON.stringify({ candidate }),
    });

    expect(res.status).toBe(200); // 200 for duplicate
    const body = (await res.json()) as any;
    expect(body.isDuplicate).toBe(true);
    expect(body.opportunityId).toMatch(/^opp_/);
  });

  it("GET /api/opportunities/check identifies whether a URL is already saved", async () => {
    // Existing URL
    const checkRes = await app.request(
      `/api/opportunities/check?url=${encodeURIComponent(candidate.source.canonicalUrl)}`,
      { headers: { "x-user-id": "usr_test_1" } }
    );
    expect(checkRes.status).toBe(200);
    const checkBody = (await checkRes.json()) as any;
    expect(checkBody.exists).toBe(true);
    expect(checkBody.opportunityId).toBeDefined();

    // Non-existent URL
    const notSavedRes = await app.request(
      "/api/opportunities/check?url=https://example.com/not-saved",
      { headers: { "x-user-id": "usr_test_1" } }
    );
    const notSavedBody = (await notSavedRes.json()) as any;
    expect(notSavedBody.exists).toBe(false);
  });

  it("enforces tenant isolation: user B cannot access user A's opportunity", async () => {
    // Create opportunity as user A
    const res = await app.request("/api/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "usr_alice",
      },
      body: JSON.stringify({
        candidate: {
          ...candidate,
          source: { canonicalUrl: "https://example.com/private-job-alice" },
        },
      }),
    });
    const { opportunityId } = (await res.json()) as any;

    // User B tries to access user A's opportunity
    const getRes = await app.request(`/api/opportunities/${opportunityId}`, {
      headers: { "x-user-id": "usr_bob" },
    });
    expect(getRes.status).toBe(404);
  });
});
