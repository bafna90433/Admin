// src/components/WhatsAppSettings.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/WhatsAppSettings.css";

const API = "http://localhost:5000";

/* ------------ Types ------------ */
type Agent = {
  name: string;
  phone: string;
  title?: string;
  avatar?: string;   // can be "/uploads/..." OR full URL
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
  autoOpenDelay: number; // ms
  showOnMobile: boolean;
  showOnDesktop: boolean;
  showOnPaths: string[];
  hideOnPaths: string[];
  enableSchedule: boolean;
  startHour: number; // 0-23
  endHour: number;   // 0-23
  days: number[];    // 0..6 (Sun..Sat)
  agents: Agent[];
};

/* ------------ Helpers ------------ */
const resolveUrl = (u?: string) => {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return `${API}${u.startsWith("/") ? u : `/uploads/${u}`}`;
};

const AdminWhatsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* ------------ Load settings ------------ */
  useEffect(() => {
    (async () => {
      const { data } = await axios.get<Settings>(`${API}/api/whatsapp`);
      // sane defaults
      data.showOnPaths ||= [];
      data.hideOnPaths ||= [];
      data.days ||= [1,2,3,4,5,6];   // Mon-Sat
      data.agents ||= [];
      if (data.agents.length === 0 && data.phone) {
        data.agents.push({
          name: "Support",
          phone: String(data.phone).replace(/\D/g, ""),
          title: "Customer Support",
          enabled: true,
        });
      }
      setSettings(data);
    })();
  }, []);

  const update = (patch: Partial<Settings>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  /* ------------ Agents CRUD ------------ */
  const addAgent = () =>
    update({
      agents: [
        ...(settings?.agents || []),
        {
          name: "New Agent",
          phone: "",
          title: "Customer Executive",
          enabled: true,
          avatar: "",
          message: "",
        },
      ],
    });

  const removeAgent = (idx: number) =>
    update({ agents: (settings?.agents || []).filter((_, i) => i !== idx) });

  const updateAgent = (idx: number, patch: Partial<Agent>) =>
    update({
      agents: (settings?.agents || []).map((a, i) =>
        i === idx ? { ...a, ...patch } : a
      ),
    });

  const moveAgent = (from: number, to: number) => {
    if (!settings) return;
    const list = [...settings.agents];
    if (to < 0 || to >= list.length) return;
    const [it] = list.splice(from, 1);
    list.splice(to, 0, it);
    update({ agents: list });
  };

  // Upload avatar (save RELATIVE path; preview uses resolveUrl)
  const pickAvatar = async (idx: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const fd = new FormData();
        fd.append("images", file); // /api/upload accepts `images`
        // NOTE: don't set Content-Type manually, let the browser handle it
        const { data } = await axios.post(`${API}/api/upload`, fd);
        const rel = data?.url || data?.urls?.[0];
        if (rel) updateAgent(idx, { avatar: rel });
        else alert("Upload failed (no url returned)");
      } catch (e) {
        console.error(e);
        alert("Upload failed");
      }
    };
    input.click();
  };

  /* ------------ Save ------------ */
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      // sanitize phones
      const payload: Settings = {
        ...settings,
        phone: String(settings.phone || "").replace(/\D/g, ""),
        agents: settings.agents.map((a) => ({
          ...a,
          phone: String(a.phone || "").replace(/\D/g, ""),
        })),
      };
      const { data } = await axios.put(`${API}/api/whatsapp`, payload);
      setSettings(data.settings || payload);
      setMessage("Saved!");
    } catch (e: any) {
      setMessage(e?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="ws-loading">Loading…</div>;

  /* ------------ UI ------------ */
  return (
    <div className="ws-admin">
      <header className="ws-header">
        <h1>WhatsApp Chat Settings</h1>
        <p>Configure how your WhatsApp widget appears and behaves for customers.</p>
      </header>

      {message && (
        <div className={`ws-alert ${message === "Saved!" ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="ws-form">
        {/* GENERAL */}
        <section className="ws-section ws-main-options">
          <h2>General Settings</h2>

          <div className="ws-grid">
            <label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
              Enable WhatsApp Chat
            </label>

            <label>
              Default WhatsApp Number
              <input
                type="text"
                value={settings.phone}
                onChange={(e) =>
                  update({ phone: e.target.value.replace(/\D/g, "") })
                }
                placeholder="91XXXXXXXXXX"
              />
              <span className="ws-hint">Digits only (e.g., 917550350036)</span>
            </label>

            <label>
              Default Message
              <input
                type="text"
                value={settings.defaultMessage}
                onChange={(e) => update({ defaultMessage: e.target.value })}
                placeholder="Hi, I have a question about..."
              />
            </label>

            <div className="ws-row">
              <label>
                Position
                <select
                  value={settings.position}
                  onChange={(e) => update({ position: e.target.value as "left" | "right" })}
                >
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>
              </label>

              <label>
                Offset X (px)
                <input
                  type="number"
                  value={settings.offsetX}
                  onChange={(e) => update({ offsetX: Number(e.target.value) })}
                />
              </label>

              <label>
                Offset Y (px)
                <input
                  type="number"
                  value={settings.offsetY}
                  onChange={(e) => update({ offsetY: Number(e.target.value) })}
                />
              </label>
            </div>

            <label>
              <input
                type="checkbox"
                checked={settings.showGreeting}
                onChange={(e) => update({ showGreeting: e.target.checked })}
              />
              Show Greeting Bubble
            </label>

            <label>
              Greeting Text
              <input
                type="text"
                value={settings.greetingText}
                onChange={(e) => update({ greetingText: e.target.value })}
                placeholder="Hello! How can we help you today?"
              />
            </label>

            <label>
              Auto-open Delay (ms)
              <input
                type="number"
                value={settings.autoOpenDelay}
                onChange={(e) => update({ autoOpenDelay: Number(e.target.value) })}
                placeholder="0 = disabled"
              />
            </label>

            <div className="ws-row">
              <label>
                <input
                  type="checkbox"
                  checked={settings.showOnMobile}
                  onChange={(e) => update({ showOnMobile: e.target.checked })}
                />
                Show on Mobile
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.showOnDesktop}
                  onChange={(e) => update({ showOnDesktop: e.target.checked })}
                />
                Show on Desktop
              </label>
            </div>

            <label>
              Show Only on Paths
              <input
                type="text"
                value={settings.showOnPaths.join(",")}
                onChange={(e) =>
                  update({
                    showOnPaths: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="/, /product/*"
              />
              <span className="ws-hint">Comma-separated, supports wildcards</span>
            </label>

            <label>
              Hide on Paths
              <input
                type="text"
                value={settings.hideOnPaths.join(",")}
                onChange={(e) =>
                  update({
                    hideOnPaths: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="/checkout"
              />
            </label>
          </div>
        </section>

        {/* SCHEDULE */}
        <section className="ws-section ws-schedule">
          <h2>Schedule</h2>

          <div className="ws-grid">
            <label>
              <input
                type="checkbox"
                checked={settings.enableSchedule}
                onChange={(e) => update({ enableSchedule: e.target.checked })}
              />
              Enable Schedule
            </label>

            <div className="ws-row">
              <label>
                Start Hour (24h)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.startHour}
                  onChange={(e) => update({ startHour: Number(e.target.value) })}
                />
              </label>

              <label>
                End Hour (24h)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.endHour}
                  onChange={(e) => update({ endHour: Number(e.target.value) })}
                />
              </label>
            </div>

            <label>
              Active Days
              <div className="ws-chip-group">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => {
                  const checked = settings.days.includes(i);
                  return (
                    <label key={day} className={`ws-chip ${checked ? "active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const days = new Set(settings.days);
                          e.target.checked ? days.add(i) : days.delete(i);
                          update({ days: Array.from(days).sort() });
                        }}
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
            </label>
          </div>
        </section>

        {/* TEAM MEMBERS */}
        <section className="ws-section ws-agents">
          <h2>Team Members</h2>

          <div className="ws-grid">
            {settings.agents.map((agent, i) => (
              <div key={i} className="ws-agent-card">
                <div className="ws-agent-avatar">
                  {agent.avatar ? (
                    <img
                      src={resolveUrl(agent.avatar)}
                      alt={agent.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="ws-agent-initials">
                      {agent.name?.trim()?.charAt(0)?.toUpperCase() || "A"}
                    </span>
                  )}

                  <button
                    type="button"
                    className="ws-change-photo"
                    onClick={() => pickAvatar(i)}
                  >
                    Change
                  </button>
                </div>

                <div className="ws-agent-details">
                  <div className="ws-row">
                    <label>
                      Name
                      <input
                        type="text"
                        value={agent.name}
                        onChange={(e) => updateAgent(i, { name: e.target.value })}
                      />
                    </label>

                    <label>
                      Title
                      <input
                        type="text"
                        value={agent.title || ""}
                        onChange={(e) => updateAgent(i, { title: e.target.value })}
                        placeholder="Customer Executive"
                      />
                    </label>
                  </div>

                  <div className="ws-row">
                    <label>
                      Phone
                      <input
                        type="text"
                        value={agent.phone}
                        onChange={(e) =>
                          updateAgent(i, { phone: e.target.value.replace(/\D/g, "") })
                        }
                        placeholder="9175xxxxxxxx"
                      />
                    </label>

                    <label>
                      Avatar URL (optional)
                      <input
                        type="text"
                        value={agent.avatar || ""}
                        onChange={(e) => updateAgent(i, { avatar: e.target.value })}
                        placeholder="https://…/avatar.png or /uploads/avatar.png"
                      />
                    </label>
                  </div>

                  <label>
                    Prefilled Message
                    <input
                      type="text"
                      value={agent.message || ""}
                      onChange={(e) => updateAgent(i, { message: e.target.value })}
                      placeholder={settings.defaultMessage}
                    />
                  </label>

                  <div className="ws-agent-actions">
                    <label className="ws-agent-toggle">
                      <input
                        type="checkbox"
                        checked={agent.enabled !== false}
                        onChange={(e) => updateAgent(i, { enabled: e.target.checked })}
                      />
                      Active
                    </label>

                    <div className="ws-buttons-row">
                      <button
                        type="button"
                        className="ws-icon-button"
                        onClick={() => moveAgent(i, i - 1)}
                        disabled={i === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="ws-icon-button"
                        onClick={() => moveAgent(i, i + 1)}
                        disabled={i === settings.agents.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="ws-icon-button danger"
                        onClick={() => removeAgent(i)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className="ws-add-agent-button" onClick={addAgent}>
              + Add New Agent
            </button>
          </div>
        </section>

        <div className="ws-save-row">
          <button
            type="button"
            className="ws-primary-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminWhatsApp;
