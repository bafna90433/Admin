import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FiSave, FiTruck, FiDollarSign } from "react-icons/fi";
import "../styles/AdminDashboard.css";

// ✅ API Base URL
const API_BASE = "http://localhost:5000/api"; 

const AdminSettings: React.FC = () => {
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [freeLimit, setFreeLimit] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // ✅ CHANGE: URL updated to '/shipping-rules'
      const res = await axios.get(`${API_BASE}/shipping-rules`);
      
      if (res.data) {
        setShippingCharge(res.data.shippingCharge || 0);
        setFreeLimit(res.data.freeShippingThreshold || 0);
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // ✅ CHANGE: URL updated to '/shipping-rules'
      await axios.put(`${API_BASE}/shipping-rules`, {
        shippingCharge: Number(shippingCharge),
        freeShippingThreshold: Number(freeLimit),
      });
      Swal.fire("Success", "Shipping rules updated successfully!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update settings", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header">
        <h1 className="heading">Shipping Configuration</h1>
      </div>

      <div className="register-container" style={{ maxWidth: "600px", margin: "20px auto" }}>
        
        {/* Shipping Charge Input */}
        <div className="form-group">
          <label className="input-label">
            <FiTruck /> Standard Courier Charge (₹)
          </label>
          <input
            type="number"
            value={shippingCharge}
            onChange={(e) => setShippingCharge(Number(e.target.value))}
            placeholder="e.g. 250"
          />
          <small>Yeh charge tab lagega jab order value limit se kam hogi.</small>
        </div>

        {/* Free Shipping Limit Input */}
        <div className="form-group">
          <label className="input-label">
            <FiDollarSign /> Free Shipping Above Amount (₹)
          </label>
          <input
            type="number"
            value={freeLimit}
            onChange={(e) => setFreeLimit(Number(e.target.value))}
            placeholder="e.g. 5000"
          />
          <small>Agar order is amount se zyada hai, to courier FREE hoga.</small>
        </div>

        <button 
          className="action-btn" 
          onClick={handleSave} 
          disabled={loading}
          style={{ width: "100%", marginTop: "20px" }}
        >
          {loading ? "Saving..." : <><FiSave /> Save Settings</>}
        </button>

      </div>
    </div>
  );
};

export default AdminSettings;