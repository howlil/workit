import { describe, it, expect } from "vitest";
import { extractRequirements } from "../extract-requirements";
import { matchRequirements } from "../match-profile";
import type { FullCareerProfile } from "../../profile/types";

describe("Evidence Matching Domain Logic", () => {
  const sampleProfile: FullCareerProfile = {
    profile: {
      id: "prof_1",
      userId: "usr_1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      createdAt: "2026-09-25T00:00:00Z",
      updatedAt: "2026-09-25T00:00:00Z",
    },
    experiences: [
      {
        id: "exp_1",
        profileId: "prof_1",
        company: "Acme Corp",
        title: "Senior Software Engineer",
        startDate: "2023-01-01",
        isCurrent: true,
        facts: [
          {
            id: "fact_react_ts",
            experienceId: "exp_1",
            factText: "Architected high-scale frontend in React and TypeScript",
            factType: "achievement",
          },
          {
            id: "fact_k8s",
            experienceId: "exp_1",
            factText: "Deployed Docker containers across Kubernetes clusters",
            factType: "technology",
          },
        ],
      },
    ],
    education: [
      {
        id: "edu_cs",
        profileId: "prof_1",
        institution: "Tech Institute",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
      },
    ],
    skills: [
      { id: "skl_react", profileId: "prof_1", name: "React", category: "frontend" },
      { id: "skl_ts", profileId: "prof_1", name: "TypeScript", category: "frontend" },
    ],
  };

  describe("extractRequirements", () => {
    it("extracts requirements from bullet points with keywords", () => {
      const jobDesc = `
        Requirements:
        - 3+ years experience with React
        - Proficiency in TypeScript
        - Experience with GraphQL APIs
        - Bachelor's degree in Computer Science or related field
      `;

      const reqs = extractRequirements(jobDesc);
      expect(reqs.length).toBe(4);
      expect(reqs[0]?.keywords).toContain("react");
      expect(reqs[1]?.keywords).toContain("typescript");
      expect(reqs[2]?.keywords).toContain("graphql");
      expect(reqs[3]?.type).toBe("education");
    });
  });

  describe("matchRequirements", () => {
    it("verifies invariant: positive matches MUST point to valid profile evidence facts; missing has no facts", () => {
      const requirements = [
        {
          id: "req_1",
          text: "Proficiency in React",
          type: "skill" as const,
          keywords: ["react"],
        },
        {
          id: "req_2",
          text: "Proficiency in TypeScript",
          type: "skill" as const,
          keywords: ["typescript"],
        },
        {
          id: "req_3",
          text: "Hands-on GraphQL experience",
          type: "skill" as const,
          keywords: ["graphql"],
        },
      ];

      const analysis = matchRequirements(requirements, sampleProfile);

      expect(analysis.totalRequirements).toBe(3);
      expect(analysis.matchedCount).toBe(2);
      expect(analysis.missingCount).toBe(1);
      expect(analysis.overallScore).toBe(67); // (1 + 1 + 0) / 3 = 67%

      const reactMatch = analysis.matches.find((m) => m.requirement.includes("React"));
      expect(reactMatch).toBeDefined();
      expect(reactMatch?.status).toBe("matched");
      // Must point to fact or skill
      expect(reactMatch?.evidenceFactIds.length).toBeGreaterThan(0);
      expect(reactMatch?.evidenceFactIds).toContain("skl_react");
      expect(reactMatch?.evidenceFactIds).toContain("fact_react_ts");
      expect(reactMatch?.evidenceSummary).toContain("React");

      const tsMatch = analysis.matches.find((m) => m.requirement.includes("TypeScript"));
      expect(tsMatch).toBeDefined();
      expect(tsMatch?.status).toBe("matched");
      expect(tsMatch?.evidenceFactIds).toContain("skl_ts");
      expect(tsMatch?.evidenceFactIds).toContain("fact_react_ts");

      const graphqlMatch = analysis.matches.find((m) => m.requirement.includes("GraphQL"));
      expect(graphqlMatch).toBeDefined();
      expect(graphqlMatch?.status).toBe("missing");
      // Invariant: missing requirement must have EMPTY evidenceFactIds
      expect(graphqlMatch?.evidenceFactIds).toEqual([]);
      expect(graphqlMatch?.evidenceSummary).toContain("No matching evidence");
    });

    it("matches education requirements to profile education records", () => {
      const requirements = [
        {
          id: "req_edu",
          text: "Bachelor's degree in Computer Science",
          type: "education" as const,
          keywords: ["computer science"],
        },
      ];

      const analysis = matchRequirements(requirements, sampleProfile);
      expect(analysis.matchedCount).toBe(1);
      const eduMatch = analysis.matches[0];
      expect(eduMatch?.status).toBe("matched");
      expect(eduMatch?.evidenceFactIds).toContain("edu_cs");
      expect(eduMatch?.evidenceSummary).toContain("Tech Institute");
    });
  });
});
