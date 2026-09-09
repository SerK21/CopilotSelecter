import test from "node:test";
import assert from "node:assert/strict";
import {
  getPresetById,
  labelMatches,
  scoreLabelMatch,
  isGenericSelectorLabel,
  isLoadingLabel,
  triggerLooksLoaded,
  menuLooksPopulated,
} from "../src/shared/models.js";

test("getPresetById falls back to smart", () => {
  assert.equal(getPresetById("unknown").id, "smart");
});

test("top-level Think Deeper does not match GPT submenu item", () => {
  const preset = getPresetById("reasoning");
  assert.equal(
    labelMatches("GPT 5.6 Think Deeper", preset.matchLabels, preset.excludeLabels),
    false,
  );
  assert.ok(scoreLabelMatch("Think Deeper", preset.matchLabels, preset.excludeLabels) > 0);
});

test("quick response does not match GPT quick items", () => {
  const preset = getPresetById("quick");
  assert.equal(labelMatches("クイック応答", preset.matchLabels), true);
  assert.equal(labelMatches("GPT 5.6 Quick response", preset.matchLabels), false);
});

test("GPT 5.6 Think Deeper is a dedicated preset", () => {
  const preset = getPresetById("gpt-thinking");
  assert.equal(preset.name, "GPT 5.6 Think Deeper");
  assert.ok(labelMatches("GPT 5.6 Think Deeper", preset.matchLabels));
  assert.equal(labelMatches("Think Deeper", preset.matchLabels), false);
});

test("Claude submenu items do not match the parent row", () => {
  const sonnet = getPresetById("sonnet");
  const opus = getPresetById("opus");
  assert.equal(labelMatches("Claude (Anthropic)", sonnet.matchLabels), false);
  assert.equal(labelMatches("Claude (Anthropic)", opus.matchLabels), false);
  assert.ok(labelMatches("Sonnet", sonnet.matchLabels));
  assert.ok(labelMatches("Opus", opus.matchLabels));
});

test("scoreLabelMatch prefers exact and prefix matches", () => {
  const exact = scoreLabelMatch("Claude Opus", ["Opus", "Claude Opus"]);
  const partial = scoreLabelMatch("Claude Opus 5", ["Opus"]);
  assert.ok(exact > partial);
});

test("generic model selector labels are not treated as loaded", () => {
  assert.equal(isGenericSelectorLabel(""), true);
  assert.equal(isGenericSelectorLabel("モデルセレクター"), true);
  assert.equal(isGenericSelectorLabel("モデル セレクター"), true);
  assert.equal(isGenericSelectorLabel("Model selector"), true);
  assert.equal(isLoadingLabel("読み込み中"), true);
  assert.equal(isLoadingLabel("..."), true);
  assert.equal(triggerLooksLoaded("モデルセレクター"), false);
  assert.equal(triggerLooksLoaded("GPT 5.6 Think Deeper"), true);
  assert.equal(triggerLooksLoaded("自動"), true);
});

test("menus are populated only after real model rows appear", () => {
  assert.equal(menuLooksPopulated([]), false);
  assert.equal(menuLooksPopulated(["読み込み中"]), false);
  assert.equal(menuLooksPopulated(["自動", "GPT"]), true);
  assert.equal(menuLooksPopulated(["Claude", "Sonnet"]), true);
});
