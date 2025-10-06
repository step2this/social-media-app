import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './register.js';
import { createDefaultAuthService } from '@social-media-app/dal';
import * as dynamoUtils from '../../utils/dynamodb.js';
import * as jwtUtils from '../../utils/jwt.js';

// Mock dependencies
vi.mock('@social-media-app/dal', () => ({
  createDefaultAuthService: vi.fn()
}));

vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(),
  getTableName: vi.fn()
}));

vi.mock('../../utils/jwt.js', () => ({
  createJWTProvider: vi.fn(),
  getJWTConfigFromEnv: vi.fn()
}));

const mockCreateDefaultAuthService = createDefaultAuthService as MockedFunction<typeof createDefaultAuthService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;
const mockCreateJWTProvider = jwtUtils.createJWTProvider as MockedFunction<typeof jwtUtils.createJWTProvider>;
const mockGetJWTConfigFromEnv = jwtUtils.getJWTConfigFromEnv as MockedFunction<typeof jwtUtils.getJWTConfigFromEnv>;

describe('Register Handler', () => {
  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    getUserById: vi.fn(),
    logout: vi.fn()
  };

  const createMockEvent = (body?: unknown): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /auth/register',
    rawPath: '/auth/register',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json'
    },
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'POST',
        path: '/auth/register',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent'
      },
      stage: 'test',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations
    mockCreateDynamoDBClient.mockReturnValue({} as any);
    mockGetTableName.mockReturnValue('test-table');
    mockGetJWTConfigFromEnv.mockReturnValue({
      secret: 'test-secret',
      accessTokenExpiry: 900,
      refreshTokenExpiry: 2592000
    });
    mockCreateJWTProvider.mockReturnValue({
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      verifyRefreshToken: vi.fn()
    });
    mockCreateDefaultAuthService.mockReturnValue(mockAuthService);
  });

  it('should successfully register a new user', async () => {
    const registerRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser'
    };

    const expectedResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      message: 'User registered successfully. Please check your email for verification.'
    };

    mockAuthService.register.mockResolvedValue(expectedResponse);

    const event = createMockEvent(registerRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body!)).toEqual(expectedResponse);
    expect(mockAuthService.register).toHaveBeenCalledWith(registerRequest);
  });

  it('should return validation error for invalid request', async () => {
    const invalidRequest = {
      email: 'invalid-email',
      password: 'weak',
      username: 'ab'
    };

    const event = createMockEvent(invalidRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Validation failed');
    expect(responseBody.details).toBeDefined();
  });

  it('should return conflict error for existing email', async () => {
    const registerRequest = {
      email: 'existing@example.com',
      password: 'TestPassword123!',
      username: 'testuser'
    };

    mockAuthService.register.mockRejectedValue(new Error('Email already registered'));

    const event = createMockEvent(registerRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(409);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Email already registered');
  });

  it('should return conflict error for existing username', async () => {
    const registerRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'existing'
    };

    mockAuthService.register.mockRejectedValue(new Error('Username already taken'));

    const event = createMockEvent(registerRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(409);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Username already taken');
  });

  it('should return internal server error for unexpected errors', async () => {
    const registerRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser'
    };

    mockAuthService.register.mockRejectedValue(new Error('Database connection failed'));

    const event = createMockEvent(registerRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Internal server error');
  });

  it('should handle missing request body', async () => {
    const event = createMockEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Validation failed');
  });

  it('should include CORS headers in response', async () => {
    const event = createMockEvent({});
    const result = await handler(event);

    expect(result.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  });
});