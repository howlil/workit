import type { JobCandidate } from "@workit/contracts";
import type { JobExtractor, PageContext } from "./types";
import { htmlToPlainText, sanitizeHtml } from "../sanitize";

interface SchemaJobPosting {
  "@type"?: string;
  title?: string;
  description?: string;
  hiringOrganization?: {
    "@type"?: string;
    name?: string;
  } | string;
  jobLocation?: {
    "@type"?: string;
    name?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string | { name?: string };
    } | string;
  } | string;
  applicantLocationRequirements?: unknown;
  jobLocationType?: string;
  employmentType?: string | string[];
  datePosted?: string;
  validThrough?: string;
  identifier?: {
    name?: string;
    value?: string;
  } | string;
  url?: string;
}

export class SchemaOrgJobExtractor implements JobExtractor {
  readonly name = "schema-org";

  canHandle(page: PageContext): boolean {
    const scripts = page.document.querySelectorAll('script[type="application/ld+json"]');
    return scripts.length > 0;
  }

  extract(page: PageContext): JobCandidate | null {
    const scripts = page.document.querySelectorAll('script[type="application/ld+json"]');

    for (const script of Array.from(scripts)) {
      try {
        const text = script.textContent?.trim();
        if (!text) continue;

        const data = JSON.parse(text);
        const job = this.findJobPosting(data);
        if (job) {
          return this.normalize(job, page);
        }
      } catch {
        // Invalid JSON-LD block; skip and check next script
        continue;
      }
    }

    return null;
  }

  private findJobPosting(data: unknown): SchemaJobPosting | null {
    if (!data || typeof data !== "object") return null;

    if (Array.isArray(data)) {
      for (const item of data) {
        const found = this.findJobPosting(item);
        if (found) return found;
      }
      return null;
    }

    const obj = data as Record<string, unknown>;

    // Handle @graph array
    if (Array.isArray(obj["@graph"])) {
      return this.findJobPosting(obj["@graph"]);
    }

    // Direct JobPosting check
    const type = obj["@type"];
    if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) {
      return obj as SchemaJobPosting;
    }

    return null;
  }

  private normalize(job: SchemaJobPosting, page: PageContext): JobCandidate {
    const title = typeof job.title === "string" ? job.title.trim() : undefined;

    // Company extraction
    let company: string | undefined;
    if (job.hiringOrganization) {
      if (typeof job.hiringOrganization === "string") {
        company = job.hiringOrganization.trim();
      } else if (typeof job.hiringOrganization.name === "string") {
        company = job.hiringOrganization.name.trim();
      }
    }

    // Location extraction
    const location = this.extractLocation(job);

    // Work arrangement
    const workArrangement = this.extractWorkArrangement(job, title, location);

    // Employment type
    const employmentType = Array.isArray(job.employmentType)
      ? job.employmentType.join(", ")
      : typeof job.employmentType === "string"
      ? job.employmentType
      : undefined;

    // Source ID
    let sourceJobId: string | undefined;
    if (job.identifier) {
      if (typeof job.identifier === "string") {
        sourceJobId = job.identifier.trim();
      } else if (typeof job.identifier.value === "string") {
        sourceJobId = job.identifier.value.trim();
      }
    }

    // Canonical URL
    const canonicalLink = page.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalUrl = canonicalLink?.href || job.url || page.url;

    // Description
    const rawDescription = typeof job.description === "string" ? job.description : "";
    const descriptionHtml = sanitizeHtml(rawDescription);
    const descriptionText = htmlToPlainText(rawDescription);

    // Confidence scoring
    let confidence = 0.5;
    if (title && descriptionText) {
      confidence = company ? 0.95 : 0.8;
    }

    return {
      source: {
        canonicalUrl,
        sourceJobId,
      },
      title,
      company,
      location,
      employmentType,
      workArrangement,
      descriptionHtml: descriptionHtml || undefined,
      descriptionText,
      extractedAt: new Date().toISOString(),
      extraction: {
        strategy: "json-ld",
        confidence,
      },
    };
  }

  private extractLocation(job: SchemaJobPosting): string | undefined {
    if (!job.jobLocation) return undefined;

    if (typeof job.jobLocation === "string") {
      return job.jobLocation.trim();
    }

    if (typeof job.jobLocation.name === "string") {
      return job.jobLocation.name.trim();
    }

    if (job.jobLocation.address) {
      const addr = job.jobLocation.address;
      if (typeof addr === "string") {
        return addr.trim();
      }

      const parts: string[] = [];
      if (addr.addressLocality) parts.push(addr.addressLocality);
      if (addr.addressRegion) parts.push(addr.addressRegion);
      if (typeof addr.addressCountry === "string") {
        parts.push(addr.addressCountry);
      } else if (addr.addressCountry?.name) {
        parts.push(addr.addressCountry.name);
      }

      if (parts.length > 0) {
        return parts.join(", ");
      }
    }

    return undefined;
  }

  private extractWorkArrangement(
    job: SchemaJobPosting,
    title?: string,
    location?: string
  ): "remote" | "hybrid" | "onsite" | "unknown" {
    if (job.jobLocationType === "TELECOMMUTE" || job.applicantLocationRequirements) {
      return "remote";
    }

    const combinedText = `${title || ""} ${location || ""}`.toLowerCase();
    if (combinedText.includes("remote") || combinedText.includes("wfh")) {
      return "remote";
    }
    if (combinedText.includes("hybrid")) {
      return "hybrid";
    }
    if (combinedText.includes("on-site") || combinedText.includes("onsite")) {
      return "onsite";
    }

    return "unknown";
  }
}
