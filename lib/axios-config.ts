import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { isTokenExpired } from "@/lib/jwt";

export const axiosConfig = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

axiosConfig.interceptors.request.use(
  (config) => {
    const { token, logout } = useAuthStore.getState();

    if (!token) return config;

    // 🔥 validación frontend (la importante)
    if (isTokenExpired(token)) {
      logout();
      return Promise.reject("Token expirado");
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);