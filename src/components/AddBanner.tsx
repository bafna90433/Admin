import React, { useState } from "react";
import axios from "axios"; // ✅ Changed: Import axios directly
import "../styles/AddBanner.css";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const AddBanner: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  // 🧠 Process selected files
  const processFiles = (files: File[]) => {
    if (!files || files.length === 0) return;
    setSelectedFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
    setLinks(files.map(() => "")); // initialize empty link inputs
  };

  // 📁 File selection (click)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  // 🖱️ Drag-drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  // 🗑️ Remove preview
  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previewUrls];
    const newLinks = [...links];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    newLinks.splice(index, 1);
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
    setLinks(newLinks);
  };

  // 🚀 Upload to Cloudinary via backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((f, i) => {
      formData.append("images", f);
      if (links[i]) formData.append("links", links[i]); // ✅ send link array
    });

    try {
      setUploading(true);
      setProgress(0);
      setMessage("");

      // ✅ Changed: Using axios with API_BASE
      const res = await axios.post(`${API_BASE}/banners`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / (event.total || 1));
          setProgress(percent);
        },
      });

      setMessage("✅ Uploaded successfully to Cloudinary!");
      setSelectedFiles([]);
      setPreviewUrls([]);
      setLinks([]);

      window.dispatchEvent(new Event("bannersUpdated"));
      console.log("Uploaded:", res.data);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setMessage("❌ Failed to upload. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="add-banner-container">
      <div className="card">
        <h2 className="card-title">📤 Upload Banner Images (Cloudinary)</h2>

        <form onSubmit={handleSubmit} className="upload-form">
          <div
            className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="banner-upload"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="banner-upload" className="dropzone-label">
              <div className="dropzone-content">
                <p className="dropzone-text">
                  {dragActive
                    ? "Drop your files here 📦"
                    : "Drag & drop images here or click to browse"}
                </p>
                <p className="dropzone-hint">
                  Supports: JPG, PNG, WebP (max 5MB each)
                </p>
              </div>
            </label>
          </div>

          {uploading && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {message && <p className="upload-message">{message}</p>}

          <button
            type="submit"
            className="submit-button"
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading
              ? `Uploading ${progress}%...`
              : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
          </button>
        </form>

        {/* 🖼️ Preview with link inputs */}
        {previewUrls.length > 0 && (
          <div className="preview-section">
            <h3 className="preview-title">
              Selected Images ({previewUrls.length})
            </h3>
            <div className="preview-grid">
              {previewUrls.map((url, i) => (
                <div key={i} className="preview-item">
                  <img src={url} alt={`preview-${i}`} className="preview-image" />

                  <input
                    type="text"
                    placeholder="Enter link (optional)"
                    value={links[i]}
                    onChange={(e) => {
                      const newLinks = [...links];
                      newLinks[i] = e.target.value;
                      setLinks(newLinks);
                    }}
                    className="link-input"
                  />

                  <button
                    className="remove-button"
                    onClick={() => removeImage(i)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddBanner;