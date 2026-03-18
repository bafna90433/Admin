import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  FiTruck, FiSave, FiCreditCard, FiPackage, FiInfo, FiPercent,
  FiPlus, FiTrash2, FiLayers, FiMessageSquare, FiCheckCircle,
  FiXCircle, FiRefreshCw, FiSettings, FiShield, FiToggleLeft,
  FiToggleRight, FiAlertTriangle, FiChevronDown, FiChevronUp,
  FiZap, FiGift, FiDollarSign, FiTrendingUp, FiEdit3
} from "react-icons/fi";
import "../styles/PaymentShipping.css";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (process as any).env?.VITE_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

interface DiscountRule {
  minAmount: number;
  discountPercentage: number;
}

const PaymentShippingSettings: React.FC = () => {
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [freeLimit, setFreeLimit] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([
    { minAmount: 1000, discountPercentage: 5 },
  ]);
  const [enableReviews, setEnableReviews] = useState<boolean>(true);
  const [enableCOD, setEnableCOD] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    shipping: true,
    cod: true,
    discount: true,
    reviews: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const initialLoad = useRef(true);

  // Track changes
  useEffect(() => {
    if (initialLoad.current) return;
    setHasChanges(true);
  }, [shippingCharge, freeLimit, advanceAmount, discountRules, enableReviews, enableCOD]);

  const fetchAllSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [shippingRes, codRes, discountRes, reviewRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/shipping-rules`),
        axios.get(`${API_BASE}/settings/cod`),
        axios.get(`${API_BASE}/discount-rules`),
        axios.get(`${API_BASE}/settings/reviews`),
      ]);

      if (shippingRes.status === "fulfilled" && shippingRes.value.data) {
        setShippingCharge(shippingRes.value.data.shippingCharge || 0);
        setFreeLimit(shippingRes.value.data.freeShippingThreshold || 0);
      }
      if (codRes.status === "fulfilled" && codRes.value.data) {
        setAdvanceAmount(codRes.value.data.advanceAmount || 0);
        setEnableCOD(codRes.value.data.enabled !== false);
      }
      if (discountRes.status === "fulfilled" && Array.isArray(discountRes.value.data) && discountRes.value.data.length > 0) {
        setDiscountRules(discountRes.value.data);
      } else {
        setDiscountRules([{ minAmount: 1000, discountPercentage: 5 }]);
      }
      if (reviewRes.status === "fulfilled" && reviewRes.value.data) {
        setEnableReviews(reviewRes.value.data.enabled !== false);
      }

      // Mark initial load complete
      setTimeout(() => { initialLoad.current = false; }, 100);
    } catch {
      toast.error("Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllSettings(); }, [fetchAllSettings]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Discount handlers
  const handleAddRule = () => {
    setDiscountRules((prev) => [...prev, { minAmount: 0, discountPercentage: 0 }]);
  };

  const handleRemoveRule = (index: number) => {
    setDiscountRules((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRuleChange = (index: number, field: keyof DiscountRule, value: number) => {
    setDiscountRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Save
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const validRules = discountRules
        .filter((r) => r.minAmount > 0 && r.discountPercentage > 0)
        .map((r) => ({ minAmount: Number(r.minAmount), discountPercentage: Number(r.discountPercentage) }))
        .sort((a, b) => a.minAmount - b.minAmount);

      if (validRules.length === 0) {
        toast.error("Add at least 1 valid discount rule");
        setSaving(false);
        return;
      }

      await Promise.all([
        axios.put(`${API_BASE}/shipping-rules`, { shippingCharge: Number(shippingCharge), freeShippingThreshold: Number(freeLimit) }),
        axios.put(`${API_BASE}/settings/cod`, { advanceAmount: Number(advanceAmount), enabled: enableCOD }),
        axios.put(`${API_BASE}/discount-rules`, { rules: validRules }),
        axios.put(`${API_BASE}/settings/reviews`, { enabled: enableReviews }),
      ]);

      toast.success("All settings saved!", { icon: "✅", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      setHasChanges(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ps-root">
        <div className="ps-state">
          <div className="ps-loader"><div className="ps-loader-ring" /><div className="ps-loader-ring" /><div className="ps-loader-ring" /></div>
          <h3>Loading Settings</h3><p>Please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {/* Top */}
      <section className="ps-top">
        <div className="ps-top-row">
          <div className="ps-top-left">
            <h1 className="ps-title">Store Settings</h1>
            <p className="ps-subtitle">Manage shipping, payments, discounts & reviews</p>
          </div>
          <div className="ps-top-right">
            <button className="ps-top-btn" onClick={fetchAllSettings} disabled={loading} title="Reload">
              <FiRefreshCw size={16} className={loading ? "ps-spinning" : ""} />
            </button>
            <button className={`ps-save-main ${hasChanges ? "ps-has-changes" : ""}`} onClick={handleSaveAll} disabled={saving || !hasChanges}>
              <FiSave size={15} />
              <span>{saving ? "Saving…" : "Save All"}</span>
              {hasChanges && <span className="ps-unsaved-dot" />}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="ps-quick-stats">
          <div className="ps-qs">
            <FiTruck size={14} />
            <span>Shipping: <strong>₹{shippingCharge}</strong></span>
          </div>
          <div className="ps-qs">
            <FiGift size={14} />
            <span>Free above: <strong>₹{freeLimit}</strong></span>
          </div>
          <div className="ps-qs">
            <FiCreditCard size={14} />
            <span>COD: <strong className={enableCOD ? "ps-qs-on" : "ps-qs-off"}>{enableCOD ? "ON" : "OFF"}</strong></span>
          </div>
          <div className="ps-qs">
            <FiMessageSquare size={14} />
            <span>Reviews: <strong className={enableReviews ? "ps-qs-on" : "ps-qs-off"}>{enableReviews ? "ON" : "OFF"}</strong></span>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="ps-main">
        <div className="ps-sections">

          {/* ===== 1. SHIPPING ===== */}
          <div className="ps-section">
            <button className="ps-section-header" onClick={() => toggleSection("shipping")}>
              <div className="ps-sh-left">
                <div className="ps-sh-icon ps-sh-blue"><FiTruck size={18} /></div>
                <div className="ps-sh-text">
                  <h2>Delivery & Shipping</h2>
                  <p>Configure shipping charges and free delivery threshold</p>
                </div>
              </div>
              <div className="ps-sh-right">
                {expandedSections.shipping ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </div>
            </button>

            {expandedSections.shipping && (
              <div className="ps-section-body">
                <div className="ps-fields-row">
                  <div className="ps-field-card">
                    <div className="ps-fc-header">
                      <FiPackage size={14} />
                      <label>Standard Shipping Charge</label>
                    </div>
                    <div className="ps-input-group">
                      <span className="ps-input-prefix">₹</span>
                      <input
                        type="number"
                        value={shippingCharge}
                        onChange={(e) => setShippingCharge(Number(e.target.value))}
                        placeholder="0"
                        className="ps-input"
                      />
                    </div>
                    <p className="ps-field-hint">Applied to all orders below free shipping limit</p>
                  </div>

                  <div className="ps-field-card">
                    <div className="ps-fc-header">
                      <FiGift size={14} />
                      <label>Free Shipping Above</label>
                    </div>
                    <div className="ps-input-group">
                      <span className="ps-input-prefix">₹</span>
                      <input
                        type="number"
                        value={freeLimit}
                        onChange={(e) => setFreeLimit(Number(e.target.value))}
                        placeholder="0"
                        className="ps-input"
                      />
                    </div>
                    <p className="ps-field-hint">Orders above this amount get free shipping</p>
                  </div>
                </div>

                {freeLimit > 0 && shippingCharge > 0 && (
                  <div className="ps-info-box ps-info-blue">
                    <FiInfo size={14} />
                    <span>Orders below ₹{freeLimit.toLocaleString()} will be charged ₹{shippingCharge} for shipping</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== 2. COD ===== */}
          <div className="ps-section">
            <button className="ps-section-header" onClick={() => toggleSection("cod")}>
              <div className="ps-sh-left">
                <div className="ps-sh-icon ps-sh-orange"><FiCreditCard size={18} /></div>
                <div className="ps-sh-text">
                  <h2>Cash on Delivery</h2>
                  <p>COD verification and advance payment settings</p>
                </div>
              </div>
              <div className="ps-sh-right">
                <span className={`ps-sh-status ${enableCOD ? "on" : "off"}`}>{enableCOD ? "Active" : "Inactive"}</span>
                {expandedSections.cod ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </div>
            </button>

            {expandedSections.cod && (
              <div className="ps-section-body">
                {/* Toggle */}
                <div className={`ps-toggle-card ${enableCOD ? "ps-toggle-on" : "ps-toggle-off"}`}>
                  <div className="ps-toggle-left">
                    {enableCOD ? <FiCheckCircle size={20} /> : <FiXCircle size={20} />}
                    <div>
                      <strong>{enableCOD ? "Cash on Delivery is Enabled" : "Cash on Delivery is Disabled"}</strong>
                      <p>{enableCOD ? "Customers can choose COD at checkout" : "COD option is hidden from checkout"}</p>
                    </div>
                  </div>
                  <button className={`ps-toggle-switch ${enableCOD ? "active" : ""}`} onClick={() => setEnableCOD(!enableCOD)} type="button">
                    <span className="ps-toggle-knob" />
                  </button>
                </div>

                {/* Advance Amount */}
                <div className={`ps-cod-advance ${!enableCOD ? "ps-disabled" : ""}`}>
                  <div className="ps-field-card">
                    <div className="ps-fc-header">
                      <FiShield size={14} />
                      <label>Required Advance Amount</label>
                    </div>
                    <div className="ps-input-group">
                      <span className="ps-input-prefix">₹</span>
                      <input
                        type="number"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                        placeholder="0"
                        className="ps-input"
                        disabled={!enableCOD}
                      />
                    </div>
                    <p className="ps-field-hint">Customer pays this amount online to confirm COD order</p>
                  </div>
                </div>

                {enableCOD && advanceAmount > 0 && (
                  <div className="ps-info-box ps-info-orange">
                    <FiInfo size={14} />
                    <span>Customers will pay ₹{advanceAmount.toLocaleString()} online and rest on delivery</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== 3. DISCOUNTS ===== */}
          <div className="ps-section">
            <button className="ps-section-header" onClick={() => toggleSection("discount")}>
              <div className="ps-sh-left">
                <div className="ps-sh-icon ps-sh-purple"><FiLayers size={18} /></div>
                <div className="ps-sh-text">
                  <h2>Volume Discounts</h2>
                  <p>Auto-discounts based on cart value ({discountRules.length} rule{discountRules.length !== 1 ? "s" : ""})</p>
                </div>
              </div>
              <div className="ps-sh-right">
                <span className="ps-sh-badge">{discountRules.length}</span>
                {expandedSections.discount ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </div>
            </button>

            {expandedSections.discount && (
              <div className="ps-section-body">
                <div className="ps-info-box ps-info-purple">
                  <FiZap size={14} />
                  <span>Add rules like "Buy ₹5,000+ get 8% off". Rules auto-sort by amount.</span>
                </div>

                <div className="ps-discount-list">
                  {discountRules.map((rule, index) => (
                    <div className="ps-discount-row" key={index}>
                      <div className="ps-dr-num">{index + 1}</div>
                      <div className="ps-dr-field">
                        <label>Min Order</label>
                        <div className="ps-input-group sm">
                          <span className="ps-input-prefix">₹</span>
                          <input
                            type="number"
                            value={rule.minAmount}
                            onChange={(e) => handleRuleChange(index, "minAmount", Number(e.target.value))}
                            placeholder="Amount"
                            className="ps-input"
                          />
                        </div>
                      </div>
                      <div className="ps-dr-arrow"><FiTrendingUp size={14} /></div>
                      <div className="ps-dr-field">
                        <label>Discount</label>
                        <div className="ps-input-group sm">
                          <input
                            type="number"
                            value={rule.discountPercentage}
                            onChange={(e) => handleRuleChange(index, "discountPercentage", Number(e.target.value))}
                            placeholder="%"
                            className="ps-input"
                          />
                          <span className="ps-input-suffix"><FiPercent size={13} /></span>
                        </div>
                      </div>
                      <button
                        className="ps-dr-remove"
                        onClick={() => handleRemoveRule(index)}
                        disabled={discountRules.length <= 1}
                        title={discountRules.length <= 1 ? "At least 1 rule required" : "Remove"}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button className="ps-add-rule" onClick={handleAddRule}>
                  <FiPlus size={15} /> Add Discount Rule
                </button>

                {/* Preview */}
                {discountRules.some((r) => r.minAmount > 0 && r.discountPercentage > 0) && (
                  <div className="ps-discount-preview">
                    <h4><FiGift size={13} /> Discount Preview</h4>
                    <div className="ps-dp-list">
                      {discountRules
                        .filter((r) => r.minAmount > 0 && r.discountPercentage > 0)
                        .sort((a, b) => a.minAmount - b.minAmount)
                        .map((r, i) => (
                          <div className="ps-dp-item" key={i}>
                            <span className="ps-dp-amount">₹{r.minAmount.toLocaleString()}+</span>
                            <span className="ps-dp-arrow">→</span>
                            <span className="ps-dp-disc">{r.discountPercentage}% OFF</span>
                            <span className="ps-dp-save">(Save ₹{Math.round(r.minAmount * r.discountPercentage / 100).toLocaleString()})</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== 4. REVIEWS ===== */}
          <div className="ps-section">
            <button className="ps-section-header" onClick={() => toggleSection("reviews")}>
              <div className="ps-sh-left">
                <div className="ps-sh-icon ps-sh-green"><FiMessageSquare size={18} /></div>
                <div className="ps-sh-text">
                  <h2>Product Reviews</h2>
                  <p>Enable or disable customer reviews on product pages</p>
                </div>
              </div>
              <div className="ps-sh-right">
                <span className={`ps-sh-status ${enableReviews ? "on" : "off"}`}>{enableReviews ? "Active" : "Inactive"}</span>
                {expandedSections.reviews ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </div>
            </button>

            {expandedSections.reviews && (
              <div className="ps-section-body">
                <div className={`ps-toggle-card ${enableReviews ? "ps-toggle-on ps-toggle-green" : "ps-toggle-off"}`}>
                  <div className="ps-toggle-left">
                    {enableReviews ? <FiCheckCircle size={20} /> : <FiXCircle size={20} />}
                    <div>
                      <strong>{enableReviews ? "Reviews are Enabled" : "Reviews are Disabled"}</strong>
                      <p>{enableReviews ? "Customers can submit and view reviews" : "Review form and list are hidden on all product pages"}</p>
                    </div>
                  </div>
                  <button className={`ps-toggle-switch ${enableReviews ? "active green" : ""}`} onClick={() => setEnableReviews(!enableReviews)} type="button">
                    <span className="ps-toggle-knob" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Sticky Save Bar (Mobile) */}
      {hasChanges && (
        <div className="ps-sticky-save">
          <div className="ps-sticky-inner">
            <span className="ps-sticky-text"><FiAlertTriangle size={14} /> Unsaved changes</span>
            <button className="ps-sticky-btn" onClick={handleSaveAll} disabled={saving}>
              <FiSave size={14} /> {saving ? "Saving…" : "Save All"}
            </button>
          </div>
        </div>
      )}

      <footer className="ps-footer"><p>© {new Date().getFullYear()} BafnaToys Store Settings</p></footer>
    </div>
  );
};

export default PaymentShippingSettings;