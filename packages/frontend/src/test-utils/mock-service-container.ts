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
 * import { createMockServiceContainer, createMockFeedService } from './mock-service-container.js';
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
import type { IServiceContainer } from '../services/interfaces/IServiceContainer.js';
import type { INavigationService } from '../services/interfaces/INavigationService.js';
import type { IAuthService } from '../services/interfaces/IAuthService.js';
import type { IModalService } from '../services/interfaces/IModalService.js';
import type { INotificationService } from '../services/interfaces/INotificationService.js';

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
 * Create a complete mock service container with all services as vi.fn() mocks
 *
 * Supports partial overrides for testing specific services while using defaults for others.
 * All services are mocked by default to prevent accidental real service calls in tests.
 *
 * Note: GraphQL data services (Feed, Profile, Post, Comment, Like, Auction, Follow, NotificationData)
 * have been replaced with Relay hooks. Use Relay hooks directly instead.
 *
 * @param overrides - Optional partial service container to override specific services
 * @returns Complete mock service container with all required services
 *
 * @example
 * ```typescript
 * // Create with custom navigation service
 * const mockNavigationService = createMockNavigationService();
 * mockNavigationService.navigateToHome.mockImplementation(() => {...});
 *
 * const container = createMockServiceContainer({
 *   navigationService: mockNavigationService as any
 * });
 *
 * // Use in test
 * renderWithProviders(<MyComponent />, { serviceContainer: container });
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
  };

  // Merge with overrides (overrides take precedence)
  return {
    ...defaultServices,
    ...overrides,
  };
}
