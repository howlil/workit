import { describe, it, expect, beforeEach } from "vitest";
import app from "../index";

describe("Worker Evidence API", () => {
  const userId = "usr_evidence_test";

  beforeEach(async () => {
    // 1. Setup profile identity
    await app.request("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        fullName: "Alex Rivera",
        email: "alex@example.com",
        summary: "Fullstack engineer specializing in React and TypeScript.",
      }),
    });

    // 2. Add Experience with facts
    await app.request("/api/profile/experiences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        company: "Stripe",
        title: "Frontend Engineer",
        startDate: "2023-01-01",
        facts: [
          "Built customer-facing dashboards using React and TypeScript",
          "Optimized bundle size by 35% through tree shaking",
        ],
      }),
    });

    // 3. Update Skills
    await app.request("/api/profile/skills", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        skills: ["React", "TypeScript"],
      }),
    });
  });

  it("POST /api/evidence/match — analyzes match breakdown and verifies evidence facts invariant", async () => {
    const jobDescription = `
      About the Role:
      We are looking for a Senior Frontend Engineer to build modern web apps.

      Requirements:
      - 3+ years experience with React
      - Strong proficiency in TypeScript
      - Hands-on experience with GraphQL APIs
    `;

    const res = await app.request("/api/evidence/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ jobDescription }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.analysis).toBeDefined();

    const analysis = data.analysis;
    expect(analysis.totalRequirements).toBe(3);
    expect(analysis.matchedCount).toBe(2);
    expect(analysis.missingCount).toBe(1);
    expect(analysis.overallScore).toBe(67);

    // Verify positive match has evidence fact IDs
    const reactMatch = analysis.matches.find((m: any) => m.requirement.includes("React"));
    expect(reactMatch).toBeDefined();
    expect(reactMatch.status).toBe("matched");
    expect(reactMatch.evidenceFactIds.length).toBeGreaterThan(0);
    expect(reactMatch.evidenceSummary).toContain("React");

    const tsMatch = analysis.matches.find((m: any) => m.requirement.includes("TypeScript"));
    expect(tsMatch).toBeDefined();
    expect(tsMatch.status).toBe("matched");
    expect(tsMatch.evidenceFactIds.length).toBeGreaterThan(0);

    // Verify missing match has NO evidence fact IDs
    const graphqlMatch = analysis.matches.find((m: any) => m.requirement.includes("GraphQL"));
    expect(graphqlMatch).toBeDefined();
    expect(graphqlMatch.status).toBe("missing");
    expect(graphqlMatch.evidenceFactIds).toEqual([]);
    expect(graphqlMatch.evidenceSummary).toContain("No matching evidence");
  });
});
