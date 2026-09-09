import test from "node:test";
import assert from "node:assert/strict";
import {
  isEdgeBrowser,
  isEdgeProtectedHost,
  isProtectedScriptError,
  shouldRedirectToM365,
} from "../src/shared/edge-hosts.js";

test("detects Edge 152 official UA", () => {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/152.0.0.0";
  assert.equal(isEdgeBrowser(ua), true);
  assert.equal(isEdgeBrowser("Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36"), false);
});

test("marks Edge-protected Copilot hosts", () => {
  assert.equal(isEdgeProtectedHost("https://copilot.microsoft.com/chats/abc"), true);
  assert.equal(isEdgeProtectedHost("https://edgeservices.bing.com/edgesvc/chat"), true);
  assert.equal(isEdgeProtectedHost("https://m365.cloud.microsoft/chat"), false);
  assert.equal(isEdgeProtectedHost("https://copilot.com/"), false);
  assert.equal(isEdgeProtectedHost("https://www.bing.com/chat"), false);
});

test("redirects consumer Copilot host on Edge, not M365", () => {
  assert.equal(shouldRedirectToM365("https://copilot.microsoft.com/"), true);
  assert.equal(shouldRedirectToM365("https://m365.cloud.microsoft/chat"), false);
  assert.equal(shouldRedirectToM365("https://www.office.com/chat"), false);
});

test("detects Edge gallery script block errors", () => {
  assert.equal(
    isProtectedScriptError(new Error("The extensions gallery cannot be scripted.")),
    true,
  );
  assert.equal(isProtectedScriptError(new Error("Frame was removed")), false);
});
