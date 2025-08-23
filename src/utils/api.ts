// src/utils/api.ts
import axios from "axios";

export const API_URL = process.env.VITE_API_URL as string;
export const MEDIA_URL = process.env.VITE_MEDIA_URL || API_URL.replace("/api", "");

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
