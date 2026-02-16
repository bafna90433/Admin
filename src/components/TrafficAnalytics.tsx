import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/TrafficAnalytics.css";
import IndiaHeatmap from "../components/IndiaHeatmap";
import {
  FiArrowLeft,
  FiActivity,
  FiUsers,
  FiClock,
  FiSmartphone,
  FiMonitor,
  FiGlobe,
  FiSearch,
  FiInstagram,
  FiFacebook,
  FiMessageCircle,
} from "react-icons/fi";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "https://bafnatoys-backend-production.up.railway.app/api";
const SOCKET_BASE = API_BASE.replace(/\/api\/?$/, "");

const TrafficAnalytics: React.FC = () => {
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [sourceStats, setSourceStats] = useState<any>({});
  const [deviceStats, setDeviceStats] = useState<any>({});
  const [osStats, setOsStats] = useState<any>({});
  const [pageStats, setPageStats] = useState<Record<string, number>>({});
  const [stateStats, setStateStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = io(SOCKET_BASE, { transports: ["websocket"] });
    socket.on("updateUserCount", (count: number) => setOnlineCount(count));
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/analytics/stats`);
      setTotalVisitors(res.data.totalVisitors || 0);
      setDailyStats(res.data.dailyStats || []);
      setSourceStats(res.data.source || {});
      setDeviceStats(res.data.device || {});
      setOsStats(res.data.os || {});
      setPageStats(res.data.pages || {});
      setStateStats(res.data.states || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const topPages = Object.entries(pageStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <Link to="/admin/dashboard" className="back-link">
            <FiArrowLeft /> Back
          </Link>
          <h2>🚀 Live Traffic Analytics</h2>
          <p className="text-muted">Real-time user heatmap and activity.</p>
        </div>
        <div className="header-date">
          <FiClock style={{ marginRight: "6px" }} /> Last 7 Days
        </div>
      </header>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          title="Online Now"
          value={onlineCount}
          icon={<FiActivity />}
          color="green"
          pulse
        />
        <StatCard
          title="Total Visitors"
          value={totalVisitors}
          icon={<FiUsers />}
          color="blue"
        />
        <StatCard
          title="Mobile"
          value={deviceStats.mobile || 0}
          icon={<FiSmartphone />}
          color="purple"
        />
        <StatCard
          title="Desktop"
          value={deviceStats.desktop || 0}
          icon={<FiMonitor />}
          color="orange"
        />
      </div>

      {/* ✅ NEW GRID LAYOUT: Graph Left | Map Right */}
      <div className="top-section-grid">
        {/* Left: Traffic Trend (Bigger) */}
        <section className="card graph-card">
          <div className="card-header">
            <h3>📈 Traffic Trend</h3>
          </div>
          <div className="graph-container">
            {loading ? (
              <p>Loading...</p>
            ) : (
              dailyStats.map((data) => (
                <div key={data.date} className="graph-bar-wrapper">
                  <div className="graph-bar-container">
                    <div
                      className="bar-graph"
                      style={{
                        height: `${
                          (data.count /
                            Math.max(...dailyStats.map((d) => d.count), 1)) *
                          100
                        }%`,
                        backgroundColor: "#4318FF",
                      }}
                    >
                      <span className="tooltip">{data.count}</span>
                    </div>
                  </div>
                  <span className="date-label">
                    {new Date(data.date).getDate()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right: India Map (Smaller Side Panel) */}
        <section className="card map-card-side">
          <div className="card-header">
            <h3>📍 User Locations</h3>
          </div>
          <div style={{ padding: "0px", display: "flex", justifyContent: "center" }}>
            {/* Map Component fits nicely here */}
            <IndiaHeatmap stateStats={stateStats} />
          </div>
        </section>
      </div>

      {/* Bottom Grid: Sources, Devices, Pages */}
      <div className="bottom-section-grid">
        {/* Traffic Sources */}
        <section className="card">
          <div className="card-header">
            <h3>🔗 Sources</h3>
          </div>
          <div className="list-container">
            <SourceRow
              icon={<FiSearch />}
              label="Google"
              count={sourceStats?.google}
              color="#4285F4"
            />
            <SourceRow
              icon={<FiInstagram />}
              label="Instagram"
              count={sourceStats?.instagram}
              color="#E1306C"
            />
            <SourceRow
              icon={<FiFacebook />}
              label="Facebook"
              count={sourceStats?.facebook}
              color="#1877F2"
            />
            <SourceRow
              icon={<FiMessageCircle />}
              label="WhatsApp"
              count={sourceStats?.whatsapp}
              color="#25D366"
            />
            <SourceRow
              icon={<FiGlobe />}
              label="Direct"
              count={sourceStats?.direct}
              color="#A3AED0"
            />
          </div>
        </section>

        {/* Devices & OS */}
        <section className="card">
          <div className="card-header">
            <h3>📱 Devices & OS</h3>
          </div>
          <div className="grid-2-col-mini">
            <div>
              <h4 className="sub-title">Platform</h4>
              <ProgressBar
                label="Mobile"
                count={deviceStats.mobile}
                total={totalVisitors}
                color="#E1306C"
              />
              <ProgressBar
                label="Desktop"
                count={deviceStats.desktop}
                total={totalVisitors}
                color="#4318FF"
              />
            </div>
            <div>
              <h4 className="sub-title">OS</h4>
              <ProgressBar
                label="Android"
                count={osStats.android}
                total={totalVisitors}
                color="#05CD99"
              />
              <ProgressBar
                label="iOS"
                count={osStats.ios}
                total={totalVisitors}
                color="#2B3674"
              />
            </div>
          </div>
        </section>

        {/* Top Pages */}
        <section className="card">
          <div className="card-header">
            <h3>🔥 Top Pages</h3>
          </div>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Page URL</th>
                  <th style={{ textAlign: "right" }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map(([url, count]) => (
                  <tr key={url}>
                    <td style={{ color: "#4318FF", fontWeight: 600 }}>
                      {url.replace(/_/g, ".")}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "bold" }}>
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

// Helper Components (Unchanged logic, just ensure styling)
const StatCard = ({ title, value, icon, color, pulse }: any) => (
  <div className={`stat-card color-${color}`}>
    <div className="stat-info">
      <span className="stat-title">{title}</span>
      <h3 className="stat-value">
        {value} {pulse && <span className="live-pulse"></span>}
      </h3>
    </div>
    <div className={`stat-icon bg-${color}`}>{icon}</div>
  </div>
);

const ProgressBar = ({ label, count, total, color }: any) => {
  const percent = total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div className="progress-label">
        <span>{label}</span>
        <span style={{ fontWeight: "bold", color: "#2B3674" }}>
          {count} ({percent}%)
        </span>
      </div>
      <div className="progress-bg">
        <div
          className="progress-fill"
          style={{ width: `${percent}%`, background: color }}
        ></div>
      </div>
    </div>
  );
};

const SourceRow = ({ icon, label, count, color }: any) => (
  <div className="source-row">
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <div style={{ color, fontSize: "1.2rem" }}>{icon}</div>
      <span style={{ color: "#2B3674", fontWeight: 500 }}>{label}</span>
    </div>
    <span style={{ fontWeight: "bold", color: "#4318FF" }}>{count || 0}</span>
  </div>
);

export default TrafficAnalytics;