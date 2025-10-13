/**
 * Example Usage of Test Factory Functions
 *
 * This file demonstrates how to use the test factory utilities
 * to simplify integration test setup. These examples show the
 * common patterns used across the test suite.
 *
 * @example-file
 */

import { describe, it, beforeAll } from 'vitest';
import { createLocalStackHttpClient } from './http-client.js';
import {
  createTestUser,
  createTestPost,
  createTestUsers,
  createTestPosts,
  type TestUser,
  type TestPost
} from './test-factories.js';

describe('Test Factory Examples', () => {
  const httpClient = createLocalStackHttpClient();

  /**
   * Example 1: Single User Creation
   */
  it('should create a single test user', async () => {
    const user = await createTestUser(httpClient, {
      prefix: 'example-test'
    });

    // user.token - JWT for authentication
    // user.userId - User's unique ID
    // user.email - example-test-user-abc123@tamafriends.local
    // user.username - exampletestuser_abc123
  });

  /**
   * Example 2: Multiple Users Creation
   */
  it('should create multiple test users in parallel', async () => {
    const [user1, user2, user3] = await createTestUsers(httpClient, {
      prefix: 'multi-user',
      count: 3
    });

    // All users created in parallel for efficiency
    // Each has unique ID suffix
  });

  /**
   * Example 3: Create Post Without Waiting for Streams
   */
  it('should create a post without waiting', async () => {
    const user = await createTestUser(httpClient);

    const { postId, post } = await createTestPost(httpClient, user.token, {
      caption: 'Quick test post',
      tags: ['test', 'example']
    });

    // Post created immediately
    // Note: likesCount and commentsCount will be 0 until streams process
  });

  /**
   * Example 4: Create Post and Wait for Stream Processing
   */
  it('should create a post and wait for streams', async () => {
    const user = await createTestUser(httpClient);

    const { postId, post } = await createTestPost(httpClient, user.token, {
      caption: 'Test post with stream wait',
      waitForStreams: true
    });

    // Waited 3 seconds for DynamoDB Streams to process
    // Counts should be updated by stream processors
  });

  /**
   * Example 5: Create Multiple Posts
   */
  it('should create multiple posts for a user', async () => {
    const user = await createTestUser(httpClient);

    const posts = await createTestPosts(httpClient, user.token, 5, {
      waitForStreams: true
    });

    // 5 posts created in parallel, each with caption "Test post N"
  });

  /**
   * Example 6: Complex Setup for Like Testing
   */
  describe('Likes Workflow Setup Example', () => {
    let user1: TestUser;
    let user2: TestUser;
    let testPost: TestPost;

    beforeAll(async () => {
      // Create two users for like testing
      [user1, user2] = await createTestUsers(httpClient, {
        prefix: 'likes-test',
        count: 2
      });

      // Create a post to be liked
      testPost = await createTestPost(httpClient, user1.token, {
        caption: 'Post for likes testing',
        waitForStreams: true
      });
    });

    it('should have all test data ready', async () => {
      // user1, user2, and testPost are ready for testing
      // Can now proceed with like/unlike operations
    });
  });

  /**
   * Example 7: Complex Setup for Comments Testing
   */
  describe('Comments Workflow Setup Example', () => {
    let postOwner: TestUser;
    let commenter1: TestUser;
    let commenter2: TestUser;
    let testPostId: string;

    beforeAll(async () => {
      // Create three users in parallel
      [postOwner, commenter1, commenter2] = await createTestUsers(httpClient, {
        prefix: 'comments-test',
        count: 3
      });

      // Create post for commenting
      const post = await createTestPost(httpClient, postOwner.token, {
        caption: 'Post for comments testing',
        tags: ['test', 'comments'],
        waitForStreams: true
      });
      testPostId = post.postId;
    });

    it('should have all test data ready', async () => {
      // All users and post ready for comment testing
    });
  });

  /**
   * Example 8: Custom User Configuration
   */
  it('should create user with custom email and username', async () => {
    const user = await createTestUser(httpClient, {
      email: 'custom@example.com',
      username: 'customuser',
      password: 'CustomPassword123!'
    });

    // User created with exact email and username specified
  });

  /**
   * Example 9: Private Post Creation
   */
  it('should create a private post', async () => {
    const user = await createTestUser(httpClient);

    const { post } = await createTestPost(httpClient, user.token, {
      caption: 'This is a private post',
      isPublic: false
    });

    // post.isPublic === false
  });

  /**
   * Example 10: Feed Testing Setup with Multiple Posts
   */
  describe('Feed Workflow Setup Example', () => {
    let user1: TestUser;
    let user2: TestUser;
    let user1Posts: TestPost[];
    let user2Posts: TestPost[];

    beforeAll(async () => {
      // Create two users
      [user1, user2] = await createTestUsers(httpClient, {
        prefix: 'feed-test',
        count: 2
      });

      // Create 3 posts for each user in parallel
      [user1Posts, user2Posts] = await Promise.all([
        createTestPosts(httpClient, user1.token, 3, {
          waitForStreams: true
        }),
        createTestPosts(httpClient, user2.token, 3, {
          waitForStreams: true
        })
      ]);
    });

    it('should have feed test data ready', async () => {
      // 6 total posts across 2 users ready for feed testing
    });
  });
});
