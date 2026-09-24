import { mountWorkit } from "../src/browser/mount-workit";
import { startPageObserver } from "../src/browser/page-observer";
import { contextController } from "../src/browser/context-controller";
import { createCurrentPageContext, defaultJobDetector } from "../src/capture/job-detector";
import { workitApiClient } from "../src/runtime/api-client";

async function runDetection(): Promise<void> {
  try {
    const pageContext = createCurrentPageContext();
    const candidate = await defaultJobDetector.detect(pageContext);
    if (candidate) {
      console.log("[Workit] Job detected:", candidate.title, "@", candidate.company);
      const check = await workitApiClient.checkOpportunity(candidate.source.canonicalUrl);
      if (check.exists && check.opportunityId) {
        contextController.setBrowserContext({
          type: "saved-job",
          opportunityId: check.opportunityId,
        });
      } else {
        contextController.setBrowserContext({
          type: "job",
          candidate,
        });
      }
    } else {
      const current = contextController.getBrowserContext();
      if (current.type !== "saved-job") {
        contextController.setBrowserContext({ type: "ordinary" });
      }
    }
  } catch (err) {
    console.warn("[Workit] Detection error:", err);
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("[Workit] Content script initializing...");
    mountWorkit();
    void runDetection();
    startPageObserver(() => {
      void runDetection();
    });
  },
});
