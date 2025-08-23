import React, { useEffect, useState } from 'react';
import api, { MEDIA_URL } from '../utils/api';   // 👈 ensure MEDIA_URL is imported
import '../styles/BannerList.css';

interface Banner {
  _id: string;
  imageUrl: string;
  enabled: boolean;
}

const BannerList: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await api.get('/banners/all');
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
        {banners.map((banner) => (
          <div className="banner-card" key={banner._id}>
            <img 
              src={`${MEDIA_URL}${banner.imageUrl}`} 
              alt="Banner" 
              style={{
                width: '100%',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid #eee'
              }}
            />
            
            <div className="button-group">
              <button
                onClick={() => toggleEnable(banner._id)}
                className={banner.enabled ? 'enabled' : 'disabled'}
              >
                {banner.enabled ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => deleteBanner(banner._id)} className="delete">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BannerList;
