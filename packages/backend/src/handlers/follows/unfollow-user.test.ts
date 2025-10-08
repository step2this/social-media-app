/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './unfollow-user.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Mock dependencies
vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string) => ({ statusCode: status, body: JSON.stringify({ error: message }) }),
  successResponse: (status: number, data: any) => ({ statusCode: status, body: JSON.stringify(data) }),
  verifyAccessToken: vi.fn(async () => ({ userId: 'follower-user-id', email: 'follower@example.com' })),
  getJWTConfigFromEnv: vi.fn(() => ({ secret: 'test-secret' }))
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(() => mockDynamoClient),
  getTableName: vi.fn(() => 'test-table')
}));

// Test helper to create mock event
const createMockEvent = (body?: string, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'DELETE /follows',
  rawPath: '/follows',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'DELETE',
      path: '/follows',
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
    routeKey: 'DELETE /follows',
    domainPrefix: 'api'
  },
  body: body || '',
  isBase64Encoded: false
});

const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmb2xsb3dlci11c2VyLWlkIn0.test';
const testUserId = '123e4567-e89b-12d3-a456-426614174001';

// Mock DynamoDB client
let mockDynamoClient: any;
let sentCommands: any[] = [];

beforeEach(() => {
  sentCommands = [];
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      sentCommands.push(command);

      // Simulate successful DeleteCommand
      if (command.constructor.name === 'DeleteCommand') {
        return { $metadata: {} };
      }

      return { $metadata: {} };
    })
  };
});

describe('unfollow-user handler', () => {
  describe('successful unfollow', () => {
    it('should unfollow a user successfully', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isFollowing).toBe(false);
    });

    it('should use correct DynamoDB keys for delete', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const deleteCommand = sentCommands.find(cmd => cmd.constructor.name === 'DeleteCommand');
      expect(deleteCommand).toBeDefined();
      expect(deleteCommand.input.Key.PK).toBe('USER#follower-user-id');
      expect(deleteCommand.input.Key.SK).toBe(`FOLLOW#${testUserId}`);
    });

    it('should be idempotent when user not following', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isFollowing).toBe(false);
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

    it('should return 400 for missing userId', async () => {
      const event = createMockEvent(
        JSON.stringify({}),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid userId format', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: 'not-a-uuid' }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for malformed JSON', async () => {
      const event = createMockEvent(
        'invalid json',
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid JSON in request body');
    });
  });

  describe('authentication', () => {
    it('should return 401 without authorization header', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId })
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 for invalid bearer token', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        'InvalidToken'
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });
});
