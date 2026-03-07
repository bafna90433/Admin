import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  FiCopy, 
  FiExternalLink, 
  FiTrash2, 
  FiToggleLeft, 
  FiToggleRight, 
  FiCheckCircle,
  FiEdit2, 
  FiSave,   
  FiX       
} from "react-icons/fi";

import "../styles/BannerManagement.css";

// --- ✅ CONFIGURATION ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_BASE =
  process.env.VITE_MEDIA_URL ||
  process.env.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "";

interface Banner {
  _id: string;
  imageUrl: string;
  link?: string;
  enabled: boolean;
}

// Helper to resolve image URLs
const resolveUrl = (u?: string) => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/api/uploads/") || u.startsWith("/uploads/")) {
    const path = u.replace(/^\/api/, "");
    const root = API_BASE.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    return `${root}${path}`;
  }
  if (MEDIA_BASE) {
    const base = MEDIA_BASE.replace(/\/+$/, "");
    return `${base}/${u.replace(/^\/+/, "")}`;
  }
  if (cloudName && /^[^/.]+\//.test(u)) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/${u.replace(/^\/+/, "")}`;
  }
  return u;
};

const BannerManagement: React.FC = () => {
  // --- STATE: Add Banner ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  // --- STATE: Banner List ---
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- STATE: Edit Link ---
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkValue, setEditingLinkValue] = useState<string>("");

  // --- EFFECT: Load Banners initially ---
  useEffect(() => {
    fetchBanners();
  }, []);

  // --- API METHODS ---
  const fetchBanners = async () => {
    try {
      setLoadingBanners(true);
      const res = await axios.get(`${API_BASE}/banners/all`);
      setBanners(res.data || []);
    } catch (err) {
      console.error("Failed to fetch banners", err);
      showToast("Failed to load banners. Please try again.");
    } finally {
      setLoadingBanners(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleEnable = async (id: string) => {
    try {
      await axios.patch(`${API_BASE}/banners/${id}/toggle`);
      fetchBanners();
      showToast("Banner status updated successfully!");
    } catch (err) {
      console.error("Failed to toggle banner", err);
      showToast("Failed to toggle banner status.");
    }
  };

  // ✅ PERMANENT DELETE FUNCTION
  const deleteBanner = async (id: string) => {
    if (!window.confirm("🚨 Are you sure you want to PERMANENTLY delete this banner? This cannot be undone.")) return;
    try {
      await axios.delete(`${API_BASE}/banners/${id}`);
      fetchBanners();
      showToast("Banner deleted successfully!");
    } catch (err) {
      console.error("Failed to delete banner", err);
      showToast("Failed to delete banner.");
    }
  };

  const copyLink = (link: string | undefined) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    showToast("Link copied to clipboard!");
  };

  // ✅ EDIT LINK FUNCTIONS
  const startEditingLink = (id: string, currentLink: string = "") => {
    setEditingLinkId(id);
    setEditingLinkValue(currentLink);
  };

  const cancelEditingLink = () => {
    setEditingLinkId(null);
    setEditingLinkValue("");
  };

  const saveBannerLink = async (id: string) => {
    try {
      await axios.patch(`${API_BASE}/banners/${id}/link`, { link: editingLinkValue });
      showToast("Banner link updated successfully!");
      setEditingLinkId(null);
      fetchBanners(); 
    } catch (err) {
      console.error("Failed to update link", err);
      showToast("Failed to update banner link.");
    }
  };

  // --- UPLOAD LOGIC ---
  const processFiles = (files: File[]) => {
    if (!files || files.length === 0) return;
    setSelectedFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
    setLinks(files.map(() => "")); 
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previewUrls];
    const newLinks = [...links];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    newLinks.splice(index, 1);
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
    setLinks(newLinks);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((f, i) => {
      formData.append("images", f);
      if (links[i]) formData.append("links", links[i]);
    });

    try {
      setUploading(true);
      setProgress(0);
      setUploadMessage("");

      await axios.post(`${API_BASE}/banners`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total || 1));
          setProgress(percent);
        },
      });

      setUploadMessage("✅ Uploaded successfully!");
      showToast("Banner(s) uploaded successfully!");
      
      setSelectedFiles([]);
      setPreviewUrls([]);
      setLinks([]);
      fetchBanners();
      
      setTimeout(() => setUploadMessage(""), 3000);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setUploadMessage("❌ Failed to upload. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* =========================================
          SECTION 1: UPLOAD BANNER
      ========================================= */}
      <div className="add-banner-container" style={{ marginBottom: "40px" }}>
        <div className="card">
          <h2 className="card-title">📤 Upload Banner Images</h2>

          <form onSubmit={handleUploadSubmit} className="upload-form">
            <div
              className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="banner-upload"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="banner-upload" className="dropzone-label">
                <div className="dropzone-content">
                  <p className="dropzone-text">
                    {dragActive
                      ? "Drop your files here 📦"
                      : "Drag & drop images here or click to browse"}
                  </p>
                  <p className="dropzone-hint">
                    Supports: JPG, PNG, WebP (max 5MB each)
                  </p>
                </div>
              </label>
            </div>

            {uploading && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            )}

            {uploadMessage && <p className="upload-message">{uploadMessage}</p>}

            <button type="submit" className="submit-button" disabled={uploading || selectedFiles.length === 0}>
              {uploading ? `Uploading ${progress}%...` : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
            </button>
          </form>

          {/* Preview Selection Before Upload */}
          {previewUrls.length > 0 && (
            <div className="preview-section">
              <h3 className="preview-title">Selected Images ({previewUrls.length})</h3>
              <div className="preview-grid">
                {previewUrls.map((url, i) => (
                  <div key={i} className="preview-item">
                    <img src={url} alt={`preview-${i}`} className="preview-image" />
                    <input
                      type="text"
                      placeholder="Enter link (optional)"
                      value={links[i]}
                      onChange={(e) => {
                        const newLinks = [...links];
                        newLinks[i] = e.target.value;
                        setLinks(newLinks);
                      }}
                      className="link-input"
                    />
                    <button className="remove-button" onClick={() => removeImage(i)} type="button">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "2px dashed #eee", margin: "40px 0" }} />

      {/* =========================================
          SECTION 2: BANNER LIST / MANAGEMENT
      ========================================= */}
      <div className="banner-list">
        <h2>🏞 Banner Management</h2>
          
        {loadingBanners && <div className="loading">Loading banners...</div>}
        {!loadingBanners && banners.length === 0 && <p className="empty-banners">No banners found. Time to add one!</p>}

        <div className="banner-items">
          {banners.map((banner) => {
            const src = resolveUrl(banner.imageUrl);
            const isEnabled = banner.enabled;
            const isEditing = editingLinkId === banner._id;

            return (
              <div className="banner-card" key={banner._id}>
                <div className="banner-image-wrapper">
                  <span className={`status-badge ${isEnabled ? "enabled" : "disabled"}`}>
                    {isEnabled ? "LIVE" : "DRAFT"}
                  </span>
                  <img
                    src={src || "/placeholder-product.png"}
                    alt="Banner"
                    className="banner-image"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder-product.png"; }}
                  />
                </div>

                <div className="banner-info">
                  {/* ✅ EDIT LINK UI */}
                  {isEditing ? (
                    <div className="banner-edit-row">
                      <input
                        type="text"
                        className="link-input edit-mode-input"
                        value={editingLinkValue}
                        onChange={(e) => setEditingLinkValue(e.target.value)}
                        placeholder="Enter redirect link..."
                        autoFocus
                      />
                      <div className="edit-actions">
                        <button className="icon-btn save-btn" onClick={() => saveBannerLink(banner._id)} title="Save"><FiSave /></button>
                        <button className="icon-btn cancel-btn" onClick={cancelEditingLink} title="Cancel"><FiX /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="banner-link-row">
                      {banner.link ? (
                        <a href={banner.link} target="_blank" rel="noopener noreferrer" className="banner-link">
                          {banner.link.length > 30 ? banner.link.slice(0, 30) + "..." : banner.link}
                          <FiExternalLink size={14} style={{ marginLeft: 6, flexShrink: 0 }} />
                        </a>
                      ) : (
                        <p className="no-link">No link assigned</p>
                      )}
                      
                      <div className="link-actions">
                        {banner.link && (
                          <button className="icon-btn copy-btn" onClick={() => copyLink(banner.link)} title="Copy Link"><FiCopy /></button>
                        )}
                        <button className="icon-btn edit-btn" onClick={() => startEditingLink(banner._id, banner.link)} title="Edit Link"><FiEdit2 /></button>
                      </div>
                    </div>
                  )}

                  {/* ✅ ENABLE/DISABLE & DELETE BUTTONS WITH FORCED CSS */}
                  <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                      onClick={() => toggleEnable(banner._id)} 
                      className={`toggle-btn ${isEnabled ? "enabled" : "disabled"}`}
                      style={{ flexGrow: 1 }}
                    >
                      {isEnabled ? <><FiToggleRight size={18} /> Enable</> : <><FiToggleLeft size={18} /> Disable</>}
                    </button>
                    
                    {/* YEH HAI PERMANENT DELETE BUTTON */}
                    <button 
                      onClick={() => deleteBanner(banner._id)} 
                      title="Delete Banner"
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #f87171',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      <FiTrash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="toast-notification">
            <FiCheckCircle style={{ marginRight: 8 }} /> {toastMessage}
          </div>
        )}
      </div>

    </div>
  );
};

export default BannerManagement;