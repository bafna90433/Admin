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
  FiTrendingUp,
  FiTrendingDown,
  FiArrowRight,
} from "react-icons/fi";

type Order = {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  items?: Array<{ qty: number; price: number; name?: string }>;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
  className?: string;
  link: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  className,
  link,
}) => (
  <Link to={link} className={`stat-card ${className || ""}`}>
    <div className="card-icon">{icon}</div>
    <div className="card-content">
      <h3 className="stat-title">{title}</h3>
      <p className="stat-value">{value}</p>
      {trend && trendValue && (
        <div className={`card-trend ${trend}`}>
          {trend === "up" ? (
            <FiTrendingUp size={14} />
          ) : (
            <FiTrendingDown size={14} />
          )}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  </Link>
);

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const Dashboard: React.FC = () => {
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Toast notifications
  const [notifications, setNotifications] = useState<string[]>([]);
  const showNotification = (msg: string) => {
    setNotifications((prev) => [...prev, msg]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 4000); // Auto-hide after 4s
  };

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
      const pending = customers.filter((c: any) => c.isApproved === null).length;
      setPendingApprovals(pending);
      const orders = Array.isArray(orderRes.data) ? orderRes.data : [];
      setOrdersCount(orders.length);
      const sorted = [...orders].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
      setRecentOrders(sorted.slice(0, 6));
      if (pending > 0) {
        showNotification(`${pending} new customer(s) registered`);
      }
      const newOrders = orders.filter((o) => o.status === "pending").length;
      if (newOrders > 0) {
        showNotification(`${newOrders} new order(s) placed`);
      }
    } catch (e) {
      console.error("Dashboard load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // Refresh every 15 sec
    return () => clearInterval(interval);
  }, []);

  const stats: StatCardProps[] = [
    {
      title: "Total Products",
      value: productsCount,
      icon: <FiPackage size={24} />,
      trend: "up",
      trendValue: "5%",
      className: "products",
      link: "/admin/products",
    },
    {
      title: "Total Customers",
      value: customersCount,
      icon: <FiUsers size={24} />,
      trend: "up",
      trendValue: "12%",
      className: "customers",
      link: "/admin/registrations",
    },
    {
      title: "Pending Approval",
      value: pendingApprovals,
      icon: <FiClock size={24} />,
      className: "approvals",
      link: "/admin/registrations",
    },
    {
      title: "Total Orders",
      value: ordersCount,
      icon: <FiShoppingCart size={24} />,
      trend: "up",
      trendValue: "8%",
      className: "orders",
      link: "/admin/orders",
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Stats Grid */}
      <div className="dashboard-stats">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Sections */}
      <div className="dashboard-sections">
        {/* Recent Orders */}
        <section className="dashboard-section recent-orders">
          <div className="section-header">
            <h3>Recent Orders</h3>
            <Link to="/admin/orders" className="view-all-btn">
              View All <FiArrowRight size={16} />
            </Link>
          </div>
          <div className="section-content">
            {loading ? (
              <div className="loading-placeholder">
                <div className="loading-spinner"></div>
                <p>Loading orders...</p>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="empty-state">
                <FiShoppingCart size={32} />
                <p>No orders yet</p>
                <span>
                  Orders will appear here once customers start placing them
                </span>
              </div>
            ) : (
              <div className="orders-list">
                {recentOrders.map((o) => (
                  <div
                    key={o._id}
                    className="order-card-md"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <div className="order-card-row">
                      <div className={`order-card-icon order-status-${o.status}`}>
                        <FiShoppingCart size={22} />
                      </div>
                      <div className="order-card-content">
                        <div className="order-card-label">
                          #{o.orderNumber || o._id.slice(-6)}
                        </div>
                        <div className="order-card-desc">
                          {o.items?.length || 0} items •{" "}
                          {currency.format(o.total || 0)}
                        </div>
                        <div className="order-card-status">
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </div>
                      </div>
                      <div className="order-card-menu">⋮</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-section quick-actions">
          <h3>Quick Actions</h3>
          <div className="section-content">
            <div className="action-buttons">
              <Link to="/admin/products/new" className="action-btn">
                <FiPackage size={20} />
                <span>Add Product</span>
              </Link>
              <Link to="/admin/registrations" className="action-btn">
                <FiUsers size={20} />
                <span>Manage Customers</span>
              </Link>
              <Link to="/admin/orders" className="action-btn">
                <FiShoppingCart size={20} />
                <span>View Orders</span>
              </Link>
              <Link to="/admin/registrations" className="action-btn">
                <FiClock size={20} />
                <span>Pending Approvals</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Order Modal */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {notifications.map((msg, i) => (
          <div key={i} className="toast">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
