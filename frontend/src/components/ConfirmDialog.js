function ConfirmDialog({ title, message, confirmLabel = "Delete", onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal small" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
