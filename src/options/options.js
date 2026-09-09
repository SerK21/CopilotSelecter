const STORAGE_KEY = "copilotDefaultModelSettings";

const modelSelect = document.getElementById("modelId");
const enabledInput = document.getElementById("enabled");
const applyOnLoadInput = document.getElementById("applyOnLoad");
const applyOnNewChatInput = document.getElementById("applyOnNewChat");
const edgeOpenM365Input = document.getElementById("edgeOpenM365");
const respectManualChangeMsInput = document.getElementById("respectManualChangeMs");
const saveButton = document.getElementById("save");
const reapplyButton = document.getElementById("reapply");
const status = document.getElementById("status");

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
  const next = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}

async function init() {
  const settings = await loadSettings();
  if (settings.modelId) {
    modelSelect.value = settings.modelId;
  }
  enabledInput.checked = settings.enabled !== false;
  applyOnLoadInput.checked = settings.applyOnLoad !== false;
  applyOnNewChatInput.checked = settings.applyOnNewChat !== false;
  edgeOpenM365Input.checked = settings.edgeOpenM365 !== false;
  respectManualChangeMsInput.value = String(
    Math.round((settings.respectManualChangeMs || 15000) / 1000),
  );
}

async function handleSave() {
  try {
    const seconds = Number(respectManualChangeMsInput.value);
    await saveSettings({
      modelId: modelSelect.value,
      enabled: enabledInput.checked,
      applyOnLoad: applyOnLoadInput.checked,
      applyOnNewChat: applyOnNewChatInput.checked,
      edgeOpenM365: edgeOpenM365Input.checked,
      respectManualChangeMs: Math.max(0, seconds) * 1000,
    });
    const response = await chrome.runtime.sendMessage({ type: "REAPPLY_ALL_TABS" });
    setStatus(
      `設定を保存しました（対象タブ: ${response && response.tabCount ? response.tabCount : 0}）`,
    );
  } catch (error) {
    setStatus(`保存に失敗しました: ${error.message}`, true);
  }
}

async function handleReapply() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "REAPPLY_ALL_TABS" });
    setStatus(`再適用しました（対象タブ: ${response && response.tabCount ? response.tabCount : 0}）`);
  } catch (error) {
    setStatus(`再適用に失敗しました: ${error.message}`, true);
  }
}

saveButton.addEventListener("click", handleSave);
reapplyButton.addEventListener("click", handleReapply);
init();
