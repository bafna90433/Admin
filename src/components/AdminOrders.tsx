// src/components/AdminOrders.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api, { MEDIA_URL } from "../utils/api";
import "../styles/AdminOrdersModern.css";
type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
};
type CustomerLite = {
  firmName?: string;
  shopName?: string;
  otpMobile?: string;
  city?: string;
  state?: string;
  zip?: string;
  visitingCardUrl?: string;
};
type ShippingInfo = {
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
};
type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
type Order = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  customerId?: CustomerLite;
  items: OrderItem[];
  total: number;
  paymentMethod?: string;
  status: OrderStatus;
  shipping?: ShippingInfo;
};
const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads") || img.startsWith("/images"))
    return `${MEDIA_URL}${img}`;
  if (img.startsWith("uploads/") || img.startsWith("images/"))
    return `${MEDIA_URL}/${img}`;
  return `${MEDIA_URL}/uploads/${encodeURIComponent(img)}`;
};
const statusMeta: Record<
  OrderStatus,
  { color: string; icon: string; text: string }
> = {
  pending: { color: "#FFD600", icon: "⏳", text: "Pending" },
  processing: { color: "#2196F3", icon: "🔄", text: "Processing" },
  shipped: { color: "#64B5F6", icon: "🚚", text: "Shipped" },
  delivered: { color: "#43A047", icon: "✅", text: "Delivered" },
  cancelled: { color: "#E53935", icon: "❌", text: "Cancelled" },
};
const norm = (v?: string | number) => (v ?? "").toString().toLowerCase().trim();
const highlight = (text: string, q: string) => {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="ord-mark">{match}</mark>
      {after}
    </>
  );
};
const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [actOn, setActOn] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Order[]>("/orders");
      setOrders(data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      setActOn(id);
      const { data } = await api.patch<Order>(`/orders/${id}/status`, {
        status,
      });
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: data.status } : o))
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || "Update failed");
    } finally {
      setActOn(null);
    }
  };
  const deleteOrder = async (id: string) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await api.delete(`/orders/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  };
  const formatDate = (iso?: string): string =>
    iso ? new Date(iso).toLocaleString() : "-";
  const filteredOrders = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const inOrderNum = norm(o.orderNumber).includes(q);
      const inIdSuffix = o._id.toLowerCase().endsWith(q);
      const cust = o.customerId;
      const inCustomer =
        norm(cust?.firmName).includes(q) ||
        norm(cust?.shopName).includes(q) ||
        norm(cust?.otpMobile).includes(q);
      const inLocation =
        norm(cust?.city).includes(q) ||
        norm(cust?.state).includes(q) ||
        norm(cust?.zip).includes(q);
      const inPayment = norm(o.paymentMethod).includes(q);
      const inStatus = norm(o.status).includes(q);
      const inItems = o.items?.some((it) => norm(it.name).includes(q));
      return (
        inOrderNum ||
        inIdSuffix ||
        inCustomer ||
        inLocation ||
        inPayment ||
        inStatus ||
        inItems
      );
    });
  }, [orders, debounced]);
  const onBigSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredOrders.length > 0) {
      setViewing(filteredOrders[0]);
    }
  };
  return (
    <div className="ord-app">
      <h2 className="ord-header">Order Management</h2>
      <div className="ord-toolbar">
        <div className="ord-srch">
          <span className="ord-srch-icon">🔎</span>
          <input
            className="ord-srch-input"
            type="text"
            placeholder="Search orders by number, customer, phone, city, payment, status, or item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onBigSearchKeyDown}
          />
          {!!search && (
            <button
              className="ord-srch-clear"
              onClick={() => setSearch("")}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="ord-meta">
        Showing <b>{filteredOrders.length}</b> of <b>{orders.length}</b> orders
        {debounced && filteredOrders.length > 0 && (
          <span className="ord-meta-chip">filtered by “{debounced}”</span>
        )}
      </div>
      {loading && <div className="ord-info">Loading…</div>}
      {error && <div className="ord-error">{error}</div>}
      {!loading && !error && (
        <div className="ord-list">
          {filteredOrders.length === 0 ? (
            <div className="ord-empty">No orders match your search.</div>
          ) : (
            filteredOrders.map((o) => {
              const qSmall = debounced.trim();
              const firm = o.customerId?.firmName || "-";
              const shop = o.customerId?.shopName || "";
              const phone = o.customerId?.otpMobile || "";
              const cityStZip = [
                o.customerId?.city,
                o.customerId?.state,
                o.customerId?.zip,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <div className="ord-card" key={o._id}>
                  <div className="ord-main">
                    <div className="ord-row">
                      <span className="ord-label">Order #</span>
                      <span className="ord-num">
                        {qSmall
                          ? highlight(
                              o.orderNumber || o._id.slice(-6),
                              qSmall
                            )
                          : o.orderNumber || o._id.slice(-6)}
                      </span>
                    </div>
                    <div className="ord-row">{formatDate(o.createdAt)}</div>
                    <div className="ord-row ord-cust">
                      <span className="ord-label">Customer:</span>
                      <div>
                        <b>
                          {qSmall ? highlight(firm, qSmall) : firm}
                        </b>{" "}
                        <span className="ord-cmeta">
                          {qSmall ? highlight(shop, qSmall) : shop}
                        </span>{" "}
                        <span className="ord-cmeta">
                          {qSmall ? highlight(phone, qSmall) : phone}
                        </span>{" "}
                        <span className="ord-cmeta">
                          {qSmall
                            ? highlight(cityStZip, qSmall)
                            : cityStZip}
                        </span>
                      </div>
                    </div>
                    <div className="ord-row ord-itemsum">
                      <span>
                        {o.items.length} item{o.items.length > 1 ? "s" : ""}
                      </span>
                      <span className="ord-total">
                        ₹ {o.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="ord-statusbar">
                    <span
                      className="ord-status"
                      style={{
                        background: statusMeta[o.status].color + "22",
                        color: statusMeta[o.status].color,
                      }}
                    >
                      {statusMeta[o.status].icon} {statusMeta[o.status].text}
                    </span>
                    <span className="ord-paymeth">
                      {qSmall
                        ? highlight(o.paymentMethod || "-", qSmall)
                        : o.paymentMethod || "-"}
                    </span>
                  </div>
                  <div className="ord-actions">
                    <button
                      className="ord-btn ord-btn-view"
                      onClick={() => setViewing(o)}
                    >
                      View
                    </button>
                    <select
                      className="ord-select"
                      disabled={actOn === o._id}
                      value={o.status}
                      onChange={(e) =>
                        updateStatus(o._id, e.target.value as OrderStatus)
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      className="ord-btn ord-btn-del"
                      onClick={() => deleteOrder(o._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {viewing && (
        <div
          className="ord-modal-backdrop"
          onClick={() => setViewing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ord-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="ord-close"
              onClick={() => setViewing(null)}
              aria-label="Close order details"
            >
              &times;
            </button>
            <h3>
              Order #{viewing.orderNumber || viewing._id.slice(-6)}
            </h3>
            <div className="ord-m-section">
              <div>
                <b>Status:</b> {viewing.status.toUpperCase()}
              </div>
              <div>
                <b>Total:</b> ₹ {viewing.total.toFixed(2)}
              </div>
              <div>
                <b>Payment:</b> {viewing.paymentMethod || "-"}
              </div>
              <div>
                <b>Created:</b> {formatDate(viewing.createdAt)}
              </div>
            </div>
            <div className="ord-m-section">
              <b>Customer:</b>
              <br />
              {viewing.customerId?.firmName}{" "}
              {viewing.customerId?.shopName
                ? `(${viewing.customerId.shopName})`
                : ""}
              <br />
              {viewing.customerId?.otpMobile && (
                <>
                  📞 {viewing.customerId.otpMobile}
                  <br />
                </>
              )}
              {[viewing.customerId?.city,
              viewing.customerId?.state,
              viewing.customerId?.zip]
                .filter(Boolean)
                .join(", ")}
              <br />
              {viewing.customerId?.visitingCardUrl && (
                <a
                  href={resolveImage(viewing.customerId.visitingCardUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="ord-link"
                >
                  Visiting Card
                </a>
              )}
            </div>
            <div className="ord-m-section">
              <b>Shipping:</b>
              <br />
              {viewing.shipping?.address && (
                <>
                  📍 {viewing.shipping.address}
                  <br />
                </>
              )}
              {viewing.shipping?.phone && (
                <>
                  📞 {viewing.shipping.phone}
                  <br />
                </>
              )}
              {viewing.shipping?.email && (
                <>
                  ✉️ {viewing.shipping.email}
                  <br />
                </>
              )}
              {viewing.shipping?.notes && (
                <>📝 {viewing.shipping.notes}</>
              )}
              {!viewing.shipping?.address &&
                !viewing.shipping?.phone &&
                !viewing.shipping?.email &&
                !viewing.shipping?.notes && (
                  <span style={{ color: "#888" }}>No shipping info</span>
                )}
            </div>
            <div className="ord-m-section">
              <b>Items:</b>
              {viewing.items.map((it: OrderItem, i: number) => {
                const img = resolveImage(it.image);
                return (
                  <div className="ord-m-item" key={i}>
                    {img ? (
                      <img
                        src={img}
                        alt={it.name}
                        className="ord-m-img"
                      />
                    ) : (
                      <div className="ord-m-img ord-m-imgph" />
                    )}
                    <span className="ord-m-iname">{it.name}</span>
                    {/* ✅ Add the inner counting here */}
                    <span className="ord-m-qty">{i + 1}. x{it.qty}</span>
                    <span className="ord-m-price">
                      ₹ {(it.price * it.qty).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminOrders;
