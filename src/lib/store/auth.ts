import { create } from "zustand";
import { authApi } from "@/lib/api/auth";

interface UserInfo {
  address: string;
  ensName: string;
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  emailSize: number;
  emailSizeLimit: number;

  setAuth: (token: string, user: UserInfo) => void;
  clearAuth: () => void;
  loadFromStorage: () => void;
  fetchProfile: () => Promise<void>;
  getCachedPrivateKey: () => string | null;
  setCachedPrivateKey: (key: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  emailSize: 0,
  emailSizeLimit: 0,

  setAuth: (token, user) => {
    localStorage.setItem("mm_token", token);
    localStorage.setItem("mm_user", JSON.stringify(user));
    set({ token, user });
  },

  clearAuth: () => {
    localStorage.removeItem("mm_token");
    localStorage.removeItem("mm_user");
    sessionStorage.removeItem("mm_private_key");
    set({ token: null, user: null, emailSize: 0, emailSizeLimit: 0 });
  },

  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("mm_token");
    const userStr = localStorage.getItem("mm_user");
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) });
      } catch {
        set({ token: null, user: null });
      }
    }
  },

  fetchProfile: async () => {
    try {
      const res = await authApi.getUserProfile();
      set({
        emailSize: res.total_email_size,
        emailSizeLimit: res.total_email_size_limit,
      });
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  },

  getCachedPrivateKey: () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("mm_private_key");
  },

  setCachedPrivateKey: (key: string) => {
    sessionStorage.setItem("mm_private_key", key);
  },
}));
