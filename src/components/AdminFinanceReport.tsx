// admin_panel/src/components/AdminFinanceReport.tsx
import React, { useCallback, useEffect, useState } from "react";
import api from "../utils/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  FiRefreshCw,
  FiDownload,
  FiSearch,
  FiTrendingUp,
  FiPackage,
  FiCreditCard,
  FiTruck,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

/* ========================== TYPES ========================== */
type RzpInfo = {
  paymentId: string;
  status: string;
  amountReceived: number;
  fee: number;
  gst: number;
  net: number;
  method: string;
  amountRefunded: number;
};

type DelInfo = {
  awb: string | null;
  shippingCharge: number;
  codAmount: number;
  advancePaid: number;
  deliveryStatus: string;
};

type Row = {
  orderNumber: string;
  date: string;
  customer: { name: string; phone: string; city: string; state: string };
  paymentMode: "ONLINE" | "COD";
  orderAmount: number;
  itemsAmount: number;
  shippingCharge: number;
  status: string;
  razorpay: RzpInfo | null;
  delhivery: DelInfo;
  netReceipt: number;
  rzpFee: number;
  rzpTax: number;
};

type Summary = {
  totalOrderAmount: number;
  totalRzpFee: number;
  totalRzpTax: number;
  totalShippingCharge: number;
  totalNetReceipt: number;
  onlineCount: number;
  codCount: number;
};

/* ========================== HELPERS ========================== */
const fmtINR = (n: number) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusColor: Record<string, string> = {
  delivered: "#059669",
  shipped: "#2563eb",
  processing: "#d97706",
  pending: "#9ca3af",
  cancelled: "#dc2626",
  returned: "#7c3aed",
};

/* ========================== STAT CARD ========================== */
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
      borderRadius: 14,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      flex: "1 1 180px",
      minWidth: 170,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "2px 0" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</div>}
    </div>
  </div>
);

/* ========================== MAIN ========================== */
const AdminFinanceReport: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params: any = { page: pg, limit: 25 };
      if (from) params.from = from;
      if (to) params.to = to;
      if (modeFilter !== "ALL") params.paymentMode = modeFilter;

      const { data } = await api.get("/payments/admin/finance-report", { params });
      setRows(data.items || []);
      setSummary(data.summary || null);
      setPage(data.page || 1);
      setTotalPages(data.pages || 1);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [from, to, modeFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  const applyFilter = () => {
    setPage(1);
    load(1);
  };

  const resetFilter = () => {
    setFrom("");
    setTo("");
    setModeFilter("ALL");
  };

  const exportExcel = () => {
    if (!rows.length) return;
    const data = rows.map((r) => ({
      "Order No": r.orderNumber,
      Date: fmtDate(r.date),
      Customer: r.customer.name,
      Phone: r.customer.phone,
      City: `${r.customer.city}, ${r.customer.state}`,
      "Payment Mode": r.paymentMode,
      "Order Amount (₹)": r.orderAmount,
      "Items Amount (₹)": r.itemsAmount,
      "Shipping Charge (₹)": r.shippingCharge,
      "Order Status": r.status,
      // Razorpay
      "Razorpay Payment ID": r.razorpay?.paymentId || "",
      "Razorpay Status": r.razorpay?.status || "",
      "Razorpay Amount Received (₹)": r.razorpay?.amountReceived || "",
      "Razorpay Fee (₹)": r.razorpay?.fee || "",
      "Razorpay GST (₹)": r.razorpay?.gst || "",
      "Razorpay Net (₹)": r.razorpay?.net || "",
      "Refunded (₹)": r.razorpay?.amountRefunded || "",
      // Delhivery
      "AWB (Delhivery)": r.delhivery.awb || "",
      "COD Amount (₹)": r.delhivery.codAmount || "",
      "Advance Paid (₹)": r.delhivery.advancePaid || "",
      // Net
      "Net Receipt (₹)": r.netReceipt,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finance Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `finance-report-${Date.now()}.xlsx`
    );
  };

  /* ========================== RENDER ========================== */
  return (
    <div
      style={{
        padding: "24px 20px",
        maxWidth: 1500,
        margin: "0 auto",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
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
            📊 Finance Report
          </h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>
            Har order ka Razorpay + Delhivery combined financial view — ek jagah sab kuch
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => load(page)} style={btnPrimary}>
            <FiRefreshCw /> Refresh
          </button>
          <button onClick={exportExcel} disabled={!rows.length} style={btnGreen}>
            <FiDownload /> Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <StatCard
            label="Total Order Value"
            value={fmtINR(summary.totalOrderAmount)}
            sub={`${totalRows} orders`}
            bg="#dbeafe"
            color="#2563eb"
            icon={<FaRupeeSign />}
          />
          <StatCard
            label="Razorpay Fees"
            value={fmtINR(summary.totalRzpFee)}
            sub={`GST: ${fmtINR(summary.totalRzpTax)}`}
            bg="#fef3c7"
            color="#d97706"
            icon={<FiCreditCard />}
          />
          <StatCard
            label="Net Receipt"
            value={fmtINR(summary.totalNetReceipt)}
            sub="After Razorpay fees"
            bg="#d1fae5"
            color="#059669"
            icon={<FiTrendingUp />}
          />
          <StatCard
            label="Shipping Collected"
            value={fmtINR(summary.totalShippingCharge)}
            sub={`${summary.codCount} COD · ${summary.onlineCount} Online`}
            bg="#ede9fe"
            color="#7c3aed"
            icon={<FiTruck />}
          />
          <StatCard
            label="Online Orders"
            value={String(summary.onlineCount)}
            sub={`${summary.codCount} COD orders`}
            bg="#fce7f3"
            color="#db2777"
            icon={<FiPackage />}
          />
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 14,
          marginBottom: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: "0 0 150px" }}>
          <label style={labelSt}>From Date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={inputSt}
          />
        </div>
        <div style={{ flex: "0 0 150px" }}>
          <label style={labelSt}>To Date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={inputSt}
          />
        </div>
        <div style={{ flex: "0 0 160px" }}>
          <label style={labelSt}>Payment Mode</label>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            style={inputSt}
          >
            <option value="ALL">All (COD + Online)</option>
            <option value="ONLINE">Online Only</option>
            <option value="COD">COD Only</option>
          </select>
        </div>
        <button onClick={applyFilter} style={btnPrimary}>
          <FiSearch /> Apply
        </button>
        <button onClick={resetFilter} style={btnGhost}>
          Reset
        </button>
      </div>

      {/* Table */}
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
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={thSt}>Order No</th>
                <th style={thSt}>Date</th>
                <th style={thSt}>Customer</th>
                <th style={thSt}>Mode</th>
                <th style={thSt}>Order Amt</th>

                {/* Razorpay group */}
                <th
                  style={{ ...thSt, borderLeft: "2px solid #c7d2fe", color: "#4f46e5" }}
                >
                  💳 RZP Received
                </th>
                <th style={{ ...thSt, color: "#4f46e5" }}>RZP Fees+GST</th>
                <th style={{ ...thSt, color: "#4f46e5" }}>RZP Net</th>

                {/* Delhivery group */}
                <th
                  style={{ ...thSt, borderLeft: "2px solid #bbf7d0", color: "#059669" }}
                >
                  🚚 AWB
                </th>
                <th style={{ ...thSt, color: "#059669" }}>Shipping</th>
                <th style={{ ...thSt, color: "#059669" }}>COD Amt</th>

                {/* Net */}
                <th
                  style={{
                    ...thSt,
                    borderLeft: "2px solid #fde68a",
                    color: "#d97706",
                  }}
                >
                  Net Receipt
                </th>
                <th style={thSt}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ padding: 50, textAlign: "center", color: "#6b7280" }}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>
                    Koi data nahi mila. Filter change karke try karo.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.orderNumber}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#fafafa")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Order No */}
                    <td style={tdSt}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>
                        {r.orderNumber}
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ ...tdSt, whiteSpace: "nowrap", fontSize: 12, color: "#6b7280" }}>
                      {fmtDate(r.date)}
                    </td>

                    {/* Customer */}
                    <td style={tdSt}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>
                        {r.customer.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {r.customer.phone}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        {r.customer.city}, {r.customer.state}
                      </div>
                    </td>

                    {/* Mode */}
                    <td style={tdSt}>
                      <span
                        style={{
                          background:
                            r.paymentMode === "ONLINE" ? "#dbeafe" : "#fef3c7",
                          color:
                            r.paymentMode === "ONLINE" ? "#1d4ed8" : "#92400e",
                          padding: "3px 8px",
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {r.paymentMode}
                      </span>
                    </td>

                    {/* Order Amount */}
                    <td style={{ ...tdSt, fontWeight: 700, color: "#111827" }}>
                      {fmtINR(r.orderAmount)}
                      {r.itemsAmount > 0 && (
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          items: {fmtINR(r.itemsAmount)}
                        </div>
                      )}
                    </td>

                    {/* RZP Received */}
                    <td
                      style={{
                        ...tdSt,
                        borderLeft: "2px solid #e0e7ff",
                        color: "#4f46e5",
                        fontWeight: 600,
                      }}
                    >
                      {r.razorpay ? (
                        <>
                          {fmtINR(r.razorpay.amountReceived)}
                          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>
                            {r.razorpay.paymentId}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>

                    {/* RZP Fees + GST */}
                    <td style={{ ...tdSt, color: "#d97706" }}>
                      {r.razorpay ? (
                        <>
                          {fmtINR(r.razorpay.fee + r.razorpay.gst)}
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>
                            fee {fmtINR(r.razorpay.fee)} + GST {fmtINR(r.razorpay.gst)}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>

                    {/* RZP Net */}
                    <td style={{ ...tdSt, fontWeight: 700, color: "#059669" }}>
                      {r.razorpay ? fmtINR(r.razorpay.net) : <span style={{ color: "#d1d5db" }}>—</span>}
                      {r.razorpay?.amountRefunded ? (
                        <div style={{ fontSize: 10, color: "#dc2626" }}>
                          refund: {fmtINR(r.razorpay.amountRefunded)}
                        </div>
                      ) : null}
                    </td>

                    {/* AWB */}
                    <td
                      style={{
                        ...tdSt,
                        borderLeft: "2px solid #bbf7d0",
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "#374151",
                      }}
                    >
                      {r.delhivery.awb ? (
                        r.delhivery.awb
                      ) : (
                        <span style={{ color: "#d1d5db" }}>No AWB</span>
                      )}
                    </td>

                    {/* Shipping Charge */}
                    <td style={{ ...tdSt, color: "#6b7280" }}>
                      {r.shippingCharge > 0 ? fmtINR(r.shippingCharge) : <span style={{ color: "#d1d5db" }}>Free</span>}
                    </td>

                    {/* COD Amount */}
                    <td style={{ ...tdSt, fontWeight: 600, color: "#059669" }}>
                      {r.delhivery.codAmount > 0 ? (
                        <>
                          {fmtINR(r.delhivery.codAmount)}
                          {r.delhivery.advancePaid > 0 && (
                            <div style={{ fontSize: 10, color: "#9ca3af" }}>
                              advance: {fmtINR(r.delhivery.advancePaid)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>

                    {/* Net Receipt */}
                    <td
                      style={{
                        ...tdSt,
                        borderLeft: "2px solid #fde68a",
                        fontWeight: 800,
                        fontSize: 14,
                        color: r.netReceipt > 0 ? "#059669" : "#dc2626",
                      }}
                    >
                      {fmtINR(r.netReceipt)}
                    </td>

                    {/* Status */}
                    <td style={tdSt}>
                      <span
                        style={{
                          background: "#f3f4f6",
                          color: statusColor[r.status] || "#374151",
                          padding: "3px 8px",
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Footer totals */}
            {summary && rows.length > 0 && (
              <tfoot>
                <tr
                  style={{
                    background: "#f9fafb",
                    borderTop: "2px solid #e5e7eb",
                    fontWeight: 700,
                  }}
                >
                  <td colSpan={4} style={{ ...tdSt, color: "#374151" }}>
                    Page Total ({rows.length} orders)
                  </td>
                  <td style={{ ...tdSt, color: "#111827" }}>
                    {fmtINR(summary.totalOrderAmount)}
                  </td>
                  <td style={{ ...tdSt, borderLeft: "2px solid #e0e7ff", color: "#4f46e5" }}>
                    —
                  </td>
                  <td style={{ ...tdSt, color: "#d97706" }}>
                    {fmtINR(summary.totalRzpFee + summary.totalRzpTax)}
                  </td>
                  <td style={{ ...tdSt, color: "#059669" }}>—</td>
                  <td style={{ ...tdSt, borderLeft: "2px solid #bbf7d0" }}>—</td>
                  <td style={{ ...tdSt, color: "#6b7280" }}>
                    {fmtINR(summary.totalShippingCharge)}
                  </td>
                  <td>—</td>
                  <td
                    style={{
                      ...tdSt,
                      borderLeft: "2px solid #fde68a",
                      color: "#059669",
                      fontSize: 15,
                    }}
                  >
                    {fmtINR(summary.totalNetReceipt)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
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
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Total {totalRows} orders — Page {page} / {totalPages}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => {
                const np = page - 1;
                setPage(np);
                load(np);
              }}
              style={pagerBtn(page <= 1)}
            >
              ← Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                const np = page + 1;
                setPage(np);
                load(np);
              }}
              style={pagerBtn(page >= totalPages)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 12,
          padding: "10px 16px",
          background: "#f9fafb",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 12,
          color: "#6b7280",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <span>
          <b style={{ color: "#4f46e5" }}>💳 RZP</b> = Razorpay se aaya paisa (sirf ONLINE
          orders)
        </span>
        <span>
          <b style={{ color: "#059669" }}>🚚 COD Amt</b> = Delhivery jo collect karega delivery
          par
        </span>
        <span>
          <b style={{ color: "#d97706" }}>Net Receipt</b> = ONLINE: Razorpay net · COD: Full
          order amount
        </span>
      </div>
    </div>
  );
};

export default AdminFinanceReport;

/* ========================== STYLES ========================== */
const thSt: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
};

const tdSt: React.CSSProperties = {
  padding: "11px 12px",
  verticalAlign: "middle",
  color: "#374151",
};

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const labelSt: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 5,
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
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
  display: "inline-flex",
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
  display: "inline-flex",
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
