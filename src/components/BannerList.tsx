// src/components/BannerList.tsx
import React, { useEffect, useState } from "react";
import api, { MEDIA_URL } from "../utils/api";
import "../styles/BannerList.css";

interface Banner {
  _id: string;
  imageUrl: string;
  enabled: boolean;
}

const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || ""; // optional fallback

const resolveUrl = (u?: string) => {
  if (!u) return undefined;
  // already a full URL -> return as-is
  if (/^https?:\/\//i.test(u)) return u;
  // If MEDIA_URL is provided (like https://res.cloudinary.com/xxx) prefer that
  if (MEDIA_URL) {
    // If imageUrl looks like 'image/upload/...' where MEDIA_URL already includes path
    if (u.includes("/image/upload/")) return `${MEDIA_URL.replace(/\/+$/, "")}/${u.replace(/^\/+/, "")}`;
    // If it's a public_id like 'bafnatoys/abc' -> create full cloudinary url
    if (/^[^/.]+\//.test(u) && /res\.cloudinary\.com/i.test(MEDIA_URL)) {
      // MEDIA_URL is expected like https://res.cloudinary.com/<cloud>/image/upload
      // Ensure it contains /image/upload
      const base = MEDIA_URL.includes("/image/upload") ? MEDIA_URL : `${MEDIA_URL.replace(/\/+$/, "")}/image/upload`;
      return `${base}/${u.replace(/^\/+/, "")}`;
    }
    // Otherwise fallback to prefixing MEDIA_URL
    return `${MEDIA_URL.replace(/\/+$/, "")}/${u.replace(/^\/+/, "")}`;
  }
  // As last fallback, if cloudName is present, construct Cloudinary URL
  if (cloudName) return `https://res.cloudinary.com/${cloudName}/image/upload/${u.replace(/^\/+/, "")}`;
  // give up, return the original
  return u;
};

const BannerList: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await api.get("/banners/all");
      console.log("DEBUG banners:", res.data); // debug: inspect what imageUrl contains
      setBanners(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch banners", err);
    }
  };

  const toggleEnable = async (id: string) => {
    try {
      await api.patch(`/banners/${id}/toggle`);
      fetchBanners();
    } catch (err) {
      console.error("❌ Failed to toggle banner", err);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await api.delete(`/banners/${id}`);
      fetchBanners();
    } catch (err) {
      alert("❌ Failed to delete banner");
      console.error(err);
    }
  };

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
                  console.warn("Banner image failed:", src);
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
