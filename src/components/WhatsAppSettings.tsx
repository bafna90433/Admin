import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/WhatsAppSettings.css";
import { API_URL } from "../utils/api";

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

/* ------------ Helpers ------------ */
const resolveUrl = (u?: string) => {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return `${API_URL}${u.startsWith("/") ? u : `/uploads/${u}`}`;
};

const AdminWhatsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* ------------ Load settings ------------ */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<Settings>(`${API_URL}/whatsapp`);
        data.showOnPaths ||= [];
        data.hideOnPaths ||= [];
        data.days ||= [1, 2, 3, 4, 5, 6];
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
        const { data } = await axios.post(`${API_URL}/upload`, fd);
        const rel = data?.url || data?.urls?.[0];
        if (rel) updateAgent(idx, { avatar: rel });
      } catch (e) {
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
      const payload: Settings = {
        ...settings,
        phone: String(settings.phone || "").replace(/\D/g, ""),
        agents: settings.agents.map((a) => ({
          ...a,
          phone: String(a.phone || "").replace(/\D/g, ""),
        })),
      };
      const { data } = await axios.put(`${API_URL}/whatsapp`, payload);
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
        <div className="ws-section">
          <label>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Enable Widget
          </label>

          <label>
            Phone:
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </label>

          <label>
            Default Message:
            <input
              type="text"
              value={settings.defaultMessage}
              onChange={(e) => update({ defaultMessage: e.target.value })}
            />
          </label>

          <label>
            Greeting:
            <input
              type="text"
              value={settings.greetingText}
              onChange={(e) => update({ greetingText: e.target.value })}
            />
          </label>

          <label>
            Position:
            <select
              value={settings.position}
              onChange={(e) => update({ position: e.target.value as "right" | "left" })}
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </label>

          <label>
            OffsetX:
            <input
              type="number"
              value={settings.offsetX}
              onChange={(e) => update({ offsetX: Number(e.target.value) })}
            />
          </label>

          <label>
            OffsetY:
            <input
              type="number"
              value={settings.offsetY}
              onChange={(e) => update({ offsetY: Number(e.target.value) })}
            />
          </label>
        </div>

        {/* SCHEDULE */}
        <div className="ws-section">
          <h3>Schedule</h3>
          <label>
            <input
              type="checkbox"
              checked={settings.enableSchedule}
              onChange={(e) => update({ enableSchedule: e.target.checked })}
            />
            Enable Schedule
          </label>

          <label>
            Start Hour:
            <input
              type="number"
              value={settings.startHour}
              onChange={(e) => update({ startHour: Number(e.target.value) })}
            />
          </label>

          <label>
            End Hour:
            <input
              type="number"
              value={settings.endHour}
              onChange={(e) => update({ endHour: Number(e.target.value) })}
            />
          </label>

          <label>
            Days (0=Sun,6=Sat):
            <input
              type="text"
              value={settings.days.join(",")}
              onChange={(e) =>
                update({
                  days: e.target.value
                    .split(",")
                    .map((n) => parseInt(n.trim()))
                    .filter((n) => !isNaN(n)),
                })
              }
            />
          </label>
        </div>

        {/* TEAM MEMBERS */}
        <div className="ws-section">
          <h3>Agents</h3>
          {settings.agents.map((a, i) => (
            <div key={i} className="ws-agent">
              <input
                type="text"
                value={a.name}
                onChange={(e) => updateAgent(i, { name: e.target.value })}
                placeholder="Name"
              />
              <input
                type="text"
                value={a.phone}
                onChange={(e) => updateAgent(i, { phone: e.target.value })}
                placeholder="Phone"
              />
              <input
                type="text"
                value={a.title || ""}
                onChange={(e) => updateAgent(i, { title: e.target.value })}
                placeholder="Title"
              />
              <button type="button" onClick={() => pickAvatar(i)}>
                {a.avatar ? "Change Avatar" : "Upload Avatar"}
              </button>
              <button type="button" onClick={() => removeAgent(i)}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={addAgent}>Add Agent</button>
        </div>

        {/* SAVE */}
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
