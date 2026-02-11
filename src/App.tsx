// src/App.tsx  ✅ FINAL (nothing missed)
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";
import ProductForm from "./components/ProductForm";
import CategoryList from "./components/CategoryList";
import CategoryForm from "./components/CategoryForm";
import BannerList from "./components/BannerList";
import AddBanner from "./components/AddBanner";
import AdminDashboard from "./components/AdminDashboard"; // Customer Database
import AdminOrders from "./components/AdminOrders";
import WhatsAppSettings from "./components/WhatsAppSettings";

// ✅ UNIFIED: Payment & Shipping Settings
import PaymentShippingSettings from "./components/PaymentShippingSettings";

// ✅ STOCK: Stock Management
import StockManagement from "./components/StockManagement";

// ✅ Customer Sales Report
import CustomerSales from "./components/CustomerSales";

// ✅ Return Requests
import AdminReturns from "./components/AdminReturns";

// ✅ Traffic Analytics
import TrafficAnalytics from "./components/TrafficAnalytics";

// ✅ NEW: Home Builder (Trending + 330×600 banner)
import AdminHomeBuilder from "./components/AdminHomeBuilder";

// 🔐 Admin Login
import AdminLogin from "./components/AdminLogin";

// 🔒 Admin Route Guard
const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Base redirect */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Admin login (public) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ================= ADMIN (PROTECTED) ================= */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          {/* Default dashboard */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Products */}
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/edit/:id" element={<ProductForm />} />

          {/* Categories */}
          <Route path="categories" element={<CategoryList />} />
          <Route path="categories/new" element={<CategoryForm />} />
          <Route path="categories/edit/:id" element={<CategoryForm />} />

          {/* Banners */}
          <Route path="banners" element={<BannerList />} />
          <Route path="banners/upload" element={<AddBanner />} />

          {/* ✅ NEW: Home Builder */}
          <Route path="home-builder" element={<AdminHomeBuilder />} />

          {/* Customers */}
          <Route path="registrations" element={<AdminDashboard />} />

          {/* Orders */}
          <Route path="orders" element={<AdminOrders />} />

          {/* Return Requests */}
          <Route path="returns" element={<AdminReturns />} />

          {/* Traffic Analytics */}
          <Route path="analytics" element={<TrafficAnalytics />} />

          {/* WhatsApp Settings */}
          <Route path="whatsapp" element={<WhatsAppSettings />} />

          {/* Payment & Shipping Settings */}
          <Route
            path="payment-shipping"
            element={<PaymentShippingSettings />}
          />

          {/* Stock Management */}
          <Route path="inventory" element={<StockManagement />} />

          {/* Customer Sales Report */}
          <Route path="sales-report" element={<CustomerSales />} />
        </Route>

        {/* 404 fallback */}
        <Route
          path="*"
          element={
            <div style={{ padding: "2rem", textAlign: "center" }}>
              404 – Page Not Found
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
