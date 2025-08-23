import axios from "axios";

// ✅ Webpack/Dotenv me variables expose hote hain as process.env.VITE_API_URL
const api = axios.create({
  baseURL: process.env.VITE_API_URL || "http://localhost:5000/api",
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
