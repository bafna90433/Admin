import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "../styles/TrafficAnalytics.css";
import IndiaHeatmap from "../components/IndiaHeatmap"; 
import {
  FiArrowLeft, FiActivity, FiUsers, FiClock, FiSmartphone, FiMonitor, 
  FiGlobe, FiSearch, FiInstagram, FiFacebook, FiMessageCircle
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
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => { fetchData(); }, []);

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
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const topPages = Object.entries(pageStats).sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <Link to="/admin/dashboard" className="back-link"><FiArrowLeft /> Back</Link>
          <h2>🚀 Live Traffic Analytics</h2>
          <p className="text-muted">Real-time user heatmap and activity.</p>
        </div>
        <div className="header-date"><FiClock style={{ marginRight: "6px" }} /> Last 7 Days</div>
      </header>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard title="Online Now" value={onlineCount} icon={<FiActivity />} color="green" pulse />
        <StatCard title="Total Visitors" value={totalVisitors} icon={<FiUsers />} color="blue" />
        <StatCard title="Mobile" value={deviceStats.mobile || 0} icon={<FiSmartphone />} color="purple" />
        <StatCard title="Desktop" value={deviceStats.desktop || 0} icon={<FiMonitor />} color="orange" />
      </div>

      <div className="content-grid-dashboard">
        
        {/* 🗺️ BIG MAP SECTION (Full Width) */}
        <section className="card map-card">
          <div className="card-header"><h3>📍 India User Heatmap</h3></div>
          <div style={{ padding: "10px" }}>
            <IndiaHeatmap stateStats={stateStats} />
          </div>
        </section>

        {/* Traffic Graph */}
        <section className="card" style={{ height: "350px" }}>
          <div className="card-header"><h3>📈 Traffic Trend</h3></div>
          <div className="graph-container">
             {loading ? <p>Loading...</p> : dailyStats.map((data) => (
                <div key={data.date} className="graph-bar-wrapper">
                  <div className="graph-bar-container">
                    <div className="bar-graph" style={{ height: `${(data.count/Math.max(...dailyStats.map(d=>d.count), 1))*100}%`, backgroundColor: "#6366f1" }}>
                        <span className="tooltip">{data.count}</span>
                    </div>
                  </div>
                  <span className="date-label">{new Date(data.date).getDate()}</span>
                </div>
             ))}
          </div>
        </section>

        {/* Traffic Sources */}
        <section className="card">
          <div className="card-header"><h3>🔗 Sources</h3></div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <SourceRow icon={<FiSearch />} label="Google" count={sourceStats?.google} color="#4285F4" />
            <SourceRow icon={<FiInstagram />} label="Instagram" count={sourceStats?.instagram} color="#E1306C" />
            <SourceRow icon={<FiFacebook />} label="Facebook" count={sourceStats?.facebook} color="#1877F2" />
            <SourceRow icon={<FiMessageCircle />} label="WhatsApp" count={sourceStats?.whatsapp} color="#25D366" />
            <SourceRow icon={<FiGlobe />} label="Direct" count={sourceStats?.direct} color="#94a3b8" />
          </div>
        </section>

        {/* Devices & OS */}
        <section className="card">
            <div className="card-header"><h3>📱 Devices & OS</h3></div>
            <div className="grid-2-col">
              <div>
                <h4 className="sub-title">Platform</h4>
                <ProgressBar label="Mobile" count={deviceStats.mobile} total={totalVisitors} color="#E1306C" />
                <ProgressBar label="Desktop" count={deviceStats.desktop} total={totalVisitors} color="#4285F4" />
              </div>
              <div>
                <h4 className="sub-title">OS</h4>
                <ProgressBar label="Android" count={osStats.android} total={totalVisitors} color="#3DDC84" />
                <ProgressBar label="iOS" count={osStats.ios} total={totalVisitors} color="#fff" />
              </div>
            </div>
        </section>

        {/* Top Pages */}
        <section className="card">
            <div className="card-header"><h3>🔥 Top Pages</h3></div>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead><tr><th>Page URL</th><th style={{textAlign:'right'}}>Views</th></tr></thead>
                <tbody>
                  {topPages.map(([url, count]) => (
                    <tr key={url}>
                      <td style={{color: '#6366f1'}}>{url.replace(/_/g, '.')}</td>
                      <td style={{textAlign:'right', fontWeight: 'bold'}}>{count}</td>
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

// Helper Components
const StatCard = ({ title, value, icon, color, pulse }: any) => (
  <div className={`stat-card border-${color}`}>
    <div className="stat-info"><span className="stat-title">{title}</span><h3 className="stat-value">{value} {pulse && <span className="live-pulse"></span>}</h3></div>
    <div className={`stat-icon bg-${color}`}>{icon}</div>
  </div>
);

const ProgressBar = ({ label, count, total, color }: any) => {
  const percent = total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", color: '#94a3b8' }}>
        <span>{label}</span><span style={{fontWeight: 'bold'}}>{count || 0} ({percent}%)</span>
      </div>
      <div style={{ width: "100%", background: "#2e2e48", height: "6px", borderRadius: "3px" }}>
        <div style={{ width: `${percent}%`, background: color, height: "100%", borderRadius: "3px" }}></div>
      </div>
    </div>
  );
};

const SourceRow = ({ icon, label, count, color }: any) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #2e2e48" }}>
    <div style={{ display: "flex", gap: "10px" }}><div style={{ color }}>{icon}</div><span style={{ color: "#cbd5e1" }}>{label}</span></div>
    <span style={{ fontWeight: "bold", color: "#fff" }}>{count || 0}</span>
  </div>
);

export default TrafficAnalytics;