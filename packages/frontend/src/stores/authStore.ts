import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '@social-media-app/shared';
import { setGraphQLAuthToken } from '../graphql/clientManager.js';

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHydrated: (hydrated: boolean) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  clearError: () => void;
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isHydrated: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({
        user,
        isAuthenticated: !!user
      }),

      setTokens: (tokens) => {
        set({
          tokens,
          isAuthenticated: !!(tokens && get().user)
        });
        // Sync GraphQL client with new tokens
        setGraphQLAuthToken(tokens?.accessToken || null);
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setHydrated: (isHydrated) => set({ isHydrated }),

      login: (user, tokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
          error: null,
          isLoading: false,
        });
        // Sync GraphQL client with new tokens
        setGraphQLAuthToken(tokens.accessToken);
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
        // Clear GraphQL client auth token
        setGraphQLAuthToken(null);
      },

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated when persistence restoration is complete
        state?.setHydrated(true);
        // Sync GraphQL client with rehydrated tokens
        if (state?.tokens?.accessToken) {
          setGraphQLAuthToken(state.tokens.accessToken);
        }
      },
    }
  )
);