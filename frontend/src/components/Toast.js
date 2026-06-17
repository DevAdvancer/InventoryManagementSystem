// A tiny global toast component — show via setToast(...) from any page.
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const push = useCallback((message, type = "info", timeout = 3500) => {
    setToast({ message, type });
    window.clearTimeout(push._t);
    push._t = window.setTimeout(() => setToast(null), timeout);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
