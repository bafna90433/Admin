import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { 
  FiTrash2, FiSearch, FiFilter, FiStar, FiMessageSquare, 
  FiPlus, FiX, FiEdit2, FiBox, FiChevronDown, FiCalendar
} from "react-icons/fi";
import "../styles/AdminReviews.css";

// CONFIGURATION
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_BASE =
  process.env.VITE_MEDIA_URL ||
  process.env.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

const getImageUrl = (url: string) =>
  url?.startsWith("http") ? url : url ? `${MEDIA_BASE}${url}` : "";

interface Product {
  _id: string;
  name: string;
  images?: string[]; 
}

interface Review {
  _id: string;
  productId?: {
    _id: string;
    name: string;
    images?: string[]; 
  };
  shopName?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<number | "all">("all");

  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [newReview, setNewReview] = useState({
    productId: "",
    shopName: "",
    rating: 5,
    comment: "",
    createdAt: getTodayDate()
  });

  useEffect(() => {
    fetchReviews();
    fetchProductsForDropdown();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/reviews/all/list`);
      setReviews(res.data);
    } catch (error) {
      console.error("Error:", error);
      Swal.fire("Error", "Could not load reviews.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsForDropdown = async () => {
    try {
      const res = await axios.get(`${API_BASE}/products`); 
      setProductsList(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Review?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Delete",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_BASE}/reviews/${id}`);
        Swal.fire("Deleted", "Review removed.", "success");
        setReviews((prev) => prev.filter((r) => r._id !== id));
      } catch (error) {
        Swal.fire("Error", "Failed to delete.", "error");
      }
    }
  };

  const handleEditClick = (review: Review) => {
    setIsEditing(true);
    setEditId(review._id);
    
    const formattedDate = review.createdAt ? new Date(review.createdAt).toISOString().split('T')[0] : getTodayDate();

    setNewReview({
      productId: review.productId?._id || "",
      shopName: review.shopName || "",
      rating: review.rating,
      comment: review.comment,
      createdAt: formattedDate 
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.productId) {
      Swal.fire("Warning", "Please select a product first!", "warning");
      return;
    }

    try {
      if (isEditing && editId) {
        await axios.put(`${API_BASE}/reviews/${editId}`, newReview);
        Swal.fire("Success", "Review updated successfully!", "success");
      } else {
        await axios.post(`${API_BASE}/reviews/add`, newReview);
        Swal.fire("Success", "Review added successfully!", "success");
      }
      
      setNewReview({ productId: "", shopName: "", rating: 5, comment: "", createdAt: getTodayDate() });
      setShowAddForm(false);
      setIsEditing(false);
      setEditId(null);
      setIsDropdownOpen(false); 
      
      fetchReviews();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", `Failed to ${isEditing ? 'update' : 'add'} review.`, "error");
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setIsEditing(false);
    setEditId(null);
    setIsDropdownOpen(false);
    setNewReview({ productId: "", shopName: "", rating: 5, comment: "", createdAt: getTodayDate() });
  };

  const handleViewComment = (comment: string, author: string) => {
    Swal.fire({
      title: `Review from ${author}`,
      text: comment,
      icon: "info",
      confirmButtonText: "Close",
      confirmButtonColor: "#4f46e5",
      customClass: { popup: 'comment-popup' }
    });
  };

  const getShopName = (review: Review) => {
    return review.shopName || "Unknown Shop";
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const shopName = getShopName(review).toLowerCase();
      const productName = review.productId?.name?.toLowerCase() || "";
      const comment = review.comment.toLowerCase();
      const matchSearch = shopName.includes(searchTerm.toLowerCase()) || 
                          productName.includes(searchTerm.toLowerCase()) ||
                          comment.includes(searchTerm.toLowerCase());
      const matchRating = filterRating === "all" ? true : Math.floor(review.rating) === filterRating;
      return matchSearch && matchRating;
    });
  }, [reviews, searchTerm, filterRating]);

  return (
    <div className="admin-reviews-page">
      <div className="ar-container">
        
        <header className="ar-header">
          <div className="ar-header-content">
            <h1><FiMessageSquare className="ar-brand-icon" /> Feedback Center</h1>
            <p>Manage, add, and update custom shop reviews efficiently.</p>
          </div>
          <div className="ar-stats-card flex gap-4">
            <div>
              <span className="stat-label">Total</span>
              <span className="stat-value">{reviews.length}</span>
            </div>
            <button 
              onClick={showAddForm ? handleCancelForm : () => setShowAddForm(true)}
              style={{ backgroundColor: showAddForm ? '#ef4444' : '#4f46e5', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              {showAddForm ? <><FiX /> Cancel</> : <><FiPlus /> Add Review</>}
            </button>
          </div>
        </header>

        {showAddForm && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: isEditing ? '2px solid #3b82f6' : 'none' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.2rem', fontWeight: 'bold', color: isEditing ? '#3b82f6' : '#000' }}>
              {isEditing ? "✏️ Edit Review" : "Add Custom Review"}
            </h3>
            <form onSubmit={handleAdminSubmit} style={{ display: 'grid', gap: '15px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Select Product</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '42px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {newReview.productId ? (
                           productsList.find(p => p._id === newReview.productId)?.images?.[0] ? 
                             <img src={getImageUrl(productsList.find(p => p._id === newReview.productId)!.images![0])} style={{width: 24, height: 24, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0'}} alt="thumb" /> 
                             : <FiBox color="#94a3b8" />
                        ) : null}
                        <span style={{ color: newReview.productId ? '#0f172a' : '#94a3b8', fontSize: '14px' }}>
                          {newReview.productId ? productsList.find(p => p._id === newReview.productId)?.name : "-- Select a Product --"}
                        </span>
                      </div>
                      <FiChevronDown style={{ color: '#94a3b8' }} />
                    </div>

                    {isDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', maxHeight: '250px', overflowY: 'auto', zIndex: 50, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', marginTop: '4px' }}>
                        {productsList.map(prod => (
                           <div 
                             key={prod._id}
                             onClick={() => { setNewReview({...newReview, productId: prod._id}); setIsDropdownOpen(false); }}
                             style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                           >
                             {prod.images?.[0] ? (
                               <img src={getImageUrl(prod.images[0])} alt="img" style={{width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0'}} />
                             ) : (
                               <div style={{width: 32, height: 32, backgroundColor: '#f8fafc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0'}}>
                                 <FiBox size={16} color="#94a3b8"/>
                               </div>
                             )}
                             <span style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>{prod.name}</span>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Shop Name</label>
                  <input type="text" required value={newReview.shopName} onChange={(e) => setNewReview({...newReview, shopName: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="e.g. Ramesh Toys" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  {/* ✅ FIX APPLIED HERE: Only one 'display: flex' */}
                  <label style={{ display: 'flex', fontSize: '0.9rem', marginBottom: '5px', alignItems: 'center', gap: '4px' }}>
                    <FiCalendar /> Review Date
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={newReview.createdAt} 
                    onChange={(e) => setNewReview({...newReview, createdAt: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', fontFamily: 'inherit' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Rating (1-5)</label>
                  <select value={newReview.rating} onChange={(e) => setNewReview({...newReview, rating: Number(e.target.value)})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Bad</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Comment</label>
                <textarea required value={newReview.comment} onChange={(e) => setNewReview({...newReview, comment: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', minHeight: '80px' }} placeholder="Write a nice review..."></textarea>
              </div>

              <button type="submit" style={{ backgroundColor: isEditing ? '#3b82f6' : '#10b981', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                {isEditing ? "Update Review" : "Submit Review"}
              </button>
            </form>
          </div>
        )}

        <div className="ar-controls">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-box">
            <FiFilter className="filter-icon" />
            <select 
              value={filterRating} 
              onChange={(e) => setFilterRating(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐</option>
              <option value="4">⭐⭐⭐⭐</option>
              <option value="3">⭐⭐⭐</option>
              <option value="2">⭐⭐</option>
              <option value="1">⭐</option>
            </select>
          </div>
        </div>

        <div className="ar-table-wrapper">
          <table className="ar-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Shop</th>
                <th style={{ width: '25%' }}>Product</th>
                <th style={{ width: '12%' }}>Rating</th>
                <th style={{ width: '28%' }}>Comment</th> 
                <th style={{ width: '10%' }}>Date</th>
                <th style={{ width: '5%' }} className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="skeleton-bar"></div></td></tr>
                ))
              ) : filteredReviews.length === 0 ? (
                <tr><td colSpan={6} className="ar-empty-state">No reviews found.</td></tr>
              ) : (
                filteredReviews.map((review) => {
                  const shopName = getShopName(review);
                  const isLongComment = review.comment.length > 60;
                  const displayComment = isLongComment 
                    ? review.comment.substring(0, 60) + "..." 
                    : review.comment;

                  return (
                    <tr key={review._id}>
                      <td>
                        <div className="shop-profile">
                          <div className="shop-avatar" style={{ backgroundColor: '#4f46e5' }}>
                            {shopName.charAt(0).toUpperCase()}
                          </div>
                          <span className="shop-name">{shopName}</span>
                        </div>
                      </td>
                      
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {review.productId?.images?.[0] ? (
                            <img 
                              src={getImageUrl(review.productId.images[0])} 
                              alt="product" 
                              style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                            />
                          ) : (
                            <div style={{ width: '36px', height: '36px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                              <FiBox style={{ color: '#cbd5e1' }} />
                            </div>
                          )}
                          <span style={{ fontWeight: '500', color: '#334155' }}>
                            {review.productId?.name || <span className="text-danger">Removed</span>}
                          </span>
                        </div>
                      </td>
                      
                      <td>
                        <div className="rating-badge" data-rating={Math.floor(review.rating)}>
                          <span>{review.rating}</span> <FiStar className="star-filled" />
                        </div>
                      </td>

                      <td className="comment-cell">
                        <p className="comment-text">
                          {displayComment}
                        </p>
                        {isLongComment && (
                          <button 
                            className="read-more-link"
                            onClick={() => handleViewComment(review.comment, shopName)}
                          >
                            Read More
                          </button>
                        )}
                      </td>

                      <td>
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>

                      <td className="text-right">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleEditClick(review)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>
                            <FiEdit2 />
                          </button>
                          <button onClick={() => handleDelete(review._id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReviews;