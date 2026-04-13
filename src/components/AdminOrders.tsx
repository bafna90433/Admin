import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../utils/api";
import "../styles/AdminOrdersModern.css";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";


const MEDIA_BASE =
  (import.meta as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

/* ================= TYPES ================= */
type OrderItem = {
  productId: any;
  name: string;
  qty: number;
  price: number;
  image?: string;
  innerQty?: number;
  inners?: number;
  nosPerInner?: number;
  sku?: string;
  mrp?: number; // ✅ Added MRP here
};

type CustomerLite = {
  shopName?: string;
  otpMobile?: string;
  whatsapp?: string;
  visitingCardUrl?: string;
};

type ShippingAddress = {
  _id?: string;
  shopName?: string;
  fullName: string;
  phone: string;
  street: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  type: string;
  gstNumber?: string;
  isDifferentShipping?: boolean;
  shippingStreet?: string;
  shippingArea?: string;
  shippingPincode?: string;
  shippingCity?: string;
  shippingState?: string;
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
  itemsPrice?: number;
  shippingPrice?: number;
  discountAmount?: number;
  paymentMode?: PaymentMode;
  advancePaid?: number;
  remainingAmount?: number;
  status: OrderStatus;
  shippingAddress?: ShippingAddress;
  isShipped?: boolean;
  trackingId?: string;
  courierName?: string;
  trackingToken?: string;
  cancelledBy?: string;
  wa?: {
    orderConfirmedSent?: boolean;
    trackingSent?: boolean;
    lastError?: string;
    lastSentAt?: string;
  };
};

/* ================= CONSTANTS ================= */
const COURIERS = ["Delhivery"] as const;
const PER_PAGE_OPTIONS = [10, 20, 50, 100, 200];
const BOX_WEIGHTS_KG: Record<string, number> = {
  A28: 8.46,
  A06: 10.75,
  A08: 15.68,
  A31: 34.18,
  A18: 2.42, 
};
const BOX_SIZES = ["A28", "A06", "A08", "A31", "A18"] as const; 
type BoxSize = (typeof BOX_SIZES)[number];

/* ================= HELPERS ================= */
const authHeaders = () => {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads") || img.startsWith("/images"))
    return `${MEDIA_BASE}${img}`;
  return `${MEDIA_BASE}/uploads/${encodeURIComponent(img)}`;
};

const norm = (v?: string | number) =>
  (v ?? "").toString().toLowerCase().trim();

const fmtDate = (iso?: string): string =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtShortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

const fmtExcelDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const paymentLabel = (mode?: PaymentMode) =>
  mode === "ONLINE" ? "Paid Online" : "Cash on Delivery";

const normalizeWhatsApp91 = (raw?: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const without91 = digits.startsWith("91") ? digits.slice(2) : digits;
  const last10 =
    without91.length > 10 ? without91.slice(-10) : without91;
  return last10.length === 10 ? `91${last10}` : "";
};

const getExternalTrackingLink = (
  courier?: string,
  trackingId?: string
) => {
  if (norm(courier).includes("delhivery") && trackingId)
    return `https://www.delhivery.com/track-v2/package/${trackingId}`;
  return null;
};

const statusLabel = (s: OrderStatus) => {
  if (s === "processing" || s === "pending") return "Confirmed";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const statusIcon = (s: OrderStatus) => {
  const map: Record<string, string> = {
    pending: "⏳",
    processing: "✅",
    shipped: "🚚",
    delivered: "📦",
    cancelled: "❌",
  };
  return map[s] || "📋";
};

const shippingCity = (addr?: ShippingAddress) =>
  addr?.isDifferentShipping
    ? addr.shippingCity || "—"
    : addr?.city || "—";

const shippingState = (addr?: ShippingAddress) =>
  addr?.isDifferentShipping
    ? addr.shippingState || "—"
    : addr?.state || "—";

/* ================= EXPORT HELPERS ================= */
const exportAllOrders = (orders: Order[]) => {
  // ✅ Kept ONLY the specific columns you asked for
  const rows = orders.flatMap((o) =>
    o.items.map((it) => ({
      OrderNumber: o.orderNumber || o._id.slice(-6),
      Product_Name: it.name,
      SKU: it.sku || it.productId?.sku || "—",
      MRP: it.mrp || it.productId?.mrp || "—",
      Qty: it.qty,
      Order_Date: fmtExcelDate(o.createdAt),
      Shop_Name: o.shippingAddress?.shopName || o.customerId?.shopName || "",
      City: shippingCity(o.shippingAddress),
      State: shippingState(o.shippingAddress),
    }))
  );
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    "Bafnatoys_All_Orders.xlsx"
  );
};

const exportSingleOrder = (order: Order) => {
  const addr = order.shippingAddress;
  
  // ✅ Kept ONLY the specific columns you asked for
  const rows = order.items.map((it) => ({
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Product_Name: it.name,
    SKU: it.sku || it.productId?.sku || "—",
    MRP: it.mrp || it.productId?.mrp || "—",
    Qty: it.qty,
    Order_Date: fmtExcelDate(order.createdAt),
    Shop_Name: addr?.shopName || order.customerId?.shopName || "",
    City: shippingCity(addr),
    State: shippingState(addr),
  }));

  if (rows.length === 0) {
    rows.push({
      OrderNumber: order.orderNumber || order._id.slice(-6),
      Product_Name: "No Items",
      SKU: "—",
      MRP: "—",
      Qty: 0,
      Order_Date: fmtExcelDate(order.createdAt),
      Shop_Name: addr?.shopName || order.customerId?.shopName || "",
      City: shippingCity(addr),
      State: shippingState(addr),
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order_Details");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `Order_${order.orderNumber || order._id.slice(-6)}.xlsx`
  );
};

/* ================= INVOICE ================= */
const generateInvoice = (order: Order) => {
  const win = window.open("", "_blank");
  if (!win) return;

  const addr = order.shippingAddress;
  const wa = normalizeWhatsApp91(
    order.customerId?.whatsapp || order.customerId?.otpMobile
  );
  const today = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const shipTo = addr
    ? addr.isDifferentShipping
      ? `<strong>${addr.fullName}</strong><br/>${addr.shippingStreet}<br/>${addr.shippingArea || ""}<br/>${addr.shippingCity}, ${addr.shippingState} – ${addr.shippingPincode}<br/>📞 ${addr.phone}`
      : `<strong>${addr.fullName}</strong><br/>${addr.street}<br/>${addr.area || ""}<br/>${addr.city}, ${addr.state} – ${addr.pincode}<br/>📞 ${addr.phone}`
    : "No shipping address";

  let payHtml = `Payment: ${paymentLabel(order.paymentMode)}`;
  if (
    order.paymentMode === "COD" &&
    (order.advancePaid || 0) > 0
  ) {
    payHtml += `<br><span style="color:#16a34a">Advance: ₹${order.advancePaid}</span><br><strong style="color:#dc2626">Collect: ₹${order.remainingAmount ?? order.total - order.advancePaid!}</strong>`;
  }

  const itemRows = order.items
    .map(
      (it, i) =>
        `<tr><td style="text-align:center">${i + 1}</td><td>${it.name}<br><small style="color:#888">SKU: ${it.sku || it.productId?.sku || "—"}</small></td><td style="text-align:center">${it.qty}</td><td style="text-align:right">₹${it.price.toLocaleString()}</td><td style="text-align:right">₹${(it.qty * it.price).toLocaleString()}</td></tr>`
    )
    .join("");

  const subtotal =
    order.itemsPrice ||
    order.items.reduce((s, i) => s + i.qty * i.price, 0);

  let summaryRows = `<tr class="summary"><td colspan="4" style="text-align:right">Subtotal</td><td style="text-align:right">₹${subtotal.toLocaleString()}</td></tr>`;
  if (order.shippingPrice)
    summaryRows += `<tr class="summary"><td colspan="4" style="text-align:right">Shipping</td><td style="text-align:right">₹${order.shippingPrice.toLocaleString()}</td></tr>`;
  if (order.discountAmount)
    summaryRows += `<tr class="summary"><td colspan="4" style="text-align:right">Discount</td><td style="text-align:right;color:#16a34a">−₹${order.discountAmount.toLocaleString()}</td></tr>`;
  summaryRows += `<tr class="grand"><td colspan="4" style="text-align:right"><strong>Grand Total</strong></td><td style="text-align:right"><strong>₹${order.total.toLocaleString()}</strong></td></tr>`;

  const html = `<!DOCTYPE html><html><head><title>Invoice ${order.orderNumber}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;padding:24px;background:#fff}
.inv{max-width:860px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
.inv-head{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:28px 32px;display:flex;justify-content:space-between;align-items:center}
.inv-head img{height:56px;filter:brightness(0) invert(1)}
.inv-head h1{font-size:28px;font-weight:800;letter-spacing:1px}
.inv-meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:24px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.inv-meta section h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:6px;font-weight:700}
.inv-meta section p{font-size:13px;line-height:1.6}
table{width:100%;border-collapse:collapse;font-size:13px}
thead{background:#f1f5f9}
th{padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0}
td{padding:10px 14px;border-bottom:1px solid #f1f5f9}
.summary td{border:none;padding:6px 14px;font-size:13px;color:#475569}
.grand td{border-top:2px solid #1e3a5f;padding:12px 14px;font-size:15px}
.inv-foot{text-align:center;padding:20px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8}

@media print{
  .no-print{display:none!important}
  body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .inv{border:none;border-radius:0}
  .inv-head{background:transparent!important;padding:20px 0!important;border-bottom:2px solid #dc2626}
  /* Ye line image ko RED colour filter deti hai print me */
  .inv-head img{filter:brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(3011%) hue-rotate(348deg) brightness(93%) contrast(93%)!important}
  .inv-head h1{color:#1e293b!important}
  .inv-head p{color:#64748b!important}
}
</style></head><body>
<div class="inv">
<div class="inv-head">
  <img src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png" alt="BafnaToys"/>
  <div style="text-align:right"><h1>INVOICE</h1><p style="opacity:.8;font-size:13px;margin-top:4px">${order.orderNumber}</p></div>
</div>
<div class="inv-meta">
  <section><h3>Bill To</h3><p><strong>${addr?.shopName || order.customerId?.shopName || "—"}</strong><br>GST: ${addr?.gstNumber || "N/A"}<br>📞 ${order.customerId?.otpMobile || "—"}<br>💬 ${wa || "—"}</p></section>
  <section><h3>Ship To</h3><p>${shipTo}</p></section>
  <section><h3>Details</h3><p>Date: ${today}<br>${payHtml}${order.trackingId ? `<br>AWB: ${order.trackingId}` : ""}</p></section>
</div>
<div style="padding:0 32px 24px">
  <table><thead><tr><th>#</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${itemRows}</tbody>
  <tfoot>${summaryRows}</tfoot></table>
</div>
<div class="inv-foot">
  <p>Thank you for choosing <strong>BafnaToys</strong>!</p>
  <p style="margin-top:4px">1-12, Thondamuthur Road, Coimbatore – 641007 | +91 9043347300</p>
</div>
</div>
<div style="text-align:center;margin-top:20px" class="no-print">
  <button onclick="window.print()" style="padding:12px 28px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">🖨️ Print Invoice</button>
</div>
</body></html>`;

  win.document.write(html);
  win.document.close();
};

/* ================= COMPONENT ================= */
const SERVER_LIMIT = 200;

const AdminOrders: React.FC = () => {
  /* --- state --- */
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [actOn, setActOn] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [debounced, setDebounced] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [serverPage, setServerPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalFromServer, setTotalFromServer] = useState(0);

  /* ship modal */
  const [shipOpen, setShipOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState<Order | null>(null);
  const [shipCourier, setShipCourier] = useState<string>(COURIERS[0]);
  const [shipTracking, setShipTracking] = useState("");
  const [shipErr, setShipErr] = useState("");
  const [manualAdvance, setManualAdvance] = useState(0);
  const [isAdvanceUnlocked, setIsAdvanceUnlocked] = useState(false);
  const [boxes, setBoxes] = useState<
    Record<BoxSize, { qty: number; weight: number }>
  >({
    A28: { qty: 0, weight: 0 },
    A06: { qty: 0, weight: 0 },
    A08: { qty: 0, weight: 0 },
    A31: { qty: 0, weight: 0 },
    A18: { qty: 0, weight: 0 }, 
  });

  /* --- box handler --- */
  const handleBoxQtyChange = (size: BoxSize, value: string) => {
    const qty = Math.max(0, Number(value) || 0);
    setBoxes((prev) => ({
      ...prev,
      [size]: { qty, weight: qty * BOX_WEIGHTS_KG[size] },
    }));
  };

  /* --- fetch --- */
  const fetchOrders = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const { data } = await api.get(
        `/orders?populate=shippingAddress&page=${page}&limit=${SERVER_LIMIT}`
      );

      let list: Order[] = [];
      let total = 0;

      if (Array.isArray(data)) {
        list = data;
        total = data.length;
        setHasMore(false);
      } else if (data?.orders) {
        list = data.orders;
        total = data.total || data.totalCount || list.length;
        setHasMore(list.length === SERVER_LIMIT);
      } else {
        setHasMore(false);
      }

      setTotalFromServer(total);
      if (append) {
        setAllOrders((prev) => {
          const ids = new Set(prev.map((o) => o._id));
          return [...prev, ...list.filter((o) => !ids.has(o._id))];
        });
      } else {
        setAllOrders(list);
      }
      setServerPage(page);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to fetch orders");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMoreFromServer = () => {
    if (hasMore && !loadingMore) fetchOrders(serverPage + 1, true);
  };

  const loadAllFromServer = async () => {
    let page = serverPage + 1;
    setLoadingMore(true);
    try {
      while (true) {
        const { data } = await api.get(
          `/orders?populate=shippingAddress&page=${page}&limit=${SERVER_LIMIT}`
        );
        const list: Order[] = Array.isArray(data)
          ? data
          : data?.orders || [];
        if (!list.length) break;
        setAllOrders((prev) => {
          const ids = new Set(prev.map((o) => o._id));
          return [...prev, ...list.filter((o) => !ids.has(o._id))];
        });
        if (list.length < SERVER_LIMIT) break;
        page++;
      }
      setHasMore(false);
      setServerPage(page);
    } catch {
      /* silent */
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debounced, activeTab, perPage]);

  /* --- status update --- */
  const updateStatus = async (id: string, status: OrderStatus) => {
    if (status === "cancelled") {
      Swal.fire(
        "Disabled",
        "Order cancellation is disabled from admin panel.",
        "warning"
      );
      return;
    }
    try {
      setActOn(id);
      const { data } = await api.patch<Order>(
        `/orders/${id}/status`,
        { status }
      );
      const patch = (o: Order): Order =>
        o._id === id
          ? {
              ...o,
              status: data.status,
              cancelledBy: data.cancelledBy,
              paymentMode: data.paymentMode,
              advancePaid: data.advancePaid,
              remainingAmount: data.remainingAmount,
              isShipped: data.isShipped,
              trackingId: data.trackingId,
              courierName: data.courierName,
              wa: data.wa,
            }
          : o;
      setAllOrders((prev) => prev.map(patch));
      if (viewing?._id === id)
        setViewing((v) => (v ? patch(v) : v));
    } catch (e: any) {
      Swal.fire(
        "Error",
        e?.response?.data?.message || "Update failed",
        "error"
      );
    } finally {
      setActOn(null);
    }
  };

  /* --- delete --- */
  const deleteOrder = async (id: string) => {
    const { value: password } = await Swal.fire({
      title: "Admin Verification",
      text: "Enter admin password to delete this order:",
      input: "password",
      inputPlaceholder: "Password",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
      inputValidator: (v) => (!v ? "Password required" : undefined),
    });
    if (!password) return;
    if (password !== "Adminbafnatoys") {
      Swal.fire("Denied", "Incorrect password.", "error");
      return;
    }
    try {
      Swal.fire({
        title: "Deleting…",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await api.delete(`/orders/${id}`);
      setAllOrders((prev) => prev.filter((o) => o._id !== id));
      if (viewing?._id === id) setViewing(null);
      Swal.fire("Deleted!", "Order removed.", "success");
    } catch (e: any) {
      Swal.fire(
        "Failed",
        e?.response?.data?.message || "Delete failed.",
        "error"
      );
    }
  };

  /* --- ship modal --- */
  const openShipModal = (o: Order) => {
    setShipOrder(o);
    setShipErr("");
    setBoxes({
      A28: { qty: 0, weight: 0 },
      A06: { qty: 0, weight: 0 },
      A08: { qty: 0, weight: 0 },
      A31: { qty: 0, weight: 0 },
      A18: { qty: 0, weight: 0 },
    });
    setShipCourier(COURIERS[0]);
    setShipTracking(o.trackingId?.trim() || "");
    setManualAdvance(o.advancePaid || 0);
    setIsAdvanceUnlocked(false);
    setShipOpen(true);
  };

  const closeShipModal = () => {
    setShipOpen(false);
    setShipOrder(null);
    setShipErr("");
    setIsAdvanceUnlocked(false);
  };

  const handleUnlockAdvance = async () => {
    const { value: password } = await Swal.fire({
      title: "Unlock Advance Edit",
      text: "Enter admin password:",
      input: "password",
      inputPlaceholder: "Password",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Unlock",
    });
    if (!password) return;
    if (password === "Adminbafnatoys") {
      setIsAdvanceUnlocked(true);
      Swal.fire({
        title: "Unlocked",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } else {
      Swal.fire("Denied", "Incorrect password.", "error");
    }
  };

  const submitShip = async () => {
    if (!shipOrder) return;
    const courier = shipCourier.trim();
    const payload: any = { status: "shipped", courierName: courier };

    if (courier === "Delhivery") {
      const totalQty = BOX_SIZES.reduce(
        (s, k) => s + boxes[k].qty,
        0
      );
      if (totalQty === 0) {
        setShipErr("Add at least 1 box for Delhivery shipment.");
        return;
      }

      payload.packingDetails = BOX_SIZES.filter(
        (k) => boxes[k].qty > 0
      ).map((k) => ({
        boxType: k,
        quantity: boxes[k].qty,
        totalWeight: boxes[k].weight,
      }));

      if (shipOrder.paymentMode !== "ONLINE") {
        payload.manualAdvance = manualAdvance || 0;
        payload.codAmountToCollect =
          shipOrder.total - (manualAdvance || 0);
      } else {
        payload.codAmountToCollect = 0;
      }
    }

    try {
      setShipErr("");
      setActOn(shipOrder._id);
      const { data } = await api.patch<Order>(
        `/orders/${shipOrder._id}/status`,
        payload
      );

      const patch = (o: Order): Order =>
        o._id === shipOrder._id
          ? {
              ...o,
              isShipped: data.isShipped,
              trackingId: data.trackingId,
              courierName: data.courierName,
              status: data.status,
              advancePaid: data.advancePaid,
              remainingAmount: data.remainingAmount,
              wa: data.wa,
            }
          : o;
      setAllOrders((prev) => prev.map(patch));
      if (viewing?._id === shipOrder._id)
        setViewing((v) => (v ? patch(v) : null));

      closeShipModal();
      Swal.fire({
        title: "Shipped!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e: any) {
      setShipErr(e?.response?.data?.message || "Shipping failed.");
    } finally {
      setActOn(null);
    }
  };

  /* --- derived data --- */
  const filteredOrders = useMemo(() => {
    let list = allOrders;
    if (activeTab !== "all") {
      list = list.filter((o) =>
        activeTab === "confirmed"
          ? o.status === "processing" || o.status === "pending"
          : o.status === activeTab
      );
    }
    const q = debounced.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        return (
          norm(o.orderNumber || o._id).includes(q) ||
          norm(o.customerId?.shopName).includes(q) ||
          norm(o.shippingAddress?.shopName).includes(q) ||
          norm(o.shippingAddress?.gstNumber).includes(q) ||
          norm(o.customerId?.otpMobile).includes(q) ||
          norm(o.customerId?.whatsapp).includes(q) ||
          norm(o.shippingAddress?.city).includes(q) ||
          norm(o.shippingAddress?.shippingCity).includes(q) ||
          norm(o.shippingAddress?.fullName).includes(q) ||
          norm(o.paymentMode).includes(q)
        );
      });
    }
    return list;
  }, [allOrders, debounced, activeTab]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / perPage)
  );
  const safePage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredOrders.slice(start, start + perPage);
  }, [filteredOrders, safePage, perPage]);

  const stats = useMemo(() => {
    const s = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      total: allOrders.length,
    };
    allOrders.forEach((o) => {
      if (o.status in s) (s as any)[o.status]++;
    });
    return s;
  }, [allOrders]);

  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxVis = 7;
    let start = Math.max(1, safePage - 3);
    let end = Math.min(totalPages, start + maxVis - 1);
    if (end - start < maxVis - 1)
      start = Math.max(1, end - maxVis + 1);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [safePage, totalPages]);

  const totalBoxWeight = BOX_SIZES.reduce(
    (s, k) => s + boxes[k].weight,
    0
  );
  const totalBoxQty = BOX_SIZES.reduce(
    (s, k) => s + boxes[k].qty,
    0
  );

  /* ============ RENDER ============ */
  return (
    <div className="ao-wrapper">
      <div className="ao-container">
        {/* HEADER */}
        <header className="ao-header">
          <div className="ao-header-left">
            <div className="ao-header-icon">📦</div>
            <div>
              <h2 className="ao-title">Order Management</h2>
              <p className="ao-subtitle">
                {allOrders.length.toLocaleString()} orders loaded
                {hasMore && " · more available"}
                {totalFromServer > allOrders.length &&
                  ` · ${totalFromServer.toLocaleString()} total`}
              </p>
            </div>
          </div>
          <div className="ao-header-actions">
            <button
              className="ao-btn ao-btn-ghost"
              onClick={() => fetchOrders(1)}
              disabled={loading}
            >
              <span className={loading ? "ao-spin-icon" : ""}>↻</span>
              Refresh
            </button>
            <button
              className="ao-btn ao-btn-primary"
              onClick={() => exportAllOrders(filteredOrders)}
            >
              <span>↓</span> Export Excel
            </button>
          </div>
        </header>

        {error && (
          <div className="ao-alert ao-alert-error">
            <span>⚠️</span> {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* STATS */}
        <div className="ao-stats-row">
          {[
            {
              label: "Total Orders",
              value: stats.total,
              icon: "📋",
              color: "#6366f1",
              bg: "#eef2ff",
            },
            {
              label: "Confirmed",
              value: stats.processing + stats.pending,
              icon: "✅",
              color: "#2563eb",
              bg: "#dbeafe",
            },
            {
              label: "Shipped",
              value: stats.shipped,
              icon: "🚚",
              color: "#16a34a",
              bg: "#dcfce7",
            },
            {
              label: "Delivered",
              value: stats.delivered,
              icon: "📦",
              color: "#059669",
              bg: "#d1fae5",
            },
            {
              label: "Cancelled",
              value: stats.cancelled,
              icon: "❌",
              color: "#dc2626",
              bg: "#fee2e2",
            },
          ].map((s) => (
            <div
              className="ao-stat-card"
              key={s.label}
              style={
                {
                  "--stat-color": s.color,
                  "--stat-bg": s.bg,
                } as React.CSSProperties
              }
            >
              <div className="ao-stat-icon">{s.icon}</div>
              <div className="ao-stat-content">
                <span className="ao-stat-value">{s.value}</span>
                <span className="ao-stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="ao-controls">
          <nav className="ao-tabs">
            {[
              { key: "all", label: "All Orders", count: stats.total },
              {
                key: "confirmed",
                label: "Confirmed",
                count: stats.processing + stats.pending,
              },
              { key: "shipped", label: "Shipped", count: stats.shipped },
              {
                key: "delivered",
                label: "Delivered",
                count: stats.delivered,
              },
              {
                key: "cancelled",
                label: "Cancelled",
                count: stats.cancelled,
              },
            ].map((t) => (
              <button
                key={t.key}
                className={`ao-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                <span className="ao-tab-count">{t.count}</span>
              </button>
            ))}
          </nav>

          <div className="ao-controls-right">
            <div className="ao-search">
              <svg
                className="ao-search-svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by order, shop, city, GST…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="ao-search-clear"
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className="ao-view-toggle">
              <button
                className={`ao-vt-btn ${viewMode === "card" ? "active" : ""}`}
                onClick={() => setViewMode("card")}
                title="Card View"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" width="16">
                  <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
                </svg>
              </button>
              <button
                className={`ao-vt-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" width="16">
                  <path
                    fillRule="evenodd"
                    d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"
                  />
                </svg>
              </button>
            </div>

            <select
              className="ao-per-page"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SHOWING INFO */}
        <div className="ao-showing">
          <span>
            Showing{" "}
            <strong>
              {(safePage - 1) * perPage + 1}–
              {Math.min(safePage * perPage, filteredOrders.length)}
            </strong>{" "}
            of <strong>{filteredOrders.length}</strong> orders
          </span>
          {hasMore && (
            <span className="ao-showing-actions">
              <button
                className="ao-link-btn"
                onClick={loadMoreFromServer}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load More"}
              </button>
              <span className="ao-dot">·</span>
              <button
                className="ao-link-btn"
                onClick={loadAllFromServer}
                disabled={loadingMore}
              >
                Load All
              </button>
            </span>
          )}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="ao-loader">
            <div className="ao-spinner" />
            <p>Loading orders…</p>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="ao-empty">
            <div className="ao-empty-icon">📭</div>
            <h3>No orders found</h3>
            <p>Try adjusting your filters or search term.</p>
          </div>
        ) : viewMode === "table" ? (
          /* TABLE VIEW */
          <div className="ao-table-wrap">
            <table className="ao-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Shop / Customer</th>
                  <th>City</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Tracking</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((o) => (
                  <tr
                    key={o._id}
                    className={`ao-tr ao-tr-${o.status === "pending" ? "processing" : o.status}`}
                  >
                    <td>
                      <span className="ao-td-mono">
                        #{o.orderNumber || o._id.slice(-6)}
                      </span>
                    </td>
                    <td className="ao-td-date">
                      {fmtShortDate(o.createdAt)}
                    </td>
                    <td>
                      <div className="ao-td-customer">
                        <strong>
                          {o.shippingAddress?.shopName ||
                            o.customerId?.shopName ||
                            "Guest"}
                        </strong>
                        <small>
                          GST: {o.shippingAddress?.gstNumber || "N/A"}
                        </small>
                        <small>{o.customerId?.otpMobile || ""}</small>
                      </div>
                    </td>
                    <td>{shippingCity(o.shippingAddress)}</td>
                    <td className="ao-td-center">
                      {o.items?.length || 0}
                    </td>
                    <td className="ao-td-price">
                      ₹{o.total.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`ao-pay-chip ${o.paymentMode === "ONLINE" ? "online" : "cod"}`}
                      >
                        {o.paymentMode === "ONLINE" ? "Online" : "COD"}
                      </span>
                      {o.paymentMode === "COD" &&
                        (o.advancePaid || 0) > 0 && (
                          <div className="ao-advance-info">
                            <span className="ao-adv-green">
                              Adv ₹{o.advancePaid}
                            </span>
                            <span className="ao-adv-red">
                              Bal ₹
                              {o.remainingAmount ??
                                o.total - o.advancePaid!}
                            </span>
                          </div>
                        )}
                    </td>
                    <td>
                      <select
                        className="ao-status-sel"
                        value={
                          o.status === "pending"
                            ? "processing"
                            : o.status
                        }
                        disabled={actOn === o._id}
                        onChange={(e) =>
                          updateStatus(
                            o._id,
                            e.target.value as OrderStatus
                          )
                        }
                      >
                        <option value="processing">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </td>
                    <td>
                      {o.trackingId ? (
                        <span className="ao-tracking-mini">
                          {o.courierName}: {o.trackingId}
                        </span>
                      ) : (
                        <span className="ao-muted-text">—</span>
                      )}
                    </td>
                    <td>
                      <div className="ao-td-actions">
                        <button
                          className="ao-icon-btn"
                          onClick={() => setViewing(o)}
                          title="View Details"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            width="16"
                          >
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path
                              fillRule="evenodd"
                              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          className="ao-icon-btn ao-icon-ship"
                          onClick={() => openShipModal(o)}
                          title="Ship"
                        >
                          🚚
                        </button>
                        <button
                          className="ao-icon-btn ao-icon-danger"
                          onClick={() => deleteOrder(o._id)}
                          title="Delete"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            width="14"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD VIEW */
          <div className="ao-grid">
            {paginatedOrders.map((o) => (
              <div
                className={`ao-card ao-status-${o.status === "pending" ? "processing" : o.status}`}
                key={o._id}
              >
                {/* Card Header */}
                <div className="ao-card-top">
                  <div className="ao-card-top-left">
                    <span className="ao-order-id">
                      #{o.orderNumber || o._id.slice(-6)}
                    </span>
                    <span className="ao-card-date">
                      {fmtShortDate(o.createdAt)}
                    </span>
                  </div>
                  <div className="ao-card-badges">
                    <span
                      className={`ao-badge ${o.status === "pending" ? "processing" : o.status}`}
                    >
                      {statusIcon(o.status)} {statusLabel(o.status)}
                    </span>
                    {o.wa?.orderConfirmedSent && (
                      <span className="ao-wa-badge">✓ WA Sent</span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="ao-card-body">
                  {/* Shop Info */}
                  <div className="ao-card-row">
                    <div className="ao-card-field">
                      <label>Shop / Business</label>
                      <strong>
                        {o.shippingAddress?.shopName ||
                          o.customerId?.shopName ||
                          "Guest"}
                      </strong>
                      <small>
                        GST: {o.shippingAddress?.gstNumber || "N/A"}
                      </small>
                    </div>
                    <div className="ao-card-field ao-right">
                      <label>Total Amount</label>
                      <span className="ao-price">
                        ₹{o.total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Location & Payment */}
                  <div className="ao-card-row">
                    <div className="ao-card-field">
                      <label>Location</label>
                      <span>{shippingCity(o.shippingAddress)}</span>
                      <small>
                        📞 {o.customerId?.otpMobile || "—"}
                      </small>
                    </div>
                    <div className="ao-card-field ao-right">
                      <label>Payment</label>
                      <span
                        className={`ao-pay-chip ${o.paymentMode === "ONLINE" ? "online" : "cod"}`}
                      >
                        {o.paymentMode === "ONLINE"
                          ? "✓ Online"
                          : "COD"}
                      </span>
                      {o.paymentMode === "COD" &&
                        (o.advancePaid || 0) > 0 && (
                          <div className="ao-advance-info">
                            <span className="ao-adv-green">
                              Adv ₹{o.advancePaid}
                            </span>
                            <span className="ao-adv-red">
                              Bal ₹
                              {o.remainingAmount ??
                                o.total - o.advancePaid!}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Items count */}
                  <div className="ao-card-row ao-card-row-items">
                    <span className="ao-items-count">
                      {o.items?.length || 0} item
                      {(o.items?.length || 0) !== 1 ? "s" : ""}
                    </span>
                    {o.status === "cancelled" && (
                      <span className="ao-cancel-chip">
                        🚫 {o.cancelledBy || "Cancelled"}
                      </span>
                    )}
                  </div>

                  {/* Tracking */}
                  {o.isShipped && o.trackingId && (
                    <div className="ao-tracking-row">
                      <span className="ao-tracking-icon">🚚</span>
                      <span>
                        {o.courierName}: <b>{o.trackingId}</b>
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="ao-card-actions">
                  <button
                    className="ao-card-act-btn ao-act-view"
                    onClick={() => setViewing(o)}
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      width="14"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    View
                  </button>
                  <select
                    className="ao-status-sel"
                    value={
                      o.status === "pending" ? "processing" : o.status
                    }
                    disabled={actOn === o._id}
                    onChange={(e) =>
                      updateStatus(
                        o._id,
                        e.target.value as OrderStatus
                      )
                    }
                  >
                    <option value="processing">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <button
                    className={`ao-card-act-btn ao-act-ship ${o.isShipped ? "shipped" : ""}`}
                    disabled={actOn === o._id}
                    onClick={() => openShipModal(o)}
                  >
                    {o.isShipped ? "✏️ Update" : "🚚 Ship"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="ao-pagination">
            <button
              className="ao-pg-btn"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              title="First"
            >
              «
            </button>
            <button
              className="ao-pg-btn"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous"
            >
              ‹
            </button>
            {pageRange.map((p) => (
              <button
                key={p}
                className={`ao-pg-btn ${p === safePage ? "active" : ""}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="ao-pg-btn"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              title="Next"
            >
              ›
            </button>
            <button
              className="ao-pg-btn"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last"
            >
              »
            </button>
            <span className="ao-pg-info">
              Page {safePage} of {totalPages}
            </span>
          </div>
        )}

        {/* LOAD MORE */}
        {hasMore && (
          <div className="ao-load-more-bar">
            <button
              className="ao-btn ao-btn-ghost"
              onClick={loadMoreFromServer}
              disabled={loadingMore}
            >
              {loadingMore
                ? "⏳ Loading…"
                : `↓ Load Next ${SERVER_LIMIT}`}
            </button>
            <button
              className="ao-btn ao-btn-ghost"
              onClick={loadAllFromServer}
              disabled={loadingMore}
            >
              ↓↓ Load All
            </button>
          </div>
        )}
      </div>

      {/* ========== DETAIL MODAL ========== */}
      {viewing && (
        <div
          className="ao-overlay"
          onClick={() => setViewing(null)}
        >
          <div
            className="ao-modal ao-modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ao-modal-head">
              <div className="ao-modal-head-left">
                <h3>Order #{viewing.orderNumber}</h3>
                <span
                  className={`ao-badge ${viewing.status === "pending" ? "processing" : viewing.status}`}
                >
                  {statusIcon(viewing.status)}{" "}
                  {statusLabel(viewing.status)}
                </span>
              </div>
              <button
                className="ao-modal-close"
                onClick={() => setViewing(null)}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Toolbar */}
            <div className="ao-modal-toolbar">
              <button
                className="ao-btn ao-btn-ghost ao-btn-sm"
                onClick={() => exportSingleOrder(viewing)}
              >
                ⬇ Excel
              </button>
              <button
                className="ao-btn ao-btn-ghost ao-btn-sm"
                onClick={() => generateInvoice(viewing)}
              >
                📄 Invoice
              </button>
              <div style={{ flex: 1 }} />
              <button
                className="ao-btn ao-btn-danger ao-btn-sm"
                onClick={() => deleteOrder(viewing._id)}
              >
                🗑 Delete
              </button>
            </div>

            {/* Info Grid */}
            <div className="ao-modal-body">
              <div className="ao-detail-grid">
                <div className="ao-detail-card">
                  <h4>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      width="16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-.553.894l-4 2A1 1 0 0111 18V8.414a1 1 0 00-.293-.707l-2-2A1 1 0 019 5H5V4z"
                        clipRule="evenodd"
                        />
                    </svg>
                    Billing Info
                  </h4>
                  <p className="ao-detail-shop">
                    {viewing.shippingAddress?.shopName ||
                      viewing.customerId?.shopName ||
                      "—"}
                  </p>
                  <p>
                    <span className="ao-detail-label">GST:</span>{" "}
                    {viewing.shippingAddress?.gstNumber || "N/A"}
                  </p>
                  <p>
                    <span className="ao-detail-label">Phone:</span>{" "}
                    {viewing.shippingAddress?.phone ||
                      viewing.customerId?.otpMobile ||
                      "—"}
                  </p>
                  <p>
                    <span className="ao-detail-label">WhatsApp:</span>{" "}
                    {normalizeWhatsApp91(
                      viewing.customerId?.whatsapp ||
                        viewing.customerId?.otpMobile
                    ) || "—"}
                  </p>
                </div>

                <div className="ao-detail-card">
                  <h4>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      width="16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Shipping Address
                  </h4>
                  {viewing.shippingAddress ? (
                    <>
                      <p className="ao-detail-shop">
                        {viewing.shippingAddress.fullName}
                      </p>
                      {viewing.shippingAddress.isDifferentShipping ? (
                        <>
                          <p>
                            {viewing.shippingAddress.shippingStreet}
                          </p>
                          {viewing.shippingAddress.shippingArea && (
                            <p>
                              {viewing.shippingAddress.shippingArea}
                            </p>
                          )}
                          <p>
                            {viewing.shippingAddress.shippingCity},{" "}
                            {viewing.shippingAddress.shippingState} –{" "}
                            {viewing.shippingAddress.shippingPincode}
                          </p>
                        </>
                      ) : (
                        <>
                          <p>{viewing.shippingAddress.street}</p>
                          {viewing.shippingAddress.area && (
                            <p>{viewing.shippingAddress.area}</p>
                          )}
                          <p>
                            {viewing.shippingAddress.city},{" "}
                            {viewing.shippingAddress.state} –{" "}
                            {viewing.shippingAddress.pincode}
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="ao-muted-text">No address</p>
                  )}
                </div>
              </div>

              {/* Tracking */}
              {viewing.isShipped && viewing.trackingId && (
                <div className="ao-modal-tracking">
                  <div className="ao-modal-tracking-left">
                    <span className="ao-tracking-dot" />
                    <span>
                      <b>{viewing.courierName}</b> ·{" "}
                      {viewing.trackingId}
                    </span>
                  </div>
                  {getExternalTrackingLink(
                    viewing.courierName,
                    viewing.trackingId
                  ) && (
                    <a
                      href={getExternalTrackingLink(
                        viewing.courierName,
                        viewing.trackingId
                      )!}
                      target="_blank"
                      rel="noreferrer"
                      className="ao-track-link"
                    >
                      Track Live →
                    </a>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="ao-modal-items">
                <h4>
                  Items{" "}
                  <span className="ao-items-badge">
                    {viewing.items.length}
                  </span>
                </h4>
                <div className="ao-items-list">
                  {viewing.items.map((it, i) => (
                    <div key={i} className="ao-item-row">
                      <div className="ao-item-left">
                        {it.image && (
                          <img
                            src={resolveImage(it.image)}
                            alt=""
                            className="ao-item-img"
                          />
                        )}
                        <div className="ao-item-info">
                          <span className="ao-item-name">
                            {it.name}
                          </span>
                          <span className="ao-item-meta">
                            SKU:{" "}
                            {it.sku || it.productId?.sku || "N/A"} ·
                            Qty: {it.qty}
                          </span>
                        </div>
                      </div>
                      <span className="ao-item-price">
                        ₹{(it.price * it.qty).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="ao-order-summary">
                  <div className="ao-summary-row">
                    <span>Subtotal</span>
                    <span>
                      ₹
                      {(
                        viewing.itemsPrice ||
                        viewing.items.reduce(
                          (s, i) => s + i.qty * i.price,
                          0
                        )
                      ).toLocaleString()}
                    </span>
                  </div>
                  {(viewing.shippingPrice || 0) > 0 && (
                    <div className="ao-summary-row">
                      <span>Shipping</span>
                      <span>₹{viewing.shippingPrice?.toLocaleString()}</span>
                    </div>
                  )}
                  {(viewing.discountAmount || 0) > 0 && (
                    <div className="ao-summary-row ao-summary-discount">
                      <span>Discount</span>
                      <span>
                        −₹{viewing.discountAmount?.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {viewing.paymentMode === "COD" &&
                    (viewing.advancePaid || 0) > 0 && (
                      <>
                        <div className="ao-summary-row ao-summary-advance">
                          <span>Advance Paid</span>
                          <span>
                            ₹{viewing.advancePaid?.toLocaleString()}
                          </span>
                        </div>
                        <div className="ao-summary-row ao-summary-collect">
                          <span>To Collect (COD)</span>
                          <span>
                            ₹
                            {(
                              viewing.remainingAmount ??
                              viewing.total - viewing.advancePaid!
                            ).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  <div className="ao-summary-row ao-summary-total">
                    <span>Grand Total</span>
                    <span>₹{viewing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== SHIP MODAL ========== */}
      {shipOpen && shipOrder && (
        <div className="ao-overlay" onClick={closeShipModal}>
          <div
            className="ao-modal ao-modal-ship"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ao-modal-head">
              <h3>
                🚚 Ship Order #{shipOrder.orderNumber}
              </h3>
              <button
                className="ao-modal-close"
                onClick={closeShipModal}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="ao-ship-body">
              {/* Order Summary Mini */}
              <div className="ao-ship-summary">
                <div className="ao-ship-summary-row">
                  <span>
                    {shipOrder.shippingAddress?.shopName ||
                      shipOrder.customerId?.shopName ||
                      "Guest"}
                  </span>
                  <span className="ao-ship-total">
                    ₹{shipOrder.total.toLocaleString()}
                  </span>
                </div>
                <div className="ao-ship-summary-row ao-ship-meta">
                  <span>
                    {shippingCity(shipOrder.shippingAddress)},{" "}
                    {shippingState(shipOrder.shippingAddress)}
                  </span>
                  <span
                    className={`ao-pay-chip small ${shipOrder.paymentMode === "ONLINE" ? "online" : "cod"}`}
                  >
                    {shipOrder.paymentMode === "ONLINE"
                      ? "Online"
                      : "COD"}
                  </span>
                </div>
              </div>

              {/* Courier */}
              <div className="ao-field">
                <label className="ao-field-label">Courier Partner</label>
                <div className="ao-courier-badge">
                  <span className="ao-courier-icon">📦</span>
                  Delhivery
                </div>
              </div>

              {/* Advance - COD only */}
              {shipOrder.paymentMode !== "ONLINE" && (
                <div className="ao-ship-advance">
                  <div className="ao-advance-header">
                    <label className="ao-field-label">
                      Manual Advance Received (₹)
                    </label>
                    {!isAdvanceUnlocked && (
                      <button
                        type="button"
                        className="ao-unlock-btn"
                        onClick={handleUnlockAdvance}
                      >
                        🔒 Unlock
                      </button>
                    )}
                    {isAdvanceUnlocked && (
                      <span className="ao-unlocked-badge">
                        🔓 Unlocked
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={shipOrder.total}
                    value={manualAdvance || ""}
                    onChange={(e) =>
                      setManualAdvance(Number(e.target.value))
                    }
                    disabled={!isAdvanceUnlocked}
                    className={`ao-field-input ${!isAdvanceUnlocked ? "locked" : ""}`}
                    placeholder="e.g. 1000"
                  />
                  <div className="ao-cod-collect">
                    <span>Delhivery will collect:</span>
                    <strong>
                      ₹
                      {(
                        shipOrder.total - (manualAdvance || 0)
                      ).toLocaleString()}
                    </strong>
                  </div>
                </div>
              )}

              {/* Box Packing */}
              <div className="ao-ship-boxes">
                <label className="ao-field-label">
                  📦 Packing Details
                </label>
                <div className="ao-box-grid">
                  {BOX_SIZES.map((size) => (
                    <div key={size} className="ao-box-row">
                      <span className="ao-box-label">{size}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={boxes[size].qty || ""}
                        onChange={(e) =>
                          handleBoxQtyChange(size, e.target.value)
                        }
                        className="ao-box-input"
                      />
                      <span className="ao-box-weight">
                        {(boxes[size].weight * 1000).toLocaleString()}g
                      </span>
                    </div>
                  ))}
                </div>
                {totalBoxQty > 0 && (
                  <div className="ao-box-total">
                    <span>
                      Total: {totalBoxQty} box
                      {totalBoxQty > 1 ? "es" : ""}
                    </span>
                    <span>
                      {(totalBoxWeight * 1000).toLocaleString()}g (
                      {totalBoxWeight.toFixed(2)} kg)
                    </span>
                  </div>
                )}
              </div>

              {/* Error */}
              {shipErr && (
                <div className="ao-alert ao-alert-error ao-alert-sm">
                  ⚠️ {shipErr}
                </div>
              )}

              {/* Actions */}
              <div className="ao-ship-actions">
                <button
                  className="ao-btn ao-btn-ghost"
                  onClick={closeShipModal}
                >
                  Cancel
                </button>
                <button
                  className="ao-btn ao-btn-primary"
                  onClick={submitShip}
                  disabled={actOn === shipOrder._id}
                >
                  {actOn === shipOrder._id
                    ? "Processing…"
                    : "Generate AWB & Ship"}
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