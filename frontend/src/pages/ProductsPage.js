import { useEffect, useState } from "react";

import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { ProductsAPI } from "../services/api";
import { formatCurrency } from "../utils/format";

const EMPTY_FORM = {
  name: "",
  sku: "",
  description: "",
  price: "",
  quantity_in_stock: "",
  low_stock_threshold: 5,
};

function ProductsPage() {
  const { push } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await ProductsAPI.list());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      description: p.description || "",
      price: p.price,
      quantity_in_stock: p.quantity_in_stock,
      low_stock_threshold: p.low_stock_threshold ?? 5,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.sku.trim()) {
      setFormError("Name and SKU are required");
      return;
    }
    const price = Number(form.price);
    const qty = Number(form.quantity_in_stock);
    const threshold = Number(form.low_stock_threshold);
    if (Number.isNaN(price) || price < 0) {
      setFormError("Price must be a non-negative number");
      return;
    }
    if (Number.isNaN(qty) || qty < 0) {
      setFormError("Quantity must be a non-negative integer");
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim() || null,
      price,
      quantity_in_stock: qty,
      low_stock_threshold: Number.isNaN(threshold) ? 5 : threshold,
    };

    setSaving(true);
    try {
      if (editing) {
        await ProductsAPI.update(editing.id, payload);
        push("Product updated", "success");
      } else {
        await ProductsAPI.create(payload);
        push("Product created", "success");
      }
      setModalOpen(false);
      await load();
    } catch (e2) {
      setFormError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    try {
      await ProductsAPI.remove(p.id);
      push(`Deleted "${p.name}"`, "success");
      await load();
    } catch (e) {
      push(e.message, "error");
    }
  };

  const columns = [
    { key: "id", label: "#" },
    { key: "name", label: "Name" },
    { key: "sku", label: "SKU" },
    {
      key: "price",
      label: "Price",
      render: (r) => formatCurrency(r.price),
    },
    {
      key: "quantity_in_stock",
      label: "Stock",
      render: (r) => (
        <span
          className={`badge ${
            r.quantity_in_stock === 0
              ? "danger"
              : r.quantity_in_stock <= (r.low_stock_threshold ?? 5)
              ? "warning"
              : "success"
          }`}
        >
          {r.quantity_in_stock}
        </span>
      ),
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
            onClick={() => openEdit(r)}
          >
            Edit
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
            <h3>Products</h3>
            <p>Manage your product catalog and stock levels</p>
          </div>
          <button type="button" className="btn primary" onClick={openCreate}>
            + New product
          </button>
        </div>

        {error ? (
          <div className="empty">
            <strong>Could not load products:</strong> {error}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={products}
            loading={loading}
            emptyMessage="No products yet. Add your first one to get started."
          />
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `Edit product #${editing.id}` : "New product"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>SKU *</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Quantity in stock *</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity_in_stock}
                  onChange={(e) =>
                    setForm({ ...form, quantity_in_stock: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-field">
                <label>Low-stock threshold</label>
                <input
                  type="number"
                  min="0"
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setForm({ ...form, low_stock_threshold: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-field" style={{ marginTop: 14 }}>
              <label>Description</label>
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
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
                {saving ? "Saving…" : editing ? "Update product" : "Create product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete product?"
          message={`This will permanently delete "${confirm.name}" (SKU ${confirm.sku}).`}
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

export default ProductsPage;
