import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("mm_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data?.data,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mm_token");
        localStorage.removeItem("mm_user");
        window.location.href = "/";
      }
      return Promise.reject(error);
    }

    // Show user-friendly error toast
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "Request timed out. Please try again."
        : error.message === "Network Error"
          ? "Network error. Please check your connection."
          : "Something went wrong. Please try again.");

    toast.error(message);

    return Promise.reject(error);
  }
);

export { apiClient };
