import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { handler } from './register.js';
import { createDefaultAuthService } from '@social-media-app/dal';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
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

    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/auth/register',
      routeKey: 'POST /auth/register',
      body: registerRequest
    });
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

    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/auth/register',
      routeKey: 'POST /auth/register',
      body: invalidRequest
    });
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

    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/auth/register',
      routeKey: 'POST /auth/register',
      body: registerRequest
    });
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

    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/auth/register',
      routeKey: 'POST /auth/register',
      body: registerRequest
    });
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

    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/auth/register',
      routeKey: 'POST /auth/register',
      body: registerRequest
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Internal server error');
  });

  it('should handle missing request body', async () => {
    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/auth/register',
      routeKey: 'POST /auth/register'
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body!);
    expect(responseBody.error).toBe('Validation failed');
  });

  it('should include CORS headers in response', async () => {
    const event = createMockAPIGatewayEvent({
      method: 'POST',
      path: '/auth/register',
      routeKey: 'POST /auth/register',
      body: {}
    });
    const result = await handler(event);

    expect(result.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
  });
});