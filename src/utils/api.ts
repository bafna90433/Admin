import axios from "axios";

// 👇 declare for TS (type safety)
declare const process: {
  env: {
    VITE_API_URL?: string;
    VITE_MEDIA_URL?: string;
  };
};

// ✅ API URL from .env (already includes /api in your env)
export const API_URL: string =
  process.env.VITE_API_URL || "http://localhost:5000/api";

// ✅ Media URL fallback
export const MEDIA_URL: string =
  process.env.VITE_MEDIA_URL ||
  process.env.VITE_API_URL ||
  "http://localhost:5000";

console.log("👉 API_URL = ", API_URL); // Debugging

// ✅ axios instance
const api = axios.create({
  baseURL: API_URL,
});

// ✅ attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
