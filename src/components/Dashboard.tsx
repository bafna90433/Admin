// src/components/Dashboard.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Dashboard.css";
import { FiPackage, FiUsers, FiClock, FiShoppingCart } from "react-icons/fi";

const API_BASE = "http://localhost:5000";

type Order = {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  items?: Array<{ qty: number; price: number }>;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
}) => (
  <div className="stat-card">
    <div className="card-icon">{icon}</div>
    <div className="card-content">
      <h3 className="stat-title">{title}</h3>
      <p className="stat-value">{value}</p>
      {trend && trendValue && (
        <div className={`card-trend ${trend}`}>
          {trend === "up" ? "↑" : "↓"} {trendValue}
        </div>
      )}
    </div>
  </div>
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

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, custRes, orderRes] = await Promise.all([
          axios.get(`${API_BASE}/api/products`),
          axios.get(`${API_BASE}/api/admin/customers`),
          axios.get<Order[]>(`${API_BASE}/api/orders`),
        ]);

        setProductsCount(prodRes.data?.length || 0);

        const customers = custRes.data || [];
        setCustomersCount(customers.length);
        setPendingApprovals(
          customers.filter((c: any) => c.isApproved === null).length
        );

        const orders = Array.isArray(orderRes.data) ? orderRes.data : [];
        setOrdersCount(orders.length);

        const sorted = [...orders].sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        setRecentOrders(sorted.slice(0, 6));
      } catch (e) {
        console.error("Dashboard load failed:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats: StatCardProps[] = [
    {
      title: "Total Products",
      value: productsCount,
      icon: <FiPackage size={24} color="#f57c00" />,
      trend: "down",
      trendValue: "3%",
    },
    {
      title: "Total Customers",
      value: customersCount,
      icon: <FiUsers size={24} color="#388e3c" />,
      trend: "up",
      trendValue: "5%",
    },
    {
      title: "Pending Approval",
      value: pendingApprovals,
      icon: <FiClock size={24} color="#bdb313" />,
      trend: "up",
    },
    {
      title: "Total Orders",
      value: ordersCount,
      icon: <FiShoppingCart size={24} color="#1976d2" />,
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h2>
          Welcome, Admin <span className="welcome-emoji">👋</span>
        </h2>
        <p className="dashboard-subtitle">
          Here's what's happening with your store today
        </p>
      </header>

      <div className="dashboard-stats">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h3>Recent Orders</h3>
          <div className="section-content">
            {loading ? (
              <p className="placeholder-text">Loading…</p>
            ) : recentOrders.length === 0 ? (
              <p className="placeholder-text">No orders yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td>{o.orderNumber || o._id.slice(-6)}</td>
                      <td>
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td>{o.items?.length || 0}</td>
                      <td>{currency.format(o.total || 0)}</td>
                      <td>
                        <span className={`badge ${o.status}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Sales Overview</h3>
          <div className="section-content">
            <p className="placeholder-text">Sales chart will appear here.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
