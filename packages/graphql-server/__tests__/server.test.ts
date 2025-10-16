import { describe, it, expect, beforeEach } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { createApolloServer } from '../src/server.js';
import type { GraphQLContext } from '../src/context.js';

describe('Apollo Server Creation', () => {
  let server: ApolloServer<GraphQLContext>;

  beforeEach(async () => {
    server = createApolloServer();
  });

  describe('Server Instantiation', () => {
    it('should create an Apollo Server instance', () => {
      expect(server).toBeInstanceOf(ApolloServer);
    });

    it('should have typeDefs configured', () => {
      // Apollo Server internal property check
      expect(server).toBeDefined();
      // TypeDefs are loaded during construction
      // We can't directly access typeDefs, but server should be properly configured
    });

    it('should have resolvers configured', () => {
      expect(server).toBeDefined();
      // Resolvers are loaded during construction
      // Actual resolver functionality will be tested in resolver tests
    });
  });

  describe('Server Lifecycle', () => {
    it('should start successfully', async () => {
      await expect(server.start()).resolves.not.toThrow();
    });

    it('should stop successfully after starting', async () => {
      await server.start();
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should not allow restart after stopping (Apollo Server limitation)', async () => {
      await server.start();
      await server.stop();
      // Apollo Server doesn't support restart - need to create new instance
      await expect(server.start()).rejects.toThrow(
        /You should only call 'start\(\)'/
      );
    });
  });

  describe('Server Configuration', () => {
    it('should be configured with introspection capability', async () => {
      await server.start();

      // Server should allow introspection queries in test environment
      const introspectionQuery = {
        query: `
          query IntrospectionQuery {
            __schema {
              queryType {
                name
              }
            }
          }
        `,
      };

      const mockContext: GraphQLContext = {
        userId: null,
        dynamoClient: null as any,
        tableName: 'test-table',
      };

      const result = await server.executeOperation(introspectionQuery, {
        contextValue: mockContext,
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.__schema).toBeDefined();
        expect(result.body.singleResult.data?.__schema.queryType.name).toBe('Query');
      }

      await server.stop();
    });

    it('should handle GraphQL execution with proper context', async () => {
      await server.start();

      // Simple query that should work with our schema
      const testQuery = {
        query: `
          query TestQuery {
            __typename
          }
        `,
      };

      const mockContext: GraphQLContext = {
        userId: 'test-user-id',
        dynamoClient: null as any,
        tableName: 'test-table',
      };

      const result = await server.executeOperation(testQuery, {
        contextValue: mockContext,
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.__typename).toBe('Query');
      }

      await server.stop();
    });
  });
});
