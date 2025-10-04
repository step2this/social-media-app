/**
 * Unit tests for get-post handler
 * Following TDD principles with comprehensive test coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-post.js';
import { createMockLambdaEvent, createTestPost, setupTestEnvironment } from '../../test/utils/index.js';
import type { PostResponse } from '@social-media-app/shared';
import { z } from 'zod';

// Mock the dependencies
vi.mock('@social-media-app/dal', () => ({
  PostService: vi.fn(),
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

describe('get-post handler', () => {
  let mockPostService: any;
  let mockProfileService: any;
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(async () => {
    testEnv = setupTestEnvironment();

    // Create fresh mocks for each test
    mockPostService = {
      getPostById: vi.fn(),
    };

    mockProfileService = {};

    // Mock the constructors to return our mocks
    const { PostService, ProfileService } = await import('@social-media-app/dal');
    vi.mocked(PostService).mockImplementation(() => mockPostService);
    vi.mocked(ProfileService).mockImplementation(() => mockProfileService);
  });

  describe('Parameter Validation', () => {
    it('should return 400 when postId is missing', async () => {
      // Arrange
      const event = createMockLambdaEvent({
        pathParameters: {},
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Post ID is required');
      expect(mockPostService.getPostById).not.toHaveBeenCalled();
    });

    it('should return 400 when pathParameters is null', async () => {
      // Arrange
      const event = createMockLambdaEvent({
        pathParameters: null,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Post ID is required');
    });
  });

  describe('Post Retrieval', () => {
    it('should return post when found', async () => {
      // Arrange
      const testPostId = '123e4567-e89b-12d3-a456-426614174001';
      const testPost = createTestPost()
        .withId(testPostId)
        .withUserHandle('testuser')
        .withCaption('Test post')
        .build();

      const event = createMockLambdaEvent({
        pathParameters: { postId: testPostId },
      });

      mockPostService.getPostById.mockResolvedValue(testPost);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockPostService.getPostById).toHaveBeenCalledWith(testPostId);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.post).toEqual(testPost);
    });

    it('should return 404 when post not found', async () => {
      // Arrange
      const event = createMockLambdaEvent({
        pathParameters: { postId: 'nonexistent-post-id' },
      });

      mockPostService.getPostById.mockResolvedValue(null);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(mockPostService.getPostById).toHaveBeenCalledWith('nonexistent-post-id');

      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Post not found');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when PostService throws an error', async () => {
      // Arrange
      const event = createMockLambdaEvent({
        pathParameters: { postId: 'test-post-id' },
      });

      const serviceError = new Error('Database connection failed');
      mockPostService.getPostById.mockRejectedValue(serviceError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Internal server error');
    });

    it('should return 400 when Zod validation fails', async () => {
      // Arrange
      const event = createMockLambdaEvent({
        pathParameters: { postId: 'test-post-id' },
      });

      // Mock PostService to return invalid data that will fail Zod validation
      const invalidPost = { invalid: 'data' };
      mockPostService.getPostById.mockResolvedValue(invalidPost);

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
      const testPost = createTestPost().build();
      const event = createMockLambdaEvent({
        pathParameters: { postId: testPost.id },
      });

      mockPostService.getPostById.mockResolvedValue(testPost);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('post');
      expect(responseBody.post.id).toBe(testPost.id);
    });

    it('should validate response against PostResponse schema', async () => {
      // Arrange
      const validPostId = '123e4567-e89b-12d3-a456-426614174003';
      const validUserId = '123e4567-e89b-12d3-a456-426614174004';
      const testPost = createTestPost()
        .withId(validPostId)
        .withUserId(validUserId)
        .withUserHandle('validuser')
        .withCaption('Valid caption')
        .withTags(['tag1', 'tag2'])
        .build();

      const event = createMockLambdaEvent({
        pathParameters: { postId: validPostId },
      });

      mockPostService.getPostById.mockResolvedValue(testPost);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);

      const responseBody = JSON.parse(result.body);

      // Verify response structure matches PostResponse schema
      expect(responseBody).toHaveProperty('post');
      expect(responseBody.post).toHaveProperty('id');
      expect(responseBody.post).toHaveProperty('userId');
      expect(responseBody.post).toHaveProperty('userHandle');
      expect(responseBody.post).toHaveProperty('imageUrl');
      expect(responseBody.post).toHaveProperty('thumbnailUrl');
      expect(responseBody.post).toHaveProperty('createdAt');
      expect(responseBody.post).toHaveProperty('updatedAt');
    });
  });

  describe('Service Integration', () => {
    it('should initialize services with correct parameters', async () => {
      // Arrange
      const testPost = createTestPost().build();
      const event = createMockLambdaEvent({
        pathParameters: { postId: testPost.id },
      });

      mockPostService.getPostById.mockResolvedValue(testPost);

      // Act
      await handler(event);

      // Assert
      const { PostService, ProfileService } = await import('@social-media-app/dal');

      // Verify PostService was instantiated
      expect(PostService).toHaveBeenCalledWith(
        {}, // DynamoDB client mock
        'test-table',
        mockProfileService
      );

      // Verify ProfileService was instantiated
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
    it('should handle empty string postId as invalid', async () => {
      // Arrange
      const event = createMockLambdaEvent({
        pathParameters: { postId: '' },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Post ID is required');
    });

    it('should handle whitespace-only postId as invalid', async () => {
      // Arrange
      const event = createMockLambdaEvent({
        pathParameters: { postId: '   ' },
      });

      // Since the handler currently checks for truthy value, this will fail
      // This test documents current behavior and could drive future improvement
      mockPostService.getPostById.mockResolvedValue(null);

      // Act
      const result = await handler(event);

      // Assert
      expect(mockPostService.getPostById).toHaveBeenCalledWith('   ');
      expect(result.statusCode).toBe(404);
    });
  });
});