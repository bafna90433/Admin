import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";
import ProductForm from "./components/ProductForm";
import CategoryList from "./components/CategoryList";
import CategoryForm from "./components/CategoryForm";
import BannerList from "./components/BannerList";
import AddBanner from "./components/AddBanner";
import AdminDashboard from "./components/AdminDashboard";
import AdminOrders from "./components/AdminOrders";
import WhatsAppSettings from "./components/WhatsAppSettings";

// 🔐 Admin Login page (components se import)
import AdminLogin from "./components/AdminLogin";

// 🔒 Simple guard for admin routes
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

        {/* Admin area (protected) */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          {/* Default -> dashboard */}
          <Route index element={<Dashboard />} />

          {/* Dashboard (explicit path) */}
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

          {/* Users (Registrations) */}
          <Route path="registrations" element={<AdminDashboard />} />

          {/* Orders */}
          <Route path="orders" element={<AdminOrders />} />

          {/* WhatsApp Settings */}
          <Route path="whatsapp" element={<WhatsAppSettings />} />
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
