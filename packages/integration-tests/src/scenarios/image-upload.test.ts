/**
 * LocalStack Image Upload Integration Test
 *
 * This test demonstrates the complete image upload workflow:
 * 1. User authentication
 * 2. Getting presigned URL for image upload
 * 3. Creating a post with the image
 * 4. Verifying LocalStack URLs are correctly generated
 *
 * This serves as a template for other integration tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  GetPresignedUrlResponseSchema,
  CreatePostResponseSchema,
  LoginResponseSchema,
  type GetPresignedUrlResponse,
  type CreatePostResponse,
  type LoginResponse
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  testEnvironment,
  environmentDetector,
  testLogger
} from '../utils/index.js';
import {
  createLoginRequest,
  createRegisterRequest,
  createPresignedUrlRequest,
  createPostRequest,
  TestCredentials
} from '../fixtures/index.js';

describe('LocalStack Image Upload Integration', () => {
  const httpClient = createLocalStackHttpClient();
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    testLogger.info('Starting LocalStack Image Upload Integration Tests');

    // Wait for services to be ready
    await environmentDetector.waitForServices(30000);

    // Verify environment configuration
    const serviceUrls = environmentDetector.getServiceUrls();
    testLogger.debug('Service URLs:', serviceUrls);

    // Verify LocalStack is available
    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady) {
      throw new Error('LocalStack is not available. Please start LocalStack before running integration tests.');
    }

    if (!apiReady) {
      throw new Error('API server is not available. Please start the backend server before running integration tests.');
    }

    testLogger.info('All required services are ready');

    // Register test user if needed
    try {
      const registerRequest = createRegisterRequest()
        .withEmail(TestCredentials.localstackUser.email)
        .withPassword(TestCredentials.localstackUser.password)
        .withUsername('localstacktest')
        .build();

      await httpClient.post('/auth/register', registerRequest);
      testLogger.info('Test user registered successfully');
    } catch (error: any) {
      // User might already exist - that's fine
      if (error.status === 400 || error.status === 409) {
        testLogger.debug('Test user already exists - continuing');
      } else {
        // Log but don't fail - user might exist from previous test run
        testLogger.warn('Could not register test user:', error.message);
      }
    }
  }, 30000);

  beforeEach(async () => {
    testLogger.debug('Setting up test with fresh authentication');

    // Login with test user credentials
    const loginRequest = createLoginRequest()
      .withEmail(TestCredentials.localstackUser.email)
      .withPassword(TestCredentials.localstackUser.password)
      .build();

    testLogger.debug('Attempting login with:', { email: loginRequest.email });

    const loginResponse = await httpClient.post<LoginResponse>('/auth/login', loginRequest);
    const loginData = await parseResponse(loginResponse, LoginResponseSchema);

    authToken = loginData.tokens.accessToken;
    userId = loginData.user.id;

    // Set auth token for subsequent requests
    httpClient.setAuthToken(authToken);

    testLogger.debug('Authentication successful', { userId, tokenLength: authToken.length });
  });

  afterAll(() => {
    testLogger.info('LocalStack Image Upload Integration Tests completed');
  });

  describe('Presigned URL Generation', () => {
    it('should generate LocalStack presigned URLs for post images', async () => {
      // Arrange
      const urlRequest = createPresignedUrlRequest()
        .forPostImage()
        .withFileType('image/jpeg')
        .build();

      testLogger.debug('Requesting presigned URL for post image');

      // Act
      const response = await httpClient.post<GetPresignedUrlResponse>('/profile/upload-url', urlRequest);
      const urlData = await parseResponse(response, GetPresignedUrlResponseSchema);

      // Assert
      testLogger.debug('Presigned URL response:', urlData);

      // Verify URLs point to LocalStack
      expect(urlData.uploadUrl).toMatch(/^http:\/\/localhost:4566/);
      expect(urlData.publicUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);
      expect(urlData.thumbnailUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);

      // Verify URL structure for posts
      expect(urlData.publicUrl).toMatch(/\/users\/[^\/]+\/posts\/[^\/]+\.jpeg$/);
      expect(urlData.thumbnailUrl).toMatch(/\/users\/[^\/]+\/posts\/[^\/]+_thumb\.jpeg$/);

      // Verify expiration
      expect(urlData.expiresIn).toBe(3600);

      testLogger.info('✅ LocalStack presigned URLs generated correctly');
    });

    it('should generate LocalStack presigned URLs for profile pictures', async () => {
      // Arrange
      const urlRequest = createPresignedUrlRequest()
        .forProfilePicture()
        .withFileType('image/jpeg')
        .build();

      testLogger.debug('Requesting presigned URL for profile picture');

      // Act
      const response = await httpClient.post<GetPresignedUrlResponse>('/profile/upload-url', urlRequest);
      const urlData = await parseResponse(response, GetPresignedUrlResponseSchema);

      // Assert
      testLogger.debug('Profile picture presigned URL response:', urlData);

      // Verify URLs point to LocalStack
      expect(urlData.uploadUrl).toMatch(/^http:\/\/localhost:4566/);
      expect(urlData.publicUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);
      expect(urlData.thumbnailUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);

      // Verify URL structure for profile pictures
      expect(urlData.publicUrl).toMatch(/\/users\/[^\/]+\/profile\/[^\/]+\.jpeg$/);
      expect(urlData.thumbnailUrl).toMatch(/\/users\/[^\/]+\/profile\/[^\/]+_thumb\.jpeg$/);

      testLogger.info('✅ LocalStack profile picture URLs generated correctly');
    });
  });

  describe('Post Creation with LocalStack Images', () => {
    it('should create post with LocalStack image URLs', async () => {
      // Arrange: Get presigned URLs first
      const urlRequest = createPresignedUrlRequest()
        .forPostImage()
        .withFileType('image/jpeg')
        .build();

      const urlResponse = await httpClient.post<GetPresignedUrlResponse>('/profile/upload-url', urlRequest);
      await parseResponse(urlResponse, GetPresignedUrlResponseSchema);

      // Create post request with file type for image upload
      const postRequest = createPostRequest()
        .withFileType('image/jpeg')
        .withCaption('Integration test post with LocalStack image')
        .withTags(['integration', 'localstack', 'test'])
        .asPublic()
        .build();

      testLogger.debug('Creating post with file type:', {
        fileType: postRequest.fileType,
        caption: postRequest.caption
      });

      // Act
      const postResponse = await httpClient.post<CreatePostResponse>('/posts', postRequest);
      const postData = await parseResponse(postResponse, CreatePostResponseSchema);

      // Assert
      testLogger.debug('Post created:', postData);

      // Verify post was created successfully
      expect(postData.post.id).toBeDefined();
      expect(postData.post.userId).toBe(userId);
      expect(postData.post.caption).toBe('Integration test post with LocalStack image');
      expect(postData.post.tags).toEqual(['integration', 'localstack', 'test']);
      expect(postData.post.isPublic).toBe(true);

      // Verify image URLs are LocalStack URLs (these should be generated by backend)
      expect(postData.post.imageUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);
      expect(postData.post.thumbnailUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);

      // Verify URL structure
      expect(postData.post.imageUrl).toMatch(/\/users\/[^\/]+\/posts\/[^\/]+\.jpeg$/);
      expect(postData.post.thumbnailUrl).toMatch(/\/users\/[^\/]+\/posts\/[^\/]+_thumb\.jpeg$/);

      // Verify counters
      expect(postData.post.likesCount).toBe(0);
      expect(postData.post.commentsCount).toBe(0);

      // Verify timestamps
      expect(postData.post.createdAt).toBeDefined();
      expect(postData.post.updatedAt).toBeDefined();

      testLogger.info('✅ Post created successfully with LocalStack image URLs');
    });

    it('should maintain LocalStack URLs in post retrieval', async () => {
      // Arrange: Create a post first
      const urlRequest = createPresignedUrlRequest()
        .forPostImage()
        .withFileType('image/jpeg')
        .build();

      const urlResponse = await httpClient.post<GetPresignedUrlResponse>('/profile/upload-url', urlRequest);
      await parseResponse(urlResponse, GetPresignedUrlResponseSchema);

      const postRequest = createPostRequest()
        .withFileType('image/jpeg')
        .withCaption('Test post for retrieval')
        .build();

      const createResponse = await httpClient.post<CreatePostResponse>('/posts', postRequest);
      const createData = await parseResponse(createResponse, CreatePostResponseSchema);
      const postId = createData.post.id;

      testLogger.debug('Created post for retrieval test:', { postId });

      // Act: Retrieve the post
      const getResponse = await httpClient.get(`/posts/${postId}`);
      expect(getResponse.status).toBe(200);

      // Assert: Verify LocalStack URLs are maintained
      // Type assertion for response data structure
      const retrievedPost = (getResponse.data as { post: { imageUrl?: string; thumbnailUrl?: string } }).post;

      expect(retrievedPost.imageUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);
      expect(retrievedPost.thumbnailUrl).toMatch(/^http:\/\/localhost:4566\/tamafriends-media-local/);

      // Verify URLs are properly assigned by backend (post creation request doesn't include URLs)
      expect(retrievedPost.imageUrl).toBeDefined();
      expect(retrievedPost.thumbnailUrl).toBeDefined();

      testLogger.info('✅ LocalStack URLs maintained correctly in post retrieval');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file types gracefully', async () => {
      // Arrange: Manually create request with invalid file type to test error handling
      const invalidRequest = {
        fileType: 'application/exe' as any, // Type assertion needed to test invalid input
        purpose: 'post-image'
      };

      testLogger.debug('Testing invalid file type handling');

      // Act & Assert
      try {
        await httpClient.post('/profile/upload-url', invalidRequest);
        expect.fail('Should have thrown an error for invalid file type');
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        testLogger.info('✅ Invalid file type properly rejected');
      }
    });

    it('should handle unauthenticated requests', async () => {
      // Arrange: Clear auth token
      httpClient.clearAuthToken();

      const urlRequest = createPresignedUrlRequest()
        .forPostImage()
        .build();

      testLogger.debug('Testing unauthenticated request handling');

      // Act & Assert
      try {
        await httpClient.post('/profile/upload-url', urlRequest);
        expect.fail('Should have thrown an error for unauthenticated request');
      } catch (error: any) {
        expect(error.status).toBe(401);
        testLogger.info('✅ Unauthenticated request properly rejected');
      }

      // Restore auth token for other tests
      httpClient.setAuthToken(authToken);
    });
  });
}, testEnvironment.testTimeout);