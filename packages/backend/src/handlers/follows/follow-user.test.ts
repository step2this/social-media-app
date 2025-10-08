/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './follow-user.js';
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
  routeKey: 'POST /follows',
  rawPath: '/follows',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'POST',
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
    routeKey: 'POST /follows',
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

      // Simulate successful PutCommand
      if (command.constructor.name === 'PutCommand') {
        return { $metadata: {} };
      }

      // Simulate GetCommand for follow status check
      if (command.constructor.name === 'GetCommand') {
        return { Item: { isFollowing: true }, $metadata: {} };
      }

      return { $metadata: {} };
    })
  };
});

describe('follow-user handler', () => {
  describe('successful follow', () => {
    it('should follow a user successfully', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isFollowing).toBe(true);
    });

    it('should use correct DynamoDB keys', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();
      expect(putCommand.input.Item.PK).toBe('USER#follower-user-id');
      expect(putCommand.input.Item.SK).toBe(`FOLLOW#${testUserId}`);
      expect(putCommand.input.Item.entityType).toBe('FOLLOW');
    });

    it('should include GSI2 keys for follower queries', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand.input.Item.GSI2PK).toBe(`USER#${testUserId}`);
      expect(putCommand.input.Item.GSI2SK).toBe('FOLLOWER#follower-user-id');
    });

    it('should use conditional expression to prevent duplicates', async () => {
      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
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

  describe('error handling', () => {
    it('should return 500 for DynamoDB errors', async () => {
      mockDynamoClient.send = vi.fn().mockRejectedValue(new Error('DynamoDB error'));

      const event = createMockEvent(
        JSON.stringify({ userId: testUserId }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
