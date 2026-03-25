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

const getExternalTrackingLink = (courier?: string) => {
  const cName = norm(courier);
  if (cName.includes("delhivery"))
    return "https://www.delhivery.com/tracking";
  return null;
};

const statusLabel = (s: OrderStatus) => {
  if (s === "processing") return "Confirmed";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* --- Export Functions --- */
const exportAllOrders = (orders: Order[]) => {
  const rows = orders.map((o) => {
    const wa = normalizeWhatsApp91(o.customerId?.whatsapp || o.customerId?.otpMobile);
    const addr = o.shippingAddress;
    
    const finalShippingAddress = addr?.isDifferentShipping 
      ? `${addr.shippingStreet || ""}, ${addr.shippingArea || ""}`
      : `${addr?.street || ""}, ${addr?.area || ""}`;
    const finalShippingCity = addr?.isDifferentShipping ? addr.shippingCity : addr?.city;
    const finalShippingState = addr?.isDifferentShipping ? addr.shippingState : addr?.state;
    const finalShippingPincode = addr?.isDifferentShipping ? addr.shippingPincode : addr?.pincode;

    return {
      OrderNumber: o.orderNumber || o._id.slice(-6),
      Status: statusLabel(o.status as OrderStatus) + (o.status === "cancelled" && o.cancelledBy ? ` (${o.cancelledBy})` : ""),
      Total: o.total,
      Payment_Mode: paymentLabel(o.paymentMode),
      CreatedAt: formatExcelDate(o.createdAt),
      Shop: addr?.shopName || o.customerId?.shopName || "", 
      GST_Number: addr?.gstNumber || "-", 
      Phone: o.customerId?.otpMobile || "",
      WhatsApp: wa || "",
      ShippingName: addr?.fullName || "",
      ShippingPhone: addr?.phone || "",
      ShippingAddress: finalShippingAddress,
      ShippingCity: finalShippingCity || "",
      ShippingState: finalShippingState || "",
      ShippingPincode: finalShippingPincode || "",
      TotalPackets: o.items.reduce((sum, it) => sum + toInners(it), 0),
      TrackingID: o.trackingId || "-",
      Courier: o.courierName || "-",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), "Bafnatoys_All_Orders.xlsx");
};

const exportSingleOrder = (order: Order) => {
  const createdAt = formatExcelDate(order.createdAt);
  const wa = normalizeWhatsApp91(order.customerId?.whatsapp || order.customerId?.otpMobile);
  const addr = order.shippingAddress;

  const finalShippingAddress = addr?.isDifferentShipping 
      ? `${addr.shippingStreet || ""}, ${addr.shippingArea || ""}`
      : `${addr?.street || ""}, ${addr?.area || ""}`;

  const rows = order.items.map((it) => ({
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Status: statusLabel(order.status),
    Payment_Mode: paymentLabel(order.paymentMode),
    Shop: addr?.shopName || order.customerId?.shopName || "", 
    GST_Number: addr?.gstNumber || "-", 
    Phone: order.customerId?.otpMobile || "",
    WhatsApp: wa || "",
    ShippingName: addr?.fullName || "",
    ShippingAddress: finalShippingAddress,
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
  
  const content = `<!DOCTYPE html><html><head><title>Invoice - ${order.orderNumber || order._id.slice(-6)}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;background:#fff;color:#333}.invoice-container{max-width:850px;margin:0 auto;border:1px solid #ddd;padding:30px}.header{text-align:center;margin-bottom:25px;border-bottom:3px solid #2c5aa0;padding-bottom:15px}.header img{max-height:70px}.invoice-details{display:flex;justify-content:space-between;gap:14px;margin-bottom:25px}.detail-section{width:32%}.detail-section h3{font-size:15px;color:#2c5aa0;border-bottom:1px solid #ddd;margin-bottom:5px}table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}th{background:#2c5aa0;color:#fff;padding:10px;text-align:left}td{padding:10px;border-bottom:1px solid #eee}.footer{margin-top:40px;text-align:center;font-size:12px;color:#777}@media print{.btn-hide{display:none}}</style></head><body><div class="invoice-container"><div class="header"><img src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png" alt="BafnaToys"/><p>1-12, Thondamuthur Road, Coimbatore - 641007<br>+91 9043347300 | bafnatoysphotos@gmail.com</p><h2>PRO FORMA INVOICE</h2></div><div class="invoice-details"><div class="detail-section"><h3>Bill To</h3><p><strong>${addr?.shopName || order.customerId?.shopName || "-"}</strong><br>GST: ${addr?.gstNumber || "-"}<br>Mobile: ${order.customerId?.otpMobile || "-"}<br>WhatsApp: ${wa || "-"}</p></div><div class="detail-section"><h3>Ship To</h3><p>${shippingHtml}</p></div><div class="detail-section"><h3>Order Details</h3><p>Invoice: ${order.orderNumber}<br>Date: ${currentDate}<br>Payment: ${paymentText}<br>${order.trackingId ? `AWB: ${order.trackingId}` : ""}</p></div></div><table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${order.items.map((it) => `<tr><td>${it.name}</td><td>${it.qty}</td><td>₹${it.price}</td><td>₹${it.qty * it.price}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3" align="right"><strong>Total</strong></td><td><strong>₹${order.total}</strong></td></tr></tfoot></table><div class="footer"><p>Thank you for choosing BafnaToys!</p></div></div><div style="text-align:center;margin-top:20px" class="btn-hide"><button onclick="window.print()" style="padding:10px 20px;background:#2c5aa0;color:white;border:none;cursor:pointer">Print Invoice</button></div></body></html>`;
  printWindow.document.write(content);
  printWindow.document.close();
};

/* --- ✅ COURIERS UPDATED: ONLY DELHIVERY --- */
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // View mode
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Server pagination tracking
  const [serverPage, setServerPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalFromServer, setTotalFromServer] = useState(0);
  const SERVER_LIMIT = 200; 

  // Ship modal
  const [shipOpen, setShipOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState<Order | null>(null);
  const [shipCourier, setShipCourier] = useState<string>(COURIERS[0]);
  const [shipTracking, setShipTracking] = useState<string>("");
  const [shipErr, setShipErr] = useState<string>("");

  // ✅ NEW: State for Delhivery Boxes
  const [boxes, setBoxes] = useState({
    SMALL: { qty: 0, weight: 0 },
    MEDIUM: { qty: 0, weight: 0 },
    LARGE: { qty: 0, weight: 0 },
  });

  const handleBoxChange = (size: 'SMALL' | 'MEDIUM' | 'LARGE', field: 'qty' | 'weight', value: string) => {
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
    try {
      setActOn(id);
      const payload =
        status === "cancelled"
          ? { status, cancelledBy: "Admin" }
          : { status };

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
      await axios.delete(`${API_BASE}/orders/${id}`, {
        headers: authHeaders(),
      });
      setAllOrders((prev) => prev.filter((o) => o._id !== id));
      if (viewing?._id === id) setViewing(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  };

  /* ===== Ship Modal Logic ===== */
  const openShipModal = (o: Order) => {
    setShipOrder(o);
    setShipErr("");
    
    // Reset Boxes for new modal open
    setBoxes({
      SMALL: { qty: 0, weight: 0 },
      MEDIUM: { qty: 0, weight: 0 },
      LARGE: { qty: 0, weight: 0 },
    });

    setShipCourier(COURIERS[0]); // Default to Delhivery
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
    
    let payload: any = { status: "shipped", courierName: courier };

    if (courier === "Delhivery") {
      const totalQty = boxes.SMALL.qty + boxes.MEDIUM.qty + boxes.LARGE.qty;
      if (totalQty === 0) {
        return setShipErr("Please add at least 1 box for Delhivery shipment.");
      }
      
      const packingDetails = [
        { boxType: "SMALL", quantity: boxes.SMALL.qty, totalWeight: boxes.SMALL.weight },
        { boxType: "MEDIUM", quantity: boxes.MEDIUM.qty, totalWeight: boxes.MEDIUM.weight },
        { boxType: "LARGE", quantity: boxes.LARGE.qty, totalWeight: boxes.LARGE.weight },
      ].filter(b => b.quantity > 0);

      payload.packingDetails = packingDetails;
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
      const mapped =
        activeTab === "confirmed" ? "processing" : activeTab;
      list = list.filter((o) => o.status === mapped);
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
            { label: "Pending", value: stats.pending, color: "#ca8a04" },
            { label: "Confirmed", value: stats.processing, color: "#2563eb" },
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
              { key: "pending", label: "Pending" },
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
                    <tr key={o._id} className={`ao-tr-${o.status}`}>
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
                      </td>
                      <td>
                        <select
                          className="ao-status-sel"
                          value={o.status}
                          disabled={actOn === o._id}
                          onChange={(e) =>
                            updateStatus(
                              o._id,
                              e.target.value as OrderStatus
                            )
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">
                            Confirmed
                          </option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">
                            Delivered
                          </option>
                          <option value="cancelled">
                            Cancelled
                          </option>
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
                  className={`ao-card ao-status-${o.status}`}
                  key={o._id}
                >
                  <div className="ao-card-top">
                    <span className="ao-order-id">
                      #{o.orderNumber || o._id.slice(-6)}
                    </span>
                    <div className="ao-card-badges">
                      <span className={`ao-badge ${o.status}`}>
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
                      value={o.status}
                      disabled={actOn === o._id}
                      onChange={(e) =>
                        updateStatus(
                          o._id,
                          e.target.value as OrderStatus
                        )
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
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
                  viewing.courierName
                ) && (
                  <a
                    href={
                      getExternalTrackingLink(
                        viewing.courierName
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
                    <span>
                      {it.name} (x{it.qty})
                    </span>
                  </div>
                  <span className="ao-modal-item-price">
                    ₹{(it.price * it.qty).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="ao-modal-total">
                Grand Total: ₹{viewing.total}
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
                {/* 🔒 Select box disabled, only Delhivery is shown */}
                <select
                  value="Delhivery"
                  disabled
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f1f5f9' }}
                >
                  <option value="Delhivery">Delhivery</option>
                </select>
              </div>

              {/* ✅ Delhivery Box System */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '10px', fontWeight: 'bold' }}>
                  📦 Pack Details (Auto-generates AWB via API)
                </p>
                
                {(['SMALL', 'MEDIUM', 'LARGE'] as const).map((size) => (
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