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

// ✅ Inner calculation
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

// ✅ Export all orders
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
    TotalInners: o.items.reduce((sum, it) => sum + toInners(it), 0),
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

// ✅ Export a single order
const exportSingleOrder = (order: Order) => {
  const createdAt = formatExcelDate(order.createdAt);

  const rows = order.items.map((it) => ({
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Shop: order.customerId?.shopName || "",
    Phone: order.customerId?.otpMobile || "",
    WhatsApp: order.customerId?.whatsapp || "",
    Item: it.name,
    Qty: it.qty,
    Price: it.price,
    Total: it.price * it.qty,
    Inners: toInners(it),
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

// ✅ Generate Invoice (PDF + Print)
const generateInvoice = (order: Order) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const currentDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin:0; padding:20px; background:#fff; color:#333; }
        .invoice-container { max-width:800px; margin:0 auto; border:2px solid #ddd; border-radius:10px; padding:30px; }
        .header { text-align:center; border-bottom:2px solid #2c5aa0; margin-bottom:20px; padding-bottom:15px; }
        .header img { max-height:60px; margin-bottom:8px; }
        .invoice-title { font-size:22px; font-weight:bold; margin-top:10px; }
        .section { margin-bottom:20px; }
        .billto-table { width:100%; font-size:14px; border-collapse:collapse; }
        .billto-table td { padding:3px 6px; }
        .billto-table td:first-child { width:120px; font-weight:bold; }
        .items-table { width:100%; border-collapse:collapse; margin-top:20px; font-size:14px; }
        .items-table th { background:#2c5aa0; color:#fff; padding:8px; text-align:left; }
        .items-table td { padding:8px; border-bottom:1px solid #ddd; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        .footer { text-align:center; font-size:13px; color:#777; margin-top:30px; border-top:1px solid #ccc; padding-top:10px; }
        .btns { margin-top:20px; text-align:center; }
        .btns button { margin:5px; padding:8px 15px; font-weight:bold; border:none; border-radius:4px; cursor:pointer; }
        .print-btn { background:#2c5aa0; color:white; }
        .download-btn { background:#28a745; color:white; }
        @media print { .btns { display:none; } }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <script>
        function printInvoice(){ window.print(); }
        function downloadAsPDF(){
          const element=document.querySelector('.invoice-container');
          const opt={ margin:10, filename:'Invoice-${order.orderNumber}.pdf',
            image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true,scrollY:0},
            jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
          html2pdf().set(opt).from(element).save();
        }
      </script>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <img src="logo.webp" alt="BafnaToys"/>
          <div><b>Bafna Toys Wholesaler</b></div>
          <div>1-12, Sundapalayam Rd, Coimbatore, Tamil Nadu 641007</div>
          <div>Phone: +91 9043347300 | Email: bafnatoysphotos@gmail.com</div>
          <div class="invoice-title">TAX INVOICE</div>
        </div>

        <div class="section">
          <h3>Bill To</h3>
          <table class="billto-table">
            <tr><td>Shop</td><td>: ${order.customerId?.shopName || "-"}</td></tr>
            <tr><td>Mobile</td><td>: ${order.customerId?.otpMobile || "-"}</td></tr>
            <tr><td>WhatsApp</td><td>: ${order.customerId?.whatsapp || "-"}</td></tr>
          </table>
        </div>

        <div class="section">
          <h3>Invoice Details</h3>
          <div><b>Invoice No:</b> ${order.orderNumber}</div>
          <div><b>Date:</b> ${currentDate}</div>
          <div><b>Status:</b> ${order.status}</div>
        </div>

        <table class="items-table">
          <thead>
            <tr><th>Product</th><th>Qty</th><th>Rate (₹)</th><th>Total (₹)</th></tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (it) => `
              <tr>
                <td>${it.name}</td>
                <td>${it.qty} pcs (${toInners(it)} inners)</td>
                <td>${it.price.toFixed(2)}</td>
                <td>${(it.qty * it.price).toFixed(2)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;font-weight:bold;border-top:2px solid #2c5aa0;">Grand Total</td>
              <td style="font-weight:bold;font-size:15px;border-top:2px solid #2c5aa0;color:#2c5aa0;">
                ₹${order.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          Thank you for your business! <br/>This is a computer generated invoice.
        </div>
      </div>
      <div class="btns">
        <button class="print-btn" onclick="printInvoice()">🖨️ Print</button>
        <button class="download-btn" onclick="downloadAsPDF()">⬇️ Download PDF</button>
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
      return (
        inOrderNum ||
        inIdSuffix ||
        inCustomer ||
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
            placeholder="Search orders by number, shop name, phone, WhatsApp, payment, status, or item…"
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

        {/* ✅ Export All Button */}
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

            {/* ✅ Export & Invoice Buttons */}
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
                <b>Total Inners:</b>{" "}
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
              <b>Shop Name:</b> {viewing.customerId?.shopName}
              <br />
              {viewing.customerId?.otpMobile && (
                <>
                  📞 {viewing.customerId.otpMobile}
                  <br />
                </>
              )}
              {viewing.customerId?.whatsapp && (
                <>
                  💬 {viewing.customerId.whatsapp}
                  <br />
                </>
              )}
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
              {viewing.shipping?.address && <>📍 {viewing.shipping.address}<br /></>}
              {viewing.shipping?.phone && <>📞 {viewing.shipping.phone}<br /></>}
              {viewing.shipping?.email && <>✉️ {viewing.shipping.email}<br /></>}
              {viewing.shipping?.notes && <>📝 {viewing.shipping.notes}</>}
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
                const iTotal = toInners(it);
                return (
                  <div className="ord-m-item" key={i}>
                    {img ? (
                      <img src={img} alt={it.name} className="ord-m-img" />
                    ) : (
                      <div className="ord-m-img ord-m-imgph" />
                    )}
                    <span className="ord-m-iname">{it.name}</span>
                    <span className="ord-m-inner">({iTotal} inners)</span>
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
