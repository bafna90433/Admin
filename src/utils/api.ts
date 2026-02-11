import axios from "axios";

// 🚨 Debugging: Confirming URL in Console
console.log("👉 FORCING LOCALHOST CONNECTION");

// ✅ STEP 1: Hardcode URL (Temporary fix to ensure connection)
// Jab ye chal jaye, tab hum wapas .env use kar sakte hain via import.meta.env
export const API_URL = "http://localhost:5000/api"; 
export const MEDIA_URL = "http://localhost:5000";

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