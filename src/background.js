import {
  M365_COPILOT_URL,
  isEdgeBrowser,
  isEdgeProtectedHost,
  isProtectedScriptError,
  shouldRedirectToM365,
} from "./shared/edge-hosts.js";

const STORAGE_KEY = "copilotDefaultModelSettings";
const STATUS_KEY = "copilotSelecterStatus";
const CONTENT_FILES_ISOLATED = ["src/content/shared-global.js", "src/content/applier.js"];
const CONTENT_FILES_MAIN = ["src/content/page-bridge.js"];

function looksLikeCopilotUrl(url) {
  if (!url) {
    return false;
  }
  return /copilot|bing\.com\/chat|office\.com\/chat|microsoft365\.com\/chat|m365\.cloud\.microsoft|m365copilot\.com|outlook\.office|teams\.microsoft/i.test(
    url,
  );
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || {};
}

async function recordStatus(status, extra = {}) {
  await chrome.storage.local.set({
    [STATUS_KEY]: {
      status,
      at: new Date().toISOString(),
      edge: isEdgeBrowser(),
      ...extra,
    },
  });
}

async function maybeRedirectProtectedTab(tab) {
  if (!tab?.id || !isEdgeBrowser() || !shouldRedirectToM365(tab.url)) {
    return false;
  }
  const settings = await loadSettings();
  if (settings.edgeOpenM365 === false) {
    return false;
  }
  await recordStatus("edge-redirect", {
    href: tab.url,
    to: M365_COPILOT_URL,
  });
  await chrome.tabs.update(tab.id, { url: M365_COPILOT_URL });
  return true;
}

async function injectIntoTab(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const url = tab?.url || "";

  if (isEdgeBrowser() && isEdgeProtectedHost(url)) {
    await recordStatus("edge-protected", { href: url });
    return { ok: false, protected: true, url };
  }

  let isolatedError = null;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: CONTENT_FILES_MAIN,
      world: "MAIN",
    });
  } catch {
    // MAIN world is optional; isolated applier can still click the UI.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: CONTENT_FILES_ISOLATED,
      world: "ISOLATED",
    });
  } catch (error) {
    isolatedError = error;
  }

  if (isolatedError) {
    const protectedPage = isProtectedScriptError(isolatedError) || isEdgeProtectedHost(url);
    await recordStatus(protectedPage ? "edge-protected" : "inject-failed", {
      href: url,
      error: String(isolatedError?.message || isolatedError),
    });
    return { ok: false, protected: protectedPage, url, error: String(isolatedError?.message || isolatedError) };
  }

  return { ok: true, url };
}

async function reapplyAllTabs() {
  const tabs = await chrome.tabs.query({});
  const targets = tabs.filter((tab) => tab.id && looksLikeCopilotUrl(tab.url));
  let injected = 0;
  let protectedCount = 0;
  for (const tab of targets) {
    const redirected = await maybeRedirectProtectedTab(tab);
    if (redirected) {
      continue;
    }
    const result = await injectIntoTab(tab.id);
    if (result.protected) {
      protectedCount += 1;
      continue;
    }
    if (!result.ok) {
      continue;
    }
    injected += 1;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "REAPPLY_DEFAULT_MODEL" });
    } catch {
      // Content script may still be starting.
    }
  }
  return { tabCount: injected, protectedCount };
}

chrome.runtime.onInstalled.addListener(() => {
  console.info("[CopilotSelecter] installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }
  if (!looksLikeCopilotUrl(tab.url) && !isEdgeProtectedHost(tab.url)) {
    return;
  }
  maybeRedirectProtectedTab(tab).then((redirected) => {
    if (!redirected) {
      injectIntoTab(tabId);
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REAPPLY_ALL_TABS") {
    reapplyAllTabs()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "APPLY_ACTIVE_TAB") {
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ ok: false, error: "no tab" });
      return false;
    }
    chrome.tabs
      .get(tabId)
      .then(async (tab) => {
        const redirected = await maybeRedirectProtectedTab(tab);
        if (redirected) {
          sendResponse({ ok: true, redirected: true, url: M365_COPILOT_URL });
          return;
        }
        const result = await injectIntoTab(tabId);
        if (!result.ok) {
          sendResponse(result);
          return;
        }
        try {
          await chrome.tabs.sendMessage(tabId, { type: "REAPPLY_DEFAULT_MODEL" });
        } catch {
          // Ignore.
        }
        sendResponse({ ok: true, url: result.url });
      })
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "OPEN_M365_COPILOT") {
    chrome.tabs
      .create({ url: M365_COPILOT_URL })
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});
