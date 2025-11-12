/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
/**
 * TDD RED Phase: GraphQL Query Resolver Tests for Feed and Social Features
 *
 * These tests define the expected behavior for GraphQL Query resolvers:
 * - feed: Returns paginated feed items (authenticated)
 * - comments: Returns paginated comments for a post (public)
 * - followStatus: Returns follow relationship status (authenticated)
 * - postLikeStatus: Returns like status for a post (authenticated)
 *
 * Pattern: Apollo Server v4 with Lambda integration
 * Context: { userId, services, loaders, dynamoClient, tableName }
 * Services: FeedService, CommentService, FollowService, LikeService
 *
 * All tests will FAIL initially - this is the TDD RED phase.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { Query } from '../../src/schema/resolvers/Query.js';
import { typeDefs } from '../../src/schema/typeDefs.js';

// Types
interface GraphQLContext {
  userId?: string;
  services: {
    feedService: {
      getMaterializedFeedItems: (params: {
        userId: string;
        limit?: number;
        cursor?: string;
      }) => Promise<{
        items: any[];
        nextCursor?: string;
      }>;
    };
    commentService: {
      getCommentsByPost: (postId: string, limit: number, cursor?: string) => Promise<{
        comments: any[];
        hasMore: boolean;
        nextCursor?: string;
        totalCount: number;
      }>;
    };
    followService: {
      getFollowStatus: (followerId: string, followeeId: string) => Promise<{
        isFollowing: boolean;
        followersCount: number;
        followingCount: number;
      }>;
    };
    likeService: {
      getLikeStatusesByPostIds: (userId: string, postIds: string[]) => Promise<Map<string, {
        isLiked: boolean;
        likesCount: number;
      }>>;
    };
    postService: {
      getPostById: (postId: string) => Promise<{
        id: string;
        userId: string;
        likesCount: number;
      } | null>;
    };
  };
  loaders?: any;
  dynamoClient?: any;
  tableName?: string;
}

// Original mock schema kept for reference (now using real schema imported at top)
/*
const mockTypeDefs = `#graphql
  type Query {
    feed(limit: Int, cursor: String): FeedConnection!
    comments(postId: ID!, limit: Int, cursor: String): CommentConnection!
    followStatus(userId: ID!): FollowStatus!
    postLikeStatus(postId: ID!): LikeStatus!
  }

  type FeedConnection {
    edges: [FeedEdge!]!
    pageInfo: PageInfo!
  }

  type FeedEdge {
    node: FeedItem!
    cursor: String!
  }

  type FeedItem {
    id: ID!
    userId: ID!
    userHandle: String!
    authorId: ID!
    authorHandle: String!
    authorFullName: String!
    authorProfilePictureUrl: String
    imageUrl: String!
    caption: String!
    likesCount: Int!
    commentsCount: Int!
    createdAt: String!
    isLiked: Boolean!
  }

  type CommentConnection {
    edges: [CommentEdge!]!
    pageInfo: PageInfo!
  }

  type CommentEdge {
    node: Comment!
    cursor: String!
  }

  type Comment {
    id: ID!
    postId: ID!
    userId: ID!
    userHandle: String!
    content: String!
    createdAt: String!
    updatedAt: String!
  }

  type FollowStatus {
    isFollowing: Boolean!
    followersCount: Int!
    followingCount: Int!
  }

  type LikeStatus {
    isLiked: Boolean!
    likesCount: Int!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }
*/

// Use real resolvers
const resolvers = {
  Query
};

// Test data
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_POST_ID = '123e4567-e89b-12d3-a456-426614174001';
const TEST_TARGET_USER_ID = '123e4567-e89b-12d3-a456-426614174002';

/**
 * Create mock feed item
 */
function createMockFeedItem(id: string, createdAt: string) {
  return {
    id,
    userId: TEST_USER_ID,
    userHandle: 'testuser',
    authorId: TEST_USER_ID,
    authorHandle: 'testuser',
    authorFullName: 'Test User',
    authorProfilePictureUrl: 'https://example.com/avatar.jpg',
    imageUrl: 'https://example.com/post.jpg',
    caption: 'Test post',
    likesCount: 10,
    commentsCount: 5,
    createdAt,
    isLiked: false
  };
}

/**
 * Create mock comment
 */
function createMockComment(id: string, postId: string, createdAt: string) {
  return {
    id,
    postId,
    userId: TEST_USER_ID,
    userHandle: 'testuser',
    content: 'Great post!',
    createdAt,
    updatedAt: createdAt
  };
}

describe('GraphQL Feed Query Resolvers (TDD RED Phase)', () => {
  let server: ApolloServer<GraphQLContext>;
  let mockFeedService: any;
  let mockCommentService: any;
  let mockFollowService: any;
  let mockLikeService: any;
  let mockPostService: any;

  beforeEach(() => {
    // Create mock services
    mockFeedService = {
      getMaterializedFeedItems: vi.fn()
    };

    mockCommentService = {
      getCommentsByPost: vi.fn()
    };

    mockFollowService = {
      getFollowStatus: vi.fn()
    };

    mockLikeService = {
      getLikeStatusesByPostIds: vi.fn()
    };

    mockPostService = {
      getPostById: vi.fn()
    };

    // Create Apollo Server instance
    server = new ApolloServer<GraphQLContext>({
      typeDefs,
      resolvers
    });
  });

  // ==========================================================================
  // 1. feed(limit: Int, cursor: String): FeedConnection!
  // ==========================================================================
  describe('Query.feed', () => {
    const FEED_QUERY = `
      query GetFeed($limit: Int, $cursor: String) {
        feed(limit: $limit, cursor: $cursor) {
          edges {
            node {
              id
              post {
                id
                caption
                imageUrl
                likesCount
                commentsCount
              }
              readAt
              createdAt
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    it('should return UNAUTHENTICATED error when userId is missing', async () => {
      const response = await server.executeOperation(
        {
          query: FEED_QUERY,
          variables: { limit: 20 }
        },
        {
          contextValue: {
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should successfully return feed items for authenticated user', async () => {
      const mockFeedItems = [
        createMockFeedItem('post-1', '2025-10-14T10:00:00Z'),
        createMockFeedItem('post-2', '2025-10-14T09:00:00Z')
      ];

      mockFeedService.getMaterializedFeedItems.mockResolvedValue({
        items: mockFeedItems,
        nextCursor: undefined
      });

      const response = await server.executeOperation(
        {
          query: FEED_QUERY,
          variables: { limit: 20 }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.feed).toBeDefined();
        expect(response.body.singleResult.data?.feed.edges).toHaveLength(2);
        expect(response.body.singleResult.data?.feed.edges[0].node.post.id).toBe('post-1');
        expect(response.body.singleResult.data?.feed.pageInfo.hasNextPage).toBe(false);
      }

      expect(mockFeedService.getMaterializedFeedItems).toHaveBeenCalledWith({ userId: TEST_USER_ID, limit: 20, cursor: undefined });
    });

    it('should handle pagination with cursor', async () => {
      const mockFeedItems = [
        createMockFeedItem('post-3', '2025-10-14T08:00:00Z')
      ];

      mockFeedService.getMaterializedFeedItems.mockResolvedValue({
        items: mockFeedItems,
        nextCursor: 'cursor-page-2',
        nextCursor: 'cursor-page-2'
      });

      const response = await server.executeOperation(
        {
          query: FEED_QUERY,
          variables: { limit: 10, cursor: 'cursor-page-1' }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.feed.edges).toHaveLength(1);
        expect(response.body.singleResult.data?.feed.pageInfo.hasNextPage).toBe(true);
        expect(response.body.singleResult.data?.feed.pageInfo.endCursor).toBeDefined();
      }

      expect(mockFeedService.getMaterializedFeedItems).toHaveBeenCalledWith({ userId: TEST_USER_ID, limit: 10, cursor: 'cursor-page-1' });
    });

    it('should return Relay-style connection with edges and pageInfo', async () => {
      mockFeedService.getMaterializedFeedItems.mockResolvedValue({
        items: [createMockFeedItem('post-1', '2025-10-14T10:00:00Z')],
        nextCursor: undefined
      });

      const response = await server.executeOperation(
        {
          query: FEED_QUERY,
          variables: { limit: 20 }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const feed = response.body.singleResult.data?.feed;
        expect(feed).toHaveProperty('edges');
        expect(feed).toHaveProperty('pageInfo');
        expect(feed.edges[0]).toHaveProperty('node');
        expect(feed.edges[0]).toHaveProperty('cursor');
        expect(feed.pageInfo).toHaveProperty('hasNextPage');
        expect(feed.pageInfo).toHaveProperty('endCursor');
      }
    });

    it('should handle empty feed (no items)', async () => {
      mockFeedService.getMaterializedFeedItems.mockResolvedValue({
        items: [],
        nextCursor: undefined
      });

      const response = await server.executeOperation(
        {
          query: FEED_QUERY,
          variables: { limit: 20 }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.feed.edges).toHaveLength(0);
        expect(response.body.singleResult.data?.feed.pageInfo.hasNextPage).toBe(false);
      }
    });
  });

  // ==========================================================================
  // 2. comments(postId: ID!, limit: Int, cursor: String): CommentConnection!
  // ==========================================================================
  describe('Query.comments', () => {
    const COMMENTS_QUERY = `
      query GetComments($postId: ID!, $limit: Int, $cursor: String) {
        comments(postId: $postId, limit: $limit, cursor: $cursor) {
          edges {
            node {
              id
              postId
              userId
              content
              createdAt
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    it('should successfully return comments without authentication (public)', async () => {
      const mockComments = [
        createMockComment('comment-1', TEST_POST_ID, '2025-10-14T10:00:00Z'),
        createMockComment('comment-2', TEST_POST_ID, '2025-10-14T09:00:00Z')
      ];

      mockCommentService.getCommentsByPost.mockResolvedValue({
        comments: mockComments,
        hasMore: false,
        totalCount: 2
      });

      const response = await server.executeOperation(
        {
          query: COMMENTS_QUERY,
          variables: { postId: TEST_POST_ID, limit: 20 }
        },
        {
          contextValue: {
            // No userId - public access
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.comments).toBeDefined();
        expect(response.body.singleResult.data?.comments.edges).toHaveLength(2);
        expect(response.body.singleResult.data?.comments.edges[0].node.content).toBe('Great post!');
      }

      expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(TEST_POST_ID, 20, undefined);
    });

    it('should handle pagination with cursor', async () => {
      const mockComments = [
        createMockComment('comment-3', TEST_POST_ID, '2025-10-14T08:00:00Z')
      ];

      mockCommentService.getCommentsByPost.mockResolvedValue({
        comments: mockComments,
        hasMore: true,
        totalCount: 10
      });

      const response = await server.executeOperation(
        {
          query: COMMENTS_QUERY,
          variables: { postId: TEST_POST_ID, limit: 5, cursor: 'comment-cursor-1' }
        },
        {
          contextValue: {
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.comments.edges).toHaveLength(1);
        expect(response.body.singleResult.data?.comments.pageInfo.hasNextPage).toBe(true);
        expect(response.body.singleResult.data?.comments.pageInfo.endCursor).toBeDefined();
      }

      expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(TEST_POST_ID, 5, 'comment-cursor-1');
    });

    it('should handle empty comments (post with no comments)', async () => {
      mockCommentService.getCommentsByPost.mockResolvedValue({
        comments: [],
        hasMore: false,
        totalCount: 0
      });

      const response = await server.executeOperation(
        {
          query: COMMENTS_QUERY,
          variables: { postId: TEST_POST_ID, limit: 20 }
        },
        {
          contextValue: {
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.comments.edges).toHaveLength(0);
        expect(response.body.singleResult.data?.comments.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should return Relay-style connection with edges and pageInfo', async () => {
      mockCommentService.getCommentsByPost.mockResolvedValue({
        comments: [createMockComment('comment-1', TEST_POST_ID, '2025-10-14T10:00:00Z')],
        hasMore: false,
        totalCount: 1
      });

      const response = await server.executeOperation(
        {
          query: COMMENTS_QUERY,
          variables: { postId: TEST_POST_ID, limit: 20 }
        },
        {
          contextValue: {
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const comments = response.body.singleResult.data?.comments;
        expect(comments).toHaveProperty('edges');
        expect(comments).toHaveProperty('pageInfo');
        expect(comments.edges[0]).toHaveProperty('node');
        expect(comments.edges[0]).toHaveProperty('cursor');
        expect(comments.pageInfo).toHaveProperty('hasNextPage');
      }
    });
  });

  // ==========================================================================
  // 3. followStatus(userId: ID!): FollowStatus!
  // ==========================================================================
  describe('Query.followStatus', () => {
    const FOLLOW_STATUS_QUERY = `
      query GetFollowStatus($userId: ID!) {
        followStatus(userId: $userId) {
          isFollowing
          followersCount
          followingCount
        }
      }
    `;

    it('should return UNAUTHENTICATED error when userId is missing', async () => {
      const response = await server.executeOperation(
        {
          query: FOLLOW_STATUS_QUERY,
          variables: { userId: TEST_TARGET_USER_ID }
        },
        {
          contextValue: {
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should return follow status when following is true', async () => {
      mockFollowService.getFollowStatus.mockResolvedValue({
        isFollowing: true,
        followersCount: 150,
        followingCount: 200
      });

      const response = await server.executeOperation(
        {
          query: FOLLOW_STATUS_QUERY,
          variables: { userId: TEST_TARGET_USER_ID }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.followStatus).toEqual({
          isFollowing: true,
          followersCount: 150,
          followingCount: 200
        });
      }

      expect(mockFollowService.getFollowStatus).toHaveBeenCalledWith(TEST_USER_ID, TEST_TARGET_USER_ID);
    });

    it('should return follow status when following is false', async () => {
      mockFollowService.getFollowStatus.mockResolvedValue({
        isFollowing: false,
        followersCount: 100,
        followingCount: 50
      });

      const response = await server.executeOperation(
        {
          query: FOLLOW_STATUS_QUERY,
          variables: { userId: TEST_TARGET_USER_ID }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.followStatus).toEqual({
          isFollowing: false,
          followersCount: 100,
          followingCount: 50
        });
      }

      expect(mockFollowService.getFollowStatus).toHaveBeenCalledWith(TEST_USER_ID, TEST_TARGET_USER_ID);
    });

    it('should return correct structure with all required fields', async () => {
      mockFollowService.getFollowStatus.mockResolvedValue({
        isFollowing: true,
        followersCount: 42,
        followingCount: 58
      });

      const response = await server.executeOperation(
        {
          query: FOLLOW_STATUS_QUERY,
          variables: { userId: TEST_TARGET_USER_ID }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const followStatus = response.body.singleResult.data?.followStatus;
        expect(followStatus).toHaveProperty('isFollowing');
        expect(followStatus).toHaveProperty('followersCount');
        expect(followStatus).toHaveProperty('followingCount');
        expect(typeof followStatus.isFollowing).toBe('boolean');
        expect(typeof followStatus.followersCount).toBe('number');
        expect(typeof followStatus.followingCount).toBe('number');
      }
    });
  });

  // ==========================================================================
  // 4. postLikeStatus(postId: ID!): LikeStatus!
  // ==========================================================================
  describe('Query.postLikeStatus', () => {
    const LIKE_STATUS_QUERY = `
      query GetPostLikeStatus($postId: ID!) {
        postLikeStatus(postId: $postId) {
          isLiked
          likesCount
        }
      }
    `;

    it('should return UNAUTHENTICATED error when userId is missing', async () => {
      const response = await server.executeOperation(
        {
          query: LIKE_STATUS_QUERY,
          variables: { postId: TEST_POST_ID }
        },
        {
          contextValue: {
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should return like status when liked is true', async () => {
      mockLikeService.getLikeStatusesByPostIds.mockResolvedValue(
        new Map([[TEST_POST_ID, { isLiked: true, likesCount: 42 }]])
      );
      mockPostService.getPostById.mockResolvedValue({
        id: TEST_POST_ID,
        userId: TEST_USER_ID,
        likesCount: 42
      });

      const response = await server.executeOperation(
        {
          query: LIKE_STATUS_QUERY,
          variables: { postId: TEST_POST_ID }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.postLikeStatus).toEqual({
          isLiked: true,
          likesCount: 42
        });
      }

      expect(mockLikeService.getLikeStatusesByPostIds).toHaveBeenCalledWith(TEST_USER_ID, [TEST_POST_ID]);
    });

    it('should return like status when liked is false', async () => {
      mockLikeService.getLikeStatusesByPostIds.mockResolvedValue(
        new Map([[TEST_POST_ID, { isLiked: false, likesCount: 10 }]])
      );
      mockPostService.getPostById.mockResolvedValue({
        id: TEST_POST_ID,
        userId: TEST_USER_ID,
        likesCount: 10
      });

      const response = await server.executeOperation(
        {
          query: LIKE_STATUS_QUERY,
          variables: { postId: TEST_POST_ID }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.postLikeStatus).toEqual({
          isLiked: false,
          likesCount: 10
        });
      }

      expect(mockLikeService.getLikeStatusesByPostIds).toHaveBeenCalledWith(TEST_USER_ID, [TEST_POST_ID]);
    });

    it('should return correct structure with all required fields', async () => {
      mockLikeService.getLikeStatusesByPostIds.mockResolvedValue(
        new Map([[TEST_POST_ID, { isLiked: true, likesCount: 99 }]])
      );
      mockPostService.getPostById.mockResolvedValue({
        id: TEST_POST_ID,
        userId: TEST_USER_ID,
        likesCount: 99
      });

      const response = await server.executeOperation(
        {
          query: LIKE_STATUS_QUERY,
          variables: { postId: TEST_POST_ID }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const likeStatus = response.body.singleResult.data?.postLikeStatus;
        expect(likeStatus).toHaveProperty('isLiked');
        expect(likeStatus).toHaveProperty('likesCount');
        expect(typeof likeStatus.isLiked).toBe('boolean');
        expect(typeof likeStatus.likesCount).toBe('number');
      }
    });

    it('should handle zero likes correctly', async () => {
      mockLikeService.getLikeStatusesByPostIds.mockResolvedValue(
        new Map([[TEST_POST_ID, { isLiked: false, likesCount: 0 }]])
      );
      mockPostService.getPostById.mockResolvedValue({
        id: TEST_POST_ID,
        userId: TEST_USER_ID,
        likesCount: 0
      });

      const response = await server.executeOperation(
        {
          query: LIKE_STATUS_QUERY,
          variables: { postId: TEST_POST_ID }
        },
        {
          contextValue: {
            userId: TEST_USER_ID,
            services: {
              feedService: mockFeedService,
              commentService: mockCommentService,
              followService: mockFollowService,
              likeService: mockLikeService,
              postService: mockPostService,
              profileService: {} as any,
              notificationService: {} as any,
              authService: {} as any,
              auctionService: {} as any
            }
          }
        }
      );

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.postLikeStatus.likesCount).toBe(0);
      }
    });
  });
});
