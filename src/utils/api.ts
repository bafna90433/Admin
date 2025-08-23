// src/utils/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.API_URL, // injected at build time
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
