export default defineBackground(() => {
  console.log("[Workit] Service worker started");

  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("workspace.html") });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === "OPEN_WORKSPACE") {
      chrome.tabs.create({ url: chrome.runtime.getURL("workspace.html") });
      sendResponse({ success: true });
    }
  });
});
