import { MODEL_PRESETS } from "../shared/models.js";
import { loadSettings, saveSettings } from "../shared/storage.js";

const modelSelect = document.getElementById("modelId");
const enabledInput = document.getElementById("enabled");
const saveButton = document.getElementById("save");
const openOptionsButton = document.getElementById("openOptions");
const status = document.getElementById("status");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function populateModels(selectedId) {
  modelSelect.replaceChildren();
  for (const preset of MODEL_PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    option.title = preset.description;
    if (preset.id === selectedId) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  }
}

async function init() {
  const settings = await loadSettings();
  populateModels(settings.modelId);
  enabledInput.checked = settings.enabled;
}

async function handleSave() {
  try {
    await saveSettings({
      modelId: modelSelect.value,
      enabled: enabledInput.checked,
    });
    await chrome.runtime.sendMessage({ type: "REAPPLY_ALL_TABS" });
    setStatus("保存しました。開いている Copilot タブに反映します。");
  } catch (error) {
    setStatus(`保存に失敗しました: ${error.message}`, true);
  }
}

saveButton.addEventListener("click", handleSave);
openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
