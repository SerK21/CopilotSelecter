import { DEFAULT_SETTINGS } from "./models.js";

export const STORAGE_KEY = "copilotDefaultModelSettings";

export async function loadSettings() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEY] ?? {}) };
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}
