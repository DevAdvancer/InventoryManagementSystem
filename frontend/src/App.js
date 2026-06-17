import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
