import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './refresh.js';
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

describe('Refresh Token Handler', () => {
  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    getUserById: vi.fn(),
    logout: vi.fn()
  };

  const createMockEvent = (body?: unknown): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'POST /auth/refresh',
    rawPath: '/auth/refresh',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json'
    },
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method: 'POST',
        path: '/auth/refresh',
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

  it('should successfully refresh tokens with valid refresh token', async () => {
    const refreshRequest = {
      refreshToken: 'valid-refresh-token'
    };

    const expectedResponse = {
      tokens: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900
      }
    };

    mockAuthService.refreshToken.mockResolvedValue(expectedResponse);

    const event = createMockEvent(refreshRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toEqual(expectedResponse);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshRequest);
  });

  it('should return validation error for invalid request', async () => {
    const invalidRequest = {
      refreshToken: ''
    };

    const event = createMockEvent(invalidRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Validation failed');
    expect(responseBody.details).toBeDefined();
  });

  it('should return unauthorized error for invalid refresh token', async () => {
    const refreshRequest = {
      refreshToken: 'invalid-refresh-token'
    };

    mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

    const event = createMockEvent(refreshRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Invalid refresh token');
  });

  it('should return unauthorized error for expired refresh token', async () => {
    const refreshRequest = {
      refreshToken: 'expired-refresh-token'
    };

    mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh token expired'));

    const event = createMockEvent(refreshRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Refresh token expired');
  });

  it('should return unauthorized error for non-existent user', async () => {
    const refreshRequest = {
      refreshToken: 'valid-refresh-token'
    };

    mockAuthService.refreshToken.mockRejectedValue(new Error('User not found'));

    const event = createMockEvent(refreshRequest);
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('User not found');
  });

  it('should return internal server error for unexpected errors', async () => {
    const refreshRequest = {
      refreshToken: 'valid-refresh-token'
    };

    mockAuthService.refreshToken.mockRejectedValue(new Error('Database connection failed'));

    const event = createMockEvent(refreshRequest);
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
});