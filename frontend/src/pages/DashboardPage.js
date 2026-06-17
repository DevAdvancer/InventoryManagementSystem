import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { OrdersAPI } from "../services/api";
import { formatCurrency, formatDateTime } from "../utils/format";

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [s, orders] = await Promise.all([
          OrdersAPI.dashboard(),
          OrdersAPI.list(),
        ]);
        if (cancelled) return;
        setSummary(s);
        // Defensive: OrdersAPI.list() already returns an array, but if a
        // future caller passes a partial payload, fall back to [] rather
        // than crashing with "orders.slice is not a function".
        setRecent(Array.isArray(orders) ? orders.slice(0, 5) : []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="empty">Loading dashboard…</div>;
  }
  if (error) {
    return (
      <div className="card">
        <h3>Unable to load dashboard</h3>
        <p className="muted">{error}</p>
        <p className="muted">
          Use the "⚙ API settings" button in the sidebar to point this app at your
          deployed backend.
        </p>
      </div>
    );
  }

  return (
    <div className="section-stack">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="icon">📦</div>
          <div>
            <div className="label">Total products</div>
            <div className="value">{summary?.total_products ?? 0}</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="icon">👥</div>
          <div>
            <div className="label">Total customers</div>
            <div className="value">{summary?.total_customers ?? 0}</div>
          </div>
        </div>
        <div className="stat-card info" style={{ background: "var(--color-surface)" }}>
          <div className="icon">🧾</div>
          <div>
            <div className="label">Total orders</div>
            <div className="value">{summary?.total_orders ?? 0}</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="icon">💰</div>
          <div>
            <div className="label">Total revenue</div>
            <div className="value">{formatCurrency(summary?.total_revenue ?? 0)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Low stock products</h3>
            <p>Items at or below their low-stock threshold</p>
          </div>
          <Link to="/products" className="btn ghost small">
            Manage products →
          </Link>
        </div>
        {Array.isArray(summary?.low_stock_products) && summary.low_stock_products.length ? (
          <div className="list-stack">
            {summary.low_stock_products.map((p) => (
              <div className="list-item" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <div className="meta">
                    SKU {p.sku} · {formatCurrency(p.price)}
                  </div>
                </div>
                <span
                  className={`badge ${
                    p.quantity_in_stock === 0
                      ? "danger"
                      : p.quantity_in_stock <= p.low_stock_threshold / 2
                      ? "warning"
                      : "warning"
                  }`}
                >
                  {p.quantity_in_stock} in stock
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">All products are well stocked 🎉</div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Recent orders</h3>
            <p>The five most recent orders</p>
          </div>
          <Link to="/orders" className="btn ghost small">
            View all →
          </Link>
        </div>
        {recent.length ? (
          <div className="list-stack">
            {recent.map((o) => (
              <div className="list-item" key={o.id}>
                <div>
                  <strong>Order #{o.id}</strong>
                  <div className="meta">
                    {o.customer?.full_name || `Customer #${o.customer_id}`} ·{" "}
                    {formatDateTime(o.created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    className={`badge ${
                      o.status === "confirmed" ? "success" : "info"
                    }`}
                  >
                    {o.status}
                  </span>
                  <strong>{formatCurrency(o.total_amount)}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No orders yet</div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
