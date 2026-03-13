import React, { useState, useEffect } from 'react';
import api from '../utils/api'; 

const TrustSettingsAdmin = () => {
  const [images, setImages] = useState<any>({
    badge1: null, badge2: null, badge3: null, badge4: null, factoryImage: null,
    manufacturingUnit: null, packingDispatch: null, warehouseStorage: null,
    starterBoxImage: null,
    factorySliderImages: [] // ✅ Naya state array for multiple images
  });
  const [clearSlider, setClearSlider] = useState(false); // ✅ Purani images clear karne ka toggle
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>({}); 

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/trust-settings');
      setPreview(res.data || {});
      setClearSlider(false); // reset toggle after fetch
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setImages({ ...images, [field]: e.target.files[0] });
    }
  };

  // ✅ NAYA: Multiple files handle karne ke liye
  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages({ ...images, factorySliderImages: filesArray });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const formData = new FormData();
    if (images.badge1) formData.append('badge1', images.badge1);
    if (images.badge2) formData.append('badge2', images.badge2);
    if (images.badge3) formData.append('badge3', images.badge3);
    if (images.badge4) formData.append('badge4', images.badge4);
    if (images.factoryImage) formData.append('factoryImage', images.factoryImage);
    
    if (images.manufacturingUnit) formData.append('manufacturingUnit', images.manufacturingUnit);
    if (images.packingDispatch) formData.append('packingDispatch', images.packingDispatch);
    if (images.warehouseStorage) formData.append('warehouseStorage', images.warehouseStorage);
    if (images.starterBoxImage) formData.append('starterBoxImage', images.starterBoxImage);

    // ✅ NAYA: Clear flag aur multiple files append
    formData.append('clearSlider', clearSlider.toString());
    if (images.factorySliderImages && images.factorySliderImages.length > 0) {
        images.factorySliderImages.forEach((file: File) => {
            formData.append('factorySliderImages', file);
        });
    }

    try {
      await api.put('/trust-settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Settings & Images Updated Successfully!');
      setImages({ ...images, factorySliderImages: [] }); // Clear local selection
      fetchSettings(); 
    } catch (error) {
      console.error(error);
      alert('Failed to update images');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%' };
  const cardStyle = { background: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e5e7eb' };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ borderBottom: '2px solid #ff2a75', paddingBottom: '10px', marginBottom: '20px' }}>
        Manage Trust & Factory Sections
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* NAYA BLOCK: Starter Box Image */}
        <h3 style={{ marginTop: '10px', marginBottom: '15px', color: '#111827' }}>Starter Retail Box</h3>
        <div style={{ ...cardStyle, background: '#fffbeb', borderColor: '#fde68a' }}>
            <h4>Starter Box 3D Image</h4>
            {preview.starterBoxImage && <img src={preview.starterBoxImage} alt="Preview" style={{ height: '80px', objectFit: 'contain', marginBottom: '10px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'starterBoxImage')} style={inputStyle} accept="image/*" />
        </div>

        {/* ✅ NAYA BLOCK: Factory Slider Upload */}
        <h3 style={{ marginTop: '20px', marginBottom: '15px', color: '#111827' }}>Dynamic Factory Slider (Auto-Scroll)</h3>
        <div style={{ ...cardStyle, background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <h4>Add More Factory Images (Select Multiple)</h4>
            <p style={{fontSize: '12px', color: '#6b7280', marginBottom: '10px'}}>These will be added to the scrolling gallery at the bottom of the page.</p>
            
            <input type="file" multiple onChange={handleMultipleFileChange} style={inputStyle} accept="image/*" />
            
            {/* Show count of currently active slider images */}
            <div style={{marginTop: '15px', padding: '10px', background: '#fff', borderRadius: '4px', border: '1px dashed #93c5fd'}}>
                <strong>Currently Live:</strong> {preview.factorySliderImages ? preview.factorySliderImages.length : 0} Images
                
                <div style={{marginTop: '10px'}}>
                   <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold'}}>
                      <input type="checkbox" checked={clearSlider} onChange={(e) => setClearSlider(e.target.checked)} />
                      Delete all old slider images and start fresh?
                   </label>
                </div>
            </div>
        </div>

        <h3 style={{ marginTop: '20px', marginBottom: '15px', color: '#111827' }}>Why Retailers Trust Us (Badges)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={cardStyle}>
            <h4>Badge 1 (4900+)</h4>
            {preview.badge1 && <img src={preview.badge1} alt="Preview" style={{ height: '40px', marginBottom: '10px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'badge1')} style={inputStyle} accept="image/*" />
            </div>
            <div style={cardStyle}>
            <h4>Badge 2 (BIS)</h4>
            {preview.badge2 && <img src={preview.badge2} alt="Preview" style={{ height: '40px', marginBottom: '10px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'badge2')} style={inputStyle} accept="image/*" />
            </div>
            <div style={cardStyle}>
            <h4>Badge 3 (20+ Yrs)</h4>
            {preview.badge3 && <img src={preview.badge3} alt="Preview" style={{ height: '40px', marginBottom: '10px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'badge3')} style={inputStyle} accept="image/*" />
            </div>
            <div style={cardStyle}>
            <h4>Badge 4 (Factory Direct)</h4>
            {preview.badge4 && <img src={preview.badge4} alt="Preview" style={{ height: '40px', marginBottom: '10px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'badge4')} style={inputStyle} accept="image/*" />
            </div>
        </div>

        <h3 style={{ marginTop: '20px', marginBottom: '15px', color: '#111827' }}>Inside Bafna Toys Factory (Static 3 Images)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div style={{ ...cardStyle, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <h4>Manufacturing Unit</h4>
            {preview.manufacturingUnit && <img src={preview.manufacturingUnit} alt="Preview" style={{ height: '80px', objectFit: 'cover', marginBottom: '10px', borderRadius: '4px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'manufacturingUnit')} style={inputStyle} accept="image/*" />
            </div>
            <div style={{ ...cardStyle, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <h4>Packing & Dispatch</h4>
            {preview.packingDispatch && <img src={preview.packingDispatch} alt="Preview" style={{ height: '80px', objectFit: 'cover', marginBottom: '10px', borderRadius: '4px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'packingDispatch')} style={inputStyle} accept="image/*" />
            </div>
            <div style={{ ...cardStyle, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <h4>Warehouse Storage</h4>
            {preview.warehouseStorage && <img src={preview.warehouseStorage} alt="Preview" style={{ height: '80px', objectFit: 'cover', marginBottom: '10px', borderRadius: '4px' }} />}
            <input type="file" onChange={(e) => handleFileChange(e, 'warehouseStorage')} style={inputStyle} accept="image/*" />
            </div>
        </div>

        <h3 style={{ marginTop: '20px', marginBottom: '15px', color: '#111827' }}>Bottom Factory Banner</h3>
        <div style={{ ...cardStyle, background: '#e0f2fe', borderColor: '#bae6fd' }}>
          <h4>Main Factory Background Image</h4>
          {preview.factoryImage && <img src={preview.factoryImage} alt="Preview" style={{ height: '100px', objectFit: 'contain', marginBottom: '10px' }} />}
          <input type="file" onChange={(e) => handleFileChange(e, 'factoryImage')} style={inputStyle} accept="image/*" />
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ 
            padding: '12px 24px', background: '#ff2a75', color: 'white', border: 'none', 
            borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: '20px'
          }}
        >
          {loading ? 'Uploading & Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};

export default TrustSettingsAdmin;