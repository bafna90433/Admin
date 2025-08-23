import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiTrash2, FiX, FiUpload, FiSave } from 'react-icons/fi';
import api, { MEDIA_URL } from '../utils/api';   // 👈 import MEDIA_URL
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

// ✅ updated to use MEDIA_URL
const getImageUrl = (url: string) =>
  url.startsWith('http') ? url : url ? `${MEDIA_URL}${url}` : '';

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
              url: getImageUrl(url),   // 👈 fixed
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
          ...gallery
            .filter(g => g.isExisting)
            .map(g => g.url.replace(MEDIA_URL, '')),  // 👈 localhost replace fix
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
      {/* UI remains same */}
    </div>
  );
};

export default ProductForm;
