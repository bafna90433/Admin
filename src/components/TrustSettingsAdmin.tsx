import React, { useState, useEffect } from 'react';
import api from '../utils/api'; 
import '../styles/TrustSettingsAdmin.css'; 

const TrustSettingsAdmin = () => {
  const [images, setImages] = useState<any>({
    factoryImage: null, manufacturingUnit: null, packingDispatch: null, warehouseStorage: null,
    factorySliderImages: [],
    amazonLogo: null, flipkartLogo: null, meeshoLogo: null, makeInIndiaLogo: null
  });
  
  const [localPreviews, setLocalPreviews] = useState<any>({});
  const [clearSlider, setClearSlider] = useState(false);
  const [retailerCount, setRetailerCount] = useState("49,000+");
  const [socialLinks, setSocialLinks] = useState({ youtube: '', instagram: '', facebook: '', linkedin: '' });
  const [storeLinks, setStoreLinks] = useState({ amazon: '', flipkart: '', meesho: '' });
  const [reviews, setReviews] = useState<any[]>([{ text: '', name: '', existingImage: '', file: null, localPreview: '' }]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>({}); 

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/trust-settings');
      setPreview(res.data || {});
      if (res.data) {
        if (res.data.retailerCount) setRetailerCount(res.data.retailerCount);
        
        setSocialLinks({
          youtube: res.data.youtubeLink || '', instagram: res.data.instagramLink || '',
          facebook: res.data.facebookLink || '', linkedin: res.data.linkedinLink || ''
        });

        setStoreLinks({
          amazon: res.data.amazonLink || '', flipkart: res.data.flipkartLink || '', meesho: res.data.meeshoLink || ''
        });

        if (res.data.customerReviews?.length > 0) {
          setReviews(res.data.customerReviews.map((r: any) => ({
            text: r.reviewText, name: r.reviewerName, existingImage: r.image, file: null, localPreview: ''
          })));
        }
      }
      setClearSlider(false);
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImages({ ...images, [field]: file });
      setLocalPreviews({ ...localPreviews, [field]: URL.createObjectURL(file) });
    }
  };

  const removeImage = (field: string) => {
    setImages({ ...images, [field]: null });
    setLocalPreviews({ ...localPreviews, [field]: null });
    setPreview({ ...preview, [field]: null });
  };

  // ✅ Multiple Slider Images Handle
  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const currentFiles = images.factorySliderImages || [];
      const currentPreviews = localPreviews.factorySliderImages || [];

      // Combine previous un-saved selections with new ones
      setImages({ ...images, factorySliderImages: [...currentFiles, ...filesArray] });
      
      const previewsArray = filesArray.map(file => URL.createObjectURL(file));
      setLocalPreviews({ ...localPreviews, factorySliderImages: [...currentPreviews, ...previewsArray] });
    }
  };

  // ✅ NAYA: Individual Slider Image Delete Function
  const removeSliderImage = (index: number, isLocal: boolean) => {
    if (isLocal) {
      // Nayi select ki hui image delete karein
      const newFiles = [...(images.factorySliderImages || [])];
      newFiles.splice(index, 1);

      const newPreviews = [...(localPreviews.factorySliderImages || [])];
      newPreviews.splice(index, 1);

      setImages({ ...images, factorySliderImages: newFiles });
      setLocalPreviews({ ...localPreviews, factorySliderImages: newPreviews });
    } else {
      // Purani database wali image delete karein
      const newDbPreviews = [...(preview.factorySliderImages || [])];
      newDbPreviews.splice(index, 1);
      setPreview({ ...preview, factorySliderImages: newDbPreviews });
    }
  };

  const addReviewField = () => { setReviews([...reviews, { text: '', name: '', existingImage: '', file: null, localPreview: '' }]); };
  const removeReviewField = (index: number) => { setReviews(reviews.filter((_, i) => i !== index)); };
  
  const updateReview = (index: number, field: string, value: any) => {
    const newReviews = [...reviews];
    newReviews[index][field] = value;
    setReviews(newReviews);
  };

  const handleReviewFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newReviews = [...reviews];
      newReviews[index].file = file;
      newReviews[index].localPreview = URL.createObjectURL(file);
      setReviews(newReviews);
    }
  };

  const removeReviewImage = (index: number) => {
    const newReviews = [...reviews];
    newReviews[index].file = null;
    newReviews[index].localPreview = '';
    newReviews[index].existingImage = '';
    setReviews(newReviews);
  };

  const handleSave = async () => {
    setLoading(true);
    const formData = new FormData();
    
    formData.append('retailerCount', retailerCount);
    formData.append('youtubeLink', socialLinks.youtube); formData.append('instagramLink', socialLinks.instagram);
    formData.append('facebookLink', socialLinks.facebook); formData.append('linkedinLink', socialLinks.linkedin);
    formData.append('amazonLink', storeLinks.amazon); formData.append('flipkartLink', storeLinks.flipkart);
    formData.append('meeshoLink', storeLinks.meesho);
    formData.append('clearSlider', clearSlider.toString());

    // ✅ NAYA: Jo purani images delete NAHI hui hain unko bhejein
    formData.append('retainedSliderImages', JSON.stringify(preview.factorySliderImages || []));

    const fileFields = ['factoryImage', 'manufacturingUnit', 'packingDispatch', 'warehouseStorage', 'amazonLogo', 'flipkartLogo', 'meeshoLogo', 'makeInIndiaLogo'];
    fileFields.forEach(field => {
      if (images[field]) formData.append(field, images[field]);
    });
    
    if (images.factorySliderImages?.length > 0) {
        images.factorySliderImages.forEach((file: File) => formData.append('factorySliderImages', file));
    }

    const reviewsData = reviews.map(r => ({ text: r.text, name: r.name, hasNewImage: !!r.file, existingImage: r.existingImage }));
    formData.append('reviewsData', JSON.stringify(reviewsData));
    reviews.forEach(r => { if (r.file) formData.append('reviewImages', r.file); });

    try {
      await api.put('/trust-settings', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Settings & Images Updated Successfully!');
      setImages({ ...images, factorySliderImages: [], amazonLogo: null, flipkartLogo: null, meeshoLogo: null, makeInIndiaLogo: null }); 
      setLocalPreviews({});
      fetchSettings(); 
    } catch (error) {
      console.error(error);
      alert('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const renderImageUploader = (field: string, label: string) => {
    const displayUrl = localPreviews[field] || preview[field];
    return (
      <div className="ts-input-group">
        <h4>{label}</h4>
        {displayUrl ? (
          <div className="ts-preview-box">
            <img src={displayUrl} alt={label} className="ts-preview-img" />
            <button type="button" className="ts-remove-btn" onClick={() => removeImage(field)}>✕</button>
          </div>
        ) : (
          <input type="file" onChange={(e) => handleFileChange(e, field)} className="ts-file-input" accept="image/*" />
        )}
      </div>
    );
  };

  return (
    <div className="ts-admin-wrapper">
      <h2 className="ts-header">Manage Trust & Footer Settings</h2>
      
      <h3 className="ts-section-title">Marketplace Links & Logos</h3>
      <div className="ts-card ts-bg-blue ts-grid-3">
          <div>
              <h4>Amazon Link</h4>
              <input type="text" placeholder="https://..." value={storeLinks.amazon} onChange={(e) => setStoreLinks({...storeLinks, amazon: e.target.value})} className="ts-input" style={{marginBottom: '10px'}} />
              {renderImageUploader('amazonLogo', 'Amazon Logo')}
          </div>
          <div>
              <h4>Flipkart Link</h4>
              <input type="text" placeholder="https://..." value={storeLinks.flipkart} onChange={(e) => setStoreLinks({...storeLinks, flipkart: e.target.value})} className="ts-input" style={{marginBottom: '10px'}} />
              {renderImageUploader('flipkartLogo', 'Flipkart Logo')}
          </div>
          <div>
              <h4>Meesho Link</h4>
              <input type="text" placeholder="https://..." value={storeLinks.meesho} onChange={(e) => setStoreLinks({...storeLinks, meesho: e.target.value})} className="ts-input" style={{marginBottom: '10px'}} />
              {renderImageUploader('meeshoLogo', 'Meesho Logo')}
          </div>
      </div>

      <h3 className="ts-section-title">Make In India Logo</h3>
      <div className="ts-card">{renderImageUploader('makeInIndiaLogo', 'Upload "Make in India" Badge')}</div>

      <h3 className="ts-section-title">Social Media Links (Footer)</h3>
      <div className="ts-card ts-bg-green ts-grid-2">
          <div className="ts-input-group"><h4>YouTube</h4><input type="text" value={socialLinks.youtube} onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})} className="ts-input" /></div>
          <div className="ts-input-group"><h4>Instagram</h4><input type="text" value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} className="ts-input" /></div>
          <div className="ts-input-group"><h4>Facebook</h4><input type="text" value={socialLinks.facebook} onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})} className="ts-input" /></div>
          <div className="ts-input-group"><h4>LinkedIn</h4><input type="text" value={socialLinks.linkedin} onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})} className="ts-input" /></div>
      </div>

      <h3 className="ts-section-title">Trust Banner Stats</h3>
      <div className="ts-card ts-bg-yellow">
          <div className="ts-input-group">
            <h4>Professional Retailers Count</h4>
            <input type="text" value={retailerCount} onChange={(e) => setRetailerCount(e.target.value)} className="ts-input" />
          </div>
      </div>

      <h3 className="ts-section-title">All Toys BIS Certified (Main Banner)</h3>
      <div className="ts-card ts-bg-blue">{renderImageUploader('factoryImage', 'Upload Main Banner Image')}</div>

      {/* ✅ Slider Preview Block with Individual Deletes */}
      <h3 className="ts-section-title">Coimbatore Factory: Live Facility Feed (Slider)</h3>
      <div className="ts-card ts-bg-gray">
          <input type="file" multiple onChange={handleMultipleFileChange} className="ts-file-input" accept="image/*" />
          
          <div className="ts-slider-gallery">
            {/* DB Images Render */}
            {preview.factorySliderImages?.map((src: string, i: number) => (
              <div key={`db-${i}`} className="ts-slider-thumb">
                <img src={src} alt={`DB Slide ${i}`} />
                <button type="button" className="ts-remove-btn" onClick={() => removeSliderImage(i, false)}>✕</button>
              </div>
            ))}
            
            {/* Local Unsaved Images Render */}
            {localPreviews.factorySliderImages?.map((src: string, i: number) => (
              <div key={`loc-${i}`} className="ts-slider-thumb">
                <img src={src} alt={`New Slide ${i}`} />
                <button type="button" className="ts-remove-btn" onClick={() => removeSliderImage(i, true)}>✕</button>
              </div>
            ))}
          </div>

          <div style={{marginTop: '15px'}}>
             <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#dc2626', fontWeight: 'bold'}}>
                <input type="checkbox" checked={clearSlider} onChange={(e) => setClearSlider(e.target.checked)} /> Delete all old slider images?
             </label>
          </div>
      </div>

      <h3 className="ts-section-title">Inside Factory Images</h3>
      <div className="ts-card ts-grid-3">
          {renderImageUploader('manufacturingUnit', 'Manufacturing Unit')}
          {renderImageUploader('packingDispatch', 'Packing & Dispatch')}
          {renderImageUploader('warehouseStorage', 'Warehouse Storage')}
      </div>

      <h3 className="ts-section-title">Customer Reviews</h3>
      <div className="ts-card ts-bg-purple">
        {reviews.map((review, index) => {
          const displayUrl = review.localPreview || review.existingImage;
          return (
          <div key={index} className="ts-review-row">
            <div className="ts-review-header">
              <strong style={{ color: '#6b21a8' }}>Review #{index + 1}</strong>
              <button onClick={() => removeReviewField(index)} className="ts-btn-danger">Remove</button>
            </div>

            <div className="ts-grid-3">
              <div>
                <label className="ts-label">Review Image</label>
                {displayUrl ? (
                  <div className="ts-preview-box" style={{height: '80px'}}>
                    <img src={displayUrl} alt="Review" className="ts-preview-img" />
                    <button type="button" className="ts-remove-btn" onClick={() => removeReviewImage(index)}>✕</button>
                  </div>
                ) : (
                  <input type="file" onChange={(e) => handleReviewFileChange(index, e)} className="ts-file-input" accept="image/*" />
                )}
              </div>
              <div>
                <label className="ts-label">Review Text</label>
                <textarea value={review.text} onChange={(e) => updateReview(index, 'text', e.target.value)} className="ts-textarea" placeholder='"Crisp and refreshing!..."' />
              </div>
              <div>
                <label className="ts-label">Reviewer Name</label>
                <input type="text" value={review.name} onChange={(e) => updateReview(index, 'name', e.target.value)} className="ts-input" placeholder="e.g. Aarav Mehta" />
              </div>
            </div>
          </div>
        )})}

        <button onClick={addReviewField} className="ts-btn-add">+ Add New Review</button>
      </div>

      <button onClick={handleSave} disabled={loading} className="ts-btn-primary">
        {loading ? 'Saving Changes...' : 'Save All Settings'}
      </button>

    </div>
  );
};

export default TrustSettingsAdmin;