import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { CustomersAPI, OrdersAPI, ProductsAPI } from "../services/api";
import { formatCurrency, formatDateTime } from "../utils/format";

function newItem() {
  return { product_id: "", quantity: 1 };
}

function OrdersPage() {
  const { push } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_id: "", notes: "", items: [newItem()] });

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await OrdersAPI.list());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = async () => {
    setFormError(null);
    setForm({ customer_id: "", notes: "", items: [newItem()] });
    setModalOpen(true);
    try {
      const [ps, cs] = await Promise.all([
        ProductsAPI.list(),
        CustomersAPI.list(),
      ]);
      setProducts(ps);
      setCustomers(cs);
    } catch (e) {
      push(e.message, "error");
    }
  };

  const updateItem = (i, patch) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  };

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, newItem()] }));

  const removeItem = (i) =>
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_, idx) => idx !== i) : f.items,
    }));

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.customer_id) {
      setFormError("Please select a customer");
      return;
    }
    const cleaned = form.items
      .map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) }))
      .filter((i) => i.product_id && i.quantity > 0);

    if (!cleaned.length) {
      setFormError("Add at least one product with a positive quantity");
      return;
    }

    setSaving(true);
    try {
      const created = await OrdersAPI.create({
        customer_id: Number(form.customer_id),
        notes: form.notes.trim() || null,
        items: cleaned,
      });
      push(`Order #${created.id} created`, "success");
      setModalOpen(false);
      await load();
      navigate(`/orders/${created.id}`);
    } catch (e2) {
      setFormError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o) => {
    try {
      await OrdersAPI.remove(o.id);
      push(`Order #${o.id} deleted`, "success");
      await load();
    } catch (e) {
      push(e.message, "error");
    }
  };

  const columns = [
    { key: "id", label: "#" },
    {
      key: "customer",
      label: "Customer",
      render: (r) => r.customer?.full_name || `Customer #${r.customer_id}`,
    },
    {
      key: "items",
      label: "Items",
      render: (r) => r.items?.length ?? 0,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`badge ${r.status === "confirmed" ? "success" : "info"}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      render: (r) => formatCurrency(r.total_amount),
    },
    {
      key: "created_at",
      label: "Created",
      render: (r) => formatDateTime(r.created_at),
    },
    {
      key: "actions",
      label: "",
      headerStyle: { textAlign: "right" },
      cellStyle: { textAlign: "right" },
      render: (r) => (
        <div className="row-actions">
          <button
            type="button"
            className="btn small ghost"
            onClick={() => navigate(`/orders/${r.id}`)}
          >
            View
          </button>
          <button
            type="button"
            className="btn small danger"
            onClick={() => setConfirm(r)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="section-stack">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Orders</h3>
            <p>Confirmed orders automatically reduce product stock</p>
          </div>
          <button type="button" className="btn primary" onClick={openCreate}>
            + New order
          </button>
        </div>

        {error ? (
          <div className="empty">Could not load orders: {error}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={orders}
            loading={loading}
            emptyMessage="No orders yet. Create one to get started."
          />
        )}
      </div>

      {modalOpen && (
        <Modal title="Create order" onClose={() => setModalOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Customer *</label>
                <select
                  value={form.customer_id}
                  onChange={(e) =>
                    setForm({ ...form, customer_id: e.target.value })
                  }
                  required
                >
                  <option value="">— Select a customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field" style={{ marginTop: 14 }}>
              <label>Items</label>
              <div className="list-stack">
                {form.items.map((it, i) => (
                  <div className="list-item" key={i}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <select
                        value={it.product_id}
                        onChange={(e) =>
                          updateItem(i, { product_id: e.target.value })
                        }
                        style={{ width: "100%" }}
                      >
                        <option value="">— Select a product —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (SKU {p.sku}) — {p.quantity_in_stock} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: 110 }}>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: e.target.value })
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removeItem(i)}
                      aria-label="Remove line"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn ghost small"
                onClick={addItem}
                style={{ marginTop: 8 }}
              >
                + Add another line
              </button>
            </div>

            <div className="form-field" style={{ marginTop: 14 }}>
              <label>Notes</label>
              <textarea
                rows="2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Creating…" : "Create order"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete order?"
          message={`Order #${confirm.id} will be cancelled and stock will be restored.`}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const target = confirm;
            setConfirm(null);
            await remove(target);
          }}
        />
      )}
    </div>
  );
}

export default OrdersPage;
