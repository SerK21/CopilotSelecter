(function initCopilotDefaultModelShared(global) {
  const MODEL_PRESETS = [
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

  const SESSION_MODE_KEY = "sticky-conversation-mode";
  const STORAGE_KEY = "copilotDefaultModelSettings";

  const DEFAULT_SETTINGS = {
    enabled: true,
    modelId: "gpt-thinking",
    applyOnLoad: true,
    applyOnNewChat: true,
    respectManualChangeMs: 15000,
  };

  function getPresetById(modelId) {
    return MODEL_PRESETS.find((preset) => preset.id === modelId) ?? MODEL_PRESETS[0];
  }

  function normalizeLabel(text) {
    return (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function scoreLabelMatch(label, patterns, excludeLabels = []) {
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

  function labelMatches(label, patterns, excludeLabels = []) {
    return scoreLabelMatch(label, patterns, excludeLabels) > 0;
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEY] ?? {}) };
  }

  global.CopilotDefaultModel = {
    MODEL_PRESETS,
    SESSION_MODE_KEY,
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    getPresetById,
    labelMatches,
    scoreLabelMatch,
    normalizeLabel,
    loadSettings,
  };
})(globalThis);
