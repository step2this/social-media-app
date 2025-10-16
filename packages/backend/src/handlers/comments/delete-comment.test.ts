/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './delete-comment.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';

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

const testCommentId = '123e4567-e89b-12d3-a456-426614174001';
const testPostId = '223e4567-e89b-12d3-a456-426614174002';
const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test';

// Mock DynamoDB client
let mockDynamoClient: any;
let sentCommands: any[] = [];

beforeEach(() => {
  sentCommands = [];
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      sentCommands.push(command);

      // Mock QueryCommand to return a comment owned by test-user-id
      if (command.constructor.name === 'QueryCommand') {
        return {
          Items: [{
            PK: `POST#${testPostId}`,
            SK: `COMMENT#2024-01-01T00:00:00.000Z#${testCommentId}`,
            GSI1PK: `COMMENT#${testCommentId}`,
            GSI1SK: `POST#${testPostId}`,
            id: testCommentId,
            postId: testPostId,
            userId: 'test-user-id',
            userHandle: 'testuser',
            content: 'Test comment',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            entityType: 'COMMENT'
          }],
          $metadata: {}
        };
      }

      return { $metadata: {} };
    })
  };
});

describe('delete-comment handler', () => {
  describe('successful deletion', () => {
    it('should delete own comment successfully', async () => {
      const event = createMockAPIGatewayEvent({
        body: { commentId: testCommentId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Comment deleted successfully');
    });

    it('should use correct DynamoDB keys for deletion', async () => {
      const event = createMockAPIGatewayEvent({
        body: { commentId: testCommentId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      // Verify QueryCommand to fetch comment
      const queryCommand = sentCommands.find(cmd => cmd.constructor.name === 'QueryCommand');
      expect(queryCommand).toBeDefined();
      expect(queryCommand.input.IndexName).toBe('GSI1');
      expect(queryCommand.input.ExpressionAttributeValues[':pk']).toBe(`COMMENT#${testCommentId}`);

      // Verify DeleteCommand with correct keys
      const deleteCommand = sentCommands.find(cmd => cmd.constructor.name === 'DeleteCommand');
      expect(deleteCommand).toBeDefined();
      expect(deleteCommand.input.Key).toEqual({
        PK: `POST#${testPostId}`,
        SK: `COMMENT#2024-01-01T00:00:00.000Z#${testCommentId}`
      });
    });
  });

  describe('idempotency', () => {
    it('should return success when comment does not exist (idempotent)', async () => {
      // Mock empty result for non-existent comment
      mockDynamoClient.send = vi.fn(async (command: any) => {
        sentCommands.push(command);
        if (command.constructor.name === 'QueryCommand') {
          return {
            Items: [],
            $metadata: {}
          };
        }
        return { $metadata: {} };
      });

      const event = createMockAPIGatewayEvent({
        body: { commentId: testCommentId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Comment deleted successfully');

      // Should NOT send DeleteCommand
      const deleteCommand = sentCommands.find(cmd => cmd.constructor.name === 'DeleteCommand');
      expect(deleteCommand).toBeUndefined();
    });
  });

  describe('authorization', () => {
    it('should return 403 when attempting to delete another users comment', async () => {
      // Mock comment owned by different user
      mockDynamoClient.send = vi.fn(async (command: any) => {
        sentCommands.push(command);
        if (command.constructor.name === 'QueryCommand') {
          return {
            Items: [{
              PK: `POST#${testPostId}`,
              SK: `COMMENT#2024-01-01T00:00:00.000Z#${testCommentId}`,
              GSI1PK: `COMMENT#${testCommentId}`,
              GSI1SK: `POST#${testPostId}`,
              id: testCommentId,
              postId: testPostId,
              userId: 'different-user-id', // Different user
              userHandle: 'otheruser',
              content: 'Someone elses comment',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              entityType: 'COMMENT'
            }],
            $metadata: {}
          };
        }
        return { $metadata: {} };
      });

      const event = createMockAPIGatewayEvent({
        body: { commentId: testCommentId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Forbidden');

      // Should NOT send DeleteCommand
      const deleteCommand = sentCommands.find(cmd => cmd.constructor.name === 'DeleteCommand');
      expect(deleteCommand).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should return 400 for missing commentId', async () => {
      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid commentId (not UUID)', async () => {
      const event = createMockAPIGatewayEvent({
        body: { commentId: 'not-a-uuid' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid request data');
    });

    it('should return 400 for invalid request body', async () => {
      const event = createMockAPIGatewayEvent({
        body: { invalidField: 'value' },
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
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid JSON in request body');
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockAPIGatewayEvent({
        body: { commentId: testCommentId }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockAPIGatewayEvent({
        body: { commentId: testCommentId },
        headers: { authorization: 'InvalidToken' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 when token verification fails', async () => {
      // Mock verifyAccessToken to throw error
      const { verifyAccessToken } = await import('../../utils/index.js');
      vi.mocked(verifyAccessToken).mockRejectedValueOnce(new Error('Invalid token'));

      const event = createMockAPIGatewayEvent({
        body: { commentId: testCommentId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });
});
