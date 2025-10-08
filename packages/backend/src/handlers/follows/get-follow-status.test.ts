/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-follow-status.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Mock dependencies
vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string) => ({ statusCode: status, body: JSON.stringify({ error: message }) }),
  successResponse: (status: number, data: any) => ({ statusCode: status, body: JSON.stringify(data) }),
  verifyAccessToken: vi.fn(async () => ({ userId: 'current-user-id', email: 'current@example.com' })),
  getJWTConfigFromEnv: vi.fn(() => ({ secret: 'test-secret' }))
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(() => mockDynamoClient),
  getTableName: vi.fn(() => 'test-table')
}));

// Test helper to create mock event
const createMockEvent = (userId?: string, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /follows/{userId}/status',
  rawPath: `/follows/${userId}/status`,
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  pathParameters: userId ? { userId } : undefined,
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'GET',
      path: `/follows/${userId}/status`,
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
    routeKey: 'GET /follows/{userId}/status',
    domainPrefix: 'api'
  },
  isBase64Encoded: false
});

const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjdXJyZW50LXVzZXItaWQifQ.test';
const testUserId = '123e4567-e89b-12d3-a456-426614174001';

// Mock DynamoDB client
let mockDynamoClient: any;
let sentCommands: any[] = [];

beforeEach(() => {
  sentCommands = [];
  mockDynamoClient = {
    send: vi.fn(async (command: any) => {
      sentCommands.push(command);

      // Simulate GetCommand - return Item if following, undefined if not
      if (command.constructor.name === 'GetCommand') {
        // Default: not following
        return { $metadata: {} };
      }

      return { $metadata: {} };
    })
  };
});

describe('get-follow-status handler', () => {
  describe('successful status check', () => {
    it('should return isFollowing false when not following', async () => {
      const event = createMockEvent(testUserId, `Bearer ${mockJWT}`);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.isFollowing).toBe(false);
      expect(body.followersCount).toBe(0);
      expect(body.followingCount).toBe(0);
    });

    it('should return isFollowing true when following', async () => {
      // Mock GetCommand to return an item (indicating follow relationship exists)
      mockDynamoClient.send = vi.fn(async (command: any) => {
        sentCommands.push(command);
        if (command.constructor.name === 'GetCommand') {
          return {
            Item: {
              PK: 'USER#current-user-id',
              SK: `FOLLOW#${testUserId}`,
              followerId: 'current-user-id',
              followeeId: testUserId
            },
            $metadata: {}
          };
        }
        return { $metadata: {} };
      });

      const event = createMockEvent(testUserId, `Bearer ${mockJWT}`);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.isFollowing).toBe(true);
    });

    it('should use correct DynamoDB keys', async () => {
      const event = createMockEvent(testUserId, `Bearer ${mockJWT}`);

      await handler(event);

      const getCommand = sentCommands.find(cmd => cmd.constructor.name === 'GetCommand');
      expect(getCommand).toBeDefined();
      expect(getCommand.input.Key.PK).toBe('USER#current-user-id');
      expect(getCommand.input.Key.SK).toBe(`FOLLOW#${testUserId}`);
    });
  });

  describe('validation', () => {
    it('should return 400 for missing userId in path', async () => {
      const event = createMockEvent(undefined, `Bearer ${mockJWT}`);

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Missing userId in path parameters');
    });

    it('should return 400 for invalid userId format', async () => {
      const event = createMockEvent('not-a-uuid', `Bearer ${mockJWT}`);

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('authentication', () => {
    it('should return 401 without authorization header', async () => {
      const event = createMockEvent(testUserId);

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 for invalid bearer token', async () => {
      const event = createMockEvent(testUserId, 'InvalidToken');

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });
});
