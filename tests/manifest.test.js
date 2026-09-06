import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));

test("manifest is Chrome MV3", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "CopilotSelecter");
  assert.ok(manifest.action?.default_popup);
  assert.ok(manifest.background?.service_worker);
  assert.equal(manifest.background?.type, undefined);
});

test("manifest lists required files", () => {
  const required = [
    manifest.action.default_popup,
    manifest.options_ui.page,
    manifest.background.service_worker,
    ...manifest.content_scripts.flatMap((entry) => entry.js),
    manifest.icons["16"],
    manifest.icons["48"],
    manifest.icons["128"],
  ];
  for (const relative of required) {
    assert.doesNotThrow(() => readFileSync(join(root, relative)));
  }
});

test("content scripts cover Copilot hosts", () => {
  const matches = manifest.content_scripts[0].matches;
  assert.ok(matches.includes("https://copilot.microsoft.com/*"));
  assert.ok(manifest.content_scripts.every((entry) => entry.all_frames === true));
});

test("addon zip has manifest at root", () => {
  const zipPath = join(root, "addon", "copilotselecter-chrome.zip");
  const zip = readFileSync(zipPath);
  // ZIP local file header starts with PK\x03\x04; central directory lists names.
  const asString = zip.toString("binary");
  assert.ok(zip[0] === 0x50 && zip[1] === 0x4b, "not a zip");
  assert.match(asString, /manifest\.json/);
});

test("Windows setup exe is a PE binary", () => {
  const exe = readFileSync(join(root, "addon", "CopilotSelecter-Setup.exe"));
  assert.equal(exe.subarray(0, 2).toString("ascii"), "MZ");
});
