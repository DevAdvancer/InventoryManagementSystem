import { useState } from "react";

import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  setApiBaseUrl,
} from "../utils/runtimeConfig";

function ApiConfigModal({ onClose }) {
  const [value, setValue] = useState(getApiBaseUrl());

  const save = (e) => {
    e.preventDefault();
    setApiBaseUrl(value.trim() || getDefaultApiBaseUrl());
    window.location.reload();
  };

  const reset = () => {
    setApiBaseUrl(null);
    onClose();
    window.location.reload();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>API base URL</h3>
        <p>
          Override the backend URL at runtime. Useful when pointing the deployed
          frontend at a different backend without rebuilding.
        </p>
        <form onSubmit={save}>
          <input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://your-api.example.com"
            required
          />
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={reset}>
              Reset to default
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Save & reload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApiConfigModal;
