// src/components/AdminOrders.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api, { MEDIA_URL } from "../utils/api";
import "../styles/AdminOrdersModern.css";

// Excel export
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

type Order = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  customerId?: CustomerLite;
  items: OrderItem[];
  total: number;
  paymentMethod?: string;
  status: OrderStatus;
  shippingAddress?: ShippingAddress;
};

// Resolve image path
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

// Inner calculation
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

// Format date+time for Excel
const formatExcelDate = (iso?: string): string =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

// Export all orders
const exportAllOrders = (orders: Order[]) => {
  const rows = orders.map((o) => ({
    OrderNumber: o.orderNumber || o._id.slice(-6),
    Status: o.status,
    Total: o.total,
    Payment: o.paymentMethod || "-",
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
    TotalPackets: o.items.reduce((sum, it) => sum + toInners(it), 0), // Changed header to TotalPackets if you prefer
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

// Export a single order
const exportSingleOrder = (order: Order) => {
  const createdAt = formatExcelDate(order.createdAt);

  const rows = order.items.map((it) => ({
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Shop: order.customerId?.shopName || "",
    Phone: order.customerId?.otpMobile || "",
    WhatsApp: order.customerId?.whatsapp || "",
    ShippingName: order.shippingAddress?.fullName || "",
    ShippingPhone: order.shippingAddress?.phone || "",
    ShippingAddress: `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.area || ""}`,
    ShippingCity: order.shippingAddress?.city || "",
    ShippingState: order.shippingAddress?.state || "",
    ShippingPincode: order.shippingAddress?.pincode || "",
    Item: it.name,
    Qty: it.qty,
    Price: it.price,
    Total: it.price * it.qty,
    Packets: toInners(it),
    CreatedAt: createdAt,
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

/* -------------------- Invoice Generator -------------------- */
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
    const lines = [
      shippingAddr.fullName ? `<strong>${shippingAddr.fullName}</strong>` : "",
      shippingAddr.street || "",
      shippingAddr.area || "",
      shippingAddr.city ? `${shippingAddr.city}, ${shippingAddr.state}` : shippingAddr.state || "",
      shippingAddr.pincode ? `PIN: ${shippingAddr.pincode}` : "",
      shippingAddr.phone ? `Phone: ${shippingAddr.phone}` : ""
    ].filter(Boolean);
    shippingHtml = lines.join("<br>");
  }

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.orderNumber || order._id.slice(-6)}</title>
      <style>
        body {
          font-family: 'Segoe UI', Roboto, Arial, sans-serif;
          margin: 0; padding: 20px;
          background: #f5f7fa; color: #333;
        }
        .invoice-container {
          max-width: 850px; margin: 0 auto;
          background: #fff; padding: 35px;
          border-radius: 10px;
          border: 1px solid #ddd;
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
        }
        .header { text-align: center; margin-bottom: 25px; }
        .header img { max-height: 70px; margin-bottom: 8px; }
        .company-info { font-size: 13px; color: #555; line-height: 1.5; }

        .invoice-title {
          text-align: center;
          font-size: 26px; font-weight: 700;
          margin: 15px 0 30px; color: #2c5aa0;
          text-transform: uppercase;
          border-bottom: 3px solid #2c5aa0;
          padding-bottom: 10px;
        }

        .invoice-details {
          display: flex; justify-content: space-between;
          flex-wrap: wrap; margin-bottom: 25px;
        }
        .detail-section {
          flex: 1; min-width: 240px; margin-bottom: 15px;
          font-size: 14px;
        }
        .detail-section h3 {
          font-size: 15px; margin-bottom: 8px;
          color: #2c5aa0; border-bottom: 1px solid #ddd;
          padding-bottom: 4px;
        }
        .billto-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .billto-table td { padding: 3px 6px; vertical-align: top; }
        .billto-table td:first-child { width: 120px; font-weight: 600; color: #444; }

        .items-table {
          width: 100%; border-collapse: collapse; margin: 20px 0;
          font-size: 14px;
        }
        .items-table th {
          background: #2c5aa0; color: #fff;
          padding: 10px; text-align: left;
          font-size: 14px; font-weight: 600;
        }
        .items-table td {
          padding: 10px; border-bottom: 1px solid #eee;
        }
        .items-table tr:nth-child(even) { background: #f9f9f9; }

        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        .grand-total td {
          font-weight: 700; font-size: 15px;
          border-top: 2px solid #2c5aa0;
          padding-top: 10px;
        }
        .grand-total td:last-child {
          color: #2c5aa0; font-size: 16px;
        }

        .footer {
          margin-top: 40px; text-align: center;
          font-size: 13px; color: #555;
        }
        .footer strong { color: #2c5aa0; }

        .invoice-buttons {
          margin-top: 25px; text-align: center;
        }
        .print-btn, .download-btn {
          margin: 8px; padding: 10px 22px;
          border-radius: 5px; font-size: 15px; font-weight: 600;
          cursor: pointer; border: none;
        }
        .print-btn { background: #2c5aa0; color: white; }
        .download-btn { background: #28a745; color: white; }

        @media print {
          .invoice-buttons { display: none; }
          body { background: #fff; }
        }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <script>
        function printInvoice() { window.print(); }
        function downloadAsPDF() {
          const element = document.querySelector('.invoice-container');
          const opt = {
            margin: [10, 10, 10, 10],
            filename: 'Invoice-${(order.customerId?.shopName || "Customer")
              .replace(/\\s+/g, "_")}-${order.orderNumber || order._id.slice(-6)}.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
          };
          html2pdf().set(opt).from(element).save();
        }
      </script>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <img src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png" alt="BafnaToys Logo" />
          <div class="company-info">
            1-12, Sundapalayam Rd, Coimbatore, Tamil Nadu 641007 <br/>
            Phone: +91 9043347300 | Email: bafnatoysphotos@gmail.com
          </div>
        </div>
        <h1 class="invoice-title">PRO FORMA INVOICE</h1>

        <div class="invoice-details">
          <div class="detail-section">
            <h3>Bill To</h3>
            <table class="billto-table">
              <tr><td>Shop Name</td><td>: ${order.customerId?.shopName || "-"}</td></tr>
              <tr><td>Mobile</td><td>: ${order.customerId?.otpMobile || "-"}</td></tr>
              <tr><td>WhatsApp</td><td>: ${order.customerId?.whatsapp || order.customerId?.otpMobile || "-"}</td></tr>
            </table>
          </div>
          <div class="detail-section">
            <h3>Ship To</h3>
            <div style="line-height: 1.5; font-size: 14px;">
              ${shippingHtml}
            </div>
          </div>
          <div class="detail-section">
            <h3>Invoice Details</h3>
            <table class="billto-table">
              <tr><td>Invoice No</td><td>: ${order.orderNumber || order._id.slice(-6)}</td></tr>
              <tr><td>Date</td><td>: ${currentDate}</td></tr>
              <tr><td>Status</td><td>: ${order.status}</td></tr>
            </table>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Rate (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map(it => `
              <tr>
                <td>${it.name}</td>
                <td>${it.qty} pcs (${toInners(it)} ${toInners(it) === 1 ? "Packet" : "Packets"})</td>
                <td>${new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(it.price)}</td>
                <td>${new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(it.qty * it.price)}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr class="grand-total">
              <td colspan="3" style="text-align:right;">Grand Total</td>
              <td>${new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(order.total)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <p><strong>Thank you for choosing BafnaToys!</strong><br/>
          We appreciate your business and look forward to serving you again.<br/>
        </div>
      </div>

      <div class="invoice-buttons">
        <button class="print-btn" onclick="printInvoice()">🖨️ Print Invoice</button>
        <button class="download-btn" onclick="downloadAsPDF()">📄 Download PDF</button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
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
      const { data } = await api.patch<Order>(`/orders/${id}/status`, { status });
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
        norm(cust?.shopName).includes(q) ||
        norm(cust?.otpMobile).includes(q) ||
        norm(cust?.whatsapp).includes(q);
      const inPayment = norm(o.paymentMethod).includes(q);
      const inStatus = norm(o.status).includes(q);
      const inItems = o.items?.some((it) => norm(it.name).includes(q));
      const shipping = o.shippingAddress;
      const inShipping = 
        norm(shipping?.fullName).includes(q) ||
        norm(shipping?.phone).includes(q) ||
        norm(shipping?.street).includes(q) ||
        norm(shipping?.city).includes(q) ||
        norm(shipping?.state).includes(q) ||
        norm(shipping?.pincode).includes(q);
      
      return (
        inOrderNum ||
        inIdSuffix ||
        inCustomer ||
        inPayment ||
        inStatus ||
        inItems ||
        inShipping
      );
    });
  }, [orders, debounced]);

  const onBigSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredOrders.length > 0) {
      setViewing(filteredOrders[0]);
    }
  };

  const formatShippingAddress = (addr?: ShippingAddress): string => {
    if (!addr) return "No shipping address";
    
    const parts = [
      addr.street,
      addr.area,
      `${addr.city || ''}${addr.city && addr.state ? ', ' : ''}${addr.state || ''}`,
      addr.pincode ? `PIN: ${addr.pincode}` : ''
    ].filter(Boolean);
    
    return parts.join(', ');
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
            placeholder="Search orders by number, shop name, phone, address, city, pincode…"
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

        <button
          className="ord-btn-export"
          onClick={() => exportAllOrders(filteredOrders)}
        >
          ⬇️ Export All
        </button>
      </div>

      <div className="ord-meta">
        Showing <b>{filteredOrders.length}</b> of <b>{orders.length}</b> orders
        {debounced && filteredOrders.length > 0 && (
          <span className="ord-meta-chip">filtered by "{debounced}"</span>
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
              const shop = o.customerId?.shopName || "";
              const phone = o.customerId?.otpMobile || "";
              const whats = o.customerId?.whatsapp || "";
              return (
                <div className="ord-card" key={o._id}>
                  <div className="ord-main">
                    <div className="ord-row">
                      <span className="ord-label">Order #</span>
                      <span className="ord-num">
                        {qSmall
                          ? highlight(o.orderNumber || o._id.slice(-6), qSmall)
                          : o.orderNumber || o._id.slice(-6)}
                      </span>
                    </div>
                    <div className="ord-row">{formatDate(o.createdAt)}</div>
                    <div className="ord-row ord-cust">
                      <span className="ord-label">Shop Name:</span>
                      <div>
                        <b>{qSmall ? highlight(shop, qSmall) : shop}</b>{" "}
                        <span className="ord-cmeta">
                          {qSmall ? highlight(phone, qSmall) : phone}
                        </span>{" "}
                        <span className="ord-cmeta">
                          {qSmall ? highlight(whats, qSmall) : whats}
                        </span>
                      </div>
                    </div>
                    {o.shippingAddress && (
                      <div className="ord-row">
                        <span className="ord-label">Shipping:</span>
                        <div className="ord-shipping">
                          {qSmall ? highlight(o.shippingAddress.fullName, qSmall) : o.shippingAddress.fullName}
                          <span className="ord-shipping-meta">
                            {qSmall ? highlight(formatShippingAddress(o.shippingAddress), qSmall) : formatShippingAddress(o.shippingAddress)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="ord-row ord-itemsum">
                      <span>
                        {o.items.length} item{o.items.length > 1 ? "s" : ""}
                      </span>
                      <span className="ord-total">₹ {o.total.toFixed(2)}</span>
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
          <div className="ord-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="ord-close"
              onClick={() => setViewing(null)}
              aria-label="Close order details"
            >
              &times;
            </button>
            <h3>Order #{viewing.orderNumber || viewing._id.slice(-6)}</h3>

            <div className="ord-m-export">
              <button
                className="ord-btn-export"
                onClick={() => exportSingleOrder(viewing)}
              >
                ⬇️ Export This Order
              </button>
              <button
                className="ord-btn-export"
                onClick={() => generateInvoice(viewing)}
              >
                📄 View Invoice
              </button>
            </div>

            <div className="ord-m-section">
              <div>
                <b>Status:</b> {viewing.status.toUpperCase()}
              </div>
              <div>
                <b>Total:</b> ₹ {viewing.total.toFixed(2)}
              </div>
              <div>
                <b>Total Packets:</b>{" "}
                {viewing.items.reduce((sum, it) => sum + toInners(it), 0)}
              </div>
              <div>
                <b>Payment:</b> {viewing.paymentMethod || "-"}
              </div>
              <div>
                <b>Created:</b> {formatDate(viewing.createdAt)}
              </div>
            </div>

            <div className="ord-m-section">
              <h4>Customer Details</h4>
              <div className="ord-m-detail">
                <span className="ord-detail-label">Shop Name:</span>
                <span className="ord-detail-value">{viewing.customerId?.shopName || "-"}</span>
              </div>
              {viewing.customerId?.otpMobile && (
                <div className="ord-m-detail">
                  <span className="ord-detail-label">Phone:</span>
                  <span className="ord-detail-value">📞 {viewing.customerId.otpMobile}</span>
                </div>
              )}
              {viewing.customerId?.whatsapp && (
                <div className="ord-m-detail">
                  <span className="ord-detail-label">WhatsApp:</span>
                  <span className="ord-detail-value">💬 {viewing.customerId.whatsapp}</span>
                </div>
              )}
              {viewing.customerId?.visitingCardUrl && (
                <div className="ord-m-detail">
                  <span className="ord-detail-label">Visiting Card:</span>
                  <a
                    href={resolveImage(viewing.customerId.visitingCardUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="ord-link"
                  >
                    View Card
                  </a>
                </div>
              )}
            </div>

            <div className="ord-m-section">
              <h4>Shipping Address</h4>
              {viewing.shippingAddress ? (
                <>
                  <div className="ord-m-detail">
                    <span className="ord-detail-label">Name:</span>
                    <span className="ord-detail-value">{viewing.shippingAddress.fullName}</span>
                  </div>
                  <div className="ord-m-detail">
                    <span className="ord-detail-label">Phone:</span>
                    <span className="ord-detail-value">📞 {viewing.shippingAddress.phone}</span>
                  </div>
                  <div className="ord-m-detail">
                    <span className="ord-detail-label">Address:</span>
                    <span className="ord-detail-value">
                      {viewing.shippingAddress.street}
                      {viewing.shippingAddress.area && `, ${viewing.shippingAddress.area}`}
                    </span>
                  </div>
                  <div className="ord-m-detail">
                    <span className="ord-detail-label">City/State:</span>
                    <span className="ord-detail-value">
                      {viewing.shippingAddress.city}, {viewing.shippingAddress.state} - {viewing.shippingAddress.pincode}
                    </span>
                  </div>
                  <div className="ord-m-detail">
                    <span className="ord-detail-label">Type:</span>
                    <span className="ord-detail-value">
                      <span className={`addr-tag ${viewing.shippingAddress.type.toLowerCase()}`}>
                        {viewing.shippingAddress.type}
                      </span>
                      {viewing.shippingAddress.isDefault && (
                        <span className="default-tag">Default</span>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="ord-m-detail">
                  <span style={{ color: "#888" }}>No shipping address provided</span>
                </div>
              )}
            </div>

            <div className="ord-m-section">
              <h4>Order Items</h4>
              {viewing.items.map((it: OrderItem, i: number) => {
                const img = resolveImage(it.image);
                const iTotal = toInners(it);
                return (
                  <div className="ord-m-item" key={i}>
                    {img ? (
                      <img src={img} alt={it.name} className="ord-m-img" />
                    ) : (
                      <div className="ord-m-img ord-m-imgph" />
                    )}
                    <span className="ord-m-iname">{it.name}</span>
                    {/* ✅ CHANGED: Display 'Packet/Packets' instead of 'inner/inners' */}
                    <span className="ord-m-inner">({iTotal} {iTotal === 1 ? "Packet" : "Packets"})</span>
                    <span className="ord-m-qty">x{it.qty}</span>
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