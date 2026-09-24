export type DuplicateMatchStrategy =
  | "provider_id"
  | "canonical_url"
  | "company_title_location";

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  existingOpportunityId?: string;
  strategy?: DuplicateMatchStrategy;
}

export interface CandidateIdentity {
  provider?: string;
  sourceJobId?: string;
  canonicalUrl: string;
  company?: string;
  title?: string;
  location?: string;
}

export interface ExistingOpportunitySummary {
  id: string;
  sourceProvider?: string;
  sourceJobId?: string;
  canonicalUrl: string;
  company: string;
  title: string;
  location?: string;
}

/**
 * Normalizes a URL by stripping tracking query params and trailing slashes.
 */
export function normalizeUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    // Remove common tracking parameters
    const paramsToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (
        lower.startsWith("utm_") ||
        lower === "ref" ||
        lower === "source" ||
        lower === "fbclid" ||
        lower === "gclid"
      ) {
        paramsToDelete.push(key);
      }
    });
    for (const key of paramsToDelete) {
      url.searchParams.delete(key);
    }
    // Remove trailing slash from pathname
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;
    return url.toString();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function normalizeText(text: string | undefined): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Checks if a candidate already exists among existing opportunities.
 * Evaluates in priority order:
 * 1. provider + sourceJobId
 * 2. canonicalUrl
 * 3. normalized company + title + location
 */
export function findDuplicate(
  candidate: CandidateIdentity,
  existing: ExistingOpportunitySummary[]
): DuplicateMatchResult {
  // 1. Priority 1: Provider + sourceJobId
  if (candidate.provider && candidate.sourceJobId) {
    const match = existing.find(
      (opp) =>
        opp.sourceProvider === candidate.provider &&
        opp.sourceJobId === candidate.sourceJobId
    );
    if (match) {
      return {
        isDuplicate: true,
        existingOpportunityId: match.id,
        strategy: "provider_id",
      };
    }
  }

  // 2. Priority 2: Canonical URL (normalized)
  const normalizedCandidateUrl = normalizeUrl(candidate.canonicalUrl);
  const urlMatch = existing.find(
    (opp) => normalizeUrl(opp.canonicalUrl) === normalizedCandidateUrl
  );
  if (urlMatch) {
    return {
      isDuplicate: true,
      existingOpportunityId: urlMatch.id,
      strategy: "canonical_url",
    };
  }

  // 3. Priority 3: Fuzzy company + title + location
  if (candidate.company && candidate.title) {
    const targetComp = normalizeText(candidate.company);
    const targetTitle = normalizeText(candidate.title);
    const targetLoc = normalizeText(candidate.location);

    const fuzzyMatch = existing.find((opp) => {
      const oppComp = normalizeText(opp.company);
      const oppTitle = normalizeText(opp.title);
      const oppLoc = normalizeText(opp.location);

      if (oppComp !== targetComp || oppTitle !== targetTitle) {
        return false;
      }

      // If location is provided on both, require it to match
      if (targetLoc && oppLoc) {
        return oppLoc === targetLoc;
      }
      return true;
    });

    if (fuzzyMatch) {
      return {
        isDuplicate: true,
        existingOpportunityId: fuzzyMatch.id,
        strategy: "company_title_location",
      };
    }
  }

  return { isDuplicate: false };
}
