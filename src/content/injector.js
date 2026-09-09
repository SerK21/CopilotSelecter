(function bootstrapInjector() {
  const { getPresetById, SESSION_MODE_KEY } = globalThis.CopilotDefaultModel;
  const SETTINGS_KEY = "copilotDefaultModelSettings";

  async function readSettings() {
    if (!chrome?.storage?.sync) {
      return null;
    }

    const stored = await chrome.storage.sync.get(SETTINGS_KEY);
    return stored[SETTINGS_KEY] ?? null;
  }

  function applySessionMode(modeKey) {
    if (!modeKey) {
      return;
    }

    try {
      const current = sessionStorage.getItem(SESSION_MODE_KEY);
      const next = JSON.stringify(modeKey);
      if (current === next) {
        return;
      }
      sessionStorage.setItem(SESSION_MODE_KEY, next);
    } catch (error) {
      console.debug("[CopilotSelecter] sessionStorage write failed", error);
    }
  }

  async function bootstrap() {
    const settings = await readSettings();
    if (!settings?.enabled || !settings.applyOnLoad) {
      return;
    }

    // Do not write sticky mode until the picker UI exists. Writing at
    // document_start makes Copilot start switching before the selector loads.
    const started = Date.now();
    const timer = window.setInterval(() => {
      const switcher = document.getElementById("gptModeSwitcher");
      const label = (
        switcher?.innerText ||
        switcher?.textContent ||
        switcher?.getAttribute("aria-label") ||
        ""
      ).replace(/\s+/g, " ").trim();
      const ready = globalThis.CopilotDefaultModel.triggerLooksLoaded(label);
      if (!ready) {
        if (Date.now() - started > 45000) {
          window.clearInterval(timer);
        }
        return;
      }
      window.clearInterval(timer);
      const preset = getPresetById(settings.modelId);
      if (preset.modeKey) {
        applySessionMode(preset.modeKey);
      }
    }, 200);
  }

  bootstrap();
})();
