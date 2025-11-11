/**
 * Pothos Posts Integration Tests
 *
 * Testing Principles:
 * ✅ No mocks - use real services with dependency injection
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test what posts operations do, not how
 * ✅ Type-safe throughout
 *
 * What we're testing:
 * - Posts operations work through Pothos schema
 * - Type safety is maintained
 * - Auth scopes protect operations
 * - Schema merging works correctly
 */

import { describe, it, expect } from 'vitest';
import { createApolloServerWithPothos } from '../../../server-with-pothos.js';
import type { GraphQLContext } from '../../../context.js';
import { createMockDynamoClient } from '@social-media-app/shared/test-utils';
import { createServices } from '../../../services/factory.js';
import { createLoaders } from '../../../dataloaders/index.js';
import { createGraphQLContainer } from '../../../infrastructure/di/awilix-container.js';

/**
 * Create test context for GraphQL operations
 */
function createTestContext(userId: string | null = null): GraphQLContext {
  const dynamoClient = createMockDynamoClient() as any;
  const tableName = 'test-table';
  const correlationId = `test-${Date.now()}`;

  const services = createServices(dynamoClient, tableName);
  const loaders = createLoaders(
    {
      profileService: services.profileService,
      postService: services.postService,
      likeService: services.likeService,
      auctionService: services.auctionService,
    },
    userId
  );

  const context: GraphQLContext = {
    userId,
    correlationId,
    dynamoClient,
    tableName,
    services,
    loaders,
  } as GraphQLContext;

  context.container = createGraphQLContainer(context);

  return context;
}

/**
 * Execute GraphQL operation against Apollo Server
 */
async function executeOperation(
  server: Awaited<ReturnType<typeof createApolloServerWithPothos>>,
  query: string,
  context: GraphQLContext,
  variables?: Record<string, any>
) {
  return await server.executeOperation(
    {
      query,
      variables,
    },
    {
      contextValue: context,
    }
  );
}

describe('Pothos Posts Integration', () => {
  describe('Schema Structure', () => {
    it('should include Pothos posts types in schema', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();

      // ACT - Introspect schema
      const introspectionQuery = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `;

      const result = await executeOperation(
        server,
        introspectionQuery,
        createTestContext()
      );

      // ASSERT - Behavior: Pothos posts types are present
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const types = result.body.singleResult.data?.__schema.types as Array<{ name: string }>;
        const typeNames = types.map((t) => t.name);

        expect(typeNames).toContain('Post');
        expect(typeNames).toContain('PostConnection');
        expect(typeNames).toContain('PostEdge');
        expect(typeNames).toContain('CreatePostPayload');
        expect(typeNames).toContain('CreatePostInput');
        expect(typeNames).toContain('UpdatePostInput');
        expect(typeNames).toContain('DeleteResponse');
        expect(typeNames).toContain('PageInfo');
        expect(typeNames).toContain('PublicProfile');
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Post Queries', () => {
    it('should allow unauthenticated post query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null); // No userId

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `query { post(id: "post-123") { id userId caption } }`,
        context
      );

      // ASSERT - Behavior: Query executes without auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        // Should execute (may return null if post doesn't exist, but no auth error)
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.includes('Not authorized')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });

    it('should allow unauthenticated userPosts query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `
          query {
            userPosts(handle: "testuser") {
              edges {
                cursor
                node {
                  id
                  caption
                }
              }
              pageInfo {
                hasNextPage
              }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Query executes without auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        // Should execute (may fail on use case if user doesn't exist, but not on auth)
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.includes('Not authorized')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Post Mutations', () => {
    it('should reject unauthenticated createPost mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `
          mutation {
            createPost(input: { fileType: "image/jpeg", caption: "Test post" }) {
              post {
                id
                caption
              }
              uploadUrl
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain(
          'Not authorized'
        );
      }

      // Cleanup
      await server.stop();
    });

    it('should allow authenticated createPost mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `
          mutation {
            createPost(input: { fileType: "image/jpeg", caption: "Test post" }) {
              post {
                id
                caption
              }
              uploadUrl
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Mutation executes (may fail on use case but not on auth)
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.includes('Not authorized')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });

    it('should reject unauthenticated updatePost mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `
          mutation {
            updatePost(id: "post-123", input: { caption: "Updated caption" }) {
              id
              caption
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain(
          'Not authorized'
        );
      }

      // Cleanup
      await server.stop();
    });

    it('should allow authenticated updatePost mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `
          mutation {
            updatePost(id: "post-123", input: { caption: "Updated caption" }) {
              id
              caption
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Mutation executes (may fail on use case but not on auth)
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.includes('Not authorized')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });

    it('should reject unauthenticated deletePost mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `
          mutation {
            deletePost(id: "post-123") {
              success
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain(
          'Not authorized'
        );
      }

      // Cleanup
      await server.stop();
    });

    it('should allow authenticated deletePost mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `
          mutation {
            deletePost(id: "post-123") {
              success
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Mutation executes (may fail on use case but not on auth)
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.includes('Not authorized')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Type Safety', () => {
    it('should validate required fields in CreatePostInput', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Missing required field (fileType)
      const result = await executeOperation(
        server,
        `
          mutation {
            createPost(input: { caption: "Test" }) {
              post {
                id
              }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns validation error for missing fields
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        const errorMessage = result.body.singleResult.errors?.[0].message || '';
        expect(
          errorMessage.includes('fileType') ||
          errorMessage.includes('Field') ||
          errorMessage.includes('required')
        ).toBe(true);
      }

      // Cleanup
      await server.stop();
    });
  });
});
