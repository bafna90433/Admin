import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { utils, writeFile } from "xlsx";
import { format, formatDistanceToNow } from "date-fns";
import axios from "axios";
import "../styles/AdminDashboard.css";
import {
  FiSearch, FiX, FiMessageSquare, FiTrash2, FiDownload,
  FiAlertCircle, FiPhone, FiKey, FiChevronLeft, FiChevronRight,
  FiChevronsLeft, FiChevronsRight, FiMapPin, FiGrid, FiList, 
  FiRefreshCw, FiCalendar, FiUsers, FiActivity, FiChevronDown, 
  FiChevronUp, FiClock, FiShield, FiCopy, FiArrowUp, FiArrowDown, 
  FiMaximize2, FiMinimize2, FiHash, FiTrendingUp, FiSliders, 
  FiZap, FiEye, FiExternalLink, FiFileText
} from "react-icons/fi";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (process as any).env?.VITE_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const getFileUrl = (filePath?: string) => {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  const baseUrl = API_BASE.replace(/\/api\/?$/, "");
  const cleanPath = filePath.replace(/\\/g, "/");
  return `${baseUrl}/${cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath}`;
};

const getDownloadUrl = (filePath?: string) => {
  const url = getFileUrl(filePath);
  if (url.includes("res.cloudinary.com")) return url.replace("/upload/", "/upload/fl_attachment/");
  return url;
};

type Customer = {
  _id: string;
  shopName: string;
  address: string;
  otpMobile: string;
  whatsapp: string;
  gstNumber?: string;       // ✅ ADDED GST Number Type
  gstDocumentUrl?: string;  
  createdAt: string;
};

const extractCity = (address: string): string => {
  if (!address) return "Unknown";
  const lines = address.split("\n");
  for (const line of lines) {
    const low = line.toLowerCase();
    if (low.includes("city:") || low.includes("town:") || low.includes("district:")) {
      const parts = line.split(":");
      if (parts.length > 1) return parts[1].trim();
    }
  }
  for (let i = Math.max(0, lines.length - 3); i < lines.length; i++) {
    if (lines[i].includes(",")) {
      const parts = lines[i].split(",");
      if (parts.length > 1) return parts[0].trim();
    }
  }
  const first = lines.find((l) => l.trim().length > 0);
  return first ? (first.length > 18 ? first.substring(0, 18) + "…" : first) : "Unknown";
};

const normalizeWA = (phone: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("91") && d.length > 10) d = d.substring(2);
  if (d.length > 10) d = d.slice(-10);
  return `91${d}`;
};

const formatPhone = (phone: string) => {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return phone;
};

type SortKey = "name" | "date" | "city";
type SortDir = "asc" | "desc";
const PER_PAGE = [10, 25, 50, 100];

const AdminDashboard: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [view, setView] = useState<"card" | "list">("list");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const [delId, setDelId] = useState<string | null>(null);
  const [delPwd, setDelPwd] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); 
  const [showFilters, setShowFilters] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Customer[]>(`${API_BASE}/admin/customers`);
      setRows(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load customers");
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debounced, cityFilter, sortKey, sortDir, perPage]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setView("card");
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((c) => { const city = extractCity(c.address); if (city !== "Unknown") set.add(city); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (debounced) {
      const q = debounced.toLowerCase();
      list = list.filter((c) =>
        c.shopName.toLowerCase().includes(q) ||
        c.otpMobile.includes(q) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.gstNumber && c.gstNumber.toLowerCase().includes(q)) // ✅ Search by GST
      );
    }
    if (cityFilter !== "all") list = list.filter((c) => extractCity(c.address) === cityFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.shopName.localeCompare(b.shopName);
      else if (sortKey === "city") cmp = extractCity(a.address).localeCompare(extractCity(b.address));
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [rows, debounced, cityFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const s = (safePage - 1) * perPage;
    return filtered.slice(s, s + perPage);
  }, [filtered, safePage, perPage]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const week = new Date(now.getTime() - 7 * 86400000);
    const month = new Date(now.getTime() - 30 * 86400000);
    let today = 0, wk = 0, mo = 0;
    rows.forEach((c) => {
      const d = new Date(c.createdAt);
      if (format(d, "yyyy-MM-dd") === todayStr) today++;
      if (d >= week) wk++;
      if (d >= month) mo++;
    });
    const yesterdayStr = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd");
    let yesterday = 0;
    rows.forEach((c) => { if (format(new Date(c.createdAt), "yyyy-MM-dd") === yesterdayStr) yesterday++; });
    const growth = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : today > 0 ? 100 : 0;
    return { total: rows.length, today, week: wk, month: mo, growth };
  }, [rows]);

  const toggle = (id: string) => {
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const toggleAll = () => {
    if (allExpanded) { setExpanded(new Set()); setAllExpanded(false); }
    else { setExpanded(new Set(paginated.map((c) => c._id))); setAllExpanded(true); }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`, { duration: 1500, icon: "📋", style: { borderRadius: "12px", background: "#1e293b", color: "#fff", fontSize: "14px" } });
  };

  const openWA = (phone: string) => {
    if (!phone) return toast.error("WhatsApp number missing!");
    const clean = normalizeWA(phone);
    const msg = encodeURIComponent("Hello from BafnaToys! 🧸\nHow can we help you?");
    window.open(`https://api.whatsapp.com/send?phone=${clean}&text=${msg}`, "_blank");
  };

  const confirmDelete = async () => {
    if (delPwd !== "bafnatoys") return toast.error("Wrong password");
    if (!delId) return;
    setActing(delId);
    try {
      await axios.delete(`${API_BASE}/admin/customer/${delId}`);
      setRows((p) => p.filter((r) => r._id !== delId));
      toast.success("Customer deleted", { icon: "🗑️", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error");
    } finally { setActing(null); setDelId(null); setDelPwd(""); }
  };

  const handleExport = () => {
    const data = filtered.map((c) => ({
      "Shop Name": c.shopName,
      "GST Number": c.gstNumber || "N/A", // ✅ ADDED TO EXCEL EXPORT
      "Has GST Doc": c.gstDocumentUrl ? "Yes" : "No", 
      City: extractCity(c.address),
      "Full Address": c.address || "",
      Mobile: c.otpMobile,
      WhatsApp: c.whatsapp,
      Registered: format(new Date(c.createdAt), "dd MMM yyyy, hh:mm a"),
    }));
    if (!data.length) return toast.error("Nothing to export");
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Customers");
    writeFile(wb, `Customers_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported!", { icon: "📊", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const clearFilters = () => { setSearch(""); setCityFilter("all"); setSortKey("date"); setSortDir("desc"); };
  const hasActiveFilters = search || cityFilter !== "all";

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <FiArrowDown size={11} style={{ opacity: 0.2 }} />;
    return sortDir === "asc" ? <FiArrowUp size={11} /> : <FiArrowDown size={11} />;
  };

  const pageRange = () => {
    const r: number[] = [];
    const max = 5;
    let s = Math.max(1, safePage - 2);
    let e = Math.min(totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    for (let i = s; i <= e; i++) r.push(i);
    return r;
  };

  const scrollToTop = () => { topRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const AddressPanel = ({ customer }: { customer: Customer }) => (
    <div className="ad-expanded">
      <div className="ad-exp-section">
        <div className="ad-exp-title"><FiZap size={14} /> Quick Info</div>
        <div className="ad-exp-chips">
          
          {/* ✅ ADDED: GST Number Chip */}
          {customer.gstNumber && (
            <button className="ad-chip ad-chip-doc" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }} onClick={() => copy(customer.gstNumber!, "GST Number")}>
              <FiShield size={12} /><span>GST: {customer.gstNumber}</span><FiCopy size={10} className="ad-chip-action" />
            </button>
          )}

          {customer.gstDocumentUrl && (
            <button className="ad-chip ad-chip-doc" onClick={() => setPreviewUrl(customer.gstDocumentUrl || null)}>
              <FiFileText size={12} /><span>View GST Document</span><FiExternalLink size={10} className="ad-chip-action" />
            </button>
          )}
          <button className="ad-chip ad-chip-phone" onClick={() => copy(customer.otpMobile, "Mobile")}>
            <FiPhone size={12} /><span>{formatPhone(customer.otpMobile)}</span><FiCopy size={10} className="ad-chip-action" />
          </button>
          {customer.whatsapp && customer.whatsapp !== customer.otpMobile && (
            <button className="ad-chip ad-chip-wa" onClick={() => copy(customer.whatsapp, "WhatsApp")}>
              <FiMessageSquare size={12} /><span>{formatPhone(customer.whatsapp)}</span><FiCopy size={10} className="ad-chip-action" />
            </button>
          )}
        </div>
      </div>
      {customer.address && (
        <div className="ad-exp-section">
          <div className="ad-exp-title"><FiMapPin size={14} /> Full Address</div>
          <div className="ad-addr-box">
            {customer.address.split("\n").map((line, i) => {
              const parts = line.split(":");
              if (parts.length > 1) {
                return (<div key={i} className="ad-addr-row"><span className="ad-addr-key">{parts[0].trim()}</span><span className="ad-addr-val">{parts.slice(1).join(":").trim()}</span></div>);
              }
              return <div key={i} className="ad-addr-text">{line}</div>;
            })}
          </div>
        </div>
      )}
      <div className="ad-exp-meta">
        <div className="ad-meta-item"><FiClock size={12} /><span>Registered {formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })}</span></div>
        <div className="ad-meta-item"><FiCalendar size={12} /><span>{format(new Date(customer.createdAt), "EEEE, dd MMM yyyy • hh:mm a")}</span></div>
      </div>
    </div>
  );

  const MobileActions = ({ customer }: { customer: Customer }) => (
    <div className="ad-mob-actions">
      <button className="ad-mob-act ad-mob-wa" onClick={() => openWA(customer.whatsapp)}><FiMessageSquare size={16} /><span>WhatsApp</span></button>
      <button className="ad-mob-act ad-mob-call" onClick={() => window.open(`tel:${customer.otpMobile}`)}><FiPhone size={16} /><span>Call</span></button>
      {customer.gstDocumentUrl && (
        <button className="ad-mob-act ad-mob-doc" onClick={() => setPreviewUrl(customer.gstDocumentUrl || null)}><FiEye size={16} /><span>GST Doc</span></button>
      )}
      <button className="ad-mob-act ad-mob-del" onClick={() => setDelId(customer._id)} disabled={acting === customer._id}><FiTrash2 size={16} /><span>Delete</span></button>
    </div>
  );

  return (
    <div className="ad-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {previewUrl && (
        <div className="ad-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="ad-modal ad-doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-bar">
              <div className="ad-modal-bar-left">
                <div className="ad-modal-icon doc"><FiFileText size={16} /></div>
                <div><h3>Document Preview</h3><p>GST Registration Certificate</p></div>
              </div>
              <div className="ad-modal-bar-right">
                <a href={getDownloadUrl(previewUrl)} className="ad-mbtn ad-mbtn-primary" target="_blank" rel="noreferrer"><FiDownload size={14} /><span>Download</span></a>
                <a href={getFileUrl(previewUrl)} className="ad-mbtn ad-mbtn-ghost" target="_blank" rel="noreferrer"><FiExternalLink size={14} /></a>
                <button className="ad-mbtn ad-mbtn-close" onClick={() => setPreviewUrl(null)}><FiX size={16} /></button>
              </div>
            </div>
            <div className="ad-doc-frame"><iframe src={getFileUrl(previewUrl)} title="Document" /></div>
          </div>
        </div>
      )}

      {delId && (
        <div className="ad-overlay" onClick={() => { setDelId(null); setDelPwd(""); }}>
          <div className="ad-modal ad-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-del-visual">
              <div className="ad-del-circle"><div className="ad-del-circle-inner"><FiShield size={28} /></div></div>
              <div className="ad-del-pulse" />
            </div>
            <h3>Delete Customer</h3>
            <p>This action is <strong>permanent</strong> and cannot be undone.<br />Enter admin password to confirm.</p>
            <div className="ad-del-input-wrap">
              <FiKey className="ad-del-input-icon" />
              <input type="password" placeholder="Enter admin password…" value={delPwd} onChange={(e) => setDelPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmDelete()} autoFocus />
            </div>
            <div className="ad-del-btns">
              <button className="ad-dbtn ad-dbtn-cancel" onClick={() => { setDelId(null); setDelPwd(""); }}>Cancel</button>
              <button className="ad-dbtn ad-dbtn-danger" onClick={confirmDelete}><FiTrash2 size={14} /> Delete Forever</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <section className="ad-top-section">
        <div className="ad-top-row">
          <div className="ad-top-left">
            <h1 className="ad-page-title">Customers</h1>
            <span className="ad-page-count">{stats.total} registered</span>
          </div>
          <div className="ad-top-right">
            <button className="ad-top-btn ad-top-refresh" onClick={fetchCustomers} disabled={loading} title="Refresh">
              <FiRefreshCw size={16} className={loading ? "ad-spinning" : ""} />
            </button>
            <button className="ad-top-btn ad-top-export" onClick={handleExport}>
              <FiDownload size={15} /><span>Export</span>
            </button>
          </div>
        </div>
        <div className="ad-stats-grid">
          {[
            { icon: <FiUsers size={20} />, val: stats.total, lbl: "Total Customers", color: "indigo", sub: `${filtered.length} shown` },
            { icon: <FiActivity size={20} />, val: stats.today, lbl: "Today", color: "emerald", sub: stats.growth > 0 ? `+${stats.growth}% vs yesterday` : stats.growth < 0 ? `${stats.growth}% vs yesterday` : "Same as yesterday" },
            { icon: <FiTrendingUp size={20} />, val: stats.week, lbl: "This Week", color: "violet", sub: `Avg ${Math.round(stats.week / 7)}/day` },
            { icon: <FiCalendar size={20} />, val: stats.month, lbl: "Last 30 Days", color: "amber", sub: `Avg ${Math.round(stats.month / 30)}/day` },
          ].map((s) => (
            <div className={`ad-stat ad-stat-${s.color}`} key={s.lbl}>
              <div className="ad-stat-top">
                <div className="ad-stat-icon">{s.icon}</div>
                <div className="ad-stat-number">{s.val.toLocaleString()}</div>
              </div>
              <div className="ad-stat-label">{s.lbl}</div>
              <div className="ad-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Toolbar */}
      <section className="ad-toolbar-section">
        <div className="ad-toolbar">
          <div className="ad-toolbar-main">
            <div className="ad-search">
              <FiSearch className="ad-search-icon" />
              <input ref={searchRef} placeholder="Search shop, phone, address, GST..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="ad-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}><FiX size={14} /></button>}
            </div>
            <div className="ad-toolbar-btns">
              <button className={`ad-tbtn ad-tbtn-filter ${showFilters ? "active" : ""} ${hasActiveFilters ? "has-filters" : ""}`} onClick={() => setShowFilters(!showFilters)}>
                <FiSliders size={15} /><span>Filters</span>{hasActiveFilters && <span className="ad-filter-dot" />}
              </button>
              <div className="ad-view-toggle">
                <button className={`ad-vt-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")} title="List"><FiList size={16} /></button>
                <button className={`ad-vt-btn ${view === "card" ? "active" : ""}`} onClick={() => setView("card")} title="Cards"><FiGrid size={16} /></button>
              </div>
            </div>
          </div>

          <div className={`ad-filters ${showFilters ? "open" : ""}`}>
            <div className="ad-filters-inner">
              <div className="ad-filter-group">
                <label><FiMapPin size={12} /> City</label>
                <div className="ad-select-wrap">
                  <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                    <option value="all">All Cities ({rows.length})</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="ad-filter-group">
                <label><FiArrowDown size={12} /> Sort By</label>
                <div className="ad-sort-pills">
                  {(["date", "name", "city"] as SortKey[]).map((k) => (
                    <button key={k} className={`ad-pill ${sortKey === k ? "active" : ""}`} onClick={() => handleSort(k)}>
                      {k === "date" ? "Date" : k === "name" ? "Name" : "City"}<SortIcon k={k} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="ad-filter-group">
                <label><FiHash size={12} /> Per Page</label>
                <div className="ad-select-wrap sm">
                  <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                    {PER_PAGE.map((n) => <option key={n} value={n}>{n} items</option>)}
                  </select>
                </div>
              </div>
              {hasActiveFilters && <button className="ad-clear-filters" onClick={clearFilters}><FiX size={13} /> Clear Filters</button>}
            </div>
          </div>

          <div className="ad-toolbar-info">
            <div className="ad-showing">
              {filtered.length === 0 ? <span>No results found</span> : (
                <><span className="ad-showing-range">{(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, filtered.length)}</span>
                  <span className="ad-showing-of"> of </span>
                  <span className="ad-showing-total">{filtered.length} customers</span>
                  {debounced && <span className="ad-showing-filtered"> (from {rows.length})</span>}</>
              )}
            </div>
            <div className="ad-toolbar-info-right">
              {view === "list" && paginated.length > 0 && (
                <button className="ad-expand-btn" onClick={toggleAll}>
                  {allExpanded ? <><FiMinimize2 size={13} /> Collapse</> : <><FiMaximize2 size={13} /> Expand All</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="ad-main">
        {loading ? (
          <div className="ad-state ad-state-loading">
            <div className="ad-loader"><div className="ad-loader-ring" /><div className="ad-loader-ring" /><div className="ad-loader-ring" /></div>
            <h3>Loading Customers</h3><p>Please wait…</p>
          </div>
        ) : err ? (
          <div className="ad-state ad-state-error">
            <div className="ad-state-icon error"><FiAlertCircle size={28} /></div>
            <h3>Something went wrong</h3><p>{err}</p>
            <button className="ad-retry-btn" onClick={fetchCustomers}><FiRefreshCw size={14} /> Try Again</button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="ad-state ad-state-empty">
            <div className="ad-state-icon empty"><FiSearch size={28} /></div>
            <h3>No customers found</h3><p>Try adjusting your search or filters</p>
            {hasActiveFilters && <button className="ad-retry-btn" onClick={clearFilters}><FiX size={14} /> Clear All Filters</button>}
          </div>
        ) : view === "list" ? (
          <div className="ad-table-container">
            <table className="ad-table">
              <thead>
                <tr>
                  <th className="ad-th-num">#</th>
                  <th className="ad-th-sortable" onClick={() => handleSort("name")}><span>Shop Name</span><SortIcon k="name" /></th>
                  <th className="ad-th-sortable" onClick={() => handleSort("city")}><span>City</span><SortIcon k="city" /></th>
                  <th>Mobile</th>
                  <th className="ad-th-hide-sm">WhatsApp</th>
                  <th className="ad-th-sortable" onClick={() => handleSort("date")}><span>Date</span><SortIcon k="date" /></th>
                  <th className="ad-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, idx) => {
                  const isOpen = expanded.has(c._id);
                  const isNew = new Date().getTime() - new Date(c.createdAt).getTime() < 86400000;
                  return (
                    <React.Fragment key={c._id}>
                      <tr className={`ad-tr ${isOpen ? "ad-tr-open" : ""} ${isNew ? "ad-tr-new" : ""}`} onClick={() => toggle(c._id)}>
                        <td className="ad-td-num">{(safePage - 1) * perPage + idx + 1}</td>
                        <td>
                          <div className="ad-td-shop">
                            <div className="ad-avatar" style={{ background: `hsl(${(c.shopName.charCodeAt(0) * 37) % 360}, 65%, 55%)` }}>{c.shopName.charAt(0).toUpperCase()}</div>
                            <div className="ad-shop-info"><span className="ad-shop-name">{c.shopName}</span>{isNew && <span className="ad-new-badge">NEW</span>}</div>
                          </div>
                        </td>
                        <td><span className="ad-td-city"><FiMapPin size={11} />{extractCity(c.address)}</span></td>
                        <td>
                          <button className="ad-phone-btn" onClick={(e) => { e.stopPropagation(); copy(c.otpMobile, "Mobile"); }}>
                            {formatPhone(c.otpMobile)}<FiCopy size={10} className="ad-copy-icon" />
                          </button>
                        </td>
                        <td className="ad-th-hide-sm ad-td-mono">{c.whatsapp ? formatPhone(c.whatsapp) : "–"}</td>

                        <td className="ad-td-date">
                          <div className="ad-date-wrap"><span className="ad-date-main">{format(new Date(c.createdAt), "dd MMM yy")}</span><span className="ad-date-time">{format(new Date(c.createdAt), "hh:mm a")}</span></div>
                        </td>
                        <td className="ad-td-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="ad-action-group">
                            <button className="ad-act-btn ad-act-toggle" onClick={() => toggle(c._id)} title={isOpen ? "Collapse" : "Expand"}>{isOpen ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}</button>
                            <button className="ad-act-btn ad-act-wa" onClick={() => openWA(c.whatsapp)} title="WhatsApp"><FiMessageSquare size={14} /></button>
                            {c.gstDocumentUrl && <button className="ad-act-btn ad-act-doc" onClick={() => setPreviewUrl(c.gstDocumentUrl || null)} title="View Document"><FiEye size={14} /></button>}
                            <button className="ad-act-btn ad-act-del" onClick={() => setDelId(c._id)} disabled={acting === c._id} title="Delete"><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && <tr className="ad-tr-expanded"><td colSpan={7}><AddressPanel customer={c} /></td></tr>}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ad-cards-grid">
            {paginated.map((c) => {
              const isOpen = expanded.has(c._id);
              const isNew = new Date().getTime() - new Date(c.createdAt).getTime() < 86400000;
              return (
                <div className={`ad-card ${isOpen ? "ad-card-open" : ""}`} key={c._id}>
                  <div className="ad-card-header">
                    <div className="ad-card-header-left">
                      <div className="ad-avatar lg" style={{ background: `hsl(${(c.shopName.charCodeAt(0) * 37) % 360}, 65%, 55%)` }}>{c.shopName.charAt(0).toUpperCase()}</div>
                      <div className="ad-card-title">
                        <h4>{c.shopName}{isNew && <span className="ad-new-badge">NEW</span>}</h4>
                        <div className="ad-card-subtitle">
                          <FiMapPin size={11} /><span>{extractCity(c.address)}</span>
                          <span className="ad-card-dot">•</span>
                          <FiClock size={11} /><span>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ad-card-body">
                    <div className="ad-card-fields">
                      <div className="ad-card-field">
                        <div className="ad-card-field-icon phone"><FiPhone size={14} /></div>
                        <div className="ad-card-field-content"><label>Mobile Number</label><button className="ad-field-value copyable" onClick={() => copy(c.otpMobile, "Mobile")}>{formatPhone(c.otpMobile)}<FiCopy size={10} /></button></div>
                      </div>
                      <div className="ad-card-field">
                        <div className="ad-card-field-icon wa"><FiMessageSquare size={14} /></div>
                        <div className="ad-card-field-content"><label>WhatsApp</label><span className="ad-field-value">{c.whatsapp ? formatPhone(c.whatsapp) : "Not provided"}</span></div>
                      </div>
                    </div>
                  </div>
                  <MobileActions customer={c} />
                  <button className="ad-card-expand" onClick={() => toggle(c._id)}>
                    {isOpen ? <><FiChevronUp size={14} /> Hide Details</> : <><FiChevronDown size={14} /> View Details</>}
                  </button>
                  {isOpen && <AddressPanel customer={c} />}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {totalPages > 1 && (
        <nav className="ad-pagination">
          <div className="ad-pag-info">Page <strong>{safePage}</strong> of <strong>{totalPages}</strong></div>
          <div className="ad-pag-controls">
            <button className="ad-pag-btn" disabled={safePage <= 1} onClick={() => { setPage(1); scrollToTop(); }}><FiChevronsLeft size={16} /></button>
            <button className="ad-pag-btn" disabled={safePage <= 1} onClick={() => { setPage((p) => p - 1); scrollToTop(); }}><FiChevronLeft size={16} /></button>
            <div className="ad-pag-pages">
              {pageRange().map((p) => <button key={p} className={`ad-pag-num ${p === safePage ? "active" : ""}`} onClick={() => { setPage(p); scrollToTop(); }}>{p}</button>)}
            </div>
            <button className="ad-pag-btn" disabled={safePage >= totalPages} onClick={() => { setPage((p) => p + 1); scrollToTop(); }}><FiChevronRight size={16} /></button>
            <button className="ad-pag-btn" disabled={safePage >= totalPages} onClick={() => { setPage(totalPages); scrollToTop(); }}><FiChevronsRight size={16} /></button>
          </div>
        </nav>
      )}

      <footer className="ad-footer"><p>© {new Date().getFullYear()} BafnaToys Admin Dashboard</p></footer>
    </div>
  );
};

export default AdminDashboard;