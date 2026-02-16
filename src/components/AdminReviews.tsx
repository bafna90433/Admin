import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FiTrash2, FiStar, FiMessageSquare, FiBox, FiUser, FiCalendar } from "react-icons/fi";
import "../styles/AdminReviews.css"; 

// ✅ Ensure API base matches your local backend port
const API_BASE = "http://localhost:5000/api"; 

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      // ✅ Fetching all reviews with populated product data
      const res = await axios.get(`${API_BASE}/reviews/all/list`);
      setReviews(res.data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      Swal.fire("Error", "Failed to load reviews. Make sure backend is running on port 5000", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete permanently?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_BASE}/reviews/${id}`);
        Swal.fire({
          title: "Deleted!",
          text: "Review has been removed.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
        fetchReviews(); 
      } catch (error) {
        Swal.fire("Error", "Failed to delete review", "error");
      }
    }
  };

  return (
    <div className="admin-reviews-page">
      <div className="ar-header">
        <div className="ar-title-block">
          <h2>
            <FiMessageSquare className="ar-icon" /> Shop Feedback Management
          </h2>
          <p>Monitor and moderate feedback provided by registered shops</p>
        </div>
        <div className="ar-badge">
          Total Feedbacks: <span>{reviews.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="ar-loading">
            <div className="spinner"></div>
            <p>Gathering feedback data...</p>
        </div>
      ) : (
        <div className="ar-table-container">
          <table className="ar-table">
            <thead>
              <tr>
                <th>Product Details</th>
                <th>Registered Shop</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Submission Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ar-empty">
                    No feedbacks found in the database.
                  </td>
                </tr>
              ) : (
                reviews.map((review: any) => (
                  <tr key={review._id}>
                    <td className="ar-product-cell">
                      <div className="product-info">
                        <FiBox className="product-icon" />
                        <span>{review.productId?.name || <em className="deleted-text">Product Removed</em>}</span>
                      </div>
                    </td>

                    {/* ✅ HIGHLIGHTED: Shop Name Integration */}
                    <td className="ar-customer-cell">
                      <div className="ar-user-highlight">
                        <FiUser className="ar-user-icon" />
                        <strong>{review.shopName}</strong>
                      </div>
                    </td>

                    <td>
                      <div className="ar-rating">
                        {review.rating} <FiStar className="star-icon" />
                      </div>
                    </td>

                    <td className="ar-comment-cell">
                      <div className="comment-text" title={review.comment}>
                        {review.comment}
                      </div>
                    </td>

                    <td className="ar-date-cell">
                      <div className="date-info">
                        <FiCalendar size={14} />
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    <td className="ar-action-cell">
                      <button
                        onClick={() => handleDelete(review._id)}
                        className="ar-delete-btn"
                        title="Delete Review"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;