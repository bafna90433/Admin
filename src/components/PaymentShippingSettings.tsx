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
} from "react-icons/fi";
import "../styles/PaymentShipping.css";

// ✅ API Configuration (FINAL – NO LOCALHOST DEPENDENCY)
const API_BASE =
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

interface DiscountRule {
  minAmount: number;
  discountPercentage: number;
}

const PaymentShippingSettings: React.FC = () => {
  // Existing States
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [freeLimit, setFreeLimit] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);

  // Discount Rules
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        axios.get(`${API_BASE}/shipping-rules`),
        axios.get(`${API_BASE}/settings/cod`),
        axios.get(`${API_BASE}/discount-rules`),
      ]);

      const [shippingRes, codRes, discountRes] = results;

      if (shippingRes.status === "fulfilled" && shippingRes.value.data) {
        setShippingCharge(shippingRes.value.data.shippingCharge || 0);
        setFreeLimit(shippingRes.value.data.freeShippingThreshold || 0);
      }

      if (codRes.status === "fulfilled" && codRes.value.data) {
        setAdvanceAmount(codRes.value.data.advanceAmount || 0);
      }

      if (
        discountRes.status === "fulfilled" &&
        Array.isArray(discountRes.value.data)
      ) {
        setDiscountRules(discountRes.value.data);
      } else {
        setDiscountRules([{ minAmount: 1000, discountPercentage: 5 }]);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      Swal.fire("Error", "Could not load settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Discount Rule Handlers ----------------
  const handleAddRule = () => {
    setDiscountRules([...discountRules, { minAmount: 0, discountPercentage: 0 }]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = discountRules.filter((_, i) => i !== index);
    setDiscountRules(newRules);
  };

  const handleRuleChange = (
    index: number,
    field: keyof DiscountRule,
    value: number
  ) => {
    const newRules = [...discountRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setDiscountRules(newRules);
  };
  // --------------------------------------------------------

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const validRules = discountRules.filter(
        (r) => r.minAmount > 0 && r.discountPercentage > 0
      );

      await Promise.all([
        axios.put(`${API_BASE}/shipping-rules`, {
          shippingCharge: Number(shippingCharge),
          freeShippingThreshold: Number(freeLimit),
        }),
        axios.put(`${API_BASE}/settings/cod`, {
          advanceAmount: Number(advanceAmount),
        }),
        axios.put(`${API_BASE}/discount-rules`, {
          rules: validRules,
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
            <h1 className="ps-title">Shipping, Payment & Discounts</h1>
            <p className="ps-subtitle">
              Manage delivery fees, COD, and volume discounts.
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
                    onChange={(e) =>
                      setShippingCharge(Number(e.target.value))
                    }
                  />
                  <FiPackage className="input-icon-right" />
                </div>
              </div>

              <div className="form-divider"></div>

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

          {/* DISCOUNTS */}
          <div className="ps-card" style={{ gridRow: "span 2" }}>
            <div className="card-top-bar purple"></div>
            <div className="card-content">
              <div className="card-header">
                <div className="icon-circle purple">
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

              <div className="discount-rules-container">
                {discountRules.map((rule, index) => (
                  <div key={index} className="discount-row">
                    <input
                      type="number"
                      value={rule.minAmount}
                      placeholder="Min Order ₹"
                      onChange={(e) =>
                        handleRuleChange(
                          index,
                          "minAmount",
                          Number(e.target.value)
                        )
                      }
                    />
                    <input
                      type="number"
                      value={rule.discountPercentage}
                      placeholder="%"
                      onChange={(e) =>
                        handleRuleChange(
                          index,
                          "discountPercentage",
                          Number(e.target.value)
                        )
                      }
                    />
                    <button onClick={() => handleRemoveRule(index)}>
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>

              <button className="add-rule-btn" onClick={handleAddRule}>
                <FiPlus /> Add Discount Rule
              </button>
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
                    onChange={(e) =>
                      setAdvanceAmount(Number(e.target.value))
                    }
                  />
                  <FiCreditCard className="input-icon-right" />
                </div>
                <p className="help-text">
                  Customer pays this online to confirm COD.
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
