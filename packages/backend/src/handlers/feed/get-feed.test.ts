/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
/**
 * TDD RED Phase: Comprehensive tests for hybrid feed GET handler
 *
 * This test suite covers Phase 5 of the hybrid materialized feed system.
 * Tests the GET /feed endpoint that combines:
 * - Materialized feed items (pre-computed for normal users)
 * - Query-time feed items (fetched on-demand for celebrities >= 5000 followers)
 *
 * Test Coverage:
 * 1. Authentication & Authorization (7 tests)
 * 2. Materialized Feed Items (7 tests)
 * 3. Celebrity Detection & Query-Time Fetch (10 tests)
 * 4. Merge & Sort Logic (8 tests)
 * 5. Pagination (7 tests)
 * 6. Response Format (6 tests)
 * 7. Error Handling (7 tests)
 * 8. Edge Cases (6 tests)
 *
 * Total: 58 comprehensive tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { FeedPostItem } from '@social-media-app/shared';

// Test constants
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_CELEBRITY_ID_1 = '123e4567-e89b-12d3-a456-426614174001';
const TEST_CELEBRITY_ID_2 = '123e4567-e89b-12d3-a456-426614174002';
const TEST_NORMAL_USER_ID = '123e4567-e89b-12d3-a456-426614174003';
const TEST_JWT_SECRET = 'test-secret';
const CELEBRITY_THRESHOLD = 5000;

// Mock service functions (hoisted)
const mockGetMaterializedFeedItems = vi.fn();
const mockGetFollowingList = vi.fn();
const mockGetFollowerCount = vi.fn();
const mockGetUserPosts = vi.fn();

// Mock utils
vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string, details?: any) => ({
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message, ...(details && { details }) })
  }),
  successResponse: (status: number, data: any) => ({
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  verifyAccessToken: vi.fn(async () => ({ userId: TEST_USER_ID, email: 'test@example.com' })),
  getJWTConfigFromEnv: vi.fn(() => ({ secret: TEST_JWT_SECRET }))
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(() => ({})),
  createS3Client: vi.fn(() => ({})),
  getTableName: vi.fn(() => 'test-table'),
  getS3BucketName: vi.fn(() => 'test-bucket'),
  getCloudFrontDomain: vi.fn(() => 'https://d123.cloudfront.net')
}));

vi.mock('../../utils/aws-config.js', () => ({
  createRedisClient: vi.fn(() => {
    throw new Error('Redis not available in test environment');
  })
}));

// Mock DAL services
vi.mock('@social-media-app/dal', () => ({
  FeedService: vi.fn().mockImplementation(() => ({
    getMaterializedFeedItems: mockGetMaterializedFeedItems
  })),
  FollowService: vi.fn().mockImplementation(() => ({
    getFollowingList: mockGetFollowingList,
    getFollowerCount: mockGetFollowerCount
  })),
  PostService: vi.fn().mockImplementation(() => ({
    getUserPosts: mockGetUserPosts
  })),
  ProfileService: vi.fn().mockImplementation(() => ({})),
  RedisCacheService: vi.fn().mockImplementation(() => ({}))
}));

/**
 * Helper: Create mock API Gateway event
 */
function createEvent(
  userId?: string,
  queryParams?: Record<string, string>
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'GET /feed',
    rawPath: '/feed',
    rawQueryString: queryParams ? new URLSearchParams(queryParams).toString() : '',
    headers: {
      'content-type': 'application/json',
      ...(userId && { authorization: `Bearer mock-jwt-token-${userId}` })
    },
    requestContext: {
      authorizer: userId ? { userId } : undefined,
      requestId: 'test-request-id',
      http: {
        method: 'GET',
        path: '/feed',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent'
      },
      stage: 'test',
      time: '2025-10-12T00:00:00.000Z',
      timeEpoch: 1728691200000,
      domainName: 'api.example.com',
      accountId: '123456789012',
      apiId: 'api123',
      routeKey: 'GET /feed',
      domainPrefix: 'api'
    } as any,
    queryStringParameters: queryParams,
    isBase64Encoded: false
  };
}

/**
 * Helper: Create mock feed post item
 */
function createMockFeedItem(
  postId: string,
  authorId: string,
  createdAt: string,
  source: 'materialized' | 'query-time' = 'materialized'
): FeedPostItem {
  return {
    id: postId,
    userId: authorId,
    userHandle: `user-${authorId.slice(0, 8)}`,
    authorId,
    authorHandle: `user-${authorId.slice(0, 8)}`,
    authorFullName: `User ${authorId.slice(0, 8)}`,
    authorProfilePictureUrl: `https://example.com/${authorId}.jpg`,
    imageUrl: `https://example.com/posts/${postId}.jpg`,
    caption: `Test post ${postId}`,
    likesCount: 10,
    commentsCount: 5,
    createdAt,
    isLiked: false,
    source
  };
}

/**
 * Helper: Create mock post (from PostService.getUserPosts)
 */
function createMockPost(postId: string, userId: string, createdAt: string) {
  return {
    id: postId,
    userId,
    userHandle: `user-${userId.slice(0, 8)}`,
    imageUrl: `https://example.com/posts/${postId}.jpg`,
    thumbnailUrl: `https://example.com/posts/${postId}-thumb.jpg`,
    caption: `Test post ${postId}`,
    tags: [],
    likesCount: 10,
    commentsCount: 5,
    isPublic: true,
    createdAt,
    updatedAt: createdAt
  };
}

describe('get-feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations (successful responses)
    mockGetMaterializedFeedItems.mockResolvedValue({
      items: [],
      nextCursor: undefined
    });

    mockGetFollowingList.mockResolvedValue([]);
    mockGetFollowerCount.mockResolvedValue(0);
    mockGetUserPosts.mockResolvedValue({
      posts: [],
      nextCursor: undefined,
      hasMore: false
    });
  });

  // ==========================================================================
  // 1. Authentication & Authorization (7 tests)
  // ==========================================================================
  describe('Authentication & Authorization', () => {
    it('should return 401 if no userId in auth context', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent();
      delete event.requestContext.authorizer;

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('authorization');
    });

    it('should return 401 if userId is missing from authorizer', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent();
      event.requestContext.authorizer = {} as any;

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 400 if userId is invalid format (not UUID)', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent('invalid-user-id');

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('invalid');
    });

    it('should return 401 if userId is empty string (no auth header)', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent('');

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 401 if authorization header is missing', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent();
      delete event.headers.authorization;
      delete event.requestContext.authorizer;

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 if JWT token verification fails', async () => {
      const { handler } = await import('./get-feed.js');
      const utils = await import('../../utils/index.js');
      vi.mocked(utils.verifyAccessToken).mockRejectedValueOnce(new Error('Invalid token'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
    });

    it('should handle valid authenticated requests', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      // Should not be 401 (may be 200 or other valid response)
      expect(response.statusCode).not.toBe(401);
    });
  });

  // ==========================================================================
  // 2. Materialized Feed Items (7 tests)
  // ==========================================================================
  describe('Materialized Feed Items', () => {
    it('should fetch materialized feed items for user', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetMaterializedFeedItems).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        limit: expect.any(Number),
        cursor: undefined
      });
    });

    it('should pass limit parameter to FeedService', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent(TEST_USER_ID, { limit: '50' });

      await handler(event);

      expect(mockGetMaterializedFeedItems).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        limit: 50,
        cursor: undefined
      });
    });

    it('should pass cursor parameter to FeedService', async () => {
      const { handler } = await import('./get-feed.js');
      const testCursor = 'base64encodedcursor';
      const event = createEvent(TEST_USER_ID, { cursor: testCursor });

      await handler(event);

      expect(mockGetMaterializedFeedItems).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        limit: expect.any(Number),
        cursor: testCursor
      });
    });

    it('should handle empty materialized feed', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.posts || body.items)).toBe(true);
    });

    it('should default limit to 20 if not provided', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetMaterializedFeedItems).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        limit: 20,
        cursor: undefined
      });
    });

    it('should reject limit exceeding 100 maximum', async () => {
      const { handler } = await import('./get-feed.js');
      const event = createEvent(TEST_USER_ID, { limit: '500' });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid pagination parameters');
      expect(body.details.message).toContain('Limit cannot exceed 100');
      expect(mockGetMaterializedFeedItems).not.toHaveBeenCalled();
    });

    it('should handle FeedService errors gracefully', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetMaterializedFeedItems.mockRejectedValueOnce(new Error('DynamoDB error'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeTruthy();
    });
  });

  // ==========================================================================
  // 3. Celebrity Detection & Query-Time Fetch (10 tests)
  // ==========================================================================
  describe('Celebrity Detection & Query-Time Fetch', () => {
    it('should detect celebrity users (5000+ followers)', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [createMockPost('post-1', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z')],
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetFollowerCount).toHaveBeenCalledWith(TEST_CELEBRITY_ID_1);
      expect(mockGetUserPosts).toHaveBeenCalledWith(
        TEST_CELEBRITY_ID_1,
        expect.any(Number),
        undefined
      );
    });

    it('should fetch posts for celebrities in real-time', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(6000);

      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetUserPosts).toHaveBeenCalledWith(
        TEST_CELEBRITY_ID_1,
        expect.any(Number),
        undefined
      );
    });

    it('should NOT fetch from celebrities if none exist', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([TEST_NORMAL_USER_ID]);
      mockGetFollowerCount.mockResolvedValueOnce(100); // Not a celebrity

      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetUserPosts).not.toHaveBeenCalled();
    });

    it('should handle multiple celebrities', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([
        TEST_CELEBRITY_ID_1,
        TEST_CELEBRITY_ID_2
      ]);
      mockGetFollowerCount
        .mockResolvedValueOnce(5000)
        .mockResolvedValueOnce(7000);
      mockGetUserPosts
        .mockResolvedValueOnce({
          posts: [createMockPost('post-1', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z')],
          nextCursor: undefined,
          hasMore: false
        })
        .mockResolvedValueOnce({
          posts: [createMockPost('post-2', TEST_CELEBRITY_ID_2, '2025-10-12T11:00:00Z')],
          nextCursor: undefined,
          hasMore: false
        });

      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetUserPosts).toHaveBeenCalledTimes(2);
      expect(mockGetUserPosts).toHaveBeenCalledWith(TEST_CELEBRITY_ID_1, expect.any(Number), undefined);
      expect(mockGetUserPosts).toHaveBeenCalledWith(TEST_CELEBRITY_ID_2, expect.any(Number), undefined);
    });

    it('should handle FollowService.getFollowingList errors', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockRejectedValueOnce(new Error('DynamoDB error'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
    });

    it('should handle FollowService.getFollowerCount errors', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockRejectedValueOnce(new Error('DynamoDB error'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
    });

    it('should handle PostService.getUserPosts errors', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(6000);
      mockGetUserPosts.mockRejectedValueOnce(new Error('DynamoDB error'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
    });

    it('should combine celebrity posts with materialized feed', async () => {
      const { handler } = await import('./get-feed.js');

      // Setup materialized feed
      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [
          createMockFeedItem('post-mat-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z', 'materialized')
        ],
        nextCursor: undefined
      });

      // Setup celebrity posts
      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [createMockPost('post-celeb-1', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z')],
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts.length).toBeGreaterThan(1);
    });

    it('should not treat users with exactly 4999 followers as celebrities', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([TEST_NORMAL_USER_ID]);
      mockGetFollowerCount.mockResolvedValueOnce(4999);

      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetUserPosts).not.toHaveBeenCalled();
    });

    it('should treat users with exactly 5000 followers as celebrities', async () => {
      const { handler } = await import('./get-feed.js');
      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);

      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(mockGetUserPosts).toHaveBeenCalledWith(TEST_CELEBRITY_ID_1, expect.any(Number), undefined);
    });
  });

  // ==========================================================================
  // 4. Merge & Sort Logic (8 tests)
  // ==========================================================================
  describe('Merge & Sort Logic', () => {
    it('should merge materialized and celebrity posts', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [
          createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')
        ],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [createMockPost('post-2', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z')],
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts.length).toBe(2);
    });

    it('should sort combined results by createdAt (newest first)', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [
          createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T08:00:00Z'),
          createMockFeedItem('post-2', TEST_NORMAL_USER_ID, '2025-10-12T12:00:00Z')
        ],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [createMockPost('post-3', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z')],
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;

      // Verify sort order: newest first
      expect(new Date(posts[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(posts[1].createdAt).getTime()
      );
      expect(new Date(posts[1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(posts[2].createdAt).getTime()
      );
    });

    it('should apply limit to merged results', async () => {
      const { handler } = await import('./get-feed.js');

      // Create 15 materialized items
      const materializedItems = Array.from({ length: 15 }, (_, i) =>
        createMockFeedItem(`post-mat-${i}`, TEST_NORMAL_USER_ID, `2025-10-12T0${i}:00:00Z`)
      );

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: materializedItems,
        nextCursor: undefined
      });

      // Create 10 celebrity posts
      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: Array.from({ length: 10 }, (_, i) =>
          createMockPost(`post-celeb-${i}`, TEST_CELEBRITY_ID_1, `2025-10-12T${10 + i}:00:00Z`)
        ),
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID, { limit: '20' });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts.length).toBeLessThanOrEqual(20);
    });

    it('should handle all materialized (no celebrities)', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [
          createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z'),
          createMockFeedItem('post-2', TEST_NORMAL_USER_ID, '2025-10-12T10:00:00Z')
        ],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_NORMAL_USER_ID]);
      mockGetFollowerCount.mockResolvedValueOnce(100); // Not celebrity

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts.length).toBe(2);
      expect(posts.every((p: FeedPostItem) => p.source === 'materialized')).toBe(true);
    });

    it('should handle all celebrity (no materialized)', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [
          createMockPost('post-1', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z'),
          createMockPost('post-2', TEST_CELEBRITY_ID_1, '2025-10-12T11:00:00Z')
        ],
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts.length).toBe(2);
    });

    it('should handle mixed sources correctly', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [
          createMockFeedItem('post-mat', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z', 'materialized')
        ],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1, TEST_NORMAL_USER_ID]);
      mockGetFollowerCount
        .mockResolvedValueOnce(5000)
        .mockResolvedValueOnce(100);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [createMockPost('post-celeb', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z')],
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts.length).toBeGreaterThan(0);
    });

    it('should preserve post data integrity during merge', async () => {
      const { handler } = await import('./get-feed.js');

      const testPost = createMockFeedItem('test-post-123', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [testPost],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts[0].id).toBe(testPost.id);
      expect(posts[0].userId).toBe(testPost.userId);
      expect(posts[0].createdAt).toBe(testPost.createdAt);
    });

    it('should handle timestamp sorting edge cases (same timestamp)', async () => {
      const { handler } = await import('./get-feed.js');

      const sameTimestamp = '2025-10-12T10:00:00Z';

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [
          createMockFeedItem('post-1', TEST_NORMAL_USER_ID, sameTimestamp),
          createMockFeedItem('post-2', TEST_NORMAL_USER_ID, sameTimestamp)
        ],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts.length).toBe(2);
    });
  });

  // ==========================================================================
  // 5. Pagination (7 tests)
  // ==========================================================================
  describe('Pagination', () => {
    it('should generate nextCursor when more results exist', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: 'base64cursor'
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nextCursor).toBeTruthy();
    });

    it('should set hasMore=true when cursor exists', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: 'base64cursor'
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.hasMore).toBe(true);
    });

    it('should set hasMore=false when no more results', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.hasMore).toBe(false);
    });

    it('should handle cursor from materialized feed', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: 'materialized-cursor'
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nextCursor).toBe('materialized-cursor');
    });

    it('should handle cursor-based requests correctly', async () => {
      const { handler } = await import('./get-feed.js');

      const testCursor = 'page2cursor';
      const event = createEvent(TEST_USER_ID, { cursor: testCursor });

      await handler(event);

      expect(mockGetMaterializedFeedItems).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        limit: expect.any(Number),
        cursor: testCursor
      });
    });

    it('should validate cursor format', async () => {
      const { handler } = await import('./get-feed.js');

      // Mock FeedService to throw on invalid cursor
      mockGetMaterializedFeedItems.mockRejectedValueOnce(new Error('Invalid cursor'));

      const event = createEvent(TEST_USER_ID, { cursor: 'invalid-cursor-format' });

      const response = await handler(event);

      // Should handle error gracefully
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should not include nextCursor when on last page', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nextCursor).toBeUndefined();
    });
  });

  // ==========================================================================
  // 6. Response Format (6 tests)
  // ==========================================================================
  describe('Response Format', () => {
    it('should return 200 status code on success', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });

    it('should return correct Content-Type header', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('should return well-formed JSON body', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(() => JSON.parse(response.body)).not.toThrow();
    });

    it('should include all required response fields', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Should have posts/items array
      expect(body.posts || body.items).toBeDefined();
      expect(Array.isArray(body.posts || body.items)).toBe(true);

      // Should have hasMore
      expect(typeof body.hasMore).toBe('boolean');
    });

    it('should handle empty feed (no items)', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts).toEqual([]);
      expect(body.hasMore).toBe(false);
    });

    it('should include source field in response when hybrid', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [createMockPost('post-2', TEST_CELEBRITY_ID_1, '2025-10-12T10:00:00Z')],
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // Response should indicate hybrid source
      expect(body.source).toBe('hybrid');
    });
  });

  // ==========================================================================
  // 7. Error Handling (7 tests)
  // ==========================================================================
  describe('Error Handling', () => {
    it('should return 500 on FeedService errors', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockRejectedValueOnce(new Error('DynamoDB connection failed'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeTruthy();
    });

    it('should return 500 on FollowService errors', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetFollowingList.mockRejectedValueOnce(new Error('DynamoDB connection failed'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
    });

    it('should return 500 on PostService errors', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockRejectedValueOnce(new Error('DynamoDB connection failed'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
    });

    it('should log errors with context', async () => {
      const { handler } = await import('./get-feed.js');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGetMaterializedFeedItems.mockRejectedValueOnce(new Error('Test error'));

      const event = createEvent(TEST_USER_ID);

      await handler(event);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle partial failures gracefully', async () => {
      const { handler } = await import('./get-feed.js');

      // Materialized succeeds
      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [createMockFeedItem('post-1', TEST_NORMAL_USER_ID, '2025-10-12T09:00:00Z')],
        nextCursor: undefined
      });

      // Celebrity detection fails
      mockGetFollowingList.mockRejectedValueOnce(new Error('Celebrity fetch failed'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      // Should return error since celebrity detection failed
      expect(response.statusCode).toBe(500);
    });

    it('should not expose internal errors to client', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockRejectedValueOnce(
        new Error('Internal DynamoDB table structure error with sensitive info')
      );

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);

      // Should not include sensitive internal details
      expect(body.error).not.toContain('table structure');
      expect(body.error).toBeTruthy();
    });

    it('should handle network timeout errors', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockRejectedValueOnce(new Error('Network timeout'));

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeTruthy();
    });
  });

  // ==========================================================================
  // 8. Edge Cases (6 tests)
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle user following no one', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([]);

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const posts = body.posts || body.items;
      expect(posts).toEqual([]);
    });

    it('should handle user with no feed items', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_NORMAL_USER_ID]);
      mockGetFollowerCount.mockResolvedValueOnce(100); // Not celebrity

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.posts || body.items).toEqual([]);
    });

    it('should reject extremely large limit values', async () => {
      const { handler } = await import('./get-feed.js');

      const event = createEvent(TEST_USER_ID, { limit: '999999' });

      const response = await handler(event);

      // Should reject with 400 error
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid pagination parameters');
      expect(body.details.message).toContain('Limit cannot exceed 100');
      expect(mockGetMaterializedFeedItems).not.toHaveBeenCalled();
    });

    it('should handle invalid cursor values', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockRejectedValueOnce(new Error('Invalid cursor format'));

      const event = createEvent(TEST_USER_ID, { cursor: 'not-a-valid-cursor!!!' });

      const response = await handler(event);

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should handle numeric vs string IDs', async () => {
      const { handler } = await import('./get-feed.js');

      // This should fail validation since UUIDs are expected
      const event = createEvent('12345'); // Numeric ID as string

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should handle celebrity with no posts', async () => {
      const { handler } = await import('./get-feed.js');

      mockGetMaterializedFeedItems.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      });

      mockGetFollowingList.mockResolvedValueOnce([TEST_CELEBRITY_ID_1]);
      mockGetFollowerCount.mockResolvedValueOnce(5000);
      mockGetUserPosts.mockResolvedValueOnce({
        posts: [], // Celebrity with no posts
        nextCursor: undefined,
        hasMore: false
      });

      const event = createEvent(TEST_USER_ID);

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.posts || body.items).toEqual([]);
    });
  });
});
