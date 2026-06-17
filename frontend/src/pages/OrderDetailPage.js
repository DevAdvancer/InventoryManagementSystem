import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import DataTable from "../components/DataTable";
import { OrdersAPI } from "../services/api";
import { formatCurrency, formatDateTime } from "../utils/format";

function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await OrdersAPI.get(id);
        if (!cancelled) setOrder(data);
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
  }, [id]);

  if (loading) return <div className="empty">Loading order…</div>;
  if (error)
    return (
      <div className="card">
        <h3>Could not load order</h3>
        <p className="muted">{error}</p>
        <Link to="/orders" className="btn ghost small">
          ← Back to orders
        </Link>
      </div>
    );
  if (!order) return null;

  const columns = [
    { key: "id", label: "#" },
    {
      key: "product",
      label: "Product",
      render: (r) => r.product?.name || `Product #${r.product_id}`,
    },
    {
      key: "sku",
      label: "SKU",
      render: (r) => r.product?.sku || "—",
    },
    { key: "quantity", label: "Qty" },
    {
      key: "unit_price",
      label: "Unit price",
      render: (r) => formatCurrency(r.unit_price),
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (r) => formatCurrency(r.subtotal),
    },
  ];

  return (
    <div className="section-stack">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Order #{order.id}</h3>
            <p>
              Placed {formatDateTime(order.created_at)} ·{" "}
              <span
                className={`badge ${
                  order.status === "confirmed" ? "success" : "info"
                }`}
              >
                {order.status}
              </span>
            </p>
          </div>
          <Link to="/orders" className="btn ghost small">
            ← All orders
          </Link>
        </div>

        <div className="detail-grid">
          <div>
            <div className="label">Customer</div>
            <div className="value">
              {order.customer?.full_name || `Customer #${order.customer_id}`}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {order.customer?.email} · {order.customer?.phone}
            </div>
          </div>
          <div>
            <div className="label">Total amount</div>
            <div className="value">{formatCurrency(order.total_amount)}</div>
          </div>
          <div>
            <div className="label">Notes</div>
            <div className="value">{order.notes || "—"}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Line items</h3>
            <p>{order.items.length} item(s)</p>
          </div>
        </div>
        <DataTable columns={columns} rows={order.items} />
      </div>
    </div>
  );
}

export default OrderDetailPage;
