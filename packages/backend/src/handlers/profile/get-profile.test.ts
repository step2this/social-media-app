/**
 * Unit tests for get-profile handler
 * Created as part of TDD approach to document current behavior before refactoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-profile.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';
import { setupTestEnvironment } from '../../test/utils/index.js';
import type { PublicProfileResponse } from '@social-media-app/shared';
import { z } from 'zod';

// Mock the dependencies
vi.mock('@social-media-app/dal', () => ({
  ProfileService: vi.fn(),
}));

vi.mock('../../utils/aws-config.js', () => ({
  createDynamoDBClient: () => ({}),
  createS3Client: () => ({}),
  getTableName: () => 'test-table',
  getS3BucketName: () => 'test-bucket',
  getCloudFrontDomain: () => 'test.cloudfront.net',
}));

vi.mock('../../utils/index.js', () => ({
  errorResponse: (statusCode: number, message: string) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: { message } }),
  }),
  successResponse: (statusCode: number, data: any) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
}));

describe('get-profile handler', () => {
  let mockProfileService: any;
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(async () => {
    testEnv = setupTestEnvironment();

    // Create fresh mocks for each test
    mockProfileService = {
      getProfileByHandle: vi.fn(),
    };

    // Mock the constructor to return our mock
    const { ProfileService } = await import('@social-media-app/dal');
    vi.mocked(ProfileService).mockImplementation(() => mockProfileService);
  });

  describe('Parameter Validation', () => {
    it('should return 400 when handle is missing', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: {},
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Handle is required');
      expect(mockProfileService.getProfileByHandle).not.toHaveBeenCalled();
    });

    it('should return 400 when pathParameters is null', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: undefined,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Handle is required');
    });
  });

  describe('Profile Retrieval', () => {
    it('should return profile when found', async () => {
      // Arrange
      const testHandle = 'testuser';
      const testProfile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        handle: testHandle,
        username: 'testuser',
        fullName: 'Test User',
        bio: 'Test bio',
        profilePictureUrl: 'https://test.cloudfront.net/avatar.jpg',
        profilePictureThumbnailUrl: undefined,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: testHandle },
      });

      mockProfileService.getProfileByHandle.mockResolvedValue(testProfile);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockProfileService.getProfileByHandle).toHaveBeenCalledWith(testHandle);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.profile).toEqual(testProfile);
    });

    it('should return 404 when profile not found', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: 'nonexistent-user' },
      });

      mockProfileService.getProfileByHandle.mockResolvedValue(null);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(mockProfileService.getProfileByHandle).toHaveBeenCalledWith('nonexistent-user');

      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Profile not found');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when ProfileService throws an error', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: 'test-handle' },
      });

      const serviceError = new Error('Database connection failed');
      mockProfileService.getProfileByHandle.mockRejectedValue(serviceError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Internal server error');
    });

    it('should return 400 when Zod validation fails', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: 'test-handle' },
      });

      // Mock ProfileService to return invalid data that will fail Zod validation
      const invalidProfile = { invalid: 'data' };
      mockProfileService.getProfileByHandle.mockResolvedValue(invalidProfile);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Invalid response data');
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted response with correct headers', async () => {
      // Arrange
      const testProfile = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        handle: 'validuser',
        username: 'validuser',
        fullName: 'Valid User',
        bio: 'Valid bio',
        profilePictureUrl: 'https://test.cloudfront.net/avatar.jpg',
        profilePictureThumbnailUrl: undefined,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: testProfile.handle },
      });

      mockProfileService.getProfileByHandle.mockResolvedValue(testProfile);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('profile');
      expect(responseBody.profile.handle).toBe(testProfile.handle);
    });

    it('should validate response against PublicProfileResponse schema', async () => {
      // Arrange
      const validProfile = {
        id: '123e4567-e89b-12d3-a456-426614174006',
        handle: 'schemauser',
        username: 'schemauser',
        fullName: 'Schema User',
        bio: 'Schema bio',
        profilePictureUrl: 'https://test.cloudfront.net/avatar.jpg',
        profilePictureThumbnailUrl: undefined,
        followersCount: 1,
        followingCount: 2,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: validProfile.handle },
      });

      mockProfileService.getProfileByHandle.mockResolvedValue(validProfile);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);

      // Verify response structure matches PublicProfileResponse schema
      expect(responseBody).toHaveProperty('profile');
      expect(responseBody.profile).toHaveProperty('id');
      expect(responseBody.profile).toHaveProperty('handle');
      expect(responseBody.profile).toHaveProperty('username');
      expect(responseBody.profile).toHaveProperty('fullName');
      expect(responseBody.profile).toHaveProperty('bio');
      expect(responseBody.profile).toHaveProperty('profilePictureUrl');
      // profilePictureThumbnailUrl is optional and may not be present when undefined
      expect(responseBody.profile.profilePictureThumbnailUrl).toBeUndefined();
      expect(responseBody.profile).toHaveProperty('postsCount');
      expect(responseBody.profile).toHaveProperty('followersCount');
      expect(responseBody.profile).toHaveProperty('followingCount');
      expect(responseBody.profile).toHaveProperty('createdAt');
    });
  });

  describe('Service Integration', () => {
    it('should initialize ProfileService with correct parameters', async () => {
      // Arrange
      const testProfile = {
        id: '123e4567-e89b-12d3-a456-426614174007',
        handle: 'integrationuser',
        username: 'integrationuser',
        fullName: undefined,
        bio: undefined,
        profilePictureUrl: undefined,
        profilePictureThumbnailUrl: undefined,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: testProfile.handle },
      });

      mockProfileService.getProfileByHandle.mockResolvedValue(testProfile);

      // Act
      await handler(event);

      // Assert
      const { ProfileService } = await import('@social-media-app/dal');

      // Verify ProfileService was instantiated with correct parameters
      expect(ProfileService).toHaveBeenCalledWith(
        {}, // DynamoDB client mock
        'test-table',
        'test-bucket',
        'test.cloudfront.net',
        {} // S3 client mock
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string handle as invalid', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: '' },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Handle is required');
    });

    it('should handle whitespace-only handle as valid (current behavior)', async () => {
      // Arrange
      const event = createMockAPIGatewayEvent({
        method: 'GET',
        pathParameters: { handle: '   ' },
      });

      // Since the handler currently just checks for truthy value, this will pass validation
      // This test documents current behavior
      mockProfileService.getProfileByHandle.mockResolvedValue(null);

      // Act
      const result = await handler(event);

      // Assert
      expect(mockProfileService.getProfileByHandle).toHaveBeenCalledWith('   ');
      expect(result.statusCode).toBe(404); // Profile not found, but validation passed
    });
  });
});