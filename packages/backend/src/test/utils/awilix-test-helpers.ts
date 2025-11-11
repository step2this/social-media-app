/**
 * Test Helpers for Awilix Container Testing
 *
 * Provides utilities for testing Awilix middleware without mocks.
 * Uses real container instances to test actual DI behavior.
 *
 * Principles:
 * - No mocks or spies - test real container behavior
 * - Type-safe throughout
 * - Easy cleanup between tests
 */

import { createContainer, asValue, asFunction, InjectionMode, type AwilixContainer } from 'awilix';
import type { ServiceContainer } from '../../infrastructure/di/Container.js';
import type { AugmentedLambdaEvent } from '../../types/lambda-extended.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Minimal test service implementations
 * These are simple classes/functions to verify DI behavior
 */

export class TestService {
  public readonly name = 'TestService';
  public callCount = 0;

  doSomething(): string {
    this.callCount++;
    return 'test-result';
  }
}

export class AnotherTestService {
  public readonly name = 'AnotherTestService';
  constructor(public readonly dependency: TestService) {}

  useDependency(): string {
    return `Using: ${this.dependency.name}`;
  }
}

/**
 * Test container with minimal services for testing
 * Mimics the structure of real ServiceContainer
 */
export interface TestServiceContainer {
  testService: TestService;
  anotherService: AnotherTestService;
  configValue: string;
}

/**
 * Create a test Awilix container for middleware testing
 *
 * Returns a container with simple test services to verify:
 * - Service registration
 * - Dependency resolution
 * - Scoping behavior
 * - Cleanup/disposal
 *
 * @returns Configured test container
 */
export function createTestContainer(): AwilixContainer<TestServiceContainer> {
  const container = createContainer<TestServiceContainer>({
    injectionMode: InjectionMode.PROXY
  });

  container.register({
    // Singleton service
    testService: asFunction(() => new TestService()).singleton(),

    // Scoped service with dependency
    anotherService: asFunction(({ testService }) => {
      return new AnotherTestService(testService);
    }).scoped(),

    // Simple value
    configValue: asValue('test-config')
  });

  return container;
}

/**
 * Create test scope from container
 *
 * Mimics createRequestScope() behavior for testing
 */
export function createTestScope(): AwilixContainer<TestServiceContainer> {
  const container = createTestContainer();
  return container.createScope();
}

/**
 * Create augmented Lambda event for testing middleware
 *
 * Provides a properly typed event that can be augmented by middleware
 */
export function createTestLambdaEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {}
): AugmentedLambdaEvent {
  return {
    version: '2.0',
    routeKey: 'POST /test',
    rawPath: '/test',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json',
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'POST',
        path: '/test',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'POST /test',
      stage: 'test',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    isBase64Encoded: false,
    ...overrides,
  } as AugmentedLambdaEvent;
}

/**
 * Create Middy request object for testing middleware
 *
 * Middy wraps the Lambda event/context in a request object
 */
export function createMiddyRequest(event: AugmentedLambdaEvent) {
  return {
    event,
    context: {} as any, // Lambda context not needed for these tests
    response: {},
    error: undefined,
    internal: {},
  };
}

/**
 * Helper to check if a container has been disposed
 *
 * Awilix containers track disposal state internally
 */
export function isContainerDisposed(container: AwilixContainer): boolean {
  try {
    // Attempting to resolve from disposed container throws
    container.resolve('testService' as any);
    return false;
  } catch (error) {
    // If it throws with disposed message, container is disposed
    return error instanceof Error && error.message.includes('disposed');
  }
}

/**
 * Create a service container mock that matches ServiceContainer interface
 * but with test implementations
 *
 * Used when middleware expects ServiceContainer type but we want
 * to test with simpler services
 */
export function createMockServiceContainer(): Partial<ServiceContainer> {
  return {
    tableName: 'test-table',
  };
}
