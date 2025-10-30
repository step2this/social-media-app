/**
 * Centralized Error Scenario Definitions
 *
 * Shared error messages and codes used across all test suites.
 * Provides consistency in error testing across frontend, backend, and GraphQL server.
 *
 * @example
 * ```typescript
 * import { errorScenarios } from '@social-media-app/shared/test-utils';
 *
 * // In tests
 * const error = errorScenarios.authentication.notAuthenticated;
 * expect(result.error.message).toBe(error.message);
 * expect(result.error.extensions?.code).toBe(error.code);
 * ```
 */

/**
 * Error scenario structure
 */
export interface ErrorScenario {
  message: string;
  code: string;
}

/**
 * Centralized error scenario definitions
 * Used across all test suites for consistency
 */
export const errorScenarios = {
  /**
   * Authentication error scenarios
   */
  authentication: {
    notAuthenticated: {
      message: 'Not authenticated',
      code: 'UNAUTHENTICATED',
    },
    unauthenticated: {
      message: 'Not authenticated',
      code: 'UNAUTHENTICATED',
    },
  },

  /**
   * Validation error scenarios
   */
  validation: {
    emptyComment: {
      message: 'Comment cannot be empty',
      code: 'BAD_USER_INPUT',
    },
    commentTooLong: {
      message: 'Comment must not exceed 500 characters',
      code: 'BAD_USER_INPUT',
    },
  },

  /**
   * Not found error scenarios
   */
  notFound: {
    post: {
      message: 'Post not found',
      code: 'NOT_FOUND',
    },
    comment: {
      message: 'Comment not found',
      code: 'NOT_FOUND',
    },
    user: {
      message: 'User not found',
      code: 'NOT_FOUND',
    },
    auction: {
      message: 'Auction not found',
      code: 'NOT_FOUND',
    },
    notification: {
      message: 'Notification not found',
      code: 'NOT_FOUND',
    },
  },

  /**
   * Permission error scenarios
   */
  permission: {
    forbidden: {
      message: 'Not authorized to delete this comment',
      code: 'FORBIDDEN',
    },
    forbiddenUpdate: {
      message: 'Not authorized to update this post',
      code: 'FORBIDDEN',
    },
    forbiddenDelete: {
      message: 'Not authorized to delete this post',
      code: 'FORBIDDEN',
    },
  },

  /**
   * Server error scenarios
   */
  server: {
    createComment: {
      message: 'Failed to create comment',
      code: 'INTERNAL_SERVER_ERROR',
    },
    fetchComments: {
      message: 'Failed to fetch comments',
      code: 'INTERNAL_SERVER_ERROR',
    },
    deleteComment: {
      message: 'Failed to delete comment',
      code: 'INTERNAL_SERVER_ERROR',
    },
    createPost: {
      message: 'Failed to create post',
      code: 'INTERNAL_SERVER_ERROR',
    },
    fetchPost: {
      message: 'Failed to fetch post',
      code: 'INTERNAL_SERVER_ERROR',
    },
    updatePost: {
      message: 'Failed to update post',
      code: 'INTERNAL_SERVER_ERROR',
    },
    deletePost: {
      message: 'Failed to delete post',
      code: 'INTERNAL_SERVER_ERROR',
    },
    likePost: {
      message: 'Failed to like post',
      code: 'INTERNAL_SERVER_ERROR',
    },
    unlikePost: {
      message: 'Failed to unlike post',
      code: 'INTERNAL_SERVER_ERROR',
    },
    fetchLikeStatus: {
      message: 'Failed to fetch like status',
      code: 'INTERNAL_SERVER_ERROR',
    },
    placeBid: {
      message: 'Failed to place bid',
      code: 'INTERNAL_SERVER_ERROR',
    },
    fetchAuction: {
      message: 'Failed to fetch auction',
      code: 'INTERNAL_SERVER_ERROR',
    },
    fetchExploreFeed: {
      message: 'Failed to fetch explore feed',
      code: 'INTERNAL_SERVER_ERROR',
    },
    fetchFollowingFeed: {
      message: 'Failed to fetch following feed',
      code: 'INTERNAL_SERVER_ERROR',
    },
    markPostsAsRead: {
      message: 'Failed to mark posts as read',
      code: 'INTERNAL_SERVER_ERROR',
    },
  },

  /**
   * Network error scenarios
   */
  network: {
    error: {
      message: 'Network error',
      code: 'NETWORK_ERROR',
    },
  },
} as const;
