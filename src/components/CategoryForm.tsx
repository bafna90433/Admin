import React, { useState } from "react";
import { FiSave, FiX, FiImage } from "react-icons/fi";
import api from "../utils/api";

interface Props {
  onSuccess?: () => void;
  onClose?: () => void;
  categoryId?: string;   // 👇 ID for editing (e.g., "65e...")
  initialName?: string;  // 👇 Name of category
  initialLink?: string;  // 👇 Custom Link
  initialImage?: string; // 👇 Existing image URL
}

const CategoryForm: React.FC<Props> = ({ 
  onSuccess, 
  onClose, 
  categoryId, 
  initialName = "", 
  initialLink = "",
  initialImage = ""
}) => {
  const [name, setName] = useState(initialName);
  const [link, setLink] = useState(initialLink);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Image select handle karega
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!name.trim()) throw new Error("Category name is required");
      // Agar create kar rahe hain (ID nahi hai), toh image mandatory hai
      if (!categoryId && !image) throw new Error("Category image is required");

      const url = categoryId
        ? `/categories/${categoryId}`
        : `/categories`;

      const method = categoryId ? "put" : "post";

      // ✅ Image bhejne ke liye FormData zaroori hai
      const formData = new FormData();
      formData.append("name", name);
      formData.append("link", link);
      if (image) {
        formData.append("image", image);
      }

      await api({
        method: method,
        url: url,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

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
            <h2>{categoryId ? "Edit Category" : "Create Category"}</h2>
            <p className="header-description">
              {categoryId ? "Update your category details" : "Add a new product category"}
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
            {/* Category Name */}
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

            {/* Custom Link (Optional) */}
            <div className="form-group">
              <label htmlFor="category-link" className="form-label">
                Custom Link (Optional)
              </label>
              <input
                id="category-link"
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/custom-page or https://..."
                className="form-input"
                disabled={loading}
              />
            </div>

            {/* Category Image */}
            <div className="form-group">
              <label className="form-label">
                Category Image {!categoryId && <span className="required">*</span>}
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="form-input" 
                disabled={loading}
                required={!categoryId} // Only required when creating new
              />
              {preview && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={preview} 
                    alt="Preview" 
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} 
                  />
                </div>
              )}
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
                    {categoryId ? "Update Category" : "Create Category"}
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