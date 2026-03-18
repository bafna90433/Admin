import React, { useEffect, useState, useRef, ChangeEvent, FormEvent, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  FiX, FiUpload, FiSave, FiSearch, FiPlus, FiList, FiImage,
  FiTrash2, FiBox, FiLink, FiPackage, FiStar, FiMove,
  FiChevronLeft, FiTag, FiHash, FiFileText,
  FiLayers, FiShield, FiKey, FiInfo, FiEye
} from "react-icons/fi";
import axios from "axios";
import "../styles/ProductForm.css";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (process as any).env?.VITE_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

interface Category { _id: string; name: string; }
interface ProductOption { _id: string; name: string; sku?: string; images?: string[]; }
interface RelatedProductDisplay { _id: string; name: string; image?: string; sku?: string; }

interface ProductPayload {
  name: string; sku: string; mrp: number; price: number;
  stock: number; unit: string; description: string;
  category: string; images: string[];
  tagline?: string; packSize?: string; relatedProducts?: string[];
}

type GalleryImage = { file?: File; url: string; isExisting: boolean; };

const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editMode = Boolean(id);

  const [form, setForm] = useState({
    name: "", sku: "", mrp: "", price: "", stock: "", unit: "",
    description: "", tagline: "", packSize: "", category: "",
  });

  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedDisplay, setRelatedDisplay] = useState<RelatedProductDisplay[]>([]);
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedResults, setRelatedResults] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [delModal, setDelModal] = useState(false);
  const [delPwd, setDelPwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    try {
      const categoriesRes = await axios.get(`${API_BASE}/categories`);
      setCategories(categoriesRes.data);

      if (editMode && id) {
        const productRes = await axios.get(`${API_BASE}/products/${id}`);
        const data = productRes.data;
        setForm({
          name: data.name, sku: data.sku || "",
          mrp: data.mrp?.toString() || "", price: data.price?.toString() || "",
          stock: data.stock?.toString() || "0", unit: data.unit || "",
          description: data.description || "", tagline: data.tagline || "",
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
            _id: p._id || p, name: p.name || "Unknown",
            image: p.images?.[0] || "", sku: p.sku,
          })));
        }
      } else {
        setForm({ name: "", sku: "", mrp: "", price: "", stock: "", unit: "", description: "", tagline: "", packSize: "", category: "" });
        setGallery([]);
        setRelatedDisplay([]);
      }
    } catch {
      toast.error("Failed to load product data");
    } finally {
      setPageLoading(false);
    }
  }, [editMode, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".pf-search-wrap")) setShowResults(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      try {
        const res = await axios.get(`${API_BASE}/products/search/all?query=${query}`);
        setSearchResults(res.data);
        setShowResults(true);
      } catch { setSearchResults([]); }
    } else { setSearchResults([]); setShowResults(false); }
  };

  const selectProduct = (prodId: string) => {
    setSearchQuery(""); setShowResults(false);
    navigate(`/admin/products/edit/${prodId}`);
  };

  const handleRelatedSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setRelatedQuery(query);
    if (query.length > 1) {
      try {
        const res = await axios.get(`${API_BASE}/products/search/all?query=${query}`);
        setRelatedResults(res.data.filter((p: ProductOption) =>
          p._id !== id && !relatedDisplay.some((r) => r._id === p._id)
        ));
      } catch { setRelatedResults([]); }
    } else { setRelatedResults([]); }
  };

  const addRelatedProduct = (product: ProductOption) => {
    setRelatedDisplay((prev) => [...prev, {
      _id: product._id, name: product.name,
      image: product.images?.[0], sku: product.sku,
    }]);
    setRelatedQuery(""); setRelatedResults([]);
  };

  const removeRelatedProduct = (prodId: string) => {
    setRelatedDisplay((prev) => prev.filter((p) => p._id !== prodId));
  };

  const confirmDelete = async () => {
    if (delPwd !== "bafnatoys") return toast.error("Wrong password");
    if (!id) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/products/${id}`);
      toast.success("Product deleted!", { icon: "🗑️", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      navigate("/admin/products/new");
      setForm({ name: "", sku: "", mrp: "", price: "", stock: "", unit: "", description: "", tagline: "", packSize: "", category: "" });
      setGallery([]); setRelatedDisplay([]);
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally { setDeleting(false); setDelModal(false); setDelPwd(""); }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Only WEBP allowed
  const handleGalleryFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const allFiles = Array.from(e.target.files);
    const webpFiles = allFiles.filter((file) => {
      const isWebp = file.type === "image/webp" || file.name.toLowerCase().endsWith(".webp");
      if (!isWebp) {
        toast.error(`"${file.name}" rejected — only WEBP allowed`, {
          icon: "⚠️",
          style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
        });
      }
      return isWebp;
    });

    const files = webpFiles.slice(0, 10 - gallery.length);

    if (files.length === 0) {
      e.target.value = "";
      return;
    }

    const images = files.map((file) => ({ file, url: URL.createObjectURL(file), isExisting: false }));
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
      const updated = [...prev];
      const [selected] = updated.splice(idx, 1);
      updated.unshift(selected);
      return updated;
    });
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const _gallery = [...gallery];
      const dragged = _gallery.splice(dragItem.current, 1)[0];
      _gallery.splice(dragOverItem.current, 0, dragged);
      setGallery(_gallery);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.name.trim() || !form.sku.trim() || !form.category || !form.price) throw new Error("Required fields are missing");
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
        if (img.isExisting) finalImagesOrder.push(img.url);
        else { finalImagesOrder.push(uploadedUrls[uploadIndex]); uploadIndex++; }
      }

      const payload: ProductPayload = {
        name: form.name, sku: form.sku, mrp: Number(form.mrp) || 0,
        price: Number(form.price), stock: Number(form.stock) || 0,
        unit: form.unit, description: form.description,
        tagline: form.tagline.trim() || undefined,
        packSize: form.packSize.trim() || undefined,
        category: form.category, images: finalImagesOrder,
        relatedProducts: relatedDisplay.map((p) => p._id),
      };

      if (editMode && id) {
        await axios.put(`${API_BASE}/products/${id}`, payload);
        toast.success("Product updated!", { icon: "✅", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      } else {
        const res = await axios.post(`${API_BASE}/products`, payload);
        toast.success("Product created!", { icon: "🎉", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
        const newId = res.data._id || res.data.id || res.data.product?._id;
        if (newId) navigate(`/admin/products/edit/${newId}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving product");
    } finally { setLoading(false); }
  };

  if (pageLoading) {
    return (
      <div className="pf-root">
        <div className="pf-state">
          <div className="pf-loader"><div className="pf-loader-ring" /><div className="pf-loader-ring" /><div className="pf-loader-ring" /></div>
          <h3>Loading Product</h3><p>Please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {/* Image Preview */}
      {previewImg && (
        <div className="pf-overlay" onClick={() => setPreviewImg(null)}>
          <div className="pf-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-preview-bar">
              <span><FiEye size={16} /> Image Preview</span>
              <button className="pf-preview-close" onClick={() => setPreviewImg(null)}><FiX size={18} /></button>
            </div>
            <div className="pf-preview-body"><img src={previewImg} alt="Preview" /></div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {delModal && (
        <div className="pf-overlay" onClick={() => { setDelModal(false); setDelPwd(""); }}>
          <div className="pf-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-del-visual">
              <div className="pf-del-circle"><div className="pf-del-circle-inner"><FiShield size={28} /></div></div>
              <div className="pf-del-pulse" />
            </div>
            <h3>Delete Product</h3>
            <p>This action is <strong>permanent</strong>. Enter admin password.</p>
            <div className="pf-del-input-wrap">
              <FiKey className="pf-del-input-icon" />
              <input type="password" placeholder="Enter admin password…" value={delPwd} onChange={(e) => setDelPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmDelete()} autoFocus />
            </div>
            <div className="pf-del-btns">
              <button className="pf-dbtn pf-dbtn-cancel" onClick={() => { setDelModal(false); setDelPwd(""); }}>Cancel</button>
              <button className="pf-dbtn pf-dbtn-danger" onClick={confirmDelete} disabled={deleting}><FiTrash2 size={14} /> {deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <section className="pf-top">
        <div className="pf-top-row">
          <div className="pf-top-left">
            <button className="pf-back-btn" onClick={() => navigate(-1)} title="Go Back"><FiChevronLeft size={18} /></button>
            <div>
              <h1 className="pf-title">{editMode ? "Edit Product" : "New Product"}</h1>
              {editMode && form.name && <p className="pf-subtitle">{form.name}</p>}
            </div>
          </div>
          <div className="pf-top-right">
            <button className="pf-top-btn" onClick={() => navigate("/admin/products")} title="All Products"><FiList size={16} /><span>All Products</span></button>
            <button className="pf-top-btn pf-top-add" onClick={() => navigate("/admin/products/new")}><FiPlus size={16} /><span>New</span></button>
          </div>
        </div>

        <div className="pf-search-wrap">
          <FiSearch className="pf-search-icon" />
          <input ref={searchRef} type="text" placeholder="Quick search product by name or SKU…" value={searchQuery} onChange={handleSearch} />
          {searchQuery && <button className="pf-search-clear" onClick={() => { setSearchQuery(""); setShowResults(false); searchRef.current?.focus(); }}><FiX size={14} /></button>}
          {showResults && searchResults.length > 0 && (
            <div className="pf-search-dropdown">
              {searchResults.map((prod) => (
                <div key={prod._id} className="pf-search-item" onClick={() => selectProduct(prod._id)}>
                  <div className="pf-search-thumb">
                    {prod.images?.[0] ? <img src={prod.images[0]} alt={prod.name} /> : <FiImage size={16} />}
                  </div>
                  <div className="pf-search-info">
                    <span className="pf-search-name">{prod.name}</span>
                    <span className="pf-search-sku">{prod.sku}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Form */}
      <form onSubmit={handleSubmit} className="pf-form">
        <div className="pf-grid">

          {/* LEFT */}
          <div className="pf-col-main">
            <div className="pf-card">
              <div className="pf-card-header">
                <div className="pf-card-icon"><FiFileText size={16} /></div>
                <h2>Product Information</h2>
              </div>
              <div className="pf-card-body">
                <div className="pf-field">
                  <label className="pf-label">Product Name <span className="pf-req">*</span></label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Enter product name…" className="pf-input" />
                </div>

                <div className="pf-row-2">
                  <div className="pf-field">
                    <label className="pf-label"><FiHash size={12} /> SKU <span className="pf-req">*</span></label>
                    <input type="text" name="sku" value={form.sku} onChange={handleChange} required placeholder="e.g., BT-001" className="pf-input" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label"><FiLayers size={12} /> Category <span className="pf-req">*</span></label>
                    <select name="category" value={form.category} onChange={handleChange} required className="pf-input">
                      <option value="">Select Category</option>
                      {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pf-row-2">
                  <div className="pf-field">
                    <label className="pf-label"><FiTag size={12} /> Tagline</label>
                    <input type="text" name="tagline" value={form.tagline} onChange={handleChange} placeholder="e.g., Best Seller" className="pf-input" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label"><FiPackage size={12} /> Pack Size</label>
                    <input type="text" name="packSize" value={form.packSize} onChange={handleChange} placeholder="e.g., 3 Pcs/Pkt" className="pf-input" />
                  </div>
                </div>

                <div className="pf-field">
                  <label className="pf-label">Description <span className="pf-req">*</span></label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} required placeholder="Describe the product…" className="pf-input pf-textarea" />
                </div>
              </div>
            </div>

            {/* ✅ Pricing Card — ₹ symbol used instead of $ */}
            <div className="pf-card">
              <div className="pf-card-header">
                <div className="pf-card-icon pricing"><span className="pf-rupee-icon">₹</span></div>
                <h2>Pricing & Stock</h2>
              </div>
              <div className="pf-card-body">
                <div className="pf-row-4">
                  <div className="pf-field">
                    <label className="pf-label">MRP (₹)</label>
                    <input type="number" name="mrp" value={form.mrp} onChange={handleChange} placeholder="0" className="pf-input" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Selling Price (₹) <span className="pf-req">*</span></label>
                    <input type="number" name="price" value={form.price} onChange={handleChange} required placeholder="0" className="pf-input" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label"><FiBox size={12} /> Stock</label>
                    <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="0" className="pf-input" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label"><FiPackage size={12} /> Unit</label>
                    <input type="text" name="unit" value={form.unit} onChange={handleChange} placeholder="e.g., Packet" className="pf-input" />
                  </div>
                </div>

                {form.mrp && form.price && Number(form.mrp) > Number(form.price) && (
                  <div className="pf-discount-info">
                    <FiInfo size={13} />
                    <span>Discount: <strong>{Math.round(((Number(form.mrp) - Number(form.price)) / Number(form.mrp)) * 100)}% off</strong> (Save ₹{(Number(form.mrp) - Number(form.price)).toLocaleString()})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="pf-col-side">
            {/* ✅ Images Card — WEBP only */}
            <div className="pf-card">
              <div className="pf-card-header">
                <div className="pf-card-icon images"><FiImage size={16} /></div>
                <h2>Images</h2>
                <span className="pf-card-badge">{gallery.length}/10</span>
              </div>
              <div className="pf-card-body">
                <label className="pf-upload-zone">
                  <FiUpload size={20} />
                  <span className="pf-upload-text">Click to upload images</span>
                  <span className="pf-upload-hint">Only WEBP format • Max 5MB each</span>
                  <input
                    type="file"
                    multiple
                    accept=".webp,image/webp"
                    onChange={handleGalleryFiles}
                  />
                </label>

                {gallery.length > 0 && (
                  <div className="pf-gallery">
                    {gallery.map((img, idx) => (
                      <div
                        key={idx}
                        className={`pf-gallery-item ${idx === 0 ? "pf-gallery-main" : ""}`}
                        draggable
                        onDragStart={() => (dragItem.current = idx)}
                        onDragEnter={() => (dragOverItem.current = idx)}
                        onDragEnd={handleSort}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <img src={img.url} alt="Preview" onClick={() => setPreviewImg(img.url)} />
                        {idx === 0 && <div className="pf-gallery-badge main"><FiStar size={9} /> Main</div>}
                        <div className="pf-gallery-drag"><FiMove size={10} /></div>
                        {idx !== 0 && <button type="button" className="pf-gallery-set-main" onClick={() => setMainImage(idx)}>Set Main</button>}
                        <button type="button" className="pf-gallery-remove" onClick={() => removeImage(idx)}><FiX size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {gallery.length > 1 && (
                  <p className="pf-gallery-hint"><FiMove size={12} /> Drag images to reorder</p>
                )}
              </div>
            </div>

            {/* Related Products */}
            <div className="pf-card">
              <div className="pf-card-header">
                <div className="pf-card-icon related"><FiLink size={16} /></div>
                <h2>Related Products</h2>
                {relatedDisplay.length > 0 && <span className="pf-card-badge">{relatedDisplay.length}</span>}
              </div>
              <div className="pf-card-body">
                <div className="pf-related-search">
                  <FiSearch className="pf-related-search-icon" />
                  <input type="text" placeholder="Search to add…" value={relatedQuery} onChange={handleRelatedSearch} />
                  {relatedResults.length > 0 && (
                    <div className="pf-related-dropdown">
                      {relatedResults.map((p) => (
                        <div key={p._id} className="pf-related-option" onClick={() => addRelatedProduct(p)}>
                          <div className="pf-related-option-img">
                            {p.images?.[0] ? <img src={p.images[0]} alt="" /> : <FiImage size={14} />}
                          </div>
                          <div className="pf-related-option-info">
                            <span>{p.name}</span>
                            {p.sku && <small>{p.sku}</small>}
                          </div>
                          <FiPlus size={14} className="pf-related-add-icon" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {relatedDisplay.length === 0 ? (
                  <div className="pf-related-empty">
                    <FiLink size={20} />
                    <p>No related products added</p>
                  </div>
                ) : (
                  <div className="pf-related-list">
                    {relatedDisplay.map((p) => (
                      <div key={p._id} className="pf-related-item">
                        <div className="pf-related-item-left">
                          <div className="pf-related-item-img">
                            {p.image ? <img src={p.image} alt="" /> : <FiImage size={14} />}
                          </div>
                          <div className="pf-related-item-info">
                            <span className="pf-related-item-name">{p.name}</span>
                            {p.sku && <span className="pf-related-item-sku">{p.sku}</span>}
                          </div>
                        </div>
                        <button type="button" className="pf-related-remove" onClick={() => removeRelatedProduct(p._id)}><FiX size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pf-actions">
          <button type="button" className="pf-act-btn pf-act-cancel" onClick={() => navigate(-1)}>Cancel</button>
          {editMode && (
            <button type="button" className="pf-act-btn pf-act-delete" onClick={() => setDelModal(true)}><FiTrash2 size={14} /> Delete</button>
          )}
          <button type="submit" className="pf-act-btn pf-act-save" disabled={loading}>
            <FiSave size={14} /> {loading ? "Saving…" : editMode ? "Update Product" : "Create Product"}
          </button>
        </div>
      </form>

      <footer className="pf-footer"><p>© {new Date().getFullYear()} BafnaToys Product Management</p></footer>
    </div>
  );
};

export default ProductForm;