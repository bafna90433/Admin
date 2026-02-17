import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { 
  FiTrash2, FiSearch, FiFilter, FiStar, FiMessageSquare, 
  FiBox, FiCalendar, FiAlertCircle, FiEye 
} from "react-icons/fi";
import "../styles/AdminReviews.css";

interface Review {
  _id: string;
  productId?: {
    name: string;
    image?: string;
  };
  shopName?: string;
  userId?: {
    name?: string;
    shopName?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<number | "all">("all");

  useEffect(() => {
    fetchReviews();
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

  // ✅ NEW FEATURE: View Full Comment
  const handleViewComment = (comment: string, author: string) => {
    Swal.fire({
      title: `Review from ${author}`,
      text: comment,
      icon: "info",
      confirmButtonText: "Close",
      confirmButtonColor: "#4f46e5",
      customClass: {
        popup: 'comment-popup' // Custom class for styling if needed
      }
    });
  };

  const getShopName = (review: Review) => {
    return review.shopName || review.userId?.shopName || review.userId?.name || "Unknown Shop";
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
        
        {/* HEADER */}
        <header className="ar-header">
          <div className="ar-header-content">
            <h1><FiMessageSquare className="ar-brand-icon" /> Feedback Center</h1>
            <p>Manage and moderate shop reviews efficiently.</p>
          </div>
          <div className="ar-stats-card">
            <span className="stat-label">Total Reviews</span>
            <span className="stat-value">{reviews.length}</span>
          </div>
        </header>

        {/* CONTROLS */}
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

        {/* TABLE */}
        <div className="ar-table-wrapper">
          <table className="ar-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Shop</th>
                <th style={{ width: '20%' }}>Product</th>
                <th style={{ width: '15%' }}>Rating</th>
                <th style={{ width: '30%' }}>Comment</th> 
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
                  // ✅ TRUNCATE LOGIC
                  const isLongComment = review.comment.length > 60;
                  const displayComment = isLongComment 
                    ? review.comment.substring(0, 60) + "..." 
                    : review.comment;

                  return (
                    <tr key={review._id}>
                      <td>
                        <div className="shop-profile">
                           {/* Avatar Logic */}
                          <div className="shop-avatar" style={{ backgroundColor: '#4f46e5' }}>
                            {shopName.charAt(0).toUpperCase()}
                          </div>
                          <span className="shop-name">{shopName}</span>
                        </div>
                      </td>
                      <td>{review.productId?.name || <span className="text-danger">Removed</span>}</td>
                      
                      <td>
                        <div className="rating-badge" data-rating={Math.floor(review.rating)}>
                          <span>{review.rating}</span> <FiStar className="star-filled" />
                        </div>
                      </td>

                      {/* ✅ COMMENT COLUMN UPDATE */}
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
                            day: '2-digit', month: 'short'
                        })}
                      </td>

                      <td className="text-right">
                        <button className="btn-icon-delete" onClick={() => handleDelete(review._id)}>
                          <FiTrash2 />
                        </button>
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