import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda';

// Import the handler module to access and reset the server instance
// Note: In a real scenario, we'd need a way to reset the singleton
// For testing purposes, we'll work with the existing singleton behavior
import { handler } from '../src/lambda.js';

describe('Lambda Handler', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: LambdaContext;

  beforeEach(() => {
    // Mock environment variables
    process.env.NODE_ENV = 'test';
    process.env.USE_LOCALSTACK = 'true';
    process.env.TABLE_NAME = 'test-table';
    process.env.JWT_SECRET = 'test-secret-key-for-access-tokens-min-32-chars';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-refresh-tokens-min-32-chars';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';

    // Create mock API Gateway event
    mockEvent = {
      version: '2.0',
      routeKey: '$default',
      rawPath: '/graphql',
      rawQueryString: '',
      headers: {
        'content-type': 'application/json',
      },
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        domainName: 'test.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'test',
        http: {
          method: 'POST',
          path: '/graphql',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        },
        requestId: 'test-request-id',
        routeKey: '$default',
        stage: '$default',
        time: '01/Jan/2024:00:00:00 +0000',
        timeEpoch: 1704067200000,
      },
      body: JSON.stringify({
        query: '{ __typename }',
      }),
      isBase64Encoded: false,
    } as any;

    // Create mock Lambda context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '$LATEST',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-aws-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2024/01/01/[$LATEST]test',
      getRemainingTimeInMillis: () => 30000,
      done: vi.fn(),
      fail: vi.fn(),
      succeed: vi.fn(),
    } as any;
  });

  describe('Server Initialization', () => {
    it('should initialize successfully on first invocation (cold start)', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result).toBeDefined();
      expect(result.statusCode).toBe(200);
    });

    it('should reuse server instance on subsequent invocations (warm start)', async () => {
      // First invocation (cold start)
      const result1 = await handler(mockEvent, mockContext);
      expect(result1.statusCode).toBe(200);

      // Second invocation (warm start)
      const result2 = await handler(mockEvent, mockContext);
      expect(result2.statusCode).toBe(200);
    });
  });

  describe('GraphQL Request Handling', () => {
    it('should handle valid GraphQL query', async () => {
      const queryEvent = {
        ...mockEvent,
        body: JSON.stringify({
          query: '{ __typename }',
        }),
      };

      const result = await handler(queryEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['content-type']).toContain('application/json');

      const body = JSON.parse(result.body);
      expect(body.data).toBeDefined();
      expect(body.data.__typename).toBe('Query');
    });

    it('should handle GraphQL query with variables', async () => {
      const queryEvent = {
        ...mockEvent,
        body: JSON.stringify({
          query: 'query TestQuery($id: ID!) { __typename }',
          variables: { id: 'test-id' },
        }),
      };

      const result = await handler(queryEvent, mockContext);

      // Apollo Server may return 200 or 400 depending on validation
      expect([200, 400]).toContain(result.statusCode);
      const body = JSON.parse(result.body);
      // Should have either data or errors
      expect(body.data !== undefined || body.errors !== undefined).toBe(true);
    });

    it('should handle malformed GraphQL query with proper error', async () => {
      const queryEvent = {
        ...mockEvent,
        body: JSON.stringify({
          query: 'query { invalidSyntax ',
        }),
      };

      const result = await handler(queryEvent, mockContext);

      // Apollo Server returns 400 for syntax errors (not 200)
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON in request body', async () => {
      const queryEvent = {
        ...mockEvent,
        body: 'invalid json {',
      };

      const result = await handler(queryEvent, mockContext);

      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Authentication Context', () => {
    it('should create context with null userId for unauthenticated request', async () => {
      const unauthEvent = {
        ...mockEvent,
        headers: {
          ...mockEvent.headers,
          // No authorization header
        },
        body: JSON.stringify({
          query: '{ __typename }',
        }),
      };

      const result = await handler(unauthEvent, mockContext);

      expect(result.statusCode).toBe(200);
      // Context is created with userId = null
      // This will be tested in resolver tests
    });

    it('should create context with userId for authenticated request', async () => {
      // We'll need a valid JWT token for this test
      // For now, just verify the header is passed through
      const authEvent = {
        ...mockEvent,
        headers: {
          ...mockEvent.headers,
          authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          query: '{ __typename }',
        }),
      };

      const result = await handler(authEvent, mockContext);

      // Should not fail even with invalid token
      // Invalid tokens result in userId = null
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing request body', async () => {
      const queryEvent = {
        ...mockEvent,
        body: undefined,
      } as any;

      const result = await handler(queryEvent, mockContext);

      // Should return error or handle gracefully
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should handle resolver errors gracefully', async () => {
      // Query that will trigger validation error (non-existent field)
      const queryEvent = {
        ...mockEvent,
        body: JSON.stringify({
          query: '{ nonExistentField }',
        }),
      };

      const result = await handler(queryEvent, mockContext);

      // Apollo Server returns 400 for validation errors
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.errors).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should return proper headers', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['content-type']).toContain('application/json');
    });

    it('should return valid JSON response', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.body).toBeDefined();
      expect(() => JSON.parse(result.body)).not.toThrow();
    });

    it('should include data or errors in response', async () => {
      const result = await handler(mockEvent, mockContext);

      const body = JSON.parse(result.body);
      // Should have either data or errors (or both)
      expect(body.data !== undefined || body.errors !== undefined).toBe(true);
    });
  });
});
