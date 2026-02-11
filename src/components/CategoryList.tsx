import React, { useEffect, useState } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSave,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiImage,
} from "react-icons/fi";
import axios from "axios"; // ✅ Changed: Import axios directly
import "../styles/CategoryList.css";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

interface Category {
  _id: string;
  name: string;
  image: string;
  imageId: string;
  order?: number;
}

interface Product {
  _id: string;
  category: string | { _id: string };
}

const CategoryList: React.FC = () => {
  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  
  // Create Form States
  const [newCategory, setNewCategory] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Edit States
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  // UI States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // ✅ Changed: Using axios with API_BASE
      const { data } = await axios.get(`${API_BASE}/categories`);
      const sorted = [...data].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCategories(sorted);
      setError("");
    } catch (err) {
      setError("Failed to load categories.");
    }
    setLoading(false);
  };

  // ✅ Fetch products (for count)
  const fetchProducts = async () => {
    try {
      // ✅ Changed: Using axios with API_BASE
      const { data } = await axios.get(`${API_BASE}/products`);
      const counts: Record<string, number> = {};
      data.forEach((prod: Product) => {
        const catId = typeof prod.category === "string" ? prod.category : prod.category?._id;
        if (catId) counts[catId] = (counts[catId] || 0) + 1;
      });
      setCategoryCounts(counts);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // ✅ Helper: Handle File Selection (Create & Edit)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isEdit) {
        setEditImage(file);
        setEditPreview(URL.createObjectURL(file)); 
      } else {
        setNewImage(file);
        setPreview(URL.createObjectURL(file));
      }
    }
  };

  // ✅ Create category
  const handleCreate = async () => {
    if (!newCategory.trim()) return setError("Category name is required");
    if (!newImage) return setError("Category image is required");

    setLoading(true);
    const formData = new FormData();
    formData.append("name", newCategory);
    formData.append("image", newImage);

    try {
      // ✅ Changed: Using axios with API_BASE
      await axios.post(`${API_BASE}/categories`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewCategory("");
      setNewImage(null);
      setPreview(null);
      setIsCreating(false);
      await fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create category");
    }
    setLoading(false);
  };

  // ✅ Setup Edit Mode
  const handleEdit = (cat: Category) => {
    setEditId(cat._id);
    setEditName(cat.name);
    setEditImage(null);
    setEditPreview(null);
  };

  // ✅ Cancel Edit
  const handleCancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditImage(null);
    setEditPreview(null);
  };

  // ✅ Update Category
  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return setError("Category name cannot be empty");
    
    setLoading(true);
    const formData = new FormData();
    formData.append("name", editName);
    
    if (editImage) {
      formData.append("image", editImage);
    }

    try {
      // ✅ Changed: Using axios with API_BASE
      await axios.put(`${API_BASE}/categories/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      handleCancelEdit(); 
      await fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update category");
    }
    setLoading(false);
  };

  // ✅ Delete & Move Functions
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure? This will delete the category and its image.")) return;
    setLoading(true);
    try {
      // ✅ Changed: Using axios with API_BASE
      await axios.delete(`${API_BASE}/categories/${id}`);
      await fetchCategories();
      await fetchProducts();
    } catch { setError("Failed to delete category"); }
    setLoading(false);
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    try {
      // ✅ Changed: Using axios with API_BASE
      await axios.put(`${API_BASE}/categories/${id}/move`, { direction });
      await fetchCategories();
    } catch { setError("Failed to move category"); }
  };

  return (
    <div className="category-list-container">
      {/* Header */}
      <div className="category-list-header">
        <div className="header-content">
          <h1>Product Categories</h1>
          <p className="header-description">Manage your product categories & images</p>
        </div>
        <div className="header-actions">
          <button className="add-category-button" onClick={() => setIsCreating(true)} disabled={loading || isCreating}>
            <FiPlus size={18} /> Add Category
          </button>
        </div>
      </div>

      {error && <div className="alert-card error">{error}<button className="alert-close" onClick={() => setError("")}><FiX /></button></div>}

      {/* Create Form */}
      {isCreating && (
        <div className="category-form-card">
          <div className="form-header">
            <h3>Add New Category</h3>
            <button className="close-button" onClick={() => setIsCreating(false)}><FiX size={20} /></button>
          </div>
          <div className="form-body">
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="form-input" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Category Image *</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, false)} className="form-input" />
              {preview && <img src={preview} alt="Preview" style={{ marginTop: 10, width: 60, height: 60, objectFit: "cover", borderRadius: 6 }} />}
            </div>
            <div className="form-actions">
              <button className="cancel-button" onClick={() => setIsCreating(false)}>Cancel</button>
              <button className="submit-button" onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Create"}</button>
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
                <th>Image</th>
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
                    {editId === cat._id && editPreview ? (
                       <img src={editPreview} alt="New Preview" style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", border: "2px solid #007bff" }} />
                    ) : cat.image ? (
                       <img src={cat.image} alt={cat.name} style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }} />
                    ) : (
                       <FiImage color="#ccc" size={24} />
                    )}
                  </td>

                  <td>
                    {editId === cat._id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="edit-input"
                          placeholder="Category Name"
                        />
                        <div style={{fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                           <span style={{color: '#666'}}>Change Image:</span>
                           <input 
                             type="file" 
                             accept="image/*"
                             onChange={(e) => handleFileChange(e, true)}
                             style={{ fontSize: '12px' }}
                           />
                        </div>
                      </div>
                    ) : (
                      <span className="category-name">{cat.name}</span>
                    )}
                  </td>

                  <td><span className="product-count">{categoryCounts[cat._id] || 0}</span></td>

                  <td>
                    <div className="move-buttons">
                      <button onClick={() => handleMove(cat._id, "up")} disabled={idx === 0}><FiArrowUp /></button>
                      <button onClick={() => handleMove(cat._id, "down")} disabled={idx === categories.length - 1}><FiArrowDown /></button>
                    </div>
                  </td>

                  <td className="actions-cell">
                    {editId === cat._id ? (
                      <div className="edit-actions">
                        <button onClick={() => handleUpdate(cat._id)} className="save-button" disabled={loading}>
                           <FiSave size={14} /> {loading ? "..." : "Save"}
                        </button>
                        <button onClick={handleCancelEdit} className="cancel-edit-button"><FiX size={14} /> Cancel</button>
                      </div>
                    ) : (
                      <div className="default-actions">
                        <button onClick={() => handleEdit(cat)} className="edit-button"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(cat._id)} className="delete-button"><FiTrash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && !loading && <tr><td colSpan={6} className="empty-state">No categories found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {loading && categories.length === 0 && <div className="loading-state">Loading...</div>}
      <button className="floating-add-button mobile-only" onClick={() => setIsCreating(true)}><FiPlus size={24} /></button>
    </div>
  );
};

export default CategoryList;