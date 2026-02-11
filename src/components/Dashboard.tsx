import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios"; // ✅ Changed: Import axios directly
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
  FiList
} from "react-icons/fi";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_BASE =
  process.env.VITE_MEDIA_URL ||
  process.env.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

// ✅ Order Type
type Order = {
  _id: string;
  orderNumber?: string;
  createdAt?: string;
  items?: Array<{ qty: number; price: number; name?: string }>;
  total: number;
  status: string; // Status rahega par hum dikhayenge nahi
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

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const resolveImage = (img?: string) => {
  if (!img) return "/placeholder.png";
  if (img.startsWith("http")) return img;
  // ✅ Changed: Use local MEDIA_BASE
  return `${MEDIA_BASE}${img.startsWith("/") ? "" : "/"}${img}`;
};

const Dashboard: React.FC = () => {
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = async () => {
    try {
      // ✅ Changed: Using axios with API_BASE for all requests
      const [prodRes, custRes, orderRes, topProdRes, trafficRes] = await Promise.all([
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/admin/customers`),
        axios.get<Order[]>(`${API_BASE}/orders`),
        axios.get<TopProduct[]>(`${API_BASE}/orders/analytics/top-selling`),
        axios.get(`${API_BASE}/analytics/stats`).catch(() => ({ data: { totalVisitors: 0, dailyStats: [] } })),
      ]);

      setProductsCount(prodRes.data?.length || 0);
      setCustomersCount((custRes.data || []).length);

      const orders = Array.isArray(orderRes.data) ? orderRes.data : [];
      setOrdersCount(orders.length);

      setRecentOrders(
        [...orders]
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
          )
          .slice(0, 10)
      );

      setTopProducts(topProdRes.data || []);
      
      if (trafficRes.data) {
        setTotalVisitors(trafficRes.data.totalVisitors || 0);
        setTrafficData(trafficRes.data.dailyStats || []);
      }

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
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const maxTraffic = Math.max(...trafficData.map(d => d.count), 1);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="text-muted">
            Welcome back, Admin. Here's your business at a glance.
          </p>
        </div>
        <div className="header-date">
          📅{" "}
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard title="Total Visitors" value={totalVisitors} icon={<FiActivity />} color="blue" link="#" />
        <StatCard title="Total Customers" value={customersCount} icon={<FiUsers />} color="green" link="/admin/registrations" />
        <StatCard title="Total Orders" value={ordersCount} icon={<FiShoppingCart />} color="purple" link="/admin/orders" />
        <StatCard title="Top Product Sold" value={topProducts[0]?.totalSold || 0} icon={<FiTrendingUp />} color="orange" link="#" />
      </div>

      <div className="content-grid-dashboard">
        
        {/* ✅ Left Column: STATUS COLUMN REMOVED */}
        <div className="main-content">
          <section className="card recent-orders">
            <div className="card-header">
              <h3>📦 Recent Orders</h3>
              <Link to="/admin/orders" className="view-all-link">
                View All Orders <FiArrowRight />
              </Link>
            </div>

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Order Info</th>
                    <th>Customer</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    {/* ❌ Status Column Removed */}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="text-center p-4">Loading Data...</td></tr>
                  ) : recentOrders.length === 0 ? (
                    <tr><td colSpan={3} className="text-center p-4 text-muted">No orders found.</td></tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o._id} onClick={() => setSelectedOrder(o)} className="hover-row">
                        {/* Order ID & Date */}
                        <td>
                          <div className="font-weight-bold text-dark">
                            #{o.orderNumber || o._id.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-muted small" style={{ fontSize: "11px" }}>
                            {formatDate(o.createdAt)}
                          </div>
                        </td>

                        {/* Customer */}
                        <td>
                          <div className="font-weight-medium text-dark">
                            {o.customerId?.shopName || "Guest User"}
                          </div>
                          <div className="text-muted small" style={{ fontSize: "11px", display: "flex", gap: "6px", alignItems: "center" }}>
                            <FiMapPin size={10} /> {o.customerId?.city || "Unknown City"}
                          </div>
                        </td>

                        {/* Amount */}
                        <td style={{ textAlign: "right" }}>
                          <div className="font-weight-bold">{currency.format(o.total)}</div>
                          <div className="text-muted small" style={{ fontSize: "11px" }}>
                            {o.items?.length || 0} Items
                          </div>
                        </td>
                        
                        {/* ❌ Status Cell Removed */}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: Traffic & Top Selling */}
        <div className="side-content">
          
          {/* Traffic Graph */}
          <section className="card traffic-stats mb-4">
            <div className="card-header">
              <h3>📊 Website Traffic (7 Days)</h3>
            </div>
            <div className="traffic-chart-container" style={{ padding: '20px', display: 'flex', alignItems: 'flex-end', height: '180px', gap: '8px' }}>
                {trafficData.length === 0 ? (
                    <p className="text-muted text-center w-100">No traffic data yet.</p>
                ) : (
                    trafficData.map((data) => (
                        <div key={data.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div className="bar-value" style={{ fontSize: '10px', fontWeight: 'bold', color: '#2c5aa0' }}>{data.count}</div>
                            <div 
                                className="bar" 
                                style={{ 
                                    width: '100%', 
                                    backgroundColor: '#3b82f6', 
                                    borderRadius: '4px', 
                                    height: `${(data.count / maxTraffic) * 100}%`,
                                    minHeight: '4px',
                                    transition: 'height 0.5s ease-in-out',
                                    opacity: 0.8
                                }}
                                title={`${data.date}: ${data.count} visitors`}
                            ></div>
                            <div className="bar-date" style={{ fontSize: '9px', color: '#64748b' }}>{data.date.slice(8)}</div>
                        </div>
                    ))
                )}
            </div>
          </section>

          {/* Top Selling */}
          <section className="card top-selling">
            <div className="card-header">
              <h3>🏆 Top Selling</h3>
            </div>
            <div className="top-products-list">
              {topProducts.length === 0 ? (
                <p className="text-muted text-center p-4">No sales data yet.</p>
              ) : (
                topProducts.map((prod, index) => (
                  <div key={prod._id} className="top-product-item">
                    <div className="rank">#{index + 1}</div>
                    <img src={resolveImage(prod.image)} alt={prod.name} className="top-prod-img" onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.png")} />
                    <div className="top-prod-info">
                      <span className="prod-name" title={prod.name}>{prod.name}</span>
                      <span className="prod-stats">{prod.totalSold} sold</span>
                    </div>
                    <div className="prod-revenue">{currency.format(prod.totalRevenue)}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="card quick-actions mt-4">
            <div className="card-header">
              <h3>⚡ Quick Actions</h3>
            </div>
            <div className="actions-list">
              <Link to="/admin/products/new" className="action-item">
                <div className="icon-box bg-blue"><FiPlus /></div>
                <span>Add New Product</span>
              </Link>
              <Link to="/admin/banners/upload" className="action-item">
                <div className="icon-box bg-purple"><FiImage /></div>
                <span>Update App Banners</span>
              </Link>
              <Link to="/admin/orders" className="action-item">
                <div className="icon-box bg-green"><FiList /></div>
                <span>Manage Orders</span>
              </Link>
            </div>
          </section>
        </div>
      </div>

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

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