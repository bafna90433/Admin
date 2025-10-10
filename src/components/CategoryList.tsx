import React, { useEffect, useState } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSave,
  FiX,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
import api from "../utils/api";
import "../styles/CategoryList.css";

interface Category {
  _id: string;
  name: string;
  order?: number;
}

interface Product {
  _id: string;
  category: string | { _id: string };
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [newCategory, setNewCategory] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // ✅ Responsive view mode
  useEffect(() => {
    const checkScreen = () => {
      setViewMode(window.innerWidth < 768 ? "grid" : "list");
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // ✅ Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/categories");
      const sorted = [...data].sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(sorted);
      setError("");
    } catch {
      setError("Failed to load categories. Please try again.");
    }
    setLoading(false);
  };

  // ✅ Fetch products (for product count)
  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/products");
      const counts: Record<string, number> = {};
      data.forEach((prod: Product) => {
        const catId =
          typeof prod.category === "string"
            ? prod.category
            : prod.category?._id;
        if (catId) counts[catId] = (counts[catId] || 0) + 1;
      });
      setProducts(data);
      setCategoryCounts(counts);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // ✅ Create category
  const handleCreate = async () => {
    if (!newCategory.trim()) return setError("Category name cannot be empty");
    setLoading(true);
    try {
      await api.post("/categories", { name: newCategory });
      setNewCategory("");
      setIsCreating(false);
      await fetchCategories();
    } catch {
      setError("Failed to create category");
    }
    setLoading(false);
  };

  // ✅ Edit category
  const handleEdit = (cat: Category) => {
    setEditId(cat._id);
    setEditName(cat.name);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return setError("Category name cannot be empty");
    setLoading(true);
    try {
      await api.put(`/categories/${id}`, { name: editName });
      setEditId(null);
      setEditName("");
      await fetchCategories();
    } catch {
      setError("Failed to update category");
    }
    setLoading(false);
  };

  // ✅ Delete category
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    setLoading(true);
    try {
      await api.delete(`/categories/${id}`);
      await fetchCategories();
      await fetchProducts();
    } catch {
      setError("Failed to delete category");
    }
    setLoading(false);
  };

  // ✅ Move category up/down
  const handleMove = async (id: string, direction: "up" | "down") => {
    try {
      const { data } = await api.put(`/categories/${id}/move`, { direction });
      console.log("✅ Move:", data.message);
      await fetchCategories(); // refresh sorted order
    } catch (err) {
      console.error("❌ Move error:", err);
      setError("Failed to move category");
    }
  };

  return (
    <div className="category-list-container">
      {/* Header */}
      <div className="category-list-header">
        <div className="header-content">
          <h1>Product Categories</h1>
          <p className="header-description">Manage your product categories</p>
        </div>
        <div className="header-actions">
          <button
            className="add-category-button"
            onClick={() => setIsCreating(true)}
            disabled={loading || isCreating}
          >
            <FiPlus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert-card error">
          <div className="alert-content">
            <div className="alert-icon">!</div>
            <div className="alert-message">{error}</div>
            <button className="alert-close" onClick={() => setError("")}>
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add Category Form */}
      {isCreating && (
        <div className="category-form-card">
          <div className="form-header">
            <h3>Add New Category</h3>
            <button
              className="close-button"
              onClick={() => {
                setIsCreating(false);
                setNewCategory("");
              }}
            >
              <FiX size={20} />
            </button>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label className="form-label">
                Category Name <span className="required">*</span>
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Toys, Dolls"
                className="form-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewCategory("");
                  }
                }}
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setIsCreating(false);
                  setNewCategory("");
                }}
              >
                Cancel
              </button>
              <button className="submit-button" onClick={handleCreate}>
                {loading ? <span className="button-spinner"></span> : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Table */}
      <div className="category-table-card">
        <div className="table-container">
          <table className="category-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Category Name</th>
                <th>Products</th>
                <th>Move</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat._id}>
                  <td>{idx + 1}</td>
                  <td>
                    {editId === cat._id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(cat._id);
                          if (e.key === "Escape") {
                            setEditId(null);
                            setEditName("");
                          }
                        }}
                        className="edit-input"
                        autoFocus
                      />
                    ) : (
                      <span className="category-name">{cat.name}</span>
                    )}
                  </td>

                  <td>
                    <span className="product-count">
                      {categoryCounts[cat._id] || 0}
                    </span>
                  </td>

                  {/* ✅ Move Buttons */}
                  <td>
                    <div className="move-buttons">
                      <button
                        onClick={() => handleMove(cat._id, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        <FiArrowUp />
                      </button>
                      <button
                        onClick={() => handleMove(cat._id, "down")}
                        disabled={idx === categories.length - 1}
                        title="Move Down"
                      >
                        <FiArrowDown />
                      </button>
                    </div>
                  </td>

                  {/* ✅ Edit / Delete Buttons */}
                  <td className="actions-cell">
                    {editId === cat._id ? (
                      <div className="edit-actions">
                        <button
                          onClick={() => handleUpdate(cat._id)}
                          className="save-button"
                        >
                          <FiSave size={14} /> Save
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                          className="cancel-edit-button"
                        >
                          <FiX size={14} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="default-actions">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="edit-button"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id)}
                          className="delete-button"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No categories found. Create your first category!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && categories.length === 0 && (
        <div className="loading-state">
          <div className="spinner"></div>
          Loading categories...
        </div>
      )}

      {/* Floating Add Button */}
      <button
        className="floating-add-button mobile-only"
        onClick={() => setIsCreating(true)}
        disabled={loading || isCreating}
      >
        <FiPlus size={24} />
      </button>
    </div>
  );
};

export default CategoryList;
