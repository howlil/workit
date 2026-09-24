import { describe, it, expect } from "vitest";
import app from "../index.js";

describe("Worker API — /api/profile", () => {
  const userId = "usr_profile_test";

  it("GET /api/profile returns or creates default career profile", async () => {
    const res = await app.request("/api/profile", {
      headers: { "x-user-id": userId },
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.profile).toBeDefined();
    expect(data.profile.fullName).toBeDefined();
    expect(data.experiences).toEqual([]);
    expect(data.education).toEqual([]);
    expect(data.skills).toEqual([]);
  });

  it("PATCH /api/profile updates personal identity fields", async () => {
    const res = await app.request("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        fullName: "Alex Developer",
        email: "alex@example.com",
        phone: "+62 812 3456 7890",
        location: "Jakarta, Indonesia",
        linkedinUrl: "https://linkedin.com/in/alexdev",
        portfolioUrl: "https://alex.dev",
      }),
    });

    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.fullName).toBe("Alex Developer");
    expect(updated.location).toBe("Jakarta, Indonesia");
    expect(updated.linkedinUrl).toBe("https://linkedin.com/in/alexdev");
  });

  it("POST /api/profile/experiences adds an experience with structured facts", async () => {
    const res = await app.request("/api/profile/experiences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        company: "Acme Cloud",
        title: "Staff Systems Engineer",
        location: "Remote",
        startDate: "2023-01",
        isCurrent: true,
        description: "Leading distributed storage platform team.",
        facts: [
          "Built multi-region caching layer handling 50k QPS",
          "Reduced p99 latency from 120ms to 24ms",
        ],
      }),
    });

    expect(res.status).toBe(201);
    const exp = (await res.json()) as any;
    expect(exp.id).toBeDefined();
    expect(exp.company).toBe("Acme Cloud");
    expect(exp.facts.length).toBe(2);
    expect(exp.facts[0].factText).toContain("50k QPS");
  });

  it("POST /api/profile/education adds education record", async () => {
    const res = await app.request("/api/profile/education", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        institution: "Institut Teknologi Bandung",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        startDate: "2016",
        endDate: "2020",
      }),
    });

    expect(res.status).toBe(201);
    const edu = (await res.json()) as any;
    expect(edu.institution).toBe("Institut Teknologi Bandung");
  });

  it("PUT /api/profile/skills updates skills list", async () => {
    const res = await app.request("/api/profile/skills", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({
        skills: ["TypeScript", "Distributed Systems", "Cloudflare Workers", "SQLite"],
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.skills.length).toBe(4);
    expect(data.skills.map((s: any) => s.name)).toContain("TypeScript");
  });

  it("GET /api/profile returns full assembled profile with all sections intact", async () => {
    const res = await app.request("/api/profile", {
      headers: { "x-user-id": userId },
    });
    expect(res.status).toBe(200);

    const full = (await res.json()) as any;
    expect(full.profile.fullName).toBe("Alex Developer");
    expect(full.experiences.length).toBe(1);
    expect(full.experiences[0].facts.length).toBe(2);
    expect(full.education.length).toBe(1);
    expect(full.skills.length).toBe(4);
  });
});
