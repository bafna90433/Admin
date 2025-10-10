import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { MEDIA_URL } from "../utils/api";
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiX, FiCheck } from "react-icons/fi"; // FiCheck import किया गया
import "../styles/ProductList.css";

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  price?: number | string;
  category?: { _id: string; name: string }; // Category को _id भी चाहिए
  createdAt?: string;
  images?: string[];
}

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_URL}${url}` : "";

// Safe normalize for search
const norm = (v?: string) => (v || "").toString().toLowerCase().trim();

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // New state for categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ productId: string; categoryId: string } | null>(null); // New state for inline edit
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.get("/products"),
          api.get("/categories"), // Categories को भी fetch करें
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load data.");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Debounce search (300ms) - unchanged
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filtered products - unchanged
  const filtered = useMemo(() => {
    const q = norm(debounced);
    if (!q) return products;
    return products.filter((p) => {
      const n = norm(p.name);
      const s = norm(p.sku);
      const c = norm(p.category?.name);
      return n.includes(q) || s.includes(q) || c.includes(q);
    });
  }, [products, debounced]);

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    api
      .delete(`/products/${id}`)
      .then(() => setProducts((p) => p.filter((prod) => prod._id !== id)))
      .catch((err) => alert(err.response?.data?.message || err.message));
  };
  
  // 🔥 New Handlers for Inline Category Edit

  const handleCategoryChange = (productId: string, newCategoryId: string) => {
    setEditingCategory({ productId, categoryId: newCategoryId });
  };

  const saveCategoryChange = async (productId: string) => {
    const product = products.find(p => p._id === productId);
    const newCategoryId = editingCategory?.categoryId;
    
    if (!product || !newCategoryId || newCategoryId === product.category?._id) {
        setEditingCategory(null);
        return;
    }

    try {
        // Optimistic UI Update: पहले UI में बदल दें
        const newCategory = categories.find(c => c._id === newCategoryId);
        setProducts(prev => prev.map(p => 
            p._id === productId 
                ? { ...p, category: { _id: newCategoryId, name: newCategory?.name || '—' } } 
                : p
        ));
        setEditingCategory(null); // Editing mode band karein

        // API Call: फिर सर्वर पर अपडेट करें
        await api.put(`/products/${productId}`, { category: newCategoryId });
        // Success alert or message if needed
    } catch (err: any) {
        // Error handling: अगर API fail हो जाए, तो पुरानी category वापस लाएं
        alert("Failed to update category. Please try again.");
        // Re-fetch or revert UI state (simple revert for this example)
        setProducts(prev => prev.map(p => 
            p._id === productId 
                ? { ...p, category: product.category } 
                : p
        ));
        setEditingCategory(null);
    }
  };

  if (loading) return <div className="product-list-loading">Loading products...</div>;
  if (error) return <div className="product-list-error">{error}</div>;

  const showEmpty = filtered.length === 0;

  return (
    <div className="product-list-container">
      {/* ... (product-list-header, table-meta, empty-state unchanged) ... */}
      <div className="product-list-header">
        <div className="header-content">
          <h1>Product Management</h1>
          <p className="header-description">View and manage your product inventory</p>
        </div>
        <div className="header-actions">
          <div className="products-search">
            <FiSearch className="products-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or category…"
              aria-label="Search products"
            />
            {search && (
              <button
                className="products-search-clear"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <FiX size={16} />
              </button>
            )}
          </div>
          <button
            className="add-product-button"
            onClick={() => navigate("/admin/products/new")}
          >
            <FiPlus size={18} /> Add Product
          </button>
        </div>
      </div>
      <div className="table-meta">
        <span>
          Showing <strong>{filtered.length}</strong> of <strong>{products.length}</strong> products
        </span>
        {debounced && !showEmpty && (
          <span className="meta-filter">Filtered by “{debounced}”</span>
        )}
      </div>
      
      {/* Table Layout */}
      <div className="product-list-card">
        <div className="product-table-container">
          {showEmpty ? (
            <div className="empty-state">
              <p>
                No results for <strong>“{debounced}”</strong>. Try a different keyword
                or <button className="link-btn" onClick={() => setSearch("")}>clear search</button>.
              </p>
            </div>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Category</th> {/* Column for Category */}
                  <th>Price</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isEditing = editingCategory?.productId === p._id;
                  const currentCategory = p.category?._id || '';

                  return (
                    <tr key={p._id}>
                      <td>
                        {p.images?.[0] ? (
                          <img
                            src={getImageUrl(p.images[0])}
                            alt={p.name}
                            className="product-thumb"
                            width={48}
                            height={48}
                          />
                        ) : (
                          <div className="product-thumb">📦</div>
                        )}
                      </td>
                      <td>
                        <span className="product-name">{p.name}</span>
                      </td>
                      <td>
                        <span className="product-sku">{p.sku || "—"}</span>
                      </td>
                      {/* 🔥 Category Cell with Inline Edit */}
                      <td>
                        <div className="category-select-wrapper">
                          <select
                            value={isEditing ? editingCategory.categoryId : currentCategory}
                            onChange={(e) => handleCategoryChange(p._id, e.target.value)}
                            className="product-category-select"
                            disabled={isEditing && editingCategory.categoryId === currentCategory}
                          >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          {/* Save Button */}
                          {isEditing && editingCategory.categoryId !== currentCategory && (
                              <button
                                type="button"
                                onClick={() => saveCategoryChange(p._id)}
                                className="save-category-btn"
                                title="Save Category"
                              >
                                <FiCheck size={18} />
                              </button>
                          )}
                        </div>
                      </td>
                      {/* End of Category Cell */}
                      <td>
                        <span className="product-price">
                          {p.price !== undefined &&
                          p.price !== null &&
                          !isNaN(Number(p.price))
                            ? `₹${Number(p.price).toFixed(2)}`
                            : "—"}
                        </span>
                      </td>
                      <td>
                        <span className="product-date">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>
                      <td className="product-actions">
                        <Link
                          to={`/admin/products/edit/${p._id}`}
                          className="edit-button"
                        >
                          <FiEdit2 size={16} /> Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="delete-button"
                        >
                          <FiTrash2 size={16} /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* ... (Mobile Cards Layout - इसे भी अपडेट करना होगा) ... */}
    </div>
  );
}