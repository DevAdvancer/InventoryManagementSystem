// Centralized API client.
//
// baseURL resolution:
//   1. localStorage override (set via the in-app API settings panel)
//   2. REACT_APP_API_URL baked at build time
//   3. same-origin (empty string) — works automatically in docker-compose
//      because the frontend nginx proxies /api -> backend.
//
// Errors are normalized so the UI gets a human-readable message and a
// structured cause for debugging. CORS failures, DNS failures, and
// timeouts now include the actual reason in the toast.

import axios from "axios";
import { getApiBaseUrl } from "../utils/runtimeConfig";

function buildBaseURL() {
  const base = getApiBaseUrl();
  // Same-origin if base is empty. Use a relative baseURL so axios doesn't
  // try to set an absolute origin that the browser would reject.
  return base ? `${base}/api/v1` : "/api/v1";
}

const api = axios.create({
  baseURL: buildBaseURL(),
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  // Recompute the base URL on every request so runtime overrides take
  // effect immediately after a settings change (no hard reload needed).
  config.baseURL = buildBaseURL();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Build the most informative message we can. The browser hides a lot
    // of detail behind "Network Error" — surface the cause when we have it.
    let message;
    if (error.response) {
      // Server replied with a non-2xx status.
      const data = error.response.data;
      if (data && typeof data === "object" && data.detail) {
        message = data.detail;
      } else if (typeof data === "string" && data) {
        message = data;
      } else {
        message = `Request failed with status ${error.response.status}`;
      }
    } else if (error.request) {
      // The request was made but no response was received.
      const baseURL = error.config?.baseURL || "(unknown)";
      const method = (error.config?.method || "get").toUpperCase();
      const path = error.config?.url || "";
      if (error.code === "ECONNABORTED") {
        message = `Request timed out: ${method} ${baseURL}${path}`;
      } else if (
        error.message === "Network Error" ||
        error.code === "ERR_NETWORK"
      ) {
        message =
          `Network Error: cannot reach ${baseURL}${path}. ` +
          "If the backend is on a different host, set its URL via " +
          "the sidebar '⚙ API settings' panel. " +
          "(This is also the message browsers show when CORS blocks the request.)";
      } else {
        message = `Network error contacting ${baseURL}${path}: ${error.message}`;
      }
    } else {
      message = error.message || "An unexpected error occurred";
    }
    return Promise.reject(new Error(message));
  }
);

// ---- Helpers ---------------------------------------------------------------
// Defensive coercion for the API client. Pages can call .list() and trust
// the result is iterable; a 200 with a non-array body (or a missing body)
// no longer crashes the UI with "c.map is not a function".
const asArray = (data) => (Array.isArray(data) ? data : []);

// ---- Products ----
export const ProductsAPI = {
  list: () => api.get("/products").then((r) => asArray(r.data)),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  create: (data) => api.post("/products", data).then((r) => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
};

// ---- Customers ----
export const CustomersAPI = {
  list: () => api.get("/customers").then((r) => asArray(r.data)),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => api.post("/customers", data).then((r) => r.data),
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data),
};

// ---- Orders ----
export const OrdersAPI = {
  list: () => api.get("/orders").then((r) => asArray(r.data)),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  create: (data) => api.post("/orders", data).then((r) => r.data),
  remove: (id) => api.delete(`/orders/${id}`).then((r) => r.data),
  // Dashboard is an object with low_stock_products: Product[]. Provide a
  // safe default so the dashboard never crashes on a partial payload.
  dashboard: () =>
    api.get("/orders/dashboard/summary").then((r) => {
      const d = r.data || {};
      return {
        total_products: d.total_products ?? 0,
        total_customers: d.total_customers ?? 0,
        total_orders: d.total_orders ?? 0,
        total_revenue: d.total_revenue ?? "0.00",
        low_stock_products: asArray(d.low_stock_products),
      };
    }),
};

export default api;