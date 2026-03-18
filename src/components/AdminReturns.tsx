import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  FiX, FiCheck, FiAlertCircle, FiPackage, FiBox, FiUser,
  FiSearch, FiFilter, FiRefreshCw, FiEye, FiSliders,
  FiChevronDown, FiChevronUp, FiClock, FiPhone, FiMapPin,
  FiHash, FiAlertTriangle, FiCheckCircle, FiXCircle,
  FiGrid, FiList, FiVideo, FiImage, FiMessageSquare,
  FiExternalLink, FiCopy, FiFileText, FiShield,
  FiArrowRight, FiCamera, FiInfo
} from "react-icons/fi";
import "../styles/AdminReturns.css";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (process as any).env?.VITE_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_URL =
  (import.meta as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

type OrderItem = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
};

type ReturnRequest = {
  isRequested: boolean;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  description: string;
  proofImages: string[];
  proofVideo: string;
  adminComment?: string;
  requestDate?: string;
};

type Customer = {
  _id?: string;
  firmName?: string;
  shopName?: string;
  otpMobile?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
};

type Order = {
  _id: string;
  orderNumber?: string;
  createdAt: string;
  total: number;
  items: OrderItem[];
  returnRequest?: ReturnRequest;
  shippingAddress?: any;
  customerId?: Customer;
};

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

const resolveImage = (img?: string) => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  return `${MEDIA_URL}${img}`;
};

const AdminReturns: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [view, setView] = useState<"table" | "card">("table");
  const [showFilters, setShowFilters] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto card on mobile
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

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = selectedOrder || previewImg ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [selectedOrder, previewImg]);

  // Fetch
  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const { data } = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const returnOrders: Order[] = (data || []).filter(
        (o: Order) => o.returnRequest?.isRequested === true
      );
      returnOrders.sort((a, b) =>
        a.returnRequest?.status === "Pending" && b.returnRequest?.status !== "Pending" ? -1 : 1
      );
      setOrders(returnOrders);
    } catch {
      toast.error("Failed to load return requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  // Stats
  const counts = useMemo(() => {
    const c = { all: orders.length, pending: 0, approved: 0, rejected: 0 };
    for (const o of orders) {
      const st = o.returnRequest?.status;
      if (st === "Pending") c.pending++;
      if (st === "Approved") c.approved++;
      if (st === "Rejected") c.rejected++;
    }
    return c;
  }, [orders]);

  // Filtered
  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return orders.filter((order) => {
      const st = order.returnRequest?.status;
      if (statusFilter !== "All" && st !== statusFilter) return false;
      if (!q) return true;
      const orderId = (order.orderNumber || order._id).toLowerCase();
      const name = (order.customerId?.shopName || order.shippingAddress?.fullName || "").toLowerCase();
      const mobile = (order.customerId?.otpMobile || order.shippingAddress?.phone || "").toLowerCase();
      const reason = (order.returnRequest?.reason || "").toLowerCase();
      return orderId.includes(q) || name.includes(q) || mobile.includes(q) || reason.includes(q);
    });
  }, [orders, debounced, statusFilter]);

  const hasActiveFilters = search || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setStatusFilter("All"); };

  // Actions
  const handleAction = async (status: "Approved" | "Rejected") => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("adminToken");
      await axios.put(
        `${API_URL}/orders/admin/return-action/${selectedOrder._id}`,
        { status, comment: adminComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders((prev) =>
        prev.map((o) =>
          o._id === selectedOrder._id
            ? { ...o, returnRequest: o.returnRequest ? { ...o.returnRequest, status, adminComment } : o.returnRequest }
            : o
        )
      );
      toast.success(`Return ${status}!`, {
        icon: status === "Approved" ? "✅" : "❌",
        style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
      });
      setSelectedOrder(null);
      setAdminComment("");
    } catch {
      toast.error("Action failed!");
    } finally {
      setProcessing(false);
    }
  };

  const getReturnedProducts = (order: Order) => {
    if (!order.returnRequest?.description) return [];
    const match = order.returnRequest.description.match(/\[RETURN ITEMS: (.*?)\]/);
    if (match?.[1]) {
      const itemNames = match[1].split(",").map((s) => s.trim());
      return order.items.filter((item) => itemNames.includes(item.name));
    }
    return [];
  };

  const getStatusInfo = (status?: string) => {
    if (status === "Pending") return { cls: "pending", icon: <FiClock size={12} />, label: "Pending" };
    if (status === "Approved") return { cls: "approved", icon: <FiCheckCircle size={12} />, label: "Approved" };
    if (status === "Rejected") return { cls: "rejected", icon: <FiXCircle size={12} />, label: "Rejected" };
    return { cls: "", icon: null, label: "Unknown" };
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`, { duration: 1500, icon: "📋", style: { borderRadius: "12px", background: "#1e293b", color: "#fff", fontSize: "14px" } });
  };

  return (
    <div className="rt-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {/* Image Preview */}
      {previewImg && (
        <div className="rt-overlay" onClick={() => setPreviewImg(null)}>
          <div className="rt-img-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rt-img-bar">
              <span><FiEye size={16} /> Proof Image</span>
              <div className="rt-img-bar-btns">
                <a href={previewImg} target="_blank" rel="noreferrer" className="rt-img-open"><FiExternalLink size={14} /></a>
                <button className="rt-img-close" onClick={() => setPreviewImg(null)}><FiX size={18} /></button>
              </div>
            </div>
            <div className="rt-img-body"><img src={previewImg} alt="Proof" /></div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && selectedOrder.returnRequest && (
        <div className="rt-overlay" onClick={() => { setSelectedOrder(null); setAdminComment(""); }}>
          <div className="rt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rt-modal-header">
              <div className="rt-modal-header-left">
                <div className="rt-modal-icon"><FiPackage size={18} /></div>
                <div>
                  <h3>Return Request</h3>
                  <p>#{selectedOrder.orderNumber || selectedOrder._id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
              <div className="rt-modal-header-right">
                <span className={`rt-badge rt-badge-${getStatusInfo(selectedOrder.returnRequest.status).cls}`}>
                  {getStatusInfo(selectedOrder.returnRequest.status).icon}
                  {selectedOrder.returnRequest.status}
                </span>
                <button className="rt-modal-close" onClick={() => { setSelectedOrder(null); setAdminComment(""); }}><FiX size={18} /></button>
              </div>
            </div>

            <div className="rt-modal-body">
              {/* Customer */}
              <div className="rt-section">
                <div className="rt-section-title"><FiUser size={14} /> Customer Details</div>
                <div className="rt-detail-grid">
                  <div className="rt-detail">
                    <span>Shop Name</span>
                    <strong>{selectedOrder.customerId?.shopName || selectedOrder.shippingAddress?.fullName || "N/A"}</strong>
                  </div>
                  <div className="rt-detail">
                    <span>Mobile</span>
                    <strong>{selectedOrder.customerId?.otpMobile || selectedOrder.shippingAddress?.phone || "N/A"}</strong>
                  </div>
                  <div className="rt-detail">
                    <span>City</span>
                    <strong>{selectedOrder.shippingAddress?.city || selectedOrder.customerId?.city || "N/A"}</strong>
                  </div>
                  <div className="rt-detail">
                    <span>State</span>
                    <strong>{selectedOrder.shippingAddress?.state || selectedOrder.customerId?.state || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {/* Return Info */}
              <div className="rt-section">
                <div className="rt-section-title"><FiAlertTriangle size={14} /> Return Information</div>
                <div className="rt-detail-grid">
                  <div className="rt-detail">
                    <span>Order ID</span>
                    <strong className="rt-detail-mono">{selectedOrder.orderNumber || selectedOrder._id}</strong>
                  </div>
                  <div className="rt-detail">
                    <span>Request Date</span>
                    <strong>{selectedOrder.returnRequest.requestDate ? format(new Date(selectedOrder.returnRequest.requestDate), "dd MMM yyyy") : "N/A"}</strong>
                  </div>
                </div>
                <div className="rt-reason-box">
                  <div className="rt-reason-label">Reason</div>
                  <div className="rt-reason-text">{selectedOrder.returnRequest.reason}</div>
                </div>
                {selectedOrder.returnRequest.description && (
                  <div className="rt-desc-box">
                    <div className="rt-desc-label">Description</div>
                    <div className="rt-desc-text">{selectedOrder.returnRequest.description}</div>
                  </div>
                )}
              </div>

              {/* Returned Products */}
              {getReturnedProducts(selectedOrder).length > 0 && (
                <div className="rt-section">
                  <div className="rt-section-title"><FiBox size={14} /> Returned Products</div>
                  <div className="rt-product-grid">
                    {getReturnedProducts(selectedOrder).map((item, idx) => (
                      <div key={idx} className="rt-product-card">
                        <div className="rt-product-img">
                          {item.image ? (
                            <img src={resolveImage(item.image)} alt={item.name} onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <FiBox size={18} />
                          )}
                        </div>
                        <div className="rt-product-info">
                          <span className="rt-product-name">{item.name}</span>
                          <span className="rt-product-meta">Qty: {item.qty} · ₹{item.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proof */}
              <div className="rt-section">
                <div className="rt-section-title"><FiCamera size={14} /> Proof Media</div>
                {selectedOrder.returnRequest.proofImages.length > 0 ? (
                  <div className="rt-proof-grid">
                    {selectedOrder.returnRequest.proofImages.map((img, idx) => (
                      <div key={idx} className="rt-proof-card" onClick={() => setPreviewImg(resolveImage(img))}>
                        <img src={resolveImage(img)} alt="proof" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <div className="rt-proof-overlay"><FiEye size={14} /></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rt-no-proof"><FiImage size={18} /> No proof images uploaded</div>
                )}
                {selectedOrder.returnRequest.proofVideo && (
                  <a href={resolveImage(selectedOrder.returnRequest.proofVideo)} target="_blank" rel="noreferrer" className="rt-video-link">
                    <FiVideo size={14} /> Watch Proof Video
                  </a>
                )}
              </div>

              {/* Actions */}
              {selectedOrder.returnRequest.status === "Pending" ? (
                <div className="rt-action-area">
                  <div className="rt-action-title"><FiMessageSquare size={14} /> Admin Response</div>
                  <textarea
                    className="rt-comment-input"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Enter approval note or rejection reason…"
                    rows={3}
                  />
                  <div className="rt-action-btns">
                    <button className="rt-action-btn rt-btn-approve" onClick={() => handleAction("Approved")} disabled={processing}>
                      <FiCheck size={15} /> {processing ? "Processing…" : "Approve Return"}
                    </button>
                    <button className="rt-action-btn rt-btn-reject" onClick={() => handleAction("Rejected")} disabled={processing}>
                      <FiX size={15} /> {processing ? "Processing…" : "Reject Return"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rt-resolved-box">
                  <div className={`rt-resolved-status ${selectedOrder.returnRequest.status.toLowerCase()}`}>
                    {selectedOrder.returnRequest.status === "Approved" ? <FiCheckCircle size={16} /> : <FiXCircle size={16} />}
                    <span>Request has been <strong>{selectedOrder.returnRequest.status}</strong></span>
                  </div>
                  {selectedOrder.returnRequest.adminComment && (
                    <div className="rt-resolved-note">
                      <span className="rt-resolved-note-label">Admin Note:</span>
                      <p>{selectedOrder.returnRequest.adminComment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top */}
      <section className="rt-top">
        <div className="rt-top-row">
          <div className="rt-top-left">
            <h1 className="rt-title">Return Requests</h1>
            <span className="rt-count">{counts.all} total</span>
          </div>
          <div className="rt-top-right">
            <button className="rt-top-btn" onClick={fetchReturns} disabled={loading} title="Refresh">
              <FiRefreshCw size={16} className={loading ? "rt-spinning" : ""} />
            </button>
          </div>
        </div>

        <div className="rt-stats">
          {[
            { icon: <FiPackage size={18} />, val: counts.all, lbl: "All Requests", color: "indigo" },
            { icon: <FiClock size={18} />, val: counts.pending, lbl: "Pending", color: "amber" },
            { icon: <FiCheckCircle size={18} />, val: counts.approved, lbl: "Approved", color: "emerald" },
            { icon: <FiXCircle size={18} />, val: counts.rejected, lbl: "Rejected", color: "red" },
          ].map((s) => (
            <div className={`rt-stat rt-stat-${s.color}`} key={s.lbl} onClick={() => setStatusFilter(s.lbl === "All Requests" ? "All" : s.lbl as StatusFilter)} style={{ cursor: "pointer" }}>
              <div className="rt-stat-top">
                <div className="rt-stat-icon">{s.icon}</div>
                <div className="rt-stat-num">{s.val}</div>
              </div>
              <div className="rt-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Toolbar */}
      <section className="rt-toolbar-section">
        <div className="rt-toolbar">
          <div className="rt-toolbar-main">
            <div className="rt-search">
              <FiSearch className="rt-search-icon" />
              <input ref={searchRef} placeholder="Search by order ID, customer, mobile, reason…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="rt-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}><FiX size={14} /></button>}
            </div>
            <div className="rt-toolbar-btns">
              <button className={`rt-tbtn ${showFilters ? "active" : ""} ${hasActiveFilters ? "has-filters" : ""}`} onClick={() => setShowFilters(!showFilters)}>
                <FiSliders size={15} /><span>Filters</span>
                {hasActiveFilters && <span className="rt-filter-dot" />}
              </button>
              <div className="rt-view-toggle">
                <button className={`rt-vt ${view === "table" ? "active" : ""}`} onClick={() => setView("table")}><FiList size={16} /></button>
                <button className={`rt-vt ${view === "card" ? "active" : ""}`} onClick={() => setView("card")}><FiGrid size={16} /></button>
              </div>
            </div>
          </div>

          <div className={`rt-filters ${showFilters ? "open" : ""}`}>
            <div className="rt-filters-inner">
              <div className="rt-filter-group">
                <label><FiFilter size={12} /> Status</label>
                <div className="rt-status-pills">
                  {(["All", "Pending", "Approved", "Rejected"] as StatusFilter[]).map((s) => (
                    <button key={s} className={`rt-pill ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
                  ))}
                </div>
              </div>
              {hasActiveFilters && <button className="rt-clear-filters" onClick={clearFilters}><FiX size={13} /> Clear</button>}
            </div>
          </div>

          <div className="rt-toolbar-info">
            <span className="rt-showing"><span className="rt-showing-bold">{filtered.length}</span> requests{hasActiveFilters && <span className="rt-showing-sub"> (filtered from {counts.all})</span>}</span>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="rt-main">
        {loading ? (
          <div className="rt-state">
            <div className="rt-loader"><div className="rt-loader-ring" /><div className="rt-loader-ring" /><div className="rt-loader-ring" /></div>
            <h3>Loading Returns</h3><p>Please wait…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rt-state rt-state-empty">
            <div className="rt-state-icon"><FiSearch size={28} /></div>
            <h3>No return requests found</h3>
            <p>{hasActiveFilters ? "Try adjusting your filters" : "No return requests yet"}</p>
            {hasActiveFilters && <button className="rt-retry-btn" onClick={clearFilters}><FiX size={14} /> Clear Filters</button>}
          </div>
        ) : view === "table" ? (
          /* TABLE */
          <div className="rt-table-wrap">
            <table className="rt-table">
              <thead>
                <tr>
                  <th className="rt-th-num">#</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="rt-th-hide-sm">Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="rt-th-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, idx) => {
                  const st = getStatusInfo(order.returnRequest?.status);
                  return (
                    <tr key={order._id} className={`rt-tr ${order.returnRequest?.status === "Pending" ? "rt-tr-pending" : ""}`}>
                      <td className="rt-td-num">{idx + 1}</td>
                      <td>
                        <span className="rt-order-id" onClick={() => copy(order.orderNumber || order._id, "Order ID")}>
                          <FiHash size={11} />
                          {order.orderNumber || order._id.slice(-6).toUpperCase()}
                          <FiCopy size={9} className="rt-copy-hint" />
                        </span>
                      </td>
                      <td>
                        <div className="rt-td-customer">
                          <span className="rt-customer-name">{order.customerId?.shopName || order.shippingAddress?.fullName || "Guest"}</span>
                          <span className="rt-customer-phone">{order.customerId?.otpMobile || order.shippingAddress?.phone || ""}</span>
                        </div>
                      </td>
                      <td className="rt-th-hide-sm rt-td-date">
                        {order.returnRequest?.requestDate ? format(new Date(order.returnRequest.requestDate), "dd MMM yy") : "—"}
                      </td>
                      <td>
                        <span className="rt-reason">{order.returnRequest?.reason || "—"}</span>
                      </td>
                      <td>
                        <span className={`rt-badge rt-badge-${st.cls}`}>{st.icon}{st.label}</span>
                      </td>
                      <td>
                        <button className="rt-view-btn" onClick={() => setSelectedOrder(order)}>
                          <FiEye size={14} /> <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD VIEW */
          <div className="rt-cards">
            {filtered.map((order) => {
              const st = getStatusInfo(order.returnRequest?.status);
              return (
                <div className={`rt-card ${order.returnRequest?.status === "Pending" ? "rt-card-pending" : ""}`} key={order._id}>
                  <div className="rt-card-top">
                    <div className="rt-card-top-left">
                      <span className="rt-card-order" onClick={() => copy(order.orderNumber || order._id, "Order ID")}>
                        <FiHash size={11} />
                        {order.orderNumber || order._id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`rt-badge rt-badge-${st.cls} sm`}>{st.icon}{st.label}</span>
                    </div>
                    <span className="rt-card-date">
                      <FiClock size={11} />
                      {order.returnRequest?.requestDate ? formatDistanceToNow(new Date(order.returnRequest.requestDate), { addSuffix: true }) : "—"}
                    </span>
                  </div>
                  <div className="rt-card-body">
                    <div className="rt-card-customer">
                      <FiUser size={13} />
                      <div>
                        <span className="rt-card-cname">{order.customerId?.shopName || order.shippingAddress?.fullName || "Guest"}</span>
                        <span className="rt-card-cphone">{order.customerId?.otpMobile || order.shippingAddress?.phone || ""}</span>
                      </div>
                    </div>
                    <div className="rt-card-reason">
                      <FiAlertTriangle size={12} />
                      <span>{order.returnRequest?.reason || "—"}</span>
                    </div>
                  </div>
                  <div className="rt-card-foot">
                    <span className="rt-card-total">₹{order.total?.toLocaleString()}</span>
                    <button className="rt-card-view" onClick={() => setSelectedOrder(order)}>
                      <FiEye size={14} /> Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="rt-footer"><p>© {new Date().getFullYear()} BafnaToys Return Management</p></footer>
    </div>
  );
};

export default AdminReturns;