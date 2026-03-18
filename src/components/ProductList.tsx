import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiEdit2, FiTrash2, FiPlus, FiSearch, FiX, FiCheck,
  FiArrowUp, FiArrowDown, FiChevronDown, FiChevronUp,
  FiAlertCircle, FiCheckCircle, FiMenu, FiPackage,
  FiRefreshCw, FiGrid, FiList, FiFilter, FiSliders,
  FiHash, FiCopy, FiExternalLink, FiBox, FiTag,
  FiDollarSign, FiLayers, FiImage, FiMoreVertical,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
  FiMinimize2, FiMaximize2, FiEye, FiShield, FiKey,
  FiDownload, FiTrendingUp, FiActivity, FiAlertTriangle
} from "react-icons/fi";
import "../styles/ProductList.css";

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

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  price?: number | string;
  stock?: number;
  unit?: string;
  category?: { _id: string; name: string };
  createdAt?: string;
  images?: string[];
  order?: number;
}

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_BASE}${url}` : "";

const norm = (v?: string) => (v || "").toString().toLowerCase().trim();

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"table" | "card">("table");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<{
    productId: string;
    categoryId: string;
  } | null>(null);

  const [delId, setDelId] = useState<string | null>(null);
  const [delPwd, setDelPwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto switch view on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setView("card");
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/categories`),
      ]);
      const sorted = prodRes.data.sort(
        (a: Product, b: Product) => (a.order || 0) - (b.order || 0)
      );
      setProducts(sorted);
      setCategories(catRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Stats
  const stats = useMemo(() => {
    let outOfStock = 0, lowStock = 0, inStock = 0;
    products.forEach((p) => {
      const s = p.stock || 0;
      if (s === 0) outOfStock++;
      else if (s <= 5) lowStock++;
      else inStock++;
    });
    return {
      total: products.length,
      categories: new Set(products.map((p) => p.category?.name || "Uncategorized")).size,
      outOfStock,
      lowStock,
      inStock,
    };
  }, [products]);

  // Grouped
  const groupedProducts = useMemo(() => {
    const q = norm(debounced);
    let filtered = !q
      ? products
      : products.filter((p) => {
          const n = norm(p.name);
          const s = norm(p.sku);
          const c = norm(p.category?.name);
          return n.includes(q) || s.includes(q) || c.includes(q);
        });

    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => (p.category?.name || "Uncategorized") === categoryFilter);
    }

    if (stockFilter === "out") filtered = filtered.filter((p) => (p.stock || 0) === 0);
    else if (stockFilter === "low") filtered = filtered.filter((p) => { const s = p.stock || 0; return s > 0 && s <= 5; });
    else if (stockFilter === "in") filtered = filtered.filter((p) => (p.stock || 0) > 5);

    const groups: Record<string, Product[]> = {};
    filtered.forEach((p) => {
      const cat = p.category?.name || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [products, debounced, categoryFilter, stockFilter]);

  const totalFiltered = useMemo(() =>
    Object.values(groupedProducts).reduce((a, b) => a + b.length, 0),
    [groupedProducts]
  );

  const hasActiveFilters = search || categoryFilter !== "all" || stockFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStockFilter("all");
  };

  // Delete
  const handleDelete = async (id: string) => {
    setDelId(id);
  };

  const confirmDelete = async () => {
    if (delPwd !== "bafnatoys") {
      return import("react-hot-toast").then(({ default: toast }) =>
        toast.error("Wrong password")
      );
    }
    if (!delId) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/products/${delId}`);
      setProducts((prev) => prev.filter((p) => p._id !== delId));
      import("react-hot-toast").then(({ default: toast }) =>
        toast.success("Product deleted", {
          icon: "🗑️",
          style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
        })
      );
    } catch (err: any) {
      import("react-hot-toast").then(({ default: toast }) =>
        toast.error(err.response?.data?.message || "Failed to delete")
      );
    } finally {
      setDeleting(false);
      setDelId(null);
      setDelPwd("");
    }
  };

  // Category change
  const saveCategoryChange = async (productId: string) => {
    const product = products.find((p) => p._id === productId);
    const newCategoryId = editingCategory?.categoryId;
    if (!product || !newCategoryId || newCategoryId === product.category?._id) {
      setEditingCategory(null);
      return;
    }
    try {
      const newCategory = categories.find((c) => c._id === newCategoryId);
      setProducts((prev) =>
        prev.map((p) =>
          p._id === productId
            ? { ...p, category: { _id: newCategoryId, name: newCategory?.name || "—" } }
            : p
        )
      );
      await axios.put(`${API_BASE}/products/${productId}`, { category: newCategoryId });
      setEditingCategory(null);
    } catch {
      import("react-hot-toast").then(({ default: toast }) =>
        toast.error("Failed to update category")
      );
      setEditingCategory(null);
    }
  };

  // Move
  const moveProduct = async (id: string, direction: "up" | "down") => {
    try {
      const res = await axios.put(`${API_BASE}/products/${id}/move`, { direction });
      if (res.data.updatedCategoryProducts) {
        const updated = res.data.updatedCategoryProducts;
        setProducts((prev) => {
          const newList = prev.map((p) => {
            const match = updated.find((u: Product) => u._id === p._id);
            return match ? { ...p, order: match.order } : p;
          });
          return newList.sort((a, b) => (a.order || 0) - (b.order || 0));
        });
      }
    } catch {
      import("react-hot-toast").then(({ default: toast }) =>
        toast.error("Failed to move product")
      );
    }
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      const row = document.getElementById(`row-${id}`);
      if (row) row.classList.add("pl-dragging");
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverItem !== id) setDragOverItem(id);
  };

  const handleDragLeave = () => setDragOverItem(null);

  const handleDrop = async (e: React.DragEvent, targetId: string, catName: string) => {
    e.preventDefault();
    setDragOverItem(null);
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }
    const group = groupedProducts[catName];
    const draggedIdx = group.findIndex((p) => p._id === draggedItem);
    const targetIdx = group.findIndex((p) => p._id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedItem(null);
      return;
    }
    const steps = Math.abs(targetIdx - draggedIdx);
    const direction = targetIdx > draggedIdx ? "down" : "up";

    setProducts((prev) => {
      const newProducts = prev.map((p) => ({ ...p }));
      const groupItems = newProducts
        .filter((p) => p.category?.name === catName)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const draggedItemObj = groupItems.find((p) => p._id === draggedItem);
      if (!draggedItemObj) return prev;
      const filteredGroup = groupItems.filter((p) => p._id !== draggedItem);
      filteredGroup.splice(targetIdx, 0, draggedItemObj);
      filteredGroup.forEach((p, index) => {
        const match = newProducts.find((np) => np._id === p._id);
        if (match) match.order = index;
      });
      return newProducts.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    setDraggedItem(null);

    try {
      for (let i = 0; i < steps; i++) {
        await axios.put(`${API_BASE}/products/${draggedItem}/move`, { direction });
      }
    } catch {
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data.sort((a: Product, b: Product) => (a.order || 0) - (b.order || 0)));
    }
  };

  const handleDragEnd = (id: string) => {
    setDraggedItem(null);
    setDragOverItem(null);
    const row = document.getElementById(`row-${id}`);
    if (row) row.classList.remove("pl-dragging");
  };

  const toggleExpand = (catName: string) => {
    setExpanded((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    Object.keys(groupedProducts).forEach((k) => (all[k] = true));
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  const allExpanded = Object.keys(groupedProducts).every((k) => expanded[k]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    import("react-hot-toast").then(({ default: toast }) =>
      toast.success(`${label} copied!`, {
        duration: 1500,
        icon: "📋",
        style: { borderRadius: "12px", background: "#1e293b", color: "#fff", fontSize: "14px" },
      })
    );
  };

  // ===== Render =====
  return (
    <div className={`pl-root ${search ? "pl-searching" : ""}`} ref={topRef}>
      {/* Delete Modal */}
      {delId && (
        <div className="pl-overlay" onClick={() => { setDelId(null); setDelPwd(""); }}>
          <div className="pl-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pl-del-visual">
              <div className="pl-del-circle"><div className="pl-del-circle-inner"><FiShield size={28} /></div></div>
              <div className="pl-del-pulse" />
            </div>
            <h3>Delete Product</h3>
            <p>This action is <strong>permanent</strong> and cannot be undone.<br />Enter admin password to confirm.</p>
            <div className="pl-del-input-wrap">
              <FiKey className="pl-del-input-icon" />
              <input
                type="password"
                placeholder="Enter admin password…"
                value={delPwd}
                onChange={(e) => setDelPwd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmDelete()}
                autoFocus
              />
            </div>
            <div className="pl-del-btns">
              <button className="pl-dbtn pl-dbtn-cancel" onClick={() => { setDelId(null); setDelPwd(""); }}>Cancel</button>
              <button className="pl-dbtn pl-dbtn-danger" onClick={confirmDelete} disabled={deleting}>
                <FiTrash2 size={14} /> {deleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <section className="pl-top">
        <div className="pl-top-row">
          <div className="pl-top-left">
            <h1 className="pl-title">Products</h1>
            <span className="pl-count">{stats.total} items</span>
          </div>
          <div className="pl-top-right">
            <button className="pl-top-btn" onClick={fetchData} disabled={loading} title="Refresh">
              <FiRefreshCw size={16} className={loading ? "pl-spinning" : ""} />
            </button>
            <button className="pl-top-btn pl-top-add" onClick={() => navigate("/admin/products/new")}>
              <FiPlus size={16} /><span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="pl-stats">
          {[
            { icon: <FiPackage size={18} />, val: stats.total, lbl: "Total Products", color: "indigo" },
            { icon: <FiLayers size={18} />, val: stats.categories, lbl: "Categories", color: "violet" },
            { icon: <FiCheckCircle size={18} />, val: stats.inStock, lbl: "In Stock", color: "emerald" },
            { icon: <FiAlertTriangle size={18} />, val: stats.lowStock, lbl: "Low Stock", color: "amber" },
            { icon: <FiAlertCircle size={18} />, val: stats.outOfStock, lbl: "Out of Stock", color: "red" },
          ].map((s) => (
            <div className={`pl-stat pl-stat-${s.color}`} key={s.lbl}>
              <div className="pl-stat-top">
                <div className="pl-stat-icon">{s.icon}</div>
                <div className="pl-stat-num">{s.val}</div>
              </div>
              <div className="pl-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Toolbar */}
      <section className="pl-toolbar-section">
        <div className="pl-toolbar">
          <div className="pl-toolbar-main">
            <div className="pl-search">
              <FiSearch className="pl-search-icon" />
              <input
                ref={searchRef}
                placeholder="Search by name, SKU, or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="pl-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}>
                  <FiX size={14} />
                </button>
              )}
            </div>
            <div className="pl-toolbar-btns">
              <button
                className={`pl-tbtn ${showFilters ? "active" : ""} ${hasActiveFilters ? "has-filters" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FiSliders size={15} /><span>Filters</span>
                {hasActiveFilters && <span className="pl-filter-dot" />}
              </button>
              <div className="pl-view-toggle">
                <button className={`pl-vt ${view === "table" ? "active" : ""}`} onClick={() => setView("table")} title="Table"><FiList size={16} /></button>
                <button className={`pl-vt ${view === "card" ? "active" : ""}`} onClick={() => setView("card")} title="Cards"><FiGrid size={16} /></button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`pl-filters ${showFilters ? "open" : ""}`}>
            <div className="pl-filters-inner">
              <div className="pl-filter-group">
                <label><FiTag size={12} /> Category</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="pl-filter-group">
                <label><FiBox size={12} /> Stock</label>
                <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
                  <option value="all">All Stock</option>
                  <option value="in">In Stock (&gt;5)</option>
                  <option value="low">Low Stock (1-5)</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button className="pl-clear-filters" onClick={clearFilters}><FiX size={13} /> Clear</button>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="pl-toolbar-info">
            <div className="pl-showing">
              <span className="pl-showing-bold">{totalFiltered}</span> products
              {hasActiveFilters && <span className="pl-showing-sub"> (filtered from {stats.total})</span>}
            </div>
            <div className="pl-toolbar-info-right">
              {Object.keys(groupedProducts).length > 0 && (
                <button className="pl-expand-btn" onClick={allExpanded ? collapseAll : expandAll}>
                  {allExpanded ? <><FiMinimize2 size={13} /> Collapse</> : <><FiMaximize2 size={13} /> Expand All</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="pl-main">
        {loading ? (
          <div className="pl-state">
            <div className="pl-loader"><div className="pl-loader-ring" /><div className="pl-loader-ring" /><div className="pl-loader-ring" /></div>
            <h3>Loading Products</h3><p>Please wait…</p>
          </div>
        ) : error ? (
          <div className="pl-state pl-state-error">
            <div className="pl-state-icon error"><FiAlertCircle size={28} /></div>
            <h3>Something went wrong</h3><p>{error}</p>
            <button className="pl-retry-btn" onClick={fetchData}><FiRefreshCw size={14} /> Try Again</button>
          </div>
        ) : Object.keys(groupedProducts).length === 0 ? (
          <div className="pl-state pl-state-empty">
            <div className="pl-state-icon empty"><FiSearch size={28} /></div>
            <h3>No products found</h3><p>Try adjusting your search or filters</p>
            {hasActiveFilters && <button className="pl-retry-btn" onClick={clearFilters}><FiX size={14} /> Clear All Filters</button>}
          </div>
        ) : (
          Object.keys(groupedProducts).map((catName) => {
            const catProducts = groupedProducts[catName];
            const isOpen = expanded[catName];

            return (
              <div className={`pl-category ${isOpen ? "pl-cat-open" : ""}`} key={catName}>
                {/* Category Header */}
                <div className="pl-cat-header" onClick={() => toggleExpand(catName)}>
                  <div className="pl-cat-header-left">
                    <div className="pl-cat-icon">
                      <FiLayers size={16} />
                    </div>
                    <h2>{catName}</h2>
                    <span className="pl-cat-count">{catProducts.length}</span>
                  </div>
                  <div className="pl-cat-header-right">
                    {isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                  </div>
                </div>

                {/* Category Content */}
                {isOpen && (
                  <div className="pl-cat-content">
                    {view === "table" ? (
                      /* ===== TABLE VIEW ===== */
                      <div className="pl-table-wrap">
                        <table className="pl-table">
                          <thead>
                            <tr>
                              <th className="pl-th-drag"></th>
                              <th className="pl-th-num">#</th>
                              <th className="pl-th-img">Image</th>
                              <th>Name</th>
                              <th className="pl-th-hide-sm">SKU</th>
                              <th>Stock</th>
                              <th className="pl-th-hide-md">Category</th>
                              <th>Price</th>
                              <th className="pl-th-actions">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catProducts.map((p, index) => {
                              const isEditing = editingCategory?.productId === p._id;
                              const currentCat = p.category?._id || "";
                              const stock = p.stock || 0;
                              const unitLabel = p.unit || "Units";
                              const isDragging = draggedItem === p._id;
                              const isDragOver = dragOverItem === p._id;

                              return (
                                <tr
                                  key={p._id}
                                  id={`row-${p._id}`}
                                  className={`pl-tr ${isDragging ? "pl-dragging" : ""} ${isDragOver && !isDragging ? "pl-drag-over" : ""}`}
                                  draggable={!search}
                                  onDragStart={(e) => handleDragStart(e, p._id)}
                                  onDragOver={(e) => handleDragOver(e, p._id)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, p._id, catName)}
                                  onDragEnd={() => handleDragEnd(p._id)}
                                >
                                  <td className="pl-td-drag">
                                    <FiMenu className="pl-drag-handle" size={16} title={search ? "Clear search to reorder" : "Drag to reorder"} />
                                  </td>
                                  <td className="pl-td-num">{index + 1}</td>
                                  <td className="pl-td-img">
                                    {p.images?.[0] ? (
                                      <img src={getImageUrl(p.images[0])} alt={p.name} className="pl-thumb" />
                                    ) : (
                                      <div className="pl-thumb pl-thumb-empty"><FiImage size={18} /></div>
                                    )}
                                  </td>
                                  <td>
                                    <div className="pl-td-name">
                                      <span className="pl-product-name">{p.name}</span>
                                      <span className="pl-product-sku pl-mobile-sku">{p.sku}</span>
                                    </div>
                                  </td>
                                  <td className="pl-th-hide-sm">
                                    <span className="pl-sku-badge" onClick={() => copy(p.sku, "SKU")}>
                                      {p.sku}<FiCopy size={10} className="pl-sku-copy" />
                                    </span>
                                  </td>
                                  <td>
                                    {stock === 0 ? (
                                      <span className="pl-stock pl-stock-out"><FiAlertCircle size={12} /> Out</span>
                                    ) : stock <= 5 ? (
                                      <span className="pl-stock pl-stock-low"><FiAlertTriangle size={12} /> {stock} {unitLabel}</span>
                                    ) : (
                                      <span className="pl-stock pl-stock-ok"><FiCheckCircle size={12} /> {stock} {unitLabel}</span>
                                    )}
                                  </td>
                                  <td className="pl-th-hide-md">
                                    <div className="pl-cat-select-wrap">
                                      <select
                                        value={isEditing ? editingCategory.categoryId : currentCat}
                                        onChange={(e) => setEditingCategory({ productId: p._id, categoryId: e.target.value })}
                                        className="pl-cat-select"
                                      >
                                        <option value="">Select</option>
                                        {categories.map((cat) => (
                                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                      </select>
                                      {isEditing && editingCategory.categoryId !== currentCat && (
                                        <button onClick={() => saveCategoryChange(p._id)} className="pl-cat-save" title="Save">
                                          <FiCheck size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <span className="pl-price">{p.price ? `₹${Number(p.price).toLocaleString()}` : "—"}</span>
                                  </td>
                                  <td>
                                    <div className="pl-actions">
                                      <div className="pl-move-btns">
                                        <button onClick={(e) => { e.stopPropagation(); moveProduct(p._id, "up"); }} disabled={index === 0} className="pl-move" title="Move Up"><FiArrowUp size={13} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); moveProduct(p._id, "down"); }} disabled={index === catProducts.length - 1} className="pl-move" title="Move Down"><FiArrowDown size={13} /></button>
                                      </div>
                                      <Link to={`/admin/products/edit/${p._id}`} className="pl-act-btn pl-act-edit" title="Edit"><FiEdit2 size={14} /></Link>
                                      <button onClick={() => handleDelete(p._id)} className="pl-act-btn pl-act-del" title="Delete"><FiTrash2 size={14} /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* ===== CARD VIEW ===== */
                      <div className="pl-cards">
                        {catProducts.map((p, index) => {
                          const stock = p.stock || 0;
                          const unitLabel = p.unit || "Units";

                          return (
                            <div className="pl-card" key={p._id}>
                              <div className="pl-card-top">
                                <div className="pl-card-img">
                                  {p.images?.[0] ? (
                                    <img src={getImageUrl(p.images[0])} alt={p.name} />
                                  ) : (
                                    <div className="pl-card-img-empty"><FiImage size={24} /></div>
                                  )}
                                </div>
                                <div className="pl-card-info">
                                  <h4 className="pl-card-name">{p.name}</h4>
                                  <div className="pl-card-meta">
                                    <span className="pl-card-sku" onClick={() => copy(p.sku, "SKU")}><FiHash size={11} /> {p.sku} <FiCopy size={9} /></span>
                                    <span className="pl-card-cat"><FiTag size={11} /> {p.category?.name || "Uncategorized"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pl-card-body">
                                <div className="pl-card-fields">
                                  <div className="pl-card-field">
                                    <div className="pl-cf-icon price"><FiDollarSign size={14} /></div>
                                    <div className="pl-cf-content">
                                      <label>Price</label>
                                      <span className="pl-cf-val">{p.price ? `₹${Number(p.price).toLocaleString()}` : "—"}</span>
                                    </div>
                                  </div>
                                  <div className="pl-card-field">
                                    <div className={`pl-cf-icon ${stock === 0 ? "out" : stock <= 5 ? "low" : "ok"}`}>
                                      {stock === 0 ? <FiAlertCircle size={14} /> : stock <= 5 ? <FiAlertTriangle size={14} /> : <FiCheckCircle size={14} />}
                                    </div>
                                    <div className="pl-cf-content">
                                      <label>Stock</label>
                                      <span className="pl-cf-val">{stock === 0 ? "Out of Stock" : `${stock} ${unitLabel}`}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="pl-card-actions">
                                <div className="pl-card-move">
                                  <button onClick={() => moveProduct(p._id, "up")} disabled={index === 0} className="pl-move" title="Up"><FiArrowUp size={14} /></button>
                                  <button onClick={() => moveProduct(p._id, "down")} disabled={index === catProducts.length - 1} className="pl-move" title="Down"><FiArrowDown size={14} /></button>
                                </div>
                                <Link to={`/admin/products/edit/${p._id}`} className="pl-card-act pl-card-edit"><FiEdit2 size={14} /><span>Edit</span></Link>
                                <button onClick={() => handleDelete(p._id)} className="pl-card-act pl-card-delete"><FiTrash2 size={14} /><span>Delete</span></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <footer className="pl-footer"><p>© {new Date().getFullYear()} BafnaToys Product Management</p></footer>
    </div>
  );
}