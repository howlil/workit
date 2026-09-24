import { mountWorkit } from "../src/browser/mount-workit";
import { startPageObserver } from "../src/browser/page-observer";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("[Workit] Content script initializing...");
    mountWorkit();
    startPageObserver((url) => {
      console.log("[Workit] SPA navigation observed:", url);
    });
  },
});
