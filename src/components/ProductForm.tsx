import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiTrash2, FiX, FiUpload, FiSave } from 'react-icons/fi';
import api from '../utils/api';
import '../styles/ProductForm.css';

interface Category {
  _id: string;
  name: string;
}

interface BulkPrice {
  inner: string;
  qty: number;
  price: number;
}

interface ProductPayload {
  name: string;
  sku: string;
  price: number;
  description: string;
  category: string;
  images: string[];
  bulkPricing?: BulkPrice[];
  taxFields?: string[];
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
    name: '',
    sku: '',
    price: 0,
    description: '',
    category: ''
  });

  const [bulkPrices, setBulkPrices] = useState<BulkPrice[]>([
    { inner: '', qty: 1, price: 0 }
  ]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- TAX FIELDS STATE ---
  const [taxFields, setTaxFields] = useState<string[]>(['']);
  // ------------------------

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesRes = await api.get('/categories');
        setCategories(categoriesRes.data);

        if (editMode && id) {
          const productRes = await api.get(`/products/${id}`);
          const data = productRes.data;
          setForm({
            name: data.name,
            sku: data.sku || '',
            price: data.price,
            description: data.description,
            category: typeof data.category === 'string' ? data.category : data.category?._id || ''
          });
          setBulkPrices(data.bulkPricing || [{ inner: '', qty: 1, price: 0 }]);
          setGallery(
            data.images.map((url: string) => ({
              url, // ✅ directly use Cloudinary URL
              isExisting: true
            }))
          );
          setTaxFields(data.taxFields && data.taxFields.length ? data.taxFields : ['']);
        }
      } catch (err) {
        setError('Failed to load data. Please try again later.');
      }
    };

    fetchData();
  }, [editMode, id]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleGalleryFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 10 - gallery.length);
    const images = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      isExisting: false
    }));
    setGallery(g => [...g, ...images]);
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    if (!gallery[idx].isExisting) URL.revokeObjectURL(gallery[idx].url);
    setGallery(g => g.filter((_, i) => i !== idx));
  };

  const handleBulkChange = (idx: number, field: keyof BulkPrice, value: string | number) => {
    setBulkPrices(prices =>
      prices.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const addBulkRow = () => setBulkPrices(bp => [...bp, { inner: '', qty: 1, price: 0 }]);
  const removeBulkRow = (idx: number) => {
    if (bulkPrices.length > 1) setBulkPrices(bp => bp.filter((_, i) => i !== idx));
  };

  // -- TAX FIELD HANDLERS --
  const handleTaxFieldChange = (idx: number, value: string) => {
    setTaxFields(fields => fields.map((v, i) => (i === idx ? value : v)));
  };
  const addTaxField = () => setTaxFields(fields => [...fields, '']);
  const removeTaxField = (idx: number) => {
    if (taxFields.length > 1) setTaxFields(fields => fields.filter((_, i) => i !== idx));
  };
  // ------------------------

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.name.trim()) throw new Error('Product name is required');
      if (!form.sku.trim()) throw new Error('SKU is required');
      if (!form.category) throw new Error('Category is required');
      if (form.price <= 0) throw new Error('Price must be > 0');
      if (!gallery.length) throw new Error('At least one image is required');

      const newImages = gallery.filter(g => !g.isExisting && g.file);
      let uploadedUrls: string[] = [];
      if (newImages.length) {
        const formData = new FormData();
        newImages.forEach(g => g.file && formData.append('images', g.file));
        const res = await api.post('/upload', formData);
        uploadedUrls = res.data.urls;
      }

      const payload: ProductPayload = {
        ...form,
        images: [
          ...gallery.filter(g => g.isExisting).map(g => g.url), // ✅ Cloudinary URLs
          ...uploadedUrls
        ],
        bulkPricing: bulkPrices.filter(bp => bp.qty > 0 && bp.price > 0),
        taxFields,
      };

      if (editMode && id) {
        await api.put(`/products/${id}`, payload);
        setSuccess('Product updated successfully');
      } else {
        await api.post('/products', payload);
        setSuccess('Product created successfully');
        setTimeout(() => navigate('/admin/products'), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error, try again.');
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
          {/* Basic Information */}
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
                placeholder="Enter product name"
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
                placeholder="Enter SKU"
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
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* TAX FIELDS */}
            <div className="form-group">
              <label>Tax Fields</label>
              {taxFields.map((value, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input
                    type="text"
                    value={value}
                    onChange={e => handleTaxFieldChange(idx, e.target.value)}
                    placeholder="Enter any tax value"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTaxField(idx)}
                    disabled={taxFields.length === 1}
                    style={{
                      background: '#eee',
                      border: 0,
                      borderRadius: 4,
                      cursor: taxFields.length === 1 ? 'not-allowed' : 'pointer'
                    }}
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTaxField}
                style={{
                  marginTop: 6,
                  background: '#f5f5f5',
                  border: 0,
                  borderRadius: 4,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
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
                placeholder="0.00"
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
                placeholder="Enter product description"
              />
            </div>
          </div>

          {/* Product Images */}
          <div className="form-card secondary">
            <h2 className="section-title">Product Images</h2>
            <div className="form-group">
              <label>Upload Images (Max 10) *</label>
              <div className="file-upload">
                <label>
                  <FiUpload className="upload-icon" />
                  <span>Click to upload</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryFiles}
                    style={{ display: 'none' }}
                  />
                </label>
                <p className="file-upload-hint">Supports JPG, PNG up to 5MB each</p>
              </div>
            </div>
            <div className="image-preview-grid">
              {gallery.map((img, idx) => (
                <div key={idx} className="image-preview">
                  <img src={img.url} alt={`Preview ${idx}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="remove-btn"
                    aria-label="Remove image"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Pricing */}
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
                <div key={idx} className={`table-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                  <div>
                    <input
                      type="number"
                      value={bp.inner}
                      onChange={e => handleBulkChange(idx, 'inner', e.target.value)}
                      min="1"
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={bp.qty}
                      onChange={e => handleBulkChange(idx, 'qty', Number(e.target.value))}
                      min="1"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={bp.price}
                      onChange={e => handleBulkChange(idx, 'price', Number(e.target.value))}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => removeBulkRow(idx)}
                      disabled={bulkPrices.length === 1}
                      className="table-action-btn danger"
                      aria-label="Remove row"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
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

            <div className="bulk-pricing-note">
              <p><strong>Note:</strong> Bulk pricing will apply when customer orders reach the minimum quantity.</p>
            </div>
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
          <button
            type="submit"
            className="save-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <FiSave /> {editMode ? 'Update Product' : 'Create Product'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
