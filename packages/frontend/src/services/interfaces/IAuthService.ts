import type { User, LoginRequest, RegisterRequest } from '@social-media-app/shared';

/**
 * Authentication service interface - abstracts auth state and operations
 * This allows components to work with auth without knowing about specific hook implementations
 */
export interface IAuthService {
  /**
   * Current authenticated user (null if not authenticated)
   */
  readonly user: User | null;

  /**
   * Whether the user is currently authenticated
   */
  readonly isAuthenticated: boolean;

  /**
   * Whether authentication operations are in progress
   */
  readonly isLoading: boolean;

  /**
   * Current authentication error, if any
   */
  readonly error: string | null;

  /**
   * Authenticate a user with email and password
   * @param credentials - Login credentials
   */
  login(credentials: LoginRequest): Promise<void>;

  /**
   * Register a new user account
   * @param userData - Registration data
   */
  register(userData: RegisterRequest): Promise<void>;

  /**
   * Sign out the current user
   */
  logout(): Promise<void>;

  /**
   * Clear any authentication errors
   */
  clearError(): void;

  /**
   * Refresh the current user's data
   */
  refreshUser(): Promise<void>;
}