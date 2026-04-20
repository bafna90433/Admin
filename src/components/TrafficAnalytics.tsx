import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api, { API_URL } from "../utils/api";
import { io } from "socket.io-client";
import "../styles/TrafficAnalytics.css";
import IndiaHeatmap from "../components/IndiaHeatmap";
import {
  FiArrowLeft,
  FiActivity,
  FiUsers,
  FiSmartphone,
  FiMonitor,
  FiTablet,
  FiGlobe,
  FiSearch,
  FiInstagram,
  FiFacebook,
  FiMessageCircle,
  FiRefreshCw,
  FiTrendingUp,
  FiCalendar,
  FiAward,
  FiMapPin,
  FiChrome,
  FiCompass,
  FiExternalLink,
  FiEye,
  FiBarChart2,
  FiLink,
  FiLayers,
} from "react-icons/fi";

const SOCKET_BASE = API_URL.replace(/\/api\/?$/, "");

/* ── Indian state code → full name (for leaderboard display) ── */
const STATE_NAMES: Record<string, string> = {
  AN: "Andaman & Nicobar", AP: "Andhra Pradesh", AR: "Arunachal Pradesh",
  AS: "Assam", BR: "Bihar", CH: "Chandigarh", CT: "Chhattisgarh",
  DN: "Dadra & Nagar Haveli", DD: "Daman & Diu", DL: "Delhi", GA: "Goa",
  GJ: "Gujarat", HR: "Haryana", HP: "Himachal Pradesh", JK: "Jammu & Kashmir",
  JH: "Jharkhand", KA: "Karnataka", KL: "Kerala", LA: "Ladakh",
  LD: "Lakshadweep", MP: "Madhya Pradesh", MH: "Maharashtra", MN: "Manipur",
  ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland", OR: "Odisha", PY: "Puducherry",
  PB: "Punjab", RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu",
  TG: "Telangana", TR: "Tripura", UP: "Uttar Pradesh", UT: "Uttarakhand",
  WB: "West Bengal",
};

const TrafficAnalytics: React.FC = () => {
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [sourceStats, setSourceStats] = useState<any>({});
  const [deviceStats, setDeviceStats] = useState<any>({});
  const [osStats, setOsStats] = useState<any>({});
  const [browserStats, setBrowserStats] = useState<any>({});
  const [pageStats, setPageStats] = useState<Record<string, number>>({});
  const [stateStats, setStateStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get(`/analytics/stats`);
      setTotalVisitors(res.data.totalVisitors || 0);
      setDailyStats(res.data.dailyStats || []);
      setSourceStats(res.data.source || {});
      setDeviceStats(res.data.device || {});
      setOsStats(res.data.os || {});
      setBrowserStats(res.data.browser || {});
      setPageStats(res.data.pages || {});
      setStateStats(res.data.states || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ── Computed Insights ── */
  const { weekTotal, avgPerDay, peakDay, peakCount } = useMemo(() => {
    const weekTotal = dailyStats.reduce((s, d) => s + (d.count || 0), 0);
    const avgPerDay = dailyStats.length
      ? Math.round(weekTotal / dailyStats.length)
      : 0;
    let peak = { date: "", count: 0 };
    dailyStats.forEach((d) => {
      if ((d.count || 0) > peak.count) peak = { date: d.date, count: d.count };
    });
    const peakLabel = peak.date
      ? new Date(peak.date).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      : "—";
    return {
      weekTotal,
      avgPerDay,
      peakDay: peakLabel,
      peakCount: peak.count,
    };
  }, [dailyStats]);

  const topPages = Object.entries(pageStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const topStates = Object.entries(stateStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6);

  const totalStatesTraffic = Object.values(stateStats).reduce(
    (s: number, v) => s + (v as number),
    0
  ) as number;

  const maxTraffic = Math.max(...dailyStats.map((d) => d.count || 0), 1);

  return (
    <div className="ta-container">
      {/* ===== HEADER ===== */}
      <header className="ta-header">
        <div className="ta-header-left">
          <Link to="/admin/dashboard" className="ta-back-link">
            <FiArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h2 className="ta-title">
            <span className="ta-title-icon">
              <FiBarChart2 size={20} />
            </span>
            Live Traffic Analytics
          </h2>
          <p className="ta-subtitle">
            Real-time user heatmap, devices & activity insights
          </p>
        </div>
        <div className="ta-header-right">
          <div className="ta-date-chip">
            <FiCalendar size={13} /> Last 7 Days
          </div>
          <button
            className={`ta-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh Data"
          >
            <FiRefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* ===== KPI GRID (6 cards) ===== */}
      <div className="ta-stats-grid">
        <StatCard
          title="Online Now"
          value={onlineCount}
          icon={<FiActivity />}
          variant="live"
          pulse
        />
        <StatCard
          title="Total Visitors"
          value={totalVisitors}
          icon={<FiUsers />}
          variant="blue"
        />
        <StatCard
          title="Avg / Day"
          value={avgPerDay}
          icon={<FiTrendingUp />}
          variant="cyan"
        />
        <StatCard
          title="Peak Day"
          value={peakCount}
          sub={peakDay}
          icon={<FiAward />}
          variant="amber"
        />
        <StatCard
          title="Mobile"
          value={deviceStats.mobile || 0}
          icon={<FiSmartphone />}
          variant="purple"
        />
        <StatCard
          title="Desktop"
          value={deviceStats.desktop || 0}
          icon={<FiMonitor />}
          variant="orange"
        />
      </div>

      {/* ===== TREND + MAP ===== */}
      <div className="ta-top-grid">
        <section className="ta-card ta-graph-card">
          <div className="ta-card-head">
            <div className="ta-card-title">
              <div className="ta-card-icon ta-icon-blue">
                <FiTrendingUp size={16} />
              </div>
              <div>
                <h3>Traffic Trend</h3>
                <span className="ta-card-sub">Daily visitors · last 7 days</span>
              </div>
            </div>
            <div className="ta-pill-blue">
              <FiEye size={12} /> {weekTotal.toLocaleString()}
            </div>
          </div>
          <div className="ta-chart">
            {loading ? (
              <div className="ta-empty">
                <div className="ta-spinner-small" /> Loading...
              </div>
            ) : dailyStats.length === 0 ? (
              <div className="ta-empty">
                <FiBarChart2 size={28} />
                <span>No traffic data yet</span>
              </div>
            ) : (
              <div className="ta-bars">
                {dailyStats.map((data, i) => {
                  const pct = (data.count / maxTraffic) * 100;
                  const day = new Date(data.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                  });
                  const dateNum = new Date(data.date).getDate();
                  return (
                    <div key={data.date} className="ta-bar-col">
                      <span className="ta-bar-value">{data.count}</span>
                      <div className="ta-bar-track">
                        <div
                          className="ta-bar-fill"
                          style={{
                            height: `${Math.max(pct, 4)}%`,
                            animationDelay: `${i * 80}ms`,
                          }}
                        />
                      </div>
                      <div className="ta-bar-label">
                        <span className="ta-bar-day">{day}</span>
                        <span className="ta-bar-date">{dateNum}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="ta-card ta-map-card">
          <div className="ta-card-head">
            <div className="ta-card-title">
              <div className="ta-card-icon ta-icon-rose">
                <FiMapPin size={16} />
              </div>
              <div>
                <h3>User Locations</h3>
                <span className="ta-card-sub">
                  {Object.keys(stateStats).length} states active
                </span>
              </div>
            </div>
          </div>
          <div className="ta-map-body">
            <IndiaHeatmap stateStats={stateStats} />
          </div>
        </section>
      </div>

      {/* ===== MIDDLE ROW: Sources + Devices + Browsers ===== */}
      <div className="ta-middle-grid">
        <section className="ta-card">
          <div className="ta-card-head">
            <div className="ta-card-title">
              <div className="ta-card-icon ta-icon-purple">
                <FiLink size={16} />
              </div>
              <div>
                <h3>Traffic Sources</h3>
                <span className="ta-card-sub">Where visitors come from</span>
              </div>
            </div>
          </div>
          <div className="ta-list">
            <SourceRow
              icon={<FiSearch />}
              label="Google"
              count={sourceStats?.google}
              total={totalVisitors}
              color="#4285F4"
            />
            <SourceRow
              icon={<FiInstagram />}
              label="Instagram"
              count={sourceStats?.instagram}
              total={totalVisitors}
              color="#E1306C"
            />
            <SourceRow
              icon={<FiFacebook />}
              label="Facebook"
              count={sourceStats?.facebook}
              total={totalVisitors}
              color="#1877F2"
            />
            <SourceRow
              icon={<FiMessageCircle />}
              label="WhatsApp"
              count={sourceStats?.whatsapp}
              total={totalVisitors}
              color="#25D366"
            />
            <SourceRow
              icon={<FiGlobe />}
              label="Direct"
              count={sourceStats?.direct}
              total={totalVisitors}
              color="#94a3b8"
            />
            <SourceRow
              icon={<FiExternalLink />}
              label="Other"
              count={sourceStats?.other}
              total={totalVisitors}
              color="#f59e0b"
            />
          </div>
        </section>

        <section className="ta-card">
          <div className="ta-card-head">
            <div className="ta-card-title">
              <div className="ta-card-icon ta-icon-indigo">
                <FiLayers size={16} />
              </div>
              <div>
                <h3>Devices & Platform</h3>
                <span className="ta-card-sub">Device usage breakdown</span>
              </div>
            </div>
          </div>
          <div className="ta-sub-split">
            <div>
              <h4 className="ta-sub-head">Device Type</h4>
              <ProgressBar
                label="Mobile"
                icon={<FiSmartphone size={12} />}
                count={deviceStats.mobile}
                total={totalVisitors}
                color="#ec4899"
              />
              <ProgressBar
                label="Desktop"
                icon={<FiMonitor size={12} />}
                count={deviceStats.desktop}
                total={totalVisitors}
                color="#3b82f6"
              />
              <ProgressBar
                label="Tablet"
                icon={<FiTablet size={12} />}
                count={deviceStats.tablet}
                total={totalVisitors}
                color="#f59e0b"
              />
            </div>
            <div>
              <h4 className="ta-sub-head">Operating System</h4>
              <ProgressBar
                label="Android"
                count={osStats.android}
                total={totalVisitors}
                color="#10b981"
              />
              <ProgressBar
                label="iOS"
                count={osStats.ios}
                total={totalVisitors}
                color="#0f172a"
              />
              <ProgressBar
                label="Windows"
                count={osStats.windows}
                total={totalVisitors}
                color="#2563eb"
              />
              <ProgressBar
                label="Mac"
                count={osStats.mac}
                total={totalVisitors}
                color="#6b7280"
              />
            </div>
          </div>
        </section>

        <section className="ta-card">
          <div className="ta-card-head">
            <div className="ta-card-title">
              <div className="ta-card-icon ta-icon-emerald">
                <FiChrome size={16} />
              </div>
              <div>
                <h3>Browsers</h3>
                <span className="ta-card-sub">Top browser engines</span>
              </div>
            </div>
          </div>
          <div className="ta-list">
            <ProgressBar
              label="Chrome"
              count={browserStats.chrome}
              total={totalVisitors}
              color="#4285F4"
            />
            <ProgressBar
              label="Safari"
              count={browserStats.safari}
              total={totalVisitors}
              color="#06b6d4"
            />
            <ProgressBar
              label="Firefox"
              count={browserStats.firefox}
              total={totalVisitors}
              color="#f97316"
            />
            <ProgressBar
              label="Edge"
              count={browserStats.edge}
              total={totalVisitors}
              color="#0891b2"
            />
            <ProgressBar
              label="Other"
              icon={<FiCompass size={12} />}
              count={browserStats.other}
              total={totalVisitors}
              color="#94a3b8"
            />
          </div>
        </section>
      </div>

      {/* ===== BOTTOM: Top Pages + Top States ===== */}
      <div className="ta-bottom-grid">
        <section className="ta-card">
          <div className="ta-card-head">
            <div className="ta-card-title">
              <div className="ta-card-icon ta-icon-orange">
                <FiEye size={16} />
              </div>
              <div>
                <h3>Top Pages</h3>
                <span className="ta-card-sub">Most visited URLs</span>
              </div>
            </div>
          </div>
          <div className="ta-table-wrap">
            {topPages.length === 0 ? (
              <div className="ta-empty">
                <FiEye size={26} />
                <span>No page data yet</span>
              </div>
            ) : (
              <table className="ta-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Page URL</th>
                    <th style={{ textAlign: "right" }}>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map(([url, count], i) => (
                    <tr key={url}>
                      <td className="ta-rank">{i + 1}</td>
                      <td className="ta-url">{url.replace(/_/g, ".")}</td>
                      <td className="ta-views">
                        {(count as number).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="ta-card">
          <div className="ta-card-head">
            <div className="ta-card-title">
              <div className="ta-card-icon ta-icon-teal">
                <FiAward size={16} />
              </div>
              <div>
                <h3>Top States</h3>
                <span className="ta-card-sub">Geography leaderboard</span>
              </div>
            </div>
          </div>
          <div className="ta-states-list">
            {topStates.length === 0 ? (
              <div className="ta-empty">
                <FiMapPin size={26} />
                <span>No location data yet</span>
              </div>
            ) : (
              topStates.map(([code, count], i) => {
                const pct =
                  totalStatesTraffic > 0
                    ? Math.round(((count as number) / totalStatesTraffic) * 100)
                    : 0;
                return (
                  <div key={code} className="ta-state-row">
                    <span className={`ta-state-rank rank-${i + 1}`}>
                      {i + 1}
                    </span>
                    <div className="ta-state-info">
                      <span className="ta-state-name">
                        {STATE_NAMES[code] || code}
                      </span>
                      <div className="ta-state-bar">
                        <div
                          className="ta-state-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="ta-state-count">
                      <strong>{count as number}</strong>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

/* ────────── SUB COMPONENTS ────────── */
const StatCard = ({ title, value, sub, icon, variant, pulse }: any) => (
  <div className={`ta-stat ta-stat-${variant}`}>
    <div className="ta-stat-body">
      <span className="ta-stat-title">{title}</span>
      <h3 className="ta-stat-value">
        {typeof value === "number" ? value.toLocaleString() : value}
        {pulse && <span className="ta-live-pulse" />}
      </h3>
      {sub && <span className="ta-stat-sub">{sub}</span>}
    </div>
    <div className="ta-stat-icon">{icon}</div>
  </div>
);

const ProgressBar = ({ label, icon, count, total, color }: any) => {
  const percent = total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
  return (
    <div className="ta-prog-row">
      <div className="ta-prog-top">
        <span className="ta-prog-label">
          {icon && <span className="ta-prog-icon">{icon}</span>}
          {label}
        </span>
        <span className="ta-prog-val">
          <strong>{(count || 0).toLocaleString()}</strong>
          <span className="ta-prog-pct">{percent}%</span>
        </span>
      </div>
      <div className="ta-prog-bg">
        <div
          className="ta-prog-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
};

const SourceRow = ({ icon, label, count, total, color }: any) => {
  const percent = total > 0 ? Math.round(((count || 0) / total) * 100) : 0;
  return (
    <div className="ta-src-row">
      <div className="ta-src-left">
        <div className="ta-src-icon" style={{ color, background: `${color}18` }}>
          {icon}
        </div>
        <div className="ta-src-info">
          <span className="ta-src-label">{label}</span>
          <span className="ta-src-pct">{percent}% of traffic</span>
        </div>
      </div>
      <span className="ta-src-count">{(count || 0).toLocaleString()}</span>
    </div>
  );
};

export default TrafficAnalytics;
