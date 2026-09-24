import type {
  JobCandidate,
  SaveOpportunityResponse,
  OpportunityCheckResponse,
} from "@workit/contracts";
import { normalizeUrl } from "@workit/domain";

const DEFAULT_API_BASE = "http://localhost:8787";

export class WorkitApiClient {
  constructor(private baseUrl: string = DEFAULT_API_BASE) {}

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, "");
  }

  async saveOpportunity(
    candidate: JobCandidate,
    userId = "usr_default"
  ): Promise<SaveOpportunityResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/opportunities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ candidate }),
      });

      if (res.ok) {
        const data = (await res.json()) as SaveOpportunityResponse;
        await this.recordSavedLocally(candidate.source.canonicalUrl, data.opportunityId);
        return data;
      }
    } catch {
      // Backend offline; fallback to local storage
    }

    // Fallback persistence for offline or standalone extension testing
    const fallbackId = `opp_${Date.now()}`;
    await this.recordSavedLocally(candidate.source.canonicalUrl, fallbackId);

    return {
      opportunityId: fallbackId,
      state: "saved",
      snapshotId: `snap_${Date.now()}`,
      isDuplicate: false,
    };
  }

  async checkOpportunity(
    url: string,
    userId = "usr_default"
  ): Promise<OpportunityCheckResponse> {
    try {
      const endpoint = `${this.baseUrl}/api/opportunities/check?url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint, {
        headers: { "x-user-id": userId },
      });

      if (res.ok) {
        const data = (await res.json()) as OpportunityCheckResponse;
        if (data.exists) {
          return data;
        }
      }
    } catch {
      // Fall through to local cache
    }

    return this.checkSavedLocally(url);
  }

  private async recordSavedLocally(url: string, id: string): Promise<void> {
    const key = `workit_saved_${normalizeUrl(url)}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: id });
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, id);
    }
  }

  private async checkSavedLocally(url: string): Promise<OpportunityCheckResponse> {
    const key = `workit_saved_${normalizeUrl(url)}`;
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const items = await chrome.storage.local.get(key);
      if (items && items[key]) {
        return { exists: true, opportunityId: items[key], state: "saved" };
      }
    } else if (typeof localStorage !== "undefined") {
      const val = localStorage.getItem(key);
      if (val) {
        return { exists: true, opportunityId: val, state: "saved" };
      }
    }
    return { exists: false };
  }
}

export const workitApiClient = new WorkitApiClient();
