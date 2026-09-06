const COPILOT_TAB_URLS = [
  "https://copilot.microsoft.com/*",
  "https://*.copilot.microsoft.com/*",
  "https://copilot.com/*",
  "https://www.copilot.com/*",
  "https://www.bing.com/chat/*",
  "https://m365.cloud.microsoft/*",
  "https://m365.cloud.microsoft.com/*",
  "https://copilot.cloud.microsoft/*",
];

chrome.runtime.onInstalled.addListener(() => {
  console.debug("[CopilotSelecter] extension installed");
});

function notifyTab(tabId) {
  try {
    const result = chrome.tabs.sendMessage(tabId, { type: "REAPPLY_DEFAULT_MODEL" });
    if (result && typeof result.then === "function") {
      result.catch(() => {
        // Tab may not have a content script yet.
      });
    }
  } catch {
    // Tab may not have a content script yet.
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "REAPPLY_ALL_TABS") {
    return;
  }

  chrome.tabs.query({ url: COPILOT_TAB_URLS }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        notifyTab(tab.id);
      }
    }
    sendResponse({ ok: true, tabCount: tabs.length });
  });

  return true;
});
