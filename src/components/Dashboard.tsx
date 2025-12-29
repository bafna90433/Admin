// src/components/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import "../styles/Dashboard.css";
import OrderModal from "./OrderModal";
import {
  FiPackage,
  FiUsers,
  FiClock,
  FiShoppingCart,
  FiArrowRight,
  FiPlus,
  FiImage,
  FiList
} from "react-icons/fi";

type Order = {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  items?: Array<{ qty: number; price: number; name?: string }>;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  customerName?: string; // Assuming API returns this or we fetch it
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const Dashboard: React.FC = () => {
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = async () => {
    try {
      const [prodRes, custRes, orderRes] = await Promise.all([
        api.get("/products"),
        api.get("/admin/customers"),
        api.get<Order[]>("/orders"),
      ]);
      setProductsCount(prodRes.data?.length || 0);
      
      const customers = custRes.data || [];
      setCustomersCount(customers.length);
      setPendingApprovals(customers.filter((c: any) => c.isApproved === null).length);
      
      const orders = Array.isArray(orderRes.data) ? orderRes.data : [];
      setOrdersCount(orders.length);
      
      // Sort by newest
      setRecentOrders([...orders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="text-muted">Welcome back, Admin. Here's what's happening today.</p>
        </div>
        <div className="header-date">
          {new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard title="Total Products" value={productsCount} icon={<FiPackage />} color="blue" link="/admin/products" />
        <StatCard title="Total Customers" value={customersCount} icon={<FiUsers />} color="green" link="/admin/registrations" />
        <StatCard title="Pending Approvals" value={pendingApprovals} icon={<FiClock />} color="orange" link="/admin/registrations" />
        <StatCard title="Total Orders" value={ordersCount} icon={<FiShoppingCart />} color="purple" link="/admin/orders" />
      </div>

      <div className="content-grid">
        {/* Recent Orders Table */}
        <section className="card recent-orders">
          <div className="card-header">
            <h3>Recent Orders</h3>
            <Link to="/admin/orders" className="view-all-link">View All Orders <FiArrowRight /></Link>
          </div>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center">Loading Data...</td></tr>
                ) : (
                  recentOrders.map(o => (
                    <tr key={o._id} onClick={() => setSelectedOrder(o)}>
                      <td className="font-weight-medium">#{o.orderNumber || o._id.slice(-6).toUpperCase()}</td>
                      <td className="text-muted">{formatDate(o.createdAt)}</td>
                      <td className="font-weight-bold">{currency.format(o.total)}</td>
                      <td><span className={`status-badge ${o.status}`}>{o.status}</span></td>
                      <td><button className="btn-icon"><FiArrowRight /></button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Actions Panel */}
        <section className="card quick-actions">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="actions-list">
            <Link to="/admin/products/new" className="action-item">
              <div className="icon-box"><FiPlus /></div>
              <span>Add Product</span>
            </Link>
            <Link to="/admin/banners/upload" className="action-item">
              <div className="icon-box"><FiImage /></div>
              <span>Update Banner</span>
            </Link>
            <Link to="/admin/orders" className="action-item">
              <div className="icon-box"><FiList /></div>
              <span>Manage Orders</span>
            </Link>
            <Link to="/admin/registrations" className="action-item">
              <div className="icon-box"><FiUsers /></div>
              <span>Verify Users</span>
            </Link>
          </div>
        </section>
      </div>

      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, icon, color, link }: any) => (
  <Link to={link} className={`stat-card border-${color}`}>
    <div className="stat-info">
      <span className="stat-title">{title}</span>
      <h3 className="stat-value">{value}</h3>
    </div>
    <div className={`stat-icon bg-${color}`}>{icon}</div>
  </Link>
);

export default Dashboard;