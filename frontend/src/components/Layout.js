import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import ApiConfigModal from "./ApiConfigModal";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/products", label: "Products", icon: "📦" },
  { to: "/customers", label: "Customers", icon: "👥" },
  { to: "/orders", label: "Orders", icon: "🧾" },
];

function Layout({ children }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // The active flag is also used to highlight the nav item matching the
  // current URL — falling back to pathname-prefix match for nested routes.
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Auto-close the mobile drawer on navigation so the user lands on the
  // new page without the drawer still covering the content.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open on mobile. Cheaper than a
  // portal + focus trap and keeps the existing modal logic untouched.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  // Close the drawer on Escape — works for both keyboard and touch users
  // using an external keyboard.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="app-shell">
      {navOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${navOpen ? " open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">IMS</span>
          <div>
            <h1>Inventory</h1>
            <p>Order Management</p>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={() =>
                `nav-link${isActive(item.to) ? " active" : ""}`
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="config-button"
          onClick={() => setConfigOpen(true)}
        >
          ⚙ API settings
        </button>

        <div className="sidebar-footer">
          <p>v1.0.0</p>
          <p>Containerized Stack</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <button
            type="button"
            className="hamburger"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
          <div>
            <h2 className="page-title">
              {NAV_ITEMS.find((i) => isActive(i.to))?.label || "Dashboard"}
            </h2>
            <p className="page-subtitle">Manage your products, customers, and orders</p>
          </div>
        </header>

        <div className="page-body">{children}</div>
      </main>

      {configOpen && <ApiConfigModal onClose={() => setConfigOpen(false)} />}
    </div>
  );
}

export default Layout;
