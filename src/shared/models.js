/** @typedef {{ id: string, name: string, description: string, modeKey: string | null, matchLabels: string[], parentLabels?: string[] }} ModelPreset */

/** @type {ModelPreset[]} */
export const MODEL_PRESETS = [
  {
    id: "smart",
    name: "自動",
    description: "考える時間の長さを自動で決める標準モード",
    modeKey: "smart",
    matchLabels: ["自動", "Auto", "Smart", "スマート"],
  },
  {
    id: "quick",
    name: "クイック応答",
    description: "すぐに回答するモード",
    modeKey: null,
    matchLabels: ["クイック応答"],
  },
  {
    id: "reasoning",
    name: "Think Deeper",
    description: "より良い回答のために長く考える（トップレベル）",
    modeKey: "reasoning",
    matchLabels: ["Think Deeper", "Think deeper", "より深く考える"],
    excludeLabels: ["GPT"],
  },
  {
    id: "study",
    name: "Study and learn",
    description: "学習・クイズ向けモード（個人 Copilot）",
    modeKey: "study",
    matchLabels: ["Study and learn", "Study", "学習と学ぶ"],
  },
  {
    id: "search",
    name: "Search",
    description: "Web 検索重視モード（個人 Copilot）",
    modeKey: "search",
    matchLabels: ["Search"],
  },
  {
    id: "gpt-thinking",
    name: "GPT 5.6 Think Deeper",
    description: "GPT サブメニューの Think Deeper",
    modeKey: null,
    parentLabels: ["GPT", "OpenAI"],
    matchLabels: ["GPT 5.6 Think Deeper", "GPT-5.6 Think Deeper", "GPT 5.6 Think"],
  },
  {
    id: "gpt-quick",
    name: "GPT 5.6 Quick response",
    description: "GPT サブメニューの Quick response",
    modeKey: null,
    parentLabels: ["GPT", "OpenAI"],
    matchLabels: ["GPT 5.6 Quick response", "GPT-5.6 Quick response", "GPT 5.6 Quick"],
  },
  {
    id: "gpt-55-quick",
    name: "GPT 5.5 Quick Response",
    description: "GPT サブメニューの 5.5 Quick Response",
    modeKey: null,
    parentLabels: ["GPT", "OpenAI"],
    matchLabels: ["GPT 5.5 Quick Response", "GPT-5.5 Quick Response", "GPT 5.5 Quick"],
  },
  {
    id: "sonnet",
    name: "Claude Sonnet",
    description: "Claude サブメニューの Sonnet",
    modeKey: null,
    parentLabels: ["Claude", "Anthropic"],
    matchLabels: ["Sonnet"],
  },
  {
    id: "opus",
    name: "Claude Opus",
    description: "Claude サブメニューの Opus",
    modeKey: null,
    parentLabels: ["Claude", "Anthropic"],
    matchLabels: ["Opus"],
  },
];

export const PRESET_GROUPS = [
  { label: "モード", ids: ["smart", "quick", "reasoning", "study", "search"] },
  { label: "GPT (OpenAI)", ids: ["gpt-thinking", "gpt-quick", "gpt-55-quick"] },
  { label: "Claude (Anthropic)", ids: ["sonnet", "opus"] },
];

export const SESSION_MODE_KEY = "sticky-conversation-mode";

export const DEFAULT_SETTINGS = {
  enabled: true,
  modelId: "gpt-thinking",
  applyOnLoad: true,
  applyOnNewChat: true,
  respectManualChangeMs: 15000,
};

export function getPresetById(modelId) {
  return MODEL_PRESETS.find((preset) => preset.id === modelId) ?? MODEL_PRESETS[0];
}

export function normalizeLabel(text) {
  return (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function labelMatches(label, patterns, excludeLabels = []) {
  return scoreLabelMatch(label, patterns, excludeLabels) > 0;
}

const GENERIC_SELECTOR_LABEL = /^(モデル\s*セレクター|model selector|select (a )?model|choose model)$/i;
const LOADING_LABEL = /読み込|loading|spinner|please wait|^\s*[.…・…]+\s*$/i;
const MODEL_READY_HINT =
  /自動|auto|smart|スマート|クイック応答|think deeper|より深く|gpt\s*5|claude|sonnet|opus|quick response/i;
const MENU_READY_HINT =
  /自動|auto|smart|gpt|claude|think deeper|クイック応答|sonnet|opus|openai|anthropic/i;

export function isGenericSelectorLabel(label) {
  const raw = (label ?? "").replace(/\s+/g, " ").trim();
  return !raw || GENERIC_SELECTOR_LABEL.test(raw);
}

export function isLoadingLabel(label) {
  return LOADING_LABEL.test((label ?? "").replace(/\s+/g, " ").trim());
}

export function triggerLooksLoaded(label) {
  const raw = (label ?? "").replace(/\s+/g, " ").trim();
  if (!raw || isLoadingLabel(raw) || isGenericSelectorLabel(raw)) {
    return false;
  }
  return MODEL_READY_HINT.test(raw) || raw.length >= 4;
}

export function menuLooksPopulated(labels) {
  const texts = (labels ?? []).map((item) => String(item ?? "").trim()).filter(Boolean);
  if (texts.length < 2) {
    return false;
  }
  return MENU_READY_HINT.test(texts.join(" "));
}

export function scoreLabelMatch(label, patterns, excludeLabels = []) {
  const normalized = normalizeLabel(label);
  if (!normalized) {
    return 0;
  }

  if (excludeLabels.some((item) => normalized.includes(normalizeLabel(item)))) {
    return 0;
  }

  let best = 0;
  for (const pattern of patterns) {
    const needle = normalizeLabel(pattern);
    if (!needle) {
      continue;
    }
    if (normalized === needle) {
      best = Math.max(best, 100 + needle.length);
    } else if (normalized.startsWith(needle)) {
      best = Math.max(best, 80 + needle.length);
    } else if (normalized.includes(needle)) {
      best = Math.max(best, 50 + needle.length);
    }
  }
  return best;
}
