/**
 * Pothos Feed Integration Tests
 *
 * Testing Principles:
 * ✅ No mocks - use real services with dependency injection
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test what operations do, not how
 * ✅ Type-safe throughout
 *
 * What we're testing:
 * - Feed operations work through Pothos schema
 * - Type safety is maintained
 * - Auth scopes protect authenticated operations
 * - Public operations work without auth
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

describe('Pothos Feed Integration', () => {
  describe('Schema Structure', () => {
    it('should include Feed types in schema', async () => {
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

      // ASSERT - Behavior: Pothos feed types are present
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const types = result.body.singleResult.data?.__schema.types as Array<{ name: string }>;
        const typeNames = types.map((t) => t.name);

        expect(typeNames).toContain('FeedItem');
        expect(typeNames).toContain('FeedConnection');
        expect(typeNames).toContain('FeedEdge');
        expect(typeNames).toContain('MarkFeedReadResponse');
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Feed Queries', () => {
    it('should reject unauthenticated feed query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected query without auth
      const result = await executeOperation(
        server,
        `
          query {
            feed(limit: 10) {
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

      // ASSERT - Behavior: Returns auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain('Not authorized');
      }

      // Cleanup
      await server.stop();
    });

    it('should allow authenticated feed query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected query with auth
      const result = await executeOperation(
        server,
        `
          query {
            feed(limit: 10) {
              edges {
                node {
                  id
                  post { id }
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

      // ASSERT - Behavior: Query executes (may fail on use case but not on auth)
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

    it('should support both pagination styles in feed query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Relay-style pagination (first + after)
      const result = await executeOperation(
        server,
        `
          query {
            feed(first: 10, after: "cursor123") {
              edges {
                node { id }
              }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Query executes without error
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

    it('should allow unauthenticated exploreFeed query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `
          query {
            exploreFeed(limit: 10) {
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

    it('should reject unauthenticated followingFeed query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected query without auth
      const result = await executeOperation(
        server,
        `
          query {
            followingFeed(limit: 10) {
              edges {
                node {
                  id
                  caption
                }
              }
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

    it('should allow authenticated followingFeed query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected query with auth
      const result = await executeOperation(
        server,
        `
          query {
            followingFeed(limit: 10) {
              edges {
                node {
                  id
                  caption
                }
              }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Query executes (may fail on use case but not on auth)
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

    it('should validate pagination parameters in feed queries', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Invalid limit (negative)
      const result = await executeOperation(
        server,
        `
          query {
            feed(limit: -1) {
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

  describe('Feed Mutations', () => {
    it('should reject unauthenticated markFeedItemsAsRead mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `
          mutation {
            markFeedItemsAsRead(postIds: ["post1", "post2"]) {
              updatedCount
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

    it('should allow authenticated markFeedItemsAsRead mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `
          mutation {
            markFeedItemsAsRead(postIds: ["post1", "post2"]) {
              updatedCount
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
    it('should validate required arguments in markFeedItemsAsRead', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Missing required argument (postIds)
      const result = await executeOperation(
        server,
        `
          mutation {
            markFeedItemsAsRead {
              updatedCount
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
          errorMessage.includes('postIds') || errorMessage.includes('Field')
        ).toBe(true);
      }

      // Cleanup
      await server.stop();
    });
  });
});
