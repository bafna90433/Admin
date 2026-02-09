import axios from "axios";

// ✅ VITE projects must use import.meta.env
export const API_URL: string = import.meta.env.VITE_API_URL as string;
export const MEDIA_URL: string =
  (import.meta.env.VITE_MEDIA_URL as string) || API_URL?.replace("/api", "");

if (!API_URL) {
  throw new Error("VITE_API_URL is missing. Set it in Vercel environment variables.");
}

console.log("👉 API_URL =", API_URL);

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
