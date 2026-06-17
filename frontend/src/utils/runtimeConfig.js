// Runtime configuration helpers.
//
// In local docker-compose the frontend nginx proxies /api -> backend, so
// the SPA and the API share the same origin. The build-time default
// ("") produces a same-origin base URL, which avoids CORS entirely.
//
// For deployments where the API lives on a different host, the user can
// paste a full URL (e.g. https://api.example.com) in the in-app
// "⚙ API settings" panel; that value is persisted in localStorage.
//
// HTTPS enforcement: any URL we resolve — whether baked in at build time
// or stored in localStorage — is auto-upgraded from http:// to https://
// so a stray http:// origin never causes a mixed-content block on the
// deployed (HTTPS) frontend.

const RUNTIME_KEY = "ims.runtime.apiBaseUrl";

// Empty string = same origin (let the browser resolve /api/*).
const BUILT_IN_DEFAULT = process.env.REACT_APP_API_URL || "";

// Force HTTPS for any absolute URL. This recovers from a previously
// stored http:// origin (browsers now block those as mixed content on
// https:// pages) without requiring the user to manually edit settings.
function toHttps(url) {
  if (!url) return url;
  if (typeof url !== "string") return url;
  if (url.startsWith("http://")) {
    return "https://" + url.slice("http://".length);
  }
  return url;
}

function normalize(url) {
  return toHttps(url).replace(/\/$/, "");
}

export function getApiBaseUrl() {
  if (typeof window === "undefined") return normalize(BUILT_IN_DEFAULT);
  const stored = window.localStorage.getItem(RUNTIME_KEY);
  if (stored !== null) {
    // Explicit user override (may be "" meaning "reset to default").
    return normalize(stored);
  }
  return normalize(BUILT_IN_DEFAULT);
}

export function setApiBaseUrl(value) {
  if (value === null) {
    window.localStorage.removeItem(RUNTIME_KEY);
    return;
  }
  window.localStorage.setItem(RUNTIME_KEY, normalize(value));
}

export function getDefaultApiBaseUrl() {
  return normalize(BUILT_IN_DEFAULT);
}