import { M365_COPILOT_URL, isEdgeBrowser, isEdgeProtectedHost } from "../shared/edge-hosts.js";

const STORAGE_KEY = "copilotDefaultModelSettings";

const modelSelect = document.getElementById("modelId");
const enabledInput = document.getElementById("enabled");
const saveButton = document.getElementById("save");
const applyNowButton = document.getElementById("applyNow");
const openOptionsButton = document.getElementById("openOptions");
const openM365Button = document.getElementById("openM365");
const edgeHelp = document.getElementById("edgeHelp");
const edgeHelpText = document.getElementById("edgeHelpText");
const status = document.getElementById("status");
const diag = document.getElementById("diag");

function setStatus(message, isError) {
  status.textContent = message;
  status.classList.toggle("error", Boolean(isError));
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || {};
}

async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial, enabled: Boolean(partial.enabled ?? current.enabled) };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}

async function refreshDiag() {
  const stored = await chrome.storage.local.get("copilotSelecterStatus");
  const info = stored.copilotSelecterStatus;
  if (!info) {
    diag.textContent =
      "まだ報告なし。Copilot タブを前面にして「このタブに適用」を押してください。";
    return;
  }
  diag.textContent = [
    `状態: ${info.status}`,
    `モデル: ${info.modelId || "-"}`,
    `frame: ${info.frame || "-"}`,
    `時刻: ${info.at || "-"}`,
    `URL: ${info.href || "-"}`,
    info.label ? `クリック: ${info.label}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function currentTabId() {
  const tab = await currentTab();
  return tab && tab.id ? tab.id : null;
}

function showEdgeHelp(tabUrl) {
  if (!isEdgeBrowser()) {
    edgeHelp.hidden = true;
    return;
  }
  edgeHelp.hidden = false;
  if (isEdgeProtectedHost(tabUrl)) {
    edgeHelpText.innerHTML =
      "今開いているページは Edge が保護しているため、拡張を注入できません。会社の Copilot は <strong>m365.cloud.microsoft</strong> の通常タブで使えます（Edge 152 で拡張が動く想定です）。";
  }
}

function applyResultMessage(response) {
  if (response && response.redirected) {
    return { text: "Edge の保護ページだったので M365 Copilot を開きました。読み込み後に再適用します。", error: false };
  }
  if (response && response.protected) {
    return {
      text: "この URL は Edge が保護しています。下のボタンで M365 Copilot を開いてください。",
      error: true,
    };
  }
  if (response && response.ok) {
    return { text: "このタブへ適用しました。", error: false };
  }
  return {
    text: `適用に失敗: ${response && response.error ? response.error : "unknown"}`,
    error: true,
  };
}

async function applyToTab(tabId) {
  return chrome.runtime.sendMessage({
    type: tabId ? "APPLY_ACTIVE_TAB" : "REAPPLY_ALL_TABS",
    tabId: tabId,
  });
}

async function init() {
  try {
    const settings = await loadSettings();
    if (settings.modelId) {
      modelSelect.value = settings.modelId;
    }
    if (typeof settings.enabled === "boolean") {
      enabledInput.checked = settings.enabled;
    }
    const tab = await currentTab();
    showEdgeHelp(tab && tab.url);
    await refreshDiag();
  } catch (error) {
    setStatus(`初期化エラー: ${error.message}`, true);
  }
}

async function handleSave() {
  try {
    await saveSettings({
      modelId: modelSelect.value,
      enabled: enabledInput.checked,
    });
    const tabId = await currentTabId();
    const response = await applyToTab(tabId);
    const result = applyResultMessage(response);
    setStatus(result.text.startsWith("このタブへ") ? "保存しました。このタブへ適用します。" : result.text, result.error);
    window.setTimeout(refreshDiag, 800);
  } catch (error) {
    setStatus(`保存に失敗しました: ${error.message}`, true);
  }
}

async function handleApplyNow() {
  try {
    const tabId = await currentTabId();
    if (!tabId) {
      setStatus("アクティブなタブが見つかりません", true);
      return;
    }
    await saveSettings({
      modelId: modelSelect.value,
      enabled: true,
    });
    enabledInput.checked = true;
    const response = await applyToTab(tabId);
    const result = applyResultMessage(response);
    setStatus(result.text, result.error);
    window.setTimeout(refreshDiag, 800);
  } catch (error) {
    setStatus(`適用に失敗しました: ${error.message}`, true);
  }
}

saveButton.addEventListener("click", handleSave);
applyNowButton.addEventListener("click", handleApplyNow);
openM365Button.addEventListener("click", async function () {
  await chrome.tabs.create({ url: M365_COPILOT_URL });
});
openOptionsButton.addEventListener("click", function () {
  chrome.runtime.openOptionsPage();
});
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "local" && changes.copilotSelecterStatus) {
    refreshDiag();
  }
});

init();
