import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { MEDIA_URL } from "../utils/api";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiX,
  FiCheck,
  FiArrowUp,
  FiArrowDown,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
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
  category?: { _id: string; name: string };
  createdAt?: string;
  images?: string[];
  order?: number;
}

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_URL}${url}` : "";

const norm = (v?: string) => (v || "").toString().toLowerCase().trim();

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<{
    productId: string;
    categoryId: string;
  } | null>(null);

  const navigate = useNavigate();

  // 🧠 Fetch products + categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get("/products"),
          api.get("/categories"),
        ]);
        const sorted = prodRes.data.sort(
          (a: Product, b: Product) => (a.order || 0) - (b.order || 0)
        );
        setProducts(sorted);
        setCategories(catRes.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🕐 Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // 🧩 Group products by category
  const groupedProducts = useMemo(() => {
    const q = norm(debounced);
    const filtered = !q
      ? products
      : products.filter((p) => {
          const n = norm(p.name);
          const s = norm(p.sku);
          const c = norm(p.category?.name);
          return n.includes(q) || s.includes(q) || c.includes(q);
        });

    const groups: Record<string, Product[]> = {};
    filtered.forEach((p) => {
      const cat = p.category?.name || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [products, debounced]);

  // 🗑 Delete product
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete product");
    }
  };

  // 🖊 Inline Category Change
  const handleCategoryChange = (productId: string, newCategoryId: string) => {
    setEditingCategory({ productId, categoryId: newCategoryId });
  };

  const saveCategoryChange = async (productId: string) => {
    const product = products.find((p) => p._id === productId);
    const newCategoryId = editingCategory?.categoryId;
    if (!product || !newCategoryId || newCategoryId === product.category?._id) {
      setEditingCategory(null);
      return;
    }

    try {
      const newCategory = categories.find((c) => c._id === newCategoryId);
      setProducts((prev) =>
        prev.map((p) =>
          p._id === productId
            ? {
                ...p,
                category: { _id: newCategoryId, name: newCategory?.name || "—" },
              }
            : p
        )
      );
      await api.put(`/products/${productId}`, { category: newCategoryId });
      setEditingCategory(null);
    } catch {
      alert("Failed to update category.");
      setEditingCategory(null);
    }
  };

  // ⬆⬇ Move Product (within category only)
  const moveProduct = async (id: string, direction: "up" | "down") => {
    try {
      const res = await api.put(`/products/${id}/move`, { direction });

      if (res.data.updatedCategoryProducts) {
        const updated = res.data.updatedCategoryProducts;

        // Replace category’s products locally
        setProducts((prev) => {
          const updatedIds = updated.map((u: Product) => u._id);
          const newList = prev.map((p) => {
            const match = updated.find((u: Product) => u._id === p._id);
            return match ? match : p;
          });
          // sort to maintain correct order after replace
          return newList.sort(
            (a, b) => (a.order || 0) - (b.order || 0)
          );
        });
      }

      console.log(res.data.message);
    } catch (err: any) {
      console.error("❌ Move failed:", err);
      alert(err.response?.data?.message || "Failed to move product.");
    }
  };

  // 🔽 Expand / Collapse Category
  const toggleExpand = (catName: string) => {
    setExpanded((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  if (loading) return <div className="product-list-loading">Loading...</div>;
  if (error) return <div className="product-list-error">{error}</div>;

  return (
    <div className="product-list-container">
      {/* 🔹 Header */}
      <div className="product-list-header">
        <div className="header-content">
          <h1>Product Management</h1>
          <p>Manage your full product inventory grouped by category</p>
        </div>

        <div className="header-actions">
          <div className="products-search">
            <FiSearch className="products-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or category…"
            />
            {search && (
              <button
                className="products-search-clear"
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

      {/* 🔹 Category Sections */}
      {Object.keys(groupedProducts).map((catName) => (
        <div key={catName} className="category-group">
          <div
            className="category-header"
            onClick={() => toggleExpand(catName)}
          >
            <h2>
              {catName}{" "}
              <span className="count">
                ({groupedProducts[catName].length} products)
              </span>
            </h2>
            {expanded[catName] ? <FiChevronUp /> : <FiChevronDown />}
          </div>

          {expanded[catName] && (
            <table className="product-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedProducts[catName].map((p, index) => {
                  const isEditing = editingCategory?.productId === p._id;
                  const currentCat = p.category?._id || "";

                  return (
                    <tr key={p._id}>
                      <td>{index + 1}</td>
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
                      <td>{p.name}</td>
                      <td>{p.sku}</td>

                      {/* 🔄 Inline Category Edit */}
                      <td>
                        <div className="category-select-wrapper">
                          <select
                            value={
                              isEditing
                                ? editingCategory.categoryId
                                : currentCat
                            }
                            onChange={(e) =>
                              handleCategoryChange(p._id, e.target.value)
                            }
                            className="product-category-select"
                          >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>

                          {isEditing &&
                            editingCategory.categoryId !== currentCat && (
                              <button
                                onClick={() => saveCategoryChange(p._id)}
                                className="save-category-btn"
                                title="Save"
                              >
                                <FiCheck size={18} />
                              </button>
                            )}
                        </div>
                      </td>

                      <td>
                        {p.price ? `₹${Number(p.price).toFixed(2)}` : "—"}
                      </td>
                      <td>
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString()
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="product-actions">
                        <div className="move-buttons">
                          <button
                            onClick={() => moveProduct(p._id, "up")}
                            disabled={index === 0}
                            title="Move Up"
                            className="move-btn"
                          >
                            <FiArrowUp />
                          </button>
                          <button
                            onClick={() => moveProduct(p._id, "down")}
                            disabled={
                              index === groupedProducts[catName].length - 1
                            }
                            title="Move Down"
                            className="move-btn"
                          >
                            <FiArrowDown />
                          </button>
                        </div>
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
      ))}
    </div>
  );
}
