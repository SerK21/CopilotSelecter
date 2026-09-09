(function bootstrapApplier() {
  if (globalThis.__copilotSelecterApplier) {
    return;
  }
  globalThis.__copilotSelecterApplier = true;

  const api = globalThis.CopilotDefaultModel;
  if (!api) {
    return;
  }

  const {
    getPresetById,
    labelMatches,
    scoreLabelMatch,
    normalizeLabel,
    SESSION_MODE_KEY,
    loadSettings,
    triggerLooksLoaded,
    menuLooksPopulated,
  } = api;

  const LOG_PREFIX = "[CopilotSelecter]";
  const STATUS_KEY = "copilotSelecterStatus";
  const ACT_EVENT = "copilot-selecter-act";
  const TRIGGER_LABELS = [
    "自動",
    "Auto",
    "Smart",
    "クイック応答",
    "Quick response",
    "Think Deeper",
    "Think deeper",
    "GPT 5.6",
    "GPT 5.5",
    "Sonnet",
    "Opus",
  ];

  let applying = false;
  let applyAttempts = 0;
  let lastAppliedSignature = "";
  let settingsCache = null;
  let debounceTimer = null;
  let silentStyle = null;
  let pickerStable = { label: "", since: 0 };
  let waitTimer = null;

  function log(...args) {
    console.info(LOG_PREFIX, ...args);
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });
  }

  function setSilentUi(enabled) {
    if (enabled) {
      document.documentElement.setAttribute("data-cdm-silent", "1");
      if (!silentStyle) {
        silentStyle = document.createElement("style");
        silentStyle.id = "cdm-silent-style";
        silentStyle.textContent = `
html[data-cdm-silent] [role="menu"],
html[data-cdm-silent] [class*="MenuPopover"],
html[data-cdm-silent] [class*="fui-MenuPopover"],
html[data-cdm-silent] [class*="fui-MenuList"] {
  transform: translate3d(-120vw, 0, 0) !important;
}
`;
        document.documentElement.appendChild(silentStyle);
      }
      return;
    }
    document.documentElement.removeAttribute("data-cdm-silent");
  }

  async function report(status, extra = {}) {
    const payload = {
      status,
      href: location.href,
      frame: window === window.top ? "top" : "iframe",
      at: new Date().toISOString(),
      ...extra,
    };
    log(status, payload);
    try {
      await chrome.storage.local.set({ [STATUS_KEY]: payload });
    } catch {
      // Ignore storage failures in restricted frames.
    }
  }

  function isVisible(element) {
    if (!(element instanceof Element)) {
      return false;
    }
    if (element.getAttribute("aria-disabled") === "true" || element.disabled) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  }

  function walkElements(root, visit) {
    const tree = root.querySelectorAll ? [root, ...root.querySelectorAll("*")] : [root];
    for (const element of tree) {
      if (!(element instanceof Element)) {
        continue;
      }
      visit(element);
      if (element.shadowRoot) {
        walkElements(element.shadowRoot, visit);
      }
    }
  }

  function allElements() {
    const items = [];
    walkElements(document.documentElement, (element) => items.push(element));
    return items;
  }

  function visibleText(element) {
    const inner = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
    if (inner) {
      return inner;
    }
    return (
      element.getAttribute?.("aria-label") ||
      element.getAttribute?.("title") ||
      ""
    ).replace(/\s+/g, " ").trim();
  }

  function looksLikeCopilot() {
    const href = location.href;
    if (/copilot|bing\.com\/chat|office\.com\/chat|microsoft365\.com\/chat|m365\.cloud\.microsoft/i.test(href)) {
      return true;
    }
    if (document.querySelector('[data-testid="mode-picker-dropdown"], [data-testid="composer-chat-mode-dropdown"]')) {
      return true;
    }
    const snippet = document.body?.innerText?.slice(0, 8000) || "";
    return snippet.includes("Work IQ");
  }

  function findBestByText(patterns, excludeLabels = [], { preferShort = true, skipWorkIq = true } = {}) {
    let best = null;
    let bestScore = 0;
    let bestLength = Infinity;

    for (const element of allElements()) {
      if (!isVisible(element)) {
        continue;
      }
      const label = visibleText(element);
      if (!label || label.length > 180) {
        continue;
      }
      if (skipWorkIq && /work iq/i.test(label)) {
        continue;
      }
      const score = scoreLabelMatch(label, patterns, excludeLabels);
      if (score <= 0) {
        continue;
      }
      const length = normalizeLabel(label).length;
      if (score > bestScore || (preferShort && score === bestScore && length < bestLength)) {
        best = element;
        bestScore = score;
        bestLength = length;
      }
    }

    return bestScore > 0 ? best : null;
  }

  function clickableAncestor(element) {
    let node = element;
    for (let depth = 0; depth < 6 && node; depth += 1) {
      if (
        node.matches?.(
          'button, a, [role="button"], [role="menuitem"], [role="menuitemradio"], [role="option"], [role="combobox"], [tabindex]',
        )
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return element;
  }

  function pageAct(element, action) {
    const target = clickableAncestor(element);
    const token = `cdm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    target.setAttribute("data-cdm-token", token);
    target.dispatchEvent(
      new CustomEvent(ACT_EVENT, {
        bubbles: true,
        composed: true,
        detail: { action, token },
      }),
    );
    if (action === "click" && typeof target.click === "function") {
      target.click();
    }
  }

  function pageKey(key) {
    document.dispatchEvent(
      new CustomEvent(ACT_EVENT, {
        bubbles: true,
        composed: true,
        detail: { action: "key", key },
      }),
    );
  }

  async function waitForPopulatedMenu(timeoutMs = 1800) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const items = visibleMenuItems();
      const labels = items.map((item) => visibleText(item));
      if (menuLooksPopulated(labels)) {
        return items;
      }
      await wait(50);
    }
    return [];
  }

  function visibleMenuItems() {
    return allElements().filter((element) => {
      if (!isVisible(element)) {
        return false;
      }
      const role = element.getAttribute("role");
      return role === "menuitem" || role === "menuitemradio" || role === "option";
    });
  }

  async function keyboardSelect(preset) {
    const paths = {
      smart: { downs: 0 },
      quick: { downs: 1 },
      reasoning: { downs: 2 },
      "gpt-thinking": { downs: 3, right: true, subDowns: 0 },
      "gpt-quick": { downs: 3, right: true, subDowns: 1 },
      "gpt-55-quick": { downs: 3, right: true, subDowns: 2 },
      sonnet: { downs: 4, right: true, subDowns: 0 },
      opus: { downs: 4, right: true, subDowns: 1 },
    };
    const path = paths[preset.id];
    if (!path) {
      return false;
    }

    pageKey("Home");
    await nextFrame();
    for (let i = 0; i < path.downs; i += 1) {
      pageKey("ArrowDown");
      await nextFrame();
    }
    if (path.right) {
      pageKey("ArrowRight");
      await nextFrame();
      for (let i = 0; i < path.subDowns; i += 1) {
        pageKey("ArrowDown");
        await nextFrame();
      }
    }
    pageKey("Enter");
    await report("clicked-keyboard", { modelId: preset.id, path });
    return true;
  }

  function applySessionMode(modeKey) {
    if (!modeKey) {
      return;
    }
    try {
      sessionStorage.setItem(SESSION_MODE_KEY, JSON.stringify(modeKey));
    } catch (error) {
      log("sessionStorage failed", error);
    }
  }

  function isBusy(element) {
    if (!(element instanceof Element)) {
      return true;
    }
    if (element.disabled || element.getAttribute("aria-disabled") === "true") {
      return true;
    }
    if (element.getAttribute("aria-busy") === "true") {
      return true;
    }
    if (element.closest?.('[aria-busy="true"], [data-is-loading="true"]')) {
      return true;
    }
    return Boolean(element.querySelector?.('[class*="Spinner"], [role="progressbar"]'));
  }

  function isPickerReady(trigger = findPickerTrigger()) {
    if (!trigger || !isVisible(trigger) || isBusy(trigger)) {
      return false;
    }
    return triggerLooksLoaded(visibleText(trigger));
  }

  function isPickerStable(trigger) {
    if (!isPickerReady(trigger)) {
      pickerStable = { label: "", since: 0 };
      return false;
    }
    const label = visibleText(trigger);
    const now = Date.now();
    if (label !== pickerStable.label) {
      pickerStable = { label, since: now };
      return false;
    }
    return now - pickerStable.since >= 400;
  }

  function findPickerTrigger() {
    const byId = document.getElementById("gptModeSwitcher");
    if (byId && isVisible(byId)) {
      return byId;
    }

    return [...document.querySelectorAll('button[aria-haspopup="menu"]')].find((button) => {
      const label = button.getAttribute("aria-label") || "";
      return /モデル\s*セレクター|model selector/i.test(label) && isVisible(button);
    }) || null;
  }

  async function openPicker() {
    const trigger = findPickerTrigger();
    if (!trigger) {
      return false;
    }
    pageAct(trigger, "click");
    await wait(250);
    return true;
  }

  function alreadyApplied(preset) {
    const trigger = findPickerTrigger();
    if (!trigger) {
      return false;
    }
    return scoreLabelMatch(visibleText(trigger), preset.matchLabels, preset.excludeLabels || []) >= 80;
  }

  async function applyViaUi(preset) {
    const trigger = findPickerTrigger();
    if (!trigger || !isPickerReady(trigger)) {
      await report("picker-not-found", {
        modelId: preset.id,
        hasSwitcher: Boolean(document.getElementById("gptModeSwitcher")),
        trigger: trigger ? visibleText(trigger) : "",
        ready: isPickerReady(trigger),
      });
      return false;
    }

    if (alreadyApplied(preset)) {
      await report("already-selected", { modelId: preset.id, trigger: visibleText(trigger) });
      return true;
    }

    setSilentUi(true);
    try {
      pageAct(trigger, "click");
      const items = await waitForPopulatedMenu(1800);
      const itemLabels = items.map((item) => visibleText(item)).slice(0, 12);

      if (!menuLooksPopulated(itemLabels) && items.length === 0) {
        await report("menu-not-ready", {
          modelId: preset.id,
          trigger: visibleText(trigger),
        });
        return false;
      }

      if (items.length > 0) {
        if (preset.parentLabels?.length) {
          const parent =
            items.find((item) => scoreLabelMatch(visibleText(item), preset.parentLabels) > 0) ||
            findBestByText(preset.parentLabels);
          if (parent) {
            pageAct(parent, "hover");
            await nextFrame();
            pageAct(parent, "click");
            await nextFrame();
          }
        }

        const leaf =
          findBestByText(preset.matchLabels, preset.excludeLabels || []) ||
          items.find(
            (item) => scoreLabelMatch(visibleText(item), preset.matchLabels, preset.excludeLabels || []) > 0,
          );
        if (leaf) {
          pageAct(leaf, "click");
          await report("clicked", { modelId: preset.id, label: visibleText(leaf), silent: true });
          return true;
        }
      }

      if (!menuLooksPopulated(itemLabels)) {
        await report("menu-not-ready", {
          modelId: preset.id,
          itemCount: items.length,
          itemLabels,
          trigger: visibleText(trigger),
        });
        return false;
      }

      const keyed = await keyboardSelect(preset);
      if (keyed) {
        return true;
      }

      await report("parent-not-found", {
        modelId: preset.id,
        itemCount: items.length,
        itemLabels,
        trigger: visibleText(trigger),
        switcherId: trigger.id,
      });
      return false;
    } finally {
      pageKey("Escape");
      await nextFrame();
      setSilentUi(false);
    }
  }

  async function applyPreset(settings) {
    if (!settings?.enabled || applying) {
      return;
    }
    if (!looksLikeCopilot()) {
      return;
    }

    const trigger = findPickerTrigger();
    if (!isPickerReady(trigger) || !isPickerStable(trigger)) {
      await report("waiting-for-selector", {
        modelId: getPresetById(settings.modelId).id,
        trigger: trigger ? visibleText(trigger) : "",
        ready: isPickerReady(trigger),
      });
      return;
    }

    const preset = getPresetById(settings.modelId);
    const signature = `${preset.id}:${location.href}`;
    if (signature === lastAppliedSignature) {
      return;
    }

    applying = true;
    applyAttempts += 1;
    let applied = false;
    try {
      await report("applying", {
        modelId: preset.id,
        attempt: applyAttempts,
        trigger: visibleText(trigger),
      });
      applySessionMode(preset.modeKey);
      applied = await applyViaUi(preset);
      if (applied) {
        lastAppliedSignature = signature;
      }
    } finally {
      applying = false;
    }

    if (!applied && applyAttempts < 8) {
      window.setTimeout(() => {
        applyPreset(settings);
      }, Math.min(500 * applyAttempts, 2500));
    }
  }

  function scheduleApply(settings) {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      applyPreset(settings);
    }, 300);
  }

  async function start() {
    settingsCache = await loadSettings();
    if (!settingsCache.enabled) {
      await report("disabled");
      return;
    }

    function armSwitcherWait() {
      window.clearInterval(waitTimer);
      const started = Date.now();
      waitTimer = window.setInterval(() => {
        const trigger = findPickerTrigger();
        if (isPickerReady(trigger) && isPickerStable(trigger)) {
          window.clearInterval(waitTimer);
          scheduleApply(settingsCache);
          return;
        }
        if (Date.now() - started > 45000) {
          window.clearInterval(waitTimer);
          report("picker-timeout", {
            modelId: getPresetById(settingsCache.modelId).id,
            trigger: trigger ? visibleText(trigger) : "",
          });
        }
      }, 200);
    }

    await report("waiting-for-selector");
    armSwitcherWait();

    let previousPath = location.pathname;
    window.setInterval(() => {
      if (location.pathname !== previousPath) {
        previousPath = location.pathname;
        lastAppliedSignature = "";
        applyAttempts = 0;
        pickerStable = { label: "", since: 0 };
        armSwitcherWait();
      }
    }, 800);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes.copilotDefaultModelSettings) {
        return;
      }
      settingsCache = {
        ...settingsCache,
        ...changes.copilotDefaultModelSettings.newValue,
      };
      lastAppliedSignature = "";
      applyAttempts = 0;
      pickerStable = { label: "", since: 0 };
      armSwitcherWait();
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "REAPPLY_DEFAULT_MODEL") {
        lastAppliedSignature = "";
        applyAttempts = 0;
        pickerStable = { label: "", since: 0 };
        armSwitcherWait();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
