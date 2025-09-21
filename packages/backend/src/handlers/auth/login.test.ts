import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './login.js';
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

describe('Login Handler', () => {
  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    getUserById: vi.fn(),
    logout: vi.fn()
  };

  const createMockEvent = (body?: unknown): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /auth/login',
    rawPath: '/auth/login',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json'
    },
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'POST',
        path: '/auth/login',
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

  it('should successfully login with valid credentials', async () => {
    const loginRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'Web'
      }
    };

    const expectedResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      tokens: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-value',
        expiresIn: 900
      }
    };

    mockAuthService.login.mockResolvedValue(expectedResponse);

    const event = createMockEvent(loginRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toEqual(expectedResponse);
    expect(mockAuthService.login).toHaveBeenCalledWith(loginRequest);
  });

  it('should return validation error for invalid request', async () => {
    const invalidRequest = {
      email: 'invalid-email',
      password: ''
    };

    const event = createMockEvent(invalidRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Validation failed');
    expect(responseBody.details).toBeDefined();
  });

  it('should return unauthorized error for invalid credentials', async () => {
    const loginRequest = {
      email: 'test@example.com',
      password: 'WrongPassword123!'
    };

    mockAuthService.login.mockRejectedValue(new Error('Invalid email or password'));

    const event = createMockEvent(loginRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Invalid email or password');
  });

  it('should login without device info', async () => {
    const loginRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const expectedResponse = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      tokens: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-value',
        expiresIn: 900
      }
    };

    mockAuthService.login.mockResolvedValue(expectedResponse);

    const event = createMockEvent(loginRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toEqual(expectedResponse);
  });

  it('should return internal server error for unexpected errors', async () => {
    const loginRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    mockAuthService.login.mockRejectedValue(new Error('Database connection failed'));

    const event = createMockEvent(loginRequest);
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