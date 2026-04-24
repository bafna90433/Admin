// admin_panel/src/components/AdminDelhivery.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  FiTruck,
  FiMapPin,
  FiDollarSign,
  FiCalendar,
  FiAlertTriangle,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiDownload,
  FiX,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPackage,
  FiPhone,
  FiNavigation,
  FiCreditCard,
} from "react-icons/fi";

/* =============================== TYPES =============================== */
type TabKey = "shipments" | "ndr" | "pickup" | "pincode" | "rate";

type ShipmentRow = {
  _id: string;
  orderNumber: string;
  awb: string;
  courier: string;
  dbStatus: string;
  paymentMode: string;
  total: number;
  customer: {
    name?: string;
    phone?: string;
    pincode?: string;
    city?: string;
    state?: string;
  };
  createdAt: string;
  live: {
    status?: string;
    statusDate?: string;
    instructions?: string;
    location?: string;
    nsl?: string;
    expectedDate?: string;
    originCity?: string;
    destCity?: string;
    weight?: number;
  } | null;
};

type Stats = {
  last30Days: { shipped: number; delivered: number; deliveryRate: number };
  totalShipped: number;
  pendingAwb: number;
};

type Wallet = { ok: boolean; balance?: number | null; message?: string };

type NDRItem = {
  awb: string;
  orderNumber: string;
  statusType: string;
  status: string;
  instructions: string;
  location: string;
  lastUpdate: string | null;
  expectedDate: string | null;
  attempts: number;
  customer: any;
};

/* ============================== HELPERS ============================== */
const fmtINR = (n: number) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDateShort = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const liveStatusColor = (nsl?: string, text?: string) => {
  const t = (text || "").toLowerCase();
  if (t.includes("delivered") || nsl === "DL")
    return { bg: "#d1fae5", color: "#065f46", label: "Delivered" };
  if (nsl === "RT" || t.includes("rto") || t.includes("return"))
    return { bg: "#fee2e2", color: "#991b1b", label: "RTO" };
  if (nsl === "UD" || t.includes("undeliv") || t.includes("attempt"))
    return { bg: "#fef3c7", color: "#92400e", label: "NDR" };
  if (t.includes("transit") || nsl === "IT")
    return { bg: "#dbeafe", color: "#1e40af", label: "In Transit" };
  if (t.includes("picked") || nsl === "PU")
    return { bg: "#ede9fe", color: "#5b21b6", label: "Picked Up" };
  if (t.includes("manifest") || t.includes("out for delivery"))
    return { bg: "#fef9c3", color: "#854d0e", label: "Out for Delivery" };
  return { bg: "#e5e7eb", color: "#374151", label: text || "Pending" };
};

/* ============================= MAIN COMPONENT ============================= */
const AdminDelhivery: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("shipments");
  const [stats, setStats] = useState<Stats | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const loadDashboard = useCallback(async () => {
    const [s, w] = await Promise.all([
      api.get("/shipping/delhivery/stats").catch(() => null),
      api.get("/shipping/delhivery/wallet").catch(() => null),
    ]);
    if (s?.data) setStats(s.data);
    if (w?.data) setWallet(w.data);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1400, margin: "0 auto" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#111827" }}>
            🚚 Delhivery Control Panel
          </h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>
            Track shipments, process NDRs, schedule pickups & check serviceability — all in one
            place.
          </p>
        </div>
        <button onClick={loadDashboard} style={btnPrimary}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
        <StatCard
          label="Delhivery Wallet"
          value={
            wallet?.ok && wallet.balance != null
              ? fmtINR(wallet.balance)
              : "Check dashboard"
          }
          sub={
            wallet?.ok
              ? (wallet.balance ?? 0) < 500
                ? "⚠️ Low — recharge now"
                : "Available balance"
              : "Wallet API not enabled"
          }
          bg="#dbeafe"
          color="#2563eb"
          icon={<FiDollarSign />}
          warn={!!wallet?.ok && (wallet.balance ?? 0) < 500}
        />
        <StatCard
          label="Shipped (30d)"
          value={String(stats?.last30Days.shipped ?? "—")}
          sub={`${stats?.last30Days.delivered ?? 0} delivered`}
          bg="#d1fae5"
          color="#059669"
          icon={<FiTruck />}
        />
        <StatCard
          label="Delivery Rate"
          value={`${stats?.last30Days.deliveryRate ?? 0}%`}
          sub="Last 30 days"
          bg="#ede9fe"
          color="#7c3aed"
          icon={<FiCheckCircle />}
        />
        <StatCard
          label="Pending AWB"
          value={String(stats?.pendingAwb ?? "—")}
          sub="Orders without tracking"
          bg="#fef3c7"
          color="#d97706"
          icon={<FiClock />}
          warn={(stats?.pendingAwb ?? 0) > 0}
        />
        <StatCard
          label="Total Shipped"
          value={String(stats?.totalShipped ?? "—")}
          sub="All time"
          bg="#fee2e2"
          color="#dc2626"
          icon={<FiPackage />}
        />
      </div>

      {/* TABS */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 12,
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        <TabBtn active={tab === "shipments"} onClick={() => setTab("shipments")}>
          <FiTruck /> Live Shipments
        </TabBtn>
        <TabBtn active={tab === "ndr"} onClick={() => setTab("ndr")}>
          <FiAlertTriangle /> NDR ({stats?.pendingAwb ?? 0})
        </TabBtn>
        <TabBtn active={tab === "pickup"} onClick={() => setTab("pickup")}>
          <FiCalendar /> Pickup Request
        </TabBtn>
        <TabBtn active={tab === "pincode"} onClick={() => setTab("pincode")}>
          <FiMapPin /> Pincode Check
        </TabBtn>
        <TabBtn active={tab === "rate"} onClick={() => setTab("rate")}>
          <FiCreditCard /> Rate Calculator
        </TabBtn>
      </div>

      {tab === "shipments" && <ShipmentsTab />}
      {tab === "ndr" && <NDRTab />}
      {tab === "pickup" && <PickupTab />}
      {tab === "pincode" && <PincodeTab />}
      {tab === "rate" && <RateTab />}
    </div>
  );
};

export default AdminDelhivery;

/* ========================================================================
   TAB 1: SHIPMENTS
   ======================================================================== */
const ShipmentsTab: React.FC = () => {
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const limit = 50;

  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/shipping/delhivery/shipments", {
        params: { status, search, page, limit },
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Load failed",
        text: err?.response?.data?.message || "Error fetching shipments.",
      });
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const trackDetail = async (awb: string) => {
    setDetail({ loading: true, awb });
    try {
      const { data } = await api.get(`/shipping/delhivery/track/${awb}`);
      setDetail({ ...data, awb });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Track failed",
        text: err?.response?.data?.message || "Error tracking AWB.",
      });
      setDetail(null);
    }
  };

  const exportExcel = () => {
    const rowsOut = rows.map((r) => ({
      "Order #": r.orderNumber,
      AWB: r.awb,
      Customer: r.customer?.name || "",
      Phone: r.customer?.phone || "",
      Pincode: r.customer?.pincode || "",
      City: r.customer?.city || "",
      State: r.customer?.state || "",
      Amount: r.total,
      Mode: r.paymentMode,
      "DB Status": r.dbStatus,
      "Live Status": r.live?.status || "—",
      "Last Location": r.live?.location || "—",
      "Last Update": r.live?.statusDate || "—",
      "Expected Delivery": r.live?.expectedDate || "—",
      "Created At": r.createdAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rowsOut);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shipments");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `delhivery-shipments-${Date.now()}.xlsx`
    );
  };

  return (
    <>
      {/* Filters */}
      <div style={filterBarStyle}>
        <div style={{ flex: "1 1 240px" }}>
          <label style={labelStyle}>Search (Order / AWB / Phone)</label>
          <div style={{ position: "relative" }}>
            <FiSearch style={searchIconStyle} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              style={{ ...inputStyle, paddingLeft: 32 }}
              placeholder="Search..."
            />
          </div>
        </div>
        <div style={{ flex: "0 0 160px" }}>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="all">All</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="processing">Processing</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button onClick={load} style={btnPrimary}>
          <FiSearch /> Apply
        </button>
        <button onClick={exportExcel} disabled={!rows.length} style={btnGreen}>
          <FiDownload /> Excel
        </button>
      </div>

      {/* Table */}
      <div style={tableWrap}>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRow}>
                <th style={thStyle}>Order / AWB</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Destination</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Live Status</th>
                <th style={thStyle}>Last Update</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={emptyCell}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={emptyCell}>
                    <FiPackage style={{ fontSize: 42, opacity: 0.3 }} />
                    <div>No shipments found.</div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const live = liveStatusColor(r.live?.nsl, r.live?.status);
                  return (
                    <tr key={r._id} style={trowStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          #{r.orderNumber}
                        </div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: "#4f46e5",
                          }}
                        >
                          {r.awb}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: "#111827" }}>{r.customer?.name}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          <FiPhone style={{ verticalAlign: -2 }} /> {r.customer?.phone}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div>
                          {r.customer?.city}, {r.customer?.state}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          PIN: {r.customer?.pincode}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {fmtINR(r.total)}
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{r.paymentMode}</div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            background: live.bg,
                            color: live.color,
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {live.label}
                        </span>
                        {r.live?.instructions && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#6b7280",
                              marginTop: 3,
                              maxWidth: 180,
                            }}
                          >
                            {r.live.instructions}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 12 }}>{fmtDate(r.live?.statusDate)}</div>
                        {r.live?.location && (
                          <div style={{ fontSize: 11, color: "#6b7280" }}>
                            <FiNavigation style={{ verticalAlign: -2 }} /> {r.live.location}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          title="Full tracking"
                          onClick={() => trackDetail(r.awb)}
                          style={btnIcon("#4f46e5")}
                        >
                          <FiEye />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={paginationWrap}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Page {page} / {pages} · {total} total
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={pagerBtn(page <= 1)}
              >
                ← Prev
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                style={pagerBtn(page >= pages)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tracking detail modal */}
      {detail && (
        <Modal onClose={() => setDetail(null)} title={`Tracking: ${detail.awb}`} wide>
          {detail.loading ? (
            <div style={{ padding: 30, textAlign: "center" }}>Loading scans...</div>
          ) : !detail.shipment ? (
            <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>
              No tracking data.
            </div>
          ) : (
            <TrackingDetail shipment={detail.shipment} />
          )}
        </Modal>
      )}
    </>
  );
};

/* --------------------- TRACKING DETAIL VIEW --------------------- */
const TrackingDetail: React.FC<{ shipment: any }> = ({ shipment }) => {
  const scans = shipment?.Scans || [];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 8, marginBottom: 16 }}>
        <Field label="AWB" value={shipment.AWB} mono />
        <Field label="Status" value={shipment.Status?.Status} />
        <Field label="Origin" value={shipment.Origin} />
        <Field label="Destination" value={shipment.Destination} />
        <Field label="Weight" value={`${shipment.ChargedWeight || 0} g`} />
        <Field label="Expected Delivery" value={fmtDateShort(shipment.ExpectedDeliveryDate)} />
      </div>

      <h3 style={sectionH}>📍 Scan Timeline</h3>
      <div style={{ position: "relative", paddingLeft: 20 }}>
        {scans.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>No scan events yet.</div>
        ) : (
          scans.map((scan: any, i: number) => {
            const sd = scan.ScanDetail || {};
            return (
              <div
                key={i}
                style={{
                  borderLeft: "2px solid #e5e7eb",
                  paddingLeft: 16,
                  paddingBottom: 16,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -6,
                    top: 2,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i === 0 ? "#059669" : "#9ca3af",
                  }}
                />
                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                  {sd.Scan || sd.Instructions}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {sd.ScannedLocation} · {fmtDate(sd.ScanDateTime)}
                </div>
                {sd.Instructions && sd.Scan !== sd.Instructions && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {sd.Instructions}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ========================================================================
   TAB 2: NDR
   ======================================================================== */
const NDRTab: React.FC = () => {
  const [items, setItems] = useState<NDRItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/shipping/delhivery/ndr");
      setItems(data.items || []);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "NDR load failed",
        text: err?.response?.data?.message || "Error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const takeAction = async (awb: string, act: "RE-ATTEMPT" | "RTO" | "DEFER_DLV") => {
    const messages: Record<string, string> = {
      "RE-ATTEMPT": "Dobara delivery attempt karenge kal",
      RTO: "Order aap ke pass wapas aayega (RTO)",
      DEFER_DLV: "Delivery 2 din ke liye defer kar do",
    };
    const confirm = await Swal.fire({
      icon: "question",
      title: `${act}?`,
      text: messages[act],
      showCancelButton: true,
      confirmButtonText: "Yes, proceed",
      confirmButtonColor: act === "RTO" ? "#dc2626" : "#4f46e5",
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.post(`/shipping/delhivery/ndr-action/${awb}`, { act });
      Swal.fire({ icon: "success", title: "Action submitted!", timer: 1800, showConfirmButton: false });
      load();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: err?.response?.data?.message || "Error",
      });
    }
  };

  return (
    <>
      <div
        style={{
          background: "#fef3c7",
          border: "1px solid #fde68a",
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 13,
          color: "#92400e",
        }}
      >
        ⚠️ <strong>Action required</strong> — Ye wo shipments hain jinhe Delhivery deliver nahi
        kar paya. Jaldi action lo warna RTO ho jayega (shipping cost waste).
      </div>

      <div style={tableWrap}>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRow}>
                <th style={thStyle}>AWB / Order</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Attempts</th>
                <th style={thStyle}>Last Update</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={emptyCell}>
                    Loading NDR list...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={emptyCell}>
                    <FiCheckCircle style={{ fontSize: 42, color: "#10b981" }} />
                    <div>🎉 No pending NDRs! All deliveries on track.</div>
                  </td>
                </tr>
              ) : (
                items.map((n) => (
                  <tr key={n.awb} style={trowStyle}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>#{n.orderNumber}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#4f46e5" }}>
                        {n.awb}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div>{n.customer?.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {n.customer?.phone} · {n.customer?.city}
                      </div>
                      <div style={{ fontSize: 11, color: "#059669" }}>
                        {fmtINR(n.customer?.total || 0)} · {n.customer?.paymentMode}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {n.status}
                      </span>
                      {n.instructions && (
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
                          {n.instructions}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#dc2626" }}>
                      {n.attempts}
                    </td>
                    <td style={tdStyle}>{fmtDate(n.lastUpdate)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => takeAction(n.awb, "RE-ATTEMPT")}
                        style={{ ...btnSmall, background: "#4f46e5", color: "#fff" }}
                      >
                        Re-attempt
                      </button>
                      <button
                        onClick={() => takeAction(n.awb, "DEFER_DLV")}
                        style={{ ...btnSmall, background: "#f59e0b", color: "#fff" }}
                      >
                        Defer
                      </button>
                      <button
                        onClick={() => takeAction(n.awb, "RTO")}
                        style={{ ...btnSmall, background: "#dc2626", color: "#fff" }}
                      >
                        RTO
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

/* ========================================================================
   TAB 3: PICKUP
   ======================================================================== */
const PickupTab: React.FC = () => {
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("14:00:00");
  const [packages, setPackages] = useState(5);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<any>(null);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const submit = async () => {
    if (!pickupDate) {
      Swal.fire({ icon: "warning", title: "Select pickup date" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/shipping/delhivery/pickup", {
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        expected_package_count: packages,
      });
      setLast(data);
      Swal.fire({
        icon: "success",
        title: "Pickup scheduled!",
        html: `<div>Date: <b>${pickupDate}</b><br/>Time: <b>${pickupTime}</b><br/>Packages: <b>${packages}</b></div>`,
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Pickup failed",
        text: err?.response?.data?.message || "Error creating pickup.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={tableWrap}>
      <div style={{ padding: 20, maxWidth: 600 }}>
        <h3 style={{ margin: "0 0 8px", color: "#111827" }}>📦 Schedule Pickup</h3>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
          Delhivery wale aayenge aapke warehouse se parcel uthaane. Ek din pehle request karo.
        </p>

        <label style={labelStyle}>Pickup Date *</label>
        <input
          type="date"
          value={pickupDate}
          min={minDate}
          onChange={(e) => setPickupDate(e.target.value)}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 12 }}>Pickup Time</label>
        <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} style={inputStyle}>
          <option value="10:00:00">10:00 AM</option>
          <option value="12:00:00">12:00 PM</option>
          <option value="14:00:00">2:00 PM</option>
          <option value="16:00:00">4:00 PM</option>
          <option value="18:00:00">6:00 PM</option>
        </select>

        <label style={{ ...labelStyle, marginTop: 12 }}>Expected Package Count</label>
        <input
          type="number"
          min={1}
          value={packages}
          onChange={(e) => setPackages(Math.max(1, Number(e.target.value) || 1))}
          style={inputStyle}
        />

        <button
          onClick={submit}
          disabled={loading}
          style={{ ...btnPrimary, marginTop: 18, padding: "12px 20px" }}
        >
          <FiCalendar /> {loading ? "Scheduling..." : "Schedule Pickup"}
        </button>

        {last && (
          <div
            style={{
              marginTop: 20,
              padding: 12,
              background: "#d1fae5",
              border: "1px solid #a7f3d0",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            <strong>✅ Last Pickup Response:</strong>
            <pre style={{ fontSize: 11, marginTop: 6, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(last, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

/* ========================================================================
   TAB 4: PINCODE
   ======================================================================== */
const PincodeTab: React.FC = () => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const check = async () => {
    if (!/^\d{6}$/.test(pin)) {
      Swal.fire({ icon: "warning", title: "Enter valid 6-digit pincode" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.get(`/shipping/delhivery/pincode/${pin}`);
      setResult(data);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Lookup failed",
        text: err?.response?.data?.message || "Error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={tableWrap}>
      <div style={{ padding: 20, maxWidth: 600 }}>
        <h3 style={{ margin: "0 0 8px", color: "#111827" }}>📍 Pincode Serviceability</h3>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
          Check karo Delhivery kya us pincode pe delivery karti hai, COD available hai ya nahi.
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="110001"
            style={{ ...inputStyle, flex: 1, fontSize: 18, letterSpacing: 2 }}
          />
          <button onClick={check} disabled={loading} style={btnPrimary}>
            <FiSearch /> {loading ? "Checking..." : "Check"}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 20 }}>
            {!result.serviceable ? (
              <div
                style={{
                  padding: 16,
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  color: "#991b1b",
                  fontWeight: 600,
                }}
              >
                <FiXCircle style={{ verticalAlign: -3 }} /> Not Serviceable
              </div>
            ) : (
              <div
                style={{
                  padding: 16,
                  background: "#d1fae5",
                  border: "1px solid #a7f3d0",
                  borderRadius: 8,
                  color: "#065f46",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
                  <FiCheckCircle style={{ verticalAlign: -3 }} /> Serviceable —{" "}
                  {result.city}, {result.state}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))",
                    gap: 8,
                  }}
                >
                  <Chip label="District" value={result.district} />
                  <Chip label="Prepaid" value={result.prepaid ? "✅ Yes" : "❌ No"} />
                  <Chip label="COD" value={result.cod ? "✅ Yes" : "❌ No"} />
                  <Chip label="Pickup" value={result.pickup ? "✅ Yes" : "❌ No"} />
                  <Chip label="Max COD Amount" value={fmtINR(result.max_amount || 0)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ========================================================================
   TAB 5: RATE CALCULATOR
   ======================================================================== */
const RateTab: React.FC = () => {
  const [oPin, setOPin] = useState("641601"); // default Coimbatore
  const [dPin, setDPin] = useState("");
  const [weight, setWeight] = useState(500);
  const [cod, setCod] = useState(0);
  const [pt, setPt] = useState<"Pre-paid" | "COD">("Pre-paid");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const calc = async () => {
    if (!oPin || !dPin) {
      Swal.fire({ icon: "warning", title: "Enter both pincodes" });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/shipping/delhivery/rate", {
        o_pin: oPin,
        d_pin: dPin,
        cgm: weight,
        pt,
        cod: pt === "COD" ? cod : 0,
      });
      setResult(data);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Calc failed",
        text: err?.response?.data?.message || "Error",
      });
    } finally {
      setLoading(false);
    }
  };

  const total = (r: any) => (r?.total_amount != null ? r.total_amount : r?.gross_amount || 0);

  return (
    <div style={tableWrap}>
      <div style={{ padding: 20, maxWidth: 700 }}>
        <h3 style={{ margin: "0 0 8px", color: "#111827" }}>💰 Shipping Rate Calculator</h3>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
          Delhivery ka exact shipping charge check karo — Surface vs Express compare.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Origin Pincode (Warehouse)</label>
            <input
              value={oPin}
              onChange={(e) => setOPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Destination Pincode</label>
            <input
              value={dPin}
              onChange={(e) => setDPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={inputStyle}
              placeholder="e.g. 110001"
            />
          </div>
          <div>
            <label style={labelStyle}>Weight (grams)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Math.max(50, Number(e.target.value) || 500))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Type</label>
            <select value={pt} onChange={(e) => setPt(e.target.value as any)} style={inputStyle}>
              <option value="Pre-paid">Pre-paid</option>
              <option value="COD">COD</option>
            </select>
          </div>
          {pt === "COD" && (
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>COD Amount (₹)</label>
              <input
                type="number"
                value={cod}
                onChange={(e) => setCod(Number(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          )}
        </div>

        <button
          onClick={calc}
          disabled={loading}
          style={{ ...btnPrimary, marginTop: 18, padding: "12px 20px" }}
        >
          <FiCreditCard /> {loading ? "Calculating..." : "Calculate Rate"}
        </button>

        {result && (
          <div style={{ display: "flex", gap: 14, marginTop: 20, flexWrap: "wrap" }}>
            <RateCard
              mode="⚡ Express"
              data={result.express}
              highlight
              total={total(result.express)}
            />
            <RateCard
              mode="🚚 Surface"
              data={result.surface}
              total={total(result.surface)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const RateCard: React.FC<{ mode: string; data: any; total: number; highlight?: boolean }> = ({
  mode,
  data,
  total,
  highlight,
}) => {
  if (!data)
    return (
      <div style={{ ...rateCardStyle, opacity: 0.5 }}>
        <div style={{ fontWeight: 700 }}>{mode}</div>
        <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Not available</div>
      </div>
    );
  return (
    <div
      style={{
        ...rateCardStyle,
        border: highlight ? "2px solid #4f46e5" : "1px solid #e5e7eb",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{mode}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginTop: 6 }}>
        {fmtINR(total)}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
        Zone: {data.zone || "—"}
      </div>
      <div style={{ fontSize: 12, marginTop: 10, color: "#374151" }}>
        Charged weight: <strong>{data.charged_weight || "—"}g</strong>
        <br />
        Freight: {fmtINR(data.gross_amount || 0)}
        {data.cod_charges ? (
          <>
            <br />
            COD charges: {fmtINR(data.cod_charges || 0)}
          </>
        ) : null}
      </div>
    </div>
  );
};

/* ================================ COMMON UI ================================ */
const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  bg: string;
  color: string;
  icon: React.ReactNode;
  warn?: boolean;
}> = ({ label, value, sub, bg, color, icon, warn }) => (
  <div
    style={{
      background: "#fff",
      border: warn ? "1px solid #fecaca" : "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      alignItems: "center",
      gap: 14,
      flex: "1 1 200px",
      minWidth: 180,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: warn ? "#dc2626" : "#9ca3af" }}>{sub}</div>
      )}
    </div>
  </div>
);

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "10px 16px",
      background: "transparent",
      border: "none",
      borderBottom: active ? "3px solid #4f46e5" : "3px solid transparent",
      color: active ? "#4f46e5" : "#6b7280",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: -2,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    }}
  >
    {children}
  </button>
);

const Field: React.FC<{ label: string; value: any; mono?: boolean }> = ({ label, value, mono }) => (
  <div
    style={{
      background: "#f9fafb",
      padding: 10,
      borderRadius: 8,
      border: "1px solid #e5e7eb",
    }}
  >
    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{label}</div>
    <div
      style={{
        fontSize: 13,
        color: "#111827",
        marginTop: 2,
        wordBreak: "break-all",
        fontFamily: mono ? "monospace" : undefined,
      }}
    >
      {value || "—"}
    </div>
  </div>
);

const Chip: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div style={{ background: "#fff", padding: 8, borderRadius: 6, border: "1px solid #d1fae5" }}>
    <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
    <div style={{ fontSize: 13, color: "#065f46", fontWeight: 600 }}>{value}</div>
  </div>
);

const Modal: React.FC<{
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}> = ({ children, onClose, title, wide }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.55)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: 12,
        width: "100%",
        maxWidth: wide ? 780 : 480,
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>{title}</h2>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 20,
            color: "#6b7280",
            cursor: "pointer",
          }}
        >
          <FiX />
        </button>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  </div>
);

/* ================================ STYLES ================================ */
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "middle",
  color: "#374151",
  fontSize: 13,
};

const theadRow: React.CSSProperties = {
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const trowStyle: React.CSSProperties = {
  borderBottom: "1px solid #f3f4f6",
};

const tableWrap: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  overflow: "hidden",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const emptyCell: React.CSSProperties = {
  padding: 60,
  textAlign: "center",
  color: "#6b7280",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const searchIconStyle: React.CSSProperties = {
  position: "absolute",
  left: 10,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#9ca3af",
};

const sectionH: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  margin: "16px 0 8px",
  color: "#111827",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const filterBarStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "flex-end",
};

const paginationWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const btnPrimary: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  padding: "9px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const btnGreen: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#059669",
  color: "#fff",
  border: "none",
  padding: "9px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const btnIcon = (color: string): React.CSSProperties => ({
  background: "transparent",
  border: "1px solid #e5e7eb",
  color,
  padding: "6px 8px",
  borderRadius: 6,
  cursor: "pointer",
  marginLeft: 4,
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
});

const btnSmall: React.CSSProperties = {
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  marginLeft: 4,
};

const pagerBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "7px 14px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: disabled ? "#f3f4f6" : "#fff",
  color: disabled ? "#9ca3af" : "#374151",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 13,
  fontWeight: 600,
});

const rateCardStyle: React.CSSProperties = {
  flex: "1 1 220px",
  background: "#fff",
  borderRadius: 12,
  padding: 18,
  minWidth: 200,
};
