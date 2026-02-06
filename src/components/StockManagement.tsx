import React, { useEffect, useState } from "react";
import api, { MEDIA_URL } from "../utils/api";
import Swal from "sweetalert2";
import { 
  FiBox, FiRefreshCw, FiAlertCircle, FiSearch, FiEdit2, FiCheck, FiX, FiZoomIn, FiChevronLeft, FiChevronRight
} from "react-icons/fi";
import "../styles/ProductList.css";

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_URL}${url}` : "";

interface StockItem {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  unit: string;
  image?: string;
  totalSold: number;
}

const StockManagement: React.FC = () => {
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Edit & Modal State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ stock: 0, unit: "" });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get("/products"),
        api.get("/orders").catch(() => ({ data: [] }))
      ]);

      const products = productsRes.data || [];
      const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders || []);

      const salesMap: Record<string, number> = {};

      if (Array.isArray(orders)) {
        orders.forEach((order: any) => {
            const orderItems = order.items || order.orderItems || []; 
            
            if (order.status !== 'Cancelled' && Array.isArray(orderItems)) {
                orderItems.forEach((item: any) => {
                    const rawId = item.productId || item.product;
                    const itemId = typeof rawId === 'object' ? rawId?._id : rawId;
                    
                    if (itemId) {
                        const idStr = String(itemId);
                        salesMap[idStr] = (salesMap[idStr] || 0) + (Number(item.qty) || 0);
                    }
                });
            }
        });
      }

      const stats = products.map((prod: any) => ({
        _id: prod._id,
        name: prod.name,
        sku: prod.sku,
        stock: prod.stock || 0,
        unit: prod.unit || "", 
        image: prod.images?.[0] || "",
        totalSold: salesMap[String(prod._id)] || 0
      }));

      setInventory(stats);
      // Filtered inventory useEffect se set hoga
    } catch (err) {
      console.error("Failed to load inventory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // ✅ Page Reset Logic (Sirf search badalne par Page 1 karega)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ✅ Filtering Logic (Inventory update hone par list refresh karega bina page change kiye)
  useEffect(() => {
    if (!searchQuery) {
      setFilteredInventory(inventory);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      const filtered = inventory.filter(item => 
        item.name.toLowerCase().includes(lowerQ) || 
        item.sku.toLowerCase().includes(lowerQ)
      );
      setFilteredInventory(filtered);
    }
  }, [searchQuery, inventory]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  // Edit Handlers
  const startEditing = (item: StockItem) => {
    setEditingId(item._id);
    setEditForm({ stock: item.stock, unit: item.unit });
  };

  const cancelEditing = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    try {
        // Optimistic UI Update
        const updatedInventory = inventory.map(item => 
            item._id === id ? { ...item, stock: editForm.stock, unit: editForm.unit } : item
        );
        
        setInventory(updatedInventory);
        setEditingId(null);
        
        await api.put(`/products/${id}`, { stock: editForm.stock, unit: editForm.unit });
        
        Swal.fire({
            icon: 'success',
            title: 'Updated!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    } catch (err) {
        Swal.fire('Error', 'Failed to update', 'error');
        fetchStockData(); // Revert on error
    }
  };

  return (
    <div className="product-list-container">
      {/* Header */}
      <div className="product-list-header" style={{ flexDirection: 'column', gap: '15px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="header-content">
            <h1>📊 Stock Management</h1>
            <p>Total Products: {filteredInventory.length}</p>
            </div>
            <button className="add-product-button" onClick={fetchStockData}>
                <FiRefreshCw /> Refresh
            </button>
        </div>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input 
                type="text" 
                placeholder="Search Product..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
            />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>Loading inventory...</div>
      ) : (
        <>
        <div className="table-container" style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee', textAlign: 'left', color: '#555' }}>
                <th style={{ padding: '15px' }}>Product</th>
                <th style={{ padding: '15px' }}>Unit Type</th>
                <th style={{ padding: '15px' }}>Current Stock</th>
                <th style={{ padding: '15px' }}>Total Sold</th>
                <th style={{ padding: '15px' }}>Status</th>
                <th style={{ padding: '15px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item._id} style={{ borderBottom: '1px solid #eee' }}>
                  
                  {/* Image & Name */}
                  <td style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => item.image && setPreviewImage(getImageUrl(item.image))}
                    >
                        {item.image ? (
                            <img src={getImageUrl(item.image)} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '4px', display:'flex', alignItems:'center', justifyContent:'center' }}><FiBox /></div>
                        )}
                        {item.image && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="hover:opacity-100"><FiZoomIn color="white" /></div>}
                    </div>
                    <div>
                        <div style={{ fontWeight: '600', color: '#333' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#777' }}>{item.sku}</div>
                    </div>
                  </td>
                  
                  {/* Editable Unit with Temporary 'S' Fix */}
                  <td style={{ padding: '12px 15px' }}>
                    {editingId === item._id ? (
                        <input 
                            type="text" 
                            value={editForm.unit} 
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                            style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #3b82f6' }}
                        />
                    ) : (
                        item.unit ? (
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
                                {/* ✅ TEMPORARY LOGIC: Auto-Add 's' if missing */}
                                {item.unit}{!item.unit.toLowerCase().endsWith('s') && "s"}
                            </span>
                        ) : <span style={{ color: '#aaa' }}>—</span>
                    )}
                  </td>

                  {/* Editable Stock */}
                  <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>
                    {editingId === item._id ? (
                        <input 
                            type="number" 
                            value={editForm.stock} 
                            onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                            style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #3b82f6' }}
                        />
                    ) : ( item.stock )}
                  </td>

                  <td style={{ padding: '12px 15px', color: '#2563eb', fontWeight: 'bold' }}>{item.totalSold}</td>

                  {/* Status Logic */}
                  <td style={{ padding: '12px 15px' }}>
                    {item.stock === 0 ? (
                        <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}><FiAlertCircle /> Out</span>
                    ) : item.stock < 10 ? (
                        <span style={{ color: '#d97706', fontSize: '0.85rem' }}>Low</span>
                    ) : (
                        <span style={{ color: '#059669', fontSize: '0.85rem' }}>Good</span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td style={{ padding: '12px 15px' }}>
                    {editingId === item._id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => saveEdit(item._id)} style={{ color: '#10b981', border: 'none', background: 'none', cursor: 'pointer' }} title="Save"><FiCheck size={18} /></button>
                            <button onClick={cancelEditing} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }} title="Cancel"><FiX size={18} /></button>
                        </div>
                    ) : (
                        <button onClick={() => startEditing(item)} style={{ color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer' }} title="Edit"><FiEdit2 size={18} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>No inventory found.</div>}
        </div>

        {/* Pagination Controls */}
        {filteredInventory.length > itemsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '15px' }}>
                <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', background: currentPage === 1 ? '#f5f5f5' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                    <FiChevronLeft />
                </button>
                <span style={{ fontSize: '0.9rem', color: '#555' }}>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
                <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', background: currentPage === totalPages ? '#f5f5f5' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                    <FiChevronRight />
                </button>
            </div>
        )}
        </>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setPreviewImage(null)}>
            <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px' }} />
                <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: 'white', borderRadius: '50%', width: '30px', height: '30px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={20} /></button>
            </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;