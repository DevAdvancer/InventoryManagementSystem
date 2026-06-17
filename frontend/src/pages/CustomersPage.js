import { useEffect, useState } from "react";

import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { CustomersAPI } from "../services/api";

const EMPTY_FORM = { full_name: "", email: "", phone: "", address: "" };

function CustomersPage() {
  const { push } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await CustomersAPI.list());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setFormError("Name, email, and phone are required");
      return;
    }
    setSaving(true);
    try {
      await CustomersAPI.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      });
      push("Customer created", "success");
      setForm(EMPTY_FORM);
      setModalOpen(false);
      await load();
    } catch (e2) {
      setFormError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    try {
      await CustomersAPI.remove(c.id);
      push(`Deleted ${c.full_name}`, "success");
      await load();
    } catch (e) {
      push(e.message, "error");
    }
  };

  const columns = [
    { key: "id", label: "#" },
    { key: "full_name", label: "Full name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    {
      key: "address",
      label: "Address",
      render: (r) => r.address || <span className="muted">—</span>,
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
            <h3>Customers</h3>
            <p>People who buy from your business</p>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setForm(EMPTY_FORM);
              setFormError(null);
              setModalOpen(true);
            }}
          >
            + New customer
          </button>
        </div>

        {error ? (
          <div className="empty">Could not load customers: {error}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={customers}
            loading={loading}
            emptyMessage="No customers yet."
          />
        )}
      </div>

      {modalOpen && (
        <Modal title="New customer" onClose={() => setModalOpen(false)}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Full name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Phone *</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 14 }}>
              <label>Address</label>
              <textarea
                rows="2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                {saving ? "Saving…" : "Create customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete customer?"
          message={`This will permanently delete ${confirm.full_name} and all of their orders.`}
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

export default CustomersPage;
