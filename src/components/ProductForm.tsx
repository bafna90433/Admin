import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiX, FiUpload, FiSave } from "react-icons/fi";
import api from "../utils/api";
import "../styles/ProductForm.css";

interface Category {
  _id: string;
  name: string;
}

interface ProductOption {
  _id: string;
  name: string;
}

interface ProductPayload {
  name: string;
  sku: string;
  mrp: number;
  price: number;
  description: string;
  category: string;
  images: string[];
  tagline?: string; // ✅ Tagline field added
  packSize?: string; // ✅ Pack Size field added
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

  const [form, setForm] = useState({
    name: "",
    sku: "",
    mrp: "",
    price: "",
    description: "",
    tagline: "", // ✅ Added tagline
    packSize: "", // ✅ Added pack size
    category: "",
  });

  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          api.get("/categories"),
          api.get("/products"),
        ]);
        setCategories(categoriesRes.data);
        setProducts(productsRes.data);

        if (editMode && id) {
          const productRes = await api.get(`/products/${id}`);
          const data = productRes.data;

          setForm({
            name: data.name,
            sku: data.sku || "",
            mrp: data.mrp?.toString() || "",
            price: data.price?.toString() || "",
            description: data.description || "",
            tagline: data.tagline || "", // ✅ Load tagline
            packSize: data.packSize || "", // ✅ Load pack size
            category: typeof data.category === "string" ? data.category : data.category?._id || "",
          });

          setGallery(
            data.images?.map((url: string) => ({ url, isExisting: true })) || []
          );

          if (Array.isArray(data.relatedProducts)) {
            setRelatedProducts(data.relatedProducts.map((p: any) => p._id || p));
          }
        }
      } catch (err) {
        setError("Failed to load data.");
      }
    };
    fetchData();
  }, [editMode, id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRelatedChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setRelatedProducts(values);
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
    setError(null);
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
        tagline: form.tagline.trim() || undefined, // ✅ Include tagline
        packSize: form.packSize.trim() || undefined, // ✅ Include pack size
        category: form.category,
        images: [...gallery.filter((g) => g.isExisting).map((g) => g.url), ...uploadedUrls],
        relatedProducts,
      };

      if (editMode && id) {
        await api.put(`/products/${id}`, payload);
        setSuccess("Product updated successfully");
      } else {
        await api.post("/products", payload);
        setSuccess("Product created successfully");
        setTimeout(() => navigate("/admin/products"), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Error saving product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

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

            {/* ✅ Tagline Field */}
            <div className="form-group">
              <label>Tagline / Short Note (Optional)</label>
              <input 
                type="text" 
                name="tagline" 
                value={form.tagline} 
                onChange={handleChange} 
                placeholder="e.g., Premium Quality, Best Seller, etc."
              />
            </div>

            {/* ✅ Pack Size Field */}
            <div className="form-group">
              <label>Pack Size / Unit Info (Optional)</label>
              <input 
                type="text" 
                name="packSize" 
                value={form.packSize} 
                onChange={handleChange} 
                placeholder="e.g., Per Packet: 3 Pcs, 100ml, 500g, etc."
              />
            </div>

            {/* ✅ Pricing Row */}
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
        
        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="cancel-btn">Cancel</button>
          <button type="submit" className="save-btn" disabled={loading}>
            <FiSave /> {loading ? "Saving..." : (editMode ? "Update" : "Create")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;