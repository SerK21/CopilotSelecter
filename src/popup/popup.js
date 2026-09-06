const STORAGE_KEY = "copilotDefaultModelSettings";

const modelSelect = document.getElementById("modelId");
const enabledInput = document.getElementById("enabled");
const saveButton = document.getElementById("save");
const applyNowButton = document.getElementById("applyNow");
const openOptionsButton = document.getElementById("openOptions");
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

async function currentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && tab.id ? tab.id : null;
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
    setStatus(
      response && response.ok
        ? "保存しました。このタブへ適用します。"
        : `適用に失敗: ${response && response.error ? response.error : "unknown"}`,
      !(response && response.ok),
    );
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
    setStatus(
      response && response.ok ? "このタブに適用しました。" : `失敗: ${response && response.error ? response.error : "unknown"}`,
      !(response && response.ok),
    );
    window.setTimeout(refreshDiag, 800);
  } catch (error) {
    setStatus(`適用に失敗しました: ${error.message}`, true);
  }
}

saveButton.addEventListener("click", handleSave);
applyNowButton.addEventListener("click", handleApplyNow);
openOptionsButton.addEventListener("click", function () {
  chrome.runtime.openOptionsPage();
});
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "local" && changes.copilotSelecterStatus) {
    refreshDiag();
  }
});

init();
