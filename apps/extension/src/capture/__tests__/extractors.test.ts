import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SchemaOrgJobExtractor } from "../extractors/schema-org";
import { GenericJobExtractor } from "../extractors/generic";
import { JobDetector } from "../job-detector";
import { sanitizeHtml, htmlToPlainText } from "../sanitize";
import type { PageContext } from "../extractors/types";

const fixturesDir = path.resolve(__dirname, "../../../../../fixtures/jobs");

function loadFixture(filename: string, url = "https://example.com/job"): PageContext {
  const filePath = path.join(fixturesDir, filename);
  const html = fs.readFileSync(filePath, "utf-8");

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return {
    url,
    hostname: "example.com",
    pathname: "/job",
    document: doc,
  };
}

describe("S2 — Job Detection + Extraction", () => {
  describe("Sanitization", () => {
    it("strips script tags, iframes, and inline event handlers from HTML", () => {
      const malicious = `
        <div>
          <p>Valid job description</p>
          <script>alert('xss')</script>
          <iframe src="evil.com"></iframe>
          <button onclick="stealTokens()">Click</button>
          <a href="javascript:void(0)">Link</a>
        </div>
      `;
      const cleaned = sanitizeHtml(malicious);
      expect(cleaned).not.toContain("<script");
      expect(cleaned).not.toContain("<iframe");
      expect(cleaned).not.toContain("onclick");
      expect(cleaned).not.toContain("javascript:");
      expect(cleaned).toContain("Valid job description");
    });

    it("converts HTML into clean plain text", () => {
      const html = "<h3>Requirements</h3><ul><li>3+ years TypeScript</li><li>SQL</li></ul>";
      const text = htmlToPlainText(html);
      expect(text).toContain("Requirements");
      expect(text).toContain("• 3+ years TypeScript");
      expect(text).toContain("• SQL");
      expect(text).not.toContain("<h3>");
      expect(text).not.toContain("<li>");
    });
  });

  describe("SchemaOrgJobExtractor", () => {
    const extractor = new SchemaOrgJobExtractor();

    it("extracts exact expected fields from json-ld-complete.html", () => {
      const page = loadFixture("json-ld-complete.html", "https://example.com/jobs/se-001");
      expect(extractor.canHandle(page)).toBe(true);

      const candidate = extractor.extract(page);
      expect(candidate).not.toBeNull();
      expect(candidate!.title).toBe("Software Engineer");
      expect(candidate!.company).toBe("Example Corp");
      expect(candidate!.location).toContain("Jakarta");
      expect(candidate!.workArrangement).toBe("remote");
      expect(candidate!.employmentType).toBe("FULL_TIME");
      expect(candidate!.source.sourceJobId).toBe("SE-2026-001");
      expect(candidate!.extraction.strategy).toBe("json-ld");
      expect(candidate!.extraction.confidence).toBe(0.95);
      expect(candidate!.descriptionText).toContain("3+ years of experience with TypeScript");
      expect(candidate!.descriptionHtml).toContain("Cloudflare Workers");
    });

    it("extracts partial fields gracefully from json-ld-partial.html", () => {
      const page = loadFixture("json-ld-partial.html", "https://example.com/jobs/fe-002");
      expect(extractor.canHandle(page)).toBe(true);

      const candidate = extractor.extract(page);
      expect(candidate).not.toBeNull();
      expect(candidate!.title).toBe("Frontend Developer");
      expect(candidate!.company).toBe("Partial Inc");
      expect(candidate!.location).toBeUndefined();
      expect(candidate!.workArrangement).toBe("unknown");
      expect(candidate!.extraction.strategy).toBe("json-ld");
      expect(candidate!.extraction.confidence).toBe(0.95);
    });

    it("returns null when no JSON-LD JobPosting is present", () => {
      const page = loadFixture("generic-job.html");
      expect(extractor.canHandle(page)).toBe(false);
      expect(extractor.extract(page)).toBeNull();
    });
  });

  describe("GenericJobExtractor", () => {
    const extractor = new GenericJobExtractor();

    it("extracts structured candidate from generic-job.html DOM signals", () => {
      const page = loadFixture("generic-job.html", "https://example.com/careers/data-analyst");
      expect(extractor.canHandle(page)).toBe(true);

      const candidate = extractor.extract(page);
      expect(candidate).not.toBeNull();
      expect(candidate!.title).toBe("Data Analyst");
      expect(candidate!.company).toBe("Acme Corp");
      expect(candidate!.location).toBe("Bandung, Indonesia");
      expect(candidate!.employmentType).toBe("Full-time");
      expect(candidate!.extraction.strategy).toBe("generic");
      expect(candidate!.extraction.confidence).toBeGreaterThanOrEqual(0.7);
      expect(candidate!.descriptionText).toContain("Analyze product metrics");
    });

    it("returns null for non-job page (non-job.html)", () => {
      const page = loadFixture("non-job.html", "https://example.com/about");
      const candidate = extractor.extract(page);
      expect(candidate).toBeNull();
    });
  });

  describe("JobDetector Pipeline Priority", () => {
    const detector = new JobDetector();

    it("prefers Schema.org extractor over generic when JSON-LD is available", async () => {
      const page = loadFixture("json-ld-complete.html");
      const candidate = await detector.detect(page);

      expect(candidate).not.toBeNull();
      expect(candidate!.extraction.strategy).toBe("json-ld");
      expect(candidate!.extraction.confidence).toBe(0.95);
    });

    it("falls back to generic extractor when JSON-LD is absent", async () => {
      const page = loadFixture("generic-job.html");
      const candidate = await detector.detect(page);

      expect(candidate).not.toBeNull();
      expect(candidate!.extraction.strategy).toBe("generic");
    });

    it("returns null for ordinary non-job pages", async () => {
      const page = loadFixture("non-job.html");
      const candidate = await detector.detect(page);

      expect(candidate).toBeNull();
    });
  });
});
