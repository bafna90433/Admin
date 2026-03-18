import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  FiSettings, FiSave, FiImage, FiLink, FiStar, FiTrash2,
  FiPlus, FiX, FiUploadCloud, FiAward, FiUsers, FiRefreshCw,
  FiChevronDown, FiChevronUp, FiExternalLink, FiYoutube,
  FiInstagram, FiFacebook, FiLinkedin, FiShield, FiKey,
  FiLayers, FiGrid, FiAlertTriangle, FiCheck, FiCamera,
  FiGlobe, FiPackage, FiEye
} from "react-icons/fi";
import "../styles/TrustSettingsAdmin.css";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (process as any).env?.VITE_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const TrustSettingsAdmin: React.FC = () => {
  const [images, setImages] = useState<any>({
    factoryImage: null,
    factorySliderImages: [],
    amazonLogo: null, flipkartLogo: null, meeshoLogo: null, makeInIndiaLogo: null,
  });

  const [localPreviews, setLocalPreviews] = useState<any>({});
  const [clearSlider, setClearSlider] = useState(false);
  const [retailerCount, setRetailerCount] = useState("49,000+");
  const [socialLinks, setSocialLinks] = useState({ youtube: "", instagram: "", facebook: "", linkedin: "" });
  const [storeLinks, setStoreLinks] = useState({ amazon: "", flipkart: "", meesho: "" });
  const [reviews, setReviews] = useState<any[]>([{ text: "", name: "", existingImage: "", file: null, localPreview: "" }]);
  const [factoryVisuals, setFactoryVisuals] = useState<any[]>([{ label: "Manufacturing", existingImage: "", file: null, localPreview: "" }]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<any>({});
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [sections, setSections] = useState<Record<string, boolean>>({
    marketplace: true,
    social: true,
    trust: true,
    factory: true,
    slider: true,
    reviews: true,
  });

  const topRef = useRef<HTMLDivElement>(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    if (initialLoad.current) return;
    setHasChanges(true);
  }, [retailerCount, socialLinks, storeLinks, reviews, factoryVisuals, images, clearSlider]);

  const toggleSection = (key: string) => setSections((p) => ({ ...p, [key]: !p[key] }));

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/trust-settings`);
      setPreview(res.data || {});
      if (res.data) {
        if (res.data.retailerCount) setRetailerCount(res.data.retailerCount);
        setSocialLinks({
          youtube: res.data.youtubeLink || "", instagram: res.data.instagramLink || "",
          facebook: res.data.facebookLink || "", linkedin: res.data.linkedinLink || "",
        });
        setStoreLinks({
          amazon: res.data.amazonLink || "", flipkart: res.data.flipkartLink || "", meesho: res.data.meeshoLink || "",
        });
        if (res.data.customerReviews?.length > 0) {
          setReviews(res.data.customerReviews.map((r: any) => ({
            text: r.reviewText, name: r.reviewerName, existingImage: r.image, file: null, localPreview: "",
          })));
        }
        if (res.data.factoryVisuals?.length > 0) {
          setFactoryVisuals(res.data.factoryVisuals.map((v: any) => ({
            label: v.label || "", existingImage: v.image || "", file: null, localPreview: "",
          })));
        }
      }
      setClearSlider(false);
      setTimeout(() => { initialLoad.current = false; }, 100);
    } catch {
      toast.error("Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // WEBP validation
  const validateWebp = (file: File): boolean => {
    const isWebp = file.type === "image/webp" || file.name.toLowerCase().endsWith(".webp");
    if (!isWebp) {
      toast.error(`"${file.name}" — only WEBP allowed`, { icon: "⚠️", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
    }
    return isWebp;
  };

  // File handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateWebp(file)) { e.target.value = ""; return; }
    setImages({ ...images, [field]: file });
    setLocalPreviews({ ...localPreviews, [field]: URL.createObjectURL(file) });
  };

  const removeImage = (field: string) => {
    setImages({ ...images, [field]: null });
    setLocalPreviews({ ...localPreviews, [field]: null });
    setPreview({ ...preview, [field]: null });
  };

  // Slider
  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files).filter(validateWebp);
    if (!filesArray.length) { e.target.value = ""; return; }
    setImages({ ...images, factorySliderImages: [...(images.factorySliderImages || []), ...filesArray] });
    setLocalPreviews({ ...localPreviews, factorySliderImages: [...(localPreviews.factorySliderImages || []), ...filesArray.map((f) => URL.createObjectURL(f))] });
    e.target.value = "";
  };

  const removeSliderImage = (index: number, isLocal: boolean) => {
    if (isLocal) {
      const nf = [...(images.factorySliderImages || [])]; nf.splice(index, 1);
      const np = [...(localPreviews.factorySliderImages || [])]; np.splice(index, 1);
      setImages({ ...images, factorySliderImages: nf });
      setLocalPreviews({ ...localPreviews, factorySliderImages: np });
    } else {
      const nd = [...(preview.factorySliderImages || [])]; nd.splice(index, 1);
      setPreview({ ...preview, factorySliderImages: nd });
    }
  };

  // Reviews
  const addReviewField = () => setReviews([...reviews, { text: "", name: "", existingImage: "", file: null, localPreview: "" }]);
  const removeReviewField = (index: number) => setReviews(reviews.filter((_, i) => i !== index));
  const updateReview = (index: number, field: string, value: any) => {
    const n = [...reviews]; n[index][field] = value; setReviews(n);
  };
  const handleReviewFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateWebp(file)) { e.target.value = ""; return; }
    const n = [...reviews]; n[index].file = file; n[index].localPreview = URL.createObjectURL(file); setReviews(n);
  };
  const removeReviewImage = (index: number) => {
    const n = [...reviews]; n[index].file = null; n[index].localPreview = ""; n[index].existingImage = ""; setReviews(n);
  };

  // Factory Visuals
  const addFactoryVisual = () => setFactoryVisuals([...factoryVisuals, { label: "", existingImage: "", file: null, localPreview: "" }]);
  const removeFactoryVisual = (index: number) => setFactoryVisuals(factoryVisuals.filter((_, i) => i !== index));
  const updateFactoryVisual = (index: number, field: string, value: any) => {
    const n = [...factoryVisuals]; n[index][field] = value; setFactoryVisuals(n);
  };
  const handleFactoryVisualFile = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateWebp(file)) { e.target.value = ""; return; }
    const n = [...factoryVisuals]; n[index].file = file; n[index].localPreview = URL.createObjectURL(file); setFactoryVisuals(n);
  };
  const removeFactoryVisualImage = (index: number) => {
    const n = [...factoryVisuals]; n[index].file = null; n[index].localPreview = ""; n[index].existingImage = ""; setFactoryVisuals(n);
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    const formData = new FormData();
    formData.append("retailerCount", retailerCount);
    formData.append("youtubeLink", socialLinks.youtube);
    formData.append("instagramLink", socialLinks.instagram);
    formData.append("facebookLink", socialLinks.facebook);
    formData.append("linkedinLink", socialLinks.linkedin);
    formData.append("amazonLink", storeLinks.amazon);
    formData.append("flipkartLink", storeLinks.flipkart);
    formData.append("meeshoLink", storeLinks.meesho);
    formData.append("clearSlider", clearSlider.toString());
    formData.append("retainedSliderImages", JSON.stringify(preview.factorySliderImages || []));

    ["factoryImage", "amazonLogo", "flipkartLogo", "meeshoLogo", "makeInIndiaLogo"].forEach((f) => {
      if (images[f]) formData.append(f, images[f]);
    });
    images.factorySliderImages?.forEach((file: File) => formData.append("factorySliderImages", file));

    const reviewsData = reviews.map((r) => ({ text: r.text, name: r.name, hasNewImage: !!r.file, existingImage: r.existingImage }));
    formData.append("reviewsData", JSON.stringify(reviewsData));
    reviews.forEach((r) => { if (r.file) formData.append("reviewImages", r.file); });

    const visualsData = factoryVisuals.map((v) => ({ label: v.label, hasNewImage: !!v.file, existingImage: v.existingImage }));
    formData.append("factoryVisualsData", JSON.stringify(visualsData));
    factoryVisuals.forEach((v) => { if (v.file) formData.append("factoryVisualImages", v.file); });

    try {
      await axios.put(`${API_BASE}/trust-settings`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("All settings saved!", { icon: "✅", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      setImages({ ...images, factorySliderImages: [], amazonLogo: null, flipkartLogo: null, meeshoLogo: null, makeInIndiaLogo: null });
      setLocalPreviews({});
      setHasChanges(false);
      fetchSettings();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Image upload component
  const ImageUploader = ({ field, label }: { field: string; label: string }) => {
    const displayUrl = localPreviews[field] || preview[field];
    return (
      <div className="ts-uploader">
        <span className="ts-uploader-label">{label}</span>
        {displayUrl ? (
          <div className="ts-uploader-preview">
            <img src={displayUrl} alt={label} onClick={() => setPreviewImg(displayUrl)} />
            <button type="button" className="ts-uploader-remove" onClick={() => removeImage(field)}><FiX size={12} /></button>
          </div>
        ) : (
          <label className="ts-upload-zone">
            <FiUploadCloud size={18} />
            <span>Upload WEBP</span>
            <input type="file" accept=".webp,image/webp" onChange={(e) => handleFileChange(e, field)} />
          </label>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="ts-root">
        <div className="ts-state">
          <div className="ts-loader"><div className="ts-loader-ring" /><div className="ts-loader-ring" /><div className="ts-loader-ring" /></div>
          <h3>Loading Settings</h3><p>Please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {/* Image Preview */}
      {previewImg && (
        <div className="ts-overlay" onClick={() => setPreviewImg(null)}>
          <div className="ts-img-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ts-img-bar"><span><FiEye size={16} /> Preview</span><button onClick={() => setPreviewImg(null)}><FiX size={18} /></button></div>
            <div className="ts-img-body"><img src={previewImg} alt="Preview" /></div>
          </div>
        </div>
      )}

      {/* Top */}
      <section className="ts-top">
        <div className="ts-top-row">
          <div className="ts-top-left">
            <h1 className="ts-title">Trust & Config</h1>
            <p className="ts-subtitle">Store links, logos, factory visuals & reviews</p>
          </div>
          <div className="ts-top-right">
            <button className="ts-top-btn" onClick={fetchSettings} disabled={loading}><FiRefreshCw size={16} className={loading ? "ts-spinning" : ""} /></button>
            <button className={`ts-save-main ${hasChanges ? "ts-has-changes" : ""}`} onClick={handleSave} disabled={saving || !hasChanges}>
              <FiSave size={15} /><span>{saving ? "Saving…" : "Save All"}</span>
              {hasChanges && <span className="ts-unsaved-dot" />}
            </button>
          </div>
        </div>
      </section>

      <main className="ts-main">
        {/* ===== 1. MARKETPLACE LINKS ===== */}
        <div className="ts-section">
          <button className="ts-section-header" onClick={() => toggleSection("marketplace")}>
            <div className="ts-sh-left">
              <div className="ts-sh-icon ts-sh-blue"><FiLink size={18} /></div>
              <div className="ts-sh-text"><h2>Marketplace Links & Logos</h2><p>Amazon, Flipkart, Meesho URLs and brand logos</p></div>
            </div>
            <div className="ts-sh-right">{sections.marketplace ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}</div>
          </button>
          {sections.marketplace && (
            <div className="ts-section-body">
              <div className="ts-marketplace-grid">
                {[
                  { key: "amazon", label: "Amazon", logo: "amazonLogo" },
                  { key: "flipkart", label: "Flipkart", logo: "flipkartLogo" },
                  { key: "meesho", label: "Meesho", logo: "meeshoLogo" },
                ].map((m) => (
                  <div className="ts-market-card" key={m.key}>
                    <div className="ts-field">
                      <label className="ts-label"><FiExternalLink size={12} /> {m.label} URL</label>
                      <input type="text" className="ts-input" placeholder={`https://${m.key}.in/...`} value={(storeLinks as any)[m.key]} onChange={(e) => setStoreLinks({ ...storeLinks, [m.key]: e.target.value })} />
                    </div>
                    <ImageUploader field={m.logo} label={`${m.label} Logo`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== 2. SOCIAL LINKS ===== */}
        <div className="ts-section">
          <button className="ts-section-header" onClick={() => toggleSection("social")}>
            <div className="ts-sh-left">
              <div className="ts-sh-icon ts-sh-purple"><FiUsers size={18} /></div>
              <div className="ts-sh-text"><h2>Social Media Links</h2><p>Footer social media profile URLs</p></div>
            </div>
            <div className="ts-sh-right">{sections.social ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}</div>
          </button>
          {sections.social && (
            <div className="ts-section-body">
              <div className="ts-social-grid">
                {[
                  { key: "youtube", label: "YouTube", icon: <FiYoutube size={14} /> },
                  { key: "instagram", label: "Instagram", icon: <FiInstagram size={14} /> },
                  { key: "facebook", label: "Facebook", icon: <FiFacebook size={14} /> },
                  { key: "linkedin", label: "LinkedIn", icon: <FiLinkedin size={14} /> },
                ].map((s) => (
                  <div className="ts-field" key={s.key}>
                    <label className="ts-label">{s.icon} {s.label}</label>
                    <input type="text" className="ts-input" placeholder={`https://${s.key}.com/...`} value={(socialLinks as any)[s.key]} onChange={(e) => setSocialLinks({ ...socialLinks, [s.key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== 3. TRUST BADGE ===== */}
        <div className="ts-section">
          <button className="ts-section-header" onClick={() => toggleSection("trust")}>
            <div className="ts-sh-left">
              <div className="ts-sh-icon ts-sh-amber"><FiAward size={18} /></div>
              <div className="ts-sh-text"><h2>Trust Banner & Badge</h2><p>Retailer count and Make in India logo</p></div>
            </div>
            <div className="ts-sh-right">{sections.trust ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}</div>
          </button>
          {sections.trust && (
            <div className="ts-section-body">
              <div className="ts-trust-grid">
                <div className="ts-field-card">
                  <label className="ts-label"><FiUsers size={12} /> Retailer Count</label>
                  <input type="text" className="ts-input ts-input-lg" value={retailerCount} onChange={(e) => setRetailerCount(e.target.value)} placeholder="e.g. 49,000+" />
                  <p className="ts-field-hint">Displayed in the trust section on homepage</p>
                </div>
                <ImageUploader field="makeInIndiaLogo" label="Make in India Badge" />
              </div>
            </div>
          )}
        </div>

        {/* ===== 4. FACTORY VISUALS ===== */}
        <div className="ts-section">
          <button className="ts-section-header" onClick={() => toggleSection("factory")}>
            <div className="ts-sh-left">
              <div className="ts-sh-icon ts-sh-orange"><FiCamera size={18} /></div>
              <div className="ts-sh-text"><h2>Factory & Manufacturing</h2><p>BIS banner and factory process cards ({factoryVisuals.length})</p></div>
            </div>
            <div className="ts-sh-right">
              <span className="ts-sh-badge">{factoryVisuals.length}</span>
              {sections.factory ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </div>
          </button>
          {sections.factory && (
            <div className="ts-section-body">
              <div className="ts-bis-row">
                <ImageUploader field="factoryImage" label="Main BIS Certified Banner" />
              </div>

              <div className="ts-factory-header">
                <h3><FiGrid size={14} /> Factory Process Cards</h3>
                <button className="ts-add-btn" onClick={addFactoryVisual}><FiPlus size={14} /> Add Card</button>
              </div>

              <div className="ts-factory-grid">
                {factoryVisuals.map((v, i) => {
                  const displayUrl = v.localPreview || v.existingImage;
                  return (
                    <div className="ts-visual-card" key={i}>
                      <button className="ts-visual-remove" onClick={() => removeFactoryVisual(i)}><FiTrash2 size={14} /></button>
                      <div className="ts-field">
                        <label className="ts-label">Title Label</label>
                        <input type="text" className="ts-input" value={v.label} onChange={(e) => updateFactoryVisual(i, "label", e.target.value)} placeholder="e.g. Manufacturing Unit" />
                      </div>
                      <div className="ts-visual-img">
                        {displayUrl ? (
                          <div className="ts-visual-preview">
                            <img src={displayUrl} alt="Visual" onClick={() => setPreviewImg(displayUrl)} />
                            <button className="ts-visual-img-remove" onClick={() => removeFactoryVisualImage(i)}><FiX size={12} /></button>
                          </div>
                        ) : (
                          <label className="ts-upload-zone ts-upload-card">
                            <FiUploadCloud size={18} /><span>Upload WEBP</span>
                            <input type="file" accept=".webp,image/webp" onChange={(e) => handleFactoryVisualFile(i, e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===== 5. SLIDER ===== */}
        <div className="ts-section">
          <button className="ts-section-header" onClick={() => toggleSection("slider")}>
            <div className="ts-sh-left">
              <div className="ts-sh-icon ts-sh-teal"><FiLayers size={18} /></div>
              <div className="ts-sh-text"><h2>Factory Slider</h2><p>Live facility feed slider images</p></div>
            </div>
            <div className="ts-sh-right">
              <span className="ts-sh-badge">{(preview.factorySliderImages?.length || 0) + (localPreviews.factorySliderImages?.length || 0)}</span>
              {sections.slider ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </div>
          </button>
          {sections.slider && (
            <div className="ts-section-body">
              <label className="ts-slider-upload-btn">
                <FiUploadCloud size={15} /> Add Slider Images (WEBP)
                <input type="file" multiple accept=".webp,image/webp" onChange={handleMultipleFileChange} />
              </label>

              <div className="ts-slider-grid">
                {preview.factorySliderImages?.map((src: string, i: number) => (
                  <div className="ts-slider-thumb" key={`db-${i}`}>
                    <img src={src} alt={`Slide ${i}`} onClick={() => setPreviewImg(src)} />
                    <button className="ts-slider-remove" onClick={() => removeSliderImage(i, false)}><FiX size={12} /></button>
                  </div>
                ))}
                {localPreviews.factorySliderImages?.map((src: string, i: number) => (
                  <div className="ts-slider-thumb ts-slider-new" key={`loc-${i}`}>
                    <img src={src} alt={`New ${i}`} />
                    <button className="ts-slider-remove" onClick={() => removeSliderImage(i, true)}><FiX size={12} /></button>
                    <span className="ts-slider-new-badge">NEW</span>
                  </div>
                ))}
              </div>

              <label className="ts-clear-slider">
                <input type="checkbox" checked={clearSlider} onChange={(e) => setClearSlider(e.target.checked)} />
                <FiTrash2 size={13} /> Delete all existing slider images
              </label>
            </div>
          )}
        </div>

        {/* ===== 6. REVIEWS ===== */}
        <div className="ts-section">
          <button className="ts-section-header" onClick={() => toggleSection("reviews")}>
            <div className="ts-sh-left">
              <div className="ts-sh-icon ts-sh-green"><FiStar size={18} /></div>
              <div className="ts-sh-text"><h2>Customer Reviews</h2><p>Static reviews displayed on homepage ({reviews.length})</p></div>
            </div>
            <div className="ts-sh-right">
              <span className="ts-sh-badge">{reviews.length}</span>
              {sections.reviews ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </div>
          </button>
          {sections.reviews && (
            <div className="ts-section-body">
              <button className="ts-add-btn ts-add-review" onClick={addReviewField}><FiPlus size={14} /> Add Review</button>

              <div className="ts-reviews-list">
                {reviews.map((r, i) => {
                  const displayUrl = r.localPreview || r.existingImage;
                  return (
                    <div className="ts-review-card" key={i}>
                      <div className="ts-review-header">
                        <span className="ts-review-num">Review #{i + 1}</span>
                        <button className="ts-review-remove" onClick={() => removeReviewField(i)}><FiTrash2 size={13} /> Remove</button>
                      </div>
                      <div className="ts-review-body">
                        <div className="ts-review-avatar">
                          <label className="ts-label">Photo</label>
                          {displayUrl ? (
                            <div className="ts-avatar-preview">
                              <img src={displayUrl} alt="Review" onClick={() => setPreviewImg(displayUrl)} />
                              <button className="ts-avatar-remove" onClick={() => removeReviewImage(i)}><FiX size={10} /></button>
                            </div>
                          ) : (
                            <label className="ts-avatar-upload">
                              <FiImage size={20} />
                              <input type="file" accept=".webp,image/webp" onChange={(e) => handleReviewFileChange(i, e)} />
                            </label>
                          )}
                        </div>
                        <div className="ts-review-fields">
                          <div className="ts-field">
                            <label className="ts-label">Review Text</label>
                            <textarea className="ts-input ts-textarea" value={r.text} onChange={(e) => updateReview(i, "text", e.target.value)} placeholder='"Amazing toys, great quality!"' rows={3} />
                          </div>
                          <div className="ts-field">
                            <label className="ts-label">Customer Name</label>
                            <input type="text" className="ts-input" value={r.name} onChange={(e) => updateReview(i, "name", e.target.value)} placeholder="e.g. Ramesh" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {reviews.length === 0 && <div className="ts-empty-reviews"><FiStar size={20} /><p>No reviews added yet</p></div>}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Save */}
      {hasChanges && (
        <div className="ts-sticky-save">
          <div className="ts-sticky-inner">
            <span className="ts-sticky-text"><FiAlertTriangle size={14} /> Unsaved changes</span>
            <button className="ts-sticky-btn" onClick={handleSave} disabled={saving}><FiSave size={14} /> {saving ? "Saving…" : "Save All"}</button>
          </div>
        </div>
      )}

      <footer className="ts-footer"><p>© {new Date().getFullYear()} BafnaToys Trust Settings</p></footer>
    </div>
  );
};

export default TrustSettingsAdmin;