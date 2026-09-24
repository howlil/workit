import type { JobCandidate } from "@workit/contracts";

export interface PageContext {
  url: string;
  hostname: string;
  pathname: string;
  document: Document;
}

export interface JobExtractor {
  readonly name: string;
  canHandle(page: PageContext): boolean;
  extract(page: PageContext): Promise<JobCandidate | null> | JobCandidate | null;
}
