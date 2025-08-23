// src/utils/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // Backend ka base URL
});

// Har request ke liye token attach karega agar available ho
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
