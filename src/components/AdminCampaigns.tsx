// admin_panel/src/components/AdminCampaigns.tsx
// Bulk WhatsApp campaign sender — all customers / Excel upload / filters / history.
import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import {
  FiSend,
  FiUpload,
  FiUsers,
  FiRefreshCw,
  FiEye,
  FiXCircle,
  FiPlus,
  FiTrash2,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiPackage,
  FiGift,
  FiList,
} from "react-icons/fi";

/* ================================ TYPES ================================ */
type AudienceType = "all" | "active30" | "active90" | "recent" | "excel" | "manual";
type HeaderType = "none" | "text" | "image" | "video" | "document";

type ManualRecipient = { phone: string; name?: string };

type CampaignListItem = {
  _id: string;
  name: string;
  audienceType: AudienceType;
  templateName: string;
  languageCode: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  queuedCount: number;
  status: "draft" | "running" | "completed" | "completed_with_errors" | "cancelled";
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  createdBy?: string;
};

type MessageLog = {
  phone: string;
  name?: string;
  status: "queued" | "sent" | "failed" | "delivered" | "read";
  messageId?: string;
  error?: string;
  attemptedAt?: string | null;
  sentAt?: string | null;
};

type CampaignDetail = CampaignListItem & {
  bodyVariables: string[];
  headerType: HeaderType;
  headerValue: string;
  offerNote?: string;
  messages: MessageLog[];
};

/* =============================== HELPERS =============================== */
const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const LS_KEY_LAST = "campaignLastForm";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: "#f3f4f6", color: "#374151", label: "Draft" },
  running: { bg: "#dbeafe", color: "#1e40af", label: "Running" },
  completed: { bg: "#d1fae5", color: "#065f46", label: "Completed" },
  completed_with_errors: { bg: "#fef3c7", color: "#92400e", label: "Completed (errors)" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
};

const AUDIENCE_LABEL: Record<AudienceType, string> = {
  all: "All Customers",
  active30: "Active in last 30 days",
  active90: "Active in last 90 days",
  recent: "Recently Registered (30d)",
  excel: "Excel / CSV Upload",
  manual: "Manual Numbers",
};

/* ============================== COMPONENT ============================== */
const AdminCampaigns: React.FC = () => {
  const [tab, setTab] = useState<"new" | "history">("new");

  /* ------------------ shared state ------------------ */
  const [history, setHistory] = useState<CampaignListItem[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histPage, setHistPage] = useState(1);
  const [histPages, setHistPages] = useState(1);

  const loadHistory = async (page = histPage) => {
    setHistLoading(true);
    try {
      const { data } = await api.get(`/campaigns?page=${page}&limit=20`);
      if (data?.success) {
        setHistory(data.items || []);
        setHistPages(data.pages || 1);
        setHistPage(page);
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", e?.response?.data?.message || "Failed to load history", "error");
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "history") loadHistory(1);
  }, [tab]);

  /* ------------------ new-campaign form ------------------ */
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_LAST) || "{}");
    } catch {
      return {};
    }
  })();

  const [name, setName] = useState<string>(saved.name || "");
  const [audienceType, setAudienceType] = useState<AudienceType>(
    saved.audienceType || "all"
  );
  const [templateName, setTemplateName] = useState<string>(saved.templateName || "");
  const [languageCode, setLanguageCode] = useState<string>(
    saved.languageCode || "en_US"
  );
  const [headerType, setHeaderType] = useState<HeaderType>(saved.headerType || "none");
  const [headerValue, setHeaderValue] = useState<string>(saved.headerValue || "");
  const [bodyVariables, setBodyVariables] = useState<string[]>(
    saved.bodyVariables || [""]
  );
  const [offerNote, setOfferNote] = useState<string>("");

  // excel / manual audience
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);
  const [manualInput, setManualInput] = useState<string>("");

  // preview + submit
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Persist form changes (debounced by onBlur)
  const persistForm = () => {
    const snapshot = {
      name,
      audienceType,
      templateName,
      languageCode,
      headerType,
      headerValue,
      bodyVariables,
    };
    localStorage.setItem(LS_KEY_LAST, JSON.stringify(snapshot));
  };

  /* ------------------ excel upload (client-side parse) ------------------ */
  const onExcelFile = async (f: File | null) => {
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Try common column names
      const out: ManualRecipient[] = [];
      for (const r of rows) {
        const phone =
          r.phone ||
          r.Phone ||
          r.PHONE ||
          r.mobile ||
          r.Mobile ||
          r.MOBILE ||
          r.number ||
          r.Number ||
          r.whatsapp ||
          r.WhatsApp ||
          r["WhatsApp Number"] ||
          r["Mobile Number"] ||
          r["Phone Number"] ||
          "";
        const nm =
          r.name ||
          r.Name ||
          r.shopName ||
          r.ShopName ||
          r["Shop Name"] ||
          r["Customer Name"] ||
          "";
        if (phone) out.push({ phone: String(phone).trim(), name: String(nm).trim() });
      }
      if (out.length === 0) {
        Swal.fire(
          "No numbers found",
          "Make sure your sheet has a 'phone' or 'mobile' column.",
          "warning"
        );
        return;
      }
      setManualRecipients(out);
      setAudienceType("excel");
      Swal.fire("Loaded", `${out.length} recipients loaded from Excel.`, "success");
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", "Could not read the file.", "error");
    }
  };

  const addManualNumber = () => {
    const parts = manualInput
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const add = parts.map((p) => ({ phone: p, name: "" }));
    setManualRecipients((prev) => {
      const seen = new Set(prev.map((p) => p.phone));
      const combined = [...prev];
      for (const a of add) if (!seen.has(a.phone)) combined.push(a);
      return combined;
    });
    setManualInput("");
    setAudienceType("manual");
  };

  const removeRecipient = (idx: number) => {
    setManualRecipients((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ------------------ preview ------------------ */
  const doPreview = async () => {
    setPreviewing(true);
    setPreviewCount(null);
    try {
      if (audienceType === "excel" || audienceType === "manual") {
        setPreviewCount(manualRecipients.length);
      } else {
        const { data } = await api.get(
          `/campaigns/preview?audienceType=${audienceType}`
        );
        if (data?.success) setPreviewCount(data.count);
      }
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.message || "Preview failed", "error");
    } finally {
      setPreviewing(false);
    }
  };

  /* ------------------ body variable helpers ------------------ */
  const setVarAt = (idx: number, val: string) => {
    setBodyVariables((prev) => prev.map((v, i) => (i === idx ? val : v)));
  };
  const addVar = () => setBodyVariables((prev) => [...prev, ""]);
  const removeVar = (idx: number) =>
    setBodyVariables((prev) => prev.filter((_, i) => i !== idx));

  /* ------------------ submit ------------------ */
  const submit = async () => {
    if (!name.trim()) {
      Swal.fire("Name required", "Please enter a campaign name.", "warning");
      return;
    }
    if (!templateName.trim()) {
      Swal.fire("Template required", "Please enter a WhatsApp template name.", "warning");
      return;
    }

    const usingManual = audienceType === "excel" || audienceType === "manual";
    if (usingManual && manualRecipients.length === 0) {
      Swal.fire(
        "No recipients",
        "Please add numbers manually or upload an Excel.",
        "warning"
      );
      return;
    }

    const confirm = await Swal.fire({
      title: "Send campaign?",
      html: `<b>${name}</b><br/>Template: <code>${templateName}</code><br/>Audience: <b>${AUDIENCE_LABEL[audienceType]}</b>${
        previewCount !== null ? `<br/>Recipients: <b>${previewCount}</b>` : ""
      }`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Send Now",
      confirmButtonColor: "#16a34a",
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        audienceType,
        templateName: templateName.trim(),
        languageCode: languageCode.trim() || "en_US",
        bodyVariables: bodyVariables.map((v) => v || ""),
        headerType,
        headerValue: headerValue.trim(),
        offerNote: offerNote.trim(),
      };
      if (usingManual) payload.customNumbers = manualRecipients;

      const { data } = await api.post("/campaigns", payload);
      if (data?.success) {
        persistForm();
        await Swal.fire({
          title: "Campaign started",
          text: `${data.totalRecipients} recipients queued. Sending in background.`,
          icon: "success",
        });
        setTab("history");
        loadHistory(1);
      }
    } catch (e: any) {
      Swal.fire(
        "Error",
        e?.response?.data?.message || "Failed to create campaign",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------ campaign detail modal ------------------ */
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/campaigns/${id}`);
      if (data?.success) setDetail(data.campaign);
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.message || "Failed to load", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const cancelCampaign = async (id: string) => {
    const ok = await Swal.fire({
      title: "Cancel this campaign?",
      text: "Remaining queued messages will not be sent.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    try {
      await api.post(`/campaigns/${id}/cancel`);
      Swal.fire("Cancelled", "Campaign cancelled.", "success");
      loadHistory(histPage);
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.message || "Failed", "error");
    }
  };

  const filteredDetailMsgs = useMemo(() => {
    if (!detail) return [];
    const q = detailSearch.trim().toLowerCase();
    if (!q) return detail.messages;
    return detail.messages.filter(
      (m) =>
        m.phone.toLowerCase().includes(q) ||
        (m.name || "").toLowerCase().includes(q) ||
        (m.error || "").toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q)
    );
  }, [detail, detailSearch]);

  /* ============================= RENDER ============================= */
  return (
    <div style={{ padding: 20, maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>
            <FiSend style={{ marginRight: 8, verticalAlign: "middle" }} />
            Bulk WhatsApp Campaigns
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>
            Send new product launch / offer messages to all customers or an uploaded list.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setTab("new")}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: tab === "new" ? "#16a34a" : "#f3f4f6",
              color: tab === "new" ? "#fff" : "#374151",
              fontWeight: 600,
            }}
          >
            <FiPlus style={{ marginRight: 6, verticalAlign: "middle" }} />
            New Campaign
          </button>
          <button
            onClick={() => setTab("history")}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: tab === "history" ? "#16a34a" : "#f3f4f6",
              color: tab === "history" ? "#fff" : "#374151",
              fontWeight: 600,
            }}
          >
            <FiList style={{ marginRight: 6, verticalAlign: "middle" }} />
            History
          </button>
        </div>
      </div>

      {/* ================= NEW CAMPAIGN ================= */}
      {tab === "new" && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          {/* Campaign name */}
          <FormRow label="Campaign Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={persistForm}
              placeholder="e.g. Diwali Offer 2026 / New Pullback Car Launch"
              style={inputStyle}
            />
          </FormRow>

          {/* Audience */}
          <FormRow label="Audience *">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(
                ["all", "active30", "active90", "recent", "manual", "excel"] as AudienceType[]
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setAudienceType(t)}
                  style={{
                    padding: "8px 14px",
                    border: "1px solid " + (audienceType === t ? "#16a34a" : "#d1d5db"),
                    background: audienceType === t ? "#dcfce7" : "#fff",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <FiUsers style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {AUDIENCE_LABEL[t]}
                </button>
              ))}
            </div>
          </FormRow>

          {/* Excel / Manual section */}
          {(audienceType === "excel" || audienceType === "manual") && (
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <label
                  style={{
                    padding: "8px 14px",
                    border: "1px dashed #6b7280",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: "#fff",
                  }}
                >
                  <FiUpload style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Upload Excel / CSV
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => onExcelFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                </label>
                <span style={{ color: "#6b7280", fontSize: 13 }}>
                  Expected columns: <code>phone</code> (required), <code>name</code> (optional)
                </span>
              </div>

              {/* Manual add */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Paste numbers separated by comma, space, or newline"
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                <button
                  onClick={addManualNumber}
                  style={{
                    padding: "0 14px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <FiPlus /> Add
                </button>
              </div>

              {/* List */}
              <div
                style={{
                  maxHeight: 200,
                  overflow: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "#fff",
                }}
              >
                {manualRecipients.length === 0 ? (
                  <div style={{ padding: 14, color: "#9ca3af", textAlign: "center" }}>
                    No recipients yet.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f3f4f6" }}>
                      <tr>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Phone</th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualRecipients.map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={tdStyle}>{i + 1}</td>
                          <td style={tdStyle}>{r.phone}</td>
                          <td style={tdStyle}>{r.name || "—"}</td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => removeRecipient(i)}
                              style={{
                                color: "#dc2626",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                              title="Remove"
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                Total: {manualRecipients.length} number(s). Duplicates automatically removed.
              </div>
            </div>
          )}

          {/* Template + Language */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <FormRow label="Template Name *">
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onBlur={persistForm}
                placeholder="e.g. new_product_launch"
                style={inputStyle}
              />
            </FormRow>
            <FormRow label="Language">
              <input
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                onBlur={persistForm}
                placeholder="en_US"
                style={inputStyle}
              />
            </FormRow>
          </div>

          {/* Header */}
          <FormRow label="Header (optional)">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["none", "text", "image", "video", "document"] as HeaderType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setHeaderType(t);
                    persistForm();
                  }}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid " + (headerType === t ? "#2563eb" : "#d1d5db"),
                    background: headerType === t ? "#dbeafe" : "#fff",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {headerType !== "none" && (
              <input
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                onBlur={persistForm}
                placeholder={
                  headerType === "text" ? "Header text" : "Public URL (https://...)"
                }
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
          </FormRow>

          {/* Body Variables */}
          <FormRow label={`Body Variables (maps to {{1}}, {{2}}, ...)`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bodyVariables.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <span
                    style={{
                      padding: "8px 10px",
                      background: "#f3f4f6",
                      borderRadius: 6,
                      color: "#6b7280",
                      minWidth: 40,
                      textAlign: "center",
                    }}
                  >
                    {`{{${i + 1}}}`}
                  </span>
                  <input
                    value={v}
                    onChange={(e) => setVarAt(i, e.target.value)}
                    onBlur={persistForm}
                    placeholder={
                      i === 0
                        ? "e.g. New Pullback Car"
                        : i === 1
                        ? "e.g. https://bafnatoys.com/product/slug"
                        : "variable value"
                    }
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  />
                  {bodyVariables.length > 1 && (
                    <button
                      onClick={() => removeVar(i)}
                      style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "none",
                        padding: "0 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addVar}
                style={{
                  alignSelf: "flex-start",
                  padding: "6px 12px",
                  background: "#eff6ff",
                  color: "#1e40af",
                  border: "1px dashed #2563eb",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <FiPlus style={{ verticalAlign: "middle", marginRight: 4 }} />
                Add variable
              </button>
            </div>
          </FormRow>

          {/* Offer note (internal) */}
          <FormRow label="Internal Note (optional — for history)">
            <input
              value={offerNote}
              onChange={(e) => setOfferNote(e.target.value)}
              placeholder="e.g. Diwali 20% OFF / New arrival pullback car"
              style={inputStyle}
            />
          </FormRow>

          {/* Action row */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={doPreview}
              disabled={previewing}
              style={{
                padding: "10px 18px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <FiEye style={{ marginRight: 6, verticalAlign: "middle" }} />
              {previewing ? "Checking..." : "Preview Audience"}
            </button>
            {previewCount !== null && (
              <span
                style={{
                  padding: "8px 14px",
                  background: "#dcfce7",
                  color: "#065f46",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                {previewCount} recipient(s) will get this message
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                padding: "12px 24px",
                background: submitting ? "#9ca3af" : "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              <FiSend style={{ marginRight: 6, verticalAlign: "middle" }} />
              {submitting ? "Sending..." : "Send Campaign"}
            </button>
          </div>

          {/* Tip */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 6,
              color: "#92400e",
              fontSize: 13,
            }}
          >
            <FiAlertCircle style={{ marginRight: 6, verticalAlign: "middle" }} />
            Tip: Meta WhatsApp requires the template to be pre-approved. New accounts have a
            ~1000/day limit. Messages are throttled to ~8 per second to stay safe.
          </div>
        </div>
      )}

      {/* ================= HISTORY ================= */}
      {tab === "history" && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 18,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Campaign History</h2>
            <button
              onClick={() => loadHistory(histPage)}
              style={{
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              <FiRefreshCw style={{ marginRight: 6, verticalAlign: "middle" }} />
              Refresh
            </button>
          </div>

          {histLoading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>
              Loading...
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>
              No campaigns yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f9fafb" }}>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Audience</th>
                    <th style={thStyle}>Template</th>
                    <th style={thStyle}>Sent</th>
                    <th style={thStyle}>Failed</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Started</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((c) => {
                    const st = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
                    return (
                      <tr key={c._id} style={{ borderTop: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}>
                          <b>{c.name}</b>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {fmtDate(c.createdAt)}
                          </div>
                        </td>
                        <td style={tdStyle}>{AUDIENCE_LABEL[c.audienceType]}</td>
                        <td style={tdStyle}>
                          <code>{c.templateName}</code>
                        </td>
                        <td style={{ ...tdStyle, color: "#15803d", fontWeight: 600 }}>
                          {c.sentCount}
                        </td>
                        <td style={{ ...tdStyle, color: "#b91c1c", fontWeight: 600 }}>
                          {c.failedCount}
                        </td>
                        <td style={tdStyle}>{c.totalRecipients}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              background: st.bg,
                              color: st.color,
                              padding: "3px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td style={tdStyle}>{fmtDate(c.startedAt)}</td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => openDetail(c._id)}
                            style={{
                              background: "#dbeafe",
                              color: "#1e40af",
                              border: "none",
                              borderRadius: 6,
                              padding: "6px 10px",
                              cursor: "pointer",
                              marginRight: 6,
                            }}
                            title="View details"
                          >
                            <FiEye />
                          </button>
                          {c.status === "running" && (
                            <button
                              onClick={() => cancelCampaign(c._id)}
                              style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                border: "none",
                                borderRadius: 6,
                                padding: "6px 10px",
                                cursor: "pointer",
                              }}
                              title="Cancel"
                            >
                              <FiXCircle />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {histPages > 1 && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 6,
                justifyContent: "center",
              }}
            >
              {Array.from({ length: histPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => loadHistory(i + 1)}
                  style={{
                    padding: "6px 10px",
                    background: histPage === i + 1 ? "#16a34a" : "#f3f4f6",
                    color: histPage === i + 1 ? "#fff" : "#374151",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= DETAIL MODAL ================= */}
      {(detail || detailLoading) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              width: "90%",
              maxWidth: 960,
              maxHeight: "86vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>
                {detail?.name || "Loading..."}{" "}
                {detail && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: STATUS_STYLE[detail.status]?.bg,
                      color: STATUS_STYLE[detail.status]?.color,
                    }}
                  >
                    {STATUS_STYLE[detail.status]?.label}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setDetail(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {detailLoading && (
              <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>
                Loading...
              </div>
            )}

            {detail && (
              <>
                {/* Stat strip */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 10,
                    padding: 14,
                    background: "#f9fafb",
                  }}
                >
                  <Stat label="Total" value={detail.totalRecipients} color="#374151" />
                  <Stat
                    label="Sent"
                    value={detail.sentCount}
                    color="#15803d"
                    icon={<FiCheckCircle />}
                  />
                  <Stat
                    label="Failed"
                    value={detail.failedCount}
                    color="#b91c1c"
                    icon={<FiAlertCircle />}
                  />
                  <Stat
                    label="Queued"
                    value={detail.queuedCount}
                    color="#2563eb"
                    icon={<FiClock />}
                  />
                </div>

                {/* Meta row */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: 13,
                    color: "#6b7280",
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <b>Template:</b> <code>{detail.templateName}</code>
                  </span>
                  <span>
                    <b>Language:</b> {detail.languageCode}
                  </span>
                  <span>
                    <b>Audience:</b> {AUDIENCE_LABEL[detail.audienceType]}
                  </span>
                  <span>
                    <b>Started:</b> {fmtDate(detail.startedAt)}
                  </span>
                  <span>
                    <b>Finished:</b> {fmtDate(detail.finishedAt)}
                  </span>
                </div>

                {/* Search */}
                <div style={{ padding: "10px 16px" }}>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <FiSearch
                      style={{
                        position: "absolute",
                        left: 10,
                        color: "#9ca3af",
                      }}
                    />
                    <input
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      placeholder="Search phone / name / status / error..."
                      style={{
                        ...inputStyle,
                        paddingLeft: 32,
                        marginBottom: 0,
                        width: "100%",
                      }}
                    />
                  </div>
                </div>

                {/* Messages table */}
                <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f3f4f6", position: "sticky", top: 0 }}>
                      <tr>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Phone</th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Sent</th>
                        <th style={thStyle}>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDetailMsgs.map((m, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={tdStyle}>{i + 1}</td>
                          <td style={tdStyle}>{m.phone}</td>
                          <td style={tdStyle}>{m.name || "—"}</td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                background:
                                  m.status === "sent"
                                    ? "#d1fae5"
                                    : m.status === "failed"
                                    ? "#fee2e2"
                                    : "#f3f4f6",
                                color:
                                  m.status === "sent"
                                    ? "#065f46"
                                    : m.status === "failed"
                                    ? "#991b1b"
                                    : "#374151",
                              }}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td style={tdStyle}>{fmtDate(m.sentAt)}</td>
                          <td style={{ ...tdStyle, color: "#b91c1c", fontSize: 12 }}>
                            {m.error || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =============================== UI atoms =============================== */
const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ marginBottom: 14 }}>
    <label
      style={{
        display: "block",
        marginBottom: 6,
        fontSize: 13,
        fontWeight: 600,
        color: "#374151",
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const Stat: React.FC<{
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
}> = ({ label, value, color, icon }) => (
  <div
    style={{
      background: "#fff",
      padding: 12,
      borderRadius: 8,
      textAlign: "center",
      border: "1px solid #e5e7eb",
    }}
  >
    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  marginBottom: 0,
  outline: "none",
  boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: "#374151",
  verticalAlign: "top",
};

export default AdminCampaigns;
