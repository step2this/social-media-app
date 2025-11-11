/**
 * GraphQL Test Execution Helpers
 *
 * Provides utilities for testing GraphQL schemas without mocks.
 * Uses real GraphQL execution with test contexts and services.
 *
 * Principles:
 * - No mocks - use real GraphQL execution
 * - Type-safe throughout
 * - Easy to create test contexts
 * - Support for both authenticated and unauthenticated tests
 */

import { graphql, type GraphQLSchema, type ExecutionResult } from 'graphql';
import type { GraphQLContext } from '../../context.js';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createMockDynamoClient } from '@social-media-app/shared/test-utils';
import { createServices } from '../../services/factory.js';
import { createLoaders } from '../../dataloaders/index.js';
import { createGraphQLContainer } from '../../infrastructure/di/awilix-container.js';

/**
 * Test context options
 */
export interface TestContextOptions {
  userId?: string | null;
  tableName?: string;
  correlationId?: string;
  dynamoClient?: DynamoDBDocumentClient;
}

/**
 * Create a test GraphQL context
 *
 * Provides a complete GraphQL context for testing with real services
 * but using mock DynamoDB client.
 *
 * @param options - Context configuration
 * @returns Complete GraphQL context
 */
export function createTestContext(
  options: TestContextOptions = {}
): GraphQLContext {
  const {
    userId = null,
    tableName = 'test-table',
    correlationId = `test-${Date.now()}`,
    dynamoClient = createMockDynamoClient() as any,
  } = options;

  // Create real services with mock client
  const services = createServices(dynamoClient, tableName);

  // Create real dataloaders
  const loaders = createLoaders(
    {
      profileService: services.profileService,
      postService: services.postService,
      likeService: services.likeService,
      auctionService: services.auctionService,
    },
    userId
  );

  // Create base context (needed for container creation)
  const context: GraphQLContext = {
    userId,
    correlationId,
    dynamoClient,
    tableName,
    services,
    loaders,
  } as GraphQLContext;

  // Create DI container
  const container = createGraphQLContainer(context);
  context.container = container;

  return context;
}

/**
 * Create authenticated test context
 *
 * Convenience wrapper for creating context with authenticated user
 */
export function createAuthenticatedContext(
  userId: string = 'test-user-123',
  options: Omit<TestContextOptions, 'userId'> = {}
): GraphQLContext {
  return createTestContext({ ...options, userId });
}

/**
 * Create unauthenticated test context
 *
 * Convenience wrapper for creating context without authentication
 */
export function createUnauthenticatedContext(
  options: Omit<TestContextOptions, 'userId'> = {}
): GraphQLContext {
  return createTestContext({ ...options, userId: null });
}

/**
 * Execute a GraphQL query/mutation
 *
 * Runs actual GraphQL execution with provided schema and context.
 * No mocking - tests real resolver behavior.
 *
 * @param schema - GraphQL schema to execute against
 * @param query - GraphQL query/mutation string
 * @param context - GraphQL context
 * @param variables - Optional query variables
 * @returns Execution result
 *
 * @example
 * ```typescript
 * const result = await executeGraphQL(
 *   schema,
 *   `query { me { id username } }`,
 *   createAuthenticatedContext('user-123')
 * );
 *
 * expect(result.errors).toBeUndefined();
 * expect(result.data?.me).toBeDefined();
 * ```
 */
export async function executeGraphQL(
  schema: GraphQLSchema,
  query: string,
  context: GraphQLContext,
  variables?: Record<string, any>
): Promise<ExecutionResult> {
  return await graphql({
    schema,
    source: query,
    contextValue: context,
    variableValues: variables,
  });
}

/**
 * Execute GraphQL and assert no errors
 *
 * Helper that throws if query has errors, making tests more readable
 */
export async function executeGraphQLWithoutErrors(
  schema: GraphQLSchema,
  query: string,
  context: GraphQLContext,
  variables?: Record<string, any>
): Promise<any> {
  const result = await executeGraphQL(schema, query, context, variables);

  if (result.errors && result.errors.length > 0) {
    throw new Error(
      `GraphQL execution failed: ${result.errors.map((e) => e.message).join(', ')}`
    );
  }

  return result.data;
}

/**
 * Execute GraphQL and expect errors
 *
 * Helper for testing error cases
 */
export async function executeGraphQLExpectingErrors(
  schema: GraphQLSchema,
  query: string,
  context: GraphQLContext,
  variables?: Record<string, any>
): Promise<readonly any[]> {
  const result = await executeGraphQL(schema, query, context, variables);

  if (!result.errors || result.errors.length === 0) {
    throw new Error('Expected GraphQL errors but got none');
  }

  return result.errors;
}

/**
 * Helper to check if error contains specific message
 */
export function hasErrorMessage(
  errors: readonly any[],
  expectedMessage: string
): boolean {
  return errors.some((error) =>
    error.message.toLowerCase().includes(expectedMessage.toLowerCase())
  );
}

/**
 * Helper to find error by message substring
 */
export function findErrorByMessage(
  errors: readonly any[],
  messageSubstring: string
): any | undefined {
  return errors.find((error) =>
    error.message.toLowerCase().includes(messageSubstring.toLowerCase())
  );
}

/**
 * Create a deeply nested query for testing depth limits
 *
 * @param depth - How deep to nest the query
 * @returns GraphQL query string
 */
export function createDeeplyNestedQuery(depth: number): string {
  let query = 'query { ';

  // Build nested structure
  for (let i = 0; i < depth; i++) {
    query += '__schema { types { ';
  }

  query += 'name ';

  // Close nested structure
  for (let i = 0; i < depth; i++) {
    query += '} }';
  }

  query += ' }';

  return query;
}

/**
 * Create a query with many fields for testing breadth limits
 *
 * @param fieldCount - Number of fields to request
 * @returns GraphQL query string
 */
export function createWideBreadthQuery(fieldCount: number): string {
  let query = 'query { __schema { ';

  for (let i = 0; i < fieldCount; i++) {
    // Use introspection fields that exist
    if (i % 3 === 0) {
      query += `types { name } `;
    } else if (i % 3 === 1) {
      query += `queryType { name } `;
    } else {
      query += `mutationType { name } `;
    }
  }

  query += '} }';

  return query;
}

/**
 * Create a query with high complexity for testing complexity limits
 *
 * @param complexity - Target complexity score
 * @returns GraphQL query string
 */
export function createHighComplexityQuery(complexity: number): string {
  // List fields typically have 10x multiplier in Pothos
  // So requesting N items = N * 10 complexity
  const itemCount = Math.ceil(complexity / 10);

  return `
    query {
      __schema {
        types {
          name
          description
          fields {
            name
            description
          }
        }
      }
    }
  `;
}
