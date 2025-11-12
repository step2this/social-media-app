/**
 * Pothos Posts Integration Tests
 *
 * Testing Principles:
 * ✅ No mocks - use real services with dependency injection
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test what operations do, not how
 * ✅ Type-safe throughout
 *
 * What we're testing:
 * - Posts operations work through Pothos schema
 * - Type safety is maintained
 * - Auth scopes protect mutations
 * - Queries work with and without auth
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
    it('should include Posts types in schema', async () => {
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
      const context = createTestContext(null);

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `query { post(id: "test-post-id") { id caption } }`,
        context
      );

      // ASSERT - Behavior: Query executes without auth error
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
            userPosts(handle: "testuser", limit: 10) {
              edges {
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
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.includes('Not authorized')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });

    it('should validate userPosts pagination parameters', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Invalid limit (negative)
      const result = await executeOperation(
        server,
        `
          query {
            userPosts(handle: "testuser", limit: -1) {
              edges { node { id } }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns validation error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain('greater than 0');
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
            createPost(fileType: "image/jpeg", caption: "Test post") {
              post { id }
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
        expect(result.body.singleResult.errors?.[0].message).toContain('Not authorized');
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
            createPost(fileType: "image/jpeg", caption: "Test post") {
              post { id }
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
            updatePost(id: "test-post-id", caption: "Updated caption") {
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
        expect(result.body.singleResult.errors?.[0].message).toContain('Not authorized');
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
            updatePost(id: "test-post-id", caption: "Updated caption") {
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
        `mutation { deletePost(id: "test-post-id") { success } }`,
        context
      );

      // ASSERT - Behavior: Returns auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain('Not authorized');
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
        `mutation { deletePost(id: "test-post-id") { success } }`,
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
    it('should validate required fields in createPost', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Missing required field (fileType)
      const result = await executeOperation(
        server,
        `
          mutation {
            createPost(caption: "Test post") {
              post { id }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns validation error for missing required field
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        const errorMessage = result.body.singleResult.errors?.[0].message || '';
        expect(
          errorMessage.includes('fileType') || errorMessage.includes('Field')
        ).toBe(true);
      }

      // Cleanup
      await server.stop();
    });

    it('should validate required arguments in queries', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Missing required argument (handle in userPosts)
      const result = await executeOperation(
        server,
        `
          query {
            userPosts(limit: 10) {
              edges { node { id } }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns validation error for missing required argument
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        const errorMessage = result.body.singleResult.errors?.[0].message || '';
        expect(
          errorMessage.includes('handle') || errorMessage.includes('Field')
        ).toBe(true);
      }

      // Cleanup
      await server.stop();
    });
  });
});
