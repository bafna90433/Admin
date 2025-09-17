import React, { useEffect, useState } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiSave, FiX } from 'react-icons/fi';
import api from '../utils/api';
import '../styles/CategoryList.css';

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  category: string | { _id: string };
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [newCategory, setNewCategory] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // ✅ Auto switch view mode based on screen size
  React.useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setViewMode('grid');
      } else {
        setViewMode('list');
      }
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ✅ Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
      setError('');
    } catch (err) {
      setError('Failed to load categories. Please try again.');
    }
    setLoading(false);
  };

  // ✅ Fetch products and count by category
  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
      const counts: Record<string, number> = {};
      data.forEach((prod: Product) => {
        const catId = typeof prod.category === 'string' ? prod.category : prod.category?._id;
        if (catId) counts[catId] = (counts[catId] || 0) + 1;
      });
      setCategoryCounts(counts);
    } catch {
      // ignore errors
    }
  };

  // ✅ Initial load
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // ✅ Create category
  const handleCreate = async () => {
    if (!newCategory.trim()) {
      setError('Category name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await api.post('/categories', { name: newCategory });
      setNewCategory('');
      setIsCreating(false);
      fetchCategories();
    } catch (err) {
      setError('Failed to create category');
    }
    setLoading(false);
  };

  // ✅ Edit category
  const handleEdit = (cat: Category) => {
    setEditId(cat._id);
    setEditName(cat.name);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      setError('Category name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/categories/${id}`, { name: editName });
      setEditId(null);
      setEditName('');
      fetchCategories();
    } catch (err) {
      setError('Failed to update category');
    }
    setLoading(false);
  };

  // ✅ Delete category
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    setLoading(true);
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
      fetchProducts(); // refresh counts
    } catch (err) {
      setError('Failed to delete category');
    }
    setLoading(false);
  };

  return (
    <div className="category-list-container">
      {/* 🔥 Top mobile header removed */}

      {/* Desktop Header */}
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
            <FiPlus size={18} />
            Add Category
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert-card error">
          <div className="alert-content">
            <div className="alert-icon">!</div>
            <div className="alert-message">{error}</div>
            <button className="alert-close" onClick={() => setError('')}>
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div className="category-form-card">
          <div className="form-header">
            <h3>Add New Category</h3>
            <button
              className="close-button"
              onClick={() => {
                setIsCreating(false);
                setNewCategory('');
              }}
              disabled={loading}
            >
              <FiX size={20} />
            </button>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label htmlFor="new-category" className="form-label">
                Category Name <span className="required">*</span>
              </label>
              <input
                id="new-category"
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="e.g., Electronics, Clothing"
                className="form-input"
                disabled={loading}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewCategory('');
                  }
                }}
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setIsCreating(false);
                  setNewCategory('');
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <span className="button-spinner"></span>
                ) : (
                  <>
                    <FiSave size={16} />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List or Grid View */}
      {viewMode === 'list' ? (
        <div className="category-table-card">
          <div className="table-container">
            <table className="category-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Category Name</th>
                  <th>Products</th>
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
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdate(cat._id);
                            if (e.key === 'Escape') {
                              setEditId(null);
                              setEditName('');
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
                    <td className="actions-cell">
                      {editId === cat._id ? (
                        <div className="edit-actions">
                          <button
                            onClick={() => handleUpdate(cat._id)}
                            className="save-button"
                            disabled={loading}
                          >
                            <FiSave size={14} />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditId(null);
                              setEditName('');
                            }}
                            className="cancel-edit-button"
                            disabled={loading}
                          >
                            <FiX size={14} />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="default-actions">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="edit-button"
                            disabled={loading}
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat._id)}
                            className="delete-button"
                            disabled={loading}
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
                    <td colSpan={4} className="empty-state">
                      No categories found. Create your first category!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="categories-grid">
          {categories.map(cat => (
            <div key={cat._id} className="category-card">
              <div className="card-header">
                <h3 className="category-name">{cat.name}</h3>
                <span className="product-count">
                  {categoryCounts[cat._id] || 0} products
                </span>
              </div>
              {editId === cat._id ? (
                <div className="card-edit-mode">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="edit-input"
                    autoFocus
                    placeholder="Category name"
                  />
                  <div className="card-actions">
                    <button
                      onClick={() => handleUpdate(cat._id)}
                      className="save-button"
                      disabled={loading}
                    >
                      <FiSave size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditId(null);
                        setEditName('');
                      }}
                      className="cancel-edit-button"
                      disabled={loading}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card-actions">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="edit-button"
                    disabled={loading}
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="delete-button"
                    disabled={loading}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && !loading && (
            <div className="empty-grid-state">
              <p>No categories found. Create your first category!</p>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && categories.length === 0 && (
        <div className="loading-state">
          <div className="spinner"></div>
          Loading categories...
        </div>
      )}

      {/* Floating add button */}
      <button
        className="floating-add-button mobile-only"
        onClick={() => setIsCreating(true)}
        disabled={loading || isCreating}
        aria-label="Add category"
      >
        <FiPlus size={24} />
      </button>
    </div>
  );
};

export default CategoryList;
