import React, { useEffect, useState } from "react";
import api, { MEDIA_URL } from "../utils/api";
import "../styles/BannerList.css";

interface Banner {
  _id: string;
  imageUrl: string;
  enabled: boolean;
}

const API_ROOT = (() => {
  const raw = (import.meta as any).env?.VITE_API_URL || "";
  return raw.replace(/\/api\/?$/, "").replace(/\/+$/, "");
})();

const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || "";

const resolveUrl = (u?: string) => {
  if (!u) return undefined;

  // 1) Absolute URL -> return as-is
  if (/^https?:\/\//i.test(u)) return u;

  // 2) Fix /api/uploads/... and /uploads/...
  if (u.startsWith("/api/uploads/") || u.startsWith("/uploads/")) {
    const path = u.replace(/^\/api/, ""); // normalize to "/uploads/..."
    if (!API_ROOT) return path;
    return `${API_ROOT.replace(/\/+$/, "")}${path}`;
  }

  // 3) If MEDIA_URL configured (for cloudinary base), prefer that
  if (MEDIA_URL) {
    const base = MEDIA_URL.replace(/\/+$/, "");
    if (u.includes("/image/upload/")) {
      return `${base}/${u.replace(/^\/+/, "")}`;
    }
    // public_id style like "bafnatoys/abcd"
    if (/^[^/.]+\//.test(u)) {
      const cloudBase = base.includes("/image/upload") ? base : `${base}/image/upload`;
      return `${cloudBase}/${u.replace(/^\/+/, "")}`;
    }
    return `${base}/${u.replace(/^\/+/, "")}`;
  }

  // 4) If we have cloudName and a public id, construct Cloudinary URL
  if (cloudName && /^[^/.]+\//.test(u)) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/${u.replace(/^\/+/, "")}`;
  }

  // 5) otherwise return as-is (relative path)
  return u;
};

const BannerList: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await api.get("/banners/all");
      setBanners(res.data || []);
    } catch (err) {
      console.error("Failed to fetch banners", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnable = async (id: string) => {
    try {
      await api.patch(`/banners/${id}/toggle`);
      fetchBanners();
    } catch (err) {
      console.error("Failed to toggle banner", err);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await api.delete(`/banners/${id}`);
      fetchBanners();
    } catch (err) {
      console.error("Failed to delete banner", err);
      alert("Failed to delete banner");
    }
  };

  if (loading) return <div className="banner-list">Loading banners…</div>;

  return (
    <div className="banner-list">
      <h2>Banner List</h2>
      <div className="banner-items">
        {banners.map((banner) => {
          const src = resolveUrl(banner.imageUrl);
          return (
            <div className="banner-card" key={banner._id}>
              <img
                src={src || "/placeholder-product.png"}
                alt="Banner"
                style={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  border: "1px solid #eee",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/placeholder-product.png";
                }}
              />

              <div className="button-group">
                <button onClick={() => toggleEnable(banner._id)} className={banner.enabled ? "enabled" : "disabled"}>
                  {banner.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => deleteBanner(banner._id)} className="delete">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BannerList;
