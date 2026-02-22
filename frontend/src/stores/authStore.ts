/* ── Auth Store (Zustand) ── */

import { create } from 'zustand';
import { api, setSessionExpiredHandler } from '../lib/api';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  checkAuth: () => Promise<void>;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  updateCredits: (credits: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Wire up session expiry handler
  setSessionExpiredHandler(() => {
    set({ user: null, isAuthenticated: false, isLoading: false });
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

    checkAuth: async () => {
      try {
        set({ isLoading: true });
        const res = await api.get<{ user: User }>('/me');
        set({ user: res.user, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    login: (user: User) => {
      set({ user, isAuthenticated: true, isLoading: false });
    },

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // ignore
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
    },

    updateUser: (partial) => {
      const current = get().user;
      if (current) {
        set({ user: { ...current, ...partial } });
      }
    },

    updateCredits: (credits) => {
      const current = get().user;
      if (current) {
        set({ user: { ...current, credits } });
      }
    },
  };
});
