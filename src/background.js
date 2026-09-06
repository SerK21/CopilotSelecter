chrome.runtime.onInstalled.addListener(() => {
  console.debug("[Copilot Default Model] extension installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "REAPPLY_ALL_TABS") {
    return;
  }

  chrome.tabs.query(
    {
      url: [
        "https://copilot.microsoft.com/*",
        "https://copilot.com/*",
        "https://www.bing.com/chat/*",
        "https://m365.cloud.microsoft/*",
      ],
    },
    (tabs) => {
      for (const tab of tabs) {
        if (!tab.id) {
          continue;
        }
        chrome.tabs.sendMessage(tab.id, { type: "REAPPLY_DEFAULT_MODEL" }).catch(() => {
          // Tab may not have a content script yet.
        });
      }
      sendResponse({ ok: true, tabCount: tabs.length });
    },
  );

  return true;
});
