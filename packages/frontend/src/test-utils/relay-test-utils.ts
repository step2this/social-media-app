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
  environment: MockEnvironment,
  mockResolvers: MockResolvers
): void {
  const payload = MockPayloadGenerator.generate(
    environment.mock.getMostRecentOperation(),
    mockResolvers
  );
  environment.mock.resolveMostRecentOperation(payload);
}

/**
 * Resolve all pending operations
 *
 * Useful for components that make multiple queries
 */
export function resolveAllOperations(
  environment: MockEnvironment,
  mockResolvers: MockResolvers
): void {
  // Resolve all operations one by one
  while (environment.mock.getAllOperations().length > 0) {
    const payload = MockPayloadGenerator.generate(
      environment.mock.getMostRecentOperation(),
      mockResolvers
    );
    environment.mock.resolveMostRecentOperation(payload);
  }
}

/**
 * Reject the most recent operation with an error
 *
 * Usage:
 * ```typescript
 * rejectMostRecentOperation(environment, new Error('Network error'));
 * ```
 */
export function rejectMostRecentOperation(environment: MockEnvironment, error: Error): void {
  environment.mock.rejectMostRecentOperation(error);
}

/**
 * Get the variables from the most recent operation
 *
 * Useful for verifying query parameters
 */
export function getMostRecentOperationVariables<T = Record<string, unknown>>(
  environment: MockEnvironment
): T {
  const operation = environment.mock.getMostRecentOperation();
  return operation.request.variables as T;
}

/**
 * Check if an operation with a specific name was called
 */
export function wasOperationCalled(environment: MockEnvironment, operationName: string): boolean {
  const operations = environment.mock.getAllOperations();
  return operations.some((op) => op.request.node.operation.name === operationName);
}

/**
 * Get all operations of a specific type
 */
export function getOperationsByName(environment: MockEnvironment, operationName: string) {
  const operations = environment.mock.getAllOperations();
  return operations.filter((op) => op.request.node.operation.name === operationName);
}

/**
 * Clear all pending operations
 *
 * Useful for resetting state between tests
 */
export function clearAllOperations(environment: MockEnvironment): void {
  // Clear pending operations by rejecting them
  while (environment.mock.getAllOperations().length > 0) {
    environment.mock.rejectMostRecentOperation(new Error('Cleared'));
  }
}

/**
 * Wait for operations to complete
 *
 * Returns a promise that resolves when all pending operations are done
 */
export async function waitForOperations(): Promise<void> {
  // Flush pending timers
  await new Promise((resolve) => setTimeout(resolve, 0));
}
