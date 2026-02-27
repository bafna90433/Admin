// src/components/AdminOrders.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import "../styles/AdminOrdersModern.css";

// Excel export
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ================= CONFIG (Same style as CustomerSales) ================= */
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

/* --- Types --- */
type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
  innerQty?: number;
  inners?: number;
  nosPerInner?: number;
};

type CustomerLite = {
  shopName?: string;
  otpMobile?: string;
  whatsapp?: string;
  visitingCardUrl?: string;
};

type ShippingAddress = {
  _id?: string;
  fullName: string;
  phone: string;
  street: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  type: string;
  isDefault?: boolean;
};

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
type PaymentMode = "COD" | "ONLINE";

type Order = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  customerId?: CustomerLite;
  items: OrderItem[];
  total: number;

  paymentMode?: PaymentMode;
  status: OrderStatus;
  shippingAddress?: ShippingAddress;

  isShipped?: boolean;
  trackingId?: string;
  courierName?: string;
  trackingToken?: string;

  cancelledBy?: string;
  
  // ✅ Added WA Type
  wa?: {
    orderConfirmedSent?: boolean;
    trackingSent?: boolean;
    lastError?: string;
    lastSentAt?: string;
  };
};

/* --- Axios helpers --- */
const authHeaders = () => {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* --- Helpers --- */
const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads") || img.startsWith("/images")) return `${MEDIA_BASE}${img}`;
  return `${MEDIA_BASE}/uploads/${encodeURIComponent(img)}`;
};

const toInners = (it: OrderItem): number => {
  if (it.inners && it.inners > 0) return it.inners;
  const perInner =
    it.innerQty && it.innerQty > 0
      ? it.innerQty
      : it.nosPerInner && it.nosPerInner > 0
      ? it.nosPerInner
      : 12;
  return Math.ceil((it.qty || 0) / perInner);
};

const norm = (v?: string | number) => (v ?? "").toString().toLowerCase().trim();

const formatExcelDate = (iso?: string): string =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const paymentLabel = (mode?: PaymentMode) => (mode === "ONLINE" ? "Paid (Online)" : "Cash on Delivery");

/* ✅ WhatsApp normalize: show as 91XXXXXXXXXX */
const normalizeWhatsApp91 = (raw?: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const without91 = digits.startsWith("91") ? digits.slice(2) : digits;
  const last10 = without91.length > 10 ? without91.slice(-10) : without91;
  if (last10.length !== 10) return "";
  return `91${last10}`;
};

/* ✅ Smart Tracking link for admin view only */
const getExternalTrackingLink = (courier?: string) => {
  const cName = norm(courier);
  if (cName.includes("delhivery")) return "https://www.delhivery.com/tracking";
  if (cName.includes("vxpress") || cName.includes("v-xpress") || cName.includes("v xpress"))
    return "https://vxpress.in/track-result/";
  return null;
};

/* ✅ Status label: processing ko CONFIRM dikhana hai */
const statusLabel = (s: OrderStatus) => {
  if (s === "processing") return "Confirmed";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* --- Export Functions --- */
const exportAllOrders = (orders: Order[]) => {
  const rows = orders.map((o) => {
    const wa = normalizeWhatsApp91(o.customerId?.whatsapp || o.customerId?.otpMobile);
    return {
      OrderNumber: o.orderNumber || o._id.slice(-6),
      Status: statusLabel(o.status as OrderStatus) + (o.status === "cancelled" && o.cancelledBy ? ` (${o.cancelledBy})` : ""),
      Total: o.total,
      Payment_Mode: paymentLabel(o.paymentMode),
      CreatedAt: formatExcelDate(o.createdAt),
      Shop: o.customerId?.shopName || "",
      Phone: o.customerId?.otpMobile || "",
      WhatsApp: wa || "",
      ShippingName: o.shippingAddress?.fullName || "",
      ShippingPhone: o.shippingAddress?.phone || "",
      ShippingAddress: `${o.shippingAddress?.street || ""}, ${o.shippingAddress?.area || ""}`,
      ShippingCity: o.shippingAddress?.city || "",
      ShippingState: o.shippingAddress?.state || "",
      ShippingPincode: o.shippingAddress?.pincode || "",
      TotalPackets: o.items.reduce((sum, it) => sum + toInners(it), 0),
      TrackingID: o.trackingId || "-",
      Courier: o.courierName || "-",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), "all_orders.xlsx");
};

const exportSingleOrder = (order: Order) => {
  const createdAt = formatExcelDate(order.createdAt);
  const wa = normalizeWhatsApp91(order.customerId?.whatsapp || order.customerId?.otpMobile);

  const rows = order.items.map((it) => ({
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Status: statusLabel(order.status),
    Payment_Mode: paymentLabel(order.paymentMode),
    Shop: order.customerId?.shopName || "",
    Phone: order.customerId?.otpMobile || "",
    WhatsApp: wa || "",
    ShippingName: order.shippingAddress?.fullName || "",
    ShippingAddress: `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.area || ""}`,
    Item: it.name,
    Qty: it.qty,
    Price: it.price,
    Total: it.price * it.qty,
    Packets: toInners(it),
    CreatedAt: createdAt,
    TrackingID: order.trackingId || "-",
    Courier: order.courierName || "-",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `order_${order.orderNumber || order._id.slice(-6)}.xlsx`);
};

/* --- Invoice Generator --- */
const generateInvoice = (order: Order) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const currentDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const shippingAddr = order.shippingAddress;
  const wa = normalizeWhatsApp91(order.customerId?.whatsapp || order.customerId?.otpMobile);

  let shippingHtml = "No shipping address provided";
  if (shippingAddr) {
    shippingHtml = [
      shippingAddr.fullName ? `<strong>${shippingAddr.fullName}</strong>` : "",
      shippingAddr.street,
      shippingAddr.area,
      `${shippingAddr.city}, ${shippingAddr.state}`,
      shippingAddr.pincode ? `PIN: ${shippingAddr.pincode}` : "",
      shippingAddr.phone ? `Phone: ${shippingAddr.phone}` : "",
    ]
      .filter(Boolean)
      .join("<br>");
  }

  const paymentText = paymentLabel(order.paymentMode);

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.orderNumber || order._id.slice(-6)}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #fff; color: #333; }
        .invoice-container { max-width: 850px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
        .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #2c5aa0; padding-bottom: 15px; }
        .header img { max-height: 70px; }
        .invoice-details { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 25px; }
        .detail-section { width: 32%; }
        .detail-section h3 { font-size: 15px; color: #2c5aa0; border-bottom: 1px solid #ddd; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
        th { background: #2c5aa0; color: #fff; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; }
        @media print { .btn-hide { display: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <img src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png" alt="BafnaToys" />
          <p>1-12, Sundapalayam Rd, Coimbatore, Tamil Nadu 641007 <br> +91 9043347300 | bafnatoysphotos@gmail.com</p>
          <h2>PRO FORMA INVOICE</h2>
        </div>

        <div class="invoice-details">
          <div class="detail-section">
            <h3>Bill To</h3>
            <p>
              <strong>${order.customerId?.shopName || "-"}</strong><br>
              Mobile: ${order.customerId?.otpMobile || "-"}<br>
              WhatsApp: ${wa || "-"}
            </p>
          </div>
          <div class="detail-section">
            <h3>Ship To</h3>
            <p>${shippingHtml}</p>
          </div>
          <div class="detail-section">
             <h3>Order Details</h3>
             <p>
              Invoice: ${order.orderNumber}<br>
              Date: ${currentDate}<br>
              Payment: ${paymentText}<br>
              ${order.trackingId ? `AWB: ${order.trackingId}` : ""}
             </p>
          </div>
        </div>

        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>
            ${order.items
              .map((it) => `<tr><td>${it.name}</td><td>${it.qty}</td><td>₹${it.price}</td><td>₹${it.qty * it.price}</td></tr>`)
              .join("")}
          </tbody>
          <tfoot>
            <tr><td colspan="3" align="right"><strong>Total</strong></td><td><strong>₹${order.total}</strong></td></tr>
          </tfoot>
        </table>

        <div class="footer"><p>Thank you for choosing BafnaToys!</p></div>
      </div>

      <div style="text-align:center; margin-top:20px;" class="btn-hide">
        <button onclick="window.print()" style="padding:10px 20px; background:#2c5aa0; color:white; border:none; cursor:pointer;">Print Invoice</button>
      </div>
    </body>
    </html>`;

  printWindow.document.write(content);
  printWindow.document.close();
};

/* ===================== Courier Options ===================== */
/* ✅ ONLY 2 couriers */
const COURIERS = ["Delhivery", "V-Xpress"] as const;

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [actOn, setActOn] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [debounced, setDebounced] = useState("");

  // ✅ Ship modal state
  const [shipOpen, setShipOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState<Order | null>(null);
  const [shipCourier, setShipCourier] = useState<string>(COURIERS[0]);
  const [shipTracking, setShipTracking] = useState<string>("");
  const [shipErr, setShipErr] = useState<string>("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Order[]>(`${API_BASE}/orders?populate=shippingAddress`, {
        headers: authHeaders(),
      });
      const list = Array.isArray(data) ? data : (data as any)?.orders || [];
      setOrders(list || []);
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
      const payload = status === "cancelled" ? { status, cancelledBy: "Admin" } : { status };

      const { data } = await axios.patch<Order>(`${API_BASE}/orders/${id}/status`, payload, {
        headers: authHeaders(),
      });

      setOrders((prev) =>
        prev.map((o) =>
          o._id === id
            ? {
                ...o,
                status: data.status,
                cancelledBy: data.cancelledBy,
                paymentMode: data.paymentMode,
                isShipped: data.isShipped,
                trackingId: data.trackingId,
                courierName: data.courierName,
                wa: data.wa, // ✅ WA Status update
              }
            : o
        )
      );

      if (viewing?._id === id) {
        setViewing((v) =>
          v
            ? {
                ...v,
                status: data.status,
                cancelledBy: data.cancelledBy,
                paymentMode: data.paymentMode,
                isShipped: data.isShipped,
                trackingId: data.trackingId,
                courierName: data.courierName,
                wa: data.wa,
              }
            : v
        );
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "Update failed");
    } finally {
      setActOn(null);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await axios.delete(`${API_BASE}/orders/${id}`, { headers: authHeaders() });

      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (viewing?._id === id) setViewing(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  };

  const openShipModal = (o: Order) => {
    setShipOrder(o);
    setShipErr("");

    const existing = (o.courierName || "").trim();
    const normalized = existing.toLowerCase();
    const isAllowed =
      normalized.includes("delhivery") ||
      normalized.includes("vxpress") ||
      normalized.includes("v-xpress") ||
      normalized.includes("v xpress");

    setShipCourier(isAllowed && existing ? existing : COURIERS[0]);
    setShipTracking(o.trackingId?.trim() || "");
    setShipOpen(true);
  };

  const closeShipModal = () => {
    setShipOpen(false);
    setShipOrder(null);
    setShipErr("");
  };

  const submitShip = async () => {
    if (!shipOrder) return;

    const courier = shipCourier.trim();
    const tracking = shipTracking.trim();

    if (!courier) return setShipErr("Courier select karo.");
    if (!tracking) return setShipErr("Tracking / AWB number required.");

    try {
      setShipErr("");
      setActOn(shipOrder._id);

      const { data } = await axios.patch<Order>(
        `${API_BASE}/orders/${shipOrder._id}/status`,
        { status: "shipped", courierName: courier, trackingId: tracking },
        { headers: authHeaders() }
      );

      setOrders((prev) =>
        prev.map((o) =>
          o._id === shipOrder._id
            ? {
                ...o,
                isShipped: data.isShipped,
                trackingId: data.trackingId,
                courierName: data.courierName,
                status: data.status,
                wa: data.wa, // ✅ WA Status update
              }
            : o
        )
      );

      if (viewing?._id === shipOrder._id) {
        setViewing((prev) =>
          prev
            ? {
                ...prev,
                isShipped: data.isShipped,
                trackingId: data.trackingId,
                courierName: data.courierName,
                status: data.status,
                wa: data.wa,
              }
            : null
        );
      }

      closeShipModal();
      alert("✅ Shipped updated. WhatsApp customer ko backend se send ho jayega.");
    } catch (e: any) {
      setShipErr(e?.response?.data?.message || "Shipping update failed");
    } finally {
      setActOn(null);
    }
  };

  const filteredOrders = useMemo(() => {
    let list = orders;

    if (activeTab !== "all") {
      // ✅ UI me "confirmed" tab dikhana hai but backend me status "processing" hi rahega
      const mapped = activeTab === "confirmed" ? "processing" : activeTab;
      list = list.filter((o) => o.status === mapped);
    }

    const q = debounced.trim().toLowerCase();
    if (!q) return list;

    return list.filter((o) => {
      const inOrderNum = norm(o.orderNumber || o._id).includes(q);
      const inCustomer =
        norm(o.customerId?.shopName).includes(q) ||
        norm(o.customerId?.otpMobile).includes(q) ||
        norm(o.customerId?.whatsapp).includes(q);
      const inShipping = norm(o.shippingAddress?.city).includes(q) || norm(o.shippingAddress?.fullName).includes(q);
      const inPayment = norm(o.paymentMode).includes(q);
      return inOrderNum || inCustomer || inShipping || inPayment;
    });
  }, [orders, debounced, activeTab]);

  return (
    <div className="admin-wrapper">
      <div className="admin-container">
        <header className="admin-header">
          <div className="header-title">
            <h2>Order Dashboard</h2>
            <p>Manage sales, shipping and invoices</p>
            {error && <small style={{ color: "#ef4444" }}>{error}</small>}
          </div>

          <button className="btn-primary" onClick={() => exportAllOrders(filteredOrders)}>
            <span>📥</span> Export Report
          </button>
        </header>

        <div className="admin-controls">
          <div className="tabs">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "confirmed", label: "Confirmed" }, // ✅ processing = confirmed
              { key: "shipped", label: "Shipped" },
              { key: "delivered", label: "Delivered" },
              { key: "cancelled", label: "Cancelled" },
            ].map((t) => (
              <button
                key={t.key}
                className={`tab-item ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search ID, Shop, City, Payment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loader">Loading Orders...</div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.length === 0 ? (
              <div className="empty-state">No orders found.</div>
            ) : (
              filteredOrders.map((o) => {
                const wa = normalizeWhatsApp91(o.customerId?.whatsapp || o.customerId?.otpMobile);
                return (
                  <div className={`order-card status-${o.status}`} key={o._id}>
                    <div className="card-top">
                      <span className="order-id">#{o.orderNumber || o._id.slice(-6)}</span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <span className={`badge ${o.status}`}>{statusLabel(o.status)}</span>
                        
                        {/* ✅ WhatsApp Status Badge (NEW) */}
                        {o.wa?.orderConfirmedSent && (
                          <div style={{
                            fontSize: "10px",
                            color: "#16a34a",
                            fontWeight: "bold",
                            background: "#dcfce7",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginTop: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px"
                          }}>
                            ✓ WA Sent
                          </div>
                        )}

                        {o.status === "cancelled" && (
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#d9534f",
                              fontWeight: "bold",
                              marginTop: "3px",
                              background: "#fff",
                              padding: "2px 5px",
                              borderRadius: "4px",
                              border: "1px solid #d9534f",
                            }}
                          >
                            🚫 {o.cancelledBy || "Cancelled"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="info-row">
                        <div className="info-cell">
                          <label>Customer</label>
                          <strong>{o.customerId?.shopName || "Guest"}</strong>
                          <small>📞 {o.customerId?.otpMobile || "-"}</small>
                          <small>💬 {wa || "-"}</small>
                        </div>
                        <div className="info-cell align-right">
                          <label>Total</label>
                          <span className="price">₹{o.total.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="info-row">
                        <div className="info-cell">
                          <label>Location</label>
                          <span>{o.shippingAddress?.city || "N/A"}</span>
                        </div>
                        <div className="info-cell align-right">
                          <label>Payment</label>
                          <span style={{ fontWeight: 800, color: o.paymentMode === "ONLINE" ? "#16a34a" : "#f97316" }}>
                            {paymentLabel(o.paymentMode)}
                          </span>
                        </div>
                      </div>

                      <div className="info-row">
                        <div className="info-cell">
                          <label>Date</label>
                          <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="info-cell align-right">
                          <label>Items</label>
                          <span>{o.items?.length || 0}</span>
                        </div>
                      </div>

                      {o.isShipped && o.trackingId && (
                        <div className="info-row" style={{ marginTop: 8 }}>
                          <div className="info-cell">
                            <label>Tracking</label>
                            <span>
                              🚚 {o.courierName || "Courier"}: <b>{o.trackingId}</b>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="card-actions">
                      <button className="btn-icon" onClick={() => setViewing(o)}>
                        👁️ View
                      </button>

                      <select
                        className="status-select"
                        value={o.status}
                        disabled={actOn === o._id}
                        onChange={(e) => updateStatus(o._id, e.target.value as OrderStatus)}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Confirmed</option>
                        {/* ✅ FIX: Shipped option add kar diya! */}
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        className={`btn-ship ${o.isShipped ? "shipped" : ""}`}
                        disabled={actOn === o._id}
                        onClick={() => openShipModal(o)}
                      >
                        {o.isShipped ? "✏️ Update" : "🚚 Ship"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* --- Detailed Modal --- */}
      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Order #{viewing.orderNumber} <span style={{ fontSize: 12, opacity: 0.7 }}>({statusLabel(viewing.status)})</span>
              </h3>
              <button className="close-btn" onClick={() => setViewing(null)}>
                &times;
              </button>
            </div>

            <div className="modal-toolbar">
              <button className="btn-secondary" onClick={() => exportSingleOrder(viewing)}>
                ⬇ Excel
              </button>
              <button className="btn-secondary" onClick={() => generateInvoice(viewing)}>
                📄 Invoice
              </button>
              <button className="btn-danger" onClick={() => deleteOrder(viewing._id)}>
                🗑 Delete
              </button>
            </div>

            <div className="modal-grid">
              <div className="modal-section">
                <h4>Customer</h4>
                <p>
                  <strong>{viewing.customerId?.shopName}</strong>
                </p>
                <p>📞 {viewing.customerId?.otpMobile}</p>
                <p>💬 {normalizeWhatsApp91(viewing.customerId?.whatsapp || viewing.customerId?.otpMobile)}</p>
              </div>
              <div className="modal-section">
                <h4>Shipping Details</h4>
                {viewing.shippingAddress ? (
                  <>
                    <p>
                      <strong>{viewing.shippingAddress.fullName}</strong>
                    </p>
                    <p>
                      {viewing.shippingAddress.street}, {viewing.shippingAddress.city}
                    </p>
                    <p>
                      {viewing.shippingAddress.state} - {viewing.shippingAddress.pincode}
                    </p>
                  </>
                ) : (
                  <p>No address provided</p>
                )}
              </div>
            </div>

            {/* ✅ Smart Tracking Link Section */}
            {viewing.isShipped && viewing.trackingId && (
              <div style={{ background: "#f0f4f8", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    🚚 <b>{viewing.courierName}</b>: {viewing.trackingId}
                  </span>
                  {getExternalTrackingLink(viewing.courierName) && (
                    <a
                      href={getExternalTrackingLink(viewing.courierName)!}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#2c5aa0", fontWeight: "bold" }}
                    >
                      🌐 Track Live
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="items-list">
              <h4>Items ({viewing.items.length})</h4>
              {viewing.items.map((it, i) => (
                <div
                  key={i}
                  className="item-row"
                  style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {it.image && <img src={resolveImage(it.image)} alt="" style={{ width: "40px", height: "40px", borderRadius: "4px" }} />}
                    <span>
                      {it.name} (x{it.qty})
                    </span>
                  </div>
                  <span>₹{(it.price * it.qty).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ textAlign: "right", marginTop: "15px", fontSize: "1.1rem" }}>
                <strong>Grand Total: ₹{viewing.total}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Ship Modal --- */}
      {shipOpen && shipOrder && (
        <div className="modal-backdrop" onClick={closeShipModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3>🚚 Ship Order #{shipOrder.orderNumber}</h3>
              <button className="close-btn" onClick={closeShipModal}>
                &times;
              </button>
            </div>

            <div style={{ padding: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Courier</label>
              <select
                value={shipCourier}
                onChange={(e) => setShipCourier(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "16px" }}
              >
                {COURIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>AWB / Tracking Number</label>
              <input
                value={shipTracking}
                onChange={(e) => setShipTracking(e.target.value)}
                placeholder="Enter ID"
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
              />

              {shipErr && <p style={{ color: "red", marginTop: "10px" }}>{shipErr}</p>}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                <button onClick={closeShipModal} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={submitShip} disabled={actOn === shipOrder._id} className="btn-primary">
                  {actOn === shipOrder._id ? "Saving..." : "Save & Ship"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;