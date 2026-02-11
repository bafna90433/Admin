import React, { useEffect, useState } from "react";
import axios from "axios"; // ✅ Changed: Import axios directly
import "../styles/BannerList.css";
// Added a toast state
import { FiCopy, FiExternalLink, FiTrash2, FiToggleLeft, FiToggleRight, FiCheckCircle } from "react-icons/fi";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_BASE =
  process.env.VITE_MEDIA_URL ||
  process.env.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

interface Banner {
  _id: string;
  imageUrl: string;
  link?: string;
  enabled: boolean;
}

const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "";

const resolveUrl = (u?: string) => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/api/uploads/") || u.startsWith("/uploads/")) {
    const path = u.replace(/^\/api/, "");
    // ✅ Changed: Use API_BASE root (without /api) or MEDIA_BASE
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

const BannerList: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  // New state for professional toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBanners();
    const handleUpdate = () => fetchBanners();
    window.addEventListener("bannersUpdated", handleUpdate);
    return () => window.removeEventListener("bannersUpdated", handleUpdate);
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      // ✅ Changed: Using axios with API_BASE
      const res = await axios.get(`${API_BASE}/banners/all`);
      setBanners(res.data || []);
    } catch (err) {
      console.error("Failed to fetch banners", err);
      showToast("Failed to load banners. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000); // Hide after 3 seconds
  };

  const toggleEnable = async (id: string) => {
    try {
      // ✅ Changed: Using axios with API_BASE
      await axios.patch(`${API_BASE}/banners/${id}/toggle`);
      fetchBanners();
      showToast("Banner status updated successfully!");
    } catch (err) {
      console.error("Failed to toggle banner", err);
      showToast("Failed to toggle banner status.");
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this banner?")) return;
    try {
      // ✅ Changed: Using axios with API_BASE
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
    showToast("Link copied to clipboard!"); // Use the professional toast
  };

  if (loading) return <div className="banner-list loading">Loading banners...</div>;

  return (
    <div className="banner-list">
      <h2>🏞 Banner Management</h2>
        
      {banners.length === 0 && <p className="empty-banners">No banners found. Time to add one!</p>}

      <div className="banner-items">
        {banners.map((banner) => {
          const src = resolveUrl(banner.imageUrl);
          const isEnabled = banner.enabled;

          return (
            <div className="banner-card" key={banner._id}>
              <div className="banner-image-wrapper">
                {/* Status Badge */}
                <span className={`status-badge ${isEnabled ? "enabled" : "disabled"}`}>
                  {isEnabled ? "LIVE" : "DRAFT"}
                </span>
                
                <img
                  src={src || "/placeholder-product.png"}
                  alt="Banner"
                  className="banner-image"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/placeholder-product.png";
                  }}
                />
              </div>

              <div className="banner-info">
                {/* Banner Link Display */}
                {banner.link ? (
                  <div className="banner-link-row">
                    <a
                      href={banner.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="banner-link"
                    >
                      {banner.link.length > 40 ? banner.link.slice(0, 40) + "..." : banner.link}
                      <FiExternalLink size={14} style={{ marginLeft: 6, flexShrink: 0 }} />
                    </a>
                    <button
                      className="copy-btn"
                      title="Copy Link"
                      onClick={() => copyLink(banner.link)}
                    >
                      <FiCopy size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="no-link">No external link assigned</p>
                )}

                {/* Enable/Disable + Delete */}
                <div className="button-group">
                  <button
                    onClick={() => toggleEnable(banner._id)}
                    className={`toggle-btn ${isEnabled ? "enabled" : "disabled"}`}
                  >
                    {isEnabled ? (
                      <>
                        <FiToggleRight size={20} /> Enable
                      </>
                    ) : (
                      <>
                        <FiToggleLeft size={20} /> Disable
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => deleteBanner(banner._id)}
                    className="delete-btn"
                    title="Delete Banner"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Professional Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <FiCheckCircle style={{ marginRight: 8 }} /> {toastMessage}
        </div>
      )}
    </div>
  );
};

export default BannerList;