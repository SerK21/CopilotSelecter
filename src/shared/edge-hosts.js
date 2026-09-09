export const M365_COPILOT_URL = "https://m365.cloud.microsoft/chat";
export const CONSUMER_COPILOT_URL = "https://copilot.com/";

const PROTECTED_HOSTS = new Set([
  "copilot.microsoft.com",
  "edgeservices.bing.com",
  "sydney.bing.com",
  "www.microsoft365.com",
  "microsoft365.com",
  "explore.microsoft.com",
]);

export function isEdgeBrowser(userAgent = globalThis.navigator?.userAgent ?? "") {
  return /\bEdg(?:e|A|iOS)?\//.test(userAgent);
}

export function parsePageUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isEdgeProtectedHost(url) {
  const parsed = parsePageUrl(url);
  if (!parsed) {
    return false;
  }
  if (parsed.protocol === "edge:" || parsed.protocol === "chrome-untrusted:") {
    return true;
  }
  const host = parsed.hostname.toLowerCase();
  if (PROTECTED_HOSTS.has(host)) {
    return true;
  }
  return host.endsWith(".copilot.microsoft.com");
}

export function shouldRedirectToM365(url) {
  const parsed = parsePageUrl(url);
  if (!parsed) {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return (
    host === "copilot.microsoft.com" ||
    host.endsWith(".copilot.microsoft.com") ||
    host === "edgeservices.bing.com"
  );
}

export function isProtectedScriptError(error) {
  const text = String(error?.message || error || "");
  return /cannot be scripted|extensions gallery/i.test(text);
}
