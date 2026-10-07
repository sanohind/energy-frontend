import axios from "axios";
import { clearToken, getToken } from "./authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthRequest = String(error.config?.url || "").includes("/auth/login");

    if (status === 401 && !isAuthRequest) {
      clearToken();
      if (!window.location.pathname.startsWith("/signin")) {
        window.location.assign("/signin");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
