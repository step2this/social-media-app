/**
 * Feed Query Constants
 *
 * Centralized GraphQL query strings for feed-related tests.
 * Prevents duplication and ensures consistency across test files.
 *
 * @example
 * ```typescript
 * import { FEED_QUERIES } from '../helpers/feed-query-constants';
 *
 * const result = await executor.execute(FEED_QUERIES.EXPLORE_FEED_FULL, { limit: 24 });
 * ```
 */

/**
 * Complete exploreFeed query with all fields
 */
export const EXPLORE_FEED_FULL = `
  query GetExploreFeed($limit: Int, $cursor: String) {
    exploreFeed(limit: $limit, cursor: $cursor) {
      edges {
        cursor
        node {
          id
          userId
          caption
          imageUrl
          thumbnailUrl
          likesCount
          commentsCount
          createdAt
          author {
            id
            handle
            fullName
            profilePictureUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Minimal exploreFeed query for testing pagination
 */
export const EXPLORE_FEED_MINIMAL = `
  query GetExploreFeed($limit: Int, $cursor: String) {
    exploreFeed(limit: $limit, cursor: $cursor) {
      edges {
        node {
          id
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

/**
 * Complete followingFeed query with all fields
 */
export const FOLLOWING_FEED_FULL = `
  query GetFollowingFeed($limit: Int, $cursor: String) {
    followingFeed(limit: $limit, cursor: $cursor) {
      edges {
        cursor
        node {
          id
          userId
          caption
          imageUrl
          thumbnailUrl
          likesCount
          commentsCount
          isLiked
          createdAt
          author {
            id
            handle
            fullName
            profilePictureUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Minimal followingFeed query for testing pagination
 */
export const FOLLOWING_FEED_MINIMAL = `
  query GetFollowingFeed($limit: Int, $cursor: String) {
    followingFeed(limit: $limit, cursor: $cursor) {
      edges {
        node {
          id
          caption
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

/**
 * Query for marking posts as read
 */
export const MARK_POSTS_AS_READ = `
  mutation MarkPostsAsRead($postIds: [ID!]!) {
    markPostsAsRead(postIds: $postIds) {
      success
      markedCount
    }
  }
`;

/**
 * Test pagination constants
 */
export const TEST_PAGINATION = {
  DEFAULT_LIMIT: 24,
  SMALL_LIMIT: 10,
  VALID_CURSOR: 'eyJpZCI6InBvc3QtMSJ9',
  INVALID_CURSOR: 'invalid-base64!!!',
} as const;

/**
 * Test user IDs
 */
export const TEST_USERS = {
  USER_1: 'user-1',
  USER_2: 'user-2',
  FOLLOWING_USER_1: 'following-user-1',
  FOLLOWING_USER_2: 'following-user-2',
} as const;

/**
 * Grouped feed queries for easy import
 */
export const FEED_QUERIES = {
  EXPLORE_FEED_FULL,
  EXPLORE_FEED_MINIMAL,
  FOLLOWING_FEED_FULL,
  FOLLOWING_FEED_MINIMAL,
  MARK_POSTS_AS_READ,
} as const;
