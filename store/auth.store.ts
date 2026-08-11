"use client";

import { create } from "zustand";

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  provider?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
