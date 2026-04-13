import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiArrowUp, FiArrowDown,
  FiImage, FiSearch, FiRefreshCw, FiLayers, FiGrid, FiList,
  FiLink, FiShield, FiKey, FiPackage, FiEye,
  FiUpload, FiCheck
} from "react-icons/fi";
import api from "../utils/api";
import "../styles/CategoryList.css";


interface Category {
  _id: string;
  name: string;
  image: string;
  imageId: string;
  link?: string;
  order?: number;
}

interface Product {
  _id: string;
  category: string | { _id: string };
  price?: number; 
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); 

  const [newCategory, setNewCategory] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const [delId, setDelId] = useState<string | null>(null);
  const [delPwd, setDelPwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto card on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setView("card");
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/categories`);
      const sorted = [...data].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCategories(sorted);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get(`/products`);
      const productsArray = Array.isArray(data) ? data : data.products || data.docs || [];
      setAllProducts(productsArray);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCategories(); fetchProducts(); }, [fetchCategories, fetchProducts]);

  // ⭐ SMART CATEGORY COUNT LOGIC
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(cat => {
      const catNameLower = cat.name.toLowerCase().trim();
      
      const isSmartFilter = catNameLower.includes("under") || /^\d+$/.test(catNameLower);

      if (isSmartFilter) {
        const priceLimit = parseInt(catNameLower.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(priceLimit)) {
          counts[cat._id] = allProducts.filter(p => (p.price || 0) <= priceLimit).length;
          return;
        }
      }
      
      counts[cat._id] = allProducts.filter(p => {
        const pCatId = typeof p.category === "string" ? p.category : p.category?._id;
        return pCatId === cat._id;
      }).length;
    });
    return counts;
  }, [categories, allProducts]);

  const filtered = debounced
    ? categories.filter((c) => c.name.toLowerCase().includes(debounced.toLowerCase()))
    : categories;

  const totalProducts = allProducts.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isWebp = file.type === "image/webp" || file.name.toLowerCase().endsWith(".webp");
    if (!isWebp) {
      toast.error(`"${file.name}" rejected — only WEBP allowed`, {
        icon: "⚠️",
        style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
      });
      e.target.value = "";
      return;
    }

    if (isEdit) {
      setEditImage(file);
      setEditPreview(URL.createObjectURL(file));
    } else {
      setNewImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!newCategory.trim()) return toast.error("Category name is required");
    if (!newImage) return toast.error("Category image is required (WEBP)");

    setSaving(true);
    const formData = new FormData();
    formData.append("name", newCategory);
    formData.append("link", newLink);
    formData.append("image", newImage);

    try {
      await api.post(`/categories`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Category created!", { icon: "🎉", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      setNewCategory(""); setNewLink(""); setNewImage(null); setPreview(null); setIsCreating(false);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create");
    } finally { setSaving(false); }
  };

  const handleEdit = (cat: Category) => {
    setEditId(cat._id);
    setEditName(cat.name);
    setEditLink(cat.link || "");
    setEditImage(null);
    setEditPreview(null);
  };

  const handleCancelEdit = () => {
    setEditId(null); setEditName(""); setEditLink(""); setEditImage(null); setEditPreview(null);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return toast.error("Category name cannot be empty");
    setSaving(true);
    const formData = new FormData();
    formData.append("name", editName);
    formData.append("link", editLink);
    if (editImage) formData.append("image", editImage);

    try {
      await api.put(`/categories/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Category updated!", { icon: "✅", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      handleCancelEdit();
      await fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (delPwd !== "bafnatoys") return toast.error("Wrong password");
    if (!delId) return;
    setDeleting(true);
    try {
      await api.delete(`/categories/${delId}`);
      toast.success("Category deleted!", { icon: "🗑️", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } });
      await fetchCategories();
      await fetchProducts(); 
    } catch {
      toast.error("Failed to delete category");
    } finally { setDeleting(false); setDelId(null); setDelPwd(""); }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    try {
      await api.put(`/categories/${id}/move`, { direction });
      await fetchCategories();
    } catch {
      toast.error("Failed to move category");
    }
  };

  return (
    <div className="cl-root" ref={topRef}>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "14px", padding: "12px 20px", fontSize: "14px", fontWeight: 500 } }} />

      {/* Image Preview */}
      {previewUrl && (
        <div className="cl-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="cl-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cl-preview-bar">
              <span><FiEye size={16} /> Image Preview</span>
              <button className="cl-preview-close" onClick={() => setPreviewUrl(null)}><FiX size={18} /></button>
            </div>
            <div className="cl-preview-body"><img src={previewUrl} alt="Category" /></div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {delId && (
        <div className="cl-overlay" onClick={() => { setDelId(null); setDelPwd(""); }}>
          <div className="cl-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cl-del-visual">
              <div className="cl-del-circle"><div className="cl-del-circle-inner"><FiShield size={28} /></div></div>
              <div className="cl-del-pulse" />
            </div>
            <h3>Delete Category</h3>
            <p>This will permanently delete the category and its image.<br />Enter admin password to confirm.</p>
            <div className="cl-del-input-wrap">
              <FiKey className="cl-del-input-icon" />
              <input type="password" placeholder="Enter admin password…" value={delPwd} onChange={(e) => setDelPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmDelete()} autoFocus />
            </div>
            <div className="cl-del-btns">
              <button className="cl-dbtn cl-dbtn-cancel" onClick={() => { setDelId(null); setDelPwd(""); }}>Cancel</button>
              <button className="cl-dbtn cl-dbtn-danger" onClick={confirmDelete} disabled={deleting}><FiTrash2 size={14} /> {deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top */}
      <section className="cl-top">
        <div className="cl-top-row">
          <div className="cl-top-left">
            <h1 className="cl-title">Categories</h1>
            <span className="cl-count">{categories.length} total</span>
          </div>
          <div className="cl-top-right">
            <button className="cl-top-btn" onClick={() => { fetchCategories(); fetchProducts(); }} disabled={loading} title="Refresh">
              <FiRefreshCw size={16} className={loading ? "cl-spinning" : ""} />
            </button>
            <button className="cl-top-btn cl-top-add" onClick={() => setIsCreating(true)} disabled={isCreating}>
              <FiPlus size={16} /><span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="cl-stats">
          {[
            { icon: <FiLayers size={18} />, val: categories.length, lbl: "Categories", color: "indigo" },
            { icon: <FiPackage size={18} />, val: totalProducts, lbl: "Total Products", color: "emerald" },
            { icon: <FiImage size={18} />, val: categories.filter((c) => c.image).length, lbl: "With Images", color: "violet" },
            { icon: <FiLink size={18} />, val: categories.filter((c) => c.link).length, lbl: "With Links", color: "amber" },
          ].map((s) => (
            <div className={`cl-stat cl-stat-${s.color}`} key={s.lbl}>
              <div className="cl-stat-top">
                <div className="cl-stat-icon">{s.icon}</div>
                <div className="cl-stat-num">{s.val}</div>
              </div>
              <div className="cl-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Create Form */}
      {isCreating && (
        <section className="cl-form-section">
          <div className="cl-form-card">
            <div className="cl-form-header">
              <div className="cl-form-header-left">
                <div className="cl-form-icon"><FiPlus size={16} /></div>
                <h2>Add New Category</h2>
              </div>
              <button className="cl-form-close" onClick={() => { setIsCreating(false); setNewCategory(""); setNewLink(""); setNewImage(null); setPreview(null); }}><FiX size={18} /></button>
            </div>
            <div className="cl-form-body">
              <div className="cl-form-grid">
                <div className="cl-field">
                  <label className="cl-label">Category Name <span className="cl-req">*</span></label>
                  <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="cl-input" placeholder="Enter category name…" autoFocus />
                </div>
                <div className="cl-field">
                  <label className="cl-label"><FiLink size={12} /> Custom Link</label>
                  <input type="text" value={newLink} onChange={(e) => setNewLink(e.target.value)} className="cl-input" placeholder="/page or https://…" />
                </div>
              </div>
              <div className="cl-field">
                <label className="cl-label"><FiImage size={12} /> Category Image <span className="cl-req">*</span></label>
                <label className="cl-upload-zone">
                  <FiUpload size={18} />
                  <span className="cl-upload-text">{newImage ? newImage.name : "Click to upload"}</span>
                  <span className="cl-upload-hint">Only WEBP format</span>
                  <input type="file" accept=".webp,image/webp" onChange={(e) => handleFileChange(e, false)} />
                </label>
                {preview && (
                  <div className="cl-form-preview">
                    <img src={preview} alt="Preview" />
                    <button type="button" onClick={() => { setNewImage(null); setPreview(null); }}><FiX size={12} /></button>
                  </div>
                )}
              </div>
              <div className="cl-form-actions">
                <button className="cl-fbtn cl-fbtn-cancel" onClick={() => { setIsCreating(false); setNewCategory(""); setNewLink(""); setNewImage(null); setPreview(null); }}>Cancel</button>
                <button className="cl-fbtn cl-fbtn-save" onClick={handleCreate} disabled={saving}><FiSave size={14} /> {saving ? "Creating…" : "Create Category"}</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Toolbar */}
      <section className="cl-toolbar-section">
        <div className="cl-toolbar">
          <div className="cl-toolbar-main">
            <div className="cl-search">
              <FiSearch className="cl-search-icon" />
              <input ref={searchRef} placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="cl-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}><FiX size={14} /></button>}
            </div>
            <div className="cl-toolbar-btns">
              <div className="cl-view-toggle">
                <button className={`cl-vt ${view === "table" ? "active" : ""}`} onClick={() => setView("table")} title="Table"><FiList size={16} /></button>
                <button className={`cl-vt ${view === "card" ? "active" : ""}`} onClick={() => setView("card")} title="Cards"><FiGrid size={16} /></button>
              </div>
            </div>
          </div>
          <div className="cl-toolbar-info">
            <span className="cl-showing"><span className="cl-showing-bold">{filtered.length}</span> categories{search && <span className="cl-showing-sub"> (filtered from {categories.length})</span>}</span>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="cl-main">
        {loading && categories.length === 0 ? (
          <div className="cl-state">
            <div className="cl-loader"><div className="cl-loader-ring" /><div className="cl-loader-ring" /><div className="cl-loader-ring" /></div>
            <h3>Loading Categories</h3><p>Please wait…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cl-state cl-state-empty">
            <div className="cl-state-icon"><FiSearch size={28} /></div>
            <h3>No categories found</h3>
            <p>{search ? "Try a different search term" : "Create your first category"}</p>
            {!search && !isCreating && <button className="cl-retry-btn" onClick={() => setIsCreating(true)}><FiPlus size={14} /> Add Category</button>}
          </div>
        ) : view === "table" ? (
          /* TABLE VIEW */
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th className="cl-th-num">#</th>
                  <th className="cl-th-img">Image</th>
                  <th>Name</th>
                  <th className="cl-th-hide-sm">Link</th>
                  <th>Products</th>
                  <th>Order</th>
                  <th className="cl-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat, idx) => {
                  const isEditing = editId === cat._id;
                  return (
                    <tr key={cat._id} className={`cl-tr ${isEditing ? "cl-tr-editing" : ""}`}>
                      <td className="cl-td-num">{idx + 1}</td>
                      <td>
                        <div className="cl-td-img" onClick={() => {
                          const src = isEditing && editPreview ? editPreview : cat.image;
                          if (src) setPreviewUrl(src);
                        }}>
                          {isEditing && editPreview ? (
                            <img src={editPreview} alt="New" className="cl-cat-thumb editing" />
                          ) : cat.image ? (
                            <img src={cat.image} alt={cat.name} className="cl-cat-thumb" />
                          ) : (
                            <div className="cl-cat-thumb cl-cat-thumb-empty"><FiImage size={16} /></div>
                          )}
                          {(cat.image || editPreview) && <div className="cl-img-zoom"><FiEye size={10} /></div>}
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="cl-edit-cell">
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="cl-edit-input" placeholder="Category Name" />
                            <label className="cl-edit-file-label">
                              <FiUpload size={12} /> Change Image (WEBP)
                              <input type="file" accept=".webp,image/webp" onChange={(e) => handleFileChange(e, true)} />
                            </label>
                          </div>
                        ) : (
                          <span className="cl-cat-name">{cat.name}</span>
                        )}
                      </td>
                      <td className="cl-th-hide-sm">
                        {isEditing ? (
                          <input type="text" value={editLink} onChange={(e) => setEditLink(e.target.value)} className="cl-edit-input" placeholder="/page-link" />
                        ) : cat.link ? (
                          <span className="cl-link-badge">{cat.link}</span>
                        ) : (
                          <span className="cl-no-link">—</span>
                        )}
                      </td>
                      <td><span className="cl-product-count">{categoryCounts[cat._id] || 0}</span></td>
                      <td>
                        <div className="cl-move-btns">
                          <button className="cl-move" onClick={() => handleMove(cat._id, "up")} disabled={idx === 0} title="Up"><FiArrowUp size={13} /></button>
                          <button className="cl-move" onClick={() => handleMove(cat._id, "down")} disabled={idx === filtered.length - 1} title="Down"><FiArrowDown size={13} /></button>
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="cl-edit-actions">
                            <button className="cl-act-btn cl-act-save" onClick={() => handleUpdate(cat._id)} disabled={saving}><FiCheck size={14} /></button>
                            <button className="cl-act-btn cl-act-cancel" onClick={handleCancelEdit}><FiX size={14} /></button>
                          </div>
                        ) : (
                          <div className="cl-default-actions">
                            <button className="cl-act-btn cl-act-edit" onClick={() => handleEdit(cat)} title="Edit"><FiEdit2 size={14} /></button>
                            <button className="cl-act-btn cl-act-del" onClick={() => setDelId(cat._id)} title="Delete"><FiTrash2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARD VIEW */
          <div className="cl-cards">
            {filtered.map((cat, idx) => {
              const isEditing = editId === cat._id;
              return (
                <div className={`cl-card ${isEditing ? "cl-card-editing" : ""}`} key={cat._id}>
                  <div className="cl-card-top">
                    <div className="cl-card-img" onClick={() => {
                      const src = isEditing && editPreview ? editPreview : cat.image;
                      if (src) setPreviewUrl(src);
                    }}>
                      {isEditing && editPreview ? (
                        <img src={editPreview} alt="New" />
                      ) : cat.image ? (
                        <img src={cat.image} alt={cat.name} />
                      ) : (
                        <div className="cl-card-img-empty"><FiImage size={22} /></div>
                      )}
                    </div>
                    <div className="cl-card-info">
                      {isEditing ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="cl-card-edit-input" placeholder="Category Name" />
                      ) : (
                        <h4 className="cl-card-name">{cat.name}</h4>
                      )}
                      <div className="cl-card-meta">
                        <span className="cl-card-products"><FiPackage size={11} /> {categoryCounts[cat._id] || 0} products</span>
                        {cat.link && !isEditing && <span className="cl-card-link"><FiLink size={11} /> {cat.link}</span>}
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="cl-card-edit-body">
                      <div className="cl-field">
                        <label className="cl-label"><FiLink size={12} /> Link</label>
                        <input type="text" value={editLink} onChange={(e) => setEditLink(e.target.value)} className="cl-input" placeholder="/page-link" />
                      </div>
                      <div className="cl-field">
                        <label className="cl-label"><FiImage size={12} /> Change Image</label>
                        <label className="cl-upload-zone cl-upload-sm">
                          <FiUpload size={14} />
                          <span className="cl-upload-text">{editImage ? editImage.name : "Upload WEBP"}</span>
                          <input type="file" accept=".webp,image/webp" onChange={(e) => handleFileChange(e, true)} />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="cl-card-foot">
                    <div className="cl-card-move">
                      <button className="cl-move" onClick={() => handleMove(cat._id, "up")} disabled={idx === 0}><FiArrowUp size={14} /></button>
                      <button className="cl-move" onClick={() => handleMove(cat._id, "down")} disabled={idx === filtered.length - 1}><FiArrowDown size={14} /></button>
                    </div>
                    {isEditing ? (
                      <div className="cl-card-edit-btns">
                        <button className="cl-cedit-save" onClick={() => handleUpdate(cat._id)} disabled={saving}><FiCheck size={14} /> Save</button>
                        <button className="cl-cedit-cancel" onClick={handleCancelEdit}><FiX size={14} /></button>
                      </div>
                    ) : (
                      <div className="cl-card-act-btns">
                        <button className="cl-card-act cl-card-edit" onClick={() => handleEdit(cat)}><FiEdit2 size={14} /> Edit</button>
                        <button className="cl-card-act cl-card-delete" onClick={() => setDelId(cat._id)}><FiTrash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="cl-footer"><p>© {new Date().getFullYear()} BafnaToys Category Management</p></footer>
    </div>
  );
};

export default CategoryList;