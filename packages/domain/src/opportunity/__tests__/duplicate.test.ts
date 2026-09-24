import { describe, it, expect } from "vitest";
import {
  findDuplicate,
  normalizeUrl,
  computeContentHash,
  type ExistingOpportunitySummary,
} from "../../index.js";

const existingOpps: ExistingOpportunitySummary[] = [
  {
    id: "opp_1",
    sourceProvider: "greenhouse",
    sourceJobId: "gh-12345",
    canonicalUrl: "https://boards.greenhouse.io/acme/jobs/12345",
    company: "Acme Corp",
    title: "Senior Backend Engineer",
    location: "Jakarta, Indonesia",
  },
  {
    id: "opp_2",
    sourceProvider: "linkedin",
    sourceJobId: "li-98765",
    canonicalUrl: "https://www.linkedin.com/jobs/view/98765",
    company: "Beta Labs",
    title: "Fullstack Developer",
    location: "Remote",
  },
];

describe("Domain — Duplicate Detection", () => {
  it("matches priority 1: exact provider + sourceJobId", () => {
    const result = findDuplicate(
      {
        provider: "greenhouse",
        sourceJobId: "gh-12345",
        canonicalUrl: "https://different-url.com/some-job",
        company: "Different Company",
        title: "Different Title",
      },
      existingOpps
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.existingOpportunityId).toBe("opp_1");
    expect(result.strategy).toBe("provider_id");
  });

  it("matches priority 2: canonicalUrl ignoring tracking query params and trailing slash", () => {
    const result = findDuplicate(
      {
        canonicalUrl:
          "https://boards.greenhouse.io/acme/jobs/12345/?utm_source=linkedin&utm_campaign=hiring&ref=job_board",
        company: "Any",
        title: "Any",
      },
      existingOpps
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.existingOpportunityId).toBe("opp_1");
    expect(result.strategy).toBe("canonical_url");
  });

  it("matches priority 3: fuzzy company + title + location", () => {
    const result = findDuplicate(
      {
        canonicalUrl: "https://acme.com/careers/backend-eng",
        company: "acme corp ",
        title: "Senior  Backend  Engineer",
        location: "Jakarta,  Indonesia",
      },
      existingOpps
    );

    expect(result.isDuplicate).toBe(true);
    expect(result.existingOpportunityId).toBe("opp_1");
    expect(result.strategy).toBe("company_title_location");
  });

  it("returns isDuplicate: false when no match exists", () => {
    const result = findDuplicate(
      {
        canonicalUrl: "https://careers.google.com/jobs/results/11111",
        company: "Google",
        title: "Software Engineer",
        location: "Singapore",
      },
      existingOpps
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.existingOpportunityId).toBeUndefined();
  });

  it("normalizeUrl removes tracking parameters and trailing slashes correctly", () => {
    expect(
      normalizeUrl("https://example.com/jobs/123/?utm_source=feed&fbclid=abc")
    ).toBe("https://example.com/jobs/123");
  });
});

describe("Domain — Content Hash", () => {
  it("produces identical hashes for identical content regardless of extra whitespace", async () => {
    const textA = "We are looking for a Software Engineer.\n\nRequirements:\n- 3+ years experience";
    const textB = "We are looking for a Software Engineer. \n Requirements: \n- 3+ years experience  ";

    const hashA = await computeContentHash(textA);
    const hashB = await computeContentHash(textB);

    expect(hashA).toBe(hashB);
  });

  it("produces different hashes for different descriptions", async () => {
    const hashA = await computeContentHash("Frontend developer role");
    const hashB = await computeContentHash("Backend developer role");

    expect(hashA).not.toBe(hashB);
  });
});
