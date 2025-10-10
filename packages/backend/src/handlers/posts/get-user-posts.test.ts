import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './get-user-posts.js';
import { PostService, ProfileService } from '@social-media-app/dal';
import * as dynamoUtils from '../../utils/dynamodb.js';

// Mock dependencies
vi.mock('@social-media-app/dal', () => ({
  PostService: vi.fn(),
  ProfileService: vi.fn()
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(),
  getTableName: vi.fn(),
  createS3Client: vi.fn(),
  getS3BucketName: vi.fn(),
  getCloudFrontDomain: vi.fn()
}));

const MockPostService = PostService as vi.MockedClass<typeof PostService>;
const MockProfileService = ProfileService as vi.MockedClass<typeof ProfileService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;

describe('Get User Posts Handler', () => {
  const mockPostService = {
    createPost: vi.fn(),
    getPostById: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn(),
    getUserPostsByHandle: vi.fn(),
    getUserPosts: vi.fn()
  };

  const mockProfileService = {
    getProfileById: vi.fn(),
    getProfileByHandle: vi.fn(),
    updateProfile: vi.fn(),
    updateProfilePicture: vi.fn(),
    generatePresignedUrl: vi.fn(),
    incrementPostsCount: vi.fn(),
    decrementPostsCount: vi.fn(),
    isHandleAvailable: vi.fn()
  };

  const createMockEvent = (
    handle?: string,
    queryParams?: Record<string, string>
  ): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'GET /posts/user/{handle}',
    rawPath: `/posts/user/${handle || 'testuser'}`,
    rawQueryString: queryParams ? new URLSearchParams(queryParams).toString() : '',
    headers: {
      'content-type': 'application/json'
    },
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'GET',
        path: `/posts/user/${handle || 'testuser'}`,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent'
      },
      stage: 'test',
      time: '2024-01-01T00:00:00.000Z',
      timeEpoch: 1704067200000,
      domainName: 'api.example.com',
      accountId: '123456789012',
      apiId: 'api123',
      routeKey: 'GET /posts/user/{handle}'
    },
    pathParameters: handle ? { handle } : null,
    queryStringParameters: queryParams || null,
    isBase64Encoded: false
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockCreateDynamoDBClient.mockReturnValue({} as any);
    mockGetTableName.mockReturnValue('test-table');

    MockPostService.mockImplementation(() => mockPostService as any);
    MockProfileService.mockImplementation(() => mockProfileService as any);
  });

  it('should get user posts successfully', async () => {
    const handle = 'testuser';
    const mockPostsResponse = {
      posts: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          userHandle: 'testuser',
          thumbnailUrl: 'https://cdn.example.com/thumb1.jpg',
          caption: 'First post',
          likesCount: 10,
          commentsCount: 5,
          createdAt: '2024-01-02T00:00:00.000Z'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          userHandle: 'testuser',
          thumbnailUrl: 'https://cdn.example.com/thumb2.jpg',
          caption: 'Second post',
          likesCount: 8,
          commentsCount: 3,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      hasMore: false,
      totalCount: 2
    };

    mockPostService.getUserPostsByHandle.mockResolvedValue(mockPostsResponse);

    const event = createMockEvent(handle);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject(mockPostsResponse);

    expect(mockPostService.getUserPostsByHandle).toHaveBeenCalledWith({
      handle,
      limit: 24,
      cursor: undefined
    });
  });

  it('should return 400 when handle is missing', async () => {
    const event = createMockEvent(undefined);

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Handle is required'
    });
  });

  it('should handle pagination with limit and cursor', async () => {
    const handle = 'testuser';
    const limit = '12';
    const cursor = 'eyJwayI6InRlc3QiLCJzayI6InRlc3QifQ=='; // base64 encoded test cursor

    const mockPostsResponse = {
      posts: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          userHandle: 'testuser',
          thumbnailUrl: 'https://cdn.example.com/thumb1.jpg',
          caption: 'Test post',
          likesCount: 5,
          commentsCount: 2,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      nextCursor: 'eyJwayI6Im5leHQiLCJzayI6Im5leHQifQ==',
      hasMore: true,
      totalCount: 25
    };

    mockPostService.getUserPostsByHandle.mockResolvedValue(mockPostsResponse);

    const event = createMockEvent(handle, { limit, cursor });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject(mockPostsResponse);

    expect(mockPostService.getUserPostsByHandle).toHaveBeenCalledWith({
      handle,
      limit: 12,
      cursor
    });
  });

  it('should use default limit when not provided', async () => {
    const handle = 'testuser';
    const mockPostsResponse = {
      posts: [],
      hasMore: false,
      totalCount: 0
    };

    mockPostService.getUserPostsByHandle.mockResolvedValue(mockPostsResponse);

    const event = createMockEvent(handle);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockPostService.getUserPostsByHandle).toHaveBeenCalledWith({
      handle,
      limit: 24, // Default limit
      cursor: undefined
    });
  });

  it('should return 400 for invalid limit parameter (NaN)', async () => {
    const handle = 'testuser';
    const event = createMockEvent(handle, { limit: 'invalid' });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid limit parameter'
    });
  });

  it('should return 400 for limit below minimum (0)', async () => {
    const handle = 'testuser';
    const event = createMockEvent(handle, { limit: '0' });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid limit parameter'
    });
  });

  it('should return 400 for limit above maximum (101)', async () => {
    const handle = 'testuser';
    const event = createMockEvent(handle, { limit: '101' });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid limit parameter'
    });
  });

  it('should handle empty posts response', async () => {
    const handle = 'emptyuser';
    const mockPostsResponse = {
      posts: [],
      hasMore: false,
      totalCount: 0
    };

    mockPostService.getUserPostsByHandle.mockResolvedValue(mockPostsResponse);

    const event = createMockEvent(handle);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject(mockPostsResponse);
  });

  it('should return 400 for invalid response data validation', async () => {
    const handle = 'testuser';

    // Mock service to return invalid data structure
    mockPostService.getUserPostsByHandle.mockResolvedValue({
      posts: [
        {
          id: 'invalid-uuid', // Invalid UUID format
          thumbnailUrl: 'https://cdn.example.com/thumb1.jpg',
          caption: 'Test post',
          likesCount: 5,
          commentsCount: 2,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      hasMore: false,
      totalCount: 1
    });

    const event = createMockEvent(handle);

    // Mock console.error to suppress error output during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid response data'
    });

    consoleSpy.mockRestore();
  });

  it('should return internal server error for unexpected errors', async () => {
    const handle = 'testuser';

    mockPostService.getUserPostsByHandle.mockRejectedValue(new Error('Database connection failed'));

    const event = createMockEvent(handle);

    // Mock console.error to capture error logs
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Internal server error'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Error getting user posts:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle edge case with maximum valid limit', async () => {
    const handle = 'testuser';
    const mockPostsResponse = {
      posts: [],
      hasMore: false,
      totalCount: 0
    };

    mockPostService.getUserPostsByHandle.mockResolvedValue(mockPostsResponse);

    const event = createMockEvent(handle, { limit: '100' }); // Maximum valid limit

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockPostService.getUserPostsByHandle).toHaveBeenCalledWith({
      handle,
      limit: 100,
      cursor: undefined
    });
  });

  it('should handle edge case with minimum valid limit', async () => {
    const handle = 'testuser';
    const mockPostsResponse = {
      posts: [],
      hasMore: false,
      totalCount: 0
    };

    mockPostService.getUserPostsByHandle.mockResolvedValue(mockPostsResponse);

    const event = createMockEvent(handle, { limit: '1' }); // Minimum valid limit

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockPostService.getUserPostsByHandle).toHaveBeenCalledWith({
      handle,
      limit: 1,
      cursor: undefined
    });
  });
});