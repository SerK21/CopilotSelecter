const STORAGE_KEY = "copilotDefaultModelSettings";

const modelSelect = document.getElementById("modelId");
const enabledInput = document.getElementById("enabled");
const applyOnLoadInput = document.getElementById("applyOnLoad");
const applyOnNewChatInput = document.getElementById("applyOnNewChat");
const edgeOpenM365Input = document.getElementById("edgeOpenM365");
const respectManualChangeMsInput = document.getElementById("respectManualChangeMs");
const saveButton = document.getElementById("save");
const reapplyButton = document.getElementById("reapply");
const addCustomButton = document.getElementById("addCustom");
const customNameInput = document.getElementById("customName");
const customMatchInput = document.getElementById("customMatch");
const customParentInput = document.getElementById("customParent");
const customList = document.getElementById("customList");
const status = document.getElementById("status");
let customModels = [];

function setStatus(message, isError) {
  status.textContent = message;
  status.classList.toggle("error", Boolean(isError));
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const current = { ...(stored[STORAGE_KEY] || {}) };
  if ((current.settingsRevision ?? 0) < 3 && (!current.modelId || current.modelId === "gpt-thinking")) {
    current.modelId = "gpt-sol";
    current.settingsRevision = 3;
    await chrome.storage.sync.set({ [STORAGE_KEY]: current });
  }
  return current;
}

async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}

function fillCustomOptions(selectedId) {
  const existing = modelSelect.querySelector('optgroup[label="カスタム"]');
  if (existing) {
    existing.remove();
  }
  if (!customModels.length) {
    return;
  }
  const group = document.createElement("optgroup");
  group.label = "カスタム";
  for (const model of customModels) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name || model.matchText;
    group.appendChild(option);
  }
  modelSelect.appendChild(group);
  if (selectedId) {
    modelSelect.value = selectedId;
  }
}

function renderCustomList() {
  customList.replaceChildren();
  for (const model of customModels) {
    const item = document.createElement("li");
    const parent = model.parentText ? `（親: ${model.parentText}）` : "";
    item.textContent = `${model.name} — メニュー「${model.matchText}」${parent} `;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "削除";
    remove.addEventListener("click", () => {
      customModels = customModels.filter((entry) => entry.id !== model.id);
      if (modelSelect.value === model.id) {
        modelSelect.value = "gpt-sol";
      }
      fillCustomOptions(modelSelect.value);
      renderCustomList();
    });
    item.appendChild(remove);
    customList.appendChild(item);
  }
}

async function init() {
  const settings = await loadSettings();
  customModels = Array.isArray(settings.customModels) ? settings.customModels : [];
  fillCustomOptions(settings.modelId);
  if (settings.modelId) {
    modelSelect.value = settings.modelId;
  }
  renderCustomList();
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
      customModels,
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

addCustomButton.addEventListener("click", () => {
  const matchText = customMatchInput.value.replace(/\s+/g, " ").trim();
  const name = customNameInput.value.replace(/\s+/g, " ").trim() || matchText;
  const parentText = customParentInput.value.replace(/\s+/g, " ").trim();
  if (!matchText) {
    setStatus("メニューに出ている文字列を入力してください。", true);
    return;
  }
  const model = {
    id: `custom-${Date.now()}`,
    name,
    matchText,
    parentText,
  };
  customModels = [...customModels, model];
  fillCustomOptions(model.id);
  modelSelect.value = model.id;
  renderCustomList();
  customNameInput.value = "";
  customMatchInput.value = "";
  customParentInput.value = "";
  setStatus("追加しました。設定を保存すると反映されます。");
});

saveButton.addEventListener("click", handleSave);
reapplyButton.addEventListener("click", handleReapply);
init();
