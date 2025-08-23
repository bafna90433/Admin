import React, { useState } from 'react';
import api from '../utils/api';
import '../styles/AddBanner.css';

const AddBanner: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFiles(files);
      setPreviewUrls(files.map(file => URL.createObjectURL(file)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      selectedFiles.forEach(file => formData.append("images", file));

      const res = await api.post("/banners", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload success:", res.data);
      alert("Banners uploaded successfully!");

      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload banners.");
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previewUrls];
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  return (
    <div className="add-banner-container">
      <div className="card">
        <h2 className="card-title">Upload Banner Images</h2>
        <p className="card-subtitle">Add multiple images for your banners</p>
        
        <form onSubmit={handleSubmit} className="upload-form">
          <div 
            className={`dropzone ${dragActive ? 'dropzone-active' : ''}`}
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
                <svg className="upload-icon" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                <p className="dropzone-text">
                  {dragActive ? 'Drop your files here' : 'Drag & drop images here or click to browse'}
                </p>
                <p className="dropzone-hint">Supports: JPG, PNG, GIF (Max 5MB each)</p>
              </div>
            </label>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading || selectedFiles.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Uploading...
              </>
            ) : (
              `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`
            )}
          </button>
        </form>

        {previewUrls.length > 0 && (
          <div className="preview-section">
            <h3 className="preview-title">Selected Images ({previewUrls.length})</h3>
            <div className="preview-grid">
              {previewUrls.map((url, index) => (
                <div key={index} className="preview-item">
                  <img
                    src={url}
                    alt={`preview-${index}`}
                    className="preview-image"
                  />
                  <button 
                    className="remove-button"
                    onClick={() => removeImage(index)}
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