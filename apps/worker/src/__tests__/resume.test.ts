import { describe, it, expect } from "vitest";
import app from "../index.js";

describe("Worker Resume API", () => {
  const userId = "usr_resume_test";

  const sampleResume = `
Alex Mercer
Seattle, WA
alex.mercer@example.com | (206) 555-0199
https://linkedin.com/in/alexmercer | https://github.com/alexmercer

SUMMARY
Lead Cloud Architect specializing in serverless platforms and event-driven computing.

EXPERIENCE
Staff Engineer at CloudScale
Jan 2022 - Present
• Designed distributed caching layers with Redis and Cloudflare Workers.
• Led cloud migration reducing hosting costs by 40%.

Senior DevOps Engineer at InfraCorp
Feb 2019 - Dec 2021
• Deployed automated Terraform infrastructure for multi-region Kubernetes clusters.

EDUCATION
B.S. in Software Engineering - University of Washington
2015 - 2019

SKILLS
TypeScript, Go, Kubernetes, Terraform, AWS, Cloudflare, Docker
  `.trim();

  it("parses resume, saves artifact, lists resumes, and confirms draft into profile", async () => {
    // 1. Parse resume
    const parseRes = await app.request("/api/resume/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        fileName: "alex-mercer-resume.txt",
        mimeType: "text/plain",
        rawText: sampleResume,
      }),
    });

    expect(parseRes.status).toBe(201);
    const parsedData = (await parseRes.json()) as any;
    expect(parsedData.artifactId).toBeDefined();
    expect(parsedData.draft).toBeDefined();
    expect(parsedData.draft.identity.fullName).toBe("Alex Mercer");
    expect(parsedData.draft.identity.email).toBe("alex.mercer@example.com");
    expect(parsedData.draft.experiences.length).toBe(2);
    expect(parsedData.draft.skills).toContain("TypeScript");

    // 2. List resumes
    const listRes = await app.request("/api/resume", {
      headers: { "x-user-id": userId },
    });
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any;
    expect(listData.resumes.length).toBeGreaterThanOrEqual(1);
    expect(listData.resumes.some((r: any) => r.id === parsedData.artifactId)).toBe(true);

    // 3. Confirm draft
    const confirmRes = await app.request("/api/resume/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        artifactId: parsedData.artifactId,
        draft: parsedData.draft,
      }),
    });

    expect(confirmRes.status).toBe(200);
    const confirmData = (await confirmRes.json()) as any;
    expect(confirmData.success).toBe(true);
    expect(confirmData.profile.profile.fullName).toBe("Alex Mercer");
    expect(confirmData.profile.profile.email).toBe("alex.mercer@example.com");
    expect(confirmData.profile.experiences.length).toBeGreaterThanOrEqual(2);
    expect(confirmData.profile.education.length).toBeGreaterThanOrEqual(1);
    expect(confirmData.profile.skills.some((s: any) => s.name === "TypeScript")).toBe(true);
  });
});
