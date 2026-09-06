(function initCopilotDefaultModelShared(global) {
  const MODEL_PRESETS = [
    {
      id: "smart",
      name: "Auto / Smart",
      description: "Copilot の標準モード（自動）",
      modeKey: "smart",
      matchLabels: ["Auto", "Smart", "スマート", "自動", "Default"],
    },
    {
      id: "reasoning",
      name: "Think deeper",
      description: "より深く考える（reasoning モード）",
      modeKey: "reasoning",
      matchLabels: ["Think deeper", "Think Deeper", "より深く考える", "深く考える"],
    },
    {
      id: "study",
      name: "Study and learn",
      description: "学習・クイズ向けモード",
      modeKey: "study",
      matchLabels: ["Study and learn", "Study", "学習", "学習と学ぶ"],
    },
    {
      id: "search",
      name: "Search",
      description: "Web 検索重視モード",
      modeKey: "search",
      matchLabels: ["Search", "検索"],
    },
    {
      id: "opus",
      name: "Claude Opus",
      description: "Premium の Opus 系モデル（表示名で一致）",
      modeKey: null,
      matchLabels: ["Opus", "Claude Opus", "Claude"],
    },
    {
      id: "gpt-thinking",
      name: "GPT Thinking",
      description: "GPT の Think Deeper / Thinking 系",
      modeKey: null,
      matchLabels: [
        "GPT-5.6 Think",
        "GPT 5.6 Think",
        "GPT-5.5 Think",
        "GPT 5.5 Think",
        "Think Deeper",
        "Thinking",
      ],
    },
    {
      id: "gpt-quick",
      name: "GPT Quick response",
      description: "GPT の Quick response / Instant 系",
      modeKey: null,
      matchLabels: [
        "GPT-5.6 Quick",
        "GPT 5.6 Quick",
        "GPT-5.5 Quick",
        "GPT 5.5 Quick",
        "Quick response",
        "Quick Response",
        "Instant",
      ],
    },
  ];

  const SESSION_MODE_KEY = "sticky-conversation-mode";
  const STORAGE_KEY = "copilotDefaultModelSettings";

  const DEFAULT_SETTINGS = {
    enabled: true,
    modelId: "reasoning",
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

  function labelMatches(label, patterns) {
    const normalized = normalizeLabel(label);
    if (!normalized) {
      return false;
    }

    return patterns.some((pattern) => {
      const needle = normalizeLabel(pattern);
      return normalized === needle || normalized.includes(needle);
    });
  }

  function scoreLabelMatch(label, patterns) {
    const normalized = normalizeLabel(label);
    if (!normalized) {
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
      } else if (normalized.includes(needle)) {
        best = Math.max(best, 50 + needle.length);
      }
    }
    return best;
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
    loadSettings,
  };
})(globalThis);
