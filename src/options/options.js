import { MODEL_PRESETS } from "../shared/models.js";
import { loadSettings, saveSettings } from "../shared/storage.js";

const modelSelect = document.getElementById("modelId");
const modelDescription = document.getElementById("modelDescription");
const enabledInput = document.getElementById("enabled");
const applyOnLoadInput = document.getElementById("applyOnLoad");
const applyOnNewChatInput = document.getElementById("applyOnNewChat");
const respectManualChangeMsInput = document.getElementById("respectManualChangeMs");
const presetList = document.getElementById("presetList");
const saveButton = document.getElementById("save");
const reapplyButton = document.getElementById("reapply");
const status = document.getElementById("status");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderPresetList() {
  presetList.replaceChildren();
  for (const preset of MODEL_PRESETS) {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${preset.name}</strong> — ${preset.description}`;
    presetList.appendChild(item);
  }
}

function updateDescription(modelId) {
  const preset = MODEL_PRESETS.find((item) => item.id === modelId);
  modelDescription.textContent = preset?.description ?? "";
}

function populateModels(selectedId) {
  modelSelect.replaceChildren();
  for (const preset of MODEL_PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    if (preset.id === selectedId) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  }
  updateDescription(selectedId);
}

async function init() {
  renderPresetList();
  const settings = await loadSettings();
  populateModels(settings.modelId);
  enabledInput.checked = settings.enabled;
  applyOnLoadInput.checked = settings.applyOnLoad;
  applyOnNewChatInput.checked = settings.applyOnNewChat;
  respectManualChangeMsInput.value = String(
    Math.round((settings.respectManualChangeMs ?? 15000) / 1000),
  );
}

modelSelect.addEventListener("change", () => {
  updateDescription(modelSelect.value);
});

async function handleSave() {
  try {
    const seconds = Number(respectManualChangeMsInput.value);
    await saveSettings({
      modelId: modelSelect.value,
      enabled: enabledInput.checked,
      applyOnLoad: applyOnLoadInput.checked,
      applyOnNewChat: applyOnNewChatInput.checked,
      respectManualChangeMs: Math.max(0, seconds) * 1000,
    });
    await chrome.runtime.sendMessage({ type: "REAPPLY_ALL_TABS" });
    setStatus("設定を保存し、開いている Copilot タブへ反映しました。");
  } catch (error) {
    setStatus(`保存に失敗しました: ${error.message}`, true);
  }
}

async function handleReapply() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "REAPPLY_ALL_TABS" });
    setStatus(`再適用しました（対象タブ: ${response?.tabCount ?? 0}）`);
  } catch (error) {
    setStatus(`再適用に失敗しました: ${error.message}`, true);
  }
}

saveButton.addEventListener("click", handleSave);
reapplyButton.addEventListener("click", handleReapply);

init();
