import React, { useEffect, useMemo, useState, useCallback } from "react";
import api, { MEDIA_URL } from "../utils/api";   // ✅ use shared api + MEDIA_URL
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

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

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

// ✅ universal resolver
const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  return `${MEDIA_URL}${img}`;
};

const statusMeta: Record<OrderStatus, { color: string; icon: string; text: string }> = {
  pending:    { color: "#FFD600", icon: "⏳", text: "Pending" },
  processing: { color: "#2196F3", icon: "🔄", text: "Processing" },
  shipped:    { color: "#64B5F6", icon: "🚚", text: "Shipped" },
  delivered:  { color: "#43A047", icon: "✅", text: "Delivered" },
  cancelled:  { color: "#E53935", icon: "❌", text: "Cancelled" },
};

const norm = (v?: string | number) => (v ?? "").toString().toLowerCase().trim();

const highlight = (text: string, q: string) => {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match  = text.slice(idx, idx + q.length);
  const after  = text.slice(idx + q.length);
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
      const { data } = await api.get<Order[]>("/orders");   // ✅ no localhost
      setOrders(data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      setActOn(id);
      const { data } = await api.patch<Order>(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => (o._id === id ? { ...o, status: data.status } : o)));
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
      setOrders(prev => prev.filter(o => o._id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Delete failed");
    }
  };

  const formatDate = (iso?: string): string => (iso ? new Date(iso).toLocaleString() : "-");

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
      const inItems = o.items?.some(it => norm(it.name).includes(q));
      return inOrderNum || inIdSuffix || inCustomer || inLocation || inPayment || inStatus || inItems;
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

      {/* ... your UI stays same, I only swapped API_BASE with api + MEDIA_URL ... */}
    </div>
  );
};

export default AdminOrders;
