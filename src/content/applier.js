(function bootstrapApplier() {
  const {
    getPresetById,
    labelMatches,
    scoreLabelMatch,
    SESSION_MODE_KEY,
    loadSettings,
  } = globalThis.CopilotDefaultModel;
  const { isRendered, queryAllDeep, queryDeep } = globalThis.CopilotSelecterDom;

  const LOG_PREFIX = "[CopilotSelecter]";
  const PICKER_TEST_IDS = [
    "mode-picker-dropdown",
    "composer-chat-mode-dropdown",
    "chat-mode-dropdown",
    "model-picker-dropdown",
  ];

  let manualOverrideUntil = 0;
  let respectManualChangeMs = 15000;
  let lastAppliedSignature = "";
  let observer = null;
  let debounceTimer = null;

  function log(...args) {
    console.debug(LOG_PREFIX, ...args);
  }

  function isInteractive(element) {
    return isRendered(element);
  }

  function getVisibleText(element) {
    return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function readCurrentPickerLabel() {
    for (const testId of PICKER_TEST_IDS) {
      const trigger = queryDeep(`[data-testid="${testId}"]`);
      if (trigger) {
        const text =
          trigger.getAttribute("title") ||
          trigger.getAttribute("aria-label") ||
          getVisibleText(trigger);
        if (text) {
          return text;
        }
      }
    }

    const headerButton =
      queryDeep('button[aria-haspopup="menu"][data-testid*="mode"]') ||
      queryDeep('button[aria-haspopup="menu"][aria-label*="mode" i]') ||
      queryDeep('button[aria-haspopup="listbox"]');
    if (headerButton) {
      return (
        headerButton.getAttribute("title") ||
        headerButton.getAttribute("aria-label") ||
        getVisibleText(headerButton)
      );
    }

    return "";
  }

  function isAlreadySelected(preset) {
    const currentLabel = readCurrentPickerLabel();
    if (!currentLabel) {
      return false;
    }

    return labelMatches(currentLabel, preset.matchLabels);
  }

  function applySessionMode(modeKey) {
    if (!modeKey) {
      return;
    }

    try {
      sessionStorage.setItem(SESSION_MODE_KEY, JSON.stringify(modeKey));
    } catch (error) {
      log("sessionStorage update failed", error);
    }
  }

  function findMenuItems() {
    const selectors = [
      '[data-testid$="-menu"] [role="menuitem"]',
      '[role="menu"] [role="menuitem"]',
      '[data-radix-menu-content] [role="menuitem"]',
    ];

    for (const selector of selectors) {
      const items = queryAllDeep(selector).filter(isInteractive);
      if (items.length > 0) {
        return items;
      }
    }

    return [];
  }

  function findBestMenuItem(preset) {
    const items = findMenuItems();
    let bestItem = null;
    let bestScore = 0;

    for (const item of items) {
      const label =
        item.getAttribute("title") ||
        item.getAttribute("aria-label") ||
        getVisibleText(item);
      const score = scoreLabelMatch(label, preset.matchLabels);
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return bestScore > 0 ? bestItem : null;
  }

  function openPicker() {
    for (const testId of PICKER_TEST_IDS) {
      const trigger = queryDeep(`[data-testid="${testId}"]`);
      if (isInteractive(trigger)) {
        trigger.click();
        return true;
      }
    }

    const fallback =
      queryDeep('button[aria-haspopup="menu"][data-testid*="mode"]') ||
      queryDeep('button[aria-haspopup="menu"][aria-label*="model" i]') ||
      queryDeep('button[aria-haspopup="menu"][aria-label*="モード"]');
    if (isInteractive(fallback)) {
      fallback.click();
      return true;
    }

    return false;
  }

  function clickComposerModeButton(preset) {
    const buttons = queryAllDeep('[data-testid^="composer-chat-mode-"]');
    for (const button of buttons) {
      const label =
        button.getAttribute("title") ||
        button.getAttribute("aria-label") ||
        getVisibleText(button);
      if (labelMatches(label, preset.matchLabels) && isInteractive(button)) {
        button.click();
        return true;
      }
    }
    return false;
  }

  function markManualOverride() {
    manualOverrideUntil = Date.now() + respectManualChangeMs;
  }

  function attachManualOverrideListeners() {
    const selectors = [
      ...PICKER_TEST_IDS.map((id) => `[data-testid="${id}"]`),
      '[data-testid^="composer-chat-mode-"]',
      '[data-testid$="-menu"] [role="menuitem"]',
    ].join(",");

    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        if (target.closest(selectors)) {
          markManualOverride();
        }
      },
      true,
    );
  }

  async function applyPreset(settings) {
    if (!settings.enabled) {
      return;
    }

    if (Date.now() < manualOverrideUntil) {
      return;
    }

    const preset = getPresetById(settings.modelId);
    const signature = `${preset.id}:${location.pathname}`;
    if (signature === lastAppliedSignature && isAlreadySelected(preset)) {
      return;
    }

    if (isAlreadySelected(preset)) {
      lastAppliedSignature = signature;
      return;
    }

    if (preset.modeKey) {
      applySessionMode(preset.modeKey);
    }

    if (clickComposerModeButton(preset)) {
      lastAppliedSignature = signature;
      log("applied via composer button", preset.id);
      return;
    }

    const opened = openPicker();
    if (!opened) {
      return;
    }

    window.setTimeout(() => {
      const menuItem = findBestMenuItem(preset);
      if (menuItem) {
        menuItem.click();
        lastAppliedSignature = signature;
        log("applied via picker menu", preset.id);
        return;
      }

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    }, 120);
  }

  function scheduleApply(settings) {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      applyPreset(settings);
    }, 250);
  }

  async function start() {
    const settings = await loadSettings();
    respectManualChangeMs = settings.respectManualChangeMs ?? 15000;
    if (!settings.enabled) {
      log("disabled");
      return;
    }

    attachManualOverrideListeners();
    scheduleApply(settings);

    observer = new MutationObserver(() => scheduleApply(settings));
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes.copilotDefaultModelSettings) {
        return;
      }

      const next = {
        ...settings,
        ...changes.copilotDefaultModelSettings.newValue,
      };
      Object.assign(settings, next);
      respectManualChangeMs = settings.respectManualChangeMs ?? 15000;
      lastAppliedSignature = "";
      scheduleApply(settings);
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "REAPPLY_DEFAULT_MODEL") {
        lastAppliedSignature = "";
        manualOverrideUntil = 0;
        scheduleApply(settings);
      }
    });

    let previousPath = location.pathname;
    window.setInterval(() => {
      if (location.pathname !== previousPath) {
        previousPath = location.pathname;
        if (settings.applyOnNewChat) {
          lastAppliedSignature = "";
          scheduleApply(settings);
        }
      }
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
