import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './update-post.js';
import { PostService, ProfileService } from '@social-media-app/dal';
import * as dynamoUtils from '../../utils/dynamodb.js';
import * as jwtUtils from '../../utils/jwt.js';

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

vi.mock('../../utils/jwt.js', () => ({
  verifyAccessToken: vi.fn(),
  getJWTConfigFromEnv: vi.fn()
}));

const MockPostService = PostService as vi.MockedClass<typeof PostService>;
const MockProfileService = ProfileService as vi.MockedClass<typeof ProfileService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as MockedFunction<typeof jwtUtils.verifyAccessToken>;
const mockGetJWTConfigFromEnv = jwtUtils.getJWTConfigFromEnv as MockedFunction<typeof jwtUtils.getJWTConfigFromEnv>;

describe('Update Post Handler', () => {
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
    postId: string,
    body?: unknown,
    authHeader?: string
  ): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'PUT /posts/{postId}',
    rawPath: `/posts/${postId}`,
    rawQueryString: '',
    headers: {
      'content-type': 'application/json',
      ...(authHeader && { authorization: authHeader })
    },
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'PUT',
        path: `/posts/${postId}`,
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
      routeKey: 'PUT /posts/{postId}'
    },
    pathParameters: {
      postId
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockCreateDynamoDBClient.mockReturnValue({} as any);
    mockGetTableName.mockReturnValue('test-table');
    mockGetJWTConfigFromEnv.mockReturnValue({
      secret: 'test-secret',
      accessTokenExpiry: 900,
      refreshTokenExpiry: 2592000
    });

    MockPostService.mockImplementation(() => mockPostService as any);
    MockProfileService.mockImplementation(() => mockProfileService as any);
  });

  it('should update post successfully', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174001';
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockUser = {
      userId,
      email: 'user@example.com'
    };

    const updatedPost = {
      id: postId,
      userId,
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      caption: 'Updated caption',
      tags: ['updated', 'test'],
      likesCount: 5,
      commentsCount: 2,
      isPublic: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:01:00.000Z'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.updatePost.mockResolvedValue(updatedPost);

    const event = createMockEvent(
      postId,
      {
        caption: 'Updated caption',
        tags: ['updated', 'test'],
        isPublic: false
      },
      'Bearer valid-token'
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject({
      post: updatedPost
    });

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(mockPostService.updatePost).toHaveBeenCalledWith(
      postId,
      userId,
      {
        caption: 'Updated caption',
        tags: ['updated', 'test'],
        isPublic: false
      }
    );
  });

  it('should return 401 when no authorization header', async () => {
    const event = createMockEvent('test-post-id', { caption: 'Updated' });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Unauthorized'
    });
  });

  it('should return 401 when invalid authorization header format', async () => {
    const event = createMockEvent('test-post-id', { caption: 'Updated' }, 'InvalidToken');

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Unauthorized'
    });
  });

  it('should return 401 when token verification fails', async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const event = createMockEvent('test-post-id', { caption: 'Updated' }, 'Bearer invalid-token');

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid token'
    });
  });

  it('should return 404 when post not found or user does not own post', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.updatePost.mockResolvedValue(null);

    const event = createMockEvent(
      'non-existent-post-id',
      { caption: 'Updated' },
      'Bearer valid-token'
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Post not found or you do not have permission to edit it'
    });
  });

  it('should return 400 when postId is missing', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);

    const event = createMockEvent('', { caption: 'Updated' }, 'Bearer valid-token');

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Post ID is required'
    });
  });

  it('should return 400 for invalid request data', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);

    const event = createMockEvent(
      'test-post-id',
      {
        caption: 123, // Invalid type
        tags: 'invalid', // Should be array
        isPublic: 'not-boolean' // Invalid type
      },
      'Bearer valid-token'
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid request data'
    });
  });

  it('should handle malformed JSON body', async () => {
    const event: APIGatewayProxyEventV2 = {
      ...createMockEvent('test-post-id', {}, 'Bearer valid-token'),
      body: '{ invalid json'
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid JSON in request body'
    });
  });

  it('should update post with partial data (caption only)', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174001';
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockUser = {
      userId,
      email: 'user@example.com'
    };

    const updatedPost = {
      id: postId,
      userId,
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      caption: 'Only caption updated',
      tags: ['original', 'tags'],
      likesCount: 5,
      commentsCount: 2,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:01:00.000Z'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.updatePost.mockResolvedValue(updatedPost);

    const event = createMockEvent(
      postId,
      {
        caption: 'Only caption updated'
      },
      'Bearer valid-token'
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockPostService.updatePost).toHaveBeenCalledWith(
      postId,
      userId,
      {
        caption: 'Only caption updated'
      }
    );
  });

  it('should update post with partial data (tags only)', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174001';
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockUser = {
      userId,
      email: 'user@example.com'
    };

    const updatedPost = {
      id: postId,
      userId,
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      caption: 'Original caption',
      tags: ['new', 'tags'],
      likesCount: 5,
      commentsCount: 2,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:01:00.000Z'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.updatePost.mockResolvedValue(updatedPost);

    const event = createMockEvent(
      postId,
      {
        tags: ['new', 'tags']
      },
      'Bearer valid-token'
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockPostService.updatePost).toHaveBeenCalledWith(
      postId,
      userId,
      {
        tags: ['new', 'tags']
      }
    );
  });

  it('should update post with partial data (isPublic only)', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174001';
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockUser = {
      userId,
      email: 'user@example.com'
    };

    const updatedPost = {
      id: postId,
      userId,
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      caption: 'Original caption',
      tags: ['original', 'tags'],
      likesCount: 5,
      commentsCount: 2,
      isPublic: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:01:00.000Z'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.updatePost.mockResolvedValue(updatedPost);

    const event = createMockEvent(
      postId,
      {
        isPublic: false
      },
      'Bearer valid-token'
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockPostService.updatePost).toHaveBeenCalledWith(
      postId,
      userId,
      {
        isPublic: false
      }
    );
  });

  it('should handle empty update request', async () => {
    const postId = '123e4567-e89b-12d3-a456-426614174001';
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const mockUser = {
      userId,
      email: 'user@example.com'
    };

    const originalPost = {
      id: postId,
      userId,
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      caption: 'Original caption',
      tags: ['original', 'tags'],
      likesCount: 5,
      commentsCount: 2,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:01:00.000Z'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.updatePost.mockResolvedValue(originalPost);

    const event = createMockEvent(postId, {}, 'Bearer valid-token');

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockPostService.updatePost).toHaveBeenCalledWith(
      postId,
      userId,
      {}
    );
  });

  it('should return internal server error for unexpected errors', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.updatePost.mockRejectedValue(new Error('Database connection failed'));

    const event = createMockEvent('test-post-id', { caption: 'Updated' }, 'Bearer valid-token');

    // Mock console.error to capture error logs
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Internal server error'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Error updating post:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});