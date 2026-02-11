import React, { useEffect, useMemo, useState } from "react";
import axios from "axios"; // ✅ Changed: Import axios directly
import "../styles/AdminHomeBuilder.css";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

// --- ICONS ---
const Icons = {
  Home: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Trend: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
  Grid: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Fire: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>,
  Save: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  Trash: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Plus: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Check: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
};

// --- TYPES ---
type Product = { _id: string; name: string; price: number; images?: string[]; image?: string; };
type Category = { _id: string; name: string; image?: string; };
type TrendingSection = { title: string; productIds: string[]; };
type HotDealItem = { productId: string; endsAt: string | null; discountType: "NONE" | "PERCENT" | "FLAT"; discountValue: number; };

type HomeConfig = {
  trendingSections: TrendingSection[];
  bannerImage?: string;
  bannerLink?: string;
  popularTitle?: string;
  popularSubtitle?: string;
  popularCategoryIds: string[];
  hotDealsEnabled?: boolean;
  hotDealsPageEnabled?: boolean;
  hotDealsTitle?: string;
  hotDealsItems?: HotDealItem[];
  hotDealsEndsAt?: string | null;
  hotDealsProductIds?: string[];
};

// --- NORMALIZER ---
const normalizeCfg = (data: any): HomeConfig => ({
  trendingSections: Array.isArray(data?.trendingSections) ? data.trendingSections.map((s: any) => ({ title: s.title || "", productIds: Array.isArray(s?.productIds) ? s.productIds.map(String) : [] })) : [],
  bannerImage: data?.bannerImage || "",
  bannerLink: data?.bannerLink || "",
  popularTitle: data?.popularTitle || "Popular Categories",
  popularSubtitle: data?.popularSubtitle || "Browse our top collections",
  popularCategoryIds: Array.isArray(data?.popularCategoryIds) ? data.popularCategoryIds.map(String) : [],
  hotDealsEnabled: data?.hotDealsEnabled ?? true,
  hotDealsPageEnabled: data?.hotDealsPageEnabled ?? true,
  hotDealsTitle: data?.hotDealsTitle || "Deals Of The Day",
  
  hotDealsItems: Array.isArray(data?.hotDealsItems) ? data.hotDealsItems.map((x: any) => ({ 
      productId: String(x.productId), 
      endsAt: x.endsAt || null, 
      discountType: (x.discountType && ["PERCENT", "FLAT"].includes(x.discountType.toUpperCase())) ? x.discountType.toUpperCase() : "NONE", 
      discountValue: Number(x.discountValue) || 0 
  })).filter((x: any) => x.productId) : [],
  
  hotDealsEndsAt: data?.hotDealsEndsAt ? String(data.hotDealsEndsAt) : null,
  hotDealsProductIds: Array.isArray(data?.hotDealsProductIds) ? data.hotDealsProductIds.map(String) : [],
});

// ✅ HELPER: Convert ISO (UTC) to Local "YYYY-MM-DDTHH:mm" for Input
const toLocalInputDate = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
};

const AdminHomeBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"banner" | "trending" | "categories" | "hotdeals">("banner");
    
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cfg, setCfg] = useState<HomeConfig>(normalizeCfg({}));
    
  const [newTrendTitle, setNewTrendTitle] = useState("");
  const [activeTrendIndex, setActiveTrendIndex] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Changed: Using axios with API_BASE
        const [pRes, cRes, cfgRes] = await Promise.all([
            axios.get(`${API_BASE}/products`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/categories`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/home-config`).catch(() => ({ data: null }))
        ]);
        
        setProducts(Array.isArray(pRes.data?.products) ? pRes.data.products : Array.isArray(pRes.data) ? pRes.data : []);
        setCategories(Array.isArray(cRes.data?.categories) ? cRes.data.categories : Array.isArray(cRes.data) ? cRes.data : []);
        
        if (cfgRes.data) {
          setCfg(normalizeCfg(cfgRes.data));
          setIsNew(false);
        } else {
          setIsNew(true);
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())), [search, products]);
  const filteredCategories = useMemo(() => categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())), [search, categories]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = normalizeCfg({ ...cfg, hotDealsProductIds: (cfg.hotDealsItems || []).map(x => x.productId) });
      
      // ✅ Changed: Using axios with API_BASE
      const res = isNew 
        ? await axios.post(`${API_BASE}/home-config`, payload) 
        : await axios.put(`${API_BASE}/home-config`, payload);

      setCfg(normalizeCfg(res.data));
      setIsNew(false);
      alert("✅ Configuration Saved Successfully!");
    } catch (e: any) { alert("Save failed: " + e.message); }
    finally { setSaving(false); }
  };

  const uploadBanner = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("images", file);
      
      // ✅ Changed: Using axios with API_BASE
      const { data } = await axios.post(`${API_BASE}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      
      const url = data?.urls?.[0] || data?.url || "";
      if (url) setCfg(p => ({ ...p, bannerImage: url }));
    } catch (e) { alert("Upload failed"); }
    finally { setUploading(false); }
  };

  // ... (Rest of the Logic functions remain the same) ...
  const addTrendSection = () => {
    if (!newTrendTitle.trim()) return;
    setCfg(p => ({ ...p, trendingSections: [...p.trendingSections, { title: newTrendTitle, productIds: [] }] }));
    setNewTrendTitle("");
    setActiveTrendIndex(cfg.trendingSections.length);
  };
    
  const toggleTrendProduct = (pid: string) => {
    const sections = [...cfg.trendingSections];
    const section = sections[activeTrendIndex];
    if (!section) return;
    const exists = section.productIds.includes(pid);
    if (exists) section.productIds = section.productIds.filter(id => id !== pid);
    else if (section.productIds.length < 6) section.productIds.push(pid);
    setCfg(p => ({ ...p, trendingSections: sections }));
  };

  const toggleCategory = (id: string) => {
    const ids = cfg.popularCategoryIds.includes(id) 
      ? cfg.popularCategoryIds.filter(x => x !== id) 
      : [...cfg.popularCategoryIds, id];
    setCfg(p => ({ ...p, popularCategoryIds: ids }));
  };

  const toggleHotDeal = (pid: string) => {
    const items = [...(cfg.hotDealsItems || [])];
    const exists = items.find(x => x.productId === pid);
    if (exists) setCfg(p => ({ ...p, hotDealsItems: items.filter(x => x.productId !== pid) }));
    else if (items.length < 12) setCfg(p => ({ ...p, hotDealsItems: [...items, { productId: pid, endsAt: null, discountType: 'NONE', discountValue: 0 }] }));
  };

  const updateDealItem = (pid: string, patch: Partial<HotDealItem>) => {
    setCfg(p => ({ ...p, hotDealsItems: p.hotDealsItems?.map(it => it.productId === pid ? { ...it, ...patch } : it) }));
  };

  // --- RENDER (Same as before) ---
  return (
    <div className="pro-builder">
      <header className="pro-header">
        <div>
          <h1>Home Configuration</h1>
          <p>Manage app layout, banners, and deals.</p>
        </div>
        <button className="pro-btn primary" onClick={handleSave} disabled={saving}>
          <Icons.Save /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </header>

      <div className="pro-tabs">
        <button className={activeTab === 'banner' ? 'active' : ''} onClick={() => setActiveTab('banner')}><Icons.Home /> Banner & Basic</button>
        <button className={activeTab === 'trending' ? 'active' : ''} onClick={() => {setActiveTab('trending'); setSearch("");}}><Icons.Trend /> Trending Sections</button>
        <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => {setActiveTab('categories'); setSearch("");}}><Icons.Grid /> Popular Categories</button>
        <button className={activeTab === 'hotdeals' ? 'active' : ''} onClick={() => {setActiveTab('hotdeals'); setSearch("");}}><Icons.Fire /> Hot Deals</button>
      </div>

      <div className="pro-content">
        
        {/* TAB 1: BANNER */}
        {activeTab === 'banner' && (
          <div className="pro-grid-layout">
            <div className="pro-card">
              <h3>Main Banner</h3>
              <div className="pro-upload-zone">
                {cfg.bannerImage ? (
                  <img src={cfg.bannerImage} alt="Banner" className="banner-preview" />
                ) : (
                  <div className="placeholder">No Banner Uploaded</div>
                )}
                <div className="upload-actions">
                  <input type="file" id="b-up" hidden onChange={e => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
                  <label htmlFor="b-up" className="pro-btn secondary">{uploading ? "Uploading..." : "Upload New Image"}</label>
                  {cfg.bannerImage && <button className="pro-btn danger-text" onClick={() => setCfg(p => ({...p, bannerImage: ""}))}>Remove</button>}
                </div>
              </div>
              <div className="pro-field">
                <label>Banner Click Link (Optional)</label>
                <input value={cfg.bannerLink} onChange={e => setCfg(p => ({...p, bannerLink: e.target.value}))} placeholder="e.g. /category/shoes" />
              </div>
            </div>
            
            <div className="pro-card">
              <h3>Popular Categories Title</h3>
              <div className="pro-field">
                <label>Section Title</label>
                <input value={cfg.popularTitle} onChange={e => setCfg(p => ({...p, popularTitle: e.target.value}))} />
              </div>
              <div className="pro-field">
                <label>Subtitle</label>
                <input value={cfg.popularSubtitle} onChange={e => setCfg(p => ({...p, popularSubtitle: e.target.value}))} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRENDING */}
        {activeTab === 'trending' && (
          <div className="pro-split-view">
            <div className="pro-sidebar">
              <h3>Sections</h3>
              <div className="add-group">
                <input value={newTrendTitle} onChange={e => setNewTrendTitle(e.target.value)} placeholder="New Section Name" />
                <button className="pro-icon-btn" onClick={addTrendSection}><Icons.Plus /></button>
              </div>
              <div className="section-list">
                {cfg.trendingSections.map((s, i) => (
                  <div key={i} className={`section-item ${activeTrendIndex === i ? 'active' : ''}`} onClick={() => setActiveTrendIndex(i)}>
                    <span>{s.title}</span>
                    <span className="count badge">{s.productIds.length}/6</span>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); const n = [...cfg.trendingSections]; n.splice(i, 1); setCfg(p => ({...p, trendingSections: n})); }}><Icons.Trash /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pro-main-area">
              <div className="area-header">
                <h3>Editing: <span className="highlight">{cfg.trendingSections[activeTrendIndex]?.title || "Select a section"}</span></h3>
                <input className="search-input" placeholder="Search products to add..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              
              {cfg.trendingSections[activeTrendIndex] ? (
                <div className="product-grid-compact">
                  {filteredProducts.map(p => {
                      const isSelected = cfg.trendingSections[activeTrendIndex].productIds.includes(p._id);
                      return (
                        <div key={p._id} className={`product-chip ${isSelected ? 'selected' : ''}`} onClick={() => toggleTrendProduct(p._id)}>
                          <img src={p.images?.[0] || p.image} alt="" />
                          <div className="info">
                            <div className="name">{p.name}</div>
                            <div className="price">₹{p.price}</div>
                          </div>
                          {isSelected && <div className="check"><Icons.Check /></div>}
                        </div>
                      )
                  })}
                </div>
              ) : <div className="empty-state">Select or create a section on the left.</div>}
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="pro-card">
              <div className="area-header">
                <h3>Select Categories to Display</h3>
                <input className="search-input" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="category-grid">
                {filteredCategories.map(c => {
                  const active = cfg.popularCategoryIds.includes(c._id);
                  return (
                    <button key={c._id} className={`cat-btn ${active ? 'active' : ''}`} onClick={() => toggleCategory(c._id)}>
                       {active && <Icons.Check />}
                       {c.name}
                    </button>
                  )
                })}
              </div>
          </div>
        )}

        {/* TAB 4: HOT DEALS */}
        {activeTab === 'hotdeals' && (
          <div className="pro-split-view">
             <div className="pro-main-area">
               
               <div className="pro-card mb-4" style={{flexShrink: 0}}>
                 <div className="flex-row">
                   <div className="pro-field">
                     <label>Enable Hot Deals?</label>
                     <select className="compact-input" value={cfg.hotDealsEnabled ? "yes" : "no"} onChange={e => setCfg(p => ({...p, hotDealsEnabled: e.target.value === "yes"}))}>
                       <option value="yes">Enabled</option>
                       <option value="no">Disabled</option>
                     </select>
                   </div>
                   <div className="pro-field">
                     <label>Title</label>
                     <input className="compact-input" value={cfg.hotDealsTitle} onChange={e => setCfg(p => ({...p, hotDealsTitle: e.target.value}))} />
                   </div>
                 </div>
               </div>

               <div className="pro-table-wrapper">
                 <table className="pro-table">
                   <thead>
                     <tr>
                       <th style={{width: '35%'}}>Product</th>
                       <th style={{width: '20%'}}>Ends At</th>
                       <th style={{width: '15%'}}>Type</th>
                       <th style={{width: '15%'}}>Value</th>
                       <th style={{width: '10%', textAlign: 'center'}}>Action</th>
                     </tr>
                   </thead>
                   <tbody>
                     {(cfg.hotDealsItems || []).map(item => {
                       const prod = products.find(p => p._id === item.productId);
                       return (
                         <tr key={item.productId}>
                           <td>
                             <div className="table-prod">
                               <img src={prod?.images?.[0] || prod?.image} alt="" />
                               <span>{prod?.name || "Unknown"}</span>
                             </div>
                           </td>
                           <td>
                             <input type="datetime-local" className="compact-input" 
                               value={toLocalInputDate(item.endsAt)}
                               onChange={e => {
                                 const newVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                 updateDealItem(item.productId, { endsAt: newVal });
                               }}
                             />
                           </td>
                           <td>
                             <select className="compact-input" value={item.discountType} onChange={e => updateDealItem(item.productId, { discountType: e.target.value as any })}>
                               <option value="NONE">None</option>
                               <option value="PERCENT">% Off</option>
                               <option value="FLAT">Flat ₹</option>
                             </select>
                           </td>
                           <td>
                             <input type="number" className="compact-input" style={{width: 60}} value={item.discountValue} onChange={e => updateDealItem(item.productId, { discountValue: Number(e.target.value) })} />
                           </td>
                           <td style={{textAlign: 'center'}}>
                             <button className="pro-icon-btn danger" onClick={() => toggleHotDeal(item.productId)}><Icons.Trash /></button>
                           </td>
                         </tr>
                       )
                     })}
                     {(!cfg.hotDealsItems || cfg.hotDealsItems.length === 0) && (
                       <tr><td colSpan={5} style={{textAlign:'center', padding: 30, color:'#999'}}>No deals selected. Add products from the right.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>

             <div className="pro-sidebar right">
               <h3 style={{padding: '16px', margin:0, borderBottom:'1px solid #e5e7eb', fontSize:'15px'}}>Add Products</h3>
               <div style={{padding: 10}}>
                   <input className="compact-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
               </div>
               <div className="product-list-simple">
                 {filteredProducts.map(p => {
                    const active = (cfg.hotDealsItems || []).some(x => x.productId === p._id);
                    return (
                      <button key={p._id} className={`simple-prod-btn ${active ? 'active' : ''}`} onClick={() => toggleHotDeal(p._id)}>
                        <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth: '180px'}}>{p.name}</span>
                        {active ? <Icons.Check /> : <Icons.Plus />}
                      </button>
                    )
                 })}
               </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminHomeBuilder;