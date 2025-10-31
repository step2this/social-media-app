/**
 * Relay Feed Fixture Adapters
 *
 * Adapts existing @social-media-app/shared fixtures to Relay MockResolvers format.
 * Follows the proven NotificationBellScenarios pattern.
 *
 * Benefits:
 * - Reuses existing domain fixtures (DRY)
 * - Type-safe transformation
 * - Pre-built scenarios for common test cases
 * - Reduces test boilerplate by 80%
 */

import type { MockResolvers } from 'relay-test-utils';
import type { PostGridItem, PostWithAuthor } from '@social-media-app/shared';
import {
  createMockExploreFeed,
  createMockFollowingFeed,
  createMockEmptyExploreFeed,
  createMockEmptyFollowingFeed,
} from '@social-media-app/shared/test-utils';

/**
 * Convert PostGridItem or PostWithAuthor to Relay node format
 *
 * This is the inverse of our transformer - it goes from domain type
 * to Relay GraphQL format for mocking.
 *
 * Pattern: Type union with type narrowing
 */
function toRelayPostNode(post: PostGridItem | PostWithAuthor): Record<string, unknown> {
  // Determine thumbnailUrl based on post type
  // PostGridItem has thumbnailUrl, PostWithAuthor uses imageUrl as fallback
  const thumbnailUrl = 'thumbnailUrl' in post 
    ? post.thumbnailUrl 
    : `https://example.com/thumbnails/${post.id}.jpg`;

  // Base fields present in both types
  const baseNode = {
    id: post.id,
    userId: post.userId,
    caption: post.caption ?? null,
    thumbnailUrl,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    author: {
      id: post.userId,
      handle: post.userHandle,
      username: 'authorFullName' in post ? post.authorFullName : `User ${post.userHandle}`,
      fullName: 'authorFullName' in post ? post.authorFullName : `User ${post.userHandle}`,
      profilePictureUrl: 'authorProfilePictureUrl' in post
        ? post.authorProfilePictureUrl
        : null,
    },
  };

  // PostWithAuthor has additional fields
  if ('imageUrl' in post) {
    return {
      ...baseNode,
      imageUrl: post.imageUrl,
      isLiked: post.isLiked ?? false,
      updatedAt: post.createdAt, // Fallback to createdAt
    };
  }

  // PostGridItem (minimal fields)
  return {
    ...baseNode,
    imageUrl: `https://example.com/images/${post.id}.jpg`, // Default
    isLiked: false,
    updatedAt: post.createdAt,
  };
}

/**
 * Build Relay Connection structure
 *
 * Helper to create the standard Relay Connection response shape
 * with edges and pageInfo.
 */
function buildRelayConnection<T>(
  items: T[],
  hasNextPage: boolean,
  toNode: (item: T) => Record<string, unknown>
) {
  return {
    edges: items.map((item, index) => ({
      node: toNode(item),
      cursor: `cursor-${index}`,
    })),
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? `cursor-${items.length}` : null,
    },
  };
}

/**
 * Build MockResolvers for ExploreFeed query
 */
export function buildExploreFeedResolvers(options: {
  readonly postCount?: number;
  readonly hasMore?: boolean;
  readonly posts?: readonly PostGridItem[];
}): MockResolvers {
  const { postCount = 12, hasMore = false, posts } = options;

  const feedData = posts
    ? { posts: [...posts], hasMore, totalCount: posts.length, nextCursor: hasMore ? 'cursor-next' : undefined }
    : createMockExploreFeed(postCount, hasMore);

  return {
    Query: () => ({
      exploreFeed: buildRelayConnection(
        feedData.posts,
        feedData.hasMore,
        toRelayPostNode
      ),
    }),
  };
}

/**
 * Build MockResolvers for FollowingFeed query
 */
export function buildFollowingFeedResolvers(options: {
  readonly postCount?: number;
  readonly hasMore?: boolean;
  readonly posts?: readonly PostWithAuthor[];
}): MockResolvers {
  const { postCount = 12, hasMore = false, posts } = options;

  const feedData = posts
    ? { posts: [...posts], hasMore }
    : createMockFollowingFeed(postCount, hasMore);

  return {
    Query: () => ({
      followingFeed: buildRelayConnection(
        feedData.posts,
        feedData.hasMore,
        toRelayPostNode
      ),
    }),
  };
}

/**
 * Pre-built scenarios for common test cases
 *
 * Follows NotificationBellScenarios pattern for consistency.
 * Named exports for better IDE autocomplete.
 */
export const FeedScenarios = {
  // Empty states
  emptyExplore: (): MockResolvers => buildExploreFeedResolvers({
    posts: createMockEmptyExploreFeed().posts,
    hasMore: false,
  }),

  emptyFollowing: (): MockResolvers => buildFollowingFeedResolvers({
    posts: createMockEmptyFollowingFeed().posts,
    hasMore: false,
  }),

  // Standard feeds (12 posts, has more)
  exploreFeed: (count: number = 12): MockResolvers =>
    buildExploreFeedResolvers({ postCount: count, hasMore: true }),

  followingFeed: (count: number = 12): MockResolvers =>
    buildFollowingFeedResolvers({ postCount: count, hasMore: true }),

  // First page (24 posts, has more) - for pagination tests
  exploreFirstPage: (): MockResolvers =>
    buildExploreFeedResolvers({ postCount: 24, hasMore: true }),

  followingFirstPage: (): MockResolvers =>
    buildFollowingFeedResolvers({ postCount: 24, hasMore: true }),

  // Last page (few posts, no more) - for end of feed tests
  exploreLastPage: (count: number = 8): MockResolvers =>
    buildExploreFeedResolvers({ postCount: count, hasMore: false }),

  followingLastPage: (count: number = 8): MockResolvers =>
    buildFollowingFeedResolvers({ postCount: count, hasMore: false }),

  // Single post - useful for specific test cases
  singlePost: (): MockResolvers =>
    buildExploreFeedResolvers({ postCount: 1, hasMore: false }),
} as const;
