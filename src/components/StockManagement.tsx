import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  FiBox, FiRefreshCw, FiAlertCircle, FiSearch, FiEdit2,
  FiCheck, FiX, FiChevronLeft, FiChevronRight, FiChevronsLeft,
  FiChevronsRight, FiPackage, FiAlertTriangle, FiCheckCircle,
  FiTrendingUp, FiSliders, FiHash, FiImage, FiCopy, FiTag,
  FiActivity, FiLayers, FiDownload, FiMaximize2, FiMinimize2,
  FiArrowUp, FiArrowDown, FiShoppingCart, FiBarChart2, FiEye
} from "react-icons/fi";
import { utils, writeFile } from "xlsx";
import { format } from "date-fns";
import "../styles/StockManagement.css";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (process as any).env?.VITE_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_BASE =
  (import.meta as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_BASE}${url}` : "";

interface StockItem {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  unit: string;
  image?: string;
  totalSold: number;
}

type SortKey = "name" | "stock" | "sold" | "status";
type SortDir = "asc" | "desc";
type StockFilter = "all" | "out" | "low" | "good";
const PER_PAGE_OPTIONS = [15, 25, 50, 100];

const StockManagement: React.FC = () => {
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"table" | "card">("table");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ stock: 0, unit: "" });
  const [saving, setSaving] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const token = localStorage.getItem("adminToken");
  const topRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto card view on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setView("card");
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debounced, stockFilter, sortKey, sortDir, perPage]);

  const fetchStockData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/orders`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }).catch(() => ({ data: [] })),
      ]);

      const products = Array.isArray(productsRes.data?.products)
        ? productsRes.data.products
        : Array.isArray(productsRes.data)
          ? productsRes.data
          : [];

      const orders = Array.isArray(ordersRes.data)
        ? ordersRes.data
        : Array.isArray(ordersRes.data?.orders)
          ? ordersRes.data.orders
          : [];

      const salesMap: Record<string, number> = {};
      orders.forEach((order: any) => {
        const orderItems = order.items || order.orderItems || [];
        if (order.status === "Cancelled") return;
        if (Array.isArray(orderItems)) {
          orderItems.forEach((item: any) => {
            const rawId = item.productId || item.product;
            const itemId = typeof rawId === "object" ? rawId?._id : rawId;
            if (!itemId) return;
            const idStr = String(itemId);
            salesMap[idStr] = (salesMap[idStr] || 0) + (Number(item.qty) || 0);
          });
        }
      });

      const stats: StockItem[] = products.map((prod: any) => ({
        _id: prod._id,
        name: prod.name || "",
        sku: prod.sku || "",
        stock: Number(prod.stock) || 0,
        unit: prod.unit || "",
        image: prod.images?.[0] || prod.image || "",
        totalSold: salesMap[String(prod._id)] || 0,
      }));

      setInventory(stats);
    } catch {
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStockData(); }, [fetchStockData]);

  // Stats
  const stats = useMemo(() => {
    let outOfStock = 0, lowStock = 0, inStock = 0, totalSold = 0;
    inventory.forEach((i) => {
      if (i.stock === 0) outOfStock++;
      else if (i.stock < 10) lowStock++;
      else inStock++;
      totalSold += i.totalSold;
    });
    return { total: inventory.length, outOfStock, lowStock, inStock, totalSold };
  }, [inventory]);

  // Filtered + Sorted
  const filtered = useMemo(() => {
    let list = [...inventory];

    if (debounced) {
      const q = debounced.toLowerCase();
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      );
    }

    if (stockFilter === "out") list = list.filter((i) => i.stock === 0);
    else if (stockFilter === "low") list = list.filter((i) => i.stock > 0 && i.stock < 10);
    else if (stockFilter === "good") list = list.filter((i) => i.stock >= 10);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "stock") cmp = a.stock - b.stock;
      else if (sortKey === "sold") cmp = a.totalSold - b.totalSold;
      else if (sortKey === "status") {
        const statusOrder = (s: number) => s === 0 ? 0 : s < 10 ? 1 : 2;
        cmp = statusOrder(a.stock) - statusOrder(b.stock);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [inventory, debounced, stockFilter, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const s = (safePage - 1) * perPage;
    return filtered.slice(s, s + perPage);
  }, [filtered, safePage, perPage]);

  const hasActiveFilters = search || stockFilter !== "all";
  const clearFilters = () => { setSearch(""); setStockFilter("all"); setSortKey("name"); setSortDir("asc"); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <FiArrowDown size={11} style={{ opacity: 0.2 }} />;
    return sortDir === "asc" ? <FiArrowUp size={11} /> : <FiArrowDown size={11} />;
  };

  // Edit
  const startEditing = (item: StockItem) => {
    setEditingId(item._id);
    setEditForm({ stock: item.stock, unit: item.unit });
  };

  const cancelEditing = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      setInventory((prev) =>
        prev.map((it) =>
          it._id === id ? { ...it, stock: editForm.stock, unit: editForm.unit } : it
        )
      );
      setEditingId(null);
      await axios.put(
        `${API_BASE}/products/${id}`,
        { stock: Number(editForm.stock), unit: String(editForm.unit || "") },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      toast.success("Stock updated!", {
        icon: "✅",
        style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
      });
    } catch {
      toast.error("Failed to update stock");
      fetchStockData();
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`, {
      duration: 1500,
      icon: "📋",
      style: { borderRadius: "12px", background: "#1e293b", color: "#fff", fontSize: "14px" },
    });
  };

  const handleExport = () => {
    const data = filtered.map((i) => ({
      "Product Name": i.name,
      SKU: i.sku,
      "Unit Type": i.unit || "—",
      "Current Stock": i.stock,
      "Total Sold": i.totalSold,
      Status: i.stock === 0 ? "Out of Stock" : i.stock < 10 ? "Low Stock" : "In Stock",
    }));
    if (!data.length) return toast.error("Nothing to export");
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Stock");
    writeFile(wb, `Stock_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported!", { icon: "📊", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
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

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  const getStatusInfo = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", cls: "out", icon: <FiAlertCircle size={12} /> };
    if (stock < 10) return { label: "Low Stock", cls: "low", icon: <FiAlertTriangle size={12} /> };
    return { label: "In Stock", cls: "good", icon: <FiCheckCircle size={12} /> };
  };

  return (
    <div className="sm-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {/* Image Preview */}
      {previewImage && (
        <div className="sm-overlay" onClick={() => setPreviewImage(null)}>
          <div className="sm-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sm-preview-bar">
              <div className="sm-preview-bar-left"><FiEye size={16} /> <span>Image Preview</span></div>
              <button className="sm-preview-close" onClick={() => setPreviewImage(null)}><FiX size={18} /></button>
            </div>
            <div className="sm-preview-body">
              <img src={previewImage} alt="Product" />
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <section className="sm-top">
        <div className="sm-top-row">
          <div className="sm-top-left">
            <h1 className="sm-title">Stock Management</h1>
            <span className="sm-count">{stats.total} products</span>
          </div>
          <div className="sm-top-right">
            <button className="sm-top-btn" onClick={fetchStockData} disabled={loading} title="Refresh">
              <FiRefreshCw size={16} className={loading ? "sm-spinning" : ""} />
            </button>
            <button className="sm-top-btn sm-top-export" onClick={handleExport}>
              <FiDownload size={15} /><span>Export</span>
            </button>
          </div>
        </div>

        <div className="sm-stats">
          {[
            { icon: <FiPackage size={18} />, val: stats.total, lbl: "Total Products", color: "indigo" },
            { icon: <FiCheckCircle size={18} />, val: stats.inStock, lbl: "In Stock", color: "emerald" },
            { icon: <FiAlertTriangle size={18} />, val: stats.lowStock, lbl: "Low Stock", color: "amber" },
            { icon: <FiAlertCircle size={18} />, val: stats.outOfStock, lbl: "Out of Stock", color: "red" },
            { icon: <FiShoppingCart size={18} />, val: stats.totalSold, lbl: "Total Sold", color: "blue" },
          ].map((s) => (
            <div className={`sm-stat sm-stat-${s.color}`} key={s.lbl}>
              <div className="sm-stat-top">
                <div className="sm-stat-icon">{s.icon}</div>
                <div className="sm-stat-num">{s.val.toLocaleString()}</div>
              </div>
              <div className="sm-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Toolbar */}
      <section className="sm-toolbar-section">
        <div className="sm-toolbar">
          <div className="sm-toolbar-main">
            <div className="sm-search">
              <FiSearch className="sm-search-icon" />
              <input
                ref={searchRef}
                placeholder="Search by product name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="sm-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}>
                  <FiX size={14} />
                </button>
              )}
            </div>
            <div className="sm-toolbar-btns">
              <button className={`sm-tbtn ${showFilters ? "active" : ""} ${hasActiveFilters ? "has-filters" : ""}`} onClick={() => setShowFilters(!showFilters)}>
                <FiSliders size={15} /><span>Filters</span>
                {hasActiveFilters && <span className="sm-filter-dot" />}
              </button>
              <div className="sm-view-toggle">
                <button className={`sm-vt ${view === "table" ? "active" : ""}`} onClick={() => setView("table")}><FiBarChart2 size={16} /></button>
                <button className={`sm-vt ${view === "card" ? "active" : ""}`} onClick={() => setView("card")}><FiLayers size={16} /></button>
              </div>
            </div>
          </div>

          <div className={`sm-filters ${showFilters ? "open" : ""}`}>
            <div className="sm-filters-inner">
              <div className="sm-filter-group">
                <label><FiBox size={12} /> Stock Status</label>
                <div className="sm-stock-pills">
                  {([
                    { val: "all" as StockFilter, lbl: "All" },
                    { val: "good" as StockFilter, lbl: "In Stock" },
                    { val: "low" as StockFilter, lbl: "Low" },
                    { val: "out" as StockFilter, lbl: "Out" },
                  ]).map((f) => (
                    <button key={f.val} className={`sm-pill ${stockFilter === f.val ? "active" : ""}`} onClick={() => setStockFilter(f.val)}>
                      {f.lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm-filter-group">
                <label><FiArrowDown size={12} /> Sort By</label>
                <div className="sm-stock-pills">
                  {([
                    { val: "name" as SortKey, lbl: "Name" },
                    { val: "stock" as SortKey, lbl: "Stock" },
                    { val: "sold" as SortKey, lbl: "Sold" },
                    { val: "status" as SortKey, lbl: "Status" },
                  ]).map((s) => (
                    <button key={s.val} className={`sm-pill ${sortKey === s.val ? "active" : ""}`} onClick={() => handleSort(s.val)}>
                      {s.lbl}<SortIcon k={s.val} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm-filter-group">
                <label><FiHash size={12} /> Per Page</label>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                  {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} items</option>)}
                </select>
              </div>
              {hasActiveFilters && <button className="sm-clear-filters" onClick={clearFilters}><FiX size={13} /> Clear</button>}
            </div>
          </div>

          <div className="sm-toolbar-info">
            <div className="sm-showing">
              <span className="sm-showing-bold">{filtered.length}</span> products
              {hasActiveFilters && <span className="sm-showing-sub"> (filtered from {stats.total})</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="sm-main">
        {loading ? (
          <div className="sm-state">
            <div className="sm-loader"><div className="sm-loader-ring" /><div className="sm-loader-ring" /><div className="sm-loader-ring" /></div>
            <h3>Loading Inventory</h3><p>Please wait…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="sm-state sm-state-empty">
            <div className="sm-state-icon empty"><FiSearch size={28} /></div>
            <h3>No products found</h3><p>Try adjusting your search or filters</p>
            {hasActiveFilters && <button className="sm-retry-btn" onClick={clearFilters}><FiX size={14} /> Clear Filters</button>}
          </div>
        ) : view === "table" ? (
          /* TABLE VIEW */
          <div className="sm-table-wrap">
            <table className="sm-table">
              <thead>
                <tr>
                  <th className="sm-th-num">#</th>
                  <th className="sm-th-sortable" onClick={() => handleSort("name")}><span>Product</span><SortIcon k="name" /></th>
                  <th>Unit</th>
                  <th className="sm-th-sortable" onClick={() => handleSort("stock")}><span>Stock</span><SortIcon k="stock" /></th>
                  <th className="sm-th-sortable sm-th-hide-sm" onClick={() => handleSort("sold")}><span>Sold</span><SortIcon k="sold" /></th>
                  <th className="sm-th-sortable" onClick={() => handleSort("status")}><span>Status</span><SortIcon k="status" /></th>
                  <th className="sm-th-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => {
                  const isEditing = editingId === item._id;
                  const status = getStatusInfo(item.stock);
                  return (
                    <tr key={item._id} className={`sm-tr ${isEditing ? "sm-tr-editing" : ""}`}>
                      <td className="sm-td-num">{(safePage - 1) * perPage + idx + 1}</td>
                      <td>
                        <div className="sm-td-product">
                          <div className="sm-td-img" onClick={() => item.image && setPreviewImage(getImageUrl(item.image))}>
                            {item.image ? (
                              <img src={getImageUrl(item.image)} alt={item.name} />
                            ) : (
                              <div className="sm-td-img-empty"><FiImage size={16} /></div>
                            )}
                            {item.image && <div className="sm-img-zoom"><FiEye size={10} /></div>}
                          </div>
                          <div className="sm-td-info">
                            <span className="sm-product-name">{item.name}</span>
                            <span className="sm-product-sku" onClick={() => copy(item.sku, "SKU")}>
                              {item.sku}<FiCopy size={9} className="sm-sku-copy" />
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="sm-edit-input sm-edit-unit"
                            value={editForm.unit}
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                            placeholder="Unit…"
                          />
                        ) : item.unit ? (
                          <span className="sm-unit-badge">{item.unit}</span>
                        ) : (
                          <span className="sm-unit-empty">—</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            className="sm-edit-input sm-edit-stock"
                            value={editForm.stock}
                            onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                            min={0}
                          />
                        ) : (
                          <span className={`sm-stock-val ${status.cls}`}>{item.stock}</span>
                        )}
                      </td>
                      <td className="sm-th-hide-sm">
                        <span className="sm-sold-val">{item.totalSold}</span>
                      </td>
                      <td>
                        <span className={`sm-status sm-status-${status.cls}`}>
                          {status.icon}{status.label}
                        </span>
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="sm-edit-actions">
                            <button className="sm-edit-save" onClick={() => saveEdit(item._id)} disabled={saving} title="Save"><FiCheck size={15} /></button>
                            <button className="sm-edit-cancel" onClick={cancelEditing} title="Cancel"><FiX size={15} /></button>
                          </div>
                        ) : (
                          <button className="sm-edit-btn" onClick={() => startEditing(item)} title="Edit Stock"><FiEdit2 size={15} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD VIEW */
          <div className="sm-cards">
            {paginated.map((item) => {
              const isEditing = editingId === item._id;
              const status = getStatusInfo(item.stock);
              return (
                <div className={`sm-card ${isEditing ? "sm-card-editing" : ""}`} key={item._id}>
                  <div className="sm-card-top">
                    <div className="sm-card-img" onClick={() => item.image && setPreviewImage(getImageUrl(item.image))}>
                      {item.image ? (
                        <img src={getImageUrl(item.image)} alt={item.name} />
                      ) : (
                        <div className="sm-card-img-empty"><FiImage size={22} /></div>
                      )}
                    </div>
                    <div className="sm-card-title">
                      <h4>{item.name}</h4>
                      <div className="sm-card-meta">
                        <span className="sm-card-sku" onClick={() => copy(item.sku, "SKU")}><FiHash size={10} /> {item.sku} <FiCopy size={9} /></span>
                        {item.unit && <span className="sm-card-unit"><FiTag size={10} /> {item.unit}</span>}
                      </div>
                    </div>
                    <span className={`sm-status-dot sm-status-dot-${status.cls}`} title={status.label} />
                  </div>

                  <div className="sm-card-body">
                    <div className="sm-card-fields">
                      <div className="sm-card-field">
                        <div className={`sm-cf-icon ${status.cls}`}>{status.icon}</div>
                        <div className="sm-cf-content">
                          <label>Current Stock</label>
                          {isEditing ? (
                            <input type="number" className="sm-card-edit-input" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} min={0} />
                          ) : (
                            <span className="sm-cf-val">{item.stock} {item.unit || ""}</span>
                          )}
                        </div>
                      </div>
                      <div className="sm-card-field">
                        <div className="sm-cf-icon sold"><FiShoppingCart size={14} /></div>
                        <div className="sm-cf-content">
                          <label>Total Sold</label>
                          <span className="sm-cf-val">{item.totalSold}</span>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="sm-card-field full">
                          <div className="sm-cf-icon unit"><FiTag size={14} /></div>
                          <div className="sm-cf-content">
                            <label>Unit Type</label>
                            <input type="text" className="sm-card-edit-input" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} placeholder="e.g. pcs, box…" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm-card-foot">
                    <span className={`sm-status sm-status-${status.cls}`}>{status.icon}{status.label}</span>
                    {isEditing ? (
                      <div className="sm-card-edit-btns">
                        <button className="sm-cedit-save" onClick={() => saveEdit(item._id)} disabled={saving}><FiCheck size={14} /> Save</button>
                        <button className="sm-cedit-cancel" onClick={cancelEditing}><FiX size={14} /></button>
                      </div>
                    ) : (
                      <button className="sm-cedit-btn" onClick={() => startEditing(item)}><FiEdit2 size={14} /> Edit</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="sm-pagination">
          <div className="sm-pag-info">Page <strong>{safePage}</strong> of <strong>{totalPages}</strong></div>
          <div className="sm-pag-controls">
            <button className="sm-pag-btn" disabled={safePage <= 1} onClick={() => { setCurrentPage(1); scrollToTop(); }}><FiChevronsLeft size={16} /></button>
            <button className="sm-pag-btn" disabled={safePage <= 1} onClick={() => { setCurrentPage((p) => p - 1); scrollToTop(); }}><FiChevronLeft size={16} /></button>
            <div className="sm-pag-pages">
              {pageRange().map((p) => <button key={p} className={`sm-pag-num ${p === safePage ? "active" : ""}`} onClick={() => { setCurrentPage(p); scrollToTop(); }}>{p}</button>)}
            </div>
            <button className="sm-pag-btn" disabled={safePage >= totalPages} onClick={() => { setCurrentPage((p) => p + 1); scrollToTop(); }}><FiChevronRight size={16} /></button>
            <button className="sm-pag-btn" disabled={safePage >= totalPages} onClick={() => { setCurrentPage(totalPages); scrollToTop(); }}><FiChevronsRight size={16} /></button>
          </div>
        </nav>
      )}

      <footer className="sm-footer"><p>© {new Date().getFullYear()} BafnaToys Stock Management</p></footer>
    </div>
  );
};

export default StockManagement;