const CONTENT_FILES_ISOLATED = ["src/content/shared-global.js", "src/content/applier.js"];
const CONTENT_FILES_MAIN = ["src/content/page-bridge.js"];

function looksLikeCopilotUrl(url) {
  if (!url) {
    return false;
  }
  return /copilot|bing\.com\/chat|office\.com\/chat|microsoft365\.com\/chat|m365\.cloud\.microsoft|outlook\.office|teams\.microsoft/i.test(
    url,
  );
}

async function injectIntoTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: CONTENT_FILES_MAIN,
      world: "MAIN",
    });
  } catch {
    // Frame may be inaccessible.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: CONTENT_FILES_ISOLATED,
      world: "ISOLATED",
    });
  } catch {
    // Frame may be inaccessible.
  }
}

async function reapplyAllTabs() {
  const tabs = await chrome.tabs.query({});
  const targets = tabs.filter((tab) => tab.id && looksLikeCopilotUrl(tab.url));
  await Promise.all(targets.map((tab) => injectIntoTab(tab.id)));
  await Promise.all(
    targets.map(async (tab) => {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "REAPPLY_DEFAULT_MODEL" });
      } catch {
        // Content script may still be starting.
      }
    }),
  );
  return targets.length;
}

chrome.runtime.onInstalled.addListener(() => {
  console.info("[CopilotSelecter] installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }
  if (!looksLikeCopilotUrl(tab.url)) {
    return;
  }
  injectIntoTab(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "REAPPLY_ALL_TABS") {
    reapplyAllTabs()
      .then((tabCount) => sendResponse({ ok: true, tabCount }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "APPLY_ACTIVE_TAB") {
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ ok: false, error: "no tab" });
      return false;
    }
    injectIntoTab(tabId)
      .then(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, { type: "REAPPLY_DEFAULT_MODEL" });
        } catch {
          // Ignore.
        }
        sendResponse({ ok: true });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});
