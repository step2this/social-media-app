/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './unlike-post.js';
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

// Test helper to create mock event
const createMockEvent = (body?: string, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'DELETE /likes',
  rawPath: '/likes',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'DELETE',
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
    routeKey: 'DELETE /likes',
    domainPrefix: 'api'
  },
  body: body || '',
  isBase64Encoded: false
});

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
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isLiked).toBe(false);
    });

    it('should use correct DynamoDB keys for deletion', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

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
    it('should handle unlike when not liked (idempotent)', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      // Should still return success even if not previously liked
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isLiked).toBe(false);
    });
  });
});
