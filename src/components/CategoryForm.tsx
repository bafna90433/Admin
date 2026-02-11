import React, { useState } from "react";
import { FiSave, FiX } from "react-icons/fi";
import axios from "axios";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

interface Props {
  onSuccess?: () => void;
  onClose?: () => void;
  initialName?: string;
}

const CategoryForm: React.FC<Props> = ({ onSuccess, onClose, initialName = "" }) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!name.trim()) {
        throw new Error("Category name is required");
      }

      // ✅ Changed: Use API_BASE instead of localhost
      const url = initialName 
        ? `${API_BASE}/categories/${initialName}` 
        : `${API_BASE}/categories`;
      
      const method = initialName ? "put" : "post";
      
      await axios[method](url, { name });

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="category-form-overlay">
      <div className="category-form-card">
        <div className="form-header">
          <div className="header-content">
            <h2>{initialName ? "Edit Category" : "Create Category"}</h2>
            <p className="header-description">
              {initialName ? "Update your category details" : "Add a new product category"}
            </p>
          </div>
          {onClose && (
            <button className="close-button" onClick={onClose} disabled={loading}>
              <FiX size={20} />
            </button>
          )}
        </div>

        <div className="form-body">
          {error && (
            <div className="alert-card error">
              <div className="alert-content">
                <div className="alert-icon">!</div>
                <div className="alert-message">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="category-name" className="form-label">
                Category Name <span className="required">*</span>
              </label>
              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Electronics, Clothing"
                className="form-input"
                disabled={loading}
                required
              />
            </div>

            <div className="form-actions">
              {onClose && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? (
                  <span className="button-spinner"></span>
                ) : (
                  <>
                    <FiSave size={16} />
                    {initialName ? "Update Category" : "Create Category"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;