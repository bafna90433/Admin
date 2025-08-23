import axios from "axios";

// ✅ Webpack + dotenv-webpack uses process.env
export const API_URL: string = process.env.VITE_API_URL || "";
export const MEDIA_URL: string =
  process.env.VITE_MEDIA_URL || API_URL.replace("/api", "");

if (!API_URL) {
  console.warn("⚠️ VITE_API_URL is not defined. Please set it in Vercel environment variables.");
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
