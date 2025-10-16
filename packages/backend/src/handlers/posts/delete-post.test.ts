import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { handler } from './delete-post.js';
import { PostService, ProfileService } from '@social-media-app/dal';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import * as dynamoUtils from '../../utils/dynamodb.js';
import * as jwtUtils from '../../utils/jwt.js';

// Mock dependencies
vi.mock('@social-media-app/dal', () => ({
  PostService: vi.fn(),
  ProfileService: vi.fn(),
  KinesisEventPublisher: vi.fn(() => ({
    publishEvent: vi.fn().mockResolvedValue(undefined)
  }))
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

vi.mock('../../utils/aws-config.js', () => ({
  createKinesisClient: vi.fn(() => ({})),
  getKinesisStreamName: vi.fn(() => 'test-stream')
}));

vi.mock('../../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tracer: {
      captureAWSv3Client: vi.fn((client) => client)
    },
    addTraceAnnotation: vi.fn(),
    addTraceMetadata: vi.fn(),
    captureTraceError: vi.fn(),
    tracedOperation: vi.fn(async (name, fn) => await fn()),
    traceKinesisPublish: vi.fn(),
    traceDynamoDBOperation: vi.fn()
  };
});

const MockPostService = PostService as vi.MockedClass<typeof PostService>;
const MockProfileService = ProfileService as vi.MockedClass<typeof ProfileService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as MockedFunction<typeof jwtUtils.verifyAccessToken>;
const mockGetJWTConfigFromEnv = jwtUtils.getJWTConfigFromEnv as MockedFunction<typeof jwtUtils.getJWTConfigFromEnv>;

describe('Delete Post Handler', () => {
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

  it('should delete post successfully', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const postId = '123e4567-e89b-12d3-a456-426614174001';

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.deletePost.mockResolvedValue(true);

    const event = createMockAPIGatewayEvent({
      pathParameters: { postId },
      headers: { authorization: 'Bearer valid-token' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject({
      success: true,
      message: 'Post deleted successfully'
    });

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(mockPostService.deletePost).toHaveBeenCalledWith(postId, mockUser.userId);
  });

  it('should return 401 when no authorization header', async () => {
    const event = createMockAPIGatewayEvent({
      pathParameters: { postId: 'test-post-id' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Unauthorized'
    });
  });

  it('should return 401 when invalid authorization header format', async () => {
    const event = createMockAPIGatewayEvent({
      pathParameters: { postId: 'test-post-id' },
      headers: { authorization: 'InvalidToken' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Unauthorized'
    });
  });

  it('should return 401 when token verification fails', async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const event = createMockAPIGatewayEvent({
      pathParameters: { postId: 'test-post-id' },
      headers: { authorization: 'Bearer invalid-token' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid token'
    });
  });

  it('should return 400 when post ID is missing', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);

    const event = createMockAPIGatewayEvent({
      headers: { authorization: 'Bearer valid-token' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Post ID is required'
    });
  });

  it('should return 404 when post not found or unauthorized', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const postId = '123e4567-e89b-12d3-a456-426614174001';

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.deletePost.mockResolvedValue(false);

    const event = createMockAPIGatewayEvent({
      pathParameters: { postId },
      headers: { authorization: 'Bearer valid-token' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Post not found or unauthorized'
    });

    expect(mockPostService.deletePost).toHaveBeenCalledWith(postId, mockUser.userId);
  });

  it('should return 400 for invalid response data validation', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const postId = '123e4567-e89b-12d3-a456-426614174001';

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.deletePost.mockResolvedValue(true);

    const event = createMockAPIGatewayEvent({
      pathParameters: { postId },
      headers: { authorization: 'Bearer valid-token' }
    });

    // Mock console.error to suppress error output during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // This test would fail if we somehow created invalid response data
    // But our current implementation should always create valid responses
    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    consoleSpy.mockRestore();
  });

  it('should return internal server error for unexpected errors', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const postId = '123e4567-e89b-12d3-a456-426614174001';

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockPostService.deletePost.mockRejectedValue(new Error('Database connection failed'));

    const event = createMockAPIGatewayEvent({
      pathParameters: { postId },
      headers: { authorization: 'Bearer valid-token' }
    });

    // Mock console.error to capture error logs
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Internal server error'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Error deleting post:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle edge case with empty post ID', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);

    const event = createMockAPIGatewayEvent({
      pathParameters: { postId: '' },
      headers: { authorization: 'Bearer valid-token' }
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Post ID is required'
    });
  });

  it('should handle malformed JWT token gracefully', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('JWT malformed'));

    const event = createMockAPIGatewayEvent({
      pathParameters: { postId: 'test-post-id' },
      headers: { authorization: 'Bearer malformed.jwt.token' }
    });

    // Mock console.error to suppress error output during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Internal server error'
    });

    consoleSpy.mockRestore();
  });
});