/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './unlike-post.js';
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


const testPostId = '123e4567-e89b-12d3-a456-426614174001';
const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQifQ.test';

// Mock DynamoDB client
let mockDynamoClient: any;
let sentCommands: any[] = [];

beforeEach(() => {
  sentCommands = [];
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      sentCommands.push(command);
      return { $metadata: {} };
    })
  };
});

describe('unlike-post handler', () => {
  describe('successful unlike', () => {
    it('should unlike a post successfully', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isLiked).toBe(false);
    });

    it('should use correct DynamoDB keys for deletion', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const deleteCommand = sentCommands.find(cmd => cmd.constructor.name === 'DeleteCommand');
      expect(deleteCommand).toBeDefined();
      expect(deleteCommand.input.Key).toEqual({
        PK: `POST#${testPostId}`,
        SK: 'LIKE#test-user-id'
      });
    });
  });

  describe('validation', () => {
    it('should return 400 for invalid request body', async () => {
      const event = createMockAPIGatewayEvent({
        body: { invalidField: 'value' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for missing postId', async () => {
      const event = createMockAPIGatewayEvent({
        body: {},
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
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId },
        headers: { authorization: 'InvalidToken' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });

  describe('idempotency', () => {
    it('should handle unlike when not liked (idempotent)', async () => {
      const event = createMockAPIGatewayEvent({
        body: { postId: testPostId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      // Should still return success even if not previously liked
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isLiked).toBe(false);
    });
  });
});
