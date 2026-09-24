import type { JobCandidate } from "@workit/contracts";
import type { JobExtractor, PageContext } from "./types";
import { htmlToPlainText, sanitizeHtml } from "../sanitize";

export class GenericJobExtractor implements JobExtractor {
  readonly name = "generic";

  canHandle(page: PageContext): boolean {
    // Generic extractor can inspect any HTML page
    return !!page.document && !!page.document.body;
  }

  extract(page: PageContext): JobCandidate | null {
    const doc = page.document;

    // 1. Title candidates
    const title = this.extractTitle(doc);
    if (!title) return null;

    // 2. Description candidate
    const descElement = this.extractDescriptionElement(doc);
    const rawDescription = descElement ? descElement.innerHTML : "";
    const descriptionText = descElement ? (descElement.textContent?.trim() || "") : "";

    // Must have meaningful description text to be considered a job
    if (descriptionText.length < 80) {
      return null;
    }

    // 3. Company candidate
    const company = this.extractCompany(doc, title);

    // 4. Location candidate
    const location = this.extractLocation(doc);

    // 5. Employment type candidate
    const employmentType = this.extractEmploymentType(doc);

    // 6. Work arrangement
    const workArrangement = this.extractWorkArrangement(title, location, descriptionText);

    // 7. Confidence calculation
    const confidence = this.calculateConfidence(page, title, company, descriptionText, doc);

    // If confidence is below threshold, reject (not a job page)
    if (confidence < 0.65) {
      return null;
    }

    // 8. Canonical URL
    const canonicalLink = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalUrl = canonicalLink?.href || page.url;

    return {
      source: {
        canonicalUrl,
      },
      title,
      company,
      location,
      employmentType,
      workArrangement,
      descriptionHtml: sanitizeHtml(rawDescription) || undefined,
      descriptionText: htmlToPlainText(rawDescription) || descriptionText,
      extractedAt: new Date().toISOString(),
      extraction: {
        strategy: "generic",
        confidence: Math.min(0.85, confidence), // Cap generic confidence at 0.85
      },
    };
  }

  private extractTitle(doc: Document): string | undefined {
    // Try h1 inside main/article or top h1
    const h1 = doc.querySelector("main h1, article h1, h1");
    if (h1 && h1.textContent?.trim()) {
      return this.cleanTitle(h1.textContent.trim());
    }

    // Try og:title meta
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
    if (ogTitle?.trim()) {
      return this.cleanTitle(ogTitle.trim());
    }

    return undefined;
  }

  private cleanTitle(raw: string): string {
    // Strip trailing company or site names like " - Acme Corp | Careers" or " at Google"
    return raw
      .replace(/\s+at\s+[\w\s.-]+$/i, "")
      .replace(/\s*[-–—|]\s*[\w\s.-]+(?:Careers|Jobs|Hiring)?$/i, "")
      .trim();
  }

  private extractCompany(doc: Document, jobTitle?: string): string | undefined {
    // Selector-based
    const companyEl = doc.querySelector(
      '.company, [data-company], [itemprop="hiringOrganization"], .job-meta .company, .employer'
    );
    if (companyEl && companyEl.textContent?.trim()) {
      return companyEl.textContent.trim();
    }

    // From og:title (e.g. "Data Analyst at Acme Corp")
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
    if (ogTitle) {
      const match = ogTitle.match(/\bat\s+([^|–—-]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // From document title (e.g. "Data Analyst - Acme Corp | Careers")
    const docTitle = doc.title;
    if (docTitle && jobTitle && docTitle.includes(jobTitle)) {
      const remainder = docTitle.replace(jobTitle, "").replace(/Careers|Jobs|Hiring/gi, "");
      const match = remainder.match(/[-–—|]\s*([a-zA-Z0-9\s]+)/);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractLocation(doc: Document): string | undefined {
    const locEl = doc.querySelector(
      '.location, [data-location], [itemprop="jobLocation"], .job-meta .location'
    );
    if (locEl && locEl.textContent?.trim()) {
      return locEl.textContent.trim();
    }
    return undefined;
  }

  private extractEmploymentType(doc: Document): string | undefined {
    const typeEl = doc.querySelector(
      '.type, [data-type], .job-meta .type, .employment-type'
    );
    if (typeEl && typeEl.textContent?.trim()) {
      return typeEl.textContent.trim();
    }

    const bodyText = doc.body.textContent || "";
    if (/\bfull[- ]time\b/i.test(bodyText)) return "Full-time";
    if (/\bpart[- ]time\b/i.test(bodyText)) return "Part-time";
    if (/\bcontract\b/i.test(bodyText)) return "Contract";
    if (/\binternship\b/i.test(bodyText)) return "Internship";

    return undefined;
  }

  private extractWorkArrangement(
    title?: string,
    location?: string,
    description?: string
  ): "remote" | "hybrid" | "onsite" | "unknown" {
    const combined = `${title || ""} ${location || ""} ${description || ""}`.toLowerCase();
    if (combined.includes("remote") || combined.includes("work from home")) return "remote";
    if (combined.includes("hybrid")) return "hybrid";
    if (combined.includes("on-site") || combined.includes("onsite")) return "onsite";
    return "unknown";
  }

  private extractDescriptionElement(doc: Document): Element | null {
    // Check known description containers
    const targeted = doc.querySelector(
      '.job-description, [data-description], #job-description, .description, [itemprop="description"]'
    );
    if (targeted) return targeted;

    // Fallback: look for the longest content container in main/article
    const containers = doc.querySelectorAll("main, article, .content, .job-body");
    let best: Element | null = null;
    let maxLen = 0;

    for (const el of Array.from(containers)) {
      const len = el.textContent?.trim().length || 0;
      if (len > maxLen) {
        maxLen = len;
        best = el;
      }
    }

    return best;
  }

  private calculateConfidence(
    page: PageContext,
    title: string | undefined,
    company: string | undefined,
    descText: string,
    doc: Document
  ): number {
    let score = 0;

    if (title && title.length > 3) score += 0.25;
    if (company && company.length > 1) score += 0.2;
    if (descText.length > 200) score += 0.2;

    // Check for job keywords in description
    const lowerDesc = descText.toLowerCase();
    const hasJobKeywords =
      lowerDesc.includes("requirement") ||
      lowerDesc.includes("responsibilit") ||
      lowerDesc.includes("qualification") ||
      lowerDesc.includes("experience") ||
      lowerDesc.includes("what you'll do");

    if (hasJobKeywords) score += 0.15;

    // Check for apply button or link
    const hasApply =
      doc.querySelector('a[href*="apply"], button.apply, .btn-apply, a.apply-button') !== null ||
      /apply\s+(?:now|for|online)/i.test(doc.body.textContent || "");

    if (hasApply) score += 0.15;

    // Check URL pattern
    const lowerUrl = page.url.toLowerCase();
    if (
      lowerUrl.includes("/job") ||
      lowerUrl.includes("/career") ||
      lowerUrl.includes("/position") ||
      lowerUrl.includes("/vacancy")
    ) {
      score += 0.1;
    }

    return score;
  }
}
