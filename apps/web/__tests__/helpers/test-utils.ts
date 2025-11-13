/**
 * Shared Test Utilities
 *
 * Common patterns for testing Next.js components:
 * - GraphQL client mocking
 * - Server Action helpers
 * - Aria assertion helpers
 */

import { vi } from 'vitest';
import type { GraphQLClient } from 'graphql-request';

/**
 * Create a mock GraphQL client that returns specified data
 *
 * @example
 * const client = createMockGraphQLClient({
 *   exploreFeed: { edges: [...] }
 * });
 */
export function createMockGraphQLClient(responseData: any): GraphQLClient {
  return {
    request: vi.fn().mockResolvedValue(responseData),
  } as any;
}

/**
 * Create a mock GraphQL client that throws an error
 *
 * @example
 * const client = createMockGraphQLClientWithError(new Error('Network error'));
 */
export function createMockGraphQLClientWithError(error: Error): GraphQLClient {
  return {
    request: vi.fn().mockRejectedValue(error),
  } as any;
}

/**
 * Create a mock Server Action for liking posts
 *
 * @example
 * const mockLike = createMockLikeAction({ likesCount: 11, isLiked: true });
 * render(<PostCard post={post} onLike={mockLike} />);
 */
export function createMockLikeAction(
  response = { success: true, likesCount: 1, isLiked: true }
) {
  return vi.fn().mockResolvedValue(response);
}

/**
 * Create a mock Server Action for unliking posts
 *
 * @example
 * const mockUnlike = createMockUnlikeAction({ likesCount: 9, isLiked: false });
 * render(<PostCard post={post} onUnlike={mockUnlike} />);
 */
export function createMockUnlikeAction(
  response = { success: true, likesCount: 0, isLiked: false }
) {
  return vi.fn().mockResolvedValue(response);
}

/**
 * Create a mock Server Action that fails
 *
 * @example
 * const mockFailedLike = createMockFailedAction();
 * render(<PostCard post={post} onLike={mockFailedLike} />);
 */
export function createMockFailedAction() {
  return vi.fn().mockResolvedValue({
    success: false,
    likesCount: 0,
    isLiked: false,
  });
}

/**
 * Aria assertion helpers for more resilient tests
 */
export const ariaHelpers = {
  /**
   * Check if an element has the expected pressed state
   */
  expectPressed: (element: HTMLElement, pressed: boolean) => {
    return element.getAttribute('aria-pressed') === String(pressed);
  },

  /**
   * Check if an element has the expected label
   */
  expectLabel: (element: HTMLElement, label: string) => {
    return element.getAttribute('aria-label') === label;
  },

  /**
   * Check if an element has aria-hidden
   */
  isHidden: (element: HTMLElement) => {
    return element.getAttribute('aria-hidden') === 'true';
  },
};

/**
 * Common test patterns documentation
 *
 * Use these patterns for consistent, maintainable tests:
 *
 * 1. **Component Tests (Client Components)**
 *    - Use dependency injection via props
 *    - Query by testId or aria attributes
 *    - Test user-facing behavior, not implementation
 *
 * 2. **Server Component Tests**
 *    - Mock dependencies at module level
 *    - Render the awaited component
 *    - Verify different data states
 *
 * 3. **Server Action Tests**
 *    - Mock GraphQL client
 *    - Test success and error paths
 *    - Verify revalidation calls
 *
 * @example Client Component Test
 * ```typescript
 * const mockLike = createMockLikeAction({ likesCount: 11, isLiked: true });
 * render(<PostCard post={post} onLike={mockLike} />);
 *
 * const likeButton = screen.getByTestId('like-button');
 * await user.click(likeButton);
 *
 * expect(likeButton).toHaveAttribute('aria-pressed', 'true');
 * expect(mockLike).toHaveBeenCalledWith('post-1');
 * ```
 *
 * @example Server Component Test
 * ```typescript
 * vi.mock('@/lib/graphql/client', () => ({
 *   getGraphQLClient: vi.fn(),
 * }));
 *
 * const client = createMockGraphQLClient({ exploreFeed: { edges: [...] } });
 * vi.mocked(getGraphQLClient).mockResolvedValue(client);
 *
 * const page = await ExplorePage();
 * render(page);
 *
 * expect(screen.getByText('Explore')).toBeInTheDocument();
 * ```
 *
 * @example Server Action Test
 * ```typescript
 * vi.mock('@/lib/graphql/client', () => ({
 *   getGraphQLClient: vi.fn(),
 * }));
 *
 * const client = createMockGraphQLClient({ likePost: { success: true, ... } });
 * vi.mocked(getGraphQLClient).mockResolvedValue(client);
 *
 * const result = await likePost('post-1');
 *
 * expect(result.success).toBe(true);
 * expect(revalidatePath).toHaveBeenCalledWith('/(app)', 'layout');
 * ```
 */
