import { describe, it, expect } from "vitest";
import { parseResume } from "../parse-resume.js";

describe("Resume Parser", () => {
  const sampleResume = `
Jane Doe
San Francisco, CA
jane.doe@example.com | (555) 123-4567
https://linkedin.com/in/janedoe | https://github.com/janedoe

SUMMARY
Experienced Full Stack Engineer with 6+ years designing scalable cloud-native architectures, distributed web applications, and resilient data processing systems.

EXPERIENCE
Senior Software Engineer at Acme Corp
Jan 2021 - Present
• Architected event-driven microservices processing 10M events daily.
• Reduced API p99 latency by 35% through query optimization and caching.
• Mentored 4 junior engineers on distributed systems best practices.

Software Engineer at TechFlow
Jun 2018 - Dec 2020
• Developed real-time analytics dashboard with React, TypeScript, and WebSocket.
• Automated CI/CD deployment pipelines on Kubernetes.

EDUCATION
B.S. in Computer Science - University of California, Berkeley
2014 - 2018

SKILLS
TypeScript, React, Node.js, Python, PostgreSQL, Redis, Docker, Kubernetes, AWS, CI/CD
  `.trim();

  it("extracts identity information correctly", () => {
    const draft = parseResume(sampleResume);

    expect(draft.identity.fullName).toBe("Jane Doe");
    expect(draft.identity.email).toBe("jane.doe@example.com");
    expect(draft.identity.phone).toBe("(555) 123-4567");
    expect(draft.identity.location).toBe("San Francisco, CA");
    expect(draft.identity.linkedinUrl).toBe("https://linkedin.com/in/janedoe");
    expect(draft.identity.githubUrl).toBe("https://github.com/janedoe");
    expect(draft.identity.summary).toContain("Experienced Full Stack Engineer");
  });

  it("extracts work experiences with dates and bullet facts", () => {
    const draft = parseResume(sampleResume);

    expect(draft.experiences).toHaveLength(2);

    const first = draft.experiences[0];
    expect(first?.company).toBe("Acme Corp");
    expect(first?.title).toBe("Senior Software Engineer");
    expect(first?.isCurrent).toBe(true);
    expect(first?.facts).toBeDefined();
    expect(first?.facts?.length).toBe(3);
    expect(first?.facts?.[0]).toContain("Architected event-driven microservices");

    const second = draft.experiences[1];
    expect(second?.company).toBe("TechFlow");
    expect(second?.title).toBe("Software Engineer");
    expect(second?.isCurrent).toBe(false);
    expect(second?.facts?.length).toBe(2);
  });

  it("extracts education details", () => {
    const draft = parseResume(sampleResume);

    expect(draft.education).toHaveLength(1);
    const edu = draft.education[0];
    expect(edu?.degree).toContain("B.S");
    expect(edu?.institution).toContain("University of California, Berkeley");
  });

  it("extracts skill list cleanly", () => {
    const draft = parseResume(sampleResume);

    expect(draft.skills).toContain("TypeScript");
    expect(draft.skills).toContain("React");
    expect(draft.skills).toContain("PostgreSQL");
    expect(draft.skills).toContain("AWS");
    expect(draft.skills.length).toBeGreaterThanOrEqual(8);
  });

  it("handles missing sections gracefully without throwing", () => {
    const emptyDraft = parseResume("John Smith\njohn@example.com");
    expect(emptyDraft.identity.fullName).toBe("John Smith");
    expect(emptyDraft.identity.email).toBe("john@example.com");
    expect(emptyDraft.experiences).toHaveLength(0);
    expect(emptyDraft.education).toHaveLength(0);
    expect(emptyDraft.skills).toHaveLength(0);
  });
});
