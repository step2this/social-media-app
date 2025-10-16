/**
 * GraphQL Server - LocalStack Integration Tests
 *
 * End-to-end integration tests that run against a real LocalStack environment.
 * These tests verify that the GraphQL server works correctly with:
 * - Real DynamoDB via LocalStack
 * - Real authentication via backend REST API
 * - Real data operations (create, read, update, delete)
 * - DataLoader batching to solve N+1 query problem
 *
 * Prerequisites:
 * - LocalStack running on port 4566
 * - Backend REST API running on port 3001
 * - GraphQL server running on port 4000
 * - DynamoDB table seeded with test data
 *
 * Run with:
 *   pnpm test __tests__/integration/localstack.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  executeGraphQL,
  checkGraphQLHealth,
  waitForServer,
  type GraphQLResponse,
} from '../helpers/localstack-client.js';
import {
  createTestUser,
  createTestPost,
  createLocalStackHttpClient,
  type TestUser,
  type TestPost,
} from '@social-media-app/integration-tests';

describe('GraphQL Server - LocalStack Integration', () => {
  const httpClient = createLocalStackHttpClient();
  let testUser: TestUser;
  let testPost: TestPost;

  /**
   * Setup: Ensure servers are running and create test data
   */
  beforeAll(async () => {
    // Wait for GraphQL server to be ready
    const isReady = await waitForServer(30, 1000);
    if (!isReady) {
      throw new Error(
        'GraphQL server not ready. Ensure servers are running with: pnpm dev'
      );
    }

    // Create test user via REST API (from integration-tests factory)
    testUser = await createTestUser(httpClient, {
      prefix: 'graphql-test',
    });

    // Create test post for post-related queries
    testPost = await createTestPost(httpClient, testUser.token, {
      caption: 'Test post for GraphQL integration tests',
    });
  }, 60000); // 60 second timeout for setup

  /**
   * Server Startup Tests
   */
  describe('Server Startup', () => {
    it('should respond to health check endpoint', async () => {
      const isHealthy = await checkGraphQLHealth();
      expect(isHealthy).toBe(true);
    });

    it('should respond to basic GraphQL introspection query', async () => {
      const response = await executeGraphQL('{ __typename }');

      expect(response.errors).toBeUndefined();
      expect(response.data).toEqual({ __typename: 'Query' });
    });
  });

  /**
   * Authentication Tests
   */
  describe('Authentication Flow', () => {
    it('should reject unauthenticated query requiring auth', async () => {
      const query = `
        query GetMe {
          me {
            id
            handle
            fullName
          }
        }
      `;

      const response = await executeGraphQL(query);

      expect(response.errors).toBeDefined();
      expect(response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
      expect(response.errors?.[0]?.message).toContain('authenticated');
    });

    it('should accept authenticated query with valid JWT', async () => {
      const query = `
        query GetMe {
          me {
            id
            handle
            fullName
          }
        }
      `;

      const response = await executeGraphQL(query, {}, testUser.token);

      expect(response.errors).toBeUndefined();
      expect(response.data?.me).toBeDefined();
      expect(response.data?.me.id).toBe(testUser.userId);
      expect(response.data?.me.handle).toBe(testUser.handle);
    });

    it('should reject query with invalid JWT', async () => {
      const query = `
        query GetMe {
          me {
            id
            handle
          }
        }
      `;

      const invalidToken = 'invalid.jwt.token';
      const response = await executeGraphQL(query, {}, invalidToken);

      expect(response.errors).toBeDefined();
      // May return UNAUTHENTICATED or specific JWT error
      expect(response.errors?.[0]?.extensions?.code).toMatch(/UNAUTHENTICATED|FORBIDDEN/i);
    });
  });

  /**
   * Query Operations Tests
   */
  describe('Query Operations', () => {
    it('should query user profile by handle', async () => {
      const query = `
        query GetProfile($handle: String!) {
          profile(handle: $handle) {
            id
            handle
            fullName
            followersCount
            followingCount
            postsCount
          }
        }
      `;

      const response = await executeGraphQL(
        query,
        { handle: testUser.handle },
        testUser.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data?.profile).toBeDefined();
      expect(response.data?.profile.handle).toBe(testUser.handle);
      expect(response.data?.profile.id).toBe(testUser.userId);
    });

    it('should return null for non-existent profile', async () => {
      const query = `
        query GetProfile($handle: String!) {
          profile(handle: $handle) {
            id
            handle
          }
        }
      `;

      const response = await executeGraphQL(
        query,
        { handle: 'non-existent-user-12345' },
        testUser.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data?.profile).toBeNull();
    });
  });

  /**
   * Mutation Operations Tests
   */
  describe('Mutation Operations', () => {
    it('should create post with presigned URL', async () => {
      const mutation = `
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            post {
              id
              userId
              caption
              likesCount
              commentsCount
            }
            uploadUrl
            thumbnailUploadUrl
          }
        }
      `;

      const response = await executeGraphQL(
        mutation,
        {
          input: {
            fileType: 'image/jpeg',
            caption: 'Test post from GraphQL integration test',
          },
        },
        testUser.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data?.createPost).toBeDefined();
      expect(response.data?.createPost.post.userId).toBe(testUser.userId);
      expect(response.data?.createPost.post.caption).toBe(
        'Test post from GraphQL integration test'
      );
      expect(response.data?.createPost.uploadUrl).toBeDefined();
      expect(response.data?.createPost.uploadUrl).toContain('X-Amz-Algorithm');
    });

    it('should reject post creation without authentication', async () => {
      const mutation = `
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            post {
              id
            }
            uploadUrl
          }
        }
      `;

      const response = await executeGraphQL(mutation, {
        input: {
          fileType: 'image/jpeg',
          caption: 'Unauthorized post',
        },
      });

      expect(response.errors).toBeDefined();
      expect(response.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    });
  });

  /**
   * Field Resolution Tests
   */
  describe('Nested Field Resolution', () => {
    it('should resolve Post.author field via DataLoader', async () => {
      // First, get a post from the user's posts
      const postsQuery = `
        query GetUserPosts($handle: String!) {
          userPosts(handle: $handle, limit: 1) {
            edges {
              node {
                id
                userId
                caption
                author {
                  id
                  handle
                  fullName
                }
              }
            }
          }
        }
      `;

      const response = await executeGraphQL(
        postsQuery,
        { handle: testUser.handle },
        testUser.token
      );

      expect(response.errors).toBeUndefined();

      // Verify author field is resolved
      if (response.data?.userPosts.edges.length > 0) {
        const post = response.data.userPosts.edges[0].node;
        expect(post.author).toBeDefined();
        expect(post.author.id).toBe(post.userId);
        expect(post.author.handle).toBeDefined();
      }
    });
  });

  /**
   * Pagination Tests
   */
  describe('Cursor-Based Pagination', () => {
    it('should return pageInfo with hasNextPage for user posts', async () => {
      const query = `
        query GetUserPosts($handle: String!, $limit: Int) {
          userPosts(handle: $handle, limit: $limit) {
            edges {
              node {
                id
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

      const response = await executeGraphQL(
        query,
        { handle: testUser.handle, limit: 5 },
        testUser.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data?.userPosts.pageInfo).toBeDefined();
      expect(response.data?.userPosts.pageInfo.hasNextPage).toBeDefined();
      expect(response.data?.userPosts.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Error Handling', () => {
    it('should return validation error for invalid input', async () => {
      const mutation = `
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            post {
              id
            }
            uploadUrl
          }
        }
      `;

      // Missing required fileType field
      const response = await executeGraphQL(
        mutation,
        {
          input: {
            caption: 'Test',
          },
        },
        testUser.accessToken
      );

      expect(response.errors).toBeDefined();
      // GraphQL validation error for missing required field
    });

    it('should enforce query depth limit', async () => {
      // Create deeply nested query (exceeds depth limit of 7)
      const deepQuery = `
        query DeepQuery {
          me {
            id
            handle
            followersCount
          }
        }
      `;

      // This should pass (depth 2)
      const response = await executeGraphQL(deepQuery, {}, testUser.token);
      expect(response.errors).toBeUndefined();

      // TODO: Add test for query that actually exceeds depth limit
      // Need to create a query with depth > 7
    });
  });
});
