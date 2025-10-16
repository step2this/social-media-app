/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './unfollow-user.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';

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
      const event = createMockAPIGatewayEvent({
        body: { userId: testUserId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isFollowing).toBe(false);
    });

    it('should use correct DynamoDB keys for delete', async () => {
      const event = createMockAPIGatewayEvent({
        body: { userId: testUserId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      await handler(event);

      const deleteCommand = sentCommands.find(cmd => cmd.constructor.name === 'DeleteCommand');
      expect(deleteCommand).toBeDefined();
      expect(deleteCommand.input.Key.PK).toBe('USER#follower-user-id');
      expect(deleteCommand.input.Key.SK).toBe(`FOLLOW#${testUserId}`);
    });

    it('should be idempotent when user not following', async () => {
      const event = createMockAPIGatewayEvent({
        body: { userId: testUserId },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.isFollowing).toBe(false);
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

    it('should return 400 for missing userId', async () => {
      const event = createMockAPIGatewayEvent({
        body: {},
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid userId format', async () => {
      const event = createMockAPIGatewayEvent({
        body: { userId: 'not-a-uuid' },
        headers: { authorization: `Bearer ${mockJWT}` }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for malformed JSON', async () => {
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
    it('should return 401 without authorization header', async () => {
      const event = createMockAPIGatewayEvent({
        body: { userId: testUserId }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 for invalid bearer token', async () => {
      const event = createMockAPIGatewayEvent({
        body: { userId: testUserId },
        headers: { authorization: 'InvalidToken' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });
});
