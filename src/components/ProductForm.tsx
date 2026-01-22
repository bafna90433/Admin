import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
// ✅ Import SweetAlert2
import Swal from "sweetalert2"; 
import { FiX, FiUpload, FiSave, FiSearch, FiPlus, FiList, FiImage, FiTrash } from "react-icons/fi";
import api from "../utils/api";
import "../styles/ProductForm.css";

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

interface ProductPayload {
  name: string;
  sku: string;
  mrp: number;
  price: number;
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
    description: "",
    tagline: "",
    packSize: "",
    category: "",
  });

  // Data States
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<string[]>([]);
   
  // UI States
  const [loading, setLoading] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesRes = await api.get("/categories");
        setCategories(categoriesRes.data);

        if (editMode && id) {
          const productRes = await api.get(`/products/${id}`);
          const data = productRes.data;

          setForm({
            name: data.name,
            sku: data.sku || "",
            mrp: data.mrp?.toString() || "",
            price: data.price?.toString() || "",
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
            setRelatedProducts(data.relatedProducts.map((p: any) => p._id || p));
          }
        } else {
            // ✅ RESET FORM if in New Mode (handles delete -> new transition)
            setForm({
                name: "", sku: "", mrp: "", price: "", description: "",
                tagline: "", packSize: "", category: "",
            });
            setGallery([]);
            setRelatedProducts([]);
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

  // Search Logic
  const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 1) {
      try {
        const res = await api.get(`/products/search/all?query=${query}`);
        setSearchResults(res.data);
        setShowResults(true);
      } catch (err) {
        console.error("Search failed");
      }
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

  const handleAddNew = () => {
    navigate("/admin/products/new");
  };

  // ✅ UPDATED DELETE HANDLER
  const handleDelete = async () => {
    if (!id) return;

    // 1. Confirm Dialog
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
        // Show loading state
        Swal.fire({
            title: 'Deleting...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        await api.delete(`/products/${id}`);

        // 2. Success Dialog
        await Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Product deleted. Ready for new entry.',
            timer: 1500,
            showConfirmButton: false
        });

        // 3. ✅ NAVIGATE TO NEW (Stay on form)
        navigate("/admin/products/new");
        
        // Manual Reset (Double check to ensure UI clears)
        setForm({
            name: "", sku: "", mrp: "", price: "", description: "",
            tagline: "", packSize: "", category: "",
        });
        setGallery([]);
        setRelatedProducts([]);

      } catch (err: any) {
        Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: err.message || "Failed to delete product"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Handlers
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Show Loading Alert
    Swal.fire({
        title: editMode ? 'Updating Product...' : 'Creating Product...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
      if (!form.name.trim() || !form.sku.trim() || !form.category || !form.price) 
        throw new Error("Required fields are missing");
      if (!gallery.length) throw new Error("At least one image is required");

      const newImages = gallery.filter((g) => !g.isExisting && g.file);
      let uploadedUrls: string[] = [];
      
      if (newImages.length) {
        const formData = new FormData();
        newImages.forEach((g) => g.file && formData.append("images", g.file));
        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedUrls = res.data.urls;
      }

      const payload: ProductPayload = {
        name: form.name,
        sku: form.sku,
        mrp: Number(form.mrp) || 0,
        price: Number(form.price),
        description: form.description,
        tagline: form.tagline.trim() || undefined,
        packSize: form.packSize.trim() || undefined,
        category: form.category,
        images: [...gallery.filter((g) => g.isExisting).map((g) => g.url), ...uploadedUrls],
        relatedProducts,
      };

      if (editMode && id) {
        await api.put(`/products/${id}`, payload);
        
        await Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Product updated successfully',
            timer: 1500,
            showConfirmButton: false
        });

      } else {
        const res = await api.post("/products", payload);
        
        await Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Product created successfully!',
            timer: 1500,
            showConfirmButton: false
        });

        // Redirect to edit page of new product
        const newId = res.data._id || res.data.id || res.data.product?._id; 
        if (newId) navigate(`/admin/products/edit/${newId}`);
        else navigate("/admin/products");
      }
    } catch (err: any) {
      Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || "Error saving product."
      });
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
          <input 
            type="text" 
            placeholder="Search Product (Name/SKU)..." 
            value={searchQuery}
            onChange={handleSearch}
          />
          {showResults && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((prod) => (
                <div key={prod._id} className="search-item" onClick={() => selectProduct(prod._id)}>
                  <div className="s-thumb-container">
                    {prod.images && prod.images.length > 0 ? (
                      <img src={prod.images[0]} alt={prod.name} className="s-thumb" />
                    ) : (
                      <div className="s-thumb-placeholder"><FiImage /></div>
                    )}
                  </div>
                  <div className="search-info">
                    <span className="s-name">{prod.name}</span>
                    <span className="s-sku">{prod.sku}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="toolbar-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate("/admin/products")}>
            <FiList /> List
          </button>
          <button type="button" className="btn-primary" onClick={handleAddNew}>
            <FiPlus /> New
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          <div className="form-card primary">
            <h2 className="section-title">Product Information</h2>
            
            <div className="form-group">
              <label>Product Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required />
            </div>
            
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

            <div className="form-group">
              <label>Tagline / Short Note (Optional)</label>
              <input type="text" name="tagline" value={form.tagline} onChange={handleChange} placeholder="e.g., Premium Quality" />
            </div>

            <div className="form-group">
              <label>Pack Size / Unit Info (Optional)</label>
              <input type="text" name="packSize" value={form.packSize} onChange={handleChange} placeholder="e.g., 3 Pcs/Pkt" />
            </div>

            <div className="pricing-row">
              <div className="form-group">
                <label>MRP (₹)</label>
                <input type="number" name="mrp" value={form.mrp} onChange={handleChange} placeholder="Original Price" />
              </div>
              <div className="form-group">
                <label>Selling Price (₹) *</label>
                <input type="number" name="price" value={form.price} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} required />
            </div>
          </div>

          <div className="form-card secondary">
            <h2 className="section-title">Images</h2>
            <div className="file-upload">
              <label>
                <FiUpload /> Click to upload
                <input type="file" multiple accept="image/*" onChange={handleGalleryFiles} style={{ display: "none" }} />
              </label>
            </div>
            <div className="image-preview-grid">
              {gallery.map((img, idx) => (
                <div key={idx} className="image-preview">
                  <img src={img.url} alt="Preview" />
                  <button type="button" onClick={() => removeImage(idx)} className="remove-btn"><FiX /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="cancel-btn">Cancel</button>

          {editMode && (
            <button type="button" onClick={handleDelete} className="delete-btn">
              <FiTrash /> Delete
            </button>
          )}

          <button type="submit" className="save-btn" disabled={loading}>
            <FiSave /> {loading ? "Saving..." : (editMode ? "Update" : "Create")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;