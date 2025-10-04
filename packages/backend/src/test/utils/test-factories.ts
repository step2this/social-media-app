/**
 * Test data factories for creating test entities
 * Following the Test Data Builder pattern for clean, fluent test setup
 */

import { vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { Post } from '@social-media-app/shared';
import { randomUUID } from 'crypto';

/**
 * Creates a mock Lambda event for testing handlers
 */
export function createMockLambdaEvent(overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'GET /test',
    rawPath: '/test',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent',
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'GET',
        path: '/test',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /test',
      stage: '$default',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    isBase64Encoded: false,
    ...overrides,
  };
}

/**
 * Test Post factory using the Builder pattern
 */
export class PostTestBuilder {
  private post: Partial<Post> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    userHandle: 'testuser',
    imageUrl: 'https://test.example.com/image.jpg',
    thumbnailUrl: 'https://test.example.com/thumb.jpg',
    caption: 'Test post caption',
    tags: ['test', 'example'],
    likesCount: 0,
    commentsCount: 0,
    isPublic: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  withId(id: string): PostTestBuilder {
    this.post.id = id;
    return this;
  }

  withUserId(userId: string): PostTestBuilder {
    this.post.userId = userId;
    return this;
  }

  withUserHandle(userHandle: string): PostTestBuilder {
    this.post.userHandle = userHandle;
    return this;
  }

  withCaption(caption: string): PostTestBuilder {
    this.post.caption = caption;
    return this;
  }

  withTags(tags: string[]): PostTestBuilder {
    this.post.tags = tags;
    return this;
  }

  withLikes(count: number): PostTestBuilder {
    this.post.likesCount = count;
    return this;
  }

  withComments(count: number): PostTestBuilder {
    this.post.commentsCount = count;
    return this;
  }

  asPrivate(): PostTestBuilder {
    this.post.isPublic = false;
    return this;
  }

  asPublic(): PostTestBuilder {
    this.post.isPublic = true;
    return this;
  }

  build(): Post {
    return this.post as Post;
  }
}

/**
 * Creates a PostTestBuilder instance
 */
export function createTestPost(): PostTestBuilder {
  return new PostTestBuilder();
}

/**
 * Mock service factory
 */
export function createMockPostService() {
  return {
    getPostById: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn(),
    getUserPosts: vi.fn(),
  };
}

export function createMockProfileService() {
  return {
    getProfileByHandle: vi.fn(),
    getProfileByUserId: vi.fn(),
    updateProfile: vi.fn(),
    getUploadUrl: vi.fn(),
  };
}

/**
 * Mock AWS clients
 */
export function createMockDynamoDBClient() {
  return {
    send: vi.fn(),
  };
}

export function createMockS3Client() {
  return {
    send: vi.fn(),
  };
}

/**
 * Creates a test environment setup
 */
export function setupTestEnvironment() {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TABLE_NAME = 'test-table';
  process.env.BUCKET_NAME = 'test-bucket';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

  return {
    cleanup: () => {
      // Reset mocks and cleanup
      vi.clearAllMocks();
    }
  };
}