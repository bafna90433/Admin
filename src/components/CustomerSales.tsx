import React, { useEffect, useState, useMemo, useRef } from "react";
import api, { MEDIA_URL } from "../utils/api";
import { 
  FiSearch, FiUser, FiEye, FiX, FiCalendar, FiMapPin, 
  FiMessageCircle, FiShare2, FiSend, FiEdit3, FiChevronDown 
} from "react-icons/fi";
import "../styles/ProductList.css"; 

// Helper for Image URL
const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_URL}${url}` : "";

// --- Types ---
interface ProductLite {
  _id: string;
  name: string;
  price: number;
  images: string[];
}

interface PurchasedItem {
  orderId: string;
  date: string;
  items: {
    name: string;
    qty: number;
    price: number;
    unit: string;
    image?: string;
  }[];
  total: number;
  status: string;
  paymentMode: string;
  shippingAddress?: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
}

interface CustomerStat {
  customerId: string;
  name: string;
  phone: string;
  state: string;
  totalSpent: number;
  totalOrders: number;
  lastOrderDate: Date;
  history: PurchasedItem[];
}

// --- WhatsApp Templates ---
const WA_TEMPLATES = {
  followup: "Hello {name}, checking regarding your recent orders at Bafna Toys. Is everything okay?",
  payment: "Hello {name}, this is a gentle reminder regarding the pending payment for your order. Please clear it soon.",
  offer: "Hello {name}! We have new stock and exclusive offers just for you. Check them out!",
  festival: "Happy Festivals {name}! 🎉 Wishing you prosperity and joy from Bafna Toys."
};

const CustomerSales: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerStat[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStat | null>(null);
  
  // Controls
  const [sortOption, setSortOption] = useState("highestSpent");
  const [waTemplate, setWaTemplate] = useState<keyof typeof WA_TEMPLATES>("followup");
  const [promoProduct, setPromoProduct] = useState<string>("");
  
  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Message Edit Modal State
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    text: string;
    phone: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
    
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: orders } = await api.get("/orders");
      const { data: productData } = await api.get("/products");
      
      setProducts(productData.reverse()); 

      const customerMap: Record<string, CustomerStat> = {};

      if (Array.isArray(orders)) {
        orders.forEach((order: any) => {
          if (!order.customerId) return; 

          const custId = order.customerId._id || "unknown";
          const custName = order.customerId.firmName || order.customerId.shopName || "Unknown";
          const custPhone = order.customerId.otpMobile || "N/A";
          const custState = order.shippingAddress?.state || order.customerId.state || "";
          const orderDate = new Date(order.createdAt);

          if (!customerMap[custId]) {
            customerMap[custId] = {
              customerId: custId,
              name: custName,
              phone: custPhone,
              state: custState,
              totalSpent: 0,
              totalOrders: 0,
              lastOrderDate: orderDate,
              history: []
            };
          }

          if (orderDate > customerMap[custId].lastOrderDate) {
            customerMap[custId].lastOrderDate = orderDate;
          }

          if (order.status !== "Cancelled") {
            customerMap[custId].totalSpent += order.total || 0;
            customerMap[custId].totalOrders += 1;
          }

          const itemsList = (order.items || order.orderItems || []).map((item: any) => ({
            name: item.name || "Product",
            qty: item.qty || 0,
            price: item.price || 0,
            unit: item.unit || "Unit",
            image: item.image || ""
          }));

          customerMap[custId].history.push({
            orderId: order.orderNumber,
            date: orderDate.toLocaleDateString("en-IN"),
            items: itemsList,
            total: order.total,
            status: order.status,
            paymentMode: order.paymentMode || "COD",
            shippingAddress: order.shippingAddress
          });
        });
      }
      setCustomers(Object.values(customerMap));
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const processedCustomers = useMemo(() => {
    let result = [...customers];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q) || 
        c.state.toLowerCase().includes(q)
      );
    }
    switch (sortOption) {
      case "highestSpent": result.sort((a, b) => b.totalSpent - a.totalSpent); break;
      case "mostOrders": result.sort((a, b) => b.totalOrders - a.totalOrders); break;
      case "latest": result.sort((a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime()); break;
      case "alpha": result.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return result;
  }, [customers, search, sortOption]);

  const selectedPromoObj = useMemo(() => 
    products.find(p => p._id === promoProduct), 
    [products, promoProduct]
  );

  const getCustomerBadge = (cust: CustomerStat) => {
    if (cust.totalSpent > 100000) return <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '8px' }}>🟢 VIP</span>;
    if (cust.totalOrders >= 5) return <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '8px' }}>🔵 Regular</span>;
    if (cust.totalOrders === 1) return <span style={{ background: '#f3f4f6', color: '#374151', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '8px' }}>⚪ New</span>;
    return null;
  };

  const handleGeneralMessage = (cust: CustomerStat) => {
    const text = WA_TEMPLATES[waTemplate as keyof typeof WA_TEMPLATES].replace("{name}", cust.name);
    setEditModal({ isOpen: true, text, phone: cust.phone, name: cust.name });
  };

  const handleProductPromo = (cust: CustomerStat) => {
    if (!promoProduct) {
      alert("Please select a product from the dropdown first.");
      return;
    }
    const product = selectedPromoObj;
    if (!product) return;

    // Use current timestamp to bust WhatsApp image cache
    const uniqueId = new Date().getTime(); 
    // Link format: https://bafnatoys.com/product/{id}?v={timestamp}
    const productLink = `https://bafnatoys.com/product/${product._id}?v=${uniqueId}`;
    
    const text = `Hello ${cust.name}! 🌟\n\nCheck out our New Arrival:\n*${product.name}*\nPrice: ₹${product.price}\n\n👇 View & Order Here:\n${productLink}`;

    setEditModal({ isOpen: true, text, phone: cust.phone, name: cust.name });
  };

  const sendWhatsApp = () => {
    if (!editModal) return;
    const url = `https://wa.me/91${editModal.phone.replace(/\D/g, '')}?text=${encodeURIComponent(editModal.text)}`;
    window.open(url, "_blank");
    setEditModal(null);
  };

  return (
    <div className="product-list-container">
      {/* Header code same as before... */}
      {/* (keeping all header logic, search, dropdowns intact) */}
      <div className="product-list-header" style={{ flexDirection: 'column', gap: '15px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div className="header-content">
            <h1>👥 Customer Sales Report</h1>
            <p>Analyze and engage with your customers</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="highestSpent">💰 Highest Spent</option>
              <option value="mostOrders">📦 Most Orders</option>
              <option value="latest">🕒 Latest Customer</option>
              <option value="alpha">🔤 Alphabetical</option>
            </select>

            <select 
              value={waTemplate} 
              onChange={(e) => setWaTemplate(e.target.value as any)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="followup">💬 Follow-up</option>
              <option value="payment">💳 Payment</option>
              <option value="offer">🎉 Offer</option>
              <option value="festival">🪔 Festival</option>
            </select>

            {/* Custom Image Product Selector */}
            <div className="custom-promo-dropdown" ref={dropdownRef} style={{ position: 'relative', minWidth: '240px' }}>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  padding: '8px 12px', borderRadius: '6px', border: '1px solid #eab308', 
                  background: '#fefce8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold'
                }}
              >
                {selectedPromoObj ? (
                  <>
                    <img src={getImageUrl(selectedPromoObj.images[0])} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                      {selectedPromoObj.name}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.85rem' }}>📢 Select Product</span>
                )}
                <FiChevronDown />
              </div>

              {isDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '110%', left: 0, right: 0, background: 'white', 
                  border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', 
                  maxHeight: '350px', overflowY: 'auto', zIndex: 1200
                }}>
                  {products.map(p => (
                    <div 
                      key={p._id}
                      onClick={() => { setPromoProduct(p._id); setIsDropdownOpen(false); }}
                      style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <img 
                        src={getImageUrl(p.images[0])} 
                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', background: '#eee' }} 
                        alt=""
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'bold' }}>₹{p.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="products-search" style={{ maxWidth: '100%' }}>
            <FiSearch className="products-search-icon" />
            <input 
              type="text" 
              placeholder="Search Customer..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>Loading data...</div>
      ) : (
        <div className="table-container">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left", color: "#555" }}>
                <th style={{ padding: "15px" }}>Customer</th>
                <th style={{ padding: "15px" }}>Quick Actions</th> 
                <th style={{ padding: "15px" }}>Location</th>
                <th style={{ padding: "15px" }}>Orders</th>
                <th style={{ padding: "15px" }}>Total Spent</th>
                <th style={{ padding: "15px" }}>History</th>
              </tr>
            </thead>
            <tbody>
              {processedCustomers.map((cust) => (
                <tr key={cust.customerId} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 15px", fontWeight: "600" }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '8px', borderRadius: '50%' }}><FiUser /></div>
                        <div>
                          {cust.name}
                          {getCustomerBadge(cust)}
                          <div style={{fontSize: '0.8rem', color: '#666', fontWeight: 'normal'}}>{cust.phone}</div>
                        </div>
                    </div>
                  </td>
                  
                  <td style={{ padding: "12px 15px" }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => handleGeneralMessage(cust)}
                            style={{ 
                                background: '#dcfce7', color: '#166534', padding: '6px 10px', 
                                borderRadius: '6px', border: '1px solid #bbf7d0', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap:'5px', fontSize:'0.8rem', fontWeight:'500' 
                            }}
                            title="Edit & Send Message"
                        >
                            <FiMessageCircle /> Msg
                        </button>

                        <button
                            onClick={() => handleProductPromo(cust)}
                            style={{ 
                                background: '#fef08a', color: '#854d0e', border: '1px solid #fde047', 
                                padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', 
                                display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: '500'
                            }}
                            title="Edit & Send Promotion"
                        >
                            <FiShare2 /> Promote
                        </button>
                    </div>
                  </td>

                  <td style={{ padding: "12px 15px" }}>{cust.state || "—"}</td>
                  <td style={{ padding: "12px 15px", fontWeight: "bold" }}>{cust.totalOrders}</td>
                  <td style={{ padding: "12px 15px", color: "#059669", fontWeight: "bold" }}>₹{cust.totalSpent.toLocaleString()}</td>
                  <td style={{ padding: "12px 15px" }}>
                    <button 
                      onClick={() => setSelectedCustomer(cust)}
                      style={{ background: "#eff6ff", color: "#2563eb", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                    >
                      <FiEye /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {processedCustomers.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>No records found.</div>}
        </div>
      )}

      {/* Message Edit Modal */}
      {editModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: '20px'
        }} onClick={() => setEditModal(null)}>
          <div style={{ 
              background: "white", width: "100%", maxWidth: "500px", borderRadius: "12px", 
              padding: "25px", display: "flex", flexDirection: "column", gap: "15px", 
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)" 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FiEdit3 /> Edit Message
              </h3>
              <button onClick={() => setEditModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><FiX size={24} /></button>
            </div>
            
            <div style={{ fontSize: "0.9rem", color: "#666" }}>
              Sending to: <strong>{editModal.name}</strong> ({editModal.phone})
            </div>

            {/* Product Quick Preview in Modal */}
            {selectedPromoObj && editModal.text.includes("Arrival") && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px dashed #22c55e' }}>
                <img src={getImageUrl(selectedPromoObj.images[0])} style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} alt=""/>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{selectedPromoObj.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#166534' }}>Price: ₹{selectedPromoObj.price}</div>
                </div>
              </div>
            )}

            <textarea 
              value={editModal.text}
              onChange={(e) => setEditModal({...editModal, text: e.target.value})}
              style={{ 
                width: "100%", height: "150px", padding: "12px", borderRadius: "8px", 
                border: "1px solid #ddd", fontSize: "0.95rem", resize: "vertical", fontFamily: "inherit" 
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button 
                onClick={() => setEditModal(null)} 
                style={{ 
                  padding: "10px 20px", borderRadius: "8px", border: "1px solid #ddd", 
                  background: "white", cursor: "pointer", fontWeight: "500" 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={sendWhatsApp} 
                style={{ 
                  padding: "10px 20px", borderRadius: "8px", border: "none", 
                  background: "#25D366", color: "white", cursor: "pointer", fontWeight: "bold", 
                  display: "flex", alignItems: "center", gap: "8px" 
                }}
              >
                <FiSend /> Send on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal with Address */}
      {selectedCustomer && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 1500,
          display: "flex", alignItems: "center", justifyContent: "center", padding: '20px'
        }} onClick={() => setSelectedCustomer(null)}>
          <div 
            style={{ background: "white", width: "100%", maxWidth: "800px", borderRadius: "12px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedCustomer.name}</h2>
                  <span style={{ fontSize: "0.9rem", color: "#666" }}>Total Orders: {selectedCustomer.totalOrders}</span>
              </div>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><FiX size={24} /></button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", background: "#f9fafb" }}>
                {selectedCustomer.history.map((order, idx) => (
                    <div key={idx} style={{ background: 'white', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px', marginBottom: '10px' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1f2937' }}>#{order.orderId}</div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                    <span><FiCalendar /> {order.date}</span>
                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: '600', fontSize: '0.75rem', background: order.paymentMode === 'ONLINE' ? '#dcfce7' : '#ffedd5', color: order.paymentMode === 'ONLINE' ? '#166534' : '#9a3412' }}>
                                        {order.paymentMode === 'ONLINE' ? 'PAID' : 'COD'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.1rem' }}>₹{order.total.toLocaleString()}</div>
                                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: order.status === 'Delivered' ? '#d1fae5' : '#f3f4f6', color: order.status === 'Delivered' ? '#065f46' : '#374151' }}>
                                    {order.status}
                                </span>
                            </div>
                        </div>

                        {/* ✅ Shipping Address Section */}
                        {order.shippingAddress && (
                            <div style={{ fontSize: '0.85rem', color: '#555', background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '12px', border: '1px dashed #ddd' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
                                    <FiMapPin /> Shipping Details
                                </div>
                                <div><strong>{order.shippingAddress.fullName}</strong></div>
                                <div>{order.shippingAddress.street}</div>
                                <div>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</div>
                            </div>
                        )}

                        {/* Items List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {order.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #eee' }}>
                                        {item.image ? (<img src={getImageUrl(item.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (<div style={{ width: '100%', height: '100%', background: '#f3f4f6' }} />)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', color: '#374151', fontWeight: '500' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.qty} {item.unit} x ₹{item.price}</div>
                                    </div>
                                    <div style={{ fontWeight: '600', color: '#1f2937' }}>₹{item.qty * item.price}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {selectedCustomer.history.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No purchase history found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSales;