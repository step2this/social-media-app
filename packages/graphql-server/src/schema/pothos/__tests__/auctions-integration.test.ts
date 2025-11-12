/**
 * Pothos Auctions Integration Tests
 *
 * Testing Principles:
 * ✅ No mocks - use real services with dependency injection
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test what operations do, not how
 * ✅ Type-safe throughout
 *
 * What we're testing:
 * - Auctions operations work through Pothos schema
 * - Type safety is maintained
 * - Auth scopes protect mutations
 * - Public queries work without auth
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

describe('Pothos Auctions Integration', () => {
  describe('Schema Structure', () => {
    it('should include Auctions types in schema', async () => {
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

      // ASSERT - Behavior: Pothos auctions types are present
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const types = result.body.singleResult.data?.__schema.types as Array<{ name: string }>;
        const typeNames = types.map((t) => t.name);

        expect(typeNames).toContain('Auction');
        expect(typeNames).toContain('Bid');
        expect(typeNames).toContain('AuctionStatus');
        expect(typeNames).toContain('AuctionConnection');
        expect(typeNames).toContain('BidConnection');
        expect(typeNames).toContain('CreateAuctionPayload');
        expect(typeNames).toContain('PlaceBidPayload');
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Auction Queries', () => {
    it('should allow unauthenticated auction query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `query { auction(id: "test-auction-id") { id title } }`,
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

    it('should allow unauthenticated auctions query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `
          query {
            auctions(limit: 10) {
              edges {
                node {
                  id
                  title
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

    it('should support filters in auctions query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Query with status and userId filters
      const result = await executeOperation(
        server,
        `
          query {
            auctions(limit: 10, status: ACTIVE, userId: "user123") {
              edges {
                node {
                  id
                  status
                }
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

    it('should validate pagination parameters in auctions query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Invalid limit (negative)
      const result = await executeOperation(
        server,
        `
          query {
            auctions(limit: -1) {
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

    it('should allow unauthenticated bids query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `
          query {
            bids(auctionId: "auction123", limit: 10) {
              bids {
                id
                amount
              }
              total
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

    it('should validate pagination parameters in bids query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Invalid offset (negative)
      const result = await executeOperation(
        server,
        `
          query {
            bids(auctionId: "auction123", offset: -1) {
              bids { id }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns validation error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain('non-negative');
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Auction Mutations', () => {
    it('should reject unauthenticated createAuction mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `
          mutation {
            createAuction(
              title: "Test Auction"
              fileType: "image/jpeg"
              startPrice: 100.0
              startTime: "2025-01-01T00:00:00Z"
              endTime: "2025-01-02T00:00:00Z"
            ) {
              auction { id }
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

    it('should allow authenticated createAuction mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `
          mutation {
            createAuction(
              title: "Test Auction"
              fileType: "image/jpeg"
              startPrice: 100.0
              startTime: "2025-01-01T00:00:00Z"
              endTime: "2025-01-02T00:00:00Z"
            ) {
              auction { id }
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

    it('should reject unauthenticated activateAuction mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `mutation { activateAuction(id: "auction123") { id status } }`,
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

    it('should allow authenticated activateAuction mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `mutation { activateAuction(id: "auction123") { id status } }`,
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

    it('should reject unauthenticated placeBid mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `
          mutation {
            placeBid(auctionId: "auction123", amount: 150.0) {
              bid { id }
              auction { id }
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

    it('should allow authenticated placeBid mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `
          mutation {
            placeBid(auctionId: "auction123", amount: 150.0) {
              bid { id }
              auction { id }
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
    it('should validate required fields in createAuction', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Missing required fields (fileType, startPrice)
      const result = await executeOperation(
        server,
        `
          mutation {
            createAuction(
              title: "Test Auction"
              startTime: "2025-01-01T00:00:00Z"
              endTime: "2025-01-02T00:00:00Z"
            ) {
              auction { id }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns validation error for missing required fields
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        const errorMessage = result.body.singleResult.errors?.[0].message || '';
        expect(
          errorMessage.includes('fileType') ||
          errorMessage.includes('startPrice') ||
          errorMessage.includes('Field')
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

      // ACT - Missing required argument (auctionId in bids)
      const result = await executeOperation(
        server,
        `
          query {
            bids(limit: 10) {
              bids { id }
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
          errorMessage.includes('auctionId') || errorMessage.includes('Field')
        ).toBe(true);
      }

      // Cleanup
      await server.stop();
    });
  });
});
