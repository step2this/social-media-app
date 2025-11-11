import type { User, LoginRequest, RegisterRequest } from '@social-media-app/shared';
import type { IAuthService } from '../interfaces/IAuthService.js';
import { useAuthStore, type AuthStore } from '../../stores/authStore.js';

/**
 * Type representing the return value of the useAuth hook
 * This allows us to decouple from the specific hook implementation
 */
export interface AuthHookResult {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<any>;
  register: (userData: RegisterRequest) => Promise<any>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Reactive authentication service using Zustand store subscription pattern
 * This solves the stale closure problem by accessing current state directly from the store
 */
export class AuthService implements IAuthService {
  private readonly authHook: AuthHookResult;
  private readonly getStoreState: () => AuthStore;

  constructor(authHook: AuthHookResult) {
    this.authHook = authHook;
    // Capture store reference for reactive state access
    this.getStoreState = useAuthStore.getState;
  }

  // Reactive getters that always return current state
  get user(): User | null {
    return this.getStoreState().user;
  }

  get isAuthenticated(): boolean {
    return this.getStoreState().isAuthenticated;
  }

  get isLoading(): boolean {
    return this.getStoreState().isLoading;
  }

  get error(): string | null {
    return this.getStoreState().error;
  }

  async login(credentials: LoginRequest): Promise<void> {
    await this.authHook.login(credentials);
  }

  async register(userData: RegisterRequest): Promise<void> {
    await this.authHook.register(userData);
  }

  async logout(): Promise<void> {
    await this.authHook.logout();
  }

  clearError(): void {
    this.authHook.clearError();
  }

  async refreshUser(): Promise<void> {
    // Implementation would depend on available methods
    // For now, we could trigger a re-login or fetch user data
    console.log('Refreshing user data...');
  }

  /**
   * Subscribe to authentication state changes
   * Useful for components that need to react to auth changes
   */
  subscribe(callback: (state: AuthStore) => void): () => void {
    return useAuthStore.subscribe(callback);
  }
}

/**
 * Factory function for creating AuthService instances
 * Useful for dependency injection and testing
 */
export const createAuthService = (authHook: AuthHookResult): IAuthService => {
  return new AuthService(authHook);
};