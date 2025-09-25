import type { User, LoginRequest, RegisterRequest } from '@social-media-app/shared';
import type { IAuthService } from '../interfaces/IAuthService';

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
 * Concrete implementation of authentication service using the existing useAuth hook
 * This wraps the hook to provide a clean, testable interface
 */
export class AuthService implements IAuthService {
  private readonly authHook: AuthHookResult;

  constructor(authHook: AuthHookResult) {
    this.authHook = authHook;
  }

  get user(): User | null {
    return this.authHook.user;
  }

  get isAuthenticated(): boolean {
    return this.authHook.isAuthenticated;
  }

  get isLoading(): boolean {
    return this.authHook.isLoading;
  }

  get error(): string | null {
    return this.authHook.error;
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
}

/**
 * Factory function for creating AuthService instances
 * Useful for dependency injection and testing
 */
export const createAuthService = (authHook: AuthHookResult): IAuthService => {
  return new AuthService(authHook);
};