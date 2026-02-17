import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FiTrash2, FiStar, FiMessageSquare, FiBox, FiUser, FiCalendar } from "react-icons/fi";
import "../styles/AdminReviews.css"; 

// ✅ FIX 1: Interface Define kiya taaki TypeScript ko data ka structure pata ho
interface Review {
  _id: string;
  productId?: {
    name: string;
  };
  shopName?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ✅ FIX 2: 'import.meta' hata diya, wapas 'process.env' lagaya jo aapke project me chalta hai
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const AdminReviews: React.FC = () => {
  // ✅ FIX 3: State ko bataya ki isme 'Review' objects ka array aayega
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/reviews/all/list`);
      setReviews(res.data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      Swal.fire("Error", "Failed to load reviews. Check backend connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX 4: 'id' ko explicitly 'string' type diya
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
                reviews.map((review) => (
                  <tr key={review._id}>
                    <td className="ar-product-cell">
                      <div className="product-info">
                        <FiBox className="product-icon" />
                        {/* Safe check for productId */}
                        <span>{review.productId?.name || <em className="deleted-text">Product Removed</em>}</span>
                      </div>
                    </td>

                    <td className="ar-customer-cell">
                      <div className="ar-user-highlight">
                        <FiUser className="ar-user-icon" />
                        <strong>{review.shopName || "Unknown Shop"}</strong>
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