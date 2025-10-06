import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './profile.js';
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
  getJWTConfigFromEnv: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  verifyAccessToken: vi.fn()
}));

const mockCreateDefaultAuthService = createDefaultAuthService as MockedFunction<typeof createDefaultAuthService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;
const mockCreateJWTProvider = jwtUtils.createJWTProvider as MockedFunction<typeof jwtUtils.createJWTProvider>;
const mockGetJWTConfigFromEnv = jwtUtils.getJWTConfigFromEnv as MockedFunction<typeof jwtUtils.getJWTConfigFromEnv>;
const mockExtractTokenFromHeader = jwtUtils.extractTokenFromHeader as MockedFunction<typeof jwtUtils.extractTokenFromHeader>;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as MockedFunction<typeof jwtUtils.verifyAccessToken>;

describe('Profile Handler', () => {
  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
    getUserById: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn() // Method name should match the actual handler
  };

  const createMockEvent = (
    method: string,
    body?: unknown,
    headers?: Record<string, string>
  ): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: `${method} /auth/profile`,
    rawPath: '/auth/profile',
    rawQueryString: '',
    headers: headers || {},
    requestContext: {
      requestId: 'test-request-id',
      http: {
        method,
        path: '/auth/profile',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent'
      },
      stage: 'test',
      time: '2024-01-01T00:00:00Z',
      timeEpoch: 1704067200000,
      accountId: 'test-account',
      apiId: 'test-api',
      requestId: 'test-request-id',
      routeKey: `${method} /auth/profile`,
      domainName: 'test-domain',
      domainPrefix: 'test'
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mocks
    mockCreateDynamoDBClient.mockReturnValue({} as any);
    mockGetTableName.mockReturnValue('test-table');
    mockCreateJWTProvider.mockReturnValue({} as any);
    mockGetJWTConfigFromEnv.mockReturnValue({ secret: 'test-secret' });
    mockCreateDefaultAuthService.mockReturnValue(mockAuthService as any);
  });

  describe('GET /auth/profile', () => {
    it('should return user profile when valid token provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'user-123' });
      mockAuthService.getUserById.mockResolvedValue(mockUser);

      const event = createMockEvent('GET', undefined, {
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({ user: mockUser });
      expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when no token provided', async () => {
      mockExtractTokenFromHeader.mockReturnValue(null);

      const event = createMockEvent('GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Access token required'
      });
    });

    it('should return 401 when invalid token provided', async () => {
      mockExtractTokenFromHeader.mockReturnValue('invalid-token');
      mockVerifyAccessToken.mockResolvedValue(null);

      const event = createMockEvent('GET', undefined, {
        Authorization: 'Bearer invalid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Invalid access token'
      });
    });

    it('should return 404 when user not found', async () => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'user-123' });
      mockAuthService.getUserById.mockResolvedValue(null);

      const event = createMockEvent('GET', undefined, {
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'User not found'
      });
    });
  });

  describe('PUT /auth/profile', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      emailVerified: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'user-123' });
      mockAuthService.getUserById.mockResolvedValue(mockUser);
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        fullName: 'Updated Name',
        bio: 'Updated bio',
        handle: 'updatedhandle'
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
        updatedAt: '2024-01-01T12:00:00Z'
      };

      // This test will fail because updateUserProfile doesn't exist yet
      mockAuthService.updateUser.mockResolvedValue(updatedUser);

      const event = createMockEvent('PUT', updateData, {
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({ user: updatedUser });
      expect(mockAuthService.updateUser).toHaveBeenCalledWith('user-123', updateData);
    });

    it('should validate profile update data', async () => {
      const invalidData = {
        fullName: '', // Invalid - empty string (required when provided)
        bio: 'a'.repeat(501), // Invalid - too long (max 500 characters)
        handle: 'ab' // Invalid - too short (minimum 3 characters)
      };

      const event = createMockEvent('PUT', invalidData, {
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const response = JSON.parse(result.body!);
      expect(response.error).toBe('Validation failed');
      expect(response.details).toBeDefined();
    });

    it('should handle basic profile update with required fields', async () => {
      const updateData = {
        fullName: 'Test User',
        bio: 'Test bio',
        handle: 'testhandle'
      };

      const updatedUser = {
        ...mockUser,
        ...updateData,
        updatedAt: '2024-01-01T12:00:00Z'
      };

      mockAuthService.updateUser.mockResolvedValue(updatedUser);

      const event = createMockEvent('PUT', updateData, {
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body!);
      expect(response.user.fullName).toBe(updateData.fullName);
      expect(response.user.bio).toBe(updateData.bio);
      expect(response.user.handle).toBe(updateData.handle);
    });

    it('should return 401 when no token provided for update', async () => {
      mockExtractTokenFromHeader.mockReturnValue(null);

      const event = createMockEvent('PUT', { fullName: 'New Name', bio: 'New bio', handle: 'newhandle' });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Access token required'
      });
    });

    it('should return 404 when updating non-existent user', async () => {
      mockAuthService.getUserById.mockResolvedValue(null);

      const event = createMockEvent('PUT', { fullName: 'New Name', bio: 'New bio', handle: 'newhandle' }, {
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'User not found'
      });
    });
  });

  describe('Unsupported Methods', () => {
    it('should return 405 for POST method', async () => {
      const event = createMockEvent('POST', {});
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Method not allowed',
        message: 'HTTP method POST is not supported for this endpoint'
      });
    });

    it('should return 405 for DELETE method', async () => {
      const event = createMockEvent('DELETE');
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Method not allowed',
        message: 'HTTP method DELETE is not supported for this endpoint'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'user-123' });
      mockAuthService.getUserById.mockRejectedValue(new Error('Database connection failed'));

      const event = createMockEvent('GET', undefined, {
        Authorization: 'Bearer valid-token'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Internal server error'
      });
    });

    it('should handle malformed JSON in request body', async () => {
      mockExtractTokenFromHeader.mockReturnValue('valid-token');
      mockVerifyAccessToken.mockResolvedValue({ userId: 'user-123' });

      const event = createMockEvent('PUT', undefined, {
        Authorization: 'Bearer valid-token'
      });
      event.body = '{ invalid json }';

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Internal server error'
      });
    });
  });
});