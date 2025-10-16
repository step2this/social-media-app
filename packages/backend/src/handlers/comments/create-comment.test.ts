/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './create-comment.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';

// Test constants
const testUserId = '123e4567-e89b-12d3-a456-426614174000';
const testPostId = '123e4567-e89b-12d3-a456-426614174001';
const testContent = 'This is a test comment';

// Mock dependencies
vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string) => ({ statusCode: status, body: JSON.stringify({ error: message }) }),
  successResponse: (status: number, data: any) => ({ statusCode: status, body: JSON.stringify(data) }),
  verifyAccessToken: vi.fn(async () => ({ userId: testUserId, email: 'test@example.com' })),
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
    CommentService: actual.CommentService
  };
});


const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test';

// Mock DynamoDB client
let mockDynamoClient: any;
let sentCommands: any[] = [];

beforeEach(() => {
  sentCommands = [];
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      sentCommands.push(command);

      // Simulate GetCommand for profile (to get userHandle)
      if (command.constructor.name === 'GetCommand') {
        return {
          Item: {
            id: testUserId,
            handle: 'testuser',
            username: 'testuser',
            email: 'test@example.com',
            fullName: 'Test User',
            profilePictureUrl: 'https://example.com/avatar.jpg',
            bio: 'Test bio',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            postsCount: 0,
            followersCount: 0,
            followingCount: 0
          },
          $metadata: {}
        };
      }

      // Simulate QueryCommand for post lookup
      if (command.constructor.name === 'QueryCommand') {
        return {
          Items: [{
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
          }],
          $metadata: {}
        };
      }

      // Simulate PutCommand for comment creation
      if (command.constructor.name === 'PutCommand') {
        return { $metadata: {} };
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

describe('create-comment handler', () => {
  describe('successful creation', () => {
    it('should create a comment successfully', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.comment).toBeDefined();
      expect(body.comment.postId).toBe(testPostId);
      expect(body.comment.content).toBe(testContent);
      expect(body.comment.userHandle).toBe('testuser');
      expect(body.comment.userId).toBe(testUserId);
      expect(body.commentsCount).toBeDefined();
    });

    it('should use correct DynamoDB keys for comment', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();
      expect(putCommand.input.Item.PK).toBe(`POST#${testPostId}`);
      expect(putCommand.input.Item.SK).toMatch(/^COMMENT#/);
      expect(putCommand.input.Item.entityType).toBe('COMMENT');
    });

    it('should include GSI1 keys for comment queries', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand.input.Item.GSI1PK).toMatch(/^COMMENT#/);
      expect(putCommand.input.Item.GSI1SK).toBe(`POST#${testPostId}`);
    });

    it('should include GSI2 keys for user queries', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand.input.Item.GSI2PK).toBe(`USER#${testUserId}`);
      expect(putCommand.input.Item.GSI2SK).toMatch(/^COMMENT#/);
    });

    it('should trim whitespace from content', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: '  Test comment with spaces  ' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.comment.content).toBe('Test comment with spaces');
    });
  });

  describe('validation', () => {
    it('should return 400 for empty content', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: '' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for content that is only whitespace', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: '   ' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for content exceeding 500 characters', async () => {
      const longContent = 'a'.repeat(501);
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: longContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should accept content with exactly 500 characters', async () => {
      const maxContent = 'a'.repeat(500);
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: maxContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should return 400 for missing postId', async () => {
      const event = createMockAPIGatewayEvent({
        body: { content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for missing content', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const event = createMockAPIGatewayEvent({
        rawBody: 'invalid json',
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid postId format', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: 'not-a-uuid', content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: 'InvalidToken' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should support both lowercase and uppercase Authorization header', async () => {
      const eventLowercase = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      // Manually set uppercase Authorization
      const eventUppercase = {
        ...eventLowercase,
        headers: {
          ...eventLowercase.headers,
          Authorization: `Bearer ${mockJWT}`
        }
      };
      delete eventUppercase.headers.authorization;

      const resultLowercase = await handler(eventLowercase);
      const resultUppercase = await handler(eventUppercase as APIGatewayProxyEventV2);

      expect(resultLowercase.statusCode).toBe(200);
      expect(resultUppercase.statusCode).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return 500 when profile fetch fails', async () => {
      mockDynamoClient.send = vi.fn(async (command: any) => {
        if (command.constructor.name === 'GetCommand') {
          throw new Error('DynamoDB error');
        }
        return { $metadata: {} };
      });

      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    it('should return 500 when comment creation fails', async () => {
      mockDynamoClient.send = vi.fn(async (command: any) => {
        if (command.constructor.name === 'GetCommand') {
          return {
            Item: {
              id: testUserId,
              handle: 'testuser'
            },
            $metadata: {}
          };
        }
        if (command.constructor.name === 'PutCommand') {
          throw new Error('DynamoDB error');
        }
        return { $metadata: {} };
      });

      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    it('should return 500 when profile not found', async () => {
      mockDynamoClient.send = vi.fn(async (command: any) => {
        if (command.constructor.name === 'GetCommand') {
          return { Item: null, $metadata: {} };
        }
        return { $metadata: {} };
      });

      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });

  describe('post metadata extraction', () => {
    it('should fetch post to extract metadata before creating comment', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      // Verify PostService.getPostById was called
      expect(mockPostServiceGetPostById).toHaveBeenCalledWith(testPostId);
      expect(mockPostServiceGetPostById).toHaveBeenCalledTimes(1);

      // Verify comment was created successfully
      expect(result.statusCode).toBe(200);
    });

    it('should return 404 when post not found', async () => {
      mockPostServiceGetPostById.mockResolvedValue(null);

      const nonExistentPostId = '999e9999-e99b-99d9-a999-999999999999';
      const event = createMockAPIGatewayEvent({
        body: { postId: nonExistentPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Post not found');
    });

    it('should extract userId from post PK correctly', async () => {
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

      const event = createMockAPIGatewayEvent({
        body: { postId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      // Verify comment was stored with correct post metadata
      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();

      // Verify postUserId (extracted from post PK) is stored correctly
      expect(putCommand.input.Item.postUserId).toBe(postOwnerId);
      // Verify postSK (full SK from post) is stored correctly
      expect(putCommand.input.Item.postSK).toBe(`POST#2024-02-15T10:30:00.000Z#${postId}`);
    });

    it('should pass post metadata to CommentService', async () => {
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
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        isPublic: true,
        createdAt: '2024-03-20T15:45:30.000Z',
        updatedAt: '2024-03-20T15:45:30.000Z',
        entityType: 'POST',
        GSI1PK: `POST#${postId}`,
        GSI1SK: `USER#${postOwnerId}`
      });

      const event = createMockAPIGatewayEvent({
        body: { postId, content: 'Great post!' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      // Verify post metadata is stored correctly in comment entity
      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();

      // Verify postUserId and postSK contain the extracted metadata
      expect(putCommand.input.Item.postUserId).toBe(postOwnerId);
      expect(putCommand.input.Item.postSK).toBe(`POST#2024-03-20T15:45:30.000Z#${postId}`);
    });

    it('should handle post fetch errors gracefully', async () => {
      mockPostServiceGetPostById.mockRejectedValue(new Error('DynamoDB error'));

      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
    });

    it('should validate post exists before attempting comment creation', async () => {
      mockPostServiceGetPostById.mockResolvedValue(null);

      const missingPostId = '888e8888-e88b-88d8-a888-888888888888';
      const event = createMockAPIGatewayEvent({
        body: { postId: missingPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      // Should not attempt to create comment if post doesn't exist
      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeUndefined();
    });
  });

  describe('notification creation', () => {
    it('should create notification when user comments on another user\'s post', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      // Find notification creation command
      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut).toBeDefined();
      expect(notificationPut.input.Item.type).toBe('comment');
      expect(notificationPut.input.Item.title).toBe('New comment');
    });

    it('should include correct actor information', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut.input.Item.actor).toBeDefined();
      expect(notificationPut.input.Item.actor.userId).toBe(testUserId);
      expect(notificationPut.input.Item.actor.handle).toBe('testuser');
      expect(notificationPut.input.Item.actor.displayName).toBe('Test User');
    });

    it('should include comment preview (first 50 chars) in message', async () => {
      const shortComment = 'Short comment';
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: shortComment },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut.input.Item.message).toContain(shortComment);
      expect(notificationPut.input.Item.message).toContain('testuser');
    });

    it('should truncate long comments with "..."', async () => {
      const longComment = 'a'.repeat(80);
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: longComment },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut.input.Item.message).toContain('...');
      // Message should contain 50 chars of comment + "..."
      const preview = longComment.substring(0, 50);
      expect(notificationPut.input.Item.message).toContain(preview);
    });

    it('should NOT create notification for self-comments', async () => {
      // Mock post owned by the same user who is commenting
      mockPostServiceGetPostById.mockResolvedValue({
        PK: `USER#${testUserId}`,
        SK: 'POST#2024-01-01T00:00:00.000Z#123e4567-e89b-12d3-a456-426614174001',
        id: testPostId,
        userId: testUserId,
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
        GSI1SK: `USER#${testUserId}`
      });

      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      // Should not create notification for self-comment
      const notificationPut = sentCommands.find(cmd =>
        cmd.constructor.name === 'PutCommand' &&
        cmd.input.Item?.entityType === 'NOTIFICATION'
      );

      expect(notificationPut).toBeUndefined();
    });

    it('should not fail the comment action if notification creation fails', async () => {
      // Mock DynamoDB to fail on notification creation but succeed on comment
      mockDynamoClient.send = vi.fn(async (command: any) => {
        sentCommands.push(command);

        if (command.constructor.name === 'GetCommand') {
          return {
            Item: {
              id: testUserId,
              handle: 'testuser',
              username: 'testuser',
              email: 'test@example.com',
              fullName: 'Test User',
              profilePictureUrl: 'https://example.com/avatar.jpg',
              bio: 'Test bio',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              postsCount: 0,
              followersCount: 0,
              followingCount: 0
            },
            $metadata: {}
          };
        }

        if (command.constructor.name === 'PutCommand') {
          // Fail if it's a notification, succeed if it's a comment
          if (command.input.Item?.entityType === 'NOTIFICATION') {
            throw new Error('Notification creation failed');
          }
          return { $metadata: {} };
        }

        if (command.constructor.name === 'QueryCommand') {
          return {
            Items: [{
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
            }],
            $metadata: {}
          };
        }

        return { $metadata: {} };
      });

      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId, content: testContent },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      // Comment should still succeed
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.comment).toBeDefined();
    });
  });
});
