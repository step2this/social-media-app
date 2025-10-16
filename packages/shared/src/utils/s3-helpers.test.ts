/**
 * S3 Helpers Tests
 *
 * Tests for shared S3 utility functions used across the application
 * for generating presigned upload URLs and S3 keys.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePresignedUploadUrl, buildS3Key, buildPublicUrl } from './s3-helpers.js';
import type { S3Client } from '@aws-sdk/client-s3';

// Mock AWS SDK
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://bucket.s3.amazonaws.com/signed-url?signature=abc123'),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn(),
}));

describe('s3-helpers', () => {
  describe('buildS3Key', () => {
    it('should build key for profile picture', () => {
      const key = buildS3Key({
        userId: 'user-123',
        purpose: 'profile-picture',
        fileExtension: 'jpg',
        uniqueId: 'abc-def-123',
      });

      expect(key).toBe('users/user-123/profile/abc-def-123.jpg');
    });

    it('should build key for post image', () => {
      const key = buildS3Key({
        userId: 'user-123',
        purpose: 'post-image',
        fileExtension: 'png',
        uniqueId: 'xyz-789',
      });

      expect(key).toBe('users/user-123/posts/xyz-789.png');
    });

    it('should build key for auction image', () => {
      const key = buildS3Key({
        userId: 'user-123',
        purpose: 'auction-image',
        fileExtension: 'jpeg',
        uniqueId: 'auction-456',
      });

      expect(key).toBe('users/user-123/auctions/auction-456.jpeg');
    });

    it('should build thumbnail key when specified', () => {
      const key = buildS3Key({
        userId: 'user-123',
        purpose: 'profile-picture',
        fileExtension: 'jpg',
        uniqueId: 'abc-def-123',
        isThumbnail: true,
      });

      expect(key).toBe('users/user-123/profile/abc-def-123_thumb.jpg');
    });

    it('should handle different file extensions', () => {
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

      extensions.forEach((ext) => {
        const key = buildS3Key({
          userId: 'user-123',
          purpose: 'post-image',
          fileExtension: ext,
          uniqueId: 'test-id',
        });

        expect(key).toBe(`users/user-123/posts/test-id.${ext}`);
      });
    });
  });

  describe('buildPublicUrl', () => {
    it('should build CloudFront URL when domain provided', () => {
      const url = buildPublicUrl({
        key: 'users/user-123/profile/image.jpg',
        cloudFrontDomain: 'd111111abcdef8.cloudfront.net',
        bucketName: 'my-bucket',
      });

      expect(url).toBe('https://d111111abcdef8.cloudfront.net/users/user-123/profile/image.jpg');
    });

    it('should build direct S3 URL when no CloudFront domain', () => {
      const url = buildPublicUrl({
        key: 'users/user-123/posts/image.png',
        cloudFrontDomain: undefined,
        bucketName: 'my-bucket',
      });

      expect(url).toBe('https://my-bucket.s3.amazonaws.com/users/user-123/posts/image.png');
    });

    it('should handle keys with special characters', () => {
      const url = buildPublicUrl({
        key: 'users/user-123/posts/image with spaces.jpg',
        cloudFrontDomain: 'd111111abcdef8.cloudfront.net',
        bucketName: 'my-bucket',
      });

      expect(url).toBe('https://d111111abcdef8.cloudfront.net/users/user-123/posts/image with spaces.jpg');
    });
  });

  describe('generatePresignedUploadUrl', () => {
    let mockS3Client: S3Client;

    beforeEach(() => {
      mockS3Client = {} as S3Client;
      vi.clearAllMocks();
    });

    it('should generate presigned URL for profile picture', async () => {
      const result = await generatePresignedUploadUrl({
        s3Client: mockS3Client,
        bucketName: 'test-bucket',
        userId: 'user-123',
        fileType: 'image/jpeg',
        purpose: 'profile-picture',
        cloudFrontDomain: 'd111111abcdef8.cloudfront.net',
      });

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('publicUrl');
      expect(result).toHaveProperty('thumbnailUrl');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('expiresIn', 3600);

      expect(result.uploadUrl).toContain('signed-url');
      expect(result.publicUrl).toContain('d111111abcdef8.cloudfront.net');
      expect(result.publicUrl).toContain('users/user-123/profile');
      expect(result.key).toMatch(/users\/user-123\/profile\/[\w-]+\.jpeg/);
    });

    it('should generate presigned URL for post image', async () => {
      const result = await generatePresignedUploadUrl({
        s3Client: mockS3Client,
        bucketName: 'test-bucket',
        userId: 'user-456',
        fileType: 'image/png',
        purpose: 'post-image',
      });

      expect(result.key).toMatch(/users\/user-456\/posts\/[\w-]+\.png/);
      expect(result.publicUrl).toContain('test-bucket.s3.amazonaws.com');
    });

    it('should generate presigned URL for auction image', async () => {
      const result = await generatePresignedUploadUrl({
        s3Client: mockS3Client,
        bucketName: 'test-bucket',
        userId: 'user-789',
        fileType: 'image/jpeg',
        purpose: 'auction-image',
      });

      expect(result.key).toMatch(/users\/user-789\/auctions\/[\w-]+\.jpeg/);
    });

    it('should include thumbnail URL for profile pictures', async () => {
      const result = await generatePresignedUploadUrl({
        s3Client: mockS3Client,
        bucketName: 'test-bucket',
        userId: 'user-123',
        fileType: 'image/jpeg',
        purpose: 'profile-picture',
      });

      expect(result.thumbnailUrl).toBeDefined();
      expect(result.thumbnailUrl).toContain('_thumb.jpeg');
    });

    it('should include thumbnail URL for post images', async () => {
      const result = await generatePresignedUploadUrl({
        s3Client: mockS3Client,
        bucketName: 'test-bucket',
        userId: 'user-123',
        fileType: 'image/png',
        purpose: 'post-image',
      });

      expect(result.thumbnailUrl).toBeDefined();
      expect(result.thumbnailUrl).toContain('_thumb.png');
    });

    it('should not include thumbnail URL for auction images', async () => {
      const result = await generatePresignedUploadUrl({
        s3Client: mockS3Client,
        bucketName: 'test-bucket',
        userId: 'user-123',
        fileType: 'image/jpeg',
        purpose: 'auction-image',
      });

      expect(result.thumbnailUrl).toBeUndefined();
    });

    it('should extract file extension from MIME type', async () => {
      const mimeTypes = [
        { input: 'image/jpeg', expected: 'jpeg' },
        { input: 'image/png', expected: 'png' },
        { input: 'image/gif', expected: 'gif' },
        { input: 'image/webp', expected: 'webp' },
      ];

      for (const { input, expected } of mimeTypes) {
        const result = await generatePresignedUploadUrl({
          s3Client: mockS3Client,
          bucketName: 'test-bucket',
          userId: 'user-123',
          fileType: input,
          purpose: 'post-image',
        });

        expect(result.key).toContain(`.${expected}`);
      }
    });

    it('should use custom expiry time when provided', async () => {
      const result = await generatePresignedUploadUrl({
        s3Client: mockS3Client,
        bucketName: 'test-bucket',
        userId: 'user-123',
        fileType: 'image/jpeg',
        purpose: 'post-image',
        expiresIn: 7200,
      });

      expect(result.expiresIn).toBe(7200);
    });

    it('should throw error when bucket name is empty', async () => {
      await expect(
        generatePresignedUploadUrl({
          s3Client: mockS3Client,
          bucketName: '',
          userId: 'user-123',
          fileType: 'image/jpeg',
          purpose: 'post-image',
        })
      ).rejects.toThrow('S3 bucket name is required');
    });

    it('should throw error when user ID is empty', async () => {
      await expect(
        generatePresignedUploadUrl({
          s3Client: mockS3Client,
          bucketName: 'test-bucket',
          userId: '',
          fileType: 'image/jpeg',
          purpose: 'post-image',
        })
      ).rejects.toThrow('User ID is required');
    });

    it('should throw error when file type is invalid', async () => {
      await expect(
        generatePresignedUploadUrl({
          s3Client: mockS3Client,
          bucketName: 'test-bucket',
          userId: 'user-123',
          fileType: 'invalid',
          purpose: 'post-image',
        })
      ).rejects.toThrow('Invalid file type format');
    });
  });
});
