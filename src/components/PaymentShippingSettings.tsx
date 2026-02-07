import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FiTruck,
  FiDollarSign,
  FiSave,
  FiCreditCard,
  FiPackage,
  FiInfo,
} from "react-icons/fi";
import "../styles/PaymentShipping.css";

// ✅ API Configuration (works in Webpack/CRA + Vite)
// Priority: Vite env -> CRA env -> fallback localhost
const API_BASE =
  (typeof (globalThis as any).importMeta !== "undefined" &&
    (globalThis as any).importMeta?.env?.VITE_API_URL) ||
  (typeof (import.meta as any) !== "undefined" &&
    (import.meta as any)?.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000/api";

const PaymentShippingSettings: React.FC = () => {
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [freeLimit, setFreeLimit] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);

      const [shippingRes, codRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/shipping-rules`),
        axios.get(`${API_BASE}/settings/cod`),
      ]);

      if (shippingRes.status === "fulfilled" && shippingRes.value.data) {
        setShippingCharge(shippingRes.value.data.shippingCharge || 0);
        setFreeLimit(shippingRes.value.data.freeShippingThreshold || 0);
      }

      if (codRes.status === "fulfilled" && codRes.value.data) {
        setAdvanceAmount(codRes.value.data.advanceAmount || 0);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      Swal.fire("Error", "Could not load settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        axios.put(`${API_BASE}/shipping-rules`, {
          shippingCharge: Number(shippingCharge),
          freeShippingThreshold: Number(freeLimit),
        }),
        axios.put(`${API_BASE}/settings/cod`, {
          advanceAmount: Number(advanceAmount),
        }),
      ]);

      Swal.fire({
        icon: "success",
        title: "Settings Saved",
        text: "Configuration updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Save error:", err);
      Swal.fire("Save Failed", "Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="ps-loading">Loading Settings...</div>;

  return (
    <div className="ps-container">
      <div className="ps-wrapper">
        <div className="ps-header">
          <div className="header-content">
            <h1 className="ps-title">Shipping & Payment</h1>
            <p className="ps-subtitle">
              Configure delivery fees and COD restrictions.
            </p>
          </div>

          <button
            className={`ps-save-btn ${saving ? "loading" : ""}`}
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <FiSave className="btn-icon" /> Save Changes
              </>
            )}
          </button>
        </div>

        <div className="ps-grid">
          {/* SHIPPING */}
          <div className="ps-card">
            <div className="card-top-bar blue"></div>
            <div className="card-content">
              <div className="card-header">
                <div className="icon-circle blue">
                  <FiTruck />
                </div>
                <div>
                  <h3>Delivery Settings</h3>
                  <span>Manage standard shipping rates</span>
                </div>
              </div>

              <div className="form-group">
                <label>Standard Courier Charge</label>
                <div className="input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={shippingCharge}
                    onChange={(e) => setShippingCharge(Number(e.target.value))}
                    placeholder="0"
                  />
                  <FiPackage className="input-icon-right" />
                </div>
                <p className="help-text">
                  Applied when order value is below free limit.
                </p>
              </div>

              <div className="form-divider"></div>

              <div className="form-group">
                <label>Free Shipping Threshold</label>
                <div className="input-wrapper success-theme">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={freeLimit}
                    onChange={(e) => setFreeLimit(Number(e.target.value))}
                    placeholder="0"
                  />
                  <FiDollarSign className="input-icon-right" />
                </div>
                <p className="help-text highlight">
                  Orders above this amount get <b>Free Delivery</b>.
                </p>
              </div>
            </div>
          </div>

          {/* COD */}
          <div className="ps-card">
            <div className="card-top-bar orange"></div>
            <div className="card-content">
              <div className="card-header">
                <div className="icon-circle orange">
                  <FiCreditCard />
                </div>
                <div>
                  <h3>COD Verification</h3>
                  <span>Secure your cash on delivery orders</span>
                </div>
              </div>

              <div className="info-alert">
                <FiInfo className="info-icon" />
                <p>
                  Collecting an advance reduces RTO (Return to Origin) chances by
                  80%.
                </p>
              </div>

              <div className="form-group">
                <label>Required Advance Amount</label>
                <div className="input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    placeholder="0"
                  />
                  <FiCreditCard className="input-icon-right" />
                </div>
                <p className="help-text">
                  Customer must pay this online to confirm COD.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentShippingSettings;
