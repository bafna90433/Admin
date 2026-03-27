// src/components/AdminOrders.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import "../styles/AdminOrdersModern.css";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ================= CONFIG ================= */
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
/* ========================================= */

/* --- Types --- */
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

/* --- Axios helpers --- */
const authHeaders = () => {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* --- Helpers --- */
const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads") || img.startsWith("/images"))
    return `${MEDIA_BASE}${img}`;
  return `${MEDIA_BASE}/uploads/${encodeURIComponent(img)}`;
};

const norm = (v?: string | number) =>
  (v ?? "").toString().toLowerCase().trim();

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

const normalizeWhatsApp91 = (raw?: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const without91 = digits.startsWith("91") ? digits.slice(2) : digits;
  const last10 =
    without91.length > 10 ? without91.slice(-10) : without91;
  if (last10.length !== 10) return "";
  return `91${last10}`;
};

const getExternalTrackingLink = (courier?: string, trackingId?: string) => {
  const cName = norm(courier);
  if (cName.includes("delhivery") && trackingId)
    return `https://www.delhivery.com/track-v2/package/${trackingId}`;
  return null;
};

// ✅ System Pending Orders Treat as "Confirmed" Everywhere
const statusLabel = (s: OrderStatus) => {
  if (s === "processing" || s === "pending") return "Confirmed";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* --- Export Functions --- */

// ✅ Bahar Wala (All Orders) - Itemized format based on screenshot
const exportAllOrders = (orders: Order[]) => {
  const rows = orders.flatMap((o) => {
    const addr = o.shippingAddress;
    const finalShippingCity = addr?.isDifferentShipping ? addr.shippingCity : addr?.city;

    return o.items.map((it) => ({
      OrderNumber: o.orderNumber || o._id.slice(-6),
      Shop: addr?.shopName || o.customerId?.shopName || "", 
      "city name": finalShippingCity || "",
      Item: it.name,
      SKU: it.sku || it.productId?.sku || "-",
      Qty: it.qty,
      CreatedAt: formatExcelDate(o.createdAt),
    }));
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), "Bafnatoys_All_Orders_Items.xlsx");
};

// ✅ Andar Wala (Single Order) - Single Row financial summary without blank column
const exportSingleOrder = (order: Order) => {
  const addr = order.shippingAddress;
  const finalShippingCity = addr?.isDifferentShipping ? addr.shippingCity : addr?.city;
  const finalShippingState = addr?.isDifferentShipping ? addr.shippingState : addr?.state;

  const rows = [{
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Total: order.total,
    Advance_Paid: order.advancePaid || 0,
    Remaining_Amount: order.remainingAmount ?? (order.paymentMode === 'COD' ? order.total : 0),
    Payment_Mode: paymentLabel(order.paymentMode),
    CreatedAt: formatExcelDate(order.createdAt),
    Shop: addr?.shopName || order.customerId?.shopName || "", 
    ShippingCity: finalShippingCity || "",
    ShippingState: finalShippingState || "",
    TrackingID: order.trackingId || "-",
    Courier: order.courierName || "-",
  }];
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `Order_${order.orderNumber || order._id.slice(-6)}.xlsx`);
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
  
  const addr = order.shippingAddress;
  const wa = normalizeWhatsApp91(order.customerId?.whatsapp || order.customerId?.otpMobile);
  
  let shippingHtml = "No shipping address provided";
  if (addr) {
    shippingHtml = addr.isDifferentShipping 
      ? `<strong>${addr.fullName}</strong><br/>${addr.shippingStreet}<br/>${addr.shippingArea || ""}<br/>${addr.shippingCity}, ${addr.shippingState} - ${addr.shippingPincode}<br/>Phone: ${addr.phone}`
      : `<strong>${addr.fullName}</strong><br/>${addr.street}<br/>${addr.area || ""}<br/>${addr.city}, ${addr.state} - ${addr.pincode}<br/>Phone: ${addr.phone}`;
  }

  const paymentText = paymentLabel(order.paymentMode);
  
  let paymentDetailsHtml = `Payment: ${paymentText}`;
  if (order.paymentMode === "COD" && (order.advancePaid || 0) > 0) {
    paymentDetailsHtml += `<br><span style="color: #16a34a;">Advance Paid: ₹${order.advancePaid}</span><br><strong style="color: #dc2626;">To Collect: ₹${order.remainingAmount ?? (order.total - order.advancePaid!)}</strong>`;
  }
  
  const content = `<!DOCTYPE html><html><head><title>Invoice - ${order.orderNumber || order._id.slice(-6)}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;background:#fff;color:#333}.invoice-container{max-width:850px;margin:0 auto;border:1px solid #ddd;padding:30px}.header{text-align:center;margin-bottom:25px;border-bottom:3px solid #2c5aa0;padding-bottom:15px}.header img{max-height:70px}.invoice-details{display:flex;justify-content:space-between;gap:14px;margin-bottom:25px}.detail-section{width:32%}.detail-section h3{font-size:15px;color:#2c5aa0;border-bottom:1px solid #ddd;margin-bottom:5px}table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}th{background:#2c5aa0;color:#fff;padding:10px;text-align:left}td{padding:10px;border-bottom:1px solid #eee}.footer{margin-top:40px;text-align:center;font-size:12px;color:#777}@media print{.btn-hide{display:none}}</style></head><body><div class="invoice-container"><div class="header"><img src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png" alt="BafnaToys"/><p>1-12, Thondamuthur Road, Coimbatore - 641007<br>+91 9043347300 | bafnatoysphotos@gmail.com</p><h2>PRO FORMA INVOICE</h2></div><div class="invoice-details"><div class="detail-section"><h3>Bill To</h3><p><strong>${addr?.shopName || order.customerId?.shopName || "-"}</strong><br>GST: ${addr?.gstNumber || "-"}<br>Mobile: ${order.customerId?.otpMobile || "-"}<br>WhatsApp: ${wa || "-"}</p></div><div class="detail-section"><h3>Ship To</h3><p>${shippingHtml}</p></div><div class="detail-section"><h3>Order Details</h3><p>Invoice: ${order.orderNumber}<br>Date: ${currentDate}<br>${paymentDetailsHtml}<br>${order.trackingId ? `AWB: ${order.trackingId}` : ""}</p></div></div><table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${order.items.map((it) => `<tr><td>${it.name}<br><small style="color:#777;">SKU: ${it.sku || it.productId?.sku || "-"}</small></td><td>${it.qty}</td><td>₹${it.price}</td><td>₹${it.qty * it.price}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3" align="right"><strong>Total</strong></td><td><strong>₹${order.total}</strong></td></tr></tfoot></table><div class="footer"><p>Thank you for choosing BafnaToys!</p></div></div><div style="text-align:center;margin-top:20px" class="btn-hide"><button onclick="window.print()" style="padding:10px 20px;background:#2c5aa0;color:white;border:none;cursor:pointer">Print Invoice</button></div></body></html>`;
  printWindow.document.write(content);
  printWindow.document.close();
};

/* --- COURIERS --- */
const COURIERS = ["Delhivery"] as const;

/* --- Per-page Options --- */
const PER_PAGE_OPTIONS = [10, 20, 50, 100, 200];

const AdminOrders: React.FC = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [actOn, setActOn] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [debounced, setDebounced] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const [serverPage, setServerPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalFromServer, setTotalFromServer] = useState(0);
  const SERVER_LIMIT = 200; 

  const [shipOpen, setShipOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState<Order | null>(null);
  const [shipCourier, setShipCourier] = useState<string>(COURIERS[0]);
  const [shipTracking, setShipTracking] = useState<string>("");
  const [shipErr, setShipErr] = useState<string>("");
  const [manualAdvance, setManualAdvance] = useState<number>(0); 

  const [boxes, setBoxes] = useState({
    A28: { qty: 0, weight: 0 },
    A06: { qty: 0, weight: 0 },
    A08: { qty: 0, weight: 0 },
    A31: { qty: 0, weight: 0 },
  });

  const handleBoxChange = (size: 'A28' | 'A06' | 'A08' | 'A31', field: 'qty' | 'weight', value: string) => {
    setBoxes(prev => ({
      ...prev,
      [size]: { ...prev[size], [field]: Number(value) }
    }));
  };

  /* ===== FETCH with server pagination ===== */
  const fetchOrders = useCallback(
    async (page = 1, append = false) => {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const { data } = await axios.get(
          `${API_BASE}/orders?populate=shippingAddress&page=${page}&limit=${SERVER_LIMIT}`,
          { headers: authHeaders() }
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
          list = [];
          total = 0;
          setHasMore(false);
        }

        setTotalFromServer(total);

        if (append) {
          setAllOrders((prev) => {
            const ids = new Set(prev.map((o) => o._id));
            const newOnes = list.filter((o) => !ids.has(o._id));
            return [...prev, ...newOnes];
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
    },
    []
  );

  const loadMoreFromServer = () => {
    if (hasMore && !loadingMore) {
      fetchOrders(serverPage + 1, true);
    }
  };

  const loadAllFromServer = async () => {
    let page = serverPage + 1;
    setLoadingMore(true);
    try {
      while (true) {
        const { data } = await axios.get(
          `${API_BASE}/orders?populate=shippingAddress&page=${page}&limit=${SERVER_LIMIT}`,
          { headers: authHeaders() }
        );
        let list: Order[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data?.orders) {
          list = data.orders;
        }
        if (list.length === 0) break;

        setAllOrders((prev) => {
          const ids = new Set(prev.map((o) => o._id));
          const newOnes = list.filter((o) => !ids.has(o._id));
          return [...prev, ...newOnes];
        });

        if (list.length < SERVER_LIMIT) break;
        page++;
      }
      setHasMore(false);
      setServerPage(page);
    } catch (e) {
      console.error("Load all failed", e);
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

  /* ===== Status Update ===== */
  const updateStatus = async (id: string, status: OrderStatus) => {
    // ✅ CANCEL FUNCTION KO FALSE KAR DIYA YAHAN PAR
    if (status === "cancelled") {
      alert("❌ Order cancellation is disabled.");
      return;
    }

    try {
      setActOn(id);
      const payload = { status };

      const { data } = await axios.patch<Order>(
        `${API_BASE}/orders/${id}/status`,
        payload,
        { headers: authHeaders() }
      );

      setAllOrders((prev) =>
        prev.map((o) =>
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
                advancePaid: data.advancePaid,
                remainingAmount: data.remainingAmount,
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
    const password = window.prompt("⚠️ Admin Password required to delete this order:");
    
    if (password === null) return; 
    
    if (password !== "Adminbafnatoys") {
      alert("❌ Incorrect password! Only Admins can delete orders.");
      return;
    }

    if (!window.confirm("Are you sure you want to permanently delete this order?")) return;

    try {
      await axios.delete(`${API_BASE}/orders/${id}`, {
        headers: authHeaders(),
      });
      setAllOrders((prev) => prev.filter((o) => o._id !== id));
      if (viewing?._id === id) setViewing(null);
      alert("✅ Order deleted successfully.");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  };

  /* ===== Ship Modal Logic ===== */
  const openShipModal = (o: Order) => {
    setShipOrder(o);
    setShipErr("");
    
    setBoxes({
      A28: { qty: 0, weight: 0 },
      A06: { qty: 0, weight: 0 },
      A08: { qty: 0, weight: 0 },
      A31: { qty: 0, weight: 0 },
    });

    setShipCourier(COURIERS[0]); 
    setShipTracking(o.trackingId?.trim() || "");
    
    setManualAdvance(o.advancePaid || 0); 
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
    
    let payload: any = { status: "shipped", courierName: courier };

    if (courier === "Delhivery") {
      const totalQty = boxes.A28.qty + boxes.A06.qty + boxes.A08.qty + boxes.A31.qty;
      if (totalQty === 0) {
        return setShipErr("Please add at least 1 box for Delhivery shipment.");
      }
      
      const packingDetails = [
        { boxType: "A28", quantity: boxes.A28.qty, totalWeight: boxes.A28.weight },
        { boxType: "A06", quantity: boxes.A06.qty, totalWeight: boxes.A06.weight },
        { boxType: "A08", quantity: boxes.A08.qty, totalWeight: boxes.A08.weight },
        { boxType: "A31", quantity: boxes.A31.qty, totalWeight: boxes.A31.weight },
      ].filter(b => b.quantity > 0);

      payload.packingDetails = packingDetails;

      if (shipOrder.paymentMode !== "ONLINE") {
        payload.manualAdvance = manualAdvance || 0;
        payload.codAmountToCollect = shipOrder.total - (manualAdvance || 0);
      } else {
        payload.codAmountToCollect = 0; 
      }
    }

    try {
      setShipErr("");
      setActOn(shipOrder._id);
      
      const { data } = await axios.patch<Order>(
        `${API_BASE}/orders/${shipOrder._id}/status`,
        payload,
        { headers: authHeaders() }
      );

      setAllOrders((prev) =>
        prev.map((o) =>
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
                advancePaid: data.advancePaid,
                remainingAmount: data.remainingAmount,
                wa: data.wa,
              }
            : null
        );
      }

      closeShipModal();
      alert("✅ Shipped Successfully!");
    } catch (e: any) {
      setShipErr(
        e?.response?.data?.message || "Shipping update failed"
      );
    } finally {
      setActOn(null);
    }
  };

  /* ===== Filtered & Paginated ===== */
  const filteredOrders = useMemo(() => {
    let list = allOrders;

    if (activeTab !== "all") {
      list = list.filter((o) => {
        if (activeTab === "confirmed") return o.status === "processing" || o.status === "pending";
        return o.status === activeTab;
      });
    }

    const q = debounced.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const inOrderNum = norm(o.orderNumber || o._id).includes(q);
        const inCustomer =
          norm(o.customerId?.shopName).includes(q) ||
          norm(o.shippingAddress?.shopName).includes(q) ||
          norm(o.shippingAddress?.gstNumber).includes(q) ||
          norm(o.customerId?.otpMobile).includes(q) ||
          norm(o.customerId?.whatsapp).includes(q);
        const inShipping =
          norm(o.shippingAddress?.city).includes(q) ||
          norm(o.shippingAddress?.shippingCity).includes(q) ||
          norm(o.shippingAddress?.fullName).includes(q);
        const inPayment = norm(o.paymentMode).includes(q);
        return inOrderNum || inCustomer || inShipping || inPayment;
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

  /* ===== Stats ===== */
  const stats = useMemo(() => {
    const s = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, total: allOrders.length };
    allOrders.forEach((o) => {
      if (o.status in s) (s as any)[o.status]++;
    });
    return s;
  }, [allOrders]);

  /* ===== Page range for pagination ===== */
  const getPageRange = () => {
    const range: number[] = [];
    const maxVisible = 7;
    let start = Math.max(1, safePage - 3);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  };

  return (
    <div className="ao-wrapper">
      <div className="ao-container">
        {/* ===== Header ===== */}
        <header className="ao-header">
          <div className="ao-header-left">
            <h2 className="ao-title">📦 Order Dashboard</h2>
            <p className="ao-subtitle">
              {allOrders.length} orders loaded
              {hasMore && " (more available on server)"}
            </p>
            {error && <p className="ao-error">{error}</p>}
          </div>
          <div className="ao-header-actions">
            <button
              className="ao-btn ao-btn-primary"
              onClick={() => exportAllOrders(filteredOrders)}
            >
              📥 Export
            </button>
            <button
              className="ao-btn ao-btn-outline"
              onClick={() => fetchOrders(1)}
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>
        </header>

        {/* ===== Stats Row ===== */}
        <div className="ao-stats-row">
          {[
            { label: "Total", value: stats.total, color: "#2563eb" },
            { label: "Confirmed", value: stats.processing + stats.pending, color: "#2563eb" },
            { label: "Shipped", value: stats.shipped, color: "#16a34a" },
            { label: "Delivered", value: stats.delivered, color: "#059669" },
            { label: "Cancelled", value: stats.cancelled, color: "#dc2626" },
          ].map((s) => (
            <div className="ao-stat-card" key={s.label}>
              <span className="ao-stat-value" style={{ color: s.color }}>
                {s.value}
              </span>
              <span className="ao-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ===== Controls ===== */}
        <div className="ao-controls">
          <div className="ao-tabs">
            {[
              { key: "all", label: "All" },
              { key: "confirmed", label: "Confirmed" },
              { key: "shipped", label: "Shipped" },
              { key: "delivered", label: "Delivered" },
              { key: "cancelled", label: "Cancelled" },
            ].map((t) => (
              <button
                key={t.key}
                className={`ao-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="ao-controls-right">
            <div className="ao-search">
              <span className="ao-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search orders, shop, GST..."
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
                ▦
              </button>
              <button
                className={`ao-vt-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                ☰
              </button>
            </div>

            <select
              className="ao-per-page"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== Showing Info ===== */}
        <div className="ao-showing">
          Showing {(safePage - 1) * perPage + 1}–
          {Math.min(safePage * perPage, filteredOrders.length)} of{" "}
          {filteredOrders.length} orders
          {hasMore && (
            <>
              {" "}
              ·{" "}
              <button
                className="ao-link-btn"
                onClick={loadMoreFromServer}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>{" "}
              ·{" "}
              <button
                className="ao-link-btn"
                onClick={loadAllFromServer}
                disabled={loadingMore}
              >
                Load All
              </button>
            </>
          )}
        </div>

        {/* ===== Content ===== */}
        {loading ? (
          <div className="ao-loader">
            <div className="ao-spinner" />
            <p>Loading orders...</p>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="ao-empty">
            <p>📭 No orders found</p>
          </div>
        ) : viewMode === "table" ? (
          /* ===== TABLE VIEW ===== */
          <div className="ao-table-wrap">
            <table className="ao-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Shop Details</th>
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
                {paginatedOrders.map((o) => {
                  return (
                    <tr key={o._id} className={`ao-tr-${o.status === "pending" ? "processing" : o.status}`}>
                      <td className="ao-td-mono">
                        #{o.orderNumber || o._id.slice(-6)}
                      </td>
                      <td>
                        {new Date(o.createdAt).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short" }
                        )}
                      </td>
                      <td>
                        <div className="ao-td-customer">
                          <strong>
                            {o.shippingAddress?.shopName || o.customerId?.shopName || "Guest"}
                          </strong>
                          <small>
                            GST: {o.shippingAddress?.gstNumber || "N/A"}
                          </small>
                          <small>
                            {o.customerId?.otpMobile || ""}
                          </small>
                        </div>
                      </td>
                      <td>{o.shippingAddress?.isDifferentShipping ? o.shippingAddress.shippingCity : (o.shippingAddress?.city || "-")}</td>
                      <td>{o.items?.length || 0}</td>
                      <td className="ao-td-price">
                        ₹{o.total.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`ao-pay-badge ${
                            o.paymentMode === "ONLINE"
                              ? "online"
                              : "cod"
                          }`}
                        >
                          {o.paymentMode === "ONLINE"
                            ? "Online"
                            : "COD"}
                        </span>
                        {o.paymentMode === "COD" && (o.advancePaid || 0) > 0 && (
                          <div style={{ fontSize: "11px", marginTop: "4px", color: "#16a34a", fontWeight: "bold" }}>
                            Adv: ₹{o.advancePaid} <br/>
                            <span style={{ color: "#dc2626" }}>Bal: ₹{o.remainingAmount ?? (o.total - o.advancePaid!)}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          className="ao-status-sel"
                          value={o.status === "pending" ? "processing" : o.status}
                          disabled={actOn === o._id}
                          onChange={(e) =>
                            updateStatus(
                              o._id,
                              e.target.value as OrderStatus
                            )
                          }
                        >
                          <option value="processing">
                            Confirmed
                          </option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">
                            Delivered
                          </option>
                          {/* ✅ Yahan se Cancelled ka option hata diya hai */}
                        </select>
                      </td>
                      <td>
                        {o.trackingId ? (
                          <span className="ao-tracking-mini">
                            {o.courierName}: {o.trackingId}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <div className="ao-td-actions">
                          <button
                            className="ao-act-btn"
                            onClick={() => setViewing(o)}
                            title="View"
                          >
                            👁
                          </button>
                          <button
                            className="ao-act-btn"
                            onClick={() => openShipModal(o)}
                            title="Ship"
                          >
                            🚚
                          </button>
                          <button
                            className="ao-act-btn danger"
                            onClick={() => deleteOrder(o._id)}
                            title="Delete"
                          >
                            🗑
                          </button>
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
          <div className="ao-grid">
            {paginatedOrders.map((o) => {
              const wa = normalizeWhatsApp91(
                o.customerId?.whatsapp || o.customerId?.otpMobile
              );
              return (
                <div
                  className={`ao-card ao-status-${o.status === "pending" ? "processing" : o.status}`}
                  key={o._id}
                >
                  <div className="ao-card-top">
                    <span className="ao-order-id">
                      #{o.orderNumber || o._id.slice(-6)}
                    </span>
                    <div className="ao-card-badges">
                      <span className={`ao-badge ${o.status === "pending" ? "processing" : o.status}`}>
                        {statusLabel(o.status)}
                      </span>
                      {o.wa?.orderConfirmedSent && (
                        <span className="ao-wa-badge">✓ WA</span>
                      )}
                      {o.status === "cancelled" && (
                        <span className="ao-cancel-badge">
                          🚫 {o.cancelledBy || "Cancelled"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ao-card-body">
                    <div className="ao-info-row">
                      <div className="ao-info">
                        <label>Shop / Business</label>
                        <strong>
                          {o.shippingAddress?.shopName || o.customerId?.shopName || "Guest"}
                        </strong>
                        <small>
                          GST: {o.shippingAddress?.gstNumber || "N/A"}
                        </small>
                        <small>
                          📞 {o.customerId?.otpMobile || "-"}
                        </small>
                      </div>
                      <div className="ao-info ao-right">
                        <label>Total</label>
                        <span className="ao-price">
                          ₹{o.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="ao-info-row">
                      <div className="ao-info">
                        <label>Location</label>
                        <span>
                          {o.shippingAddress?.isDifferentShipping ? o.shippingAddress.shippingCity : (o.shippingAddress?.city || "N/A")}
                        </span>
                      </div>
                      <div className="ao-info ao-right">
                        <label>Payment</label>
                        <span
                          className={`ao-pay-label ${
                            o.paymentMode === "ONLINE"
                              ? "online"
                              : "cod"
                          }`}
                        >
                          {paymentLabel(o.paymentMode)}
                        </span>
                        {o.paymentMode === "COD" && (o.advancePaid || 0) > 0 && (
                          <div style={{ fontSize: "12px", marginTop: "2px", color: "#16a34a", fontWeight: "bold" }}>
                            Adv: ₹{o.advancePaid} | <span style={{ color: "#dc2626" }}>Bal: ₹{o.remainingAmount ?? (o.total - o.advancePaid!)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ao-info-row">
                      <div className="ao-info">
                        <label>Date</label>
                        <span>
                          {new Date(
                            o.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="ao-info ao-right">
                        <label>Items</label>
                        <span>{o.items?.length || 0}</span>
                      </div>
                    </div>

                    {o.isShipped && o.trackingId && (
                      <div className="ao-tracking-row">
                        🚚 {o.courierName || "Courier"}:{" "}
                        <b>{o.trackingId}</b>
                      </div>
                    )}
                  </div>

                  <div className="ao-card-actions">
                    <button
                      className="ao-act-btn"
                      onClick={() => setViewing(o)}
                    >
                      👁️ View
                    </button>
                    <select
                      className="ao-status-sel"
                      value={o.status === "pending" ? "processing" : o.status}
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
                      {/* ✅ Yahan se bhi Cancelled ka option hata diya hai */}
                    </select>
                    <button
                      className={`ao-ship-btn ${
                        o.isShipped ? "shipped" : ""
                      }`}
                      disabled={actOn === o._id}
                      onClick={() => openShipModal(o)}
                    >
                      {o.isShipped ? "✏️ Update" : "🚚 Ship"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== Pagination ===== */}
        {totalPages > 1 && (
          <div className="ao-pagination">
            <button
              className="ao-pg-btn"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
            >
              ⟪
            </button>
            <button
              className="ao-pg-btn"
              disabled={safePage <= 1}
              onClick={() =>
                setCurrentPage((p) => Math.max(1, p - 1))
              }
            >
              ‹
            </button>

            {getPageRange().map((p) => (
              <button
                key={p}
                className={`ao-pg-btn ${
                  p === safePage ? "active" : ""
                }`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}

            <button
              className="ao-pg-btn"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(totalPages, p + 1)
                )
              }
            >
              ›
            </button>
            <button
              className="ao-pg-btn"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              ⟫
            </button>

            <span className="ao-pg-info">
              Page {safePage} of {totalPages}
            </span>
          </div>
        )}

        {/* ===== Load More Bar ===== */}
        {hasMore && (
          <div className="ao-load-more-bar">
            <button
              className="ao-btn ao-btn-outline"
              onClick={loadMoreFromServer}
              disabled={loadingMore}
            >
              {loadingMore
                ? "⏳ Loading..."
                : `📥 Load Next ${SERVER_LIMIT} Orders`}
            </button>
            <button
              className="ao-btn ao-btn-outline"
              onClick={loadAllFromServer}
              disabled={loadingMore}
            >
              📦 Load All Orders
            </button>
          </div>
        )}
      </div>

      {/* ===== Detail Modal ===== */}
      {viewing && (
        <div
          className="ao-modal-backdrop"
          onClick={() => setViewing(null)}
        >
          <div
            className="ao-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', width: '95%' }}
          >
            <div className="ao-modal-header">
              <h3>
                Order #{viewing.orderNumber}{" "}
                <span className="ao-modal-status">
                  ({statusLabel(viewing.status)})
                </span>
              </h3>
              <button
                className="ao-close"
                onClick={() => setViewing(null)}
              >
                ×
              </button>
            </div>

            <div className="ao-modal-toolbar">
              <button
                className="ao-btn ao-btn-outline"
                onClick={() => exportSingleOrder(viewing)}
              >
                ⬇ Excel
              </button>
              <button
                className="ao-btn ao-btn-outline"
                onClick={() => generateInvoice(viewing)}
              >
                📄 Invoice
              </button>
              <button
                className="ao-btn ao-btn-danger"
                onClick={() => deleteOrder(viewing._id)}
              >
                🗑 Delete
              </button>
            </div>

            <div className="ao-modal-grid">
              <div className="ao-modal-section">
                <h4>Billing Details</h4>
                <p>
                  <strong>
                    {viewing.shippingAddress?.shopName || viewing.customerId?.shopName}
                  </strong>
                </p>
                <p>
                  <strong>GST:</strong> {viewing.shippingAddress?.gstNumber || "N/A"}
                </p>
                <p>📞 {viewing.shippingAddress?.phone || viewing.customerId?.otpMobile}</p>
                <p>
                  💬{" "}
                  {normalizeWhatsApp91(
                    viewing.customerId?.whatsapp ||
                      viewing.customerId?.otpMobile
                  )}
                </p>
              </div>
              <div className="ao-modal-section">
                <h4>Shipping Address</h4>
                {viewing.shippingAddress ? (
                  <>
                    <p>
                      <strong>
                        {viewing.shippingAddress.fullName}
                      </strong>
                    </p>
                    {viewing.shippingAddress.isDifferentShipping ? (
                      <>
                        <p>{viewing.shippingAddress.shippingStreet}</p>
                        <p>{viewing.shippingAddress.shippingArea}</p>
                        <p>{viewing.shippingAddress.shippingCity}, {viewing.shippingAddress.shippingState} - {viewing.shippingAddress.shippingPincode}</p>
                      </>
                    ) : (
                      <>
                        <p>{viewing.shippingAddress.street}</p>
                        <p>{viewing.shippingAddress.area}</p>
                        <p>{viewing.shippingAddress.city}, {viewing.shippingAddress.state} - {viewing.shippingAddress.pincode}</p>
                      </>
                    )}
                  </>
                ) : (
                  <p className="ao-muted">
                    No address provided
                  </p>
                )}
              </div>
            </div>

            {viewing.isShipped && viewing.trackingId && (
              <div className="ao-modal-tracking">
                <span>
                  🚚 <b>{viewing.courierName}</b>:{" "}
                  {viewing.trackingId}
                </span>
                {getExternalTrackingLink(
                  viewing.courierName,
                  viewing.trackingId
                ) && (
                  <a
                    href={
                      getExternalTrackingLink(
                        viewing.courierName,
                        viewing.trackingId
                      )!
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    🌐 Track Live
                  </a>
                )}
              </div>
            )}

            <div className="ao-modal-items">
              <h4>Items ({viewing.items.length})</h4>
              {viewing.items.map((it, i) => (
                <div key={i} className="ao-modal-item">
                  <div className="ao-modal-item-left">
                    {it.image && (
                      <img
                        src={resolveImage(it.image)}
                        alt=""
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>
                        {it.name} (x{it.qty})
                      </span>
                      <small style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                        SKU: {it.sku || it.productId?.sku || "N/A"}
                      </small>
                    </div>
                  </div>
                  <span className="ao-modal-item-price">
                    ₹{(it.price * it.qty).toFixed(2)}
                  </span>
                </div>
              ))}
              
              <div className="ao-modal-total" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                <span style={{ fontSize: '14px', color: '#475569' }}>Total Amount: ₹{viewing.total}</span>
                {viewing.paymentMode === "COD" && (viewing.advancePaid || 0) > 0 && (
                  <>
                    <span style={{ color: '#16a34a', fontSize: '14px' }}>Advance Paid: ₹{viewing.advancePaid}</span>
                    <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '14px' }}>
                      To Collect (COD): ₹{viewing.remainingAmount ?? (viewing.total - viewing.advancePaid!)}
                    </span>
                  </>
                )}
                <span style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '5px' }}>
                  Grand Total: ₹{viewing.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Ship Modal ===== */}
      {shipOpen && shipOrder && (
        <div
          className="ao-modal-backdrop"
          onClick={closeShipModal}
        >
          <div
            className="ao-modal ao-modal-sm"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '20px' }}
          >
            <div className="ao-modal-header">
              <h3 style={{ margin: 0 }}>
                🚚 Ship #{shipOrder.orderNumber}
              </h3>
              <button
                className="ao-close"
                onClick={closeShipModal}
              >
                ×
              </button>
            </div>
            
            <div className="ao-ship-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Courier</label>
                <select
                  value="Delhivery"
                  disabled
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f1f5f9' }}
                >
                  <option value="Delhivery">Delhivery</option>
                </select>
              </div>

              {shipOrder?.paymentMode !== "ONLINE" && (
                <div style={{ background: '#fff7ed', padding: '15px', borderRadius: '6px', border: '1px solid #fdba74' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#9a3412' }}>
                    Advance Received Manually (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={shipOrder.total}
                    value={manualAdvance || ''}
                    onChange={(e) => setManualAdvance(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #fdba74', borderRadius: '4px' }}
                    placeholder="e.g. 1000"
                  />
                  <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold', color: '#c2410c' }}>
                    Delhivery will collect: ₹{shipOrder.total - (manualAdvance || 0)}
                  </div>
                </div>
              )}

              {/* ✅ Delhivery Box System */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '10px', fontWeight: 'bold' }}>
                  📦 Pack Details (Auto-generates AWB via API)
                </p>
                
                {(['A28', 'A06', 'A08', 'A31'] as const).map((size) => (
                  <div key={size} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ width: '70px', fontSize: '13px', fontWeight: '600' }}>{size}</span>
                    <input
                      type="number"
                      placeholder="Qty"
                      min="0"
                      value={boxes[size].qty || ''}
                      onChange={(e) => handleBoxChange(size, 'qty', e.target.value)}
                      style={{ width: '70px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                    />
                    <input
                      type="number"
                      placeholder="Wt (kg)"
                      min="0"
                      step="0.1"
                      value={boxes[size].weight || ''}
                      onChange={(e) => handleBoxChange(size, 'weight', e.target.value)}
                      style={{ width: '80px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>
                ))}
              </div>

              {shipErr && (
                <p className="ao-ship-error" style={{ color: 'red', fontSize: '13px', margin: 0 }}>
                  {shipErr}
                </p>
              )}

              <div className="ao-ship-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  className="ao-btn ao-btn-outline"
                  onClick={closeShipModal}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  className="ao-btn ao-btn-primary"
                  onClick={submitShip}
                  disabled={actOn === shipOrder._id}
                  style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {actOn === shipOrder._id ? "Saving..." : "Generate AWB & Ship"}
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