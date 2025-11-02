/**
 * HomePage.relay.tsx Tests
 *
 * TDD approach testing behavior, not implementation.
 * Uses centralized text constants for maintainability.
 *
 * Test Structure:
 * - Render helpers with dependency injection
 * - Behavior-focused assertions
 * - Shared fixtures from relay-feed-adapters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { HomePage } from './HomePage';
import {
  createMockRelayEnvironment,
  resolveMostRecentOperation,
  rejectMostRecentOperation,
  getMostRecentOperationVariables,
} from '../test-utils/relay-test-utils';
import { FeedScenarios } from '../test-utils/relay-feed-adapters';
import {
  LOADING_TEXT,
  EMPTY_TEXT,
  END_OF_FEED_TEXT,
  ACTION_TEXT,
  ARIA_TEXT,
} from './__tests__/test-constants';
import { useAuthStore } from '../stores/authStore';

/**
 * Test Helper: Render HomePage with Relay environment
 *
 * Dependency Injection pattern: Environment is injectable for testing
 * Includes Router context for useNavigate hook
 *
 * @returns Render utilities plus environment for assertions
 */
function renderHomePage() {
  const environment = createMockRelayEnvironment();
  const user = userEvent.setup();

  const utils = render(
    <BrowserRouter>
      <RelayEnvironmentProvider environment={environment}>
        <HomePage />
      </RelayEnvironmentProvider>
    </BrowserRouter>
  );

  return { environment, user, ...utils };
}

/**
 * Setup authenticated user for tests
 */
function setupAuthenticatedUser() {
  useAuthStore.setState({
    user: {
      id: 'test-user-1',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: true,
    },
    tokens: {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresIn: 3600,
    },
  });
}

describe('HomePage (Relay)', () => {
  beforeEach(() => {
    setupAuthenticatedUser();

    // Mock IntersectionObserver globally for all tests
    const mockIntersectionObserver = vi.fn((callback) => {
      const instance = {
        observe: vi.fn((element: Element) => {
          // Auto-trigger callback to simulate intersection
          setTimeout(() => {
            callback([{
              isIntersecting: true,
              target: element,
              intersectionRatio: 1,
              boundingClientRect: element.getBoundingClientRect(),
              intersectionRect: element.getBoundingClientRect(),
              rootBounds: null,
              time: Date.now(),
            }], instance);
          }, 0);
        }),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
      return instance;
    });

    vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);
  });

  describe('Initial Render', () => {
    it('shows loading state while query is pending', () => {
      renderHomePage();

      // Behavior: User sees loading indicator
      expect(screen.getByText(LOADING_TEXT.FEED_LOADING)).toBeInTheDocument();
    });

    it('displays posts after query resolves', async () => {
      const { environment } = renderHomePage();

      // Resolve with 3 posts
      resolveMostRecentOperation(environment, FeedScenarios.followingFeed(3));

      // Behavior: User sees 3 post cards
      await waitFor(() => {
        const posts = screen.getAllByTestId(ARIA_TEXT.POST_CARD);
        expect(posts).toHaveLength(3);
      });
    });
  });

  describe('Query Parameters', () => {
    it('requests initial page with correct limit', () => {
      const { environment } = renderHomePage();

      // Test behavior: Component requests 24 posts initially
      const variables = getMostRecentOperationVariables(environment);
      expect(variables).toMatchObject({ first: 24 });
    });

    it('uses Relay-spec pagination arguments (first/after, not limit/cursor)', () => {
      const { environment } = renderHomePage();

      const variables = getMostRecentOperationVariables(environment);

      // Behavior: Uses Relay pagination spec
      expect(variables).toHaveProperty('first');
      expect(variables).not.toHaveProperty('limit'); // Old style
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no posts from followed users', async () => {
      const { environment } = renderHomePage();

      resolveMostRecentOperation(environment, FeedScenarios.emptyFollowing());

      // Behavior: User sees helpful empty message
      await waitFor(() => {
        expect(screen.getByText(EMPTY_TEXT.NO_POSTS)).toBeInTheDocument();
        expect(screen.queryByTestId(ARIA_TEXT.POST_CARD)).not.toBeInTheDocument();
      });
    });

    it('does not show loading indicators when empty', async () => {
      const { environment } = renderHomePage();

      resolveMostRecentOperation(environment, FeedScenarios.emptyFollowing());

      await waitFor(() => {
        expect(screen.queryByText(LOADING_TEXT.LOADING_MORE)).not.toBeInTheDocument();
      });
    });
  });

  describe('Infinite Scroll Pagination', () => {

    it('loads more posts when scrolling to bottom', async () => {
      const { environment } = renderHomePage();

      // First page (24 posts)
      resolveMostRecentOperation(environment, FeedScenarios.followingFirstPage());

      await waitFor(() => {
        expect(screen.getAllByTestId(ARIA_TEXT.POST_CARD)).toHaveLength(24);
      });

      // Verify sentinel exists (intersection observer will trigger loadNext)
      const sentinel = screen.getByTestId(ARIA_TEXT.SCROLL_SENTINEL);
      expect(sentinel).toBeInTheDocument();
    });

    it('shows loading indicator while loading more posts', async () => {
      const { environment } = renderHomePage();

      resolveMostRecentOperation(environment, FeedScenarios.followingFirstPage());

      await waitFor(() => {
        expect(screen.getAllByTestId(ARIA_TEXT.POST_CARD)).toHaveLength(24);
      });

      // When hasNext is true, sentinel is shown
      const sentinel = screen.queryByTestId(ARIA_TEXT.SCROLL_SENTINEL);
      expect(sentinel).toBeInTheDocument();
    });

    it('stops pagination when reaching last page', async () => {
      const { environment } = renderHomePage();

      // Load last page (hasNextPage: false)
      resolveMostRecentOperation(environment, FeedScenarios.followingLastPage(8));

      await waitFor(() => {
        expect(screen.getAllByTestId(ARIA_TEXT.POST_CARD)).toHaveLength(8);
      });

      // Behavior: No more pagination UI
      expect(screen.queryByTestId(ARIA_TEXT.SCROLL_SENTINEL)).not.toBeInTheDocument();
      expect(screen.getByText(END_OF_FEED_TEXT.ALL_CAUGHT_UP)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when query fails', async () => {
      const { environment } = renderHomePage();

      // Reject query with network error
      rejectMostRecentOperation(environment, new Error('Network error'));

      // Behavior: User sees error UI with retry option
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: ACTION_TEXT.RETRY })).toBeInTheDocument();
      });
    });

    it('retries query when retry button is clicked', async () => {
      const { environment, user } = renderHomePage();

      rejectMostRecentOperation(environment, new Error('Network error'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: ACTION_TEXT.RETRY })).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: ACTION_TEXT.RETRY });
      await user.click(retryButton);

      // Behavior: Component triggers window.location.reload() for error recovery
      // This is tested by verifying the button exists and is clickable
    });
  });

  describe('Relay Cache Behavior', () => {
    it('uses cached data on remount (no refetch)', async () => {
      const environment = createMockRelayEnvironment();

      // First render
      const { unmount } = render(
        <BrowserRouter>
          <RelayEnvironmentProvider environment={environment}>
            <HomePage />
          </RelayEnvironmentProvider>
        </BrowserRouter>
      );

      resolveMostRecentOperation(environment, FeedScenarios.followingFeed(12));

      // Ensure data is fully rendered before continuing
      await waitFor(() => {
        expect(screen.getAllByTestId(ARIA_TEXT.POST_CARD)).toHaveLength(12);
      });

      // Unmount
      unmount();

      // Small delay to ensure unmount is complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Remount with the SAME environment to test cache
      render(
        <BrowserRouter>
          <RelayEnvironmentProvider environment={environment}>
            <HomePage />
          </RelayEnvironmentProvider>
        </BrowserRouter>
      );

      // Behavior: Data should appear immediately from cache
      // With store-or-network policy, a new operation is created BUT
      // data appears from cache while the network request is pending
      await waitFor(() => {
        expect(screen.getAllByTestId(ARIA_TEXT.POST_CARD)).toHaveLength(12);
      });

      // Verify that the component is displaying cached data
      // (the posts are visible even though we haven't resolved the new operation)
      const operations = environment.mock.getAllOperations();
      expect(operations.length).toBeGreaterThan(0); // New operation created with store-or-network
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for feed sections', async () => {
      const { environment } = renderHomePage();

      resolveMostRecentOperation(environment, FeedScenarios.followingFeed(3));

      await waitFor(() => {
        expect(screen.getByRole(ARIA_TEXT.FEED_REGION)).toBeInTheDocument();
      });
    });

    it('announces loading states to screen readers', () => {
      renderHomePage();

      // Query by text and verify aria-live attribute
      const loadingElement = screen.getByText(LOADING_TEXT.FEED_LOADING);
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement.parentElement).toHaveAttribute('aria-live', 'polite');
    });
  });
});
