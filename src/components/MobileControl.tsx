import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiSmartphone, FiSave, FiRefreshCw, FiMessageCircle } from "react-icons/fi";
import Swal from "sweetalert2";

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MobileControl: React.FC = () => {
  const [colors, setColors] = useState({
    primary: "#6366f1",
    primaryDark: "#4f46e5",
    primaryLight: "#a5b4fc",
    primaryBg: "#eef2ff",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ✅ WhatsApp Header Button State
  const [whatsapp, setWhatsapp] = useState({
    enabled: false,
    phone: "",
    message: "Hi! I want to place an order.",
  });
  const [waSaving, setWaSaving] = useState(false);

  // ✅ Layout Selection State
  const [activeLayout, setActiveLayout] = useState("layout1");
  const [layoutSaving, setLayoutSaving] = useState(false);

  useEffect(() => {
    fetchTheme();
    fetchWhatsapp();
    fetchLayout();
  }, []);

  const fetchTheme = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API_BASE}/settings/mobile-theme`);
      if (res.data) {
        setColors(res.data);
      }
    } catch (err) {
      console.error("Failed to load theme", err);
    } finally {
      setFetching(false);
    }
  };

  // ✅ Fetch WhatsApp header settings
  const fetchWhatsapp = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings/mobile-whatsapp`);
      if (res.data) setWhatsapp(res.data);
    } catch (err) {
      console.error("Failed to load WhatsApp settings", err);
    }
  };

  // ✅ Fetch current layout
  const fetchLayout = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings/mobile-layout`);
      if (res.data) setActiveLayout(res.data.layout || "layout1");
    } catch (err) {
      console.error("Failed to load layout settings", err);
    }
  };

  const handleColorChange = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE}/settings/mobile-theme`, colors);
      Swal.fire({
        title: "Success!",
        text: "Mobile theme colors have been updated.",
        icon: "success",
        confirmButtonColor: "#6366f1",
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update theme", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save WhatsApp settings
  const handleWaSave = async () => {
    setWaSaving(true);
    try {
      await axios.put(`${API_BASE}/settings/mobile-whatsapp`, whatsapp);
      Swal.fire({
        title: "Saved!",
        text: "WhatsApp header button settings updated.",
        icon: "success",
        confirmButtonColor: "#25D366",
      });
    } catch (err) {
      Swal.fire("Error", "Failed to save WhatsApp settings", "error");
    } finally {
      setWaSaving(false);
    }
  };

  // ✅ Save layout choice
  const handleLayoutSave = async (layoutId: string) => {
    setLayoutSaving(true);
    try {
      await axios.put(`${API_BASE}/settings/mobile-layout`, { layout: layoutId });
      setActiveLayout(layoutId);
      Swal.fire({
        title: "Layout Updated!",
        text: `Switched to ${layoutId === "layout1" ? "Classic" : "Modern Grid"} layout.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", "Failed to update layout", "error");
    } finally {
      setLayoutSaving(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <FiRefreshCw className="spin" size={32} color="#6366f1" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e293b", display: "flex", alignItems: "center", gap: "12px" }}>
          <FiSmartphone /> Mobile App UI Control
        </h1>
        <p style={{ color: "#64748b", marginTop: "8px" }}>Customize your customer mobile app colors in real-time.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px" }}>
        {/* Color Configuration */}
        <div style={{ background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", color: "#334155" }}>Color Palette</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <ColorInput 
              label="Primary Color" 
              value={colors.primary} 
              onChange={(val) => handleColorChange("primary", val)} 
              description="Buttons, icons & ADD button"
            />
            <ColorInput 
              label="Primary Dark" 
              value={colors.primaryDark} 
              onChange={(val) => handleColorChange("primaryDark", val)} 
              description="App header background"
            />
            <ColorInput 
              label="Primary Light" 
              value={colors.primaryLight} 
              onChange={(val) => handleColorChange("primaryLight", val)} 
              description="📦 Product card border color"
            />
            <ColorInput 
              label="Background Accent" 
              value={colors.primaryBg} 
              onChange={(val) => handleColorChange("primaryBg", val)} 
              description="📦 Product card background color"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              marginTop: "32px",
              width: "100%",
              padding: "14px",
              background: colors.primary,
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "transform 0.2s",
              boxShadow: `0 4px 14px 0 ${colors.primary}40`,
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <FiSave />
            {loading ? "Saving..." : "Apply to Mobile App"}
          </button>

          {/* ✅ WhatsApp Header Button Section */}
          <div style={{ marginTop: "32px", padding: "24px", background: "#f0fdf4", borderRadius: "16px", border: "1.5px solid #bbf7d0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", background: "#25D366", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FiMessageCircle size={18} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#14532d" }}>WhatsApp Header Button</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#16a34a" }}>Show WhatsApp icon next to cart icon in app header</p>
                </div>
              </div>
              {/* Toggle */}
              <label style={{ position: "relative", display: "inline-block", width: "50px", height: "26px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={whatsapp.enabled}
                  onChange={(e) => setWhatsapp(p => ({ ...p, enabled: e.target.checked }))}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: whatsapp.enabled ? "#25D366" : "#cbd5e1",
                  borderRadius: "26px", transition: "0.3s"
                }}>
                  <span style={{
                    position: "absolute", height: "20px", width: "20px", left: whatsapp.enabled ? "27px" : "3px",
                    bottom: "3px", background: "white", borderRadius: "50%", transition: "0.3s"
                  }} />
                </span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "6px" }}>WhatsApp Number</label>
                <input
                  type="text"
                  value={whatsapp.phone}
                  onChange={(e) => setWhatsapp(p => ({ ...p, phone: e.target.value }))}
                  placeholder="91XXXXXXXXXX (with country code)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #d1d5db", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
                <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Include country code, no + or spaces (e.g., 919876543210)</p>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "6px" }}>Pre-filled Message</label>
                <input
                  type="text"
                  value={whatsapp.message}
                  onChange={(e) => setWhatsapp(p => ({ ...p, message: e.target.value }))}
                  placeholder="Hi! I want to place an order."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #d1d5db", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <button
              onClick={handleWaSave}
              disabled={waSaving}
              style={{
                width: "100%", padding: "12px", background: "#25D366", color: "white",
                border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "14px",
                cursor: waSaving ? "not-allowed" : "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: "8px"
              }}
            >
              <FiSave />
              {waSaving ? "Saving..." : "Save WhatsApp Settings"}
            </button>
          </div>

          {/* ✅ Home Layout Selection Section */}
          <div style={{ marginTop: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", color: "#334155" }}>App Home Layout</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Layout 1 Card */}
              <div 
                onClick={() => handleLayoutSave("layout1")}
                style={{
                  cursor: "pointer",
                  borderRadius: "16px",
                  border: `2px solid ${activeLayout === "layout1" ? colors.primary : "#e2e8f0"}`,
                  background: activeLayout === "layout1" ? `${colors.primary}05` : "white",
                  padding: "16px",
                  transition: "all 0.2s",
                  position: "relative"
                }}
              >
                {activeLayout === "layout1" && (
                  <div style={{ position: "absolute", top: "12px", right: "12px", background: colors.primary, color: "white", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>ACTIVE</div>
                )}
                <div style={{ height: "100px", background: "#f1f5f9", borderRadius: "8px", marginBottom: "12px", display: "flex", flexDirection: "column", padding: "8px", gap: "6px" }}>
                  <div style={{ height: "20px", width: "100%", background: "#6366f1", borderRadius: "4px" }} />
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: "30px", flex: 1, background: "#cbd5e1", borderRadius: "4px" }} />)}
                  </div>
                  <div style={{ height: "20px", width: "60%", background: "#e2e8f0", borderRadius: "4px" }} />
                </div>
                <h4 style={{ margin: 0, fontSize: "14px", color: "#1e293b" }}>Classic Layout</h4>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>Flipkart style, big header</p>
              </div>

              {/* Layout 2 Card */}
              <div 
                onClick={() => handleLayoutSave("layout2")}
                style={{
                  cursor: "pointer",
                  borderRadius: "16px",
                  border: `2px solid ${activeLayout === "layout2" ? "#25D366" : "#e2e8f0"}`,
                  background: activeLayout === "layout2" ? "#f0fdf4" : "white",
                  padding: "16px",
                  transition: "all 0.2s",
                  position: "relative"
                }}
              >
                {activeLayout === "layout2" && (
                  <div style={{ position: "absolute", top: "12px", right: "12px", background: "#25D366", color: "white", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>ACTIVE</div>
                )}
                <div style={{ height: "100px", background: "#f8fafc", borderRadius: "8px", marginBottom: "12px", display: "flex", flexDirection: "column", padding: "8px", gap: "6px" }}>
                  <div style={{ height: "10px", width: "100%", background: "#e2e8f0", borderRadius: "4px" }} />
                  <div style={{ height: "40px", width: "100%", background: "#cbd5e1", borderRadius: "4px" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    {[1, 2].map(i => <div key={i} style={{ height: "20px", background: "#e2e8f0", borderRadius: "4px" }} />)}
                  </div>
                </div>
                <h4 style={{ margin: 0, fontSize: "14px", color: "#1e293b" }}>Modern Grid</h4>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>Clean white, 2-column grid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Mockup */}
        <div style={{ position: "sticky", top: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", color: "#334155" }}>Live Preview</h2>
          <div className="phone-mockup" style={{ 
            width: "300px", 
            height: "600px", 
            background: "#1e293b", 
            borderRadius: "40px", 
            padding: "12px", 
            boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.5)",
            border: "8px solid #334155"
          }}>
            <div style={{ 
              width: "100%", 
              height: "100%", 
              background: "#f8fafc", 
              borderRadius: "28px", 
              overflow: "hidden",
              position: "relative"
            }}>
              {/* Mock App Header with WhatsApp */}
              <div style={{ background: colors.primaryDark, height: "60px", padding: "20px 15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: "30px", height: "4px", background: "white", borderRadius: "2px" }} />
                <div style={{ width: "80px", height: "12px", background: "rgba(255,255,255,0.5)", borderRadius: "6px" }} />
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <div style={{ width: "24px", height: "24px", background: "rgba(255,255,255,0.2)", borderRadius: "12px" }} />
                  {whatsapp.enabled && (
                    <div style={{ width: "24px", height: "24px", background: "#25D366", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>💬</div>
                  )}
                </div>
              </div>

              {/* Mock App Content */}
              <div style={{ padding: "15px" }}>
                <div style={{ width: "100%", height: "120px", background: colors.primaryBg, borderRadius: "12px", marginBottom: "15px" }} />
                <div style={{ width: "60%", height: "16px", background: "#cbd5e1", borderRadius: "8px", marginBottom: "10px" }} />
                <div style={{ width: "100%", height: "12px", background: "#e2e8f0", borderRadius: "6px", marginBottom: "5px" }} />
                <div style={{ width: "100%", height: "12px", background: "#e2e8f0", borderRadius: "6px", marginBottom: "20px" }} />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {[1, 2].map((i) => (
                    <div key={i} style={{ background: colors.primaryBg, padding: "10px", borderRadius: "12px", border: `1.5px solid ${colors.primaryLight}` }}>
                      <div style={{ width: "100%", height: "80px", background: "#f1f5f9", borderRadius: "8px", marginBottom: "8px" }} />
                      <div style={{ width: "100%", height: "10px", background: "#e2e8f0", borderRadius: "5px", marginBottom: "12px" }} />
                      <div style={{ width: "100%", height: "24px", background: colors.primary, borderRadius: "6px" }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Tab Bar */}
              <div style={{ position: "absolute", bottom: 0, width: "100%", height: "55px", background: "white", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                <div style={{ color: colors.primary }}><FiSmartphone size={18} /></div>
                <div style={{ color: "#94a3b8" }}><FiSmartphone size={18} /></div>
                <div style={{ color: "#94a3b8" }}><FiSmartphone size={18} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: rotate 2s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const ColorInput = ({ label, value, onChange, description }: { label: string, value: string, onChange: (val: string) => void, description: string }) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>{label}</label>
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "50px", height: "50px", border: "none", borderRadius: "8px", cursor: "pointer", background: "none" }}
      />
      <input 
        type="text" 
        value={value.toUpperCase()} 
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", color: "#1e293b", fontFamily: "monospace" }}
      />
    </div>
    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{description}</p>
  </div>
);

export default MobileControl;
