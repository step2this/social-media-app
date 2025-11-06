/**
 * Hook Mock Utilities
 *
 * Simple, pragmatic mock factories for React hooks used in tests.
 * Eliminates duplication of hook mock setup across test files.
 *
 * @example
 * ```typescript
 * // Mock authenticated user
 * vi.mock('../hooks/useAuth.js', () => ({
 *   useAuth: () => mockUseAuthAuthenticated({ username: 'testuser' })
 * }));
 *
 * // Mock unauthenticated user
 * vi.mock('../hooks/useAuth.js', () => ({
 *   useAuth: () => mockUseAuthUnauthenticated()
 * }));
 *
 * // Custom auth state
 * vi.mock('../hooks/useAuth.js', () => ({
 *   useAuth: () => createMockUseAuthReturn({
 *     isLoading: true,
 *     error: 'Auth error'
 *   })
 * }));
 *
 * // Mock follow hook
 * vi.mock('../hooks/useFollow.js', () => ({
 *   useFollow: () => createMockUseFollowReturn({
 *     isFollowing: true,
 *     followersCount: 100
 *   })
 * }));
 * ```
 */

import { vi } from 'vitest';
import type {
  User,
  AuthTokens,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  UpdateUserRequest
} from '@social-media-app/shared';

/**
 * Return type for useAuth hook
 *
 * This interface matches the actual useAuth hook return type with proper typing.
 * Type-safe alternative to using `unknown` for function return values.
 */
export interface UseAuthReturn {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  register: (userData: RegisterRequest) => Promise<RegisterResponse>;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthTokens>;
  getProfile: () => Promise<User>;
  updateProfile: (profileData: UpdateUserRequest) => Promise<User>;
  checkSession: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * Return type for useFollow hook (refactored - no state duplication)
 * 
 * The hook now provides mutation functions only. State should be read
 * from the parent component's query data (e.g., ProfilePage query).
 */
export interface UseFollowReturn {
  isLoading: boolean;
  error: string | null;
  followUser: () => Promise<void>;
  unfollowUser: () => Promise<void>;
  clearError: () => void;
}

/**
 * Return type for useLike hook
 */
export interface UseLikeReturn {
  isLiked: boolean;
  likesCount: number;
  isLoading: boolean;
  error: string | null;
  likePost: () => Promise<void>;
  unlikePost: () => Promise<void>;
  toggleLike: () => Promise<void>;
  fetchLikeStatus: () => Promise<void>;
  clearError: () => void;
}

/**
 * Create a mock authenticated user
 */
export const createMockAuthenticatedUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
});

/**
 * Create mock auth tokens
 */
export const createMockAuthTokens = (overrides?: Partial<AuthTokens>): AuthTokens => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  ...overrides
});

/**
 * Create a mock return value for useAuth hook
 */
export const createMockUseAuthReturn = (overrides?: Partial<UseAuthReturn>): UseAuthReturn => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isHydrated: true,
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  checkSession: vi.fn(),
  clearError: vi.fn(),
  ...overrides
});

/**
 * Helper to create authenticated user mock for useAuth
 */
export const mockUseAuthAuthenticated = (userOverrides?: Partial<User>): UseAuthReturn => {
  const user = createMockAuthenticatedUser(userOverrides);
  const tokens = createMockAuthTokens();

  return createMockUseAuthReturn({
    user,
    tokens,
    isAuthenticated: true
  });
};

/**
 * Helper to create unauthenticated user mock for useAuth
 */
export const mockUseAuthUnauthenticated = (): UseAuthReturn => createMockUseAuthReturn({
    user: null,
    tokens: null,
    isAuthenticated: false
  });

/**
 * Create a mock return value for useFollow hook (refactored version)
 * 
 * The hook now only provides mutation functions and loading/error state.
 * State should be passed to components via props from parent queries.
 */
export const createMockUseFollowReturn = (overrides?: Partial<UseFollowReturn>): UseFollowReturn => ({
  isLoading: false,
  error: null,
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  clearError: vi.fn(),
  ...overrides
});

/**
 * Create a mock return value for useLike hook
 */
export const createMockUseLikeReturn = (overrides?: Partial<UseLikeReturn>): UseLikeReturn => ({
  isLiked: false,
  likesCount: 0,
  isLoading: false,
  error: null,
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  toggleLike: vi.fn(),
  fetchLikeStatus: vi.fn(),
  clearError: vi.fn(),
  ...overrides
});

/**
 * Return type for useAuctions hook
 */
export interface UseAuctionsReturn {
  auctions: any[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Return type for useAuctionDetail hook
 */
export interface UseAuctionDetailReturn {
  auction: any | null;
  bids: any[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Return type for usePlaceBid hook
 */
export interface UsePlaceBidReturn {
  placeBid: (amount: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Create a mock return value for useAuctions hook
 */
export const createMockUseAuctionsReturn = (overrides?: Partial<UseAuctionsReturn>): UseAuctionsReturn => ({
  auctions: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  hasMore: false,
  loadMore: vi.fn(),
  ...overrides
});

/**
 * Create a mock return value for useAuctionDetail hook
 */
export const createMockUseAuctionDetailReturn = (overrides?: Partial<UseAuctionDetailReturn>): UseAuctionDetailReturn => ({
  auction: null,
  bids: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  ...overrides
});

/**
 * Create a mock return value for usePlaceBid hook
 */
export const createMockUsePlaceBidReturn = (overrides?: Partial<UsePlaceBidReturn>): UsePlaceBidReturn => ({
  placeBid: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn(),
  ...overrides
});
