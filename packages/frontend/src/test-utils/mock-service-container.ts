/**
 * Mock Service Container Utilities
 *
 * Provides reusable mock service container factories for testing.
 * Follows pattern from NOTIFICATION_SERVICE_IMPLEMENTATION.md.
 *
 * This enables proper DI testing without singleton violations.
 * All service methods are vi.fn() mocks that can be configured per test.
 *
 * @example
 * ```typescript
 * import { createMockServiceContainer, createMockFeedService } from './mock-service-container';
 *
 * describe('MyComponent', () => {
 *   let mockFeedService: ReturnType<typeof createMockFeedService>;
 *   let mockServices: IServiceContainer;
 *
 *   beforeEach(() => {
 *     mockFeedService = createMockFeedService();
 *     mockServices = createMockServiceContainer({
 *       feedService: mockFeedService as any
 *     });
 *   });
 *
 *   it('should render', () => {
 *     mockFeedService.getFollowingFeed.mockResolvedValue({
 *       status: 'success',
 *       data: { items: [], hasNextPage: false, endCursor: null }
 *     });
 *
 *     renderWithProviders(<MyComponent />, { serviceContainer: mockServices });
 *     expect(mockFeedService.getFollowingFeed).toHaveBeenCalled();
 *   });
 * });
 * ```
 */

import { vi } from 'vitest';
import type { IServiceContainer } from '../services/interfaces/IServiceContainer';
import type { INavigationService } from '../services/interfaces/INavigationService';
import type { IAuthService } from '../services/interfaces/IAuthService';
import type { IModalService } from '../services/interfaces/IModalService';
import type { INotificationService } from '../services/interfaces/INotificationService';
import type { INotificationDataService } from '../services/interfaces/INotificationDataService';
import type { IFeedService } from '../services/interfaces/IFeedService';

/**
 * Create a mock navigation service with all methods as vi.fn()
 */
export function createMockNavigationService(): INavigationService {
  return {
    navigateToProfile: vi.fn(),
    navigateToHome: vi.fn(),
    navigateToExplore: vi.fn(),
    navigateToRoute: vi.fn(),
    goBack: vi.fn(),
    replaceRoute: vi.fn(),
  };
}

/**
 * Create a mock auth service with all methods as vi.fn()
 */
export function createMockAuthService(): IAuthService {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshUser: vi.fn(),
  };
}

/**
 * Create a mock modal service with all methods as vi.fn()
 */
export function createMockModalService(): IModalService {
  return {
    isAuthModalOpen: false,
    authModalMode: 'login',
    openLoginModal: vi.fn(),
    openRegisterModal: vi.fn(),
    closeAuthModal: vi.fn(),
    setAuthModalMode: vi.fn(),
    onModalStateChange: vi.fn(() => vi.fn()),
  };
}

/**
 * Create a mock notification service (UI toasts) with all methods as vi.fn()
 */
export function createMockNotificationService(): INotificationService {
  return {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
    showWarning: vi.fn(),
    clearAll: vi.fn(),
    clearNotification: vi.fn(),
  };
}

/**
 * Create a mock notification data service (backend) with all methods as vi.fn()
 */
export function createMockNotificationDataService(): INotificationDataService {
  return {
    getUnreadCount: vi.fn(),
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  };
}

/**
 * Create a mock feed service with all methods as vi.fn()
 *
 * Returns typed mock functions for type-safe test assertions.
 * Use mockResolvedValue() to configure responses per test.
 *
 * @example
 * ```typescript
 * const mockFeedService = createMockFeedService();
 * mockFeedService.getFollowingFeed.mockResolvedValue({
 *   status: 'success',
 *   data: { items: mockPosts, hasNextPage: false, endCursor: null }
 * });
 * ```
 */
export function createMockFeedService(): IFeedService {
  return {
    getExploreFeed: vi.fn(),
    getFollowingFeed: vi.fn(),
    markPostsAsRead: vi.fn(),
  };
}

/**
 * Create a complete mock service container with all services as vi.fn() mocks
 *
 * Supports partial overrides for testing specific services while using defaults for others.
 * All services are mocked by default to prevent accidental real service calls in tests.
 *
 * @param overrides - Optional partial service container to override specific services
 * @returns Complete mock service container with all required services
 *
 * @example
 * ```typescript
 * // Create with custom feedService
 * const mockFeedService = createMockFeedService();
 * mockFeedService.getFollowingFeed.mockResolvedValue(...);
 *
 * const container = createMockServiceContainer({
 *   feedService: mockFeedService as any
 * });
 *
 * // Use in test
 * renderWithProviders(<HomePage />, { serviceContainer: container });
 * ```
 */
export function createMockServiceContainer(
  overrides?: Partial<IServiceContainer>
): IServiceContainer {
  // Create default mocks for all services
  const defaultServices: IServiceContainer = {
    navigationService: createMockNavigationService(),
    authService: createMockAuthService(),
    modalService: createMockModalService(),
    notificationService: createMockNotificationService(),
    notificationDataService: createMockNotificationDataService(),
    feedService: createMockFeedService(),
  };

  // Merge with overrides (overrides take precedence)
  return {
    ...defaultServices,
    ...overrides,
  };
}
