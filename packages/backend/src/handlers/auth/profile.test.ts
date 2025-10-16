import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { handler } from './profile.js';
import { ProfileService } from '@social-media-app/dal';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import * as dynamoUtils from '../../utils/dynamodb.js';
import * as jwtUtils from '../../utils/jwt.js';

// Mock dependencies
vi.mock('@social-media-app/dal', () => ({
  ProfileService: vi.fn()
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

const MockProfileService = ProfileService as vi.MockedClass<typeof ProfileService>;
const mockCreateDynamoDBClient = dynamoUtils.createDynamoDBClient as MockedFunction<typeof dynamoUtils.createDynamoDBClient>;
const mockGetTableName = dynamoUtils.getTableName as MockedFunction<typeof dynamoUtils.getTableName>;
const mockCreateJWTProvider = jwtUtils.createJWTProvider as MockedFunction<typeof jwtUtils.createJWTProvider>;
const mockGetJWTConfigFromEnv = jwtUtils.getJWTConfigFromEnv as MockedFunction<typeof jwtUtils.getJWTConfigFromEnv>;
const mockExtractTokenFromHeader = jwtUtils.extractTokenFromHeader as MockedFunction<typeof jwtUtils.extractTokenFromHeader>;
const mockVerifyAccessToken = jwtUtils.verifyAccessToken as MockedFunction<typeof jwtUtils.verifyAccessToken>;

describe('Profile Handler', () => {
  let mockProfileService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mockProfileService = {
      getProfileById: vi.fn(),
      updateProfile: vi.fn(),
    };

    // Set up default mocks
    mockCreateDynamoDBClient.mockReturnValue({} as any);
    mockGetTableName.mockReturnValue('test-table');
    mockCreateJWTProvider.mockReturnValue({} as any);
    mockGetJWTConfigFromEnv.mockReturnValue({ secret: 'test-secret' });
    MockProfileService.mockImplementation(() => mockProfileService);
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
      mockProfileService.getProfileById.mockResolvedValue(mockUser);

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        path: '/auth/profile',
        routeKey: 'GET /auth/profile',
        headers: { authorization: 'Bearer valid-token' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({ profile: mockUser });
      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when no token provided', async () => {
      mockExtractTokenFromHeader.mockReturnValue(null);

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        path: '/auth/profile',
        routeKey: 'GET /auth/profile'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Access token required'
      });
    });

    it('should return 401 when invalid token provided', async () => {
      mockExtractTokenFromHeader.mockReturnValue('invalid-token');
      mockVerifyAccessToken.mockResolvedValue(null);

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        path: '/auth/profile',
        routeKey: 'GET /auth/profile',
        headers: { authorization: 'Bearer invalid-token' }
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
      mockProfileService.getProfileById.mockResolvedValue(null);

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        path: '/auth/profile',
        routeKey: 'GET /auth/profile',
        headers: { authorization: 'Bearer valid-token' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Profile not found'
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

      mockProfileService.updateProfile.mockResolvedValue(updatedUser);

      const event = createMockAPIGatewayEvent({
        method: 'PUT',
        path: '/auth/profile',
        routeKey: 'PUT /auth/profile',
        body: updateData,
        headers: { authorization: 'Bearer valid-token' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body!)).toEqual({ profile: updatedUser });
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('user-123', updateData);
    });

    it('should validate profile update data', async () => {
      const invalidData = {
        fullName: '', // Invalid - empty string (required when provided)
        bio: 'a'.repeat(501), // Invalid - too long (max 500 characters)
        handle: 'ab' // Invalid - too short (minimum 3 characters)
      };

      const event = createMockAPIGatewayEvent({
        method: 'PUT',
        path: '/auth/profile',
        routeKey: 'PUT /auth/profile',
        body: invalidData,
        headers: { authorization: 'Bearer valid-token' }
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

      mockProfileService.updateProfile.mockResolvedValue(updatedUser);

      const event = createMockAPIGatewayEvent({
        method: 'PUT',
        path: '/auth/profile',
        routeKey: 'PUT /auth/profile',
        body: updateData,
        headers: { authorization: 'Bearer valid-token' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body!);
      expect(response.profile.fullName).toBe(updateData.fullName);
      expect(response.profile.bio).toBe(updateData.bio);
      expect(response.profile.handle).toBe(updateData.handle);
    });

    it('should return 401 when no token provided for update', async () => {
      mockExtractTokenFromHeader.mockReturnValue(null);

      const event = createMockAPIGatewayEvent({
        method: 'PUT',
        path: '/auth/profile',
        routeKey: 'PUT /auth/profile',
        body: { fullName: 'New Name', bio: 'New bio', handle: 'newhandle' }
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Access token required'
      });
    });

    it('should return 404 when updating non-existent user', async () => {
      mockProfileService.updateProfile.mockRejectedValue(new Error('User not found'));

      const event = createMockAPIGatewayEvent({
        method: 'PUT',
        path: '/auth/profile',
        routeKey: 'PUT /auth/profile',
        body: { fullName: 'New Name', bio: 'New bio', handle: 'newhandle' },
        headers: { authorization: 'Bearer valid-token' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Internal server error'
      });
    });
  });

  describe('Unsupported Methods', () => {
    it('should return 405 for POST method', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'POST',
        path: '/auth/profile',
        routeKey: 'POST /auth/profile',
        body: {}
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Method not allowed',
        message: 'HTTP method POST is not supported for this endpoint'
      });
    });

    it('should return 405 for DELETE method', async () => {
      const event = createMockAPIGatewayEvent({
        method: 'DELETE',
        path: '/auth/profile',
        routeKey: 'DELETE /auth/profile'
      });
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
      mockProfileService.getProfileById.mockRejectedValue(new Error('Database connection failed'));

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        path: '/auth/profile',
        routeKey: 'GET /auth/profile',
        headers: { authorization: 'Bearer valid-token' }
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

      const event = createMockAPIGatewayEvent({
        method: 'PUT',
        path: '/auth/profile',
        routeKey: 'PUT /auth/profile',
        rawBody: '{ invalid json }',
        headers: { authorization: 'Bearer valid-token' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body!)).toEqual({
        error: 'Internal server error'
      });
    });
  });
});