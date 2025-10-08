import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './create-post.js';
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

describe('Create Post Handler', () => {
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

  const createMockEvent = (body?: unknown, authHeader?: string): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /posts',
    rawPath: '/posts',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json',
      ...(authHeader && { authorization: authHeader })
    },
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'POST',
        path: '/posts',
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
      routeKey: 'POST /posts'
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

  it('should create post successfully', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const mockProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      handle: 'testuser',
      username: 'testuser',
      email: 'user@example.com',
      postsCount: 5
    };

    const mockPost = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      caption: 'Test caption',
      tags: ['test'],
      likesCount: 0,
      commentsCount: 0,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    const mockUploadData = {
      uploadUrl: 'https://s3.amazonaws.com/signed-url',
      publicUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      expiresIn: 3600
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockProfileService.getProfileById.mockResolvedValue(mockProfile);
    mockProfileService.generatePresignedUrl.mockResolvedValue(mockUploadData);
    mockPostService.createPost.mockResolvedValue(mockPost);

    const event = createMockEvent(
      {
        caption: 'Test caption',
        tags: ['test'],
        isPublic: true,
        fileType: 'image/jpeg'
      },
      'Bearer valid-token'
    );

    const result = await handler(event);

    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body || '{}');
    expect(body).toMatchObject({
      post: mockPost,
      uploadUrl: mockUploadData.uploadUrl,
      thumbnailUploadUrl: mockUploadData.uploadUrl
    });

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(mockProfileService.getProfileById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockProfileService.generatePresignedUrl).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', {
      fileType: 'image/jpeg',
      purpose: 'post-image'
    });
    expect(mockPostService.createPost).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      'testuser',
      {
        caption: 'Test caption',
        tags: ['test'],
        isPublic: true,
        fileType: 'image/jpeg'
      },
      mockUploadData.publicUrl,
      mockUploadData.thumbnailUrl
    );
  });

  it('should return 401 when no authorization header', async () => {
    const event = createMockEvent({ caption: 'Test', fileType: 'image/jpeg' });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Unauthorized'
    });
  });

  it('should return 401 when invalid authorization header format', async () => {
    const event = createMockEvent({ caption: 'Test', fileType: 'image/jpeg' }, 'InvalidToken');

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Unauthorized'
    });
  });

  it('should return 401 when token verification fails', async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const event = createMockEvent({ caption: 'Test', fileType: 'image/jpeg' }, 'Bearer invalid-token');

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid token'
    });
  });

  it('should return 404 when user profile not found', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockProfileService.getProfileById.mockResolvedValue(null);

    const event = createMockEvent({ caption: 'Test', fileType: 'image/jpeg' }, 'Bearer valid-token');

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'User profile not found'
    });
  });

  it('should return 400 for invalid request data', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);

    const event = createMockEvent(
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
      ...createMockEvent({ fileType: 'image/jpeg' }, 'Bearer valid-token'),
      body: '{ invalid json'
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Invalid JSON in request body'
    });
  });

  it('should handle storage service not configured error', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const mockProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      handle: 'testuser',
      username: 'testuser'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockProfileService.getProfileById.mockResolvedValue(mockProfile);
    mockProfileService.generatePresignedUrl.mockRejectedValue(new Error('S3 bucket not configured'));

    const event = createMockEvent({ caption: 'Test', fileType: 'image/jpeg' }, 'Bearer valid-token');

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Storage service not configured'
    });
  });

  it('should return internal server error for unexpected errors', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockProfileService.getProfileById.mockRejectedValue(new Error('Database connection failed'));

    const event = createMockEvent({ caption: 'Test', fileType: 'image/jpeg' }, 'Bearer valid-token');

    // Mock console.error to capture error logs
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body || '{}')).toMatchObject({
      error: 'Internal server error'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Error creating post:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should create post with minimal request data', async () => {
    const mockUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const mockProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      handle: 'testuser',
      username: 'testuser'
    };

    const mockPost = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      userHandle: 'testuser',
      imageUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      tags: [],
      likesCount: 0,
      commentsCount: 0,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };

    const mockUploadData = {
      uploadUrl: 'https://s3.amazonaws.com/signed-url',
      publicUrl: 'https://cdn.example.com/image.jpg',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      expiresIn: 3600
    };

    mockVerifyAccessToken.mockResolvedValue(mockUser);
    mockProfileService.getProfileById.mockResolvedValue(mockProfile);
    mockProfileService.generatePresignedUrl.mockResolvedValue(mockUploadData);
    mockPostService.createPost.mockResolvedValue(mockPost);

    const event = createMockEvent({ fileType: 'image/jpeg' }, 'Bearer valid-token');

    const result = await handler(event);

    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body || '{}');
    expect(body.post).toMatchObject({
      id: '123e4567-e89b-12d3-a456-426614174001',
      tags: [],
      isPublic: true
    });
  });
});