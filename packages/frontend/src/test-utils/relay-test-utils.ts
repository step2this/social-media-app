/**
 * Relay Test Utilities
 *
 * Reusable helpers for testing Relay components.
 * Follows existing pattern from serviceTestHelpers.ts and mock-service-container.ts
 *
 * Key Principles:
 * - DRY: Create once, use everywhere
 * - Composable: Mix and match helpers
 * - Type-safe: Full TypeScript support
 * - Compatible with existing fixtures
 */

import { createMockEnvironment, MockPayloadGenerator, type MockResolvers } from 'relay-test-utils';
import type { Environment, OperationType } from 'relay-runtime';

/**
 * Mock Environment type with mock property
 * 
 * The relay-test-utils createMockEnvironment returns an Environment
 * with an additional `mock` property for testing.
 */
export type MockEnvironment = ReturnType<typeof createMockEnvironment>;

/**
 * Create a mock Relay environment for testing
 *
 * Usage:
 * ```typescript
 * const environment = createMockRelayEnvironment();
 * ```
 */
export function createMockRelayEnvironment(): MockEnvironment {
  return createMockEnvironment();
}

/**
 * Resolve the most recent operation with mock data
 *
 * Usage:
 * ```typescript
 * resolveMostRecentOperation(environment, {
 *   Query: () => ({
 *     unreadNotificationsCount: 5
 *   })
 * });
 * ```
 */
export function resolveMostRecentOperation(
  environment: Environment,
  mockResolvers: MockResolvers
): void {
  const operation = environment.mock.getMostRecentOperation();
  environment.mock.resolve(operation, MockPayloadGenerator.generate(operation, mockResolvers));
}

/**
 * Resolve all pending operations
 *
 * Useful for components that make multiple queries
 */
export function resolveAllOperations(
  environment: Environment,
  mockResolvers: MockResolvers
): void {
  const operations = environment.mock.getAllOperations();
  operations.forEach((operation) => {
    environment.mock.resolve(operation, MockPayloadGenerator.generate(operation, mockResolvers));
  });
}

/**
 * Reject the most recent operation with an error
 *
 * Usage:
 * ```typescript
 * rejectMostRecentOperation(environment, new Error('Network error'));
 * ```
 */
export function rejectMostRecentOperation(environment: Environment, error: Error): void {
  const operation = environment.mock.getMostRecentOperation();
  environment.mock.reject(operation, error);
}

/**
 * Get the variables from the most recent operation
 *
 * Useful for verifying query parameters
 */
export function getMostRecentOperationVariables<T = Record<string, unknown>>(
  environment: Environment
): T {
  const operation = environment.mock.getMostRecentOperation();
  return operation.request.variables as T;
}

/**
 * Check if an operation with a specific name was called
 */
export function wasOperationCalled(environment: Environment, operationName: string): boolean {
  const operations = environment.mock.getAllOperations();
  return operations.some((op) => op.request.node.operation.name === operationName);
}

/**
 * Get all operations of a specific type
 */
export function getOperationsByName(environment: Environment, operationName: string) {
  const operations = environment.mock.getAllOperations();
  return operations.filter((op) => op.request.node.operation.name === operationName);
}

/**
 * Clear all pending operations
 *
 * Useful for resetting state between tests
 */
export function clearAllOperations(environment: Environment): void {
  environment.mock.clearCache();
}

/**
 * Wait for operations to complete
 *
 * Returns a promise that resolves when all pending operations are done
 */
export async function waitForOperations(environment: Environment): Promise<void> {
  // Flush pending timers
  await new Promise((resolve) => setTimeout(resolve, 0));
}
