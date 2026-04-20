import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { FiTrendingUp, FiSave, FiCheckCircle } from "react-icons/fi";

type PixelEvents = {
  pageView: boolean;
  viewContent: boolean;
  addToCart: boolean;
  initiateCheckout: boolean;
  purchase: boolean;
};

type PixelSettings = {
  pixelId: string;
  enabled: boolean;
  events: PixelEvents;
};

const DEFAULT_EVENTS: PixelEvents = {
  pageView: true,
  viewContent: true,
  addToCart: true,
  initiateCheckout: true,
  purchase: true,
};

const EVENT_LABELS: Record<keyof PixelEvents, { label: string; desc: string }> = {
  pageView: { label: "Page View", desc: "Har page load hone par fire (recommended)" },
  viewContent: { label: "View Content", desc: "Product page khulne par fire" },
  addToCart: { label: "Add To Cart", desc: "Cart me item add hone par fire" },
  initiateCheckout: { label: "Initiate Checkout", desc: "Checkout page khulne par fire" },
  purchase: { label: "Purchase", desc: "Order complete hone par fire (amount ke saath)" },
};

const MetaPixelSettings: React.FC = () => {
  const [pixelId, setPixelId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<PixelEvents>(DEFAULT_EVENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<PixelSettings>("/settings/meta-pixel");
        setPixelId(res.data.pixelId || "");
        setEnabled(Boolean(res.data.enabled));
        setEvents({ ...DEFAULT_EVENTS, ...(res.data.events || {}) });
      } catch (e) {
        console.error("Failed to load pixel settings", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/meta-pixel", { pixelId, enabled, events });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleEvent = (key: keyof PixelEvents) =>
    setEvents((s) => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return <div style={{ padding: 32, textAlign: "center" }}>Loading…</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.iconBox}>
          <FiTrendingUp size={24} />
        </div>
        <div>
          <h1 style={styles.title}>Meta Pixel (Facebook Ads)</h1>
          <p style={styles.subtitle}>
            Customer events Facebook Ads Manager me track karne ke liye Pixel configure karo
          </p>
        </div>
      </div>

      <div style={styles.card}>
        <label style={styles.label}>Pixel ID</label>
        <input
          type="text"
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 1238757191757343"
          style={styles.input}
          maxLength={20}
        />
        <small style={styles.hint}>
          Facebook Events Manager → Pixel settings se Pixel ID copy karo (15-16 digit number)
        </small>

        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>Enable Meta Pixel</div>
            <div style={styles.toggleHint}>
              Off karne par pixel script frontend me load nahi hoga
            </div>
          </div>
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!pixelId}
            />
            <span style={{ ...styles.slider, background: enabled ? "#10b981" : "#cbd5e1" }}>
              <span
                style={{
                  ...styles.sliderKnob,
                  transform: enabled ? "translateX(22px)" : "translateX(2px)",
                }}
              />
            </span>
          </label>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Events to Track</h3>
        <p style={styles.sectionHint}>
          Jo events track karne hain unhe select karo. Recommended: sab enabled.
        </p>
        <div style={styles.eventList}>
          {(Object.keys(EVENT_LABELS) as (keyof PixelEvents)[]).map((key) => (
            <label key={key} style={styles.eventRow}>
              <input
                type="checkbox"
                checked={events[key]}
                onChange={() => toggleEvent(key)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <div>
                <div style={styles.eventLabel}>{EVENT_LABELS[key].label}</div>
                <div style={styles.eventDesc}>{EVENT_LABELS[key].desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }}
        >
          {savedAt ? <FiCheckCircle /> : <FiSave />}
          {savedAt ? "Saved!" : saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      <div style={styles.info}>
        <strong>How to verify:</strong>
        <ol style={{ margin: "8px 0 0 20px", padding: 0 }}>
          <li>Chrome me <a href="https://chromewebstore.google.com/detail/meta-pixel-helper" target="_blank" rel="noreferrer">Meta Pixel Helper</a> extension install karo</li>
          <li>bafnatoys.com open karo → extension icon green hona chahiye aur Pixel ID dikhana chahiye</li>
          <li>Product kholo, cart me add karo, checkout karo — har step pe event fire hoga</li>
          <li>Facebook Events Manager → Test Events tab me real-time events dikhenge</li>
        </ol>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 820, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  iconBox: {
    width: 48, height: 48, borderRadius: 12,
    background: "linear-gradient(135deg,#1877f2,#4267B2)",
    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", margin: "4px 0 0" },
  card: {
    background: "white", border: "1px solid #e2e8f0", borderRadius: 12,
    padding: 20, marginBottom: 16,
  },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", fontSize: 15, border: "1px solid #cbd5e1",
    borderRadius: 8, outline: "none", fontFamily: "monospace", letterSpacing: 0.5,
  },
  hint: { display: "block", color: "#64748b", fontSize: 12, marginTop: 6 },
  toggleRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9",
  },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
  toggleHint: { fontSize: 12, color: "#64748b", marginTop: 2 },
  switch: { position: "relative", display: "inline-block", width: 46, height: 26 },
  slider: {
    position: "absolute", cursor: "pointer", inset: 0, borderRadius: 26,
    transition: "0.2s",
  },
  sliderKnob: {
    position: "absolute", height: 22, width: 22, top: 2,
    background: "white", borderRadius: "50%", transition: "0.2s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, margin: 0, color: "#0f172a" },
  sectionHint: { fontSize: 13, color: "#64748b", margin: "4px 0 16px" },
  eventList: { display: "flex", flexDirection: "column", gap: 10 },
  eventRow: {
    display: "flex", alignItems: "flex-start", gap: 12, padding: 12,
    border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer",
  },
  eventLabel: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
  eventDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  footer: { display: "flex", justifyContent: "flex-end", marginTop: 16 },
  saveBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#1877f2", color: "white", border: "none",
    padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600,
    cursor: "pointer",
  },
  info: {
    background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
    padding: 16, marginTop: 20, fontSize: 13, color: "#1e3a8a", lineHeight: 1.6,
  },
};

export default MetaPixelSettings;
