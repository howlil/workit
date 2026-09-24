import type { JobExtractor } from "./types";
import { SchemaOrgJobExtractor } from "./schema-org";
import { GenericJobExtractor } from "./generic";

export class JobExtractorRegistry {
  private extractors: JobExtractor[] = [];

  constructor() {
    // Priority order: Schema.org structured data first, then generic fallback
    this.extractors.push(new SchemaOrgJobExtractor());
    this.extractors.push(new GenericJobExtractor());
  }

  getExtractors(): readonly JobExtractor[] {
    return this.extractors;
  }

  registerExtractor(extractor: JobExtractor, highPriority = false): void {
    if (highPriority) {
      this.extractors.unshift(extractor);
    } else {
      this.extractors.push(extractor);
    }
  }
}

export const defaultExtractorRegistry = new JobExtractorRegistry();
