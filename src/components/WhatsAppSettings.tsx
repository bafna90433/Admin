import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/WhatsAppSettings.css";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

// Backend ka root URL (uploads ke liye)
const ROOT_BASE = API_BASE.replace(/\/api\/?$/, "");

/* ------------ Types ------------ */
type Agent = {
  name: string;
  phone: string;
  title?: string;
  avatar?: string;
  enabled?: boolean;
  message?: string;
};
type Settings = {
  enabled: boolean;
  phone: string;
  defaultMessage: string;
  position: "right" | "left";
  offsetX: number;
  offsetY: number;
  showGreeting: boolean;
  greetingText: string;
  autoOpenDelay: number;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  showOnPaths: string[];
  hideOnPaths: string[];
  enableSchedule: boolean;
  startHour: number;
  endHour: number;
  days: number[];
  agents: Agent[];
};

/* ------------ Helpers & Constants ------------ */
const resolveUrl = (u?: string) => {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  // ✅ Changed: Use ROOT_BASE for uploads
  return `${ROOT_BASE}${u.startsWith("/") ? u : `/uploads/${u}`}`;
};

const WEEK_DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const AdminWhatsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* ------------ Load settings ------------ */
  useEffect(() => {
    (async () => {
      try {
        // ✅ Changed: Use API_BASE
        const { data } = await axios.get<Settings>(`${API_BASE}/whatsapp`);
        
        data.showOnPaths ||= [];
        data.hideOnPaths ||= [];
        data.days ||= [1, 2, 3, 4, 5];
        data.agents ||= [];
        data.greetingText ||= "Hey there! How can we help?";
        data.defaultMessage ||= "I have a question about...";
        data.position ||= "right";
        data.offsetX ||= 20;
        data.offsetY ||= 20;
        data.startHour ||= 9;
        data.endHour ||= 18;

        if (data.agents.length === 0 && data.phone) {
          data.agents.push({
            name: "Support",
            phone: String(data.phone).replace(/\D/g, ""),
            title: "Customer Support",
            enabled: true,
          });
        }
        setSettings(data);
      } catch (err) {
        console.error("Failed to load WhatsApp settings:", err);
      }
    })();
  }, []);

  const update = (patch: Partial<Settings>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  /* ------------ Agents CRUD ------------ */
  const addAgent = () =>
    update({
      agents: [
        ...(settings?.agents || []),
        { name: "New Agent", phone: "", title: "Support", enabled: true, avatar: "" },
      ],
    });

  const removeAgent = (idx: number) =>
    update({ agents: (settings?.agents || []).filter((_, i) => i !== idx) });

  const updateAgent = (idx: number, patch: Partial<Agent>) =>
    update({
      agents: (settings?.agents || []).map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    });

  const pickAvatar = async (idx: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const fd = new FormData();
        fd.append("images", file);
        // ✅ Changed: Use API_BASE
        const { data } = await axios.post(`${API_BASE}/upload`, fd);
        const rel = data?.url || data?.urls?.[0];
        if (rel) updateAgent(idx, { avatar: rel });
      } catch (e) {
        alert("Upload failed");
      }
    };
    input.click();
  };

  /* ------------ Day Toggle ------------ */
  const toggleDay = (day: number) => {
    if (!settings) return;
    const currentDays = settings.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    update({ days: newDays.sort() });
  };

  /* ------------ Save ------------ */
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: Settings = {
        ...settings,
        phone: String(settings.phone || "").replace(/\D/g, ""),
        agents: settings.agents.map((a) => ({
          ...a,
          phone: String(a.phone || "").replace(/\D/g, ""),
        })),
      };
      // ✅ Changed: Use API_BASE
      const { data } = await axios.put(`${API_BASE}/whatsapp`, payload);
      setSettings(data.settings || payload);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage(e?.response?.data?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="ws-loading">Loading Settings…</div>;

  return (
    <div className="ws-admin-container">
      <div className="ws-header">
        <div>
          <h1>WhatsApp Widget</h1>
          <p>Manage your customer chat widget settings and agents.</p>
        </div>
        <button className="ws-save-button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {message && (
        <div className={`ws-alert ${message.includes("success") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <form className="ws-form-grid" onSubmit={(e) => e.preventDefault()}>
        {/* -- WIDGET SETTINGS -- */}
        <div className="ws-card">
          <div className="ws-card-header">
            <h3>General Settings</h3>
            <label className="ws-toggle-switch">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
              <span className="ws-slider"></span>
            </label>
          </div>
          <div className="ws-card-body">
            <div className="ws-input-group">
              <label>Default Phone Number</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="e.g., +15551234567"
              />
              <p className="ws-hint">
                This number is used if no agents are available or if agents are disabled.
              </p>
            </div>
            <div className="ws-input-group">
              <label>Default Pre-filled Message</label>
              <textarea
                value={settings.defaultMessage}
                onChange={(e) => update({ defaultMessage: e.target.value })}
                placeholder="I have a question about..."
              />
            </div>
            <div className="ws-input-group">
              <label>Greeting Text</label>
              <input
                type="text"
                value={settings.greetingText}
                onChange={(e) => update({ greetingText: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* -- APPEARANCE -- */}
        <div className="ws-card">
          <div className="ws-card-header">
            <h3>Appearance</h3>
          </div>
          <div className="ws-card-body ws-grid-2">
            <div className="ws-input-group">
              <label>Position</label>
              <select
                value={settings.position}
                onChange={(e) => update({ position: e.target.value as "right" | "left" })}
              >
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
            </div>
            <div className="ws-input-group">
              <label>Auto-open Delay (seconds)</label>
              <input
                type="number"
                value={settings.autoOpenDelay}
                onChange={(e) => update({ autoOpenDelay: Number(e.target.value) })}
              />
            </div>
            <div className="ws-input-group">
              <label>Offset X (px)</label>
              <input
                type="number"
                value={settings.offsetX}
                onChange={(e) => update({ offsetX: Number(e.target.value) })}
              />
            </div>
            <div className="ws-input-group">
              <label>Offset Y (px)</label>
              <input
                type="number"
                value={settings.offsetY}
                onChange={(e) => update({ offsetY: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* -- TEAM MEMBERS -- */}
        <div className="ws-card">
          <div className="ws-card-header">
            <h3>Agents / Team Members</h3>
            <button type="button" className="ws-add-agent-button" onClick={addAgent}>
              + Add Agent
            </button>
          </div>
          <div className="ws-card-body">
            {settings.agents.length === 0 ? (
              <p className="ws-hint">No agents added. The default phone number will be used.</p>
            ) : (
              settings.agents.map((a, i) => (
                <div key={i} className="ws-agent-card">
                  <div className="ws-agent-avatar" onClick={() => pickAvatar(i)}>
                    {a.avatar ? (
                      <img src={resolveUrl(a.avatar)} alt={a.name} />
                    ) : (
                      <span className="ws-agent-initials">{a.name.charAt(0)}</span>
                    )}
                    <div className="ws-change-photo">Change</div>
                  </div>
                  <div className="ws-agent-details">
                    <div className="ws-grid-2">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => updateAgent(i, { name: e.target.value })}
                        placeholder="Agent Name"
                      />
                      <input
                        type="text"
                        value={a.phone}
                        onChange={(e) => updateAgent(i, { phone: e.target.value })}
                        placeholder="Agent Phone Number"
                      />
                    </div>
                    <input
                      type="text"
                      value={a.title || ""}
                      onChange={(e) => updateAgent(i, { title: e.target.value })}
                      placeholder="Title (e.g., Sales, Support)"
                    />
                  </div>
                  <div className="ws-agent-actions">
                    <button type="button" className="ws-icon-button danger" onClick={() => removeAgent(i)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* -- SCHEDULE -- */}
        <div className="ws-card">
          <div className="ws-card-header">
            <h3>Schedule Widget</h3>
             <label className="ws-toggle-switch">
              <input
                type="checkbox"
                checked={settings.enableSchedule}
                onChange={(e) => update({ enableSchedule: e.target.checked })}
              />
              <span className="ws-slider"></span>
            </label>
          </div>
          <div className={`ws-card-body ${!settings.enableSchedule ? 'ws-disabled-section' : ''}`}>
             <div className="ws-input-group">
                <label>Active Days</label>
                <div className="ws-chip-group">
                    {WEEK_DAYS.map(day => (
                         <div key={day.value} 
                            className={`ws-chip ${settings.days.includes(day.value) ? 'active' : ''}`}
                            onClick={() => toggleDay(day.value)}>
                            {day.label}
                        </div>
                    ))}
                </div>
             </div>
             <div className="ws-grid-2">
                <div className="ws-input-group">
                    <label>From (Hour)</label>
                     <input type="number" min="0" max="23" value={settings.startHour} onChange={e => update({ startHour: Number(e.target.value) })}/>
                </div>
                 <div className="ws-input-group">
                    <label>To (Hour)</label>
                     <input type="number" min="0" max="23" value={settings.endHour} onChange={e => update({ endHour: Number(e.target.value) })}/>
                </div>
             </div>
             <p className="ws-hint">The widget will only be shown during the selected days and hours (24h format).</p>
          </div>
        </div>

      </form>
    </div>
  );
};

export default AdminWhatsApp;