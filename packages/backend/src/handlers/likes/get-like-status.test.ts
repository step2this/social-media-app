/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-like-status.js';
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
let mockLikeStatus = false;

beforeEach(() => {
  mockLikeStatus = false;
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      if (command.constructor.name === 'GetCommand') {
        // Return like status based on mock state
        return {
          Item: mockLikeStatus ? { PK: `POST#${testPostId}`, SK: 'LIKE#test-user-id' } : undefined,
          $metadata: {}
        };
      }
      return { $metadata: {} };
    })
  };
});

describe('get-like-status handler', () => {
  describe('successful status check', () => {
    it('should return isLiked=true when user has liked post', async () => {
      mockLikeStatus = true;

      const event = createMockAPIGatewayEvent({
        pathParameters: { postId: testPostId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.isLiked).toBe(true);
    });

    it('should return isLiked=false when user has not liked post', async () => {
      mockLikeStatus = false;

      const event = createMockAPIGatewayEvent({
        pathParameters: { postId: testPostId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.isLiked).toBe(false);
    });

    it('should query with correct DynamoDB keys', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { postId: testPostId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      expect(mockDynamoClient.send).toHaveBeenCalled();
      const call = mockDynamoClient.send.mock.calls[0];
      const command = call[0];
      expect(command.constructor.name).toBe('GetCommand');
      expect(command.input.Key).toEqual({
        PK: `POST#${testPostId}`,
        SK: 'LIKE#test-user-id'
      });
    });
  });

  describe('validation', () => {
    it('should return 400 for missing postId', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: {},
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid postId format', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { postId: 'invalid' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { postId: testPostId }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { postId: testPostId },
        headers: { authorization: 'InvalidToken' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });
});
