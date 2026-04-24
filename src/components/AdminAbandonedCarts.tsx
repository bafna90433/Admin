// admin_panel/src/components/AdminAbandonedCarts.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import Swal from "sweetalert2";
import {
  FiShoppingCart,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiSearch,
  FiSend,
  FiXCircle,
  FiTrash2,
  FiRefreshCw,
  FiMessageSquare,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiPhone,
} from "react-icons/fi";

/* ================================ TYPES ================================ */
type AbandonedItem = {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug?: string;
};

type WhatsappLog = {
  sentAt: string;
  template: string;
  languageCode: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
  sentBy?: string;
};

type AbandonedCart = {
  _id: string;
  userId: string;
  shopName?: string;
  mobile?: string;
  whatsapp?: string;
  items: AbandonedItem[];
  totalValue: number;
  itemCount: number;
  lastActivityAt: string;
  status: "active" | "recovered" | "dismissed";
  recoveredOrderId?: string | null;
  recoveredAt?: string | null;
  whatsappSent?: WhatsappLog[];
  lastWhatsappAt?: string | null;
  reminderCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type Stats = {
  active: number;
  activeValue: number;
  last24hCount: number;
  last24hValue: number;
  recovered7d: number;
  recoveryRate: number;
};

/* ============================== HELPERS ================================ */
const fmtINR = (n: number) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const timeAgo = (iso?: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
};

/* =========================== MAIN COMPONENT ============================ */
const AdminAbandonedCarts: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const limit = 25;

  // Filters
  const [status, setStatus] = useState<"active" | "recovered" | "dismissed" | "all">("active");
  const [hours, setHours] = useState<string>(""); // "" = all-time
  const [minValue, setMinValue] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // WhatsApp modal
  const [waCart, setWaCart] = useState<AbandonedCart | null>(null);
  const [waTemplate, setWaTemplate] = useState<string>(
    localStorage.getItem("abandonedCartTemplateName") || ""
  );
  const [waLangCode, setWaLangCode] = useState<string>(
    localStorage.getItem("abandonedCartTemplateLang") || "en_US"
  );
  const [waRecoveryUrl, setWaRecoveryUrl] = useState<string>(
    localStorage.getItem("abandonedCartRecoveryUrl") || "https://bafnatoys.com/cart"
  );
  const [waSending, setWaSending] = useState(false);

  // Detail modal
  const [detailCart, setDetailCart] = useState<AbandonedCart | null>(null);

  /* ---------- API Loaders ---------- */
  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get("/abandoned-cart/admin/stats");
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { status, page, limit };
      if (hours) params.hours = hours;
      if (minValue) params.minValue = minValue;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get("/abandoned-cart/admin/list", { params });
      setCarts(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Load failed",
        text: err?.response?.data?.message || "Could not load abandoned carts.",
      });
    } finally {
      setLoading(false);
    }
  }, [status, hours, minValue, search, page, limit]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [status, hours, minValue, search]);

  /* ---------- Actions ---------- */
  const openWaModal = (cart: AbandonedCart) => {
    setWaCart(cart);
  };

  const sendWhatsApp = async () => {
    if (!waCart) return;
    if (!waTemplate.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Template name required",
        text: "Enter the exact Meta-approved template name.",
      });
      return;
    }

    setWaSending(true);
    try {
      const { data } = await api.post(
        `/abandoned-cart/admin/${waCart._id}/send-whatsapp`,
        {
          templateName: waTemplate.trim(),
          languageCode: waLangCode.trim() || "en_US",
          recoveryUrl: waRecoveryUrl.trim() || "https://bafnatoys.com/cart",
        }
      );

      // Remember template name, language, and URL for next time
      localStorage.setItem("abandonedCartTemplateName", waTemplate.trim());
      localStorage.setItem("abandonedCartTemplateLang", waLangCode.trim() || "en_US");
      localStorage.setItem(
        "abandonedCartRecoveryUrl",
        waRecoveryUrl.trim() || "https://bafnatoys.com/cart"
      );

      Swal.fire({
        icon: "success",
        title: "WhatsApp sent!",
        text: `Reminder delivered to ${waCart.shopName || waCart.mobile}.`,
        timer: 2200,
        showConfirmButton: false,
      });
      setWaCart(null);
      loadList();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Send failed",
        text:
          err?.response?.data?.message ||
          "WhatsApp could not be sent. Check template name + Meta API credentials.",
      });
    } finally {
      setWaSending(false);
    }
  };

  const dismissCart = async (cart: AbandonedCart) => {
    const ok = await Swal.fire({
      icon: "question",
      title: "Dismiss this cart?",
      text: `${cart.shopName || cart.mobile} — ${fmtINR(cart.totalValue)}`,
      showCancelButton: true,
      confirmButtonText: "Yes, dismiss",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    try {
      await api.patch(`/abandoned-cart/admin/${cart._id}/dismiss`);
      loadList();
      loadStats();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Failed", text: err?.response?.data?.message || "Error" });
    }
  };

  const deleteCart = async (cart: AbandonedCart) => {
    const ok = await Swal.fire({
      icon: "warning",
      title: "Delete permanently?",
      text: `${cart.shopName || cart.mobile}`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    try {
      await api.delete(`/abandoned-cart/admin/${cart._id}`);
      loadList();
      loadStats();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Failed", text: err?.response?.data?.message || "Error" });
    }
  };

  /* ------------------------- UI ------------------------- */
  const statusPill = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: "#fef3c7", color: "#92400e", label: "Active" },
      recovered: { bg: "#d1fae5", color: "#065f46", label: "Recovered" },
      dismissed: { bg: "#e5e7eb", color: "#374151", label: "Dismissed" },
    };
    const m = map[s] || map.active;
    return (
      <span
        style={{
          background: m.bg,
          color: m.color,
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {m.label}
      </span>
    );
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    alignItems: "center",
    gap: 14,
    flex: "1 1 200px",
    minWidth: 180,
  };

  const iconBox = (bg: string, color: string): React.CSSProperties => ({
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
  });

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1400, margin: "0 auto" }}>
      {/* ===== Header ===== */}
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
            🛒 Abandoned Carts
          </h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>
            Customers who added products but didn't complete checkout. Send WhatsApp reminders to recover sales.
          </p>
        </div>
        <button
          onClick={() => {
            loadList();
            loadStats();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* ===== Stats Cards ===== */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={iconBox("#fef3c7", "#d97706")}>
            <FiShoppingCart />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Active Carts</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              {stats?.active ?? "—"}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconBox("#dbeafe", "#2563eb")}>
            <FiDollarSign />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Potential Revenue</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              {stats ? fmtINR(stats.activeValue) : "—"}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconBox("#fee2e2", "#dc2626")}>
            <FiClock />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Last 24h (New)</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              {stats?.last24hCount ?? "—"}{" "}
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                ({stats ? fmtINR(stats.last24hValue) : "—"})
              </span>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconBox("#d1fae5", "#059669")}>
            <FiTrendingUp />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
              Recovery Rate (7d)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
              {stats?.recoveryRate ?? 0}%{" "}
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                ({stats?.recovered7d ?? 0} won)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Filters ===== */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>Search (Shop/Mobile)</label>
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
              placeholder="Search shop name or mobile..."
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
        </div>

        <div style={{ flex: "0 0 150px" }}>
          <label style={labelStyle}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            style={inputStyle}
          >
            <option value="active">Active</option>
            <option value="recovered">Recovered</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        </div>

        <div style={{ flex: "0 0 140px" }}>
          <label style={labelStyle}>Activity Within</label>
          <select
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            style={inputStyle}
          >
            <option value="">All time</option>
            <option value="1">Last 1 hour</option>
            <option value="24">Last 24 hours</option>
            <option value="72">Last 3 days</option>
            <option value="168">Last 7 days</option>
            <option value="720">Last 30 days</option>
          </select>
        </div>

        <div style={{ flex: "0 0 140px" }}>
          <label style={labelStyle}>Min Value (₹)</label>
          <input
            type="number"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            placeholder="e.g., 500"
            style={inputStyle}
          />
        </div>
      </div>

      {/* ===== Table ===== */}
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
                <th style={thStyle}>Shop / Customer</th>
                <th style={thStyle}>Contact</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Value</th>
                <th style={thStyle}>Last Activity</th>
                <th style={thStyle}>Reminders</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                    Loading...
                  </td>
                </tr>
              ) : carts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>
                    <FiShoppingCart style={{ fontSize: 42, opacity: 0.3, marginBottom: 8 }} />
                    <div>No abandoned carts match these filters.</div>
                  </td>
                </tr>
              ) : (
                carts.map((c) => (
                  <tr key={c._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>
                        {c.shopName || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        ID: {c._id.slice(-6)}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: "#374151" }}>{c.mobile || "—"}</div>
                      {c.whatsapp && c.whatsapp !== c.mobile && (
                        <div style={{ fontSize: 11, color: "#059669" }}>
                          <FiMessageSquare style={{ verticalAlign: -2 }} /> {c.whatsapp}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => setDetailCart(c)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#4f46e5",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 13,
                        }}
                      >
                        {c.itemCount} items →
                      </button>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#111827" }}>
                      {fmtINR(c.totalValue)}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ color: "#374151" }}>{timeAgo(c.lastActivityAt)}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        {fmtDate(c.lastActivityAt)}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: (c.reminderCount || 0) > 0 ? "#059669" : "#9ca3af",
                        }}
                      >
                        {c.reminderCount || 0}
                      </span>
                      {c.lastWhatsappAt && (
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {timeAgo(c.lastWhatsappAt)}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>{statusPill(c.status)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      {c.status === "active" && (
                        <>
                          <button
                            title="Send WhatsApp Reminder"
                            onClick={() => openWaModal(c)}
                            style={btnIconStyle("#059669")}
                          >
                            <FiSend />
                          </button>
                          <button
                            title="Dismiss"
                            onClick={() => dismissCart(c)}
                            style={btnIconStyle("#6b7280")}
                          >
                            <FiXCircle />
                          </button>
                        </>
                      )}
                      <button
                        title="Delete"
                        onClick={() => deleteCart(c)}
                        style={btnIconStyle("#dc2626")}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
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
              Showing <strong>{(page - 1) * limit + 1}</strong>–
              <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={pagerBtnStyle(page <= 1)}
              >
                <FiChevronLeft />
              </button>
              <span
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                Page {page} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                style={pagerBtnStyle(page >= pages)}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================== WhatsApp Modal ======================== */}
      {waCart && (
        <Modal onClose={() => !waSending && setWaCart(null)} title="Send WhatsApp Reminder">
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {waCart.shopName || "Customer"}
              </div>
              <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>
                <FiPhone style={{ verticalAlign: -2 }} /> {waCart.whatsapp || waCart.mobile}
              </div>
              <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
                {waCart.itemCount} items · <strong>{fmtINR(waCart.totalValue)}</strong>
              </div>
            </div>

            <label style={labelStyle}>Meta Template Name *</label>
            <input
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              onBlur={(e) =>
                localStorage.setItem("abandonedCartTemplateName", e.target.value.trim())
              }
              placeholder="e.g., abandoned_cart_reminder"
              style={inputStyle}
            />
            <div style={helpStyle}>
              ✅ Saved automatically — agli baar auto-fill ho jayega.
            </div>

            <label style={{ ...labelStyle, marginTop: 12 }}>Language Code</label>
            <input
              value={waLangCode}
              onChange={(e) => setWaLangCode(e.target.value)}
              onBlur={(e) =>
                localStorage.setItem(
                  "abandonedCartTemplateLang",
                  e.target.value.trim() || "en_US"
                )
              }
              placeholder="en_US"
              style={inputStyle}
            />
            <div style={helpStyle}>
              Common: <code>en_US</code>, <code>en</code>, <code>hi</code>, <code>en_GB</code>
            </div>

            <label style={{ ...labelStyle, marginTop: 12 }}>Recovery URL</label>
            <input
              value={waRecoveryUrl}
              onChange={(e) => setWaRecoveryUrl(e.target.value)}
              onBlur={(e) =>
                localStorage.setItem(
                  "abandonedCartRecoveryUrl",
                  e.target.value.trim() || "https://bafnatoys.com/cart"
                )
              }
              style={inputStyle}
            />
            <div style={helpStyle}>
              ✅ Saved automatically — agli baar auto-fill ho jayega.
            </div>

            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: 12,
                marginTop: 16,
                fontSize: 12,
                color: "#1e3a8a",
                lineHeight: 1.6,
              }}
            >
              <strong>📝 Template BODY should use 4 variables:</strong>
              <br />
              <code>{"{{1}}"}</code> → Shop Name · <code>{"{{2}}"}</code> → Item Count ·{" "}
              <code>{"{{3}}"}</code> → Total Value · <code>{"{{4}}"}</code> → Recovery URL
              <br />
              <br />
              <em>
                Example: "Hi {"{{1}}"}, aapke cart me {"{{2}}"} hain worth {"{{3}}"}. Complete
                karo: {"{{4}}"}"
              </em>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setWaCart(null)}
              disabled={waSending}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#374151",
                fontWeight: 600,
                cursor: waSending ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={sendWhatsApp}
              disabled={waSending || !waTemplate.trim()}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: waSending || !waTemplate.trim() ? "#9ca3af" : "#059669",
                color: "#fff",
                fontWeight: 600,
                cursor: waSending || !waTemplate.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FiSend /> {waSending ? "Sending..." : "Send WhatsApp"}
            </button>
          </div>
        </Modal>
      )}

      {/* ======================== Detail Modal ======================== */}
      {detailCart && (
        <Modal onClose={() => setDetailCart(null)} title="Cart Details" wide>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
              {detailCart.shopName || "Customer"}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {detailCart.mobile} · {fmtINR(detailCart.totalValue)} · {detailCart.itemCount} items
            </div>
          </div>

          <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detailCart.items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 10 }}>
                      {it.image && (
                        <img
                          src={it.image}
                          alt=""
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      )}
                      <span>{it.name}</span>
                    </td>
                    <td style={tdStyle}>{fmtINR(it.price)}</td>
                    <td style={tdStyle}>{it.quantity}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {fmtINR(it.price * it.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detailCart.whatsappSent && detailCart.whatsappSent.length > 0 && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "#111827" }}>
                📨 WhatsApp History
              </div>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                {detailCart.whatsappSent.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 10,
                      borderBottom:
                        i < detailCart.whatsappSent!.length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <strong>{log.template}</strong>{" "}
                        <span
                          style={{
                            color: log.status === "sent" ? "#059669" : "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div style={{ color: "#6b7280" }}>{fmtDate(log.sentAt)}</div>
                    </div>
                    {log.sentBy && (
                      <div style={{ color: "#6b7280", marginTop: 2 }}>by {log.sentBy}</div>
                    )}
                    {log.error && (
                      <div style={{ color: "#dc2626", marginTop: 4 }}>{log.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AdminAbandonedCarts;

/* ============================ STYLES ============================ */
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

const helpStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  marginTop: 4,
};

const btnIconStyle = (color: string): React.CSSProperties => ({
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

const pagerBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: disabled ? "#f3f4f6" : "#fff",
  color: disabled ? "#9ca3af" : "#374151",
  cursor: disabled ? "not-allowed" : "pointer",
  display: "inline-flex",
  alignItems: "center",
});

/* ============================ Modal ============================ */
const Modal: React.FC<{
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}> = ({ children, onClose, title, wide }) => {
  return (
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
          maxWidth: wide ? 720 : 480,
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
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>
            {title}
          </h2>
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
};
