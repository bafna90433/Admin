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
  FiPercent,
  FiPlus,
  FiTrash2,
  FiLayers,
  FiMessageSquare, // New Icon for Reviews
  FiCheckCircle,   // New Icon for Active state
  FiXCircle        // New Icon for Inactive state
} from "react-icons/fi";
import "../styles/PaymentShipping.css";

// ✅ API Configuration (Webpack-safe)
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

interface DiscountRule {
  minAmount: number;
  discountPercentage: number;
}

const PaymentShippingSettings: React.FC = () => {
  // --- Existing States ---
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [freeLimit, setFreeLimit] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([
    { minAmount: 1000, discountPercentage: 5 },
  ]);

  // --- ✅ NEW: Review State ---
  const [enableReviews, setEnableReviews] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);

      const [shippingRes, codRes, discountRes, reviewRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/shipping-rules`),
        axios.get(`${API_BASE}/settings/cod`),
        axios.get(`${API_BASE}/discount-rules`),
        axios.get(`${API_BASE}/settings/reviews`), // ✅ Fetch Review Settings
      ]);

      // 1. Shipping
      if (shippingRes.status === "fulfilled" && shippingRes.value.data) {
        setShippingCharge(shippingRes.value.data.shippingCharge || 0);
        setFreeLimit(shippingRes.value.data.freeShippingThreshold || 0);
      }

      // 2. COD
      if (codRes.status === "fulfilled" && codRes.value.data) {
        setAdvanceAmount(codRes.value.data.advanceAmount || 0);
      }

      // 3. Discount Rules
      if (
        discountRes.status === "fulfilled" &&
        Array.isArray(discountRes.value.data) &&
        discountRes.value.data.length > 0
      ) {
        setDiscountRules(discountRes.value.data);
      } else {
        setDiscountRules([{ minAmount: 1000, discountPercentage: 5 }]);
      }

      // 4. ✅ Reviews
      if (reviewRes.status === "fulfilled" && reviewRes.value.data) {
        // Default to true if undefined
        setEnableReviews(reviewRes.value.data.enabled !== false);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      Swal.fire("Error", "Could not load settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Discount Rules Handlers ----------------
  const handleAddRule = () => {
    setDiscountRules((prev) => [
      ...prev,
      { minAmount: 0, discountPercentage: 0 },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setDiscountRules((prev) => {
      // ✅ keep at least 1 rule
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRuleChange = (
    index: number,
    field: keyof DiscountRule,
    value: number
  ) => {
    setDiscountRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  // --------------------------------------------------------

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // ✅ validate discounts
      const validRules = discountRules
        .filter((r) => r.minAmount > 0 && r.discountPercentage > 0)
        .map((r) => ({
          minAmount: Number(r.minAmount),
          discountPercentage: Number(r.discountPercentage),
        }))
        .sort((a, b) => a.minAmount - b.minAmount);

      if (validRules.length === 0) {
        Swal.fire("Invalid Rules", "Please add at least 1 valid discount rule.", "warning");
        setSaving(false);
        return;
      }

      await Promise.all([
        axios.put(`${API_BASE}/shipping-rules`, {
          shippingCharge: Number(shippingCharge),
          freeShippingThreshold: Number(freeLimit),
        }),
        axios.put(`${API_BASE}/settings/cod`, {
          advanceAmount: Number(advanceAmount),
        }),
        axios.put(`${API_BASE}/discount-rules`, { rules: validRules }),
        // ✅ Save Review Settings
        axios.put(`${API_BASE}/settings/reviews`, { enabled: enableReviews }),
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
      Swal.fire("Save Failed", "Check console for details.", "error");
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
            <h1 className="ps-title">Store Configuration</h1>
            <p className="ps-subtitle">
              Manage delivery fees, COD, reviews, and discounts.
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
          {/* 1) SHIPPING */}
          <div className="ps-card">
            <div className="card-top-bar blue" />
            <div className="card-content">
              <div className="card-header">
                <div className="icon-circle blue">
                  <FiTruck />
                </div>
                <div>
                  <h3>Delivery Settings</h3>
                  <span>Standard shipping rates</span>
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
                  />
                  <FiPackage className="input-icon-right" />
                </div>
              </div>

              <div className="form-divider" />

              <div className="form-group">
                <label>Free Shipping Above</label>
                <div className="input-wrapper success-theme">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={freeLimit}
                    onChange={(e) => setFreeLimit(Number(e.target.value))}
                  />
                  <FiDollarSign className="input-icon-right" />
                </div>
              </div>
            </div>
          </div>

          {/* 2) DISCOUNTS (Large Card) */}
          <div className="ps-card" style={{ gridRow: "span 2" }}>
            <div
              className="card-top-bar purple"
              style={{ backgroundColor: "#8b5cf6" }}
            />
            <div className="card-content">
              <div className="card-header">
                <div
                  className="icon-circle purple"
                  style={{ backgroundColor: "#f3e8ff", color: "#8b5cf6" }}
                >
                  <FiLayers />
                </div>
                <div>
                  <h3>Volume Discounts</h3>
                  <span>Auto-discount based on cart value</span>
                </div>
              </div>

              <div className="info-alert">
                <FiInfo className="info-icon" />
                <p>Add rules: e.g. Buy ₹5000 get 8% Off.</p>
              </div>

              <div
                className="discount-rules-container"
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                {discountRules.map((rule, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-end",
                    }}
                  >
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ fontSize: "12px" }}>Min Order (₹)</label>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          value={rule.minAmount}
                          onChange={(e) =>
                            handleRuleChange(index, "minAmount", Number(e.target.value))
                          }
                          placeholder="Amount"
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ width: "110px", marginBottom: 0 }}>
                      <label style={{ fontSize: "12px" }}>Disc (%)</label>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          value={rule.discountPercentage}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              "discountPercentage",
                              Number(e.target.value)
                            )
                          }
                          placeholder="%"
                        />
                        <FiPercent className="input-icon-right" style={{ fontSize: "12px" }} />
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveRule(index)}
                      disabled={discountRules.length <= 1}
                      style={{
                        height: "42px",
                        width: "42px",
                        background: discountRules.length <= 1 ? "#f3f4f6" : "#fee2e2",
                        color: discountRules.length <= 1 ? "#9ca3af" : "#ef4444",
                        border: "none",
                        borderRadius: "8px",
                        cursor: discountRules.length <= 1 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={discountRules.length <= 1 ? "At least 1 rule is required" : "Remove rule"}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddRule}
                style={{
                  marginTop: "15px",
                  width: "100%",
                  padding: "10px",
                  border: "1px dashed #8b5cf6",
                  background: "#f5f3ff",
                  color: "#8b5cf6",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: 500,
                }}
              >
                <FiPlus /> Add Discount Rule
              </button>
            </div>
          </div>

          {/* 3) COD */}
          <div className="ps-card">
            <div className="card-top-bar orange" />
            <div className="card-content">
              <div className="card-header">
                <div className="icon-circle orange">
                  <FiCreditCard />
                </div>
                <div>
                  <h3>COD Verification</h3>
                  <span>Secure COD orders</span>
                </div>
              </div>

              <div className="form-group">
                <label>Required Advance Amount</label>
                <div className="input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  />
                  <FiCreditCard className="input-icon-right" />
                </div>
                <p className="help-text">
                  Customer pays this online to confirm COD.
                </p>
              </div>
            </div>
          </div>

          {/* 4) ✅ NEW: REVIEW SETTINGS */}
          <div className="ps-card">
            <div className="card-top-bar" style={{ backgroundColor: "#059669" }} /> {/* Green */}
            <div className="card-content">
              <div className="card-header">
                <div className="icon-circle" style={{ backgroundColor: "#d1fae5", color: "#059669" }}>
                  <FiMessageSquare />
                </div>
                <div>
                  <h3>Product Reviews</h3>
                  <span>Enable/Disable user reviews</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "0", marginTop: "10px" }}>
                <div 
                  className="toggle-container"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "15px",
                    background: enableReviews ? "#ecfdf5" : "#f3f4f6",
                    borderRadius: "10px",
                    border: `1px solid ${enableReviews ? "#10b981" : "#e5e7eb"}`,
                    transition: "all 0.3s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {enableReviews ? (
                      <FiCheckCircle style={{ color: "#10b981", fontSize: "1.2rem" }} />
                    ) : (
                      <FiXCircle style={{ color: "#9ca3af", fontSize: "1.2rem" }} />
                    )}
                    <span style={{ 
                      fontWeight: 600, 
                      color: enableReviews ? "#065f46" : "#6b7280" 
                    }}>
                      {enableReviews ? "Reviews Enabled" : "Reviews Disabled"}
                    </span>
                  </div>

                  <label className="switch" style={{ position: "relative", display: "inline-block", width: "50px", height: "26px" }}>
                    <input 
                      type="checkbox" 
                      checked={enableReviews} 
                      onChange={(e) => setEnableReviews(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span 
                      className="slider round" 
                      style={{
                        position: "absolute",
                        cursor: "pointer",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: enableReviews ? "#10b981" : "#ccc",
                        transition: ".4s",
                        borderRadius: "34px"
                      }}
                    >
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "18px",
                        width: "18px",
                        left: enableReviews ? "26px" : "4px",
                        bottom: "4px",
                        backgroundColor: "white",
                        transition: ".4s",
                        borderRadius: "50%"
                      }}/>
                    </span>
                  </label>
                </div>
                <p className="help-text" style={{ marginTop: "10px" }}>
                  When disabled, the review form and list will be hidden on all product pages.
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