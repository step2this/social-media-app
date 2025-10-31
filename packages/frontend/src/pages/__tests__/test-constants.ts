/**
 * Test Constants for Feed Components
 *
 * Centralizes all UI text used in tests to make it easy to update
 * when UI copy changes. Single source of truth for test assertions.
 *
 * Pattern: Group by component/feature for organization
 */

/** Loading state text */
export const LOADING_TEXT = {
  FEED_LOADING: /loading/i,
  LOADING_MORE: /loading more/i,
  LOADING_STATUS: /loading/i, // For aria-live regions
} as const;

/** Empty state text */
export const EMPTY_TEXT = {
  NO_POSTS: /no posts yet/i,
  NO_NOTIFICATIONS: /no notifications yet/i,
  START_FOLLOWING: /start following/i,
  WILL_NOTIFY: /we'll let you know/i,
} as const;

/** End of feed text */
export const END_OF_FEED_TEXT = {
  ALL_CAUGHT_UP: /you're all caught up/i,
  NO_MORE_POSTS: /no more posts/i,
  END_OF_FEED: /end of feed/i,
} as const;

/** Error text */
export const ERROR_TEXT = {
  NETWORK_ERROR: /network error/i,
  FAILED_TO_LOAD: /failed to load/i,
  FAILED_TO_LOAD_MORE: /failed to load more/i,
  SOMETHING_WENT_WRONG: /something went wrong/i,
  TRY_AGAIN: /try again/i,
} as const;

/** Button and action text */
export const ACTION_TEXT = {
  RETRY: /retry/i,
  LOAD_MORE: /load more/i,
  VIEW_ALL: /view all/i,
} as const;

/** ARIA labels and accessibility text */
export const ARIA_TEXT = {
  FEED_REGION: 'feed',
  LOADING_STATUS: 'status',
  POST_CARD: 'post-card',
  SCROLL_SENTINEL: 'scroll-sentinel',
  POSTS_GRID: 'posts-grid',
} as const;

/**
 * Type-safe text constant access
 *
 * Example usage in tests:
 * ```typescript
 * expect(screen.getByText(EMPTY_TEXT.NO_POSTS)).toBeInTheDocument();
 * expect(screen.getByText(END_OF_FEED_TEXT.ALL_CAUGHT_UP)).toBeInTheDocument();
 * ```
 */
