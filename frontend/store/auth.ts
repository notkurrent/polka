import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAppStore } from "@/store/app";

export type UserRole = "BUYER" | "PARTNER";

export interface User {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  role: UserRole;
  is_tma?: boolean;
  has_password?: boolean;
  has_telegram?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, token) => set({ user, accessToken: token }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null, accessToken: null }),
      logout: () => {
        useAppStore.getState().clearSelectedMode();
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: "auth-storage", // Имя ключа в localStorage
    },
  ),
);
