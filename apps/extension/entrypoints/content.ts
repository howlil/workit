export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("[Workit] Content script loaded");
  },
});
