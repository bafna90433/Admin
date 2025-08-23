import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/ProductList.css';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiX } from 'react-icons/fi';

interface Product {
  _id: string;
  name: string;
  sku: string;
  price?: number | string;
  category?: { name: string };
  createdAt?: string;
  images?: string[];
}

const getImageUrl = (url: string) =>
  url?.startsWith('http') ? url : url ? `http://localhost:5000${url}` : '';

/** safe lower + trim */
const norm = (v?: string) => (v || '').toString().toLowerCase().trim();

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔎 Search state
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const navigate = useNavigate();

  // Fetch products
  useEffect(() => {
    api
      .get('/products')
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      });
  }, []);

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filtered list
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
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    api
      .delete(`/products/${id}`)
      .then(() => {
        setProducts((p) => p.filter((prod) => prod._id !== id));
      })
      .catch((err) => alert(err.response?.data?.message || err.message));
  };

  if (loading) return <div className="product-list-loading">Loading products...</div>;
  if (error) return <div className="product-list-error">{error}</div>;

  const showEmpty = filtered.length === 0;

  return (
    <div className="product-list-container">
      <div className="product-list-header">
        <div className="header-content">
          <h1>Product Management</h1>
          <p className="header-description">View and manage your product inventory</p>
        </div>

        {/* Actions right side */}
        <div className="header-actions">
          {/* Search input (local to this page) */}
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
                onClick={() => setSearch('')}
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          <button
            className="add-product-button"
            onClick={() => navigate('/admin/products/new')}
          >
            <FiPlus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Small meta row showing counts */}
      <div className="table-meta">
        <span>
          Showing <strong>{filtered.length}</strong> of <strong>{products.length}</strong> products
        </span>
        {debounced && !showEmpty && (
          <span className="meta-filter">Filtered by “{debounced}”</span>
        )}
      </div>

      <div className="product-list-card">
        <div className="product-table-container">
          {showEmpty ? (
            <div className="empty-state">
              <p>
                No results for <strong>“{debounced}”</strong>. Try a different keyword
                or <button className="link-btn" onClick={() => setSearch('')}>clear search</button>.
              </p>
            </div>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product._id}>
                    <td>
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={getImageUrl(product.images[0])}
                          alt={product.name}
                          className="product-thumb"
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#cbd5e1',
                            fontSize: 24,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          —
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="product-name">{product.name}</span>
                    </td>
                    <td>
                      <span className="product-sku">{product.sku || '—'}</span>
                    </td>
                    <td>
                      <span className="product-category">
                        {product.category?.name || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="product-price">
                        {product.price !== undefined &&
                        product.price !== null &&
                        !isNaN(Number(product.price))
                          ? `₹${Number(product.price).toFixed(2)}`
                          : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="product-date">
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </span>
                    </td>
                    <td className="product-actions">
                      <Link
                        to={`/admin/products/edit/${product._id}`}
                        className="edit-button"
                      >
                        <FiEdit2 size={16} />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="delete-button"
                      >
                        <FiTrash2 size={16} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state subtle">
            <p>No products found. Add your first product to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
