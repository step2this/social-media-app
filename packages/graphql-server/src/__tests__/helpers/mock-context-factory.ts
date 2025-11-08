/**
 * Factory for creating type-safe mock GraphQLContext objects in tests
 *
 * Eliminates duplicate context creation and ensures type safety.
 * Follows DRY principle and dependency injection pattern.
 *
 * Usage:
 *   const context = createMockGraphQLContext({ userId: 'user-123' });
 *   const resolver = createMeResolver(context.container);
 *   await resolver({}, {}, context, {} as any);
 */

import type { GraphQLContext } from '../../context.js';
import { createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';

export interface MockContextOptions {
  userId?: string | null;
  correlationId?: string;
  tableName?: string;
  container?: AwilixContainer<GraphQLContainer>;
}

/**
 * Create a complete, type-safe GraphQLContext for testing
 *
 * All required fields are provided with sensible defaults.
 * Individual fields can be overridden via options parameter.
 */
export function createMockGraphQLContext(
  options: MockContextOptions = {}
): GraphQLContext {
  const defaultContainer = createContainer<GraphQLContainer>({
    injectionMode: InjectionMode.CLASSIC,
  });

  return {
    userId: options.userId ?? 'mock-user-id',
    correlationId: options.correlationId ?? 'mock-correlation-id',
    dynamoClient: {} as any,
    tableName: options.tableName ?? 'mock-table',
    services: {} as any,
    loaders: {} as any,
    container: options.container ?? defaultContainer,
  };
}
