import axios from "axios";

const api = axios.create({
  baseURL: process.env.VITE_API_URL as string,   // 👈 yahi line
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
