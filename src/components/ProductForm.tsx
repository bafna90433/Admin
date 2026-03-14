import React, { useEffect, useState, useRef, ChangeEvent, FormEvent } from "react"; // ✅ useRef added
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2"; 
import { FiX, FiUpload, FiSave, FiSearch, FiPlus, FiList, FiImage, FiTrash, FiBox, FiLink, FiPackage, FiStar, FiMove } from "react-icons/fi"; // ✅ FiMove added for drag icon
import axios from "axios"; 
import "../styles/ProductForm.css";

const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

interface Category {
  _id: string;
  name: string;
}

interface ProductOption {
  _id: string;
  name: string;
  sku?: string;
  images?: string[];
}

interface RelatedProductDisplay {
  _id: string;
  name: string;
  image?: string;
  sku?: string;
}

interface ProductPayload {
  name: string;
  sku: string;
  mrp: number;
  price: number;
  stock: number;
  unit: string;
  description: string;
  category: string;
  images: string[];
  tagline?: string;
  packSize?: string;
  relatedProducts?: string[];
}

type GalleryImage = {
  file?: File;
  url: string;
  isExisting: boolean;
};

const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editMode = Boolean(id);

  // Form State
  const [form, setForm] = useState({
    name: "",
    sku: "",
    mrp: "",
    price: "",
    stock: "",
    unit: "", 
    description: "",
    tagline: "",
    packSize: "",
    category: "",
  });

  // Data States
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Related Products State
  const [relatedDisplay, setRelatedDisplay] = useState<RelatedProductDisplay[]>([]);
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedResults, setRelatedResults] = useState<ProductOption[]>([]);
    
  // UI States
  const [loading, setLoading] = useState(false);

  // Main Search State (Toolbar)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ✅ Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesRes = await axios.get(`${API_BASE}/categories`);
        setCategories(categoriesRes.data);

        if (editMode && id) {
          const productRes = await axios.get(`${API_BASE}/products/${id}`);
          const data = productRes.data;

          setForm({
            name: data.name,
            sku: data.sku || "",
            mrp: data.mrp?.toString() || "",
            price: data.price?.toString() || "",
            stock: data.stock?.toString() || "0",
            unit: data.unit || "", 
            description: data.description || "",
            tagline: data.tagline || "",
            packSize: data.packSize || "",
            category: typeof data.category === "string" ? data.category : data.category?._id || "",
          });

          setGallery(
            (data.images || []).map((img: any) => ({
              url: typeof img === "string" ? img : img.url,
              isExisting: true,
            }))
          );

          if (Array.isArray(data.relatedProducts)) {
             setRelatedDisplay(data.relatedProducts.map((p: any) => ({
                _id: p._id || p, 
                name: p.name || "Unknown Product",
                image: p.images?.[0] || "",
                sku: p.sku
             })));
          }
        } else {
            setForm({
                name: "", sku: "", mrp: "", price: "", stock: "", unit: "", 
                description: "", tagline: "", packSize: "", category: "",
            });
            setGallery([]);
            setRelatedDisplay([]);
        }
      } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load product data.'
        });
      }
    };
    fetchData();
  }, [editMode, id]);

  const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      try {
        const res = await axios.get(`${API_BASE}/products/search/all?query=${query}`);
        setSearchResults(res.data);
        setShowResults(true);
      } catch (err) { console.error("Search failed"); }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const selectProduct = (prodId: string) => {
    setSearchQuery("");
    setShowResults(false);
    navigate(`/admin/products/edit/${prodId}`);
  };

  const handleRelatedSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setRelatedQuery(query);
    
    if (query.length > 1) {
        try {
            const res = await axios.get(`${API_BASE}/products/search/all?query=${query}`);
            const filtered = res.data.filter((p: ProductOption) => 
                p._id !== id && !relatedDisplay.some(r => r._id === p._id)
            );
            setRelatedResults(filtered);
        } catch (err) { console.error("Related search failed"); }
    } else {
        setRelatedResults([]);
    }
  };

  const addRelatedProduct = (product: ProductOption) => {
    setRelatedDisplay(prev => [...prev, {
        _id: product._id,
        name: product.name,
        image: product.images?.[0],
        sku: product.sku
    }]);
    setRelatedQuery("");
    setRelatedResults([]);
  };

  const removeRelatedProduct = (prodId: string) => {
    setRelatedDisplay(prev => prev.filter(p => p._id !== prodId));
  };

  const handleAddNew = () => navigate("/admin/products/new");

  const handleDelete = async () => {
    if (!id) return;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        Swal.fire({ title: 'Deleting...', didOpen: () => Swal.showLoading() });
        await axios.delete(`${API_BASE}/products/${id}`);
        await Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
        navigate("/admin/products/new");
        setForm({ name: "", sku: "", mrp: "", price: "", stock: "", unit: "", description: "", tagline: "", packSize: "", category: "" });
        setGallery([]);
        setRelatedDisplay([]);
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Failed', text: err.message });
      } finally { setLoading(false); }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGalleryFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 10 - gallery.length);
    const images = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isExisting: false,
    }));
    setGallery((g) => [...g, ...images]);
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    if (!gallery[idx].isExisting) URL.revokeObjectURL(gallery[idx].url);
    setGallery((g) => g.filter((_, i) => i !== idx));
  };

  const setMainImage = (idx: number) => {
    if (idx === 0) return; 
    setGallery((prev) => {
      const updatedGallery = [...prev];
      const [selectedImg] = updatedGallery.splice(idx, 1);
      updatedGallery.unshift(selectedImg); 
      return updatedGallery;
    });
  };

  // ✅ NEW FUNCTION: Handle Drag and Drop Sorting
  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const _gallery = [...gallery];
      // Dragged item ko nikalna aur nayi jagah par insert karna
      const draggedItemContent = _gallery.splice(dragItem.current, 1)[0];
      _gallery.splice(dragOverItem.current, 0, draggedItemContent);
      setGallery(_gallery);
    }
    // Reset Refs
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    Swal.fire({ title: editMode ? 'Updating...' : 'Creating...', didOpen: () => Swal.showLoading() });

    try {
      if (!form.name.trim() || !form.sku.trim() || !form.category || !form.price) 
        throw new Error("Required fields are missing");
      if (!gallery.length) throw new Error("At least one image is required");

      const newImages = gallery.filter((g) => !g.isExisting && g.file);
      let uploadedUrls: string[] = [];
      
      if (newImages.length) {
        const formData = new FormData();
        newImages.forEach((g) => g.file && formData.append("images", g.file));
        const res = await axios.post(`${API_BASE}/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        uploadedUrls = res.data.urls;
      }

      const finalImagesOrder: string[] = [];
      let uploadIndex = 0;
      
      for (const img of gallery) {
        if (img.isExisting) {
            finalImagesOrder.push(img.url);
        } else {
            finalImagesOrder.push(uploadedUrls[uploadIndex]);
            uploadIndex++;
        }
      }

      const payload: ProductPayload = {
        name: form.name,
        sku: form.sku,
        mrp: Number(form.mrp) || 0,
        price: Number(form.price),
        stock: Number(form.stock) || 0,
        unit: form.unit, 
        description: form.description,
        tagline: form.tagline.trim() || undefined,
        packSize: form.packSize.trim() || undefined,
        category: form.category,
        images: finalImagesOrder, 
        relatedProducts: relatedDisplay.map(p => p._id),
      };

      if (editMode && id) {
        await axios.put(`${API_BASE}/products/${id}`, payload);
        await Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false });
      } else {
        const res = await axios.post(`${API_BASE}/products`, payload);
        await Swal.fire({ icon: 'success', title: 'Created!', timer: 1500, showConfirmButton: false });
        const newId = res.data._id || res.data.id || res.data.product?._id; 
        if (newId) navigate(`/admin/products/edit/${newId}`);
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || "Error saving product." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      
      {/* Admin Toolbar */}
      <div className="admin-toolbar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Search Product (Name/SKU)..." value={searchQuery} onChange={handleSearch} />
          {showResults && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((prod) => (
                <div key={prod._id} className="search-item" onClick={() => selectProduct(prod._id)}>
                  <div className="s-thumb-container">
                    {prod.images && prod.images.length > 0 ? <img src={prod.images[0]} alt={prod.name} className="s-thumb" /> : <FiImage />}
                  </div>
                  <div className="search-info"><span className="s-name">{prod.name}</span><span className="s-sku">{prod.sku}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate("/admin/products")}><FiList /> List</button>
          <button type="button" className="btn-primary" onClick={handleAddNew}><FiPlus /> New</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          
          {/* Main Details */}
          <div className="form-card primary">
            <h2 className="section-title">Product Information</h2>
            
            <div className="form-group">
              <label>Product Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required />
            </div>
            
            <div className="form-grid-2">
                <div className="form-group">
                <label>SKU *</label>
                <input type="text" name="sku" value={form.sku} onChange={handleChange} required />
                </div>
                <div className="form-group">
                <label>Category *</label>
                <select name="category" value={form.category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                </select>
                </div>
            </div>

            <div className="form-grid-2">
                <div className="form-group">
                <label>Tagline</label>
                <input type="text" name="tagline" value={form.tagline} onChange={handleChange} placeholder="e.g., Best Seller" />
                </div>
                <div className="form-group">
                <label>Pack Size</label>
                <input type="text" name="packSize" value={form.packSize} onChange={handleChange} placeholder="e.g., 3 Pcs/Pkt" />
                </div>
            </div>

            <div className="pricing-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>MRP (₹)</label>
                <input type="number" name="mrp" value={form.mrp} onChange={handleChange} placeholder="0" />
              </div>
              <div className="form-group">
                <label>Selling Price (₹) *</label>
                <input type="number" name="price" value={form.price} onChange={handleChange} required placeholder="0" />
              </div>
              <div className="form-group stock-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiBox /> Stock</label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="Qty" />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FiPackage /> Unit</label>
                <input 
                  type="text" 
                  name="unit" 
                  value={form.unit} 
                  onChange={handleChange} 
                  placeholder="e.g. Packet, Box" 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} required />
            </div>
          </div>

          <div className="side-column">
            {/* Image Upload */}
            <div className="form-card secondary">
                <h2 className="section-title">Images (Drag to Sort)</h2> {/* ✅ Added context to title */}
                <div className="file-upload">
                <label>
                    <FiUpload /> Click to upload
                    <input type="file" multiple accept="image/*" onChange={handleGalleryFiles} style={{ display: "none" }} />
                </label>
                </div>
                
                <div className="image-preview-grid">
                {gallery.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="image-preview" 
                      draggable // ✅ Make it draggable
                      onDragStart={() => (dragItem.current = idx)} // ✅ When drag starts
                      onDragEnter={() => (dragOverItem.current = idx)} // ✅ When dragged over another item
                      onDragEnd={handleSort} // ✅ When drop is completed
                      onDragOver={(e) => e.preventDefault()} // ✅ Required to allow dropping
                      style={{ 
                        position: 'relative', 
                        overflow: 'hidden', 
                        border: idx === 0 ? '2px solid #3b82f6' : '1px solid #ddd',
                        cursor: 'grab' // ✅ Show grab cursor
                      }}
                    >
                    
                    <img src={img.url} alt="Preview" style={{ pointerEvents: 'none' }} /> {/* Disable pointer events on img so drag works smoothly */}
                    
                    {/* Badge for Main Image */}
                    {idx === 0 && (
                        <div style={{ position: 'absolute', top: '4px', left: '4px', background: '#3b82f6', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', pointerEvents: 'none' }}>
                           <FiStar size={10} /> Main
                        </div>
                    )}

                    {/* Drag Icon Indicator */}
                    <div style={{ position: 'absolute', top: '4px', right: '30px', color: 'white', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px', display: 'flex', pointerEvents: 'none' }}>
                       <FiMove size={12} />
                    </div>
                    
                    {/* Button to Make Main (shown only on gallery images) */}
                    {idx !== 0 && (
                        <button type="button" onClick={() => setMainImage(idx)} style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', fontSize: '10px', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer' }}>
                            Set Main
                        </button>
                    )}

                    <button type="button" onClick={() => removeImage(idx)} className="remove-btn" style={{ zIndex: 10 }}><FiX /></button>
                    </div>
                ))}
                </div>
            </div>

            {/* Related Products Card */}
            <div className="form-card secondary related-card">
                <h2 className="section-title" style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <FiLink /> Related Products
                </h2>
                
                <div className="related-search-wrapper" style={{ position: 'relative', marginBottom: '15px' }}>
                    <input type="text" placeholder="Search to add..." value={relatedQuery} onChange={handleRelatedSearch} className="related-search-input" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    {relatedResults.length > 0 && (
                        <div className="related-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            {relatedResults.map(p => (
                                <div key={p._id} onClick={() => addRelatedProduct(p)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />}
                                    <div style={{ fontSize: '0.9rem' }}>{p.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="related-list">
                    {relatedDisplay.length === 0 ? (
                        <p style={{ color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>No related products added.</p>
                    ) : (
                        relatedDisplay.map(p => (
                            <div key={p._id} className="related-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: '#f8f9fa', borderRadius: '6px', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {p.image ? (
                                        <img src={p.image} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                                    ) : (
                                        <div style={{ width: '32px', height: '32px', background: '#eee', borderRadius: '4px' }} />
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{p.name}</span>
                                        {p.sku && <span style={{ fontSize: '0.7rem', color: '#666' }}>{p.sku}</span>}
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeRelatedProduct(p._id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <FiX />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>

        </div>
        
        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="cancel-btn">Cancel</button>
          {editMode && <button type="button" onClick={handleDelete} className="delete-btn"><FiTrash /> Delete</button>}
          <button type="submit" className="save-btn" disabled={loading}><FiSave /> {loading ? "Saving..." : (editMode ? "Update" : "Create")}</button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;