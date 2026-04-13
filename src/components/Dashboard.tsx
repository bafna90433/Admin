import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import "../styles/Dashboard.css";
import OrderModal from "./OrderModal";
import {
  FiPackage,
  FiUsers,
  FiShoppingCart,
  FiArrowRight,
  FiPlus,
  FiImage,
  FiTrendingUp,
  FiMapPin,
  FiActivity,
  FiList,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiEye,
  FiChevronRight,
  FiRefreshCw,
  FiBarChart2,
  FiAward,
  FiZap,
  FiExternalLink,
  FiBox,
  FiHash,
  FiUser,
} from "react-icons/fi";


const MEDIA_BASE =
  (import.meta as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

/* ===== TYPES ===== */
type Order = {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  items?: Array<{ qty: number; price: number; name?: string }>;
  total: number;
  status: string;
  customerId?: {
    firmName?: string;
    shopName?: string;
    city?: string;
    otpMobile?: string;
  };
};

type TopProduct = {
  _id: string;
  name: string;
  image: string;
  totalSold: number;
  totalRevenue: number;
};

type TrafficData = {
  date: string;
  count: number;
};

/* ===== HELPERS ===== */
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const resolveImage = (img?: string) => {
  if (!img) return "/placeholder.png";
  if (img.startsWith("http")) return img;
  return `${MEDIA_BASE}${img.startsWith("/") ? "" : "/"}${img}`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const rankColors = ["#f59e0b", "#94a3b8", "#cd7f32"];
const rankEmojis = ["🥇", "🥈", "🥉"];

/* ===== COMPONENT ===== */
const Dashboard: React.FC = () => {
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      const [prodRes, custRes, orderRes, topProdRes, trafficRes] =
        await Promise.all([
          api.get(`/products`),
          api.get(`/admin/customers`),
          api.get<{ orders: Order[]; pagination: any } | Order[]>(`/orders`),
          api
            .get<TopProduct[]>(`/orders/analytics/top-selling`)
            .catch(() => ({ data: [] })),
          api
            .get(`/analytics/stats`)
            .catch(() => ({
              data: { totalVisitors: 0, dailyStats: [] },
            })),
        ]);

      setProductsCount(prodRes.data?.length || 0);
      // customers endpoint now returns { customers, pagination }
      const custData = custRes.data?.customers || custRes.data || [];
      setCustomersCount(custRes.data?.pagination?.total ?? custData.length);

      const orders: Order[] = Array.isArray(orderRes.data)
        ? orderRes.data
        : orderRes.data?.orders || [];
      setOrdersCount(orders.length);
      setTotalRevenue(orders.reduce((s, o) => s + (o.total || 0), 0));

      setRecentOrders(
        [...orders]
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
          )
          .slice(0, 8)
      );

      setTopProducts((topProdRes.data || []).slice(0, 5));

      if (trafficRes.data) {
        setTotalVisitors(trafficRes.data.totalVisitors || 0);
        setTrafficData(trafficRes.data.dailyStats || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, []);

  const maxTraffic = Math.max(...trafficData.map((d) => d.count), 1);
  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="db-loading">
        <div className="db-loading-spinner" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="db-wrapper">
      {/* ===== HEADER ===== */}
      <header className="db-header">
        <div className="db-header-left">
          <div className="db-header-greeting">
            <h1>{getGreeting()}, Admin 👋</h1>
            <p>Here's what's happening with your business today.</p>
          </div>
        </div>
        <div className="db-header-right">
          <div className="db-date-chip">
            <FiCalendar size={14} />
            <span>{todayStr}</span>
          </div>
          <button
            className={`db-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh Data"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* ===== STATS CARDS ===== */}
      <div className="db-stats">
        <Link to="#" className="db-stat-card db-stat-visitors">
          <div className="db-stat-icon-wrap">
            <div className="db-stat-icon">
              <FiActivity size={22} />
            </div>
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Total Visitors</span>
            <span className="db-stat-value">
              {totalVisitors.toLocaleString()}
            </span>
          </div>
          <div className="db-stat-decoration" />
        </Link>

        <Link to="/admin/registrations" className="db-stat-card db-stat-customers">
          <div className="db-stat-icon-wrap">
            <div className="db-stat-icon">
              <FiUsers size={22} />
            </div>
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Total Customers</span>
            <span className="db-stat-value">
              {customersCount.toLocaleString()}
            </span>
          </div>
          <div className="db-stat-decoration" />
        </Link>

        <Link to="/admin/orders" className="db-stat-card db-stat-orders">
          <div className="db-stat-icon-wrap">
            <div className="db-stat-icon">
              <FiShoppingCart size={22} />
            </div>
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Total Orders</span>
            <span className="db-stat-value">
              {ordersCount.toLocaleString()}
            </span>
          </div>
          <div className="db-stat-decoration" />
        </Link>

        <Link to="/admin/orders" className="db-stat-card db-stat-revenue">
          <div className="db-stat-icon-wrap">
            <div className="db-stat-icon">
              <FiDollarSign size={22} />
            </div>
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Total Revenue</span>
            <span className="db-stat-value">{currency.format(totalRevenue)}</span>
          </div>
          <div className="db-stat-decoration" />
        </Link>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="db-grid">
        {/* LEFT: Recent Orders */}
        <div className="db-main">
          <section className="db-card db-orders-card">
            <div className="db-card-head">
              <div className="db-card-title">
                <div className="db-card-title-icon db-icon-purple">
                  <FiPackage size={18} />
                </div>
                <div>
                  <h3>Recent Orders</h3>
                  <span className="db-card-subtitle">
                    Latest {recentOrders.length} orders
                  </span>
                </div>
              </div>
              <Link to="/admin/orders" className="db-card-link">
                View All <FiArrowRight size={14} />
              </Link>
            </div>

            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>
                      <FiHash size={12} /> Order
                    </th>
                    <th>
                      <FiUser size={12} /> Customer
                    </th>
                    <th>
                      <FiClock size={12} /> Date
                    </th>
                    <th className="db-th-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="db-table-empty">
                        <FiBox size={32} />
                        <span>No orders found</span>
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o, idx) => (
                      <tr
                        key={o._id}
                        onClick={() => setSelectedOrder(o)}
                        className="db-table-row"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <td>
                          <div className="db-order-id">
                            <span className="db-order-hash">
                              #{o.orderNumber || o._id.slice(-6).toUpperCase()}
                            </span>
                            <span className="db-order-items">
                              {o.items?.length || 0} items
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="db-customer-cell">
                            <div className="db-customer-avatar">
                              {(
                                o.customerId?.shopName ||
                                "G"
                              )[0].toUpperCase()}
                            </div>
                            <div className="db-customer-info">
                              <span className="db-customer-name">
                                {o.customerId?.shopName || "Guest"}
                              </span>
                              <span className="db-customer-city">
                                <FiMapPin size={10} />
                                {o.customerId?.city || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="db-date-cell">
                            <span className="db-date-val">
                              {formatDate(o.createdAt)}
                            </span>
                            <span className="db-time-val">
                              {formatTime(o.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="db-td-right">
                          <span className="db-amount">
                            {currency.format(o.total)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="db-side">
          {/* Traffic */}
          <section className="db-card db-traffic-card">
            <div className="db-card-head">
              <div className="db-card-title">
                <div className="db-card-title-icon db-icon-blue">
                  <FiBarChart2 size={18} />
                </div>
                <div>
                  <h3>Website Traffic</h3>
                  <span className="db-card-subtitle">Last 7 days</span>
                </div>
              </div>
              <div className="db-traffic-total">
                <FiEye size={14} />
                <span>{totalVisitors.toLocaleString()}</span>
              </div>
            </div>

            <div className="db-chart">
              {trafficData.length === 0 ? (
                <div className="db-chart-empty">
                  <FiBarChart2 size={28} />
                  <span>No traffic data yet</span>
                </div>
              ) : (
                <div className="db-bars">
                  {trafficData.map((d, i) => {
                    const pct = (d.count / maxTraffic) * 100;
                    const day = new Date(d.date).toLocaleDateString(
                      "en-IN",
                      { weekday: "short" }
                    );
                    return (
                      <div
                        key={d.date}
                        className="db-bar-col"
                        title={`${d.date}: ${d.count} visitors`}
                      >
                        <span className="db-bar-value">{d.count}</span>
                        <div className="db-bar-track">
                          <div
                            className="db-bar-fill"
                            style={{
                              height: `${Math.max(pct, 6)}%`,
                              animationDelay: `${i * 80}ms`,
                            }}
                          />
                        </div>
                        <span className="db-bar-label">{day}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Top Selling */}
          <section className="db-card db-top-card">
            <div className="db-card-head">
              <div className="db-card-title">
                <div className="db-card-title-icon db-icon-amber">
                  <FiAward size={18} />
                </div>
                <div>
                  <h3>Top Selling</h3>
                  <span className="db-card-subtitle">Best performers</span>
                </div>
              </div>
            </div>

            <div className="db-top-list">
              {topProducts.length === 0 ? (
                <div className="db-top-empty">
                  <FiTrendingUp size={28} />
                  <span>No sales data yet</span>
                </div>
              ) : (
                topProducts.map((prod, i) => (
                  <div
                    key={prod._id}
                    className="db-top-item"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="db-top-rank">
                      {i < 3 ? (
                        <span className="db-rank-emoji">
                          {rankEmojis[i]}
                        </span>
                      ) : (
                        <span className="db-rank-num">#{i + 1}</span>
                      )}
                    </div>
                    <img
                      src={resolveImage(prod.image)}
                      alt={prod.name}
                      className="db-top-img"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src =
                          "/placeholder.png")
                      }
                    />
                    <div className="db-top-info">
                      <span className="db-top-name" title={prod.name}>
                        {prod.name}
                      </span>
                      <span className="db-top-sold">
                        <FiPackage size={10} /> {prod.totalSold} sold
                      </span>
                    </div>
                    <div className="db-top-revenue">
                      {currency.format(prod.totalRevenue)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="db-card db-actions-card">
            <div className="db-card-head">
              <div className="db-card-title">
                <div className="db-card-title-icon db-icon-emerald">
                  <FiZap size={18} />
                </div>
                <div>
                  <h3>Quick Actions</h3>
                  <span className="db-card-subtitle">Common shortcuts</span>
                </div>
              </div>
            </div>

            <div className="db-actions-list">
              <Link to="/admin/products/new" className="db-action-item">
                <div className="db-action-icon db-action-blue">
                  <FiPlus size={18} />
                </div>
                <div className="db-action-text">
                  <span className="db-action-name">Add New Product</span>
                  <span className="db-action-desc">
                    Create a new product listing
                  </span>
                </div>
                <FiChevronRight size={16} className="db-action-arrow" />
              </Link>

              <Link to="/admin/banners/upload" className="db-action-item">
                <div className="db-action-icon db-action-purple">
                  <FiImage size={18} />
                </div>
                <div className="db-action-text">
                  <span className="db-action-name">Update Banners</span>
                  <span className="db-action-desc">
                    Manage app banner images
                  </span>
                </div>
                <FiChevronRight size={16} className="db-action-arrow" />
              </Link>

              <Link to="/admin/orders" className="db-action-item">
                <div className="db-action-icon db-action-green">
                  <FiList size={18} />
                </div>
                <div className="db-action-text">
                  <span className="db-action-name">Manage Orders</span>
                  <span className="db-action-desc">
                    View and process all orders
                  </span>
                </div>
                <FiChevronRight size={16} className="db-action-arrow" />
              </Link>

              <Link to="/admin/registrations" className="db-action-item">
                <div className="db-action-icon db-action-orange">
                  <FiUsers size={18} />
                </div>
                <div className="db-action-text">
                  <span className="db-action-name">View Customers</span>
                  <span className="db-action-desc">
                    See registered customers
                  </span>
                </div>
                <FiChevronRight size={16} className="db-action-arrow" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* ORDER MODAL */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;