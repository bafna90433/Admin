import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiPower, FiGlobe, FiAlertTriangle } from "react-icons/fi";
import Swal from "sweetalert2";

// ✅ API Configuration
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const AdminSettings: React.FC = () => {
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings/maintenance`);
      if (res.data) {
        setMaintenance(res.data.enabled);
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const toggleMaintenance = async () => {
    // Confirm before changing
    const result = await Swal.fire({
      title: maintenance ? "Go Live?" : "Enable Maintenance Mode?",
      text: maintenance 
        ? "Your website will be visible to everyone." 
        : "Customers will see a 'Coming Soon' page. Site will be hidden.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: maintenance ? "#10b981" : "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: maintenance ? "Yes, Go Live!" : "Yes, Disable Site"
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const newState = !maintenance;
      await axios.put(`${API_BASE}/settings/maintenance`, {
        enabled: newState,
      });
      
      setMaintenance(newState);
      
      Swal.fire(
        "Updated!",
        `Website is now ${newState ? "Under Maintenance 🔴" : "Live 🟢"}.`,
        "success"
      );
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update status", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard-container" style={{ padding: "20px" }}>
      <div className="dashboard-header" style={{ marginBottom: "30px" }}>
        <h1 className="heading">General Settings</h1>
        <p style={{ color: "#666" }}>Manage global website configurations.</p>
      </div>

      <div 
        className="settings-card" 
        style={{ 
          maxWidth: "600px", 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
          border: maintenance ? "2px solid #ef4444" : "1px solid #e5e7eb"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
          <div style={{ 
            background: maintenance ? "#fee2e2" : "#d1fae5", 
            padding: "12px", 
            borderRadius: "50%",
            color: maintenance ? "#ef4444" : "#10b981"
          }}>
            {maintenance ? <FiAlertTriangle size={24} /> : <FiGlobe size={24} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px" }}>Website Status</h3>
            <p style={{ margin: "5px 0 0", fontSize: "14px", color: "#6b7280" }}>
              Control whether your shop is open to customers.
            </p>
          </div>
        </div>

        <div style={{ 
          background: "#f9fafb", 
          padding: "20px", 
          borderRadius: "8px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <div>
            <span style={{ 
              fontWeight: "bold", 
              fontSize: "16px",
              color: maintenance ? "#ef4444" : "#10b981"
            }}>
              {maintenance ? "🔴 Maintenance Mode ON" : "🟢 Website is LIVE"}
            </span>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              {maintenance 
                ? "Customers see 'Coming Soon' page." 
                : "Customers can browse and order."}
            </div>
          </div>

          <button
            onClick={toggleMaintenance}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              background: maintenance ? "#10b981" : "#ef4444",
              color: "white",
              transition: "all 0.2s"
            }}
          >
            <FiPower />
            {loading ? "Updating..." : (maintenance ? "Go Live" : "Disable Site")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;