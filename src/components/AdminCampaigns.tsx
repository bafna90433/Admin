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

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  draft: { bg: "#f1f5f9", color: "#334155", label: "Draft", dot: "#64748b" },
  running: { bg: "#dbeafe", color: "#1e3a8a", label: "Running", dot: "#2563eb" },
  completed: { bg: "#dcfce7", color: "#14532d", label: "Completed", dot: "#16a34a" },
  completed_with_errors: { bg: "#fef3c7", color: "#78350f", label: "Completed (errors)", dot: "#f59e0b" },
  cancelled: { bg: "#fee2e2", color: "#7f1d1d", label: "Cancelled", dot: "#dc2626" },
};

const AUDIENCE_LABEL: Record<AudienceType, string> = {
  all: "All Customers",
  active30: "Active in last 30 days",
  active90: "Active in last 90 days",
  recent: "Recently Registered (30d)",
  excel: "Excel / CSV Upload",
  manual: "Manual Numbers",
};

const AUDIENCE_COLORS: Record<AudienceType, { bg: string; fg: string; border: string }> = {
  all:      { bg: "#dcfce7", fg: "#065f46", border: "#16a34a" },
  active30: { bg: "#dbeafe", fg: "#1e3a8a", border: "#2563eb" },
  active90: { bg: "#ede9fe", fg: "#5b21b6", border: "#7c3aed" },
  recent:   { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" },
  manual:   { bg: "#fce7f3", fg: "#9d174d", border: "#ec4899" },
  excel:    { bg: "#cffafe", fg: "#155e75", border: "#06b6d4" },
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
  // Optional body text (for live preview only — NOT sent to Meta,
  // Meta uses the approved template body from templateName)
  const [bodyTemplateText, setBodyTemplateText] = useState<string>(
    saved.bodyTemplateText || ""
  );

  // excel / manual audience
  const [manualRecipients, setManualRecipients] = useState<ManualRecipient[]>([]);
  const [manualInput, setManualInput] = useState<string>("");

  // preview + submit
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Media upload (ImageKit)
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const onUploadMedia = async (file: File | null) => {
    if (!file) return;
    setUploadingMedia(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/campaigns/upload-media", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.success && data.url) {
        setHeaderValue(data.url);
        // persist so next reload keeps it
        setTimeout(persistForm, 0);
        Swal.fire({
          title: "Uploaded!",
          text: "Media URL auto-filled in Header.",
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        throw new Error(data?.message || "Upload failed");
      }
    } catch (e: any) {
      Swal.fire(
        "Upload failed",
        e?.response?.data?.message || e?.message || "Try again",
        "error"
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  // ---------- TEST SEND (single number) ----------
  // Sends one message right now and shows Meta's exact response/error.
  // Use this BEFORE launching a real campaign to debug template/variable issues.
  const [testing, setTesting] = useState(false);
  const sendTest = async () => {
    if (!templateName.trim()) {
      Swal.fire("Template required", "Enter a WhatsApp template name first.", "warning");
      return;
    }
    if (
      (headerType === "image" || headerType === "video" || headerType === "document") &&
      !headerValue.trim()
    ) {
      Swal.fire(
        "Header media missing",
        `Your template has an <b>${headerType}</b> header. Upload or paste a URL first.`,
        "warning"
      );
      return;
    }

    const { value: phone } = await Swal.fire({
      title: "Send test message",
      input: "text",
      inputLabel: "Your WhatsApp number (with or without +91)",
      inputPlaceholder: "9876543210",
      showCancelButton: true,
      confirmButtonText: "Send Test",
      confirmButtonColor: "#16a34a",
      inputValidator: (v) =>
        !v || v.replace(/\D/g, "").length < 10 ? "Enter a valid number" : null,
    });
    if (!phone) return;

    setTesting(true);
    try {
      const { data } = await api.post("/campaigns/test-send", {
        phone,
        templateName: templateName.trim(),
        languageCode: languageCode.trim() || "en_US",
        bodyVariables: bodyVariables.map((v) => v || ""),
        headerType,
        headerValue: headerValue.trim(),
      });

      if (data?.success) {
        await Swal.fire({
          title: "✅ Test sent!",
          html: `Message ID: <code>${data.messageId || "n/a"}</code><br/>To: <b>${data.to}</b><br/><br/>Check your WhatsApp now. If it doesn't arrive within 1 minute, Meta accepted but couldn't deliver.`,
          icon: "success",
        });
      } else {
        await Swal.fire({
          title: "❌ Meta rejected",
          html: `<div style="text-align:left;font-size:13px">
                   <b>Error:</b> ${data.error || "unknown"}<br/>
                   <b>Code:</b> ${data.errorCode ?? "n/a"}${
                     data.errorSubcode ? " / " + data.errorSubcode : ""
                   }<br/>
                   ${data.errorDetails ? `<b>Details:</b> ${data.errorDetails}<br/>` : ""}
                   <hr style="margin:8px 0"/>
                   <b>Sent components:</b><pre style="background:#f3f4f6;padding:8px;border-radius:6px;font-size:11px;max-height:200px;overflow:auto">${JSON.stringify(
                     data.sentPayload?.components || [],
                     null,
                     2
                   )}</pre>
                 </div>`,
          icon: "error",
          width: 600,
        });
      }
    } catch (e: any) {
      Swal.fire(
        "Test failed",
        e?.response?.data?.message || e?.message || "Try again",
        "error"
      );
    } finally {
      setTesting(false);
    }
  };

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
      bodyTemplateText,
    };
    localStorage.setItem(LS_KEY_LAST, JSON.stringify(snapshot));
  };

  /* ------------- live preview rendering ------------- */
  // Replace {{1}}, {{2}}... with the entered variable values
  const renderedBody = useMemo(() => {
    let txt = bodyTemplateText || "";
    bodyVariables.forEach((v, i) => {
      const re = new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, "g");
      txt = txt.replace(re, v || `{{${i + 1}}}`);
    });
    return txt;
  }, [bodyTemplateText, bodyVariables]);

  // Detect how many distinct {{N}} placeholders are in the template body
  const detectedVarCount = useMemo(() => {
    if (!bodyTemplateText) return 0;
    const matches = bodyTemplateText.match(/\{\{\s*(\d+)\s*\}\}/g) || [];
    let max = 0;
    matches.forEach((m) => {
      const n = parseInt(m.replace(/[^\d]/g, ""), 10);
      if (n > max) max = n;
    });
    return max;
  }, [bodyTemplateText]);

  // Auto-sync bodyVariables count when template text changes
  useEffect(() => {
    if (detectedVarCount === 0) return;
    setBodyVariables((prev) => {
      if (prev.length === detectedVarCount) return prev;
      const next = [...prev];
      while (next.length < detectedVarCount) next.push("");
      while (next.length > detectedVarCount) next.pop();
      return next;
    });
  }, [detectedVarCount]);

  const nowTime = useMemo(
    () =>
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

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

    // ⚠️ VALIDATION 1: variable count must match template body
    if (detectedVarCount > 0 && bodyVariables.length !== detectedVarCount) {
      Swal.fire(
        "Variables mismatch",
        `Your template body has <b>${detectedVarCount}</b> variable(s) (<code>{{1}}..{{${detectedVarCount}}}</code>) but you filled <b>${bodyVariables.length}</b>. Meta will reject this with error #132000.`,
        "warning"
      );
      return;
    }
    const emptyVarIdx = bodyVariables.findIndex((v) => !v || !v.trim());
    if (emptyVarIdx >= 0) {
      const ok = await Swal.fire({
        title: "Empty variable detected",
        html: `Variable <code>{{${emptyVarIdx + 1}}}</code> is empty. WhatsApp template variables cannot be blank — Meta will reject the message.<br/><br/>Continue anyway?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Send anyway",
        cancelButtonText: "Fix it",
        confirmButtonColor: "#dc2626",
      });
      if (!ok.isConfirmed) return;
    }

    // ⚠️ VALIDATION 2: media header must have a URL
    if (
      (headerType === "image" || headerType === "video" || headerType === "document") &&
      !headerValue.trim()
    ) {
      Swal.fire(
        "Header media missing",
        `Your template has an <b>${headerType}</b> header. Please upload or paste a URL — otherwise Meta will reject with error #132000.`,
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
    <div
      style={{
        padding: 24,
        maxWidth: 1320,
        margin: "0 auto",
        fontFamily: FONT_FAMILY,
        color: "#0f172a",
        background: "linear-gradient(180deg, #f0fdf4 0%, #f9fafb 220px, #f9fafb 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
          flexWrap: "wrap",
          gap: 14,
          background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
          padding: "22px 24px",
          borderRadius: 16,
          boxShadow: "0 10px 30px -10px rgba(37, 211, 102, 0.5)",
          color: "#fff",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -0.4,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.22)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              <FiSend />
            </span>
            Bulk WhatsApp Campaigns
          </h1>
          <p
            style={{
              margin: "6px 0 0 54px",
              color: "rgba(255,255,255,0.92)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Send new product launches &amp; offers to all customers, or upload an Excel list.
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "rgba(255,255,255,0.2)",
            padding: 5,
            borderRadius: 12,
            backdropFilter: "blur(6px)",
          }}
        >
          <button
            onClick={() => setTab("new")}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: tab === "new" ? "#fff" : "transparent",
              color: tab === "new" ? "#128C7E" : "#fff",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: FONT_FAMILY,
              transition: "all 0.2s",
              boxShadow: tab === "new" ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <FiPlus style={{ marginRight: 6, verticalAlign: "middle" }} />
            New Campaign
          </button>
          <button
            onClick={() => setTab("history")}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: tab === "history" ? "#fff" : "transparent",
              color: tab === "history" ? "#128C7E" : "#fff",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: FONT_FAMILY,
              transition: "all 0.2s",
              boxShadow: tab === "history" ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
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
            display: "grid",
            gridTemplateColumns:
              typeof window !== "undefined" && window.innerWidth < 900
                ? "1fr"
                : "1fr 360px",
            gap: 16,
            alignItems: "start",
          }}
        >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15,23,42,0.04)",
            border: "1px solid #f1f5f9",
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {(
                ["all", "active30", "active90", "recent", "manual", "excel"] as AudienceType[]
              ).map((t) => {
                const active = audienceType === t;
                const palette = AUDIENCE_COLORS[t];
                return (
                  <button
                    key={t}
                    onClick={() => setAudienceType(t)}
                    style={{
                      padding: "10px 16px",
                      border: `1.5px solid ${active ? palette.border : "#e5e7eb"}`,
                      background: active ? palette.bg : "#fff",
                      color: active ? palette.fg : "#475569",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontSize: 13.5,
                      fontWeight: active ? 700 : 600,
                      fontFamily: FONT_FAMILY,
                      transition: "all 0.18s",
                      boxShadow: active ? `0 4px 12px -4px ${palette.border}` : "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FiUsers />
                    {AUDIENCE_LABEL[t]}
                  </button>
                );
              })}
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
              <div style={{ marginTop: 8 }}>
                <input
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  onBlur={persistForm}
                  placeholder={
                    headerType === "text"
                      ? "Header text"
                      : "Public URL (https://...) — or upload below"
                  }
                  style={inputStyle}
                />

                {/* Upload button for media headers */}
                {headerType !== "text" && (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 18px",
                        background: uploadingMedia
                          ? "#e5e7eb"
                          : "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                        color: "#78350f",
                        border: "1.5px dashed #f59e0b",
                        borderRadius: 10,
                        cursor: uploadingMedia ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        fontSize: 13.5,
                        fontFamily: FONT_FAMILY,
                      }}
                    >
                      <FiUpload />
                      {uploadingMedia
                        ? "Uploading to ImageKit..."
                        : `Upload ${headerType} from computer`}
                      <input
                        type="file"
                        accept={
                          headerType === "image"
                            ? "image/*"
                            : headerType === "video"
                            ? "video/*"
                            : ".pdf,.doc,.docx"
                        }
                        onChange={(e) => onUploadMedia(e.target.files?.[0] || null)}
                        disabled={uploadingMedia}
                        style={{ display: "none" }}
                      />
                    </label>
                    {headerValue && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#16a34a",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <FiCheckCircle /> Uploaded & URL filled
                      </span>
                    )}
                  </div>
                )}

                {/* Inline thumbnail preview of the uploaded/pasted media */}
                {headerType !== "text" && headerValue && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                      border: "1.5px solid #86efac",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      boxShadow: "0 2px 8px -2px rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    {/* Thumbnail */}
                    {headerType === "image" && (
                      <img
                        src={headerValue}
                        alt="Uploaded preview"
                        style={{
                          width: 90,
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "2px solid #fff",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0.3";
                        }}
                      />
                    )}
                    {headerType === "video" && (
                      <video
                        src={headerValue}
                        controls
                        style={{
                          width: 140,
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "2px solid #fff",
                          background: "#000",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {headerType === "document" && (
                      <div
                        style={{
                          width: 90,
                          height: 90,
                          borderRadius: 10,
                          background: "#fff",
                          border: "2px solid #fff",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#dc2626",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ fontSize: 32 }}>📄</div>
                        <div>PDF</div>
                      </div>
                    )}

                    {/* Meta info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#065f46",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <FiCheckCircle />
                        {headerType === "image"
                          ? "Image ready"
                          : headerType === "video"
                          ? "Video ready"
                          : "Document ready"}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "#047857",
                          wordBreak: "break-all",
                          fontFamily: "monospace",
                          background: "#fff",
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid #d1fae5",
                        }}
                      >
                        {headerValue.length > 70
                          ? headerValue.slice(0, 70) + "..."
                          : headerValue}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <a
                          href={headerValue}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11.5,
                            color: "#1e40af",
                            fontWeight: 600,
                            textDecoration: "none",
                            padding: "4px 10px",
                            background: "#dbeafe",
                            borderRadius: 6,
                          }}
                        >
                          🔗 Open
                        </a>
                        <button
                          onClick={() => {
                            setHeaderValue("");
                            setTimeout(persistForm, 0);
                          }}
                          style={{
                            fontSize: 11.5,
                            color: "#991b1b",
                            fontWeight: 600,
                            padding: "4px 10px",
                            background: "#fee2e2",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                          }}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </FormRow>

          {/* Body Variables */}
          {/* Preview-only body template (paste your approved template text here for live preview) */}
          <FormRow label="Template Body Text (for live preview only — paste your approved template body)">
            <textarea
              value={bodyTemplateText}
              onChange={(e) => setBodyTemplateText(e.target.value)}
              onBlur={persistForm}
              placeholder={
                "e.g.\nHello {{1}}, 🎉\nWe just launched {{2}}!\nCheck it out: {{3}}\n— Bafna Toys"
              }
              rows={4}
              style={{
                ...inputStyle,
                fontFamily: "inherit",
                resize: "vertical",
                minHeight: 90,
              }}
            />
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              ℹ️ This text is used only for the live preview on the right. Meta
              will actually use the body of the approved <code>{templateName || "template"}</code>.
            </div>
          </FormRow>

          {detectedVarCount > 0 && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                background:
                  bodyVariables.length === detectedVarCount &&
                  bodyVariables.every((v) => v && v.trim())
                    ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                    : "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                border: `1.5px solid ${
                  bodyVariables.length === detectedVarCount &&
                  bodyVariables.every((v) => v && v.trim())
                    ? "#22c55e"
                    : "#f59e0b"
                }`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color:
                  bodyVariables.length === detectedVarCount &&
                  bodyVariables.every((v) => v && v.trim())
                    ? "#065f46"
                    : "#78350f",
                fontFamily: FONT_FAMILY,
              }}
            >
              {bodyVariables.length === detectedVarCount &&
              bodyVariables.every((v) => v && v.trim()) ? (
                <>
                  ✅ Template needs <b>{detectedVarCount}</b> variable(s) — all filled correctly.
                </>
              ) : (
                <>
                  ⚠️ Template body has <b>{detectedVarCount}</b> variable placeholder(s).
                  Fill all <code>{`{{1}}..{{${detectedVarCount}}}`}</code> below — empty values
                  will cause Meta error <code>#132000</code>.
                </>
              )}
            </div>
          )}

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
                padding: "11px 20px",
                background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                color: "#075985",
                border: "1.5px solid #38bdf8",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: FONT_FAMILY,
                fontSize: 14,
              }}
            >
              <FiEye style={{ marginRight: 6, verticalAlign: "middle" }} />
              {previewing ? "Checking..." : "Preview Audience"}
            </button>
            {previewCount !== null && (
              <span
                style={{
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
                  color: "#065f46",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontFamily: FONT_FAMILY,
                  fontSize: 14,
                  border: "1.5px solid #22c55e",
                }}
              >
                🎯 {previewCount} recipient(s) will get this message
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={sendTest}
              disabled={testing || submitting}
              title="Send a single test message to your own WhatsApp first to verify the template works"
              style={{
                padding: "14px 22px",
                background: testing
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: testing || submitting ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontFamily: FONT_FAMILY,
                fontSize: 14.5,
                letterSpacing: 0.2,
                boxShadow: testing
                  ? "none"
                  : "0 10px 25px -8px rgba(245, 158, 11, 0.55)",
                marginRight: 10,
              }}
            >
              🧪 {testing ? "Testing..." : "Send Test"}
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                padding: "14px 28px",
                background: submitting
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontFamily: FONT_FAMILY,
                fontSize: 15.5,
                letterSpacing: 0.2,
                boxShadow: submitting
                  ? "none"
                  : "0 10px 25px -8px rgba(37, 211, 102, 0.6)",
                transition: "transform 0.15s",
              }}
            >
              <FiSend style={{ marginRight: 8, verticalAlign: "middle" }} />
              {submitting ? "Sending..." : "Send Campaign"}
            </button>
          </div>

          {/* Tip */}
          <div
            style={{
              marginTop: 18,
              padding: 14,
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              border: "1.5px solid #fbbf24",
              borderRadius: 10,
              color: "#78350f",
              fontSize: 13,
              fontFamily: FONT_FAMILY,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            <FiAlertCircle style={{ marginRight: 6, verticalAlign: "middle" }} />
            <b>Tip:</b> Meta WhatsApp requires the template to be pre-approved. New accounts have
            a ~1000/day limit. Messages are throttled to ~8 per second to stay safe.
          </div>
        </div>

        {/* ================= LIVE PREVIEW (right column) ================= */}
        <LivePreview
          headerType={headerType}
          headerValue={headerValue}
          bodyText={renderedBody}
          nowTime={nowTime}
        />
        </div>
      )}

      {/* ================= HISTORY ================= */}
      {tab === "history" && (
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 22,
            boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15,23,42,0.04)",
            border: "1px solid #f1f5f9",
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
                              padding: "5px 12px",
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontFamily: FONT_FAMILY,
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: st.dot,
                                boxShadow:
                                  c.status === "running"
                                    ? `0 0 0 4px ${st.dot}33`
                                    : "none",
                              }}
                            />
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
/* ================= WhatsApp-style live preview ================= */
const LivePreview: React.FC<{
  headerType: HeaderType;
  headerValue: string;
  bodyText: string;
  nowTime: string;
}> = ({ headerType, headerValue, bodyText, nowTime }) => {
  return (
    <div
      style={{
        position: "sticky",
        top: 20,
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        borderRadius: 18,
        padding: 18,
        boxShadow:
          "0 12px 30px -8px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15,23,42,0.05)",
        border: "1px solid #e2e8f0",
        fontFamily: FONT_FAMILY,
      }}
    >
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: 14,
          color: "#0f172a",
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          gap: 8,
          letterSpacing: -0.2,
        }}
      >
        <span
          style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            color: "#fff",
            width: 26,
            height: 26,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          <FiEye />
        </span>
        Live Preview
      </h3>

      {/* Phone chrome */}
      <div
        style={{
          background: "#0b1410",
          borderRadius: 26,
          padding: 10,
          boxShadow:
            "inset 0 0 0 2px #1e293b, 0 20px 40px -10px rgba(0,0,0,0.25)",
        }}
      >
        {/* notch */}
        <div
          style={{
            height: 18,
            background: "#000",
            borderRadius: "14px 14px 0 0",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 60,
              height: 8,
              background: "#0b1410",
              borderRadius: 999,
            }}
          />
        </div>

        {/* screen */}
        <div
          style={{
            background: "#ECE5DD",
            padding: "10px 10px 18px",
            minHeight: 380,
            borderRadius: "0 0 18px 18px",
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.35) 1px, transparent 1px), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {/* WhatsApp top bar */}
          <div
            style={{
              background: "linear-gradient(135deg, #128C7E 0%, #075E54 100%)",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: 8,
              margin: "-10px -10px 12px",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              BT
            </div>
            <div>
              <div style={{ fontSize: 13.5, letterSpacing: 0.2 }}>Bafna Toys</div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  opacity: 0.9,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#86efac",
                    display: "inline-block",
                  }}
                />
                online
              </div>
            </div>
          </div>

          {/* Message bubble (incoming from business) */}
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 6,
              maxWidth: "88%",
              boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
              position: "relative",
            }}
          >
          {/* Header media */}
          {headerType === "image" && headerValue && (
            <img
              src={headerValue}
              alt="header"
              style={{
                width: "100%",
                borderRadius: 6,
                display: "block",
                maxHeight: 200,
                objectFit: "cover",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {headerType === "video" && headerValue && (
            <video
              src={headerValue}
              controls
              style={{
                width: "100%",
                borderRadius: 6,
                display: "block",
                maxHeight: 200,
              }}
            />
          )}
          {headerType === "document" && headerValue && (
            <div
              style={{
                background: "#f3f4f6",
                padding: 10,
                borderRadius: 6,
                fontSize: 12,
                color: "#374151",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              📄 {headerValue.split("/").pop() || "document.pdf"}
            </div>
          )}
          {headerType === "text" && headerValue && (
            <div
              style={{
                padding: "6px 8px 0",
                fontWeight: 700,
                fontSize: 14,
                color: "#111",
              }}
            >
              {headerValue}
            </div>
          )}

          {/* Body */}
          <div
            style={{
              padding: "6px 8px 4px",
              fontSize: 13.5,
              color: "#111",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.4,
            }}
          >
            {bodyText ? (
              linkifyText(bodyText)
            ) : (
              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
                Body text empty — paste your template body above to preview.
              </span>
            )}
          </div>

          {/* Time + double tick */}
          <div
            style={{
              fontSize: 10,
              color: "#667781",
              textAlign: "right",
              padding: "2px 6px 2px",
            }}
          >
            {nowTime} ✓✓
          </div>
          </div>
          {/* /bubble */}
        </div>
        {/* /screen */}
      </div>
      {/* /phone chrome */}

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "#9ca3af",
          textAlign: "center",
        }}
      >
        Preview updates as you type. Actual text comes from the approved Meta
        template body.
      </div>
    </div>
  );
};

// Make URLs clickable blue
function linkifyText(text: string): React.ReactNode {
  const splitRegex = /(https?:\/\/[^\s]+)/g;
  const testRegex = /^https?:\/\//;
  const parts = text.split(splitRegex);
  return parts.map((p, i) =>
    testRegex.test(p) ? (
      <a
        key={i}
        href={p}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#1e40af", wordBreak: "break-all" }}
      >
        {p}
      </a>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
}

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

const FONT_FAMILY =
  '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid #e5e7eb",
  borderRadius: 10,
  fontSize: 14.5,
  fontFamily: FONT_FAMILY,
  fontWeight: 500,
  color: "#111827",
  marginBottom: 0,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  borderBottom: "2px solid #e2e8f0",
  fontFamily: FONT_FAMILY,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13.5,
  color: "#1e293b",
  verticalAlign: "top",
  fontFamily: FONT_FAMILY,
  fontWeight: 500,
};

export default AdminCampaigns;
