/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-like-status.js';
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

// Test helper to create mock event with path parameters
const createMockEvent = (pathParameters?: Record<string, string>, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /likes/{postId}',
  rawPath: `/likes/${pathParameters?.postId || ''}`,
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  pathParameters,
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'GET',
      path: `/likes/${pathParameters?.postId || ''}`,
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
    routeKey: 'GET /likes/{postId}',
    domainPrefix: 'api'
  },
  isBase64Encoded: false
});

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

      const event = createMockEvent(
        { postId: testPostId },
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.isLiked).toBe(true);
    });

    it('should return isLiked=false when user has not liked post', async () => {
      mockLikeStatus = false;

      const event = createMockEvent(
        { postId: testPostId },
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.isLiked).toBe(false);
    });

    it('should query with correct DynamoDB keys', async () => {
      const event = createMockEvent(
        { postId: testPostId },
        `Bearer ${mockJWT}`
      );

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
      const event = createMockEvent(
        {},
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid postId format', async () => {
      const event = createMockEvent(
        { postId: 'invalid' },
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockEvent(
        { postId: testPostId }
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockEvent(
        { postId: testPostId },
        'InvalidToken'
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });
});
