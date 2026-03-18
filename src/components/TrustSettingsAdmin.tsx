import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  FiSettings, FiSave, FiImage, FiLink, FiStar, 
  FiTrash2, FiPlus, FiX, FiUploadCloud, FiAward, FiUsers
} from 'react-icons/fi';
import '../styles/AdminReviews.css'; // Using the same CSS for global classes

// CONFIGURATION (Same as AdminReviews)
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

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
      const res = await axios.get(`${API_BASE}/trust-settings`);
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
      Swal.fire("Error", "Could not load settings.", "error");
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

  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const currentFiles = images.factorySliderImages || [];
      const currentPreviews = localPreviews.factorySliderImages || [];

      setImages({ ...images, factorySliderImages: [...currentFiles, ...filesArray] });
      const previewsArray = filesArray.map(file => URL.createObjectURL(file));
      setLocalPreviews({ ...localPreviews, factorySliderImages: [...currentPreviews, ...previewsArray] });
    }
  };

  const removeSliderImage = (index: number, isLocal: boolean) => {
    if (isLocal) {
      const newFiles = [...(images.factorySliderImages || [])];
      newFiles.splice(index, 1);
      const newPreviews = [...(localPreviews.factorySliderImages || [])];
      newPreviews.splice(index, 1);
      setImages({ ...images, factorySliderImages: newFiles });
      setLocalPreviews({ ...localPreviews, factorySliderImages: newPreviews });
    } else {
      const newDbPreviews = [...(preview.factorySliderImages || [])];
      newDbPreviews.splice(index, 1);
      setPreview({ ...preview, factorySliderImages: newDbPreviews });
    }
  };

  const addReviewField = () => { setReviews([...reviews, { text: '', name: '', existingImage: '', file: null, localPreview: '' }]); };
  
  const removeReviewField = (index: number) => { 
    Swal.fire({
      title: "Remove Review?",
      text: "Are you sure you want to remove this review field?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Remove",
    }).then((result) => {
      if (result.isConfirmed) {
        setReviews(reviews.filter((_, i) => i !== index)); 
      }
    });
  };
  
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
      await axios.put(`${API_BASE}/trust-settings`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Swal.fire("Success", "Settings & Images Updated Successfully!", "success");
      setImages({ ...images, factorySliderImages: [], amazonLogo: null, flipkartLogo: null, meeshoLogo: null, makeInIndiaLogo: null }); 
      setLocalPreviews({});
      fetchSettings(); 
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to update settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderImageUploader = (field: string, label: string) => {
    const displayUrl = localPreviews[field] || preview[field];
    return (
      <div style={{ padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#475569', fontWeight: '600' }}>{label}</h4>
        {displayUrl ? (
          <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            <img src={displayUrl} alt={label} style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', backgroundColor: 'white', display: 'block' }} />
            <button type="button" onClick={() => removeImage(field)} style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <FiX size={14} />
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
            <button style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <FiUploadCloud /> Upload Image
            </button>
            <input type="file" onChange={(e) => handleFileChange(e, field)} accept="image/*" style={{ position: 'absolute', top: 0, left: 0, opacity: 0, cursor: 'pointer', height: '100%', width: '100%' }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-reviews-page">
      <div className="ar-container">
        
        {/* HEADER */}
        <header className="ar-header" style={{ position: 'sticky', top: '0', zIndex: 100, backgroundColor: '#f8fafc' }}>
          <div className="ar-header-content">
            <h1><FiSettings className="ar-brand-icon" /> Trust & Config Center</h1>
            <p>Manage store links, UI logos, and factory trust settings globally.</p>
          </div>
          <div className="ar-stats-card flex gap-4">
            <button 
              onClick={handleSave} 
              disabled={loading}
              style={{ backgroundColor: loading ? '#9ca3af' : '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}
            >
              {loading ? "Saving..." : <><FiSave size={18} /> Save All Settings</>}
            </button>
          </div>
        </header>

        {/* SECTION: LINKS & LOGOS */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiLink color="#3b82f6" /> Marketplace Links & Logos
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#475569' }}>Amazon URL</label>
                <input type="text" placeholder="https://amazon.in/..." value={storeLinks.amazon} onChange={(e) => setStoreLinks({...storeLinks, amazon: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '15px' }} />
                {renderImageUploader('amazonLogo', 'Amazon Logo')}
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#475569' }}>Flipkart URL</label>
                <input type="text" placeholder="https://flipkart.com/..." value={storeLinks.flipkart} onChange={(e) => setStoreLinks({...storeLinks, flipkart: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '15px' }} />
                {renderImageUploader('flipkartLogo', 'Flipkart Logo')}
            </div>
            <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#475569' }}>Meesho URL</label>
                <input type="text" placeholder="https://meesho.com/..." value={storeLinks.meesho} onChange={(e) => setStoreLinks({...storeLinks, meesho: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '15px' }} />
                {renderImageUploader('meeshoLogo', 'Meesho Logo')}
            </div>
          </div>
        </div>

        {/* SECTION: SOCIAL LINKS & STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
             <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <FiUsers color="#8b5cf6" /> Social Media Links (Footer)
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label style={{ fontSize: '0.9rem', color: '#475569' }}>YouTube</label><input type="text" value={socialLinks.youtube} onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '5px' }} /></div>
                <div><label style={{ fontSize: '0.9rem', color: '#475569' }}>Instagram</label><input type="text" value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '5px' }} /></div>
                <div><label style={{ fontSize: '0.9rem', color: '#475569' }}>Facebook</label><input type="text" value={socialLinks.facebook} onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '5px' }} /></div>
                <div><label style={{ fontSize: '0.9rem', color: '#475569' }}>LinkedIn</label><input type="text" value={socialLinks.linkedin} onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '5px' }} /></div>
             </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
             <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <FiAward color="#eab308" /> Trust Banner & Badge
             </h3>
             <div style={{ marginBottom: '20px' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#475569' }}>Professional Retailers Count</label>
               <input type="text" value={retailerCount} onChange={(e) => setRetailerCount(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold' }} />
             </div>
             {renderImageUploader('makeInIndiaLogo', 'Upload "Make in India" Badge')}
          </div>

        </div>

        {/* SECTION: FACTORY IMAGES */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiImage color="#f97316" /> Factory & Manufacturing Visuals
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
             {renderImageUploader('factoryImage', 'Main Banner (BIS Certified)')}
             {renderImageUploader('manufacturingUnit', 'Manufacturing Unit')}
             {renderImageUploader('packingDispatch', 'Packing & Dispatch')}
             {renderImageUploader('warehouseStorage', 'Warehouse Storage')}
          </div>

          {/* Slider Specific */}
          <div style={{ padding: '20px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h4 style={{ marginBottom: '15px', color: '#334155', fontWeight: 'bold' }}>Coimbatore Factory: Live Facility Feed (Slider)</h4>
            
            <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', marginBottom: '15px' }}>
              <button style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <FiUploadCloud /> Add Slider Images
              </button>
              <input type="file" multiple onChange={handleMultipleFileChange} accept="image/*" style={{ position: 'absolute', top: 0, left: 0, opacity: 0, cursor: 'pointer', height: '100%', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              {preview.factorySliderImages?.map((src: string, i: number) => (
                <div key={`db-${i}`} style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', width: '120px', height: '100px', backgroundColor: 'white' }}>
                  <img src={src} alt={`DB Slide ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeSliderImage(i, false)} style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={14}/></button>
                </div>
              ))}
              
              {localPreviews.factorySliderImages?.map((src: string, i: number) => (
                <div key={`loc-${i}`} style={{ position: 'relative', border: '2px dashed #10b981', borderRadius: '8px', overflow: 'hidden', width: '120px', height: '100px', backgroundColor: 'white' }}>
                  <img src={src} alt={`New Slide ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                  <button type="button" onClick={() => removeSliderImage(i, true)} style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={14}/></button>
                </div>
              ))}
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '15px', padding: '8px 12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="checkbox" checked={clearSlider} onChange={(e) => setClearSlider(e.target.checked)} style={{ cursor: 'pointer' }} /> 
              <FiTrash2 /> Delete all old slider images
            </label>
          </div>
        </div>

        {/* SECTION: CUSTOMER REVIEWS */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiStar color="#f59e0b" /> Static Customer Reviews
            </h3>
            <button onClick={addReviewField} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              <FiPlus /> Add Review
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {reviews.map((review, index) => {
              const displayUrl = review.localPreview || review.existingImage;
              return (
              <div key={index} style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', backgroundColor: '#f8fafc', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <strong style={{ color: '#475569', fontSize: '1.1rem' }}>Review #{index + 1}</strong>
                  <button onClick={() => removeReviewField(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                    <FiTrash2 /> Remove
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '20px' }}>
                  
                  {/* Review Image Block */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#475569' }}>User Image</label>
                    {displayUrl ? (
                      <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #cbd5e1', overflow: 'hidden' }}>
                        <img src={displayUrl} alt="Review" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => removeReviewImage(index)} style={{ position: 'absolute', top: '0', right: '0', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity='1'} onMouseLeave={(e) => e.currentTarget.style.opacity='0'}>
                          <FiTrash2 size={24}/>
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', overflow: 'hidden' }}>
                        <FiImage color="#94a3b8" size={24} />
                        <input type="file" onChange={(e) => handleReviewFileChange(index, e)} accept="image/*" style={{ position: 'absolute', top: 0, left: 0, opacity: 0, cursor: 'pointer', height: '100%', width: '100%' }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#475569' }}>Review Message</label>
                    <textarea value={review.text} onChange={(e) => updateReview(index, 'text', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', minHeight: '80px', resize: 'vertical' }} placeholder='"Amazing toys, great quality!..."' />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: '#475569' }}>Customer Name</label>
                    <input type="text" value={review.name} onChange={(e) => updateReview(index, 'name', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="e.g. Ramesh" />
                  </div>

                </div>
              </div>
            )})}
            
            {reviews.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No static reviews added yet.</p>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default TrustSettingsAdmin;