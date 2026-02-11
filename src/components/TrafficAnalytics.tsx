import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client"; // ✅ Added Socket.io Client
import "../styles/TrafficAnalytics.css";
import {
  FiArrowLeft, FiActivity, FiUsers, FiCalendar, FiTrendingUp, FiClock,
  FiGlobe, FiInstagram, FiFacebook, FiSearch, FiMessageCircle
} from "react-icons/fi";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

// Socket connection should point to the root of your backend
const SOCKET_BASE = API_BASE.replace(/\/api\/?$/, "");

type TrafficData = { date: string; count: number; };
type SourceData = { google: number; instagram: number; facebook: number; whatsapp: number; direct: number; other: number; };

// Helper to get Flag Emoji based on country code
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode === "Unknown") return "🏳️";
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const TrafficAnalytics: React.FC = () => {
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0); // ✅ New: Online Users Count
  const [dailyStats, setDailyStats] = useState<TrafficData[]>([]);
  const [sourceStats, setSourceStats] = useState<SourceData | null>(null);
  const [countryStats, setCountryStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // ✅ Real-time Socket Connection
  useEffect(() => {
    const socket = io(SOCKET_BASE);

    socket.on("updateUserCount", (count: number) => {
      setOnlineCount(count);
    });

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
      
      const stats = res.data.dailyStats || [];
      const sortedStats = stats.sort((a: TrafficData, b: TrafficData) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setDailyStats(sortedStats);

      setSourceStats(res.data.sourceStats || { google: 0, instagram: 0, facebook: 0, whatsapp: 0, direct: 0, other: 0 });
      setCountryStats(res.data.countryStats || {});

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const todayDate = new Date().toISOString().split("T")[0];
  const todayVisits = dailyStats.find(d => d.date === todayDate)?.count || 0;
  const maxTraffic = Math.max(...dailyStats.map(d => d.count), 10);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header" style={{ marginBottom: "20px" }}>
        <div>
            <Link to="/admin/dashboard" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#718096', textDecoration: 'none', marginBottom: '10px', fontSize: '14px' }}>
                <FiArrowLeft /> Back to Dashboard
            </Link>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c' }}>Website Traffic Analytics</h2>
            <p className="text-muted">Detailed report of your store's visitors and performance.</p>
        </div>
        <div className="header-date">
            <FiClock style={{ marginRight: '6px' }} />
            Last 7 Days Report
        </div>
      </header>

      {/* KPI Cards */}
      <div className="stats-grid">
        {/* ✅ New Real-time Online Users Card */}
        <div className="stat-card border-green">
          <div className="stat-info">
            <span className="stat-title">Online Now</span>
            <h3 className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onlineCount} 
              <span className="live-pulse"></span>
            </h3>
          </div>
          <div className="stat-icon bg-green"><FiActivity /></div>
        </div>

        <div className="stat-card border-blue">
          <div className="stat-info"><span className="stat-title">Total Visitors</span><h3 className="stat-value">{totalVisitors.toLocaleString()}</h3></div>
          <div className="stat-icon bg-blue"><FiUsers /></div>
        </div>
        <div className="stat-card border-purple">
          <div className="stat-info"><span className="stat-title">Visits Today</span><h3 className="stat-value">{todayVisits}</h3></div>
          <div className="stat-icon bg-purple"><FiTrendingUp /></div>
        </div>
        <div className="stat-card border-orange">
          <div className="stat-info"><span className="stat-title">Avg. Daily</span><h3 className="stat-value">{dailyStats.length > 0 ? Math.round(totalVisitors / 30) : 0}</h3></div>
          <div className="stat-icon bg-orange"><FiClock /></div>
        </div>
      </div>

      <div className="content-grid-dashboard">
        {/* Main Content Area */}
        <div className="main-content">
            {/* 📈 Traffic Graph */}
            <section className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
                <div className="card-header"><h3>📈 Traffic Trend</h3></div>
                <div style={{ flex: 1, padding: '30px', display: 'flex', alignItems: 'flex-end', gap: '15px', justifyContent: 'space-between' }}>
                    {loading ? <p className="w-100 text-center">Loading...</p> : dailyStats.map((data) => {
                        const heightPercentage = (data.count / maxTraffic) * 100;
                        return (
                            <div key={data.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                                    <div className="bar-graph" style={{ width: '100%', backgroundColor: data.date === todayDate ? '#10b981' : '#3b82f6', borderRadius: '6px 6px 0 0', height: `${heightPercentage}%`, minHeight: '4px', transition: 'height 0.8s ease-in-out', opacity: 0.85, position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 'bold', color: '#4a5568' }}>{data.count}</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '11px', color: '#718096' }}>{new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Split Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 🔗 Traffic Sources */}
                <section className="card">
                    <div className="card-header"><h3>🔗 Traffic Sources</h3></div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <SourceRow icon={<FiSearch />} label="Google" count={sourceStats?.google} color="#4285F4" />
                        <SourceRow icon={<FiInstagram />} label="Instagram" count={sourceStats?.instagram} color="#E1306C" />
                        <SourceRow icon={<FiFacebook />} label="Facebook" count={sourceStats?.facebook} color="#1877F2" />
                        <SourceRow icon={<FiMessageCircle />} label="WhatsApp" count={sourceStats?.whatsapp} color="#25D366" />
                        <SourceRow icon={<FiGlobe />} label="Direct / Other" count={(sourceStats?.direct || 0) + (sourceStats?.other || 0)} color="#718096" />
                    </div>
                </section>

                {/* 🗺️ Top Countries */}
                <section className="card">
                    <div className="card-header"><h3>🗺️ Top Countries</h3></div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(countryStats).length === 0 ? (
                            <p className="text-muted text-center">No country data yet.</p>
                        ) : (
                            Object.entries(countryStats)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 5)
                                .map(([code, count]) => (
                                    <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{getFlagEmoji(code)}</span>
                                            <span style={{ fontWeight: '600', color: '#2d3748' }}>{code === "Unknown" ? "Unknown" : new Intl.DisplayNames(['en'], { type: 'region' }).of(code)}</span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: '#2c5aa0' }}>{count}</span>
                                    </div>
                                ))
                        )}
                    </div>
                </section>
            </div>
        </div>

        {/* Right Column: Daily Breakdown */}
        <div className="side-content">
            <section className="card">
                <div className="card-header"><h3>📅 Daily Breakdown</h3></div>
                <div className="table-responsive">
                    <table className="dashboard-table">
                        <thead><tr><th>Date</th><th style={{ textAlign: 'right' }}>Visitors</th></tr></thead>
                        <tbody>
                            {dailyStats.slice().reverse().map((data) => ( 
                                <tr key={data.date}>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiCalendar size={14} color="#718096" />
                                        {new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        {data.date === todayDate && <span className="status-badge delivered" style={{ fontSize: '9px', padding: '2px 6px' }}>Today</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '600' }}>{data.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Source Row
const SourceRow = ({ icon, label, count, color }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: color, fontSize: '1.2rem' }}>{icon}</div>
          <span style={{ fontWeight: '500', color: '#4a5568' }}>{label}</span>
      </div>
      <span style={{ fontWeight: '700', color: '#1e293b' }}>{count || 0}</span>
  </div>
);

export default TrafficAnalytics;