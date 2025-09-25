import { vi } from 'vitest';
import type { User } from '@social-media-app/shared';
import type {
  INavigationService,
  IAuthService,
  IModalService,
  INotificationService,
  IServiceContainer
} from '../interfaces/IServiceContainer';

/**
 * Mock implementation of NavigationService for testing
 * All methods are Vitest mocks that can be spied on and controlled
 */
export const createMockNavigationService = (): INavigationService => ({
  navigateToProfile: vi.fn(),
  navigateToHome: vi.fn(),
  navigateToExplore: vi.fn(),
  navigateToRoute: vi.fn(),
  goBack: vi.fn(),
  replaceRoute: vi.fn(),
});

/**
 * Mock implementation of AuthService for testing
 * Allows complete control over authentication state
 */
export const createMockAuthService = (overrides: Partial<IAuthService> = {}): IAuthService => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

/**
 * Mock implementation of ModalService for testing
 * Provides full control over modal state
 */
export const createMockModalService = (overrides: Partial<IModalService> = {}): IModalService => ({
  isAuthModalOpen: false,
  authModalMode: 'login',
  openLoginModal: vi.fn(),
  openRegisterModal: vi.fn(),
  closeAuthModal: vi.fn(),
  setAuthModalMode: vi.fn(),
  onModalStateChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
  ...overrides,
});

/**
 * Mock implementation of NotificationService for testing
 * Tracks all notification calls for verification
 */
export const createMockNotificationService = (): INotificationService => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  showWarning: vi.fn(),
  clearAll: vi.fn(),
  clearNotification: vi.fn(),
});

/**
 * Create a complete mock service container with all services
 * Allows granular control over individual services or full container mocking
 */
export const createMockServiceContainer = (overrides: Partial<IServiceContainer> = {}): IServiceContainer => ({
  navigationService: createMockNavigationService(),
  authService: createMockAuthService(),
  modalService: createMockModalService(),
  notificationService: createMockNotificationService(),
  ...overrides,
});

// Common test data factories
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  fullName: 'Test User',
  bio: 'Test user bio',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Create authenticated auth service for testing authenticated states
 */
export const createAuthenticatedAuthService = (user: User = createMockUser()): IAuthService =>
  createMockAuthService({
    user,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });

/**
 * Create loading auth service for testing loading states
 */
export const createLoadingAuthService = (): IAuthService =>
  createMockAuthService({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

/**
 * Create error auth service for testing error states
 */
export const createErrorAuthService = (error: string = 'Authentication failed'): IAuthService =>
  createMockAuthService({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error,
  });

/**
 * Create modal service with open modal for testing modal states
 */
export const createOpenModalService = (mode: 'login' | 'register' = 'login'): IModalService =>
  createMockModalService({
    isAuthModalOpen: true,
    authModalMode: mode,
  });

/**
 * Test scenario builders for common authentication flows
 */
export const TestScenarios = {
  /**
   * User is not authenticated - guest state
   */
  guestUser: () => createMockServiceContainer({
    authService: createMockAuthService(),
  }),

  /**
   * User is authenticated and logged in
   */
  authenticatedUser: (user?: User) => createMockServiceContainer({
    authService: createAuthenticatedAuthService(user),
  }),

  /**
   * User is in the middle of authentication flow
   */
  authenticatingUser: () => createMockServiceContainer({
    authService: createLoadingAuthService(),
  }),

  /**
   * Authentication failed with error
   */
  authenticationError: (error?: string) => createMockServiceContainer({
    authService: createErrorAuthService(error),
  }),

  /**
   * Modal is open in login mode
   */
  loginModalOpen: () => createMockServiceContainer({
    modalService: createOpenModalService('login'),
  }),

  /**
   * Modal is open in register mode
   */
  registerModalOpen: () => createMockServiceContainer({
    modalService: createOpenModalService('register'),
  }),
};