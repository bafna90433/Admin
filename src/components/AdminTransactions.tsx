// admin_panel/src/components/AdminTransactions.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiRefreshCw,
  FiSearch,
  FiEye,
  FiRotateCcw,
  FiDownload,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

/* ================================ TYPES ================================ */
type Txn = {
  id: string;
  orderId: string;
  siteOrderNumber?: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string;
  captured: boolean;
  email?: string;
  contact?: string;
  fee: number;
  tax: number;
  errorCode?: string;
  errorDescription?: string;
  international?: boolean;
  createdAt: string | null;
  card?: { last4?: string; network?: string; type?: string } | null;
  vpa?: string | null;
  bank?: string | null;
  amountRefunded: number;
  refundStatus?: string | null;
};

type Stats = {
  days: number;
  totalRevenue: number;
  totalFees: number;
  totalTax: number;
  netRevenue: number;
  totalRefunded: number;
  capturedCount: number;
  failedCount: number;
  attemptedCount: number;
  successRate: number;
  methodBreakdown: Record<string, { count: number; value: number }>;
};

type Settlement = {
  id: string;
  amount: number;
  fees: number;
  tax: number;
  utr?: string;
  status: string;
  createdAt: string | null;
};

type Refund = {
  id: string;
  amount: number;
  status: string;
  speedProcessed?: string;
  speedRequested?: string;
  createdAt: string | null;
  notes?: any;
};

/* ============================== HELPERS ================================ */
const fmtINR = (n: number) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

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

const statusColor = (s: string) => {
  switch (s) {
    case "captured":
      return { bg: "#d1fae5", color: "#065f46", icon: <FiCheckCircle /> };
    case "authorized":
      return { bg: "#fef3c7", color: "#92400e", icon: <FiClock /> };
    case "failed":
      return { bg: "#fee2e2", color: "#991b1b", icon: <FiXCircle /> };
    case "refunded":
      return { bg: "#ede9fe", color: "#5b21b6", icon: <FiRotateCcw /> };
    default:
      return { bg: "#e5e7eb", color: "#374151", icon: <FiAlertCircle /> };
  }
};

const methodLabel = (m: string) => {
  const map: Record<string, string> = {
    card: "💳 Card",
    upi: "📱 UPI",
    netbanking: "🏦 NetBanking",
    wallet: "👛 Wallet",
    emi: "📅 EMI",
  };
  return map[m] || m || "—";
};

/* =========================== MAIN COMPONENT ============================ */
const AdminTransactions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"transactions" | "settlements">(
    "transactions"
  );

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsDays, setStatsDays] = useState(30);

  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(100);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState("");
  const [fMethod, setFMethod] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [search, setSearch] = useState("");

  // Detail modal
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Refund modal
  const [refundTxn, setRefundTxn] = useState<Txn | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundSpeed, setRefundSpeed] = useState<"normal" | "optimum">("normal");
  const [refundLoading, setRefundLoading] = useState(false);

  // Settlements
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settLoading, setSettLoading] = useState(false);

  /* ------------------------------ LOADERS ------------------------------ */
  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get("/payments/admin/stats", {
        params: { days: statsDays },
      });
      setStats(data);
    } catch {
      // silent
    }
  }, [statsDays]);

  const loadTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { count, skip };
      if (dateFrom) params.from = Math.floor(new Date(dateFrom).getTime() / 1000);
      if (dateTo) {
        // +1 day to include the "to" day fully
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        params.to = Math.floor(end.getTime() / 1000);
      }
      if (fMethod) params.method = fMethod;
      if (fStatus) params.status = fStatus;
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get("/payments/admin/transactions", { params });
      setTxns(data.items || []);
      setHasMore(!!data.hasMore);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Load failed",
        text:
          err?.response?.data?.message ||
          "Razorpay API call failed. Check RAZORPAY_KEY / RAZORPAY_SECRET in .env.",
      });
    } finally {
      setLoading(false);
    }
  }, [count, skip, dateFrom, dateTo, fMethod, fStatus, search]);

  const loadSettlements = useCallback(async () => {
    setSettLoading(true);
    try {
      const { data } = await api.get("/payments/admin/settlements", {
        params: { count: 50 },
      });
      setSettlements(data.items || []);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Settlement load failed",
        text: err?.response?.data?.message || "Error loading settlements.",
      });
    } finally {
      setSettLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === "transactions") loadTxns();
    else if (activeTab === "settlements") loadSettlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, skip, count, dateFrom, dateTo, fMethod, fStatus]);

  const applySearch = () => {
    setSkip(0);
    loadTxns();
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setFMethod("");
    setFStatus("");
    setSearch("");
    setSkip(0);
  };

  /* ---------------------------- DETAIL MODAL ---------------------------- */
  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail({ loading: true });
    try {
      const { data } = await api.get(`/payments/admin/transaction/${id}`);
      setDetail(data);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Load failed",
        text: err?.response?.data?.message || "Error fetching details.",
      });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ----------------------------- REFUND --------------------------------- */
  const submitRefund = async () => {
    if (!refundTxn) return;
    const refundable = refundTxn.amount - refundTxn.amountRefunded;
    const amt = Number(refundAmount);

    if (amt && (amt <= 0 || amt > refundable)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid amount",
        text: `Refundable: ${fmtINR(refundable)}`,
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Confirm refund?",
      html: `<div style="text-align:left">
        <b>Payment:</b> ${refundTxn.id}<br/>
        <b>Amount:</b> ${amt ? fmtINR(amt) : fmtINR(refundable) + " (full)"}<br/>
        <b>Speed:</b> ${refundSpeed}
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Yes, refund",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;

    setRefundLoading(true);
    try {
      await api.post(`/payments/admin/refund/${refundTxn.id}`, {
        amount: amt || undefined,
        speed: refundSpeed,
      });
      Swal.fire({
        icon: "success",
        title: "Refund initiated!",
        text:
          refundSpeed === "optimum"
            ? "Customer ko 1-2 hours me paisa mil jayega"
            : "Customer ko 5-7 din me paisa mil jayega",
      });
      setRefundTxn(null);
      setRefundAmount("");
      loadTxns();
      loadStats();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Refund failed",
        text: err?.response?.data?.message || "Razorpay declined the refund.",
      });
    } finally {
      setRefundLoading(false);
    }
  };

  /* ----------------------------- EXCEL ---------------------------------- */
  const exportExcel = () => {
    if (txns.length === 0) return;
    const rows = txns.map((t) => ({
      "Payment ID": t.id,
      "Site Order No": t.siteOrderNumber || "",
      "Razorpay Order ID": t.orderId,
      Date: fmtDate(t.createdAt),
      Amount: t.amount,
      Fee: t.fee,
      Tax: t.tax,
      Net: (t.amount - t.fee).toFixed(2),
      Status: t.status,
      Method: t.method,
      "Card Last4": t.card?.last4 || "",
      "Card Network": t.card?.network || "",
      "Card Type": t.card?.type || "",
      UPI: t.vpa || "",
      Bank: t.bank || "",
      Email: t.email || "",
      Contact: t.contact || "",
      "Amount Refunded": t.amountRefunded,
      International: t.international ? "Yes" : "No",
      "Error Code": t.errorCode || "",
      "Error Description": t.errorDescription || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    saveAs(blob, `razorpay-transactions-${Date.now()}.xlsx`);
  };

  /* --------------------------- UI HELPERS ------------------------------- */
  const StatusPill = ({ s }: { s: string }) => {
    const c = statusColor(s);
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: c.bg,
          color: c.color,
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "capitalize",
        }}
      >
        {c.icon} {s}
      </span>
    );
  };

  const methodBreakdown = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.methodBreakdown || {})
      .sort((a, b) => b[1].value - a[1].value)
      .map(([k, v]) => ({ method: k, count: v.count, value: v.value }));
  }, [stats]);

  /* ================================ RENDER ================================ */
  return (
    <div style={{ padding: "24px 20px", maxWidth: 1400, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#111827" }}>
            💳 Razorpay Transactions
          </h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>
            Live transaction data directly from Razorpay. Track revenue, fees, failed payments, and process refunds.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={statsDays}
            onChange={(e) => setStatsDays(Number(e.target.value))}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 13,
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
          <button
            onClick={() => {
              loadStats();
              if (activeTab === "transactions") loadTxns();
              else loadSettlements();
            }}
            style={btnPrimary}
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Total Revenue"
          value={stats ? fmtINR(stats.totalRevenue) : "—"}
          sub={`${stats?.capturedCount || 0} captured`}
          bg="#d1fae5"
          color="#059669"
          icon={<FaRupeeSign />}
        />
        <StatCard
          label="Razorpay Fees"
          value={stats ? fmtINR(stats.totalFees) : "—"}
          sub={`incl. GST ${stats ? fmtINR(stats.totalTax) : "—"}`}
          bg="#fef3c7"
          color="#d97706"
          icon={<FiCreditCard />}
        />
        <StatCard
          label="Net Revenue"
          value={stats ? fmtINR(stats.netRevenue) : "—"}
          sub="After fees"
          bg="#dbeafe"
          color="#2563eb"
          icon={<FiTrendingUp />}
        />
        <StatCard
          label="Success Rate"
          value={`${stats?.successRate || 0}%`}
          sub={`${stats?.failedCount || 0} failed / ${stats?.attemptedCount || 0} attempts`}
          bg="#ede9fe"
          color="#7c3aed"
          icon={<FiCheckCircle />}
        />
        <StatCard
          label="Refunded"
          value={stats ? fmtINR(stats.totalRefunded) : "—"}
          sub="Total refunds"
          bg="#fee2e2"
          color="#dc2626"
          icon={<FiRotateCcw />}
        />
      </div>

      {/* Method Breakdown */}
      {methodBreakdown.length > 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#111827" }}>
            💰 Payment Method Breakdown (Last {statsDays} days)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {methodBreakdown.map((m) => (
              <div
                key={m.method}
                style={{
                  flex: "1 1 180px",
                  minWidth: 160,
                  padding: 12,
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ fontSize: 12, color: "#6b7280" }}>{methodLabel(m.method)}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                  {fmtINR(m.value)}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{m.count} transactions</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 12,
          borderBottom: "2px solid #e5e7eb",
        }}
      >
        <TabBtn active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")}>
          All Transactions
        </TabBtn>
        <TabBtn active={activeTab === "settlements"} onClick={() => setActiveTab("settlements")}>
          Settlements (Bank Credits)
        </TabBtn>
      </div>

      {activeTab === "transactions" ? (
        <>
          {/* Filters */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 200px" }}>
              <label style={labelStyle}>Search (ID / Email / Phone)</label>
              <div style={{ position: "relative" }}>
                <FiSearch
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  placeholder="pay_xxx / email / phone"
                  style={{ ...inputStyle, paddingLeft: 32 }}
                />
              </div>
            </div>
            <div style={{ flex: "0 0 140px" }}>
              <label style={labelStyle}>From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: "0 0 140px" }}>
              <label style={labelStyle}>To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: "0 0 140px" }}>
              <label style={labelStyle}>Method</label>
              <select value={fMethod} onChange={(e) => setFMethod(e.target.value)} style={inputStyle}>
                <option value="">All</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="netbanking">NetBanking</option>
                <option value="wallet">Wallet</option>
                <option value="emi">EMI</option>
              </select>
            </div>
            <div style={{ flex: "0 0 140px" }}>
              <label style={labelStyle}>Status</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={inputStyle}>
                <option value="">All</option>
                <option value="captured">Captured</option>
                <option value="authorized">Authorized</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <button onClick={applySearch} style={btnPrimary}>
              <FiSearch /> Apply
            </button>
            <button onClick={resetFilters} style={btnGhost}>
              Reset
            </button>
            <button onClick={exportExcel} disabled={txns.length === 0} style={btnGreen}>
              <FiDownload /> Excel
            </button>
          </div>

          {/* Transactions Table */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={thStyle}>Payment ID</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Method</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Fee</th>
                    <th style={thStyle}>Net</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                        Loading transactions from Razorpay...
                      </td>
                    </tr>
                  ) : txns.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>
                        <FiCreditCard style={{ fontSize: 42, opacity: 0.3, marginBottom: 8 }} />
                        <div>No transactions found.</div>
                      </td>
                    </tr>
                  ) : (
                    txns.map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: "#4f46e5",
                              fontWeight: 600,
                            }}
                          >
                            {t.id}
                          </div>
                          {t.siteOrderNumber && (
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#059669",
                                background: "#d1fae5",
                                borderRadius: 4,
                                padding: "1px 5px",
                                display: "inline-block",
                                marginTop: 2,
                              }}
                            >
                              {t.siteOrderNumber}
                            </div>
                          )}
                          {t.orderId && (
                            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{t.orderId}</div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                        <td style={tdStyle}>
                          <div style={{ color: "#111827" }}>{t.email || "—"}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{t.contact || "—"}</div>
                        </td>
                        <td style={tdStyle}>
                          <div>{methodLabel(t.method)}</div>
                          {t.card && (
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {t.card.network} •••• {t.card.last4} ({t.card.type})
                            </div>
                          )}
                          {t.vpa && (
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{t.vpa}</div>
                          )}
                          {t.bank && !t.card && (
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{t.bank}</div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: "#111827" }}>
                          {fmtINR(t.amount)}
                          {t.amountRefunded > 0 && (
                            <div style={{ fontSize: 11, color: "#dc2626" }}>
                              −{fmtINR(t.amountRefunded)}
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: "#d97706" }}>
                          {fmtINR(t.fee)}
                          {t.tax > 0 && (
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>
                              GST {fmtINR(t.tax)}
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "#059669" }}>
                          {fmtINR(t.amount - t.fee)}
                        </td>
                        <td style={tdStyle}>
                          <StatusPill s={t.status} />
                          {t.errorDescription && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#dc2626",
                                marginTop: 3,
                                maxWidth: 160,
                              }}
                            >
                              {t.errorDescription}
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            title="View detail"
                            onClick={() => openDetail(t.id)}
                            style={btnIcon("#4f46e5")}
                          >
                            <FiEye />
                          </button>
                          {t.status === "captured" && t.amountRefunded < t.amount && (
                            <button
                              title="Refund"
                              onClick={() => {
                                setRefundTxn(t);
                                setRefundAmount("");
                              }}
                              style={btnIcon("#dc2626")}
                            >
                              <FiRotateCcw />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderTop: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Showing {txns.length} transactions (from Razorpay API)
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={skip === 0}
                  onClick={() => setSkip(Math.max(0, skip - count))}
                  style={pagerBtn(skip === 0)}
                >
                  ← Previous
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => setSkip(skip + count)}
                  style={pagerBtn(!hasMore)}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ============================ SETTLEMENTS TAB ============================ */
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <strong>ℹ️ Settlements</strong> = kab aapke bank me paisa credit hua
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={thStyle}>Settlement ID</th>
                  <th style={thStyle}>UTR (Bank Reference)</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Fees</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {settLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                      Loading settlements...
                    </td>
                  </tr>
                ) : settlements.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>
                      No settlements yet.
                    </td>
                  </tr>
                ) : (
                  settlements.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{s.id}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>
                        {s.utr || "—"}
                      </td>
                      <td style={tdStyle}>{fmtDate(s.createdAt)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: "#059669" }}>
                        {fmtINR(s.amount)}
                      </td>
                      <td style={{ ...tdStyle, color: "#d97706" }}>{fmtINR(s.fees + s.tax)}</td>
                      <td style={tdStyle}>
                        <StatusPill s={s.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================ DETAIL MODAL ============================ */}
      {detail && (
        <Modal onClose={() => setDetail(null)} title="Transaction Details" wide>
          {detailLoading || detail.loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>Loading...</div>
          ) : (
            <>
              <DetailGrid payment={detail.payment} />
              {detail.refunds && detail.refunds.length > 0 && (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 16, color: "#111827" }}>
                    🔄 Refunds ({detail.refunds.length})
                  </h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th style={thStyle}>Refund ID</th>
                        <th style={thStyle}>Amount</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Speed</th>
                        <th style={thStyle}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.refunds.map((r: Refund) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                            {r.id}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtINR(r.amount)}</td>
                          <td style={tdStyle}>
                            <StatusPill s={r.status} />
                          </td>
                          <td style={tdStyle}>{r.speedProcessed || r.speedRequested}</td>
                          <td style={tdStyle}>{fmtDate(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ============================ REFUND MODAL ============================ */}
      {refundTxn && (
        <Modal onClose={() => !refundLoading && setRefundTxn(null)} title="Process Refund">
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>Payment ID</div>
            <div style={{ fontFamily: "monospace", fontWeight: 600 }}>{refundTxn.id}</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Paid: <strong>{fmtINR(refundTxn.amount)}</strong> · Already Refunded:{" "}
              <strong style={{ color: "#dc2626" }}>{fmtINR(refundTxn.amountRefunded)}</strong>
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#059669" }}>
              Refundable: <strong>{fmtINR(refundTxn.amount - refundTxn.amountRefunded)}</strong>
            </div>
          </div>

          <label style={labelStyle}>Refund Amount (leave empty for full refund)</label>
          <input
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={String(refundTxn.amount - refundTxn.amountRefunded)}
            style={inputStyle}
          />

          <label style={{ ...labelStyle, marginTop: 12 }}>Refund Speed</label>
          <select
            value={refundSpeed}
            onChange={(e) => setRefundSpeed(e.target.value as any)}
            style={inputStyle}
          >
            <option value="normal">Normal — 5-7 business days (free)</option>
            <option value="optimum">Instant — 1-2 hours (extra fees apply)</option>
          </select>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <button
              onClick={() => setRefundTxn(null)}
              disabled={refundLoading}
              style={btnGhost}
            >
              Cancel
            </button>
            <button onClick={submitRefund} disabled={refundLoading} style={btnDanger}>
              <FiRotateCcw /> {refundLoading ? "Processing..." : "Process Refund"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminTransactions;

/* ============================== Helpers ============================== */
const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  bg: string;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, sub, bg, color, icon }) => (
  <div
    style={{
      background: "#fff",
      border: "1px solid #f3f4f6",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      alignItems: "center",
      gap: 16,
      flex: "1 1 200px",
      minWidth: 180,
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)",
      transition: "transform 0.2s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: bg,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, letterSpacing: "0.02em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "2px 0" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</div>}
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
      padding: "10px 20px",
      background: "transparent",
      border: "none",
      borderBottom: active ? "3px solid #4f46e5" : "3px solid transparent",
      color: active ? "#4f46e5" : "#6b7280",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      marginBottom: -2,
    }}
  >
    {children}
  </button>
);

const DetailGrid: React.FC<{ payment: any }> = ({ payment: p }) => (
  <div>
    {/* Top summary */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <Field label="Payment ID" value={p.id} mono />
      <Field label="Order ID" value={p.orderId} mono />
      <Field label="Amount" value={<strong>{fmtINR(p.amount)}</strong>} />
      <Field label="Status" value={<StatusPillInline s={p.status} />} />
      <Field label="Method" value={methodLabel(p.method)} />
      <Field label="Date" value={fmtDate(p.createdAt)} />
      <Field label="Razorpay Fee" value={<span style={{ color: "#d97706" }}>{fmtINR(p.fee)}</span>} />
      <Field label="GST" value={<span style={{ color: "#d97706" }}>{fmtINR(p.tax)}</span>} />
      <Field
        label="Net Credited"
        value={<strong style={{ color: "#059669" }}>{fmtINR(p.netAmount)}</strong>}
      />
    </div>

    {/* Customer */}
    <h3 style={sectionH}>👤 Customer</h3>
    <div style={gridStyle}>
      <Field label="Email" value={p.email} />
      <Field label="Contact" value={p.contact} />
      {p.name && <Field label="Cardholder" value={p.name} />}
    </div>

    {/* Card */}
    {p.card && (
      <>
        <h3 style={sectionH}>💳 Card Details</h3>
        <div style={gridStyle}>
          <Field label="Network" value={p.card.network} />
          <Field label="Last 4" value={p.card.last4} />
          <Field label="Type" value={p.card.type} />
          <Field label="Issuer" value={p.card.issuer} />
          <Field label="International" value={p.card.international ? "Yes" : "No"} />
        </div>
      </>
    )}

    {/* UPI */}
    {p.vpa && (
      <>
        <h3 style={sectionH}>📱 UPI Details</h3>
        <Field label="VPA" value={p.vpa} mono />
      </>
    )}

    {/* Bank */}
    {p.bank && !p.card && (
      <>
        <h3 style={sectionH}>🏦 Bank Details</h3>
        <Field label="Bank" value={p.bank} />
      </>
    )}

    {/* Refunds summary */}
    {p.amountRefunded > 0 && (
      <>
        <h3 style={sectionH}>🔄 Refund Summary</h3>
        <div style={gridStyle}>
          <Field
            label="Amount Refunded"
            value={<strong style={{ color: "#dc2626" }}>{fmtINR(p.amountRefunded)}</strong>}
          />
          <Field label="Refund Status" value={p.refundStatus || "—"} />
        </div>
      </>
    )}

    {/* Error */}
    {p.errorCode && (
      <>
        <h3 style={{ ...sectionH, color: "#dc2626" }}>❌ Error Details</h3>
        <div style={gridStyle}>
          <Field label="Code" value={p.errorCode} />
          <Field label="Description" value={p.errorDescription} />
          <Field label="Source" value={p.errorSource} />
          <Field label="Step" value={p.errorStep} />
          <Field label="Reason" value={p.errorReason} />
        </div>
      </>
    )}

    {/* Notes */}
    {p.notes && Object.keys(p.notes).length > 0 && (
      <>
        <h3 style={sectionH}>📝 Notes</h3>
        <pre
          style={{
            background: "#f9fafb",
            padding: 10,
            borderRadius: 6,
            fontSize: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          {JSON.stringify(p.notes, null, 2)}
        </pre>
      </>
    )}
  </div>
);

const StatusPillInline: React.FC<{ s: string }> = ({ s }) => {
  const c = statusColor(s);
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {s}
    </span>
  );
};

const Field: React.FC<{ label: string; value: any; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
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

/* ============================== Modal ============================== */
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
      background: "rgba(15, 23, 42, 0.55)",
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
            padding: 4,
          }}
        >
          <FiX />
        </button>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  </div>
);

/* ============================== Styles ============================== */
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

const sectionH: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  margin: "16px 0 8px",
  color: "#111827",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
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

const btnGhost: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#fff",
  color: "#374151",
  border: "1px solid #d1d5db",
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

const btnDanger: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
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
