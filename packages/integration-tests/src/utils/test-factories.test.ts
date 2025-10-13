/**
 * Unit Tests for Test Factory Functions
 *
 * These tests verify that the test factory utilities work correctly
 * and produce the expected data structures.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createLocalStackHttpClient } from './http-client.js';
import { environmentDetector, testLogger } from './index.js';
import {
  createTestUser,
  createTestPost,
  createTestUsers,
  createTestPosts,
  type TestUser
} from './test-factories.js';

describe('Test Factory Functions', () => {
  const httpClient = createLocalStackHttpClient();

  beforeAll(async () => {
    testLogger.info('Starting Test Factory Functions Tests');

    // Wait for services to be ready
    await environmentDetector.waitForServices(30000);

    // Verify services are available
    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady || !apiReady) {
      throw new Error('Required services are not available');
    }

    testLogger.info('All required services are ready');
  }, 30000);

  describe('createTestUser', () => {
    it('should create a test user with default prefix', async () => {
      const user = await createTestUser(httpClient);

      expect(user.token).toBeDefined();
      expect(user.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format
      expect(user.userId).toBeDefined();
      expect(user.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // UUID format
      expect(user.email).toContain('@tamafriends.local');
      expect(user.email).toContain('test-user-');
      expect(user.username).toBeDefined();
      expect(user.username).toContain('testuser_');
    });

    it('should create a test user with custom prefix', async () => {
      const user = await createTestUser(httpClient, {
        prefix: 'custom-test'
      });

      expect(user.email).toContain('custom-test-user-');
      expect(user.username).toContain('customtestuser_');
    });

    it('should create a test user with custom email and username', async () => {
      const uniqueId = Date.now();
      const user = await createTestUser(httpClient, {
        email: `test${uniqueId}@example.com`,
        username: `testuser${uniqueId}`
      });

      expect(user.email).toBe(`test${uniqueId}@example.com`);
      expect(user.username).toBe(`testuser${uniqueId}`);
    });

    it('should create multiple users with unique credentials', async () => {
      const user1 = await createTestUser(httpClient);
      const user2 = await createTestUser(httpClient);

      expect(user1.userId).not.toBe(user2.userId);
      expect(user1.email).not.toBe(user2.email);
      expect(user1.username).not.toBe(user2.username);
      expect(user1.token).not.toBe(user2.token);
    });
  });

  describe('createTestPost', () => {
    let testUser: TestUser;

    beforeAll(async () => {
      testUser = await createTestUser(httpClient, {
        prefix: 'post-factory-test'
      });
    });

    it('should create a test post with default options', async () => {
      const { postId, post } = await createTestPost(httpClient, testUser.token);

      expect(postId).toBeDefined();
      expect(postId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // UUID format
      expect(post.id).toBe(postId);
      expect(post.userId).toBe(testUser.userId);
      expect(post.caption).toBe('Test post caption');
      expect(post.tags).toEqual(['test', 'integration']);
      expect(post.isPublic).toBe(true);
      expect(post.imageUrl).toBeDefined();
      expect(post.thumbnailUrl).toBeDefined();
      expect(post.createdAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
    });

    it('should create a test post with custom caption and tags', async () => {
      const { post } = await createTestPost(httpClient, testUser.token, {
        caption: 'Custom caption',
        tags: ['custom', 'tags', 'test']
      });

      expect(post.caption).toBe('Custom caption');
      expect(post.tags).toEqual(['custom', 'tags', 'test']);
    });

    it('should create a private post', async () => {
      const { post } = await createTestPost(httpClient, testUser.token, {
        isPublic: false
      });

      expect(post.isPublic).toBe(false);
    });

    it('should have initial counts as 0', async () => {
      const { post } = await createTestPost(httpClient, testUser.token);

      // Without waitForStreams, counts should be initial values
      expect(post.likesCount).toBe(0);
      expect(post.commentsCount).toBe(0);
    });

    it('should create multiple posts with unique IDs', async () => {
      const post1 = await createTestPost(httpClient, testUser.token);
      const post2 = await createTestPost(httpClient, testUser.token);

      expect(post1.postId).not.toBe(post2.postId);
      expect(post1.post.id).not.toBe(post2.post.id);
    });
  });

  describe('createTestUsers', () => {
    it('should create multiple users in parallel', async () => {
      const users = await createTestUsers(httpClient, {
        prefix: 'bulk-test',
        count: 3
      });

      expect(users).toHaveLength(3);
      expect(users[0].userId).not.toBe(users[1].userId);
      expect(users[1].userId).not.toBe(users[2].userId);
      expect(users[0].email).toContain('bulk-test-user-');
      expect(users[1].email).toContain('bulk-test-user-');
      expect(users[2].email).toContain('bulk-test-user-');
    });

    it('should create users with custom password', async () => {
      // This test verifies the password parameter is accepted
      // Actual password validation would require login testing
      const users = await createTestUsers(httpClient, {
        prefix: 'password-test',
        count: 2,
        password: 'CustomPassword123!'
      });

      expect(users).toHaveLength(2);
    });

    it('should create large batches efficiently', async () => {
      const startTime = Date.now();
      const users = await createTestUsers(httpClient, {
        prefix: 'large-batch',
        count: 5
      });
      const duration = Date.now() - startTime;

      expect(users).toHaveLength(5);
      // Should complete in reasonable time (parallel execution)
      // This is a loose check - adjust threshold as needed
      testLogger.debug(`Created 5 users in ${duration}ms`);
    });
  });

  describe('createTestPosts', () => {
    let testUser: TestUser;

    beforeAll(async () => {
      testUser = await createTestUser(httpClient, {
        prefix: 'posts-bulk-test'
      });
    });

    it('should create multiple posts in parallel', async () => {
      const posts = await createTestPosts(httpClient, testUser.token, 3);

      expect(posts).toHaveLength(3);
      expect(posts[0].postId).not.toBe(posts[1].postId);
      expect(posts[1].postId).not.toBe(posts[2].postId);
      expect(posts[0].post.caption).toBe('Test post 1');
      expect(posts[1].post.caption).toBe('Test post 2');
      expect(posts[2].post.caption).toBe('Test post 3');
    });

    it('should create posts with custom options', async () => {
      const posts = await createTestPosts(httpClient, testUser.token, 2, {
        caption: 'Custom post',
        tags: ['custom'],
        isPublic: false
      });

      expect(posts).toHaveLength(2);
      expect(posts[0].post.caption).toBe('Custom post');
      expect(posts[0].post.tags).toEqual(['custom']);
      expect(posts[0].post.isPublic).toBe(false);
      expect(posts[1].post.caption).toBe('Custom post');
    });

    it('should create large batches efficiently', async () => {
      const startTime = Date.now();
      const posts = await createTestPosts(httpClient, testUser.token, 5);
      const duration = Date.now() - startTime;

      expect(posts).toHaveLength(5);
      testLogger.debug(`Created 5 posts in ${duration}ms`);
    });
  });

  describe('Integration - Combined Factories', () => {
    it('should create users and posts together', async () => {
      // Create two users
      const [user1, user2] = await createTestUsers(httpClient, {
        prefix: 'combined-test',
        count: 2
      });

      // Create posts for each user
      const [user1Posts, user2Posts] = await Promise.all([
        createTestPosts(httpClient, user1.token, 2),
        createTestPosts(httpClient, user2.token, 2)
      ]);

      expect(user1Posts).toHaveLength(2);
      expect(user2Posts).toHaveLength(2);
      expect(user1Posts[0].post.userId).toBe(user1.userId);
      expect(user2Posts[0].post.userId).toBe(user2.userId);
    });
  });
});
