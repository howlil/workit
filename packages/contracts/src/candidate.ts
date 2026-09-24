export interface JobCandidate {
  source: {
    provider?: string;
    sourceJobId?: string;
    canonicalUrl: string;
  };

  company?: string;
  title?: string;
  location?: string;

  employmentType?: string;
  workArrangement?: "remote" | "hybrid" | "onsite" | "unknown";
  salary?: {
    currency?: string;
    minValue?: number;
    maxValue?: number;
    unit?: string;
  };

  descriptionText: string;
  descriptionHtml?: string;

  extractedAt: string;
  extraction: {
    strategy: "json-ld" | "adapter" | "generic";
    confidence: number;
  };
}
