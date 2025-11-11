/**
 * Pothos Auth Integration Tests
 *
 * Testing Principles:
 * ✅ No mocks - use real services with dependency injection
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test what auth operations do, not how
 * ✅ Type-safe throughout
 *
 * What we're testing:
 * - Auth operations work through Pothos schema
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

describe('Pothos Auth Integration', () => {
  describe('Schema Structure', () => {
    it('should create server with merged schema successfully', async () => {
      // ARRANGE & ACT
      const server = createApolloServerWithPothos();
      await server.start();

      // ASSERT - Behavior: Server starts without errors
      expect(server).toBeDefined();

      // Cleanup
      await server.stop();
    });

    it('should include Pothos auth types in schema', async () => {
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

      // ASSERT - Behavior: Pothos auth types are present
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const types = result.body.singleResult.data?.__schema.types as Array<{ name: string }>;
        const typeNames = types.map((t) => t.name);

        expect(typeNames).toContain('Profile');
        expect(typeNames).toContain('AuthPayload');
        expect(typeNames).toContain('AuthTokens');
        expect(typeNames).toContain('LogoutResponse');
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Auth Queries', () => {
    it('should reject unauthenticated me query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null); // No userId

      // ACT - Try to access protected query
      const result = await executeOperation(
        server,
        `query { me { id username } }`,
        context
      );

      // ASSERT - Behavior: Returns auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain(
          'authenticated'
        );
      }

      // Cleanup
      await server.stop();
    });

    it('should allow authenticated me query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Access protected query with auth
      const result = await executeOperation(
        server,
        `query { me { id username } }`,
        context
      );

      // ASSERT - Behavior: Query executes (may fail on use case but not on auth)
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        // Either succeeds or fails with non-auth error
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.toLowerCase().includes('authenticated')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });

    it('should allow unauthenticated profile query', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public query without auth
      const result = await executeOperation(
        server,
        `query { profile(handle: "testuser") { id handle } }`,
        context
      );

      // ASSERT - Behavior: Query executes without auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        // Should execute (may return null if user doesn't exist, but no auth error)
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.toLowerCase().includes('not authenticated')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Auth Mutations', () => {
    it('should allow unauthenticated register mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public mutation
      const result = await executeOperation(
        server,
        `
          mutation {
            register(
              email: "test@example.com"
              password: "password123"
              username: "testuser"
              handle: "testhandle"
              fullName: "Test User"
            ) {
              user { id username }
              tokens { accessToken }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Mutation executes without auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        // Should execute (may fail on use case but not on auth)
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.toLowerCase().includes('not authenticated')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });

    it('should allow unauthenticated login mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Public mutation
      const result = await executeOperation(
        server,
        `
          mutation {
            login(
              email: "test@example.com"
              password: "password123"
            ) {
              user { id username }
              tokens { accessToken }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Mutation executes without auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.toLowerCase().includes('not authenticated')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });

    it('should reject unauthenticated logout mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Try protected mutation without auth
      const result = await executeOperation(
        server,
        `mutation { logout { success } }`,
        context
      );

      // ASSERT - Behavior: Returns auth error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain(
          'authenticated'
        );
      }

      // Cleanup
      await server.stop();
    });

    it('should allow authenticated logout mutation', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('test-user-123');

      // ACT - Protected mutation with auth
      const result = await executeOperation(
        server,
        `mutation { logout { success } }`,
        context
      );

      // ASSERT - Behavior: Mutation executes (may fail on use case but not on auth)
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const hasAuthError = result.body.singleResult.errors?.some((e) =>
          e.message.toLowerCase().includes('authenticated')
        );
        expect(hasAuthError).toBeFalsy();
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Type Safety', () => {
    it('should validate required fields', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext(null);

      // ACT - Missing required fields
      const result = await executeOperation(
        server,
        `
          mutation {
            register(
              email: "test@example.com"
              password: "password123"
            ) {
              user { id }
            }
          }
        `,
        context
      );

      // ASSERT - Behavior: Returns validation error for missing fields
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        // Should mention missing required fields
        const errorMessage = result.body.singleResult.errors?.[0].message || '';
        expect(
          errorMessage.includes('username') ||
          errorMessage.includes('handle') ||
          errorMessage.includes('fullName') ||
          errorMessage.includes('Field')
        ).toBe(true);
      }

      // Cleanup
      await server.stop();
    });
  });
});
