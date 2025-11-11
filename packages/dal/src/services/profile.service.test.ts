/* eslint-disable max-lines-per-function, max-statements, complexity, max-depth, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileService, type ProfileEntity } from './profile.service.js';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  UpdateProfileWithHandleRequest,
  GetPresignedUrlRequest
} from '@social-media-app/shared';
import { createMockDynamoClient, type MockDynamoClient } from '@social-media-app/shared/test-utils';

// Setup S3 mocks (must be at top level for hoisting)
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed-url')
}));

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockDynamoClient: MockDynamoClient;
  const tableName = 'test-table';
  const s3BucketName = 'test-bucket';
  const cloudFrontDomain = 'cdn.example.com';

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    profileService = new ProfileService(
      mockDynamoClient as unknown as DynamoDBDocumentClient,
      tableName,
      s3BucketName,
      cloudFrontDomain
    );
  });

  describe('getProfileById', () => {
    it('should return profile when found', async () => {
      const userId = 'user123';
      const profileEntity: ProfileEntity = {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        GSI1PK: 'EMAIL#user@example.com',
        GSI1SK: `USER#${userId}`,
        GSI2PK: 'USERNAME#testuser',
        GSI2SK: `USER#${userId}`,
        id: userId,
        email: 'user@example.com',
        username: 'testuser',
        handle: 'testhandle',
        fullName: 'Test User',
        bio: 'Test bio',
        postsCount: 5,
        followersCount: 10,
        followingCount: 15,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'USER'
      };

      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileEntity);

      const result = await profileService.getProfileById(userId);

      expect(result).toMatchObject({
        id: userId,
        email: 'user@example.com',
        username: 'testuser',
        handle: 'testhandle',
        fullName: 'Test User',
        bio: 'Test bio',
        postsCount: 5,
        followersCount: 10,
        followingCount: 15,
        emailVerified: true
      });
    });

    it('should return null when profile not found', async () => {
      const result = await profileService.getProfileById('nonexistent');
      expect(result).toBeNull();
    });

    it('should use username as handle when handle is undefined', async () => {
      const userId = 'user123';
      const profileEntity: ProfileEntity = {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        GSI1PK: 'EMAIL#user@example.com',
        GSI1SK: `USER#${userId}`,
        GSI2PK: 'USERNAME#testuser',
        GSI2SK: `USER#${userId}`,
        id: userId,
        email: 'user@example.com',
        username: 'testuser',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'USER'
      };

      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileEntity);

      const result = await profileService.getProfileById(userId);

      expect(result?.handle).toBe('testuser');
    });
  });

  describe('getProfileByHandle', () => {
    it('should return public profile when found', async () => {
      const userId = 'user123';
      const handle = 'testhandle';
      const profileEntity: ProfileEntity = {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        GSI1PK: 'EMAIL#user@example.com',
        GSI1SK: `USER#${userId}`,
        GSI2PK: 'USERNAME#testuser',
        GSI2SK: `USER#${userId}`,
        GSI3PK: `HANDLE#${handle}`,
        GSI3SK: `USER#${userId}`,
        id: userId,
        email: 'user@example.com',
        username: 'testuser',
        handle,
        fullName: 'Test User',
        bio: 'Test bio',
        postsCount: 5,
        followersCount: 10,
        followingCount: 15,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'USER'
      };

      mockDynamoClient._getGSI3Items().set(`HANDLE#${handle}`, [profileEntity]);

      const result = await profileService.getProfileByHandle(handle);

      expect(result).toMatchObject({
        id: userId,
        username: 'testuser',
        handle,
        fullName: 'Test User',
        bio: 'Test bio',
        postsCount: 5,
        followersCount: 10,
        followingCount: 15
      });
      // Should not include email in public profile
      expect(result).not.toHaveProperty('email');
    });

    it('should return null when handle not found', async () => {
      const result = await profileService.getProfileByHandle('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive handle lookup', async () => {
      const userId = 'user123';
      const handle = 'TestHandle';
      const profileEntity: ProfileEntity = {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        GSI1PK: 'EMAIL#user@example.com',
        GSI1SK: `USER#${userId}`,
        GSI2PK: 'USERNAME#testuser',
        GSI2SK: `USER#${userId}`,
        GSI3PK: 'HANDLE#testhandle',
        GSI3SK: `USER#${userId}`,
        id: userId,
        email: 'user@example.com',
        username: 'testuser',
        handle: 'testhandle',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'USER'
      };

      mockDynamoClient._getGSI3Items().set('HANDLE#testhandle', [profileEntity]);

      const result = await profileService.getProfileByHandle(handle);

      expect(result?.handle).toBe('testhandle');
    });
  });

  describe('isHandleAvailable', () => {
    it('should return true when handle is available', async () => {
      const result = await profileService.isHandleAvailable('newhandle');
      expect(result).toBe(true);
    });

    it('should return false when handle is taken', async () => {
      const handle = 'takenhandle';
      const profileEntity: ProfileEntity = {
        PK: 'USER#user123',
        SK: 'PROFILE',
        GSI1PK: 'EMAIL#user@example.com',
        GSI1SK: 'USER#user123',
        GSI2PK: 'USERNAME#testuser',
        GSI2SK: 'USER#user123',
        GSI3PK: `HANDLE#${handle}`,
        GSI3SK: 'USER#user123',
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser',
        handle,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'USER'
      };

      mockDynamoClient._getGSI3Items().set(`HANDLE#${handle}`, [profileEntity]);

      const result = await profileService.isHandleAvailable(handle);
      expect(result).toBe(false);
    });

    it('should return true when handle belongs to excluded user', async () => {
      const handle = 'userhandle';
      const userId = 'user123';
      const profileEntity: ProfileEntity = {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        GSI1PK: 'EMAIL#user@example.com',
        GSI1SK: `USER#${userId}`,
        GSI2PK: 'USERNAME#testuser',
        GSI2SK: `USER#${userId}`,
        GSI3PK: `HANDLE#${handle}`,
        GSI3SK: `USER#${userId}`,
        id: userId,
        email: 'user@example.com',
        username: 'testuser',
        handle,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'USER'
      };

      mockDynamoClient._getGSI3Items().set(`HANDLE#${handle}`, [profileEntity]);

      const result = await profileService.isHandleAvailable(handle, userId);
      expect(result).toBe(true);
    });
  });

  describe('updateProfile', () => {
    const userId = 'user123';
    const profileEntity: ProfileEntity = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: 'EMAIL#user@example.com',
      GSI1SK: `USER#${userId}`,
      GSI2PK: 'USERNAME#testuser',
      GSI2SK: `USER#${userId}`,
      id: userId,
      email: 'user@example.com',
      username: 'testuser',
      bio: 'Original bio',
      fullName: 'Original Name',
      postsCount: 5,
      followersCount: 10,
      followingCount: 15,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entityType: 'USER'
    };

    beforeEach(() => {
      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileEntity);
    });

    it('should update profile successfully', async () => {
      const updates: UpdateProfileWithHandleRequest = {
        bio: 'Updated bio',
        fullName: 'Updated Name'
      };

      const result = await profileService.updateProfile(userId, updates);

      expect(result).toMatchObject({
        id: userId,
        bio: 'Updated bio',
        fullName: 'Updated Name'
      });
      expect(result.updatedAt).not.toBe(profileEntity.updatedAt);
    });

    it('should update handle when available', async () => {
      const updates: UpdateProfileWithHandleRequest = {
        handle: 'newhandle'
      };

      const result = await profileService.updateProfile(userId, updates);

      expect(result.handle).toBe('newhandle');
    });

    it('should throw error when handle is taken', async () => {
      const existingHandle = 'takenhandle';
      const existingProfileEntity: ProfileEntity = {
        PK: 'USER#otheruser',
        SK: 'PROFILE',
        GSI1PK: 'EMAIL#other@example.com',
        GSI1SK: 'USER#otheruser',
        GSI2PK: 'USERNAME#otheruser',
        GSI2SK: 'USER#otheruser',
        GSI3PK: `HANDLE#${existingHandle}`,
        GSI3SK: 'USER#otheruser',
        id: 'otheruser',
        email: 'other@example.com',
        username: 'otheruser',
        handle: existingHandle,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'USER'
      };

      mockDynamoClient._getGSI3Items().set(`HANDLE#${existingHandle}`, [existingProfileEntity]);

      const updates: UpdateProfileWithHandleRequest = {
        handle: existingHandle
      };

      await expect(profileService.updateProfile(userId, updates))
        .rejects.toThrow('Handle is already taken');
    });
  });

  describe('updateProfilePicture', () => {
    const userId = 'user123';
    const profileEntity: ProfileEntity = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: 'EMAIL#user@example.com',
      GSI1SK: `USER#${userId}`,
      GSI2PK: 'USERNAME#testuser',
      GSI2SK: `USER#${userId}`,
      id: userId,
      email: 'user@example.com',
      username: 'testuser',
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entityType: 'USER'
    };

    beforeEach(() => {
      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileEntity);
    });

    it('should update profile picture URLs', async () => {
      const profilePictureUrl = 'https://example.com/profile.jpg';
      const thumbnailUrl = 'https://example.com/thumb.jpg';

      const result = await profileService.updateProfilePicture(userId, profilePictureUrl, thumbnailUrl);

      expect(result).toMatchObject({
        profilePictureUrl,
        profilePictureThumbnailUrl: thumbnailUrl
      });
      expect(result.updatedAt).not.toBe(profileEntity.updatedAt);
    });
  });

  describe('generatePresignedUrl', () => {
    beforeEach(() => {
      // Reset environment
      delete process.env.AWS_REGION;
      delete process.env.USE_LOCALSTACK;
      delete process.env.LOCALSTACK_ENDPOINT;
    });

    it('should generate presigned URL for profile picture', async () => {
      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/jpeg',
        purpose: 'profile-picture'
      };

      const result = await profileService.generatePresignedUrl(userId, request);

      expect(result).toMatchObject({
        uploadUrl: 'https://example.com/signed-url',
        expiresIn: 3600
      });
      expect(result.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\/users\/user123\/profile\/.+\.jpeg$/);
      expect(result.thumbnailUrl).toMatch(/^https:\/\/cdn\.example\.com\/users\/user123\/profile\/.+_thumb\.jpeg$/);
    });

    it('should generate presigned URL for post image', async () => {
      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/png',
        purpose: 'post-image'
      };

      const result = await profileService.generatePresignedUrl(userId, request);

      expect(result.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\/users\/user123\/posts\/.+\.png$/);
      expect(result.thumbnailUrl).toMatch(/^https:\/\/cdn\.example\.com\/users\/user123\/posts\/.+_thumb\.png$/);
    });

    it('should use S3 URL when CloudFront domain not provided', async () => {
      const profileServiceWithoutCF = new ProfileService(
        mockDynamoClient as unknown as DynamoDBDocumentClient,
        tableName,
        s3BucketName
      );

      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/jpeg',
        purpose: 'profile-picture'
      };

      const result = await profileServiceWithoutCF.generatePresignedUrl(userId, request);

      // Updated to match new region-aware S3 URL format
      expect(result.publicUrl).toMatch(/^https:\/\/test-bucket\.s3\.[a-z0-9-]+\.amazonaws\.com\/users\/user123\/profile\/.+\.jpeg$/);
    });

    it('should throw error when S3 bucket not configured', async () => {
      // Clear environment variable to test bucket validation
      const originalMediaBucket = process.env.MEDIA_BUCKET_NAME;
      delete process.env.MEDIA_BUCKET_NAME;

      const profileServiceNoBucket = new ProfileService(
        mockDynamoClient as unknown as DynamoDBDocumentClient,
        tableName,
        '' // Explicitly pass empty string
      );

      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/jpeg',
        purpose: 'profile-picture'
      };

      await expect(profileServiceNoBucket.generatePresignedUrl(userId, request))
        .rejects.toThrow('S3 bucket not configured');

      // Restore environment variable
      if (originalMediaBucket) {
        process.env.MEDIA_BUCKET_NAME = originalMediaBucket;
      }
    });

    it('should generate LocalStack URLs when USE_LOCALSTACK=true', async () => {
      // Set LocalStack environment variables
      process.env.USE_LOCALSTACK = 'true';
      process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';

      // Create ProfileService without CloudFront domain for LocalStack testing
      const localStackProfileService = new ProfileService(
        mockDynamoClient as unknown as DynamoDBDocumentClient,
        tableName,
        s3BucketName
      );

      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/jpeg',
        purpose: 'post-image'
      };

      const result = await localStackProfileService.generatePresignedUrl(userId, request);

      expect(result.publicUrl).toMatch(/^http:\/\/localhost:4566\/test-bucket\/users\/user123\/posts\/.+\.jpeg$/);
      expect(result.thumbnailUrl).toMatch(/^http:\/\/localhost:4566\/test-bucket\/users\/user123\/posts\/.+_thumb\.jpeg$/);
    });

    it('should generate LocalStack URLs with custom endpoint', async () => {
      // Set LocalStack environment with custom endpoint
      process.env.USE_LOCALSTACK = 'true';
      process.env.LOCALSTACK_ENDPOINT = 'http://localstack.example.com:4567';

      // Create ProfileService without CloudFront domain for LocalStack testing
      const localStackProfileService = new ProfileService(
        mockDynamoClient as unknown as DynamoDBDocumentClient,
        tableName,
        s3BucketName
      );

      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/png',
        purpose: 'profile-picture'
      };

      const result = await localStackProfileService.generatePresignedUrl(userId, request);

      expect(result.publicUrl).toMatch(/^http:\/\/localstack\.example\.com:4567\/test-bucket\/users\/user123\/profile\/.+\.png$/);
      expect(result.thumbnailUrl).toMatch(/^http:\/\/localstack\.example\.com:4567\/test-bucket\/users\/user123\/profile\/.+_thumb\.png$/);
    });

    it('should prefer CloudFront over LocalStack when both are configured', async () => {
      // Set both CloudFront and LocalStack environment variables
      process.env.USE_LOCALSTACK = 'true';
      process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';

      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/jpeg',
        purpose: 'profile-picture'
      };

      const result = await profileService.generatePresignedUrl(userId, request);

      // Should still use CloudFront domain since it's configured in the service
      expect(result.publicUrl).toMatch(/^https:\/\/cdn\.example\.com\/users\/user123\/profile\/.+\.jpeg$/);
      expect(result.thumbnailUrl).toMatch(/^https:\/\/cdn\.example\.com\/users\/user123\/profile\/.+_thumb\.jpeg$/);
    });

    it('should fall back to AWS S3 URLs when LocalStack is disabled', async () => {
      // Explicitly disable LocalStack
      process.env.USE_LOCALSTACK = 'false';
      process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';

      const profileServiceWithoutCF = new ProfileService(
        mockDynamoClient as unknown as DynamoDBDocumentClient,
        tableName,
        s3BucketName
      );

      const userId = 'user123';
      const request: GetPresignedUrlRequest = {
        fileType: 'image/jpeg',
        purpose: 'profile-picture'
      };

      const result = await profileServiceWithoutCF.generatePresignedUrl(userId, request);

      // Updated to match new region-aware S3 URL format
      expect(result.publicUrl).toMatch(/^https:\/\/test-bucket\.s3\.[a-z0-9-]+\.amazonaws\.com\/users\/user123\/profile\/.+\.jpeg$/);
    });
  });

  describe('incrementPostsCount', () => {
    const userId = 'user123';
    const profileEntity: ProfileEntity = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: 'EMAIL#user@example.com',
      GSI1SK: `USER#${userId}`,
      GSI2PK: 'USERNAME#testuser',
      GSI2SK: `USER#${userId}`,
      id: userId,
      email: 'user@example.com',
      username: 'testuser',
      postsCount: 5,
      followersCount: 0,
      followingCount: 0,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entityType: 'USER'
    };

    beforeEach(() => {
      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileEntity);
    });

    it('should increment posts count when field exists', async () => {
      await profileService.incrementPostsCount(userId);

      const updatedItem = mockDynamoClient._getItems().get(`USER#${userId}#PROFILE`);
      expect(updatedItem?.postsCount).toBe(6);
    });

    it('should initialize and increment posts count when field does not exist', async () => {
      // Create profile without postsCount field
      const { postsCount, ...profileWithoutPostsCount } = profileEntity;
      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileWithoutPostsCount);

      await profileService.incrementPostsCount(userId);

      const updatedItem = mockDynamoClient._getItems().get(`USER#${userId}#PROFILE`);
      expect(updatedItem?.postsCount).toBe(1);
    });
  });

  describe('decrementPostsCount', () => {
    const userId = 'user123';
    const profileEntity: ProfileEntity = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: 'EMAIL#user@example.com',
      GSI1SK: `USER#${userId}`,
      GSI2PK: 'USERNAME#testuser',
      GSI2SK: `USER#${userId}`,
      id: userId,
      email: 'user@example.com',
      username: 'testuser',
      postsCount: 5,
      followersCount: 0,
      followingCount: 0,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entityType: 'USER'
    };

    beforeEach(() => {
      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileEntity);
    });

    it('should decrement posts count when field exists', async () => {
      await profileService.decrementPostsCount(userId);

      const updatedItem = mockDynamoClient._getItems().get(`USER#${userId}#PROFILE`);
      expect(updatedItem?.postsCount).toBe(4);
    });

    it('should not decrement below zero when field exists', async () => {
      // Set posts count to 0
      const zeroPostsEntity = { ...profileEntity, postsCount: 0 };
      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, zeroPostsEntity);

      await expect(profileService.decrementPostsCount(userId))
        .rejects.toThrow('ConditionalCheckFailedException');
    });

    it('should not decrement when field does not exist', async () => {
      // Create profile without postsCount field
      const { postsCount, ...profileWithoutPostsCount } = profileEntity;
      mockDynamoClient._setItem(`USER#${userId}#PROFILE`, profileWithoutPostsCount);

      await expect(profileService.decrementPostsCount(userId))
        .rejects.toThrow('ConditionalCheckFailedException');
    });
  });
});