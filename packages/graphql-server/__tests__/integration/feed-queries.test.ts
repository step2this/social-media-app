/**
 * GraphQL Integration Tests - Feed Queries (CONSOLIDATED)
 *
 * 5 core, durable integration tests focused on real user flows.
 * Tests use shared fixtures and helpers for maintainability.
 *
 * Test Coverage:
 * 1. Explore Feed - Complete flow with pagination
 * 2. Following Feed - Complete flow with pagination
 * 3. Following Feed - Authentication enforcement
 * 4. Empty Feeds - Both feeds handle empty results
 * 5. Service Errors - Graceful error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { createApolloServer } from '../../src/server.js';
import type { GraphQLContext } from '../../src/context.js';
import type { PostService, ProfileService } from '@social-media-app/dal';

import {
  ContextBuilder,
  QueryExecutor,
  FEED_QUERIES,
  FeedMatchers,
  TEST_USER_ID,
  TEST_PAGINATION,
  createStandardProfileMap,
} from '../helpers/index.js';

import {
  createMockExploreFeed,
  createMockFollowingFeed,
  createMockEmptyExploreFeed,
  createMockEmptyFollowingFeed,
} from '@social-media-app/shared/test-utils';

describe('GraphQL Integration - Feed Queries', () => {
  let server: ApolloServer<GraphQLContext>;
  let authContext: GraphQLContext;
  let unauthContext: GraphQLContext;
  let postService: PostService;
  let profileService: ProfileService;

  beforeEach(async () => {
    server = createApolloServer();
    await server.start();

    // Create shared mock services for both contexts
    const mockPostService = {
      getFeedPosts: vi.fn(),
      getFollowingFeedPosts: vi.fn(),
      getPostById: vi.fn(),
      getUserPosts: vi.fn(),
      createPost: vi.fn(),
      updatePost: vi.fn(),
      deletePost: vi.fn(),
    } as unknown as PostService;

    const mockProfileService = {
      getProfilesByIds: vi.fn(),
      getProfileByHandle: vi.fn(),
      updateProfile: vi.fn(),
    } as unknown as ProfileService;

    const mockLikeService = {
      getLikeStatusesByPostIds: vi.fn().mockResolvedValue(new Map()),
      likePost: vi.fn(),
      unlikePost: vi.fn(),
    } as any;

    authContext = ContextBuilder.create()
      .authenticated(TEST_USER_ID)
      .withServices({
        postService: mockPostService,
        profileService: mockProfileService,
        likeService: mockLikeService
      })
      .build();

    unauthContext = ContextBuilder.create()
      .unauthenticated()
      .withServices({
        postService: mockPostService,
        profileService: mockProfileService,
        likeService: mockLikeService
      })
      .build();

    postService = authContext.services.postService;
    profileService = authContext.services.profileService;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.stop();
    vi.restoreAllMocks();
  });

  it('should return explore feed with posts and pagination', async () => {
    // Arrange - Mock feed with 2 posts and hasMore=true
    const mockResponse = createMockExploreFeed(2, true);
    vi.mocked(postService.getFeedPosts).mockResolvedValue(mockResponse);
    vi.mocked(profileService.getProfilesByIds).mockResolvedValue(createStandardProfileMap());

    // Act - Query with pagination limit
    const executor = new QueryExecutor(server, unauthContext);
    const data = await executor.executeAndAssertSuccess(
      FEED_QUERIES.EXPLORE_FEED_FULL,
      { limit: TEST_PAGINATION.SMALL_LIMIT }
    );

    // Assert - Verify complete feed structure
    FeedMatchers.expectPostConnection(data.exploreFeed);
    FeedMatchers.expectEdgeCount(data.exploreFeed, 2);
    FeedMatchers.expectPageInfo(data.exploreFeed.pageInfo, true, false);
    FeedMatchers.expectCompletePost(data.exploreFeed.edges[0].node);

    // Verify service called with correct params
    expect(postService.getFeedPosts).toHaveBeenCalledWith(TEST_PAGINATION.SMALL_LIMIT, undefined);
  });

  it('should return following feed for authenticated user with pagination', async () => {
    // Arrange - Mock following feed with posts from followed users
    const mockResponse = createMockFollowingFeed(2, true);
    vi.mocked(postService.getFollowingFeedPosts).mockResolvedValue(mockResponse);
    vi.mocked(profileService.getProfilesByIds).mockResolvedValue(createStandardProfileMap());

    // Act - Authenticated query
    const executor = new QueryExecutor(server, authContext);
    const data = await executor.executeAndAssertSuccess(
      FEED_QUERIES.FOLLOWING_FEED_FULL,
      { limit: TEST_PAGINATION.SMALL_LIMIT }
    );

    // Assert - Verify feed with isLiked field
    FeedMatchers.expectPostConnection(data.followingFeed);
    FeedMatchers.expectEdgeCount(data.followingFeed, 2);
    FeedMatchers.expectPageInfo(data.followingFeed.pageInfo, true, false);

    // Verify isLiked field is present (auth-specific field)
    const firstPost = data.followingFeed.edges[0].node;
    expect(firstPost).toHaveProperty('isLiked');

    expect(postService.getFollowingFeedPosts).toHaveBeenCalledWith(
      TEST_USER_ID,
      authContext.services.followService,
      TEST_PAGINATION.SMALL_LIMIT,
      undefined
    );
  });

  it('should require authentication for following feed', async () => {
    // Act - Attempt unauthenticated access
    const executor = new QueryExecutor(server, unauthContext);
    await executor.executeAndAssertError(
      FEED_QUERIES.FOLLOWING_FEED_MINIMAL,
      undefined,
      'UNAUTHENTICATED'
    );

    // Assert - Service should not be called
    expect(postService.getFollowingFeedPosts).not.toHaveBeenCalled();
  });

  it('should handle empty feeds gracefully', async () => {
    // Test both exploreFeed and followingFeed with empty results

    // Test 1: Empty explore feed
    const emptyExplore = createMockEmptyExploreFeed();
    vi.mocked(postService.getFeedPosts).mockResolvedValue(emptyExplore);

    const unauthExecutor = new QueryExecutor(server, unauthContext);
    const exploreData = await unauthExecutor.executeAndAssertSuccess(FEED_QUERIES.EXPLORE_FEED_MINIMAL);

    // Verify empty connection (MINIMAL query only has hasNextPage)
    expect(exploreData.exploreFeed.edges).toHaveLength(0);
    expect(exploreData.exploreFeed.pageInfo.hasNextPage).toBe(false);

    // Test 2: Empty following feed
    const emptyFollowing = createMockEmptyFollowingFeed();
    vi.mocked(postService.getFollowingFeedPosts).mockResolvedValue(emptyFollowing);

    const authExecutor = new QueryExecutor(server, authContext);
    const followingData = await authExecutor.executeAndAssertSuccess(FEED_QUERIES.FOLLOWING_FEED_MINIMAL);

    // Verify empty connection
    expect(followingData.followingFeed.edges).toHaveLength(0);
    expect(followingData.followingFeed.pageInfo.hasNextPage).toBe(false);
  });

  it('should handle service errors gracefully', async () => {
    // Arrange - Service throws error
    vi.mocked(postService.getFeedPosts).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Act - Query should return GraphQL error
    const executor = new QueryExecutor(server, unauthContext);
    const errors = await executor.executeAndAssertError(FEED_QUERIES.EXPLORE_FEED_MINIMAL);

    // Assert - Error should be present and formatted
    expect(errors).toBeDefined();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].extensions?.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
