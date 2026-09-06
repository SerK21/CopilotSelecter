import test from "node:test";
import assert from "node:assert/strict";
import {
  getPresetById,
  labelMatches,
  scoreLabelMatch,
} from "../src/shared/models.js";

test("getPresetById falls back to smart", () => {
  assert.equal(getPresetById("unknown").id, "smart");
});

test("labelMatches handles think deeper", () => {
  assert.equal(labelMatches("Think deeper", ["Think deeper"]), true);
  assert.equal(labelMatches("GPT-5.6 Think Deeper", ["Think Deeper"]), true);
});

test("scoreLabelMatch prefers exact matches", () => {
  const exact = scoreLabelMatch("Claude Opus", ["Opus", "Claude Opus"]);
  const partial = scoreLabelMatch("Claude Opus 5", ["Opus"]);
  assert.ok(exact > partial);
});

test("opus preset exists", () => {
  assert.equal(getPresetById("opus").name, "Claude Opus");
});
