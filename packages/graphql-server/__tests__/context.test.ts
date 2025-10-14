import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createContext } from '../src/context.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('GraphQL Context', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DynamoDB Initialization', () => {
    it('should initialize DynamoDB client with LocalStack config in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      process.env.AWS_REGION = 'us-east-1';
      process.env.TABLE_NAME = 'tamafriends-local';

      const mockEvent = {
        headers: {}
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      expect(context.dynamoClient).toBeDefined();
      expect(context.dynamoClient.send).toBeDefined();
      expect(context.tableName).toBe('tamafriends-local');
    });

    it('should initialize DynamoDB client with AWS config in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_LOCALSTACK = 'false';
      process.env.AWS_REGION = 'us-west-2';
      process.env.TABLE_NAME = 'tamafriends-prod';

      const mockEvent = {
        headers: {}
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      expect(context.dynamoClient).toBeDefined();
      expect(context.tableName).toBe('tamafriends-prod');
    });

    it('should set table name from environment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      process.env.TABLE_NAME = 'custom-table';

      const mockEvent = {
        headers: {}
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      expect(context.tableName).toBe('custom-table');
    });

    it('should use default table name in LocalStack when not specified', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      delete process.env.TABLE_NAME;

      const mockEvent = {
        headers: {}
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      expect(context.tableName).toBe('tamafriends-local');
    });
  });

  describe('JWT Authentication', () => {
    it('should extract token from Authorization header', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      process.env.JWT_SECRET = 'test-secret';

      const mockEvent = {
        headers: {
          authorization: 'Bearer valid.jwt.token'
        }
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      // Token will be invalid but we're testing extraction, not verification
      expect(context.userId).toBeNull(); // Invalid token = null userId
    });

    it('should set userId to null when no token provided', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';

      const mockEvent = {
        headers: {}
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      expect(context.userId).toBeNull();
    });

    it('should handle missing JWT_SECRET gracefully', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      delete process.env.JWT_SECRET;

      const mockEvent = {
        headers: {
          authorization: 'Bearer some.jwt.token'
        }
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      expect(context.userId).toBeNull();
    });
  });

  describe('Context Integration', () => {
    it('should create complete context with all properties', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_LOCALSTACK = 'true';
      process.env.TABLE_NAME = 'test-table';

      const mockEvent = {
        headers: {}
      } as APIGatewayProxyEventV2;

      const context = await createContext(mockEvent);

      expect(context).toHaveProperty('userId');
      expect(context).toHaveProperty('dynamoClient');
      expect(context).toHaveProperty('tableName');
      expect(context.tableName).toBe('test-table');
    });
  });
});
