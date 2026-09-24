import type { JobCandidate } from "@workit/contracts";
import type { PageContext } from "./extractors/types";
import { defaultExtractorRegistry, JobExtractorRegistry } from "./extractors/registry";

export class JobDetector {
  constructor(private registry: JobExtractorRegistry = defaultExtractorRegistry) {}

  async detect(page: PageContext): Promise<JobCandidate | null> {
    for (const extractor of this.registry.getExtractors()) {
      try {
        if (!extractor.canHandle(page)) {
          continue;
        }

        const candidate = await extractor.extract(page);
        if (candidate && candidate.extraction.confidence >= 0.5) {
          return candidate;
        }
      } catch (err) {
        console.warn(`[Workit] Extractor ${extractor.name} failed:`, err);
      }
    }

    return null;
  }
}

export const defaultJobDetector = new JobDetector();

export function createCurrentPageContext(doc: Document = document): PageContext {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  return {
    url,
    hostname,
    pathname,
    document: doc,
  };
}
