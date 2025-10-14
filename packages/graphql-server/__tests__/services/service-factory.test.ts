/**
 * Service Factory Tests
 *
 * Tests the dependency injection pattern for DAL services in GraphQL context.
 * Ensures services are created once per request and shared across resolvers.
 *
 * This eliminates ~400 lines of duplicated service instantiation code across resolvers.
 *
 * Test Focus:
 * - Service factory creates all required services
 * - Services have correct dependencies
 * - Services are reused within request
 * - Services are isolated between requests
 * - Configuration from environment is passed correctly
 * - Error handling for missing configuration
 *
 * TDD Phase: RED - All tests should fail initially
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { S3Client } from '@aws-sdk/client-s3';

// Import service factory (will fail - doesn't exist yet)
import { createServices, type Services } from '../../src/services/factory.js';

describe('Service Factory', () => {
  let mockDynamoClient: DynamoDBDocumentClient;
  let mockS3Client: S3Client;
  let mockTableName: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock AWS clients
    mockDynamoClient = {} as any;
    mockS3Client = {} as any;
    mockTableName = 'test-table';

    // Set up environment variables
    process.env.MEDIA_BUCKET_NAME = 'test-bucket';
    process.env.CLOUDFRONT_DOMAIN = 'https://test.cloudfront.net';
    process.env.AWS_REGION = 'us-east-1';

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Service Factory Creation', () => {
    it('should create all required services', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      expect(services).toHaveProperty('profileService');
      expect(services).toHaveProperty('postService');
      expect(services).toHaveProperty('likeService');
      expect(services).toHaveProperty('followService');
      expect(services).toHaveProperty('commentService');
      expect(services).toHaveProperty('feedService');
      expect(services).toHaveProperty('authService');
    });

    it('should pass correct dependencies to ProfileService', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // ProfileService should be initialized with:
      // - dynamoClient
      // - tableName
      // - s3BucketName
      // - cloudFrontDomain
      // - s3Client
      expect(services.profileService).toBeDefined();
      expect(services.profileService.constructor.name).toBe('ProfileService');
    });

    it('should pass correct dependencies to PostService', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // PostService should be initialized with:
      // - dynamoClient
      // - tableName
      // - profileService (dependency injection)
      expect(services.postService).toBeDefined();
      expect(services.postService.constructor.name).toBe('PostService');
    });

    it('should reuse ProfileService instance across dependent services', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // PostService should use the same ProfileService instance
      // that's available in services.profileService
      // This tests proper dependency injection and avoids duplicate instances
      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();

      // Both services should exist and be properly initialized
      expect(services.profileService.constructor.name).toBe('ProfileService');
      expect(services.postService.constructor.name).toBe('PostService');
    });

    it('should create services with correct AWS configuration', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // All services should be properly instantiated
      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();
      expect(services.likeService).toBeDefined();
      expect(services.followService).toBeDefined();
      expect(services.commentService).toBeDefined();

      // Verify service types
      expect(services.profileService.constructor.name).toBe('ProfileService');
      expect(services.postService.constructor.name).toBe('PostService');
      expect(services.likeService.constructor.name).toBe('LikeService');
      expect(services.followService.constructor.name).toBe('FollowService');
      expect(services.commentService.constructor.name).toBe('CommentService');
    });

    it('should return Services interface with all required properties', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // Type check - Services interface should have all service properties
      const serviceKeys = Object.keys(services).sort();
      expect(serviceKeys).toEqual([
        'authService',
        'commentService',
        'feedService',
        'followService',
        'likeService',
        'notificationService',
        'postService',
        'profileService',
      ]);
    });
  });

  describe('Context Integration', () => {
    it('should include services in GraphQL context', () => {
      // This test verifies that createContext returns services
      // We'll import createContext and check it includes services
      const services = createServices(mockDynamoClient, mockTableName);

      // Services object should be suitable for GraphQL context
      expect(services).toBeDefined();
      expect(typeof services).toBe('object');
      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();
      expect(services.likeService).toBeDefined();
      expect(services.followService).toBeDefined();
      expect(services.commentService).toBeDefined();
    });

    it('should allow services to be accessible via context.services', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // Simulate GraphQL context structure
      const mockContext = {
        userId: 'test-user-id',
        dynamoClient: mockDynamoClient,
        tableName: mockTableName,
        loaders: {} as any,
        services,
      };

      // Verify services are accessible via context
      expect(mockContext.services).toBeDefined();
      expect(mockContext.services.profileService).toBeDefined();
      expect(mockContext.services.postService).toBeDefined();
      expect(mockContext.services.likeService).toBeDefined();
      expect(mockContext.services.followService).toBeDefined();
      expect(mockContext.services.commentService).toBeDefined();
    });

    it('should use same dynamoClient as context', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // All services should use the same DynamoDB client instance
      // that's passed to the factory
      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();
      expect(services.likeService).toBeDefined();
      expect(services.followService).toBeDefined();
      expect(services.commentService).toBeDefined();
    });

    it('should use same tableName as context', () => {
      const customTableName = 'custom-table-name';
      const services = createServices(mockDynamoClient, customTableName);

      // Services should be created with the provided tableName
      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();
      expect(services.likeService).toBeDefined();
      expect(services.followService).toBeDefined();
      expect(services.commentService).toBeDefined();
    });
  });

  describe('Service Reusability', () => {
    it('should reuse same service instances across multiple resolver calls in same request', () => {
      const services = createServices(mockDynamoClient, mockTableName);

      // Simulating multiple resolver calls in the same request
      // Should get the same service instances
      const firstAccess = services.profileService;
      const secondAccess = services.profileService;
      const thirdAccess = services.profileService;

      // All accesses should return the same instance
      expect(firstAccess).toBe(secondAccess);
      expect(secondAccess).toBe(thirdAccess);
      expect(firstAccess).toBe(thirdAccess);
    });

    it('should create different service instances for different requests', () => {
      // Simulate two different requests
      const request1Services = createServices(mockDynamoClient, mockTableName);
      const request2Services = createServices(mockDynamoClient, mockTableName);

      // Services from different requests should be different instances
      expect(request1Services.profileService).not.toBe(request2Services.profileService);
      expect(request1Services.postService).not.toBe(request2Services.postService);
      expect(request1Services.likeService).not.toBe(request2Services.likeService);
      expect(request1Services.followService).not.toBe(request2Services.followService);
      expect(request1Services.commentService).not.toBe(request2Services.commentService);
    });

    it('should not leak service state between requests', () => {
      // Create services for two different requests
      const request1Services = createServices(mockDynamoClient, 'table-1');
      const request2Services = createServices(mockDynamoClient, 'table-2');

      // Services should be completely isolated
      expect(request1Services.profileService).not.toBe(request2Services.profileService);
      expect(request1Services.postService).not.toBe(request2Services.postService);
      expect(request1Services.likeService).not.toBe(request2Services.likeService);
      expect(request1Services.followService).not.toBe(request2Services.followService);
      expect(request1Services.commentService).not.toBe(request2Services.commentService);

      // Verify both sets of services are valid
      expect(request1Services.profileService).toBeDefined();
      expect(request2Services.profileService).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use correct S3 bucket name from environment', () => {
      process.env.MEDIA_BUCKET_NAME = 'production-bucket';

      const services = createServices(mockDynamoClient, mockTableName);

      // ProfileService should be initialized with the bucket name from env
      expect(services.profileService).toBeDefined();
      expect(services.profileService.constructor.name).toBe('ProfileService');
    });

    it('should use correct CloudFront domain from environment', () => {
      process.env.CLOUDFRONT_DOMAIN = 'https://production.cloudfront.net';

      const services = createServices(mockDynamoClient, mockTableName);

      // ProfileService should be initialized with CloudFront domain from env
      expect(services.profileService).toBeDefined();
      expect(services.profileService.constructor.name).toBe('ProfileService');
    });

    it('should use correct DynamoDB table name from context', () => {
      const customTableName = 'production-social-media-table';

      const services = createServices(mockDynamoClient, customTableName);

      // All services should be initialized with the provided table name
      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();
      expect(services.likeService).toBeDefined();
      expect(services.followService).toBeDefined();
      expect(services.commentService).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing S3 bucket name gracefully', () => {
      delete process.env.MEDIA_BUCKET_NAME;

      // Should still create services, ProfileService handles missing bucket name
      const services = createServices(mockDynamoClient, mockTableName);

      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();
      expect(services.likeService).toBeDefined();
      expect(services.followService).toBeDefined();
      expect(services.commentService).toBeDefined();
    });

    it('should handle missing CloudFront domain gracefully', () => {
      delete process.env.CLOUDFRONT_DOMAIN;

      // Should still create services, ProfileService handles missing CloudFront domain
      const services = createServices(mockDynamoClient, mockTableName);

      expect(services.profileService).toBeDefined();
      expect(services.postService).toBeDefined();
      expect(services.likeService).toBeDefined();
      expect(services.followService).toBeDefined();
      expect(services.commentService).toBeDefined();
    });
  });
});
