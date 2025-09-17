import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { MEDIA_URL } from "../utils/api";
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiX } from "react-icons/fi";
import "../styles/ProductList.css";

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
  url?.startsWith("http") ? url : url ? `${MEDIA_URL}${url}` : "";

// Safe normalize for search
const norm = (v?: string) => (v || "").toString().toLowerCase().trim();

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/products")
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
      {/* Table Layout — Full details view */}
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
                  <th>Category</th>
                  <th>Price</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
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
                    <td>
                      <span className="product-category">
                        {p.category?.name || "—"}
                      </span>
                    </td>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Mobile Cards Layout — Compact view */}
      {showEmpty ? (
        <div className="empty-state-mobile">
          No results for <strong>“{debounced}”</strong>. Try a different keyword
          or <button className="link-btn" onClick={() => setSearch("")}>clear search</button>.
        </div>
      ) : null}
      <div className="mobile-product-cards">
        {filtered.map((p) => (
          <div key={p._id} className="product-card-mobile">
            <div className="product-card-header">
              {p.images?.[0] ? (
                <img
                  src={getImageUrl(p.images[0])}
                  alt={p.name}
                  className="card-product-image"
                  width={64}
                  height={64}
                />
              ) : (
                <div className="card-product-image">📦</div>
              )}
              <div className="card-product-details">
                <div className="card-product-name">{p.name}</div>
                <div className="card-product-sku">SKU: {p.sku || "—"}</div>
                {p.category?.name && (
                  <span className="card-product-category">
                    {p.category.name}
                  </span>
                )}
              </div>
            </div>
            <div className="card-product-meta">
              <div>
                <span className="card-product-price">
                  {p.price !== undefined &&
                  p.price !== null &&
                  !isNaN(Number(p.price))
                    ? `₹${Number(p.price).toFixed(2)}`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="card-product-date">
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
            <div className="card-product-actions">
              <Link
                to={`/admin/products/edit/${p._id}`}
                className="card-edit-btn"
              >
                <FiEdit2 size={16} /> Edit
              </Link>
              <button
                onClick={() => handleDelete(p._id)}
                className="card-delete-btn"
              >
                <FiTrash2 size={16} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
