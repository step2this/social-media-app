/**
 * Test Setup Utilities
 *
 * Provides DRY helpers for service readiness checks and test environment setup
 * that are repeated across all integration test files.
 *
 * @module test-setup
 */

import {
  environmentDetector,
  testLogger,
  createLocalStackHttpClient,
  type HttpClient,
  type EnvironmentDetector,
  type TestLogger
} from './index.js';

/**
 * Test environment setup result
 */
export interface TestEnvironmentSetup {
  /** HTTP client configured for LocalStack */
  httpClient: HttpClient;
  /** Environment detector for service health checks */
  environmentDetector: EnvironmentDetector;
  /** Logger for test output */
  testLogger: TestLogger;
}

/**
 * Service readiness check result
 */
export interface ServiceReadiness {
  /** Whether LocalStack is available and healthy */
  localStackReady: boolean;
  /** Whether the API server is available and healthy */
  apiReady: boolean;
  /** Service URLs for debugging */
  serviceUrls: Record<string, string>;
}

/**
 * Ensures all required services are ready before running tests.
 *
 * This function consolidates the service readiness pattern that appears
 * in every integration test beforeAll block.
 *
 * @param timeoutMs - Maximum time to wait for services (default: 30000ms)
 * @throws {Error} If services are not ready within timeout
 * @throws {Error} If LocalStack is not available
 * @throws {Error} If API server is not available
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   await ensureServicesReady();
 *   // Additional test setup...
 * }, 30000);
 * ```
 */
export async function ensureServicesReady(timeoutMs: number = 30000): Promise<ServiceReadiness> {
  testLogger.info('Checking service readiness...');

  // Wait for services to be ready
  await environmentDetector.waitForServices(timeoutMs);

  // Get service URLs for debugging
  const serviceUrls = environmentDetector.getServiceUrls();
  testLogger.debug('Service URLs:', serviceUrls);

  // Verify services are available
  const [localStackReady, apiReady] = await Promise.all([
    environmentDetector.isLocalStackAvailable(),
    environmentDetector.isApiServerAvailable()
  ]);

  // Validate LocalStack availability
  if (!localStackReady) {
    const errorMessage = [
      'LocalStack is not available.',
      'Please start LocalStack before running integration tests.',
      'Run: pnpm dev or pnpm quick:localstack'
    ].join(' ');
    throw new Error(errorMessage);
  }

  // Validate API server availability
  if (!apiReady) {
    const errorMessage = [
      'API server is not available.',
      'Please start the backend server before running integration tests.',
      'Run: pnpm dev'
    ].join(' ');
    throw new Error(errorMessage);
  }

  testLogger.info('✓ All required services are ready', {
    localStack: serviceUrls.localstack,
    api: serviceUrls.api
  });

  return {
    localStackReady,
    apiReady,
    serviceUrls
  };
}

/**
 * Sets up complete test environment with all required utilities.
 *
 * This function provides a one-line setup for integration tests,
 * consolidating service checks, HTTP client creation, and logger setup.
 *
 * @param timeoutMs - Maximum time to wait for services (default: 30000ms)
 * @returns Test environment setup with HTTP client, detector, and logger
 * @throws {Error} If services are not ready
 *
 * @example
 * ```typescript
 * describe('My Integration Test', () => {
 *   let httpClient: HttpClient;
 *
 *   beforeAll(async () => {
 *     const setup = await setupTestEnvironment();
 *     httpClient = setup.httpClient;
 *   }, 30000);
 *
 *   it('should work', async () => {
 *     const response = await httpClient.get('/health');
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 */
export async function setupTestEnvironment(
  timeoutMs: number = 30000
): Promise<TestEnvironmentSetup> {
  testLogger.info('Setting up test environment...');

  // Ensure all services are ready
  const readiness = await ensureServicesReady(timeoutMs);

  // Create HTTP client for API calls
  const httpClient = createLocalStackHttpClient();

  testLogger.info('✓ Test environment setup complete', {
    services: {
      localStack: readiness.serviceUrls.localstack,
      api: readiness.serviceUrls.api,
      dynamodb: readiness.serviceUrls.dynamodb,
      s3: readiness.serviceUrls.s3
    }
  });

  return {
    httpClient,
    environmentDetector,
    testLogger
  };
}

/**
 * Verifies service health without throwing errors.
 *
 * Useful for conditional test execution or health check reporting.
 *
 * @returns Service readiness status
 *
 * @example
 * ```typescript
 * const status = await checkServiceHealth();
 * if (!status.localStackReady) {
 *   console.warn('LocalStack not available, skipping integration tests');
 *   return;
 * }
 * ```
 */
export async function checkServiceHealth(): Promise<ServiceReadiness> {
  const serviceUrls = environmentDetector.getServiceUrls();

  const [localStackReady, apiReady] = await Promise.all([
    environmentDetector.isLocalStackAvailable(),
    environmentDetector.isApiServerAvailable()
  ]);

  return {
    localStackReady,
    apiReady,
    serviceUrls
  };
}

/**
 * Waits for a specific service to become available.
 *
 * Useful for testing service startup or recovery scenarios.
 *
 * @param service - Service to wait for ('localstack' | 'api')
 * @param timeoutMs - Maximum time to wait (default: 30000ms)
 * @throws {Error} If service is not available within timeout
 *
 * @example
 * ```typescript
 * await waitForService('api', 60000);
 * ```
 */
export async function waitForService(
  service: 'localstack' | 'api',
  timeoutMs: number = 30000
): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 1000; // Check every second

  testLogger.info(`Waiting for ${service} to be ready...`);

  while (Date.now() - startTime < timeoutMs) {
    const isReady = service === 'localstack'
      ? await environmentDetector.isLocalStackAvailable()
      : await environmentDetector.isApiServerAvailable();

    if (isReady) {
      testLogger.info(`✓ ${service} is ready`);
      return;
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`${service} not available after ${timeoutMs}ms timeout`);
}

/**
 * Creates a test context with pre-configured utilities.
 *
 * Useful for sharing setup across multiple test files or suites.
 *
 * @returns Test context object
 *
 * @example
 * ```typescript
 * const testContext = createTestContext();
 *
 * beforeAll(async () => {
 *   await testContext.ensureReady();
 * }, 30000);
 *
 * it('should work', async () => {
 *   const response = await testContext.httpClient.get('/health');
 *   expect(response.status).toBe(200);
 * });
 * ```
 */
export function createTestContext() {
  const httpClient = createLocalStackHttpClient();

  return {
    httpClient,
    environmentDetector,
    testLogger,
    ensureReady: (timeoutMs?: number) => ensureServicesReady(timeoutMs),
    checkHealth: checkServiceHealth,
    waitForService: (service: 'localstack' | 'api', timeoutMs?: number) =>
      waitForService(service, timeoutMs)
  };
}
