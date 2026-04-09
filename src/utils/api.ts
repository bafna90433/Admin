import axios from "axios";

// ✅ API Connection Configuration
// This project uses Webpack, so we access environment variables via process.env.
// Fallback to hardcoded production URLs if env variables are not found.
const VITE_API_URL = 
  (process as any).env?.VITE_API_URL || 
  "https://bafnatoys-backend-production.up.railway.app/api";

const VITE_MEDIA_URL = 
  (process as any).env?.VITE_MEDIA_URL || 
  "https://bafnatoys-backend-production.up.railway.app";

export const API_URL = VITE_API_URL;
export const MEDIA_URL = VITE_MEDIA_URL;

// ✅ Axios Instance
const api = axios.create({
  baseURL: API_URL,
});

// ✅ Attach Token Automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    // TypeScript safety check
    if (!config.headers) {
      config.headers = {} as any;
    }
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;