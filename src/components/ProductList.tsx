import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiEdit2, FiTrash2, FiPlus, FiSearch, FiX, FiCheck,
  FiArrowUp, FiArrowDown, FiChevronDown, FiChevronUp,
  FiAlertCircle, FiCheckCircle, FiMenu, FiPackage,
  FiRefreshCw, FiGrid, FiList, FiFilter, FiSliders,
  FiHash, FiCopy, FiBox, FiTag, FiDollarSign, FiLayers,
  FiImage, FiMinimize2, FiMaximize2, FiShield, FiKey,
  FiStar, FiMonitor, FiSmartphone, FiLayout, FiAlertTriangle, FiCheckSquare
} from "react-icons/fi";
import "../styles/ProductList.css";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (process as any).env?.VITE_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_BASE =
  (import.meta as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.VITE_MEDIA_URL ||
  (process as any).env?.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  price?: number | string;
  mrp?: number | string;
  stock?: number;
  unit?: string;
  innerQty?: number;
  category?: { _id: string; name: string };
  createdAt?: string;
  images?: string[];
  order?: number;
}

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_BASE}${url}` : "";

const norm = (v?: string) => (v || "").toString().toLowerCase().trim();

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // View Modes
  const [view, setView] = useState<"table" | "card">("table");
  const [listMode, setListMode] = useState<"global" | "category">("global");
  const [gridPC, setGridPC] = useState(5);
  const [gridMobile, setGridMobile] = useState(2);

  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  // Selection State for Bulk Move to Top
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editingCategory, setEditingCategory] = useState<{
    productId: string;
    categoryId: string;
  } | null>(null);

  const [delId, setDelId] = useState<string | null>(null);
  const [delPwd, setDelPwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto switch view on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setView("card");
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, gridRes] = await Promise.all([
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/categories`),
        axios.get(`${API_BASE}/grid-layout`).catch(() => ({ data: {} }))
      ]);
      const sorted = prodRes.data.sort(
        (a: Product, b: Product) => (a.order || 0) - (b.order || 0)
      );
      setProducts(sorted);
      setCategories(catRes.data);
      
      if (gridRes.data?.pcColumns) setGridPC(gridRes.data.pcColumns);
      if (gridRes.data?.mobileColumns) setGridMobile(gridRes.data.mobileColumns);
      
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Save Grid Settings
  const saveGridSettings = async (pc: number, mobile: number) => {
    setGridPC(pc);
    setGridMobile(mobile);
    try {
      await axios.put(`${API_BASE}/grid-layout`, { pcColumns: pc, mobileColumns: mobile });
      import("react-hot-toast").then(({ default: toast }) => toast.success("Grid Layout Updated!"));
    } catch (err) {
      import("react-hot-toast").then(({ default: toast }) => toast.error("Failed to save layout to DB"));
    }
  };

  // Stats
  const stats = useMemo(() => {
    let outOfStock = 0, lowStock = 0, inStock = 0;
    products.forEach((p) => {
      const s = p.stock || 0;
      if (s === 0) outOfStock++;
      else if (s <= 5) lowStock++;
      else inStock++;
    });
    return {
      total: products.length,
      categories: new Set(products.map((p) => p.category?.name || "Uncategorized")).size,
      outOfStock, lowStock, inStock,
    };
  }, [products]);

  // Flat Filtered Products
  const flatFilteredProducts = useMemo(() => {
    const q = norm(debounced);
    let filtered = !q
      ? products
      : products.filter((p) => {
          const n = norm(p.name);
          const s = norm(p.sku);
          const c = norm(p.category?.name);
          return n.includes(q) || s.includes(q) || c.includes(q);
        });

    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => (p.category?.name || "Uncategorized") === categoryFilter);
    }
    if (stockFilter === "out") filtered = filtered.filter((p) => (p.stock || 0) === 0);
    else if (stockFilter === "low") filtered = filtered.filter((p) => { const s = p.stock || 0; return s > 0 && s <= 5; });
    else if (stockFilter === "in") filtered = filtered.filter((p) => (p.stock || 0) > 5);

    return filtered;
  }, [products, debounced, categoryFilter, stockFilter]);

  // Grouped Products
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    flatFilteredProducts.forEach((p) => {
      const cat = p.category?.name || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [flatFilteredProducts]);

  const totalFiltered = flatFilteredProducts.length;
  const hasActiveFilters = search || categoryFilter !== "all" || stockFilter !== "all";

  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setStockFilter("all"); };

  // ════════════════════════════════════════════════════════════
  // ✅ FIXED: SELECTION AND BULK MOVE TO TOP LOGIC
  // ════════════════════════════════════════════════════════════
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const moveSelectedToTop = async () => {
    if (selectedIds.length === 0) return;

    setProducts((prev) => {
      let updatedPayload: Product[] = [];
      const copy = [...prev];

      if (listMode === "global") {
        // GLOBAL MODE: Absolute top of all products
        const selected = copy.filter(p => selectedIds.includes(p._id));
        const unselected = copy.filter(p => !selectedIds.includes(p._id));
        const newOrder = [...selected, ...unselected];
        updatedPayload = newOrder.map((p, i) => ({ ...p, order: i }));
      } else {
        // CATEGORY MODE: Top of their respective categories ONLY
        updatedPayload = [...copy];
        
        // Group by category to process individually
        const groups: Record<string, Product[]> = {};
        updatedPayload.forEach(p => {
          const cId = p.category?._id || "unassigned";
          if (!groups[cId]) groups[cId] = [];
          groups[cId].push(p);
        });

        Object.keys(groups).forEach(cId => {
          const groupProducts = groups[cId];
          const hasSelected = groupProducts.some(p => selectedIds.includes(p._id));
          
          if (hasSelected) {
            // Keep original order values to maintain global bounds
            const originalOrders = groupProducts.map(p => p.order || 0).sort((a, b) => a - b);
            
            const selectedInGroup = groupProducts.filter(p => selectedIds.includes(p._id));
            const unselectedInGroup = groupProducts.filter(p => !selectedIds.includes(p._id));
            const newGroupOrder = [...selectedInGroup, ...unselectedInGroup];
            
            newGroupOrder.forEach((p, i) => {
              p.order = originalOrders[i];
              const globalIdx = updatedPayload.findIndex(up => up._id === p._id);
              if (globalIdx !== -1) updatedPayload[globalIdx].order = p.order;
            });
          }
        });

        // Re-sort payload by updated order
        updatedPayload.sort((a, b) => (a.order || 0) - (b.order || 0));
      }

      // Fire API asynchronously
      axios.put(`${API_BASE}/products/reorder`, {
        products: updatedPayload.map((p) => ({ _id: p._id, order: p.order }))
      }).then(() => {
        import("react-hot-toast").then(({ default: toast }) => toast.success(`${selectedIds.length} items moved to top!`));
        setSelectedIds([]); 
      }).catch(() => {
        import("react-hot-toast").then(({ default: toast }) => toast.error("Sync failed, refreshing..."));
        fetchData();
      });

      return updatedPayload;
    });
  };
  // ════════════════════════════════════════════════════════════

  // Delete Handlers
  const handleDelete = async (id: string) => setDelId(id);
  const confirmDelete = async () => {
    if (delPwd !== "bafnatoys") {
      return import("react-hot-toast").then(({ default: toast }) => toast.error("Wrong password"));
    }
    if (!delId) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/products/${delId}`);
      setProducts((prev) => prev.filter((p) => p._id !== delId));
      import("react-hot-toast").then(({ default: toast }) =>
        toast.success("Product deleted", { icon: "🗑️", style: { borderRadius: "12px", background: "#1e293b", color: "#fff" } })
      );
    } catch (err: any) {
      import("react-hot-toast").then(({ default: toast }) =>
        toast.error(err.response?.data?.message || "Failed to delete")
      );
    } finally {
      setDeleting(false); setDelId(null); setDelPwd("");
    }
  };

  // Category change
  const saveCategoryChange = async (productId: string) => {
    const product = products.find((p) => p._id === productId);
    const newCategoryId = editingCategory?.categoryId;
    if (!product || !newCategoryId || newCategoryId === product.category?._id) { setEditingCategory(null); return; }
    try {
      const newCategory = categories.find((c) => c._id === newCategoryId);
      setProducts((prev) =>
        prev.map((p) => p._id === productId ? { ...p, category: { _id: newCategoryId, name: newCategory?.name || "—" } } : p)
      );
      await axios.put(`${API_BASE}/products/${productId}`, { category: newCategoryId });
      setEditingCategory(null);
    } catch {
      import("react-hot-toast").then(({ default: toast }) => toast.error("Failed to update category"));
      setEditingCategory(null);
    }
  };

  // Move via Arrows
  const moveProduct = async (id: string, direction: "up" | "down") => {
    try {
      const res = await axios.put(`${API_BASE}/products/${id}/move`, { direction });
      if (res.data.updatedCategoryProducts) {
        const updated = res.data.updatedCategoryProducts;
        setProducts((prev) => {
          const newList = prev.map((p) => {
            const match = updated.find((u: Product) => u._id === p._id);
            return match ? { ...p, order: match.order } : p;
          });
          return newList.sort((a, b) => (a.order || 0) - (b.order || 0));
        });
      }
    } catch {
      import("react-hot-toast").then(({ default: toast }) => toast.error("Failed to move product"));
    }
  };

  // Shared Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id); e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      const row = document.getElementById(`row-${id}`);
      if (row) row.classList.add("pl-dragging");
    }, 0);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (dragOverItem !== id) setDragOverItem(id);
  };
  const handleDragLeave = () => setDragOverItem(null);
  const handleDragEnd = (id: string) => {
    setDraggedItem(null); setDragOverItem(null);
    const row = document.getElementById(`row-${id}`);
    if (row) row.classList.remove("pl-dragging");
  };

  // Drop Category Mode
  const handleDropCategory = async (e: React.DragEvent, targetId: string, catName: string) => {
    e.preventDefault(); setDragOverItem(null);
    if (!draggedItem || draggedItem === targetId) { setDraggedItem(null); return; }

    const group = groupedProducts[catName];
    const draggedIdx = group.findIndex((p) => p._id === draggedItem);
    const targetIdx = group.findIndex((p) => p._id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) { setDraggedItem(null); return; }

    const newGroup = [...group];
    const [draggedObj] = newGroup.splice(draggedIdx, 1);
    newGroup.splice(targetIdx, 0, draggedObj);

    const originalOrders = group.map(p => p.order || 0).sort((a,b) => a - b);
    const updatedPayload = newGroup.map((p, i) => ({ ...p, order: originalOrders[i] }));

    setProducts(prev => {
      const copy = [...prev];
      updatedPayload.forEach(upd => {
        const idx = copy.findIndex(p => p._id === upd._id);
        if(idx !== -1) copy[idx].order = upd.order;
      });
      return copy.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    setDraggedItem(null);
    try {
      await axios.put(`${API_BASE}/products/reorder`, {
        products: updatedPayload.map(p => ({ _id: p._id, order: p.order }))
      });
    } catch { fetchData(); }
  };

  // Drop Global Mode
  const handleDropGlobal = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); setDragOverItem(null);
    if (!draggedItem || draggedItem === targetId) { setDraggedItem(null); return; }

    const draggedIdx = flatFilteredProducts.findIndex((p) => p._id === draggedItem);
    const targetIdx = flatFilteredProducts.findIndex((p) => p._id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) { setDraggedItem(null); return; }

    const newVisualOrder = [...flatFilteredProducts];
    const [draggedObj] = newVisualOrder.splice(draggedIdx, 1);
    newVisualOrder.splice(targetIdx, 0, draggedObj);

    const updatedPayload = newVisualOrder.map((p, index) => ({ ...p, order: index }));
    setProducts(updatedPayload);
    setDraggedItem(null);

    try {
      await axios.put(`${API_BASE}/products/reorder`, {
        products: updatedPayload.map((p) => ({ _id: p._id, order: p.order }))
      });
    } catch { fetchData(); }
  };

  const toggleExpand = (catName: string) => setExpanded((prev) => ({ ...prev, [catName]: !prev[catName] }));
  const expandAll = () => { const all: Record<string, boolean> = {}; Object.keys(groupedProducts).forEach((k) => (all[k] = true)); setExpanded(all); };
  const collapseAll = () => setExpanded({});
  const allExpanded = Object.keys(groupedProducts).length > 0 && Object.keys(groupedProducts).every((k) => expanded[k]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    import("react-hot-toast").then(({ default: toast }) =>
      toast.success(`${label} copied!`, { duration: 1500, icon: "📋", style: { borderRadius: "12px", background: "#1e293b", color: "#fff", fontSize: "14px" } })
    );
  };

  // =========================================================================
  // RENDER FRONTEND LIVE PREVIEW CARD (GLOBAL VIEW)
  // =========================================================================
  const renderFrontendCard = (p: Product) => {
    const stock = p.stock || 0;
    const price = Number(p.price || 0);
    const mrp = Number(p.mrp || price * 1.5); 
    const discount = Math.round(((mrp - price) / mrp) * 100);
    const isDragging = draggedItem === p._id;
    const isDragOver = dragOverItem === p._id;
    const isSelected = selectedIds.includes(p._id);

    return (
      <div 
        key={p._id} 
        id={`row-${p._id}`}
        className={`frontend-mock-card ${isDragging ? "dragging" : ""} ${isDragOver && !isDragging ? "drag-over" : ""} ${isSelected ? "selected" : ""}`}
        draggable={!search}
        onDragStart={(e) => handleDragStart(e, p._id)}
        onDragOver={(e) => handleDragOver(e, p._id)}
        onDrop={(e) => handleDropGlobal(e, p._id)}
        onDragEnd={() => handleDragEnd(p._id)}
      >
        <div className="f-card-badges">
          {/* Checkbox */}
          <input 
            type="checkbox" 
            className="pl-checkbox-custom" 
            checked={isSelected} 
            onChange={() => toggleSelection(p._id)} 
            onClick={(e) => e.stopPropagation()} 
          />
          <div style={{display: 'flex', gap: '6px'}}>
            {discount > 0 && <span className="f-discount">⚡ {discount}% OFF</span>}
            {mrp > price && <span className="f-mrp">MRP<br/>₹{mrp}</span>}
          </div>
        </div>
        
        <div className="f-card-img">
          {p.images?.[0] ? <img src={getImageUrl(p.images[0])} alt={p.name} draggable="false" /> : <FiImage size={40} color="#cbd5e1" />}
        </div>

        <div className="f-card-body">
          <div className="f-card-meta">
            <span className="f-min-qty"><FiAlertCircle size={10}/> Min: {p.innerQty || 3}</span>
            {stock > 0 ? <span className="f-in-stock"><FiCheckCircle size={10}/> In Stock</span> : <span className="f-out-stock">Out of Stock</span>}
          </div>
          
          <h4 className="f-card-title">{p.name}</h4>
          
          <div className="f-card-rating">
            <span className="f-star">5.0 <FiStar size={10} fill="currentColor"/></span>
            <span className="f-rev-count">(12 Reviews)</span>
          </div>

          <div className="f-card-tags">
            <span className="f-tag-yellow"><FiTag size={10}/> Per Packet Price</span>
            <span className="f-tag-blue"><FiPackage size={10}/> Per packet {p.innerQty || 6} pcs</span>
          </div>

          <div className="f-card-footer">
            <span className="f-price">₹{price}</span>
            <div className="f-admin-actions">
              <Link to={`/admin/products/edit/${p._id}`} className="f-btn-edit"><FiEdit2 size={14}/></Link>
              <button onClick={(e) => { e.stopPropagation(); setDelId(p._id); }} className="f-btn-del"><FiTrash2 size={14}/></button>
            </div>
          </div>
          
          <div className="f-card-add-btn">
            <FiMenu size={14} /> Drag to Move
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER STANDARD CATEGORY VIEW (TABLE OR CARD)
  // =========================================================================
  const renderCategoryItem = (p: Product, index: number, catName: string, listLength: number) => {
    const isEditing = editingCategory?.productId === p._id;
    const currentCat = p.category?._id || "";
    const stock = p.stock || 0;
    const unitLabel = p.unit || "Units";
    const isDragging = draggedItem === p._id;
    const isDragOver = dragOverItem === p._id;
    const isFirst = index === 0;
    const isLast = index === listLength - 1;
    const isSelected = selectedIds.includes(p._id);

    if (view === "table") {
      return (
        <tr
          key={p._id} id={`row-${p._id}`}
          className={`pl-tr ${isDragging ? "pl-dragging" : ""} ${isDragOver && !isDragging ? "pl-drag-over" : ""} ${isSelected ? "pl-tr-selected" : ""}`}
          draggable={!search}
          onDragStart={(e) => handleDragStart(e, p._id)}
          onDragOver={(e) => handleDragOver(e, p._id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropCategory(e, p._id, catName)}
          onDragEnd={() => handleDragEnd(p._id)}
        >
          {/* Checkbox */}
          <td className="pl-td-check">
            <input 
              type="checkbox" 
              className="pl-checkbox-custom" 
              checked={isSelected} 
              onChange={() => toggleSelection(p._id)} 
            />
          </td>
          <td className="pl-td-drag"><FiMenu className="pl-drag-handle" size={16} title={search ? "Clear search to reorder" : "Drag to reorder"} /></td>
          <td className="pl-td-num">{index + 1}</td>
          <td className="pl-td-img">{p.images?.[0] ? <img src={getImageUrl(p.images[0])} alt={p.name} className="pl-thumb" /> : <div className="pl-thumb pl-thumb-empty"><FiImage size={18} /></div>}</td>
          <td><div className="pl-td-name"><span className="pl-product-name">{p.name}</span><span className="pl-product-sku pl-mobile-sku">{p.sku}</span></div></td>
          <td className="pl-th-hide-sm"><span className="pl-sku-badge" onClick={() => copy(p.sku, "SKU")}>{p.sku}<FiCopy size={10} className="pl-sku-copy" /></span></td>
          <td>{stock === 0 ? <span className="pl-stock pl-stock-out"><FiAlertCircle size={12} /> Out</span> : stock <= 5 ? <span className="pl-stock pl-stock-low"><FiAlertTriangle size={12} /> {stock} {unitLabel}</span> : <span className="pl-stock pl-stock-ok"><FiCheckCircle size={12} /> {stock} {unitLabel}</span>}</td>
          <td className="pl-th-hide-md">
            <div className="pl-cat-select-wrap">
              <select value={isEditing ? editingCategory.categoryId : currentCat} onChange={(e) => setEditingCategory({ productId: p._id, categoryId: e.target.value })} className="pl-cat-select">
                <option value="">Select</option>
                {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
              {isEditing && editingCategory.categoryId !== currentCat && (<button onClick={() => saveCategoryChange(p._id)} className="pl-cat-save" title="Save"><FiCheck size={14} /></button>)}
            </div>
          </td>
          <td><span className="pl-price">{p.price ? `₹${Number(p.price).toLocaleString()}` : "—"}</span></td>
          <td>
            <div className="pl-actions">
              <div className="pl-move-btns">
                <button onClick={(e) => { e.stopPropagation(); moveProduct(p._id, "up"); }} disabled={isFirst} className="pl-move" title="Move Up"><FiArrowUp size={13} /></button>
                <button onClick={(e) => { e.stopPropagation(); moveProduct(p._id, "down"); }} disabled={isLast} className="pl-move" title="Move Down"><FiArrowDown size={13} /></button>
              </div>
              <Link to={`/admin/products/edit/${p._id}`} className="pl-act-btn pl-act-edit" title="Edit"><FiEdit2 size={14} /></Link>
              <button onClick={() => handleDelete(p._id)} className="pl-act-btn pl-act-del" title="Delete"><FiTrash2 size={14} /></button>
            </div>
          </td>
        </tr>
      );
    } else {
      return (
        <div 
          className={`pl-card ${isDragging ? "dragging" : ""} ${isDragOver && !isDragging ? "drag-over" : ""} ${isSelected ? "selected" : ""}`} 
          key={p._id}
          draggable={!search}
          onDragStart={(e) => handleDragStart(e, p._id)}
          onDragOver={(e) => handleDragOver(e, p._id)}
          onDrop={(e) => handleDropCategory(e, p._id, catName)}
          onDragEnd={() => handleDragEnd(p._id)}
        >
          {/* Checkbox */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
            <input 
              type="checkbox" 
              className="pl-checkbox-custom" 
              checked={isSelected} 
              onChange={() => toggleSelection(p._id)} 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>

          <div className="pl-card-top" style={{ cursor: 'grab' }}>
            <div className="pl-card-img">{p.images?.[0] ? <img src={getImageUrl(p.images[0])} alt={p.name} draggable="false" /> : <div className="pl-card-img-empty"><FiImage size={24} /></div>}</div>
            <div className="pl-card-info">
              <h4 className="pl-card-name">{p.name}</h4>
              <div className="pl-card-meta">
                <span className="pl-card-sku" onClick={() => copy(p.sku, "SKU")}><FiHash size={11} /> {p.sku} <FiCopy size={9} /></span>
                <span className="pl-card-cat"><FiTag size={11} /> {p.category?.name || "Uncategorized"}</span>
              </div>
            </div>
          </div>
          <div className="pl-card-body">
            <div className="pl-card-fields">
              <div className="pl-card-field"><div className="pl-cf-icon price"><FiDollarSign size={14} /></div><div className="pl-cf-content"><label>Price</label><span className="pl-cf-val">{p.price ? `₹${Number(p.price).toLocaleString()}` : "—"}</span></div></div>
              <div className="pl-card-field">
                <div className={`pl-cf-icon ${stock === 0 ? "out" : stock <= 5 ? "low" : "ok"}`}>{stock === 0 ? <FiAlertCircle size={14} /> : stock <= 5 ? <FiAlertTriangle size={14} /> : <FiCheckCircle size={14} />}</div>
                <div className="pl-cf-content"><label>Stock</label><span className="pl-cf-val">{stock === 0 ? "Out of Stock" : `${stock} ${unitLabel}`}</span></div>
              </div>
            </div>
          </div>
          <div className="pl-card-actions">
            <div className="pl-card-move">
              <button onClick={() => moveProduct(p._id, "up")} disabled={isFirst} className="pl-move" title="Up"><FiArrowUp size={14} /></button>
              <button onClick={() => moveProduct(p._id, "down")} disabled={isLast} className="pl-move" title="Down"><FiArrowDown size={14} /></button>
            </div>
            <Link to={`/admin/products/edit/${p._id}`} className="pl-card-act pl-card-edit"><FiEdit2 size={14} /><span>Edit</span></Link>
            <button onClick={() => handleDelete(p._id)} className="pl-card-act pl-card-delete"><FiTrash2 size={14} /><span>Delete</span></button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={`pl-root ${search ? "pl-searching" : ""}`} ref={topRef}>
      
      {/* Dynamic Grid Styles & Selection Styles */}
      <style>
        {`
          .frontend-grid-preview {
            display: grid;
            gap: 16px;
            padding: 10px;
            grid-template-columns: repeat(${gridPC}, 1fr);
          }
          @media (max-width: 768px) {
            .frontend-grid-preview {
              grid-template-columns: repeat(${gridMobile}, 1fr);
            }
          }
          .frontend-mock-card.dragging, .pl-card.dragging { opacity: 0.4; }
          .frontend-mock-card.drag-over, .pl-card.drag-over { border: 2px dashed #6366f1; }
          
          /* Selection Checkbox Styles */
          .pl-checkbox-custom { width: 18px; height: 18px; cursor: pointer; accent-color: #4f46e5; }
          .frontend-mock-card.selected, .pl-card.selected { border: 2px solid #4f46e5; background: #f5f3ff; }
          .pl-tr-selected { background: #f5f3ff !important; }
          .pl-th-check, .pl-td-check { width: 30px; text-align: center; padding-left: 10px; }
        `}
      </style>

      {/* Delete Modal */}
      {delId && (
        <div className="pl-overlay" onClick={() => { setDelId(null); setDelPwd(""); }}>
          <div className="pl-del-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pl-del-visual"><div className="pl-del-circle"><div className="pl-del-circle-inner"><FiShield size={28} /></div></div><div className="pl-del-pulse" /></div>
            <h3>Delete Product</h3>
            <p>This action is <strong>permanent</strong> and cannot be undone.<br />Enter admin password to confirm.</p>
            <div className="pl-del-input-wrap">
              <FiKey className="pl-del-input-icon" />
              <input type="password" placeholder="Enter admin password…" value={delPwd} onChange={(e) => setDelPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmDelete()} autoFocus />
            </div>
            <div className="pl-del-btns">
              <button className="pl-dbtn pl-dbtn-cancel" onClick={() => { setDelId(null); setDelPwd(""); }}>Cancel</button>
              <button className="pl-dbtn pl-dbtn-danger" onClick={confirmDelete} disabled={deleting}><FiTrash2 size={14} /> {deleting ? "Deleting…" : "Delete Forever"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <section className="pl-top">
        <div className="pl-top-row">
          <div className="pl-top-left">
            <h1 className="pl-title">Products</h1>
            <span className="pl-count">{stats.total} items</span>
          </div>
          <div className="pl-top-right">
            <button className="pl-top-btn" onClick={fetchData} disabled={loading} title="Refresh"><FiRefreshCw size={16} className={loading ? "pl-spinning" : ""} /></button>
            <button className="pl-top-btn pl-top-add" onClick={() => navigate("/admin/products/new")}><FiPlus size={16} /><span>Add Product</span></button>
          </div>
        </div>
      </section>

      {/* Toolbar & Grid Controller */}
      <section className="pl-toolbar-section">
        <div className="pl-toolbar">
          <div className="pl-toolbar-main">
            <div className="pl-search">
              <FiSearch className="pl-search-icon" />
              <input ref={searchRef} placeholder="Search by name, SKU, or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="pl-search-clear" onClick={() => { setSearch(""); searchRef.current?.focus(); }}><FiX size={14} /></button>}
            </div>
            
            <div className="pl-toolbar-btns">
              <button className={`pl-tbtn ${showFilters ? "active" : ""} ${hasActiveFilters ? "has-filters" : ""}`} onClick={() => setShowFilters(!showFilters)}>
                <FiSliders size={15} /><span>Filters</span>{hasActiveFilters && <span className="pl-filter-dot" />}
              </button>
              
              <div className="pl-view-toggle" style={{ marginLeft: '10px' }}>
                <button className={`pl-vt ${listMode === "global" ? "active" : ""}`} onClick={() => {setListMode("global"); setSelectedIds([]);}} style={{width: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: 500}}>Live Preview</button>
                <button className={`pl-vt ${listMode === "category" ? "active" : ""}`} onClick={() => {setListMode("category"); setSelectedIds([]);}} style={{width: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: 500}}>Categories</button>
                
                {listMode === "category" && (
                  <>
                    <div style={{width: '1px', background: 'var(--pl-border)', height: '16px', margin: '0 8px'}}></div>
                    <button className={`pl-vt ${view === "table" ? "active" : ""}`} onClick={() => setView("table")} title="Table"><FiList size={15} /></button>
                    <button className={`pl-vt ${view === "card" ? "active" : ""}`} onClick={() => setView("card")} title="Cards"><FiGrid size={15} /></button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Grid Layout Setup (Only visible in Global Mode) */}
          {listMode === "global" && (
            <div style={{ background: '#f8fafc', padding: '10px 15px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <strong style={{ color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <FiLayout size={16} /> Frontend Grid Setup
              </strong>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiMonitor size={14} color="#64748b"/>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>PC:</span>
                <select value={gridPC} onChange={(e) => saveGridSettings(Number(e.target.value), gridMobile)} style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Columns</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiSmartphone size={14} color="#64748b"/>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Mobile:</span>
                <select value={gridMobile} onChange={(e) => saveGridSettings(gridPC, Number(e.target.value))} style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  {[1, 2, 3].map(n => <option key={n} value={n}>{n} Columns</option>)}
                </select>
              </div>
            </div>
          )}

          {/* BULK ACTION BAR */}
          {selectedIds.length > 0 && (
            <div style={{ background: '#eef2ff', padding: '12px 15px', borderTop: '2px solid #818cf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'pl-fadeIn 0.2s' }}>
              <strong style={{ color: '#4f46e5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiCheckSquare size={16} /> {selectedIds.length} Products Selected
              </strong>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSelectedIds([])} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>Cancel</button>
                <button onClick={moveSelectedToTop} style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)' }}>
                  <FiArrowUp size={14} /> Move to Top
                </button>
              </div>
            </div>
          )}

          {/* Filters Dropdown */}
          <div className={`pl-filters ${showFilters ? "open" : ""}`}>
            <div className="pl-filters-inner">
              <div className="pl-filter-group">
                <label><FiTag size={12} /> Category</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="pl-filter-group">
                <label><FiBox size={12} /> Stock</label>
                <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
                  <option value="all">All Stock</option>
                  <option value="in">In Stock (&gt;5)</option>
                  <option value="low">Low Stock (1-5)</option>
                  <option value="out">Out of Stock</option>
                </select>
              </div>
              {hasActiveFilters && <button className="pl-clear-filters" onClick={clearFilters}><FiX size={13} /> Clear</button>}
            </div>
          </div>

          {/* Info */}
          <div className="pl-toolbar-info">
            <div className="pl-showing">
              <span className="pl-showing-bold">{totalFiltered}</span> products
              {hasActiveFilters && <span className="pl-showing-sub"> (filtered from {stats.total})</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="pl-main">
        {loading ? (
          <div className="pl-state">
            <div className="pl-loader"><div className="pl-loader-ring" /><div className="pl-loader-ring" /><div className="pl-loader-ring" /></div>
            <h3>Loading Products</h3><p>Please wait…</p>
          </div>
        ) : error ? (
          <div className="pl-state pl-state-error">
            <div className="pl-state-icon error"><FiAlertCircle size={28} /></div>
            <h3>Something went wrong</h3><p>{error}</p>
            <button className="pl-retry-btn" onClick={fetchData}><FiRefreshCw size={14} /> Try Again</button>
          </div>
        ) : totalFiltered === 0 ? (
          <div className="pl-state pl-state-empty">
            <div className="pl-state-icon empty"><FiSearch size={28} /></div>
            <h3>No products found</h3><p>Try adjusting your search or filters</p>
            {hasActiveFilters && <button className="pl-retry-btn" onClick={clearFilters}><FiX size={14} /> Clear All Filters</button>}
          </div>
        ) : listMode === "global" ? (
          /* ===== GLOBAL VIEW (Frontend Live Preview) ===== */
          <div className="pl-category pl-cat-open" style={{ padding: '10px' }}>
            <div className="frontend-grid-preview">
              {flatFilteredProducts.map((p) => renderFrontendCard(p))}
            </div>
          </div>
        ) : (
          /* ===== CATEGORY VIEW (Grouped Standard Tables/Cards) ===== */
          Object.keys(groupedProducts).map((catName) => {
            const catProducts = groupedProducts[catName];
            const isOpen = expanded[catName];

            return (
              <div className={`pl-category ${isOpen ? "pl-cat-open" : ""}`} key={catName}>
                <div className="pl-cat-header" onClick={() => toggleExpand(catName)}>
                  <div className="pl-cat-header-left">
                    <div className="pl-cat-icon"><FiLayers size={16} /></div>
                    <h2>{catName}</h2>
                    <span className="pl-cat-count">{catProducts.length}</span>
                  </div>
                  <div className="pl-cat-header-right">{isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}</div>
                </div>

                {isOpen && (
                  <div className="pl-cat-content">
                    {view === "table" ? (
                      <div className="pl-table-wrap">
                        <table className="pl-table">
                          <thead>
                            <tr>
                              <th className="pl-th-check">
                                <input 
                                  type="checkbox" 
                                  className="pl-checkbox-custom"
                                  onChange={(e) => {
                                    if(e.target.checked) {
                                      // Only select from currently visible filtered items
                                      const newIds = new Set([...selectedIds, ...catProducts.map(p => p._id)]);
                                      setSelectedIds(Array.from(newIds));
                                    } else {
                                      // Unselect only these category items
                                      const catIds = catProducts.map(p => p._id);
                                      setSelectedIds(selectedIds.filter(id => !catIds.includes(id)));
                                    }
                                  }}
                                  checked={catProducts.every(p => selectedIds.includes(p._id)) && catProducts.length > 0}
                                />
                              </th>
                              <th className="pl-th-drag"></th>
                              <th className="pl-th-num">#</th>
                              <th className="pl-th-img">Image</th>
                              <th>Name</th>
                              <th className="pl-th-hide-sm">SKU</th>
                              <th>Stock</th>
                              <th className="pl-th-hide-md">Category</th>
                              <th>Price</th>
                              <th className="pl-th-actions">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catProducts.map((p, i) => renderCategoryItem(p, i, catName, catProducts.length))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="pl-cards">
                        {catProducts.map((p, i) => renderCategoryItem(p, i, catName, catProducts.length))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <footer className="pl-footer"><p>© {new Date().getFullYear()} BafnaToys Product Management</p></footer>
    </div>
  );
}