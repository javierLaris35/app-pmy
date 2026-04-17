import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from "@/lib/types";
import { isTokenExpired } from '@/lib/jwt';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (hydrated: boolean) => void;
  checkSession: () => void;
}

// 🔥 define el tipo que sí se persiste
type PersistedAuthState = Pick<
  AuthState,
  "user" | "token" | "isAuthenticated"
>;

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set(() => ({ user })),

      setHasHydrated: (hydrated) => set(() => ({ hasHydrated: hydrated })),

      checkSession: () => {
        const { token, logout } = get();

        if (!token || isTokenExpired(token)) {
          logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),

      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.checkSession();
      },
    },
  )
);