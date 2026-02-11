// src/components/AdminOrders.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api, { MEDIA_URL } from "../utils/api";
import "../styles/AdminOrdersModern.css";

// Excel export
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type PaymentMode = "COD" | "ONLINE";

type Order = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  customerId?: CustomerLite;
  items: OrderItem[];
  total: number;

  // ✅ IMPORTANT: paymentMode add (COD/ONLINE)
  paymentMode?: PaymentMode;

  status: OrderStatus;
  shippingAddress?: ShippingAddress;

  // Shipping Integration Fields
  isShipped?: boolean;
  trackingId?: string;
  courierName?: string;

  // Cancel info
  cancelledBy?: string;
};

/* --- Helpers --- */
const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads") || img.startsWith("/images"))
    return `${MEDIA_URL}${img}`;
  return `${MEDIA_URL}/uploads/${encodeURIComponent(img)}`;
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

const paymentLabel = (mode?: PaymentMode) =>
  mode === "ONLINE" ? "Paid (Online)" : "Cash on Delivery";

/* --- Export Functions --- */
const exportAllOrders = (orders: Order[]) => {
  const rows = orders.map((o) => ({
    OrderNumber: o.orderNumber || o._id.slice(-6),
    Status:
      o.status + (o.status === "cancelled" && o.cancelledBy ? ` (${o.cancelledBy})` : ""),
    Total: o.total,
    Payment_Mode: paymentLabel(o.paymentMode),
    CreatedAt: formatExcelDate(o.createdAt),
    Shop: o.customerId?.shopName || "",
    Phone: o.customerId?.otpMobile || "",
    WhatsApp: o.customerId?.whatsapp || "",
    ShippingName: o.shippingAddress?.fullName || "",
    ShippingPhone: o.shippingAddress?.phone || "",
    ShippingAddress: `${o.shippingAddress?.street || ""}, ${o.shippingAddress?.area || ""}`,
    ShippingCity: o.shippingAddress?.city || "",
    ShippingState: o.shippingAddress?.state || "",
    ShippingPincode: o.shippingAddress?.pincode || "",
    TotalPackets: o.items.reduce((sum, it) => sum + toInners(it), 0),
    TrackingID: o.trackingId || "-",
    Courier: o.courierName || "-",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    "all_orders.xlsx"
  );
};

const exportSingleOrder = (order: Order) => {
  const createdAt = formatExcelDate(order.createdAt);
  const rows = order.items.map((it) => ({
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Payment_Mode: paymentLabel(order.paymentMode),
    Shop: order.customerId?.shopName || "",
    Phone: order.customerId?.otpMobile || "",
    ShippingName: order.shippingAddress?.fullName || "",
    ShippingAddress: `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.area || ""}`,
    Item: it.name,
    Qty: it.qty,
    Price: it.price,
    Total: it.price * it.qty,
    Packets: toInners(it),
    CreatedAt: createdAt,
    TrackingID: order.trackingId || "-",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `order_${order.orderNumber || order._id.slice(-6)}.xlsx`
  );
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
            <p><strong>${order.customerId?.shopName || "-"}</strong><br>Mobile: ${order.customerId?.otpMobile || "-"}</p>
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
              .map(
                (it) =>
                  `<tr><td>${it.name}</td><td>${it.qty}</td><td>₹${it.price}</td><td>₹${it.qty * it.price}</td></tr>`
              )
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

/* --- Main Component --- */
const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [actOn, setActOn] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [debounced, setDebounced] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Order[]>("/orders?populate=shippingAddress");
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
      const payload = status === "cancelled" ? { status, cancelledBy: "Admin" } : { status };
      const { data } = await api.patch<Order>(`/orders/${id}/status`, payload);

      setOrders((prev) =>
        prev.map((o) =>
          o._id === id
            ? {
                ...o,
                status: data.status,
                cancelledBy: data.cancelledBy,
                paymentMode: data.paymentMode, // ✅ keep synced
              }
            : o
        )
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
      if (viewing?._id === id) setViewing(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  };

  const shipOrderHandler = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to book shipping with iThinkLogistics?")) return;
    try {
      setActOn(orderId);
      const { data } = await api.post("/shipping/create", { orderId });
      alert(`✅ Shipping Booked!\nWaybill: ${data.waybill}`);

      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? {
                ...o,
                isShipped: true,
                trackingId: data.waybill,
                courierName: "iThinkLogistics",
                status: "shipped",
              }
            : o
        )
      );

      if (viewing?._id === orderId) {
        setViewing((prev) =>
          prev
            ? {
                ...prev,
                isShipped: true,
                trackingId: data.waybill,
                courierName: "iThinkLogistics",
                status: "shipped",
              }
            : null
        );
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Shipping booking failed";
      alert(`❌ Error: ${msg}`);
    } finally {
      setActOn(null);
    }
  };

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeTab !== "all") list = list.filter((o) => o.status === activeTab);

    const q = debounced.trim().toLowerCase();
    if (!q) return list;

    return list.filter((o) => {
      const inOrderNum = norm(o.orderNumber || o._id).includes(q);
      const inCustomer =
        norm(o.customerId?.shopName).includes(q) || norm(o.customerId?.otpMobile).includes(q);
      const inShipping =
        norm(o.shippingAddress?.city).includes(q) || norm(o.shippingAddress?.fullName).includes(q);
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
            {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map((tab) => (
              <button
                key={tab}
                className={`tab-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              filteredOrders.map((o) => (
                <div className={`order-card status-${o.status}`} key={o._id}>
                  <div className="card-top">
                    <span className="order-id">#{o.orderNumber || o._id.slice(-6)}</span>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span className={`badge ${o.status}`}>{o.status}</span>

                      {/* Cancelled by indicator */}
                      {o.status === "cancelled" && o.cancelledBy === "Customer" && (
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
                          👤 By Customer
                        </div>
                      )}

                      {o.status === "cancelled" && o.cancelledBy === "Admin" && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#777",
                            fontWeight: "bold",
                            marginTop: "3px",
                            background: "#fff",
                            padding: "2px 5px",
                            borderRadius: "4px",
                            border: "1px solid #777",
                          }}
                        >
                          🛡️ By Admin
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <div className="info-cell">
                        <label>Customer</label>
                        <strong>{o.customerId?.shopName || "Guest"}</strong>
                        <small>{o.customerId?.otpMobile}</small>
                      </div>
                      <div className="info-cell align-right">
                        <label>Total</label>
                        <span className="price">₹{o.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* ✅ Payment Mode Visible */}
                    <div className="info-row">
                      <div className="info-cell">
                        <label>Location</label>
                        <span>{o.shippingAddress?.city || "N/A"}</span>
                      </div>
                      <div className="info-cell align-right">
                        <label>Payment</label>
                        <span
                          style={{
                            fontWeight: 800,
                            color: o.paymentMode === "ONLINE" ? "#16a34a" : "#f97316",
                          }}
                        >
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
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <button
                      className={`btn-ship ${o.isShipped ? "shipped" : ""}`}
                      disabled={!!o.isShipped || actOn === o._id}
                      onClick={() => shipOrderHandler(o._id)}
                    >
                      {o.isShipped ? "✔ Track" : "🚀 Ship"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- Detailed Modal --- */}
      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3>Order #{viewing.orderNumber || viewing._id.slice(-6)}</h3>

                {viewing.status === "cancelled" && viewing.cancelledBy && (
                  <span
                    style={{
                      fontSize: "12px",
                      background: viewing.cancelledBy === "Customer" ? "#fee2e2" : "#f3f4f6",
                      color: viewing.cancelledBy === "Customer" ? "#991b1b" : "#374151",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                    }}
                  >
                    (Cancelled by {viewing.cancelledBy})
                  </span>
                )}
              </div>
              <button className="close-btn" onClick={() => setViewing(null)}>
                ×
              </button>
            </div>

            <div className="modal-toolbar">
              <button className="btn-secondary" onClick={() => exportSingleOrder(viewing)}>
                ⬇ Excel
              </button>
              <button className="btn-secondary" onClick={() => generateInvoice(viewing)}>
                📄 Invoice
              </button>

              {viewing.isShipped && viewing.trackingId && (
                <div className="tracking-box">
                  🚚 {viewing.courierName}: <b>{viewing.trackingId}</b>
                </div>
              )}

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
                <p>💬 {viewing.customerId?.whatsapp}</p>

                {/* ✅ Payment Mode in modal */}
                <p style={{ marginTop: 8 }}>
                  💳 Payment:{" "}
                  <strong
                    style={{
                      color: viewing.paymentMode === "ONLINE" ? "#16a34a" : "#f97316",
                    }}
                  >
                    {paymentLabel(viewing.paymentMode)}
                  </strong>
                </p>
              </div>

              <div className="modal-section">
                <h4>Shipping Details</h4>
                {viewing.shippingAddress ? (
                  <>
                    <p>
                      <strong>{viewing.shippingAddress.fullName}</strong>
                    </p>
                    <p>
                      {viewing.shippingAddress.street}, {viewing.shippingAddress.area}
                    </p>
                    <p>
                      {viewing.shippingAddress.city}, {viewing.shippingAddress.state} -{" "}
                      {viewing.shippingAddress.pincode}
                    </p>
                    <p>
                      <small>{viewing.shippingAddress.phone}</small>
                    </p>
                  </>
                ) : (
                  <p className="text-muted">No address provided</p>
                )}
              </div>
            </div>

            <div className="items-list">
              <h4>Items ({viewing.items.length})</h4>
              {viewing.items.map((it, i) => (
                <div className="item-row" key={i}>
                  {it.image && <img src={resolveImage(it.image)} alt="" />}
                  <div className="item-details">
                    <span className="item-name">{it.name}</span>
                    <span className="item-meta">
                      {toInners(it)} packets • x{it.qty} units
                    </span>
                  </div>
                  <div className="item-price">₹{(it.price * it.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <span>Total Amount:</span>
              <span className="grand-total">₹{viewing.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
