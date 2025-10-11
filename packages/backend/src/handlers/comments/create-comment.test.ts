/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './create-comment.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

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

// Test helper to create mock event
const createMockEvent = (body?: string, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'POST /comments',
  rawPath: '/comments',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'POST',
      path: '/comments',
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
    routeKey: 'POST /comments',
    domainPrefix: 'api'
  },
  body: body || '',
  isBase64Encoded: false
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
            email: 'test@example.com',
            name: 'Test User'
          },
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
});

describe('create-comment handler', () => {
  describe('successful creation', () => {
    it('should create a comment successfully', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

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
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand).toBeDefined();
      expect(putCommand.input.Item.PK).toBe(`POST#${testPostId}`);
      expect(putCommand.input.Item.SK).toMatch(/^COMMENT#/);
      expect(putCommand.input.Item.entityType).toBe('COMMENT');
    });

    it('should include GSI1 keys for comment queries', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand.input.Item.GSI1PK).toMatch(/^COMMENT#/);
      expect(putCommand.input.Item.GSI1SK).toBe(`POST#${testPostId}`);
    });

    it('should include GSI2 keys for user queries', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

      await handler(event);

      const putCommand = sentCommands.find(cmd => cmd.constructor.name === 'PutCommand');
      expect(putCommand.input.Item.GSI2PK).toBe(`USER#${testUserId}`);
      expect(putCommand.input.Item.GSI2SK).toMatch(/^COMMENT#/);
    });

    it('should trim whitespace from content', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: '  Test comment with spaces  ' }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.comment.content).toBe('Test comment with spaces');
    });
  });

  describe('validation', () => {
    it('should return 400 for empty content', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: '' }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for content that is only whitespace', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: '   ' }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for content exceeding 500 characters', async () => {
      const longContent = 'a'.repeat(501);
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: longContent }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should accept content with exactly 500 characters', async () => {
      const maxContent = 'a'.repeat(500);
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: maxContent }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should return 400 for missing postId', async () => {
      const event = createMockEvent(
        JSON.stringify({ content: testContent }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for missing content', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId }),
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

    it('should return 400 for invalid postId format', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: 'not-a-uuid', content: testContent }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent })
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 when auth header does not start with Bearer', async () => {
      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        'InvalidToken'
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should support both lowercase and uppercase Authorization header', async () => {
      const eventLowercase = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

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

      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

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

      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

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

      const event = createMockEvent(
        JSON.stringify({ postId: testPostId, content: testContent }),
        `Bearer ${mockJWT}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
