// Runtime configuration helpers.
//
// In local docker-compose the frontend nginx proxies /api -> backend, so
// the SPA and the API share the same origin. The build-time default
// ("") produces a same-origin base URL, which avoids CORS entirely.
//
// For deployments where the API lives on a different host, the user can
// paste a full URL (e.g. https://api.example.com) in the in-app
// "⚙ API settings" panel; that value is persisted in localStorage.

const RUNTIME_KEY = "ims.runtime.apiBaseUrl";

// Empty string = same origin (let the browser resolve /api/*).
const BUILT_IN_DEFAULT = process.env.REACT_APP_API_URL || "";

export function getApiBaseUrl() {
  if (typeof window === "undefined") return BUILT_IN_DEFAULT;
  const stored = window.localStorage.getItem(RUNTIME_KEY);
  if (stored !== null) {
    // Explicit user override (may be "" meaning "reset to default").
    return stored.replace(/\/$/, "");
  }
  return BUILT_IN_DEFAULT.replace(/\/$/, "");
}

export function setApiBaseUrl(value) {
  if (value === null) {
    window.localStorage.removeItem(RUNTIME_KEY);
    return;
  }
  window.localStorage.setItem(RUNTIME_KEY, value.replace(/\/$/, ""));
}

export function getDefaultApiBaseUrl() {
  return BUILT_IN_DEFAULT;
}