import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import api from "../utils/api";
import toast, { Toaster } from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  FiTrash2, FiSearch, FiStar, FiSettings,
  FiPlus, FiX, FiEdit2, FiBox, FiChevronDown, FiCalendar,
  FiRefreshCw, FiGrid, FiList, FiSliders, FiHash, FiUser,
  FiShield, FiKey, FiCheck, FiSave,
  FiAlertCircle, FiCheckCircle
} from "react-icons/fi";
import "../styles/AdminReviews.css";


const MEDIA_BASE =
  (import.meta as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.REACT_APP_MEDIA_URL ||
  "https://api.bafnatoys.com";

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_BASE}${url}` : "";

interface Product {
  _id: string;
  name: string;
  images?: string[];
}

interface Review {
  _id: string;
  productId?: { _id: string; name: string; images?: string[]; };
  shopName?: string;
  rating: number;
  createdAt: string;
}

type RatingFilter = "all" | 1 | 2 | 3 | 4 | 5;

const getTodayDate = () => new Date().toISOString().split("T")[0];

const STAR_LABELS: Record<number, string> = {
  5: "Highly Satisfied",
  4: "Good",
  3: "Satisfactory",
  2: "Needs Improvement",
  1: "Poor",
};

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filterRating, setFilterRating] = useState<RatingFilter>("all");
  const [view, setView] = useState<"table" | "card">("table");
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [productDropdown, setProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // For Admin clickable stars
  const [hoverRating, setHoverRating] = useState(0);

  const [formData, setFormData] = useState({
    productId: "",
    shopName: "",
    rating: 5,
    createdAt: getTodayDate(),
  });

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [timeLimitDays, setTimeLimitDays] = useState(30);

  const [delId, setDelId] = useState<string | null>(null);
  const [delPwd, setDelPwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setView("card");
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reviews/all/list`);
      setReviews(res.data);
    } catch {
      toast.error("Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get(`/products`);
      setProductsList(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchReviews(); fetchProducts(); }, [fetchReviews, fetchProducts]);

  const stats = useMemo(() => {
    const s = { total: reviews.length, avg: 0, five: 0, four: 0, three: 0, two: 0, one: 0 };
    if (reviews.length === 0) return s;
    let sum = 0;
    reviews.forEach((r) => {
      sum += r.rating;
      const floor = Math.floor(r.rating);
      if (floor === 5) s.five++;
      else if (floor === 4) s.four++;
      else if (floor === 3) s.three++;
      else if (floor === 2) s.two++;
      else s.one++;
    });
    s.avg = Math.round((sum / reviews.length) * 10) / 10;
    return s;
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    return reviews.filter((r) => {
      const matchRating = filterRating === "all" || Math.floor(r.rating) === filterRating;
      if (!matchRating) return false;
      if (!q) return true;
      const shop = (r.shopName || "").toLowerCase();
      const product = (r.productId?.name || "").toLowerCase();
      return shop.includes(q) || product.includes(q);
    });
  }, [reviews, debounced, filterRating]);

  const hasActiveFilters = search || filterRating !== "all";
  const clearFilters = () => { setSearch(""); setFilterRating("all"); };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return productsList;
    const q = productSearch.toLowerCase();
    return productsList.filter((p) => p.name.toLowerCase().includes(q));
  }, [productsList, productSearch]);

  const selectedProduct = productsList.find((p) => p._id === formData.productId);

  const resetForm = () => {
    setFormData({ productId: "", shopName: "", rating: 5, createdAt: getTodayDate() });
    setShowForm(false);
    setIsEditing(false);
    setEditId(null);
    setProductDropdown(false);
    setProductSearch("");
    setHoverRating(0);
  };

  const handleEditClick = (review: Review) => {
    setIsEditing(true);
    setEditId(review._id);
    setFormData({
      productId: review.productId?._id || "",
      shopName: review.shopName || "",
      rating: review.rating,
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString().split("T")[0] : getTodayDate(),
    });
    setShowForm(true);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) return toast.error("Please select a product");
    if (!formData.shopName.trim()) return toast.error("Shop name is required");

    setSaving(true);
    try {
      // ✅ Admin manually adding a review, bypass time limits
      const payload = { ...formData, isAdmin: true }; 

      if (isEditing && editId) {
        await api.put(`/reviews/${editId}`, payload);
        toast.success("Rating updated!", { icon: "✅", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      } else {
        await api.post(`/reviews/add`, payload);
        toast.success("Rating added!", { icon: "🎉", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      }
      resetForm();
      fetchReviews();
    } catch {
      toast.error(`Failed to ${isEditing ? "update" : "add"} rating`);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      // Yahan aap apne Setting backend par call karenge
      // Example: await axios.put(`${API_BASE}/settings/review-time`, { days: timeLimitDays });
      toast.success(`Customer review limit set to ${timeLimitDays} days!`, { icon: "⏱️" });
      setShowSettings(false);
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const confirmDelete = async () => {
    if (delPwd !== "bafnatoys") return toast.error("Wrong password");
    if (!delId) return;
    setDeleting(true);
    try {
      await api.delete(`/reviews/${delId}`);
      setReviews((prev) => prev.filter((r) => r._id !== delId));
      toast.success("Rating deleted!", { icon: "🗑️", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDelId(null);
      setDelPwd("");
    }
  };

  const getStarColor = (rating: number) => {
    if (rating >= 4) return "green";
    if (rating === 3) return "amber";
    return "red";
  };

  const renderStars = (rating: number, size = 12) => {
    return (
      <div className="rv-stars">
        {[1, 2, 3, 4, 5].map((i) => (
          <FiStar
            key={i}
            size={size}
            className={`rv-star ${i <= Math.floor(rating) ? `rv-star-filled rv-star-${getStarColor(rating)}` : "rv-star-empty"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="rv-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {/* ⚙️ GLOBAL SETTINGS MODAL (For Customers Time Limit) */}
      {showSettings && (
        <div className="rv-overlay" onClick={() => setShowSettings(false)}>
          <div className="rv-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rv-del-visual" style={{ background: '#eef2ff' }}>
              <div className="rv-del-circle" style={{ background: '#c7d2fe', color: '#4f46e5' }}>
                <div className="rv-del-circle-inner"><FiSettings size={28} /></div>
              </div>
            </div>
            <h3>Customer Review Settings</h3>
            <p>Set how many days after delivery a real customer can submit a rating.</p>
            <div className="rv-field" style={{ textAlign: 'left', marginTop: '15px' }}>
              <label className="rv-label">Time Limit (in Days)</label>
              <input 
                type="number" 
                className="rv-input" 
                value={timeLimitDays} 
                onChange={(e) => setTimeLimitDays(Number(e.target.value))} 
                min="0"
              />
              <small style={{ color: '#6b7280', fontSize: '11px' }}>Example: 30 days. Enter 0 for unlimited time.</small>
            </div>
            <div className="rv-del-btns" style={{ marginTop: '20px' }}>
              <button className="rv-dbtn rv-dbtn-cancel" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="rv-dbtn" style={{ background: '#4f46e5', color: '#fff' }} onClick={saveSettings}><FiSave size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {delId && (
        <div className="rv-overlay" onClick={() => { setDelId(null); setDelPwd(""); }}>
          <div className="rv-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rv-del-visual">
              <div className="rv-del-circle"><div className="rv-del-circle-inner"><FiShield size={28} /></div></div>
              <div className="rv-del-pulse" />
            </div>
            <h3>Delete Rating</h3>
            <p>This action is <strong>permanent</strong>. Enter admin password.</p>
            <div className="rv-del-input-wrap">
              <FiKey className="rv-del-input-icon" />
              <input type="password" placeholder="Enter admin password…" value={delPwd} onChange={(e) => setDelPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmDelete()} autoFocus />
            </div>
            <div className="rv-del-btns">
              <button className="rv-dbtn rv-dbtn-cancel" onClick={() => { setDelId(null); setDelPwd(""); }}>Cancel</button>
              <button className="rv-dbtn rv-dbtn-danger" onClick={confirmDelete} disabled={deleting}><FiTrash2 size={14} /> {deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top */}
      <section className="rv-top">
        <div className="rv-top-row">
          <div className="rv-top-left">
            <h1 className="rv-title">Ratings</h1>
            <span className="rv-count">{stats.total} total</span>
          </div>
          <div className="rv-top-right">
            <button className="rv-top-btn" onClick={fetchReviews} disabled={loading} title="Refresh">
              <FiRefreshCw size={16} className={loading ? "rv-spinning" : ""} />
            </button>
            {/* ✅ NEW SETTINGS BUTTON */}
            <button className="rv-top-btn" onClick={() => setShowSettings(true)} title="Settings" style={{ background: '#f3f4f6', color: '#374151' }}>
              <FiSettings size={16} /><span>Settings</span>
            </button>
            <button
              className={`rv-top-btn ${showForm ? "rv-top-cancel" : "rv-top-add"}`}
              onClick={showForm ? resetForm : () => setShowForm(true)}
            >
              {showForm ? <><FiX size={16} /><span>Cancel</span></> : <><FiPlus size={16} /><span>Add Fake Rating</span></>}
            </button>
          </div>
        </div>

        <div className="rv-stats">
          {[
            { icon: <FiHash size={18} />, val: stats.total, lbl: "Total Ratings", color: "indigo" },
            { icon: <FiStar size={18} />, val: stats.avg, lbl: "Avg Rating", color: "amber" },
            { icon: <FiCheckCircle size={18} />, val: stats.five + stats.four, lbl: "Positive (4-5★)", color: "emerald" },
            { icon: <FiAlertCircle size={18} />, val: stats.two + stats.one, lbl: "Negative (1-2★)", color: "red" },
          ].map((s) => (
            <div className={`rv-stat rv-stat-${s.color}`} key={s.lbl}>
              <div className="rv-stat-top">
                <div className="rv-stat-icon">{s.icon}</div>
                <div className="rv-stat-num">{s.val}</div>
              </div>
              <div className="rv-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Add/Edit Form */}
      {showForm && (
        <section className="rv-form-section">
          <div className={`rv-form-card ${isEditing ? "rv-form-editing" : ""}`}>
            <div className="rv-form-header">
              <div className="rv-form-header-left">
                <div className={`rv-form-icon ${isEditing ? "editing" : ""}`}>
                  {isEditing ? <FiEdit2 size={16} /> : <FiPlus size={16} />}
                </div>
                <h2>{isEditing ? "Edit Admin Rating" : "Add Custom Rating"}</h2>
              </div>
              <button className="rv-form-close" onClick={resetForm}><FiX size={18} /></button>
            </div>
            <form className="rv-form-body" onSubmit={handleSubmit}>
              <div className="rv-form-row">
                {/* Product Selector */}
                <div className="rv-field" ref={dropdownRef}>
                  <label className="rv-label"><FiBox size={12} /> Product <span className="rv-req">*</span></label>
                  <div className="rv-product-selector">
                    <button type="button" className="rv-ps-trigger" onClick={() => setProductDropdown(!productDropdown)}>
                      <div className="rv-ps-selected">
                        {selectedProduct?.images?.[0] ? (
                          <img src={getImageUrl(selectedProduct.images[0])} alt="" className="rv-ps-thumb" />
                        ) : formData.productId ? (
                          <div className="rv-ps-thumb rv-ps-thumb-empty"><FiBox size={14} /></div>
                        ) : null}
                        <span className={formData.productId ? "" : "rv-ps-placeholder"}>
                          {selectedProduct?.name || "Select a product…"}
                        </span>
                      </div>
                      <FiChevronDown size={16} className={`rv-ps-arrow ${productDropdown ? "open" : ""}`} />
                    </button>

                    {productDropdown && (
                      <div className="rv-ps-dropdown">
                        <div className="rv-ps-search">
                          <FiSearch size={13} />
                          <input type="text" placeholder="Search products…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} autoFocus />
                        </div>
                        <div className="rv-ps-list">
                          {filteredProducts.length === 0 ? (
                            <div className="rv-ps-empty">No products found</div>
                          ) : (
                            filteredProducts.map((p) => (
                              <button
                                type="button"
                                key={p._id}
                                className={`rv-ps-option ${formData.productId === p._id ? "selected" : ""}`}
                                onClick={() => { setFormData({ ...formData, productId: p._id }); setProductDropdown(false); setProductSearch(""); }}
                              >
                                {p.images?.[0] ? (
                                  <img src={getImageUrl(p.images[0])} alt="" className="rv-ps-opt-thumb" />
                                ) : (
                                  <div className="rv-ps-opt-thumb rv-ps-opt-empty"><FiBox size={14} /></div>
                                )}
                                <span>{p.name}</span>
                                {formData.productId === p._id && <FiCheck size={14} className="rv-ps-check" />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shop Name */}
                <div className="rv-field">
                  <label className="rv-label"><FiUser size={12} /> Dummy Shop Name <span className="rv-req">*</span></label>
                  <input type="text" required className="rv-input" value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} placeholder="e.g. Ramesh Toys" />
                </div>
              </div>

              <div className="rv-form-row">
                {/* Custom Date Picker for Admin */}
                <div className="rv-field">
                  <label className="rv-label"><FiCalendar size={12} /> Custom Date</label>
                  <input 
                    type="date" 
                    required 
                    className="rv-input" 
                    value={formData.createdAt} 
                    onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })} 
                    title="Aap purani date bhi daal sakte hain"
                  />
                </div>
                <div className="rv-field"></div> {/* Spacer */}
              </div>

              {/* ✅ CLICKABLE STARS FOR ADMIN */}
              <div className="rv-field">
                <label className="rv-label"><FiStar size={12} /> Select Rating <span className="rv-req">*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px', padding: '10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0" }}
                        onMouseEnter={() => setHoverRating(num)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setFormData({ ...formData, rating: num })}
                      >
                        <FiStar 
                          size={32} 
                          color={(hoverRating || formData.rating) >= num ? "#FFD700" : "#d1d5db"} 
                          fill={(hoverRating || formData.rating) >= num ? "#FFD700" : "none"}
                        />
                      </button>
                    ))}
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '15px' }}>
                    {formData.rating} Star - {STAR_LABELS[formData.rating]}
                  </div>
                </div>
              </div>

              <div className="rv-form-actions">
                <button type="button" className="rv-fbtn rv-fbtn-cancel" onClick={resetForm}>Cancel</button>
                <button type="submit" className={`rv-fbtn ${isEditing ? "rv-fbtn-edit" : "rv-fbtn-save"}`} disabled={saving}>
                  <FiSave size={14} /> {saving ? "Saving…" : isEditing ? "Update Rating" : "Save Admin Rating"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Toolbar */}
      <section className="rv-toolbar-section">
        <div className="rv-toolbar">
          <div className="rv-toolbar-main">
            <div className="rv-search">
              <FiSearch className="rv-search-icon" />
              <input ref={searchRef} placeholder="Search by shop or product…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="rv-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}><FiX size={14} /></button>}
            </div>
            <div className="rv-toolbar-btns">
              <button className={`rv-tbtn ${showFilters ? "active" : ""} ${hasActiveFilters ? "has-filters" : ""}`} onClick={() => setShowFilters(!showFilters)}>
                <FiSliders size={15} /><span>Filters</span>
                {hasActiveFilters && <span className="rv-filter-dot" />}
              </button>
              <div className="rv-view-toggle">
                <button className={`rv-vt ${view === "table" ? "active" : ""}`} onClick={() => setView("table")}><FiList size={16} /></button>
                <button className={`rv-vt ${view === "card" ? "active" : ""}`} onClick={() => setView("card")}><FiGrid size={16} /></button>
              </div>
            </div>
          </div>

          <div className={`rv-filters ${showFilters ? "open" : ""}`}>
            <div className="rv-filters-inner">
              <div className="rv-filter-group">
                <label><FiStar size={12} /> Rating</label>
                <div className="rv-rating-pills">
                  <button className={`rv-pill ${filterRating === "all" ? "active" : ""}`} onClick={() => setFilterRating("all")}>All</button>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <button key={r} className={`rv-pill ${filterRating === r ? "active" : ""}`} onClick={() => setFilterRating(r as RatingFilter)}>
                      {r}★
                    </button>
                  ))}
                </div>
              </div>
              {hasActiveFilters && <button className="rv-clear-filters" onClick={clearFilters}><FiX size={13} /> Clear</button>}
            </div>
          </div>

          <div className="rv-toolbar-info">
            <span className="rv-showing"><span className="rv-showing-bold">{filtered.length}</span> ratings{hasActiveFilters && <span className="rv-showing-sub"> (filtered from {stats.total})</span>}</span>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="rv-main">
        {loading ? (
          <div className="rv-state">
            <div className="rv-loader"><div className="rv-loader-ring" /><div className="rv-loader-ring" /><div className="rv-loader-ring" /></div>
            <h3>Loading Ratings</h3><p>Please wait…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rv-state rv-state-empty">
            <div className="rv-state-icon"><FiSearch size={28} /></div>
            <h3>No ratings found</h3>
            <p>{hasActiveFilters ? "Try adjusting your filters" : "Add your first rating"}</p>
            {hasActiveFilters && <button className="rv-retry-btn" onClick={clearFilters}><FiX size={14} /> Clear Filters</button>}
          </div>
        ) : view === "table" ? (
          /* TABLE */
          <div className="rv-table-wrap">
            <table className="rv-table">
              <thead>
                <tr>
                  <th className="rv-th-num">#</th>
                  <th>Shop</th>
                  <th className="rv-th-hide-sm">Product</th>
                  <th>Rating</th>
                  <th className="rv-th-hide-sm">Date</th>
                  <th className="rv-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((review, idx) => {
                  const shop = review.shopName || "Unknown";
                  return (
                    <tr key={review._id} className="rv-tr">
                      <td className="rv-td-num">{idx + 1}</td>
                      <td>
                        <div className="rv-td-shop">
                          <div className="rv-avatar" style={{ background: `hsl(${(shop.charCodeAt(0) * 37) % 360}, 65%, 55%)` }}>
                            {shop.charAt(0).toUpperCase()}
                          </div>
                          <span className="rv-shop-name">{shop}</span>
                        </div>
                      </td>
                      <td className="rv-th-hide-sm">
                        <div className="rv-td-product">
                          {review.productId?.images?.[0] ? (
                            <img src={getImageUrl(review.productId.images[0])} alt="" className="rv-prod-thumb" />
                          ) : (
                            <div className="rv-prod-thumb rv-prod-thumb-empty"><FiBox size={14} /></div>
                          )}
                          <span className="rv-prod-name">{review.productId?.name || <em className="rv-removed">Removed</em>}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`rv-rating-badge rv-rb-${getStarColor(review.rating)}`}>
                          <span>{review.rating}</span>
                          <FiStar size={11} className="rv-star-badge" />
                        </div>
                        {/* Status Text in Table */}
                        <div style={{ fontSize: '11px', marginTop: '4px', color: '#6b7280' }}>
                           {STAR_LABELS[review.rating]}
                        </div>
                      </td>
                      <td className="rv-th-hide-sm rv-td-date">{format(new Date(review.createdAt), "dd MMM yy")}</td>
                      <td>
                        <div className="rv-td-actions">
                          <button className="rv-act-btn rv-act-edit" onClick={() => handleEditClick(review)} title="Edit"><FiEdit2 size={14} /></button>
                          <button className="rv-act-btn rv-act-del" onClick={() => setDelId(review._id)} title="Delete"><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD VIEW */
          <div className="rv-cards">
            {filtered.map((review) => {
              const shop = review.shopName || "Unknown";
              return (
                <div className="rv-card" key={review._id}>
                  <div className="rv-card-top">
                    <div className="rv-card-top-left">
                      <div className="rv-avatar sm" style={{ background: `hsl(${(shop.charCodeAt(0) * 37) % 360}, 65%, 55%)` }}>
                        {shop.charAt(0).toUpperCase()}
                      </div>
                      <div className="rv-card-author">
                        <span className="rv-card-shop">{shop}</span>
                        <span className="rv-card-date">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className={`rv-rating-badge rv-rb-${getStarColor(review.rating)} sm`}>
                      <span>{review.rating}</span>
                      <FiStar size={10} className="rv-star-badge" />
                    </div>
                  </div>

                  <div className="rv-card-product" style={{ marginBottom: "15px" }}>
                    {review.productId?.images?.[0] ? (
                      <img src={getImageUrl(review.productId.images[0])} alt="" className="rv-card-prod-img" />
                    ) : (
                      <div className="rv-card-prod-img rv-card-prod-empty"><FiBox size={14} /></div>
                    )}
                    <span>{review.productId?.name || <em className="rv-removed">Removed</em>}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {renderStars(review.rating, 14)}
                    {/* Status Text in Card View */}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#4b5563' }}>
                       {STAR_LABELS[review.rating]}
                    </span>
                  </div>

                  <div className="rv-card-foot" style={{ marginTop: "15px" }}>
                    <span className="rv-card-foot-date"><FiCalendar size={11} /> {format(new Date(review.createdAt), "dd MMM yyyy")}</span>
                    <div className="rv-card-foot-btns">
                      <button className="rv-card-act rv-card-edit" onClick={() => handleEditClick(review)}><FiEdit2 size={14} /> Edit</button>
                      <button className="rv-card-act rv-card-delete" onClick={() => setDelId(review._id)}><FiTrash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="rv-footer"><p>© {new Date().getFullYear()} BafnaToys Rating Management</p></footer>
    </div>
  );
};

export default AdminReviews;