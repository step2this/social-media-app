/**
 * Refactored Query Constants
 *
 * Centralized GraphQL query strings for testing refactored resolvers.
 * Prevents duplication and ensures consistency across integration tests.
 *
 * Resolvers covered:
 * - Comments (paginated)
 * - Notifications (paginated, auth-required)
 * - FollowStatus (auth-required)
 * - PostLikeStatus (auth-required)
 * - UnreadNotificationsCount (auth-required)
 * - Auction (single lookup)
 * - Auctions (filtered list)
 * - Bids (paginated, scoped to auction)
 *
 * @example
 * ```typescript
 * import { REFACTORED_QUERIES } from '../helpers/refactored-query-constants';
 *
 * const result = await executor.execute(REFACTORED_QUERIES.COMMENTS, { postId: 'post-1', limit: 20 });
 * ```
 */

/**
 * Query for comments on a post with pagination
 */
export const COMMENTS = `
  query GetComments($postId: ID!, $limit: Int!, $cursor: String) {
    comments(postId: $postId, limit: $limit, cursor: $cursor) {
      edges {
        node {
          id
          content
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

/**
 * Query for user notifications with pagination (auth-required)
 * Note: Schema uses 'status' enum (UNREAD/READ/ARCHIVED), not boolean 'read'
 */
export const NOTIFICATIONS = `
  query GetNotifications($limit: Int!, $cursor: String) {
    notifications(limit: $limit, cursor: $cursor) {
      edges {
        node {
          id
          type
          status
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

/**
 * Query for follow and like status (auth-required)
 * Tests multiple status queries in a single request
 */
export const FOLLOW_AND_LIKE_STATUS = `
  query GetStatuses($followeeId: ID!, $postId: ID!) {
    followStatus(followeeId: $followeeId) {
      isFollowing
      followersCount
      followingCount
    }
    postLikeStatus(postId: $postId) {
      isLiked
      likeCount
    }
  }
`;

/**
 * Query for unread notifications count (auth-required)
 * Simplest query type - returns a scalar
 */
export const UNREAD_COUNT = `
  query GetUnreadCount {
    unreadNotificationsCount
  }
`;

/**
 * Query for single auction and filtered auction list
 * Tests single item lookup + filtered list in same request
 */
export const AUCTION_AND_LIST = `
  query GetAuctions($auctionId: ID!, $status: String, $limit: Int!) {
    auction(id: $auctionId) {
      id
      status
      currentPrice
      startingPrice
    }
    auctions(status: $status, limit: $limit) {
      edges {
        node {
          id
          status
          currentPrice
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

/**
 * Query for bid history on an auction
 * Tests nested/scoped resource pattern
 * Note: BidConnection uses simple array format, not Connection pattern
 */
export const BIDS = `
  query GetBids($auctionId: ID!, $limit: Int!, $offset: Int) {
    bids(auctionId: $auctionId, limit: $limit, offset: $offset) {
      bids {
        id
        auctionId
        amount
        createdAt
      }
      total
    }
  }
`;

/**
 * Grouped refactored queries for easy import
 */
export const REFACTORED_QUERIES = {
  COMMENTS,
  NOTIFICATIONS,
  FOLLOW_AND_LIKE_STATUS,
  UNREAD_COUNT,
  AUCTION_AND_LIST,
  BIDS,
} as const;
