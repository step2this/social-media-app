/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './like-post.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Mock dependencies
vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string) => ({ statusCode: status, body: JSON.stringify({ error: message }) }),
  successResponse: (status: number, data: any) => ({ statusCode: status, body: JSON.stringify(data) }),
  verifyAccessToken: vi.fn(async () => ({ userId: 'test-user-id', email: 'test@example.com' })),
  getJWTConfigFromEnv: vi.fn(() => ({ secret: 'test-secret' }))
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(() => mockDynamoClient),
  getTableName: vi.fn(() => 'test-table')
}));

// Mock DAL services
const mockPostServiceGetPostById = vi.fn();
vi.mock('@social-media-app/dal', async () => {
  const actual = await vi.importActual<typeof import('@social-media-app/dal')>('@social-media-app/dal');
  return {
    ...actual,
    PostService: vi.fn().mockImplementation(() => ({
      getPostById: mockPostServiceGetPostById
    })),
    ProfileService: actual.ProfileService,
    LikeService: actual.LikeService
  };
});

// Test helper to create mock event
const createMockEvent = (body?: string, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'POST /likes',
  rawPath: '/likes',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'POST',
      path: '/likes',
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
    routeKey: 'POST /likes',
    domainPrefix: 'api'
  },
  body: body || '',
  isBase64Encoded: false
});

const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test';
const testPostId = '123e4567-e89b-12d3-a456-426614174001';

// Mock DynamoDB client
let mockDynamoClient: any;
let sentCommands: any[] = [];

beforeEach(() => {
  sentCommands = [];
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      sentCommands.push(command);

      // Simulate successful PutCommand
      if (command.constructor.name === 'PutCommand') {
        return { $metadata: {} };
      }

      // Simulate GetCommand for profile and like status check
      if (command.constructor.name === 'GetCommand') {
        // Check if it's a profile lookup (PK starts with USER# and SK is PROFILE)
        if (command.input?.Key?.PK?.startsWith('USER#') && command.input?.Key?.SK === 'PROFILE') {
          return {
            Item: {
              PK: 'USER#test-user-id',
              SK: 'PROFILE',
              id: 'test-user-id',
              handle: 'testhandle',
              username: 'testuser',
              fullName: 'Test User',
              email: 'test@example.com',
              profilePictureUrl: 'https://example.com/avatar.jpg',
              bio: 'Test bio',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              entityType: 'PROFILE',
              postsCount: 0,
              followersCount: 0,
              followingCount: 0
            },
            $metadata: {}
          };
        }
        // Otherwise, return like status
        return { Item: { isLiked: true }, $metadata: {} };
      }

      return { $metadata: {} };
    })
  };

  // Reset and set up default PostService mock behavior
  mockPostServiceGetPostById.mockReset();
  mockPostServiceGetPostById.mockResolvedValue({
    PK: 'USER#post-owner-123',
    SK: 'POST#2024-01-01T00:00:00.000Z#123e4567-e89b-12d3-a456-426614174001',
    id: testPostId,
    userId: 'post-owner-123',
    userHandle: 'postowner',
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    caption: 'Test post',
    tags: [],
    likesCount: 0,
    commentsCount: 0,
    isPublic: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    entityType: 'POST',
    GSI1PK: 'POST#123e4567-e89b-12d3-a456-426614174001',
    GSI1SK: 'USER#post-owner-123'
  });
});

describe('like-post handler', () => {
  describe('successful like', () => {
    it('should like a post successfully', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isLiked).toBe(true);
    });

    it('should use correct DynamoDB keys', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();
      expect(putCommand.input.Item.PK).toBe(`POST#${testPostId}`);
      expect(putCommand.input.Item.SK).toBe('LIKE#test-user-id');
      expect(putCommand.input.Item.entityType).toBe('LIKE');
    });

    it('should include GSI2 keys for user queries', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand.input.Item.GSI2PK).toBe('USER#test-user-id');
      expect(putCommand.input.Item.GSI2SK).toBe(`LIKE#${testPostId}`);
    });

    it('should use conditional expression to prevent duplicates', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand.input.ConditionExpression).toBe('attribute_not_exists(PK)');
    });
  });

  describe('validation', () => {
    it('should return 400 for invalid request body', async () => {
      const event = createMockEvent(
        JSON.stringify({ invalidField: 'value' }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for missing postId', async () => {
      const event = createMockEvent(
        JSON.stringify({}),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const event = createMockEvent(
        'invalid json',
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId })
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        'InvalidToken'
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });

  describe('idempotency', () => {
    it('should handle duplicate like gracefully', async () => {
      // Mock ConditionalCheckFailedException
      mockDynamoClient.send = vi.fn(async (command: any) => {
        if (command.constructor.name === 'PutCommand') {
          const error: any = new Error('ConditionalCheckFailedException');
          error.name = 'ConditionalCheckFailedException';
          throw error;
        }
        // GetCommand returns existing like
        return { Item: { isLiked: true }, $metadata: {} };
      });

      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      // Should still return success
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isLiked).toBe(true);
    });
  });

  describe('post metadata extraction', () => {
    it('should fetch post to extract metadata before liking', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      // Verify PostService.getPostById was called
      expect(mockPostServiceGetPostById).toHaveBeenCalledWith(testPostId);
      expect(mockPostServiceGetPostById).toHaveBeenCalledTimes(1);

      // Verify like was created successfully
      expect(result.statusCode).toBe(200);
    });

    it('should return 404 when post not found', async () => {
      mockPostServiceGetPostById.mockResolvedValue(null);

      const nonExistentPostId = '999e9999-e99b-99d9-a999-999999999999';
      const event = createMockEvent(
        JSON.stringify({ postId: nonExistentPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Post not found');
    });

    it('should extract userId and reconstruct postSK correctly', async () => {
      const postId = '789e7890-e78b-78d9-a789-789789789789';
      const postOwnerId = '456e4560-e45b-45d6-a456-456456456456';

      mockPostServiceGetPostById.mockResolvedValue({
        PK: `USER#${postOwnerId}`,
        SK: `POST#2024-02-15T10:30:00.000Z#${postId}`,
        id: postId,
        userId: postOwnerId,
        userHandle: 'postowner',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Test post',
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        isPublic: true,
        createdAt: '2024-02-15T10:30:00.000Z',
        updatedAt: '2024-02-15T10:30:00.000Z',
        entityType: 'POST',
        GSI1PK: `POST#${postId}`,
        GSI1SK: `USER#${postOwnerId}`
      });

      const event = createMockEvent(
        JSON.stringify({ postId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      // Verify like was stored with correct post metadata
      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();

      // Verify postUserId (extracted from post.userId) is stored correctly
      expect(putCommand.input.Item.postUserId).toBe(postOwnerId);
      // Verify postSK (reconstructed from post fields) is stored correctly
      expect(putCommand.input.Item.postSK).toBe(`POST#2024-02-15T10:30:00.000Z#${postId}`);
    });

    it('should pass post metadata to LikeService', async () => {
      const postId = '321e3210-e32b-32d1-a321-321321321321';
      const postOwnerId = '654e6540-e65b-65d4-a654-654654654654';

      mockPostServiceGetPostById.mockResolvedValue({
        PK: `USER#${postOwnerId}`,
        SK: `POST#2024-03-20T15:45:30.000Z#${postId}`,
        id: postId,
        userId: postOwnerId,
        userHandle: 'postowner',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Great post!',
        tags: [],
        likesCount: 5,
        commentsCount: 2,
        isPublic: true,
        createdAt: '2024-03-20T15:45:30.000Z',
        updatedAt: '2024-03-20T15:45:30.000Z',
        entityType: 'POST',
        GSI1PK: `POST#${postId}`,
        GSI1SK: `USER#${postOwnerId}`
      });

      const event = createMockEvent(
        JSON.stringify({ postId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      // Verify post metadata is stored correctly in like entity
      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();

      // Verify postUserId and postSK contain the extracted metadata
      expect(putCommand.input.Item.postUserId).toBe(postOwnerId);
      expect(putCommand.input.Item.postSK).toBe(`POST#2024-03-20T15:45:30.000Z#${postId}`);
    });

    it('should handle post fetch errors gracefully', async () => {
      mockPostServiceGetPostById.mockRejectedValue(new Error('DynamoDB error'));

      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
    });

    it('should validate post exists before attempting like creation', async () => {
      mockPostServiceGetPostById.mockResolvedValue(null);

      const missingPostId = '888e8888-e88b-88d8-a888-888888888888';
      const event = createMockEvent(
        JSON.stringify({ postId: missingPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      // Should not attempt to create like if post doesn't exist
      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeUndefined();
    });
  });

  describe('notification creation', () => {
    it('should create notification when user likes another user\'s post', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      // Find notification creation command
      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut).toBeDefined();
      expect(notificationPut.input.Item.type).toBe('like');
      expect(notificationPut.input.Item.title).toBe('New like');
    });

    it('should include correct actor information (userId, handle, displayName, avatarUrl)', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut).toBeDefined();
      expect(notificationPut.input.Item.actor).toBeDefined();
      expect(notificationPut.input.Item.actor.userId).toBe('test-user-id');
      expect(notificationPut.input.Item.actor.handle).toBeDefined();
      expect(notificationPut.input.Item.actor.displayName).toBeDefined();
    });

    it('should include correct target information (type, id, url, preview)', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut.input.Item.target).toBeDefined();
      expect(notificationPut.input.Item.target.type).toBe('post');
      expect(notificationPut.input.Item.target.id).toBe(testPostId);
      expect(notificationPut.input.Item.target.url).toBe(`/post/${testPostId}`);
    });

    it('should include post preview in notification', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut.input.Item.target.preview).toBe('Test post');
    });

    it('should NOT create notification for self-likes', async () => {
      // Mock post owned by the same user who is liking
      mockPostServiceGetPostById.mockResolvedValue({
        PK: 'USER#test-user-id',
        SK: 'POST#2024-01-01T00:00:00.000Z#123e4567-e89b-12d3-a456-426614174001',
        id: testPostId,
        userId: 'test-user-id',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Test post',
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        isPublic: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'POST',
        GSI1PK: 'POST#123e4567-e89b-12d3-a456-426614174001',
        GSI1SK: 'USER#test-user-id'
      });

      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      // Should not create notification for self-like
      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut).toBeUndefined();
    });

    it('should not fail the like action if notification creation fails', async () => {
      // Mock DynamoDB to fail on notification creation but succeed on like
      mockDynamoClient.send = vi.fn(async (command: any) => {
        sentCommands.push(command);

        if (command.constructor.name === 'PutCommand') {
          // Fail if it's a notification, succeed if it's a like
          if (command.input.Item?.entityType === 'NOTIFICATION') {
            throw new Error('Notification creation failed');
          }
          return { $metadata: {} };
        }

        if (command.constructor.name === 'GetCommand') {
          // Return profile or follow status
          return { Item: { isLiked: true }, $metadata: {} };
        }

        return { $metadata: {} };
      });

      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      // Like should still succeed
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isLiked).toBe(true);
    });
  });
});
