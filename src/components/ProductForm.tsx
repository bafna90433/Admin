import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiPlus, FiTrash2, FiX, FiUpload, FiSave } from "react-icons/fi";
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

interface BulkPrice {
  inner: string;
  qty: string;
  price: string;
}

interface ProductPayload {
  name: string;
  sku: string;
  price: number;
  description: string;
  category: string;
  images: string[];
  bulkPricing?: { inner: string; qty: number; price: number }[];
  taxFields?: string[];
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
    price: "",
    description: "",
    category: "",
  });

  const [bulkPrices, setBulkPrices] = useState<BulkPrice[]>([
    { inner: "", qty: "", price: "" },
  ]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taxFields, setTaxFields] = useState<string[]>([""]);

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
            price: data.price?.toString() || "",
            description: data.description || "",
            category:
              typeof data.category === "string"
                ? data.category
                : data.category?._id || "",
          });

          setBulkPrices(
            data.bulkPricing?.map((bp: any) => ({
              inner: bp.inner || "",
              qty: bp.qty?.toString() || "",
              price: bp.price?.toString() || "",
            })) || [{ inner: "", qty: "", price: "" }]
          );

          setGallery(
            data.images?.map((url: string) => ({
              url,
              isExisting: true,
            })) || []
          );

          setTaxFields(
            data.taxFields && data.taxFields.length ? data.taxFields : [""]
          );

          if (Array.isArray(data.relatedProducts)) {
            setRelatedProducts(data.relatedProducts.map((p: any) => p._id || p));
          }
        }
      } catch (err) {
        setError("Failed to load data. Please try again later.");
      }
    };

    fetchData();
  }, [editMode, id]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const handleBulkChange = (
    idx: number,
    field: keyof BulkPrice,
    value: string
  ) => {
    setBulkPrices((prices) =>
      prices.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const addBulkRow = () =>
    setBulkPrices((bp) => [...bp, { inner: "", qty: "", price: "" }]);

  const removeBulkRow = (idx: number) => {
    if (bulkPrices.length > 1)
      setBulkPrices((bp) => bp.filter((_, i) => i !== idx));
  };

  const handleTaxFieldChange = (idx: number, value: string) => {
    setTaxFields((fields) =>
      fields.map((v, i) => (i === idx ? value : v))
    );
  };
  const addTaxField = () => setTaxFields((fields) => [...fields, ""]);
  const removeTaxField = (idx: number) => {
    if (taxFields.length > 1)
      setTaxFields((fields) => fields.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.name.trim()) throw new Error("Product name is required");
      if (!form.sku.trim()) throw new Error("SKU is required");
      if (!form.category) throw new Error("Category is required");
      if (!form.price || Number(form.price) <= 0)
        throw new Error("Price must be > 0");
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
        ...form,
        price: Number(form.price),
        images: [
          ...gallery.filter((g) => g.isExisting).map((g) => g.url),
          ...uploadedUrls,
        ],
        bulkPricing: bulkPrices
          .filter((bp) => Number(bp.qty) > 0 && Number(bp.price) > 0)
          .map((bp) => ({
            inner: bp.inner,
            qty: Number(bp.qty),
            price: Number(bp.price),
          })),
        taxFields,
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
      setError(err.message || "Unexpected error, try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="product-form" id="product-form">
        <div className="form-grid">
          {/* === Product Info === */}
          <div className="form-card primary">
            <h2 className="section-title">Product Information</h2>

            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>SKU *</label>
              <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Related Products */}
            <div className="form-group">
              <label>Related Products</label>
              <select
                multiple
                value={relatedProducts}
                onChange={handleRelatedChange}
              >
                {products
                  .filter((p) => p._id !== id)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <p className="hint">
                Hold <strong>Ctrl</strong> (Windows) or <strong>Cmd</strong> (Mac)
                to select multiple.
              </p>
            </div>

            {/* Tax Fields */}
            <div className="form-group">
              <label>Tax Fields</label>
              {taxFields.map((value, idx) => (
                <div key={idx} className="tax-field-row">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      handleTaxFieldChange(idx, e.target.value)
                    }
                    placeholder="Enter any tax value"
                  />
                  <button
                    type="button"
                    onClick={() => removeTaxField(idx)}
                    disabled={taxFields.length === 1}
                    className="remove-tax-button"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTaxField}
                className="add-tax-button"
              >
                <FiPlus /> Add Tax Field
              </button>
            </div>

            <div className="form-group">
              <label>Base Price (₹) *</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>
          </div>

          {/* === Images === */}
          <div className="form-card secondary">
            <h2 className="section-title">Product Images</h2>
            <label>Upload Images (Max 10)</label>
            <div className="file-upload">
              <label>
                <FiUpload className="upload-icon" />
                <span>Click to upload</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryFiles}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <div className="image-preview-grid">
              {gallery.map((img, idx) => (
                <div key={idx} className="image-preview">
                  <img src={img.url} alt={`Preview ${idx}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="remove-btn"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* === Bulk Pricing === */}
          <div className="form-card tertiary">
            <h2 className="section-title">Bulk Pricing</h2>
            <div className="bulk-pricing-table">
              <div className="table-header">
                <div>Min Qty (Inner)</div>
                <div>Total Qty</div>
                <div>Unit Price (₹)</div>
                <div>Actions</div>
              </div>

              {bulkPrices.map((bp, idx) => (
                <div key={idx} className="table-row">
                  <input
                    type="number"
                    value={bp.inner}
                    onChange={(e) =>
                      handleBulkChange(idx, "inner", e.target.value)
                    }
                    min="1"
                    placeholder="5"
                  />
                  <input
                    type="number"
                    value={bp.qty}
                    onChange={(e) =>
                      handleBulkChange(idx, "qty", e.target.value)
                    }
                    min="1"
                    placeholder="50"
                  />
                  <input
                    type="number"
                    value={bp.price}
                    onChange={(e) =>
                      handleBulkChange(idx, "price", e.target.value)
                    }
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() => removeBulkRow(idx)}
                    disabled={bulkPrices.length === 1}
                    className="table-action-btn danger"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addBulkRow}
              className="add-bulk-row-btn"
            >
              <FiPlus /> Add Bulk Pricing Tier
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Saving...
              </>
            ) : (
              <>
                <FiSave /> {editMode ? "Update Product" : "Create Product"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
