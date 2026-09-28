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
  resolvePreset,
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

test("GPT 5.6 Sol is the default and does not match Think Deeper", () => {
  const preset = getPresetById("gpt-sol");
  assert.equal(preset.name, "GPT 5.6 Sol");
  assert.ok(labelMatches("GPT 5.6 Sol", preset.matchLabels));
  assert.ok(labelMatches("5.6 Sol", preset.matchLabels));
  assert.equal(labelMatches("GPT 5.6 Think Deeper", preset.matchLabels), false);
  assert.equal(getPresetById("gpt-thinking").matchLabels.some((label) => label.includes("Sol")), false);
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
  assert.equal(triggerLooksLoaded("Work IQ"), false);
  assert.equal(triggerLooksLoaded("Chat"), false);
  assert.equal(triggerLooksLoaded("GPT 5.6 Think Deeper"), true);
  assert.equal(triggerLooksLoaded("GPT 6 Sol"), true);
  assert.equal(triggerLooksLoaded("自動"), true);
});

test("custom model matches the menu text the user typed", () => {
  const preset = resolvePreset("custom-1", [
    { id: "custom-1", name: "GPT 6 Sol", matchText: "GPT 6 Sol", parentText: "GPT" },
  ]);
  assert.equal(preset.name, "GPT 6 Sol");
  assert.deepEqual(preset.parentLabels, ["GPT"]);
  assert.ok(labelMatches("GPT 6 Sol", preset.matchLabels));
  assert.equal(resolvePreset("gpt-sol", []).id, "gpt-sol");
});

test("menus are populated only after real model rows appear", () => {
  assert.equal(menuLooksPopulated([]), false);
  assert.equal(menuLooksPopulated(["読み込み中"]), false);
  assert.equal(menuLooksPopulated(["自動", "GPT"]), false);
  assert.equal(menuLooksPopulated(["自動", "クイック応答", "GPT"]), true);
  assert.equal(menuLooksPopulated(["Claude", "Sonnet", "Opus"]), true);
});
