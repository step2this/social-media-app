/**
 * GraphQL Feed Operations
 *
 * GraphQL query and mutation definitions for feed management.
 * Uses const assertions for type safety.
 */

/**
 * Reuse Post fragment from posts operations
 */
import { POST_FRAGMENT } from './posts';

/**
 * Get explore feed (all public posts)
 */
export const GET_EXPLORE_FEED_QUERY = `
  ${POST_FRAGMENT}

  query GetExploreFeed($limit: Int, $cursor: String) {
    exploreFeed(limit: $limit, cursor: $cursor) {
      edges {
        cursor
        node {
          ...PostFields
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
` as const;

/**
 * Get following feed (posts from users you follow)
 */
export const GET_FOLLOWING_FEED_QUERY = `
  ${POST_FRAGMENT}

  query GetFollowingFeed($limit: Int, $cursor: String) {
    followingFeed(limit: $limit, cursor: $cursor) {
      edges {
        cursor
        node {
          ...PostFields
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
` as const;

/**
 * Mark posts as read
 */
export const MARK_POSTS_AS_READ_MUTATION = `
  mutation MarkPostsAsRead($input: MarkPostsAsReadInput!) {
    markPostsAsRead(input: $input) {
      success
      markedCount
    }
  }
` as const;
