import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiSmartphone, FiSave, FiRefreshCw } from "react-icons/fi";
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

  useEffect(() => {
    fetchTheme();
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
              description="Main brand color (buttons, icons)"
            />
            <ColorInput 
              label="Primary Dark" 
              value={colors.primaryDark} 
              onChange={(val) => handleColorChange("primaryDark", val)} 
              description="Header & active states"
            />
            <ColorInput 
              label="Primary Light" 
              value={colors.primaryLight} 
              onChange={(val) => handleColorChange("primaryLight", val)} 
              description="Border & subtle elements"
            />
            <ColorInput 
              label="Background Accent" 
              value={colors.primaryBg} 
              onChange={(val) => handleColorChange("primaryBg", val)} 
              description="Light surface backgrounds"
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
              {/* Mock App Header */}
              <div style={{ background: colors.primaryDark, height: "60px", padding: "20px 15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: "30px", height: "4px", background: "white", borderRadius: "2px" }} />
                <div style={{ width: "80px", height: "12px", background: "rgba(255,255,255,0.5)", borderRadius: "6px" }} />
                <div style={{ width: "24px", height: "24px", background: "rgba(255,255,255,0.2)", borderRadius: "12px" }} />
              </div>

              {/* Mock App Content */}
              <div style={{ padding: "15px" }}>
                <div style={{ width: "100%", height: "120px", background: colors.primaryBg, borderRadius: "12px", marginBottom: "15px" }} />
                <div style={{ width: "60%", height: "16px", background: "#cbd5e1", borderRadius: "8px", marginBottom: "10px" }} />
                <div style={{ width: "100%", height: "12px", background: "#e2e8f0", borderRadius: "6px", marginBottom: "5px" }} />
                <div style={{ width: "100%", height: "12px", background: "#e2e8f0", borderRadius: "6px", marginBottom: "20px" }} />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {[1, 2].map((i) => (
                    <div key={i} style={{ background: "white", padding: "10px", borderRadius: "12px", border: `1px solid ${colors.primaryLight}` }}>
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
