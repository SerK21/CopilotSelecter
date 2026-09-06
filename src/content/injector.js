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
      console.debug("[Copilot Default Model] sessionStorage write failed", error);
    }
  }

  async function bootstrap() {
    const settings = await readSettings();
    if (!settings?.enabled || !settings.applyOnLoad) {
      return;
    }

    const preset = getPresetById(settings.modelId);
    if (preset.modeKey) {
      applySessionMode(preset.modeKey);
    }
  }

  bootstrap();
})();
