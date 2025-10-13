/**
 * Example Usage of Test Setup Utilities
 *
 * This file demonstrates how to use the test-setup utilities
 * to simplify integration test setup.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  ensureServicesReady,
  setupTestEnvironment,
  createTestContext,
  type TestEnvironmentSetup
} from './test-setup.js';
import type { HttpClient } from './http-client.js';

/**
 * Example 1: Using ensureServicesReady() for minimal setup
 *
 * Best when you need custom HTTP client configuration
 * or only need service validation.
 */
describe('Example 1: Minimal Setup with ensureServicesReady', () => {
  beforeAll(async () => {
    // Just ensure services are ready
    await ensureServicesReady();

    // Then do your custom setup
    // const customClient = new HttpClient({ ... });
  }, 30000);

  it('should have services ready', () => {
    expect(true).toBe(true);
  });
});

/**
 * Example 2: Using setupTestEnvironment() for complete setup
 *
 * Best for most integration tests - provides everything you need.
 */
describe('Example 2: Complete Setup with setupTestEnvironment', () => {
  let httpClient: HttpClient;
  let setup: TestEnvironmentSetup;

  beforeAll(async () => {
    // Get complete test environment with one call
    setup = await setupTestEnvironment();
    httpClient = setup.httpClient;

    // Access logger: setup.testLogger.info('Starting tests');
    // Access detector: setup.environmentDetector.getServiceUrls();
  }, 30000);

  it('should have HTTP client ready', () => {
    expect(httpClient).toBeDefined();
    expect(setup.environmentDetector).toBeDefined();
    expect(setup.testLogger).toBeDefined();
  });
});

/**
 * Example 3: Using createTestContext() for reusable context
 *
 * Best when sharing test context across multiple test files
 * or when you need access to all utilities.
 */
describe('Example 3: Test Context Pattern', () => {
  const testContext = createTestContext();

  beforeAll(async () => {
    // Ensure services are ready using the context
    await testContext.ensureReady();

    // All utilities are available on the context
    testContext.testLogger.info('Test context initialized');
  }, 30000);

  it('should make API calls', async () => {
    // Use the HTTP client from context
    const response = await testContext.httpClient.get('/health');
    expect(response.status).toBe(200);
  });

  it('should check service health', async () => {
    const health = await testContext.checkHealth();
    expect(health.localStackReady).toBe(true);
    expect(health.apiReady).toBe(true);
  });
});

/**
 * Example 4: Real-world integration test pattern
 *
 * This is the recommended pattern for most integration tests.
 */
describe('Example 4: Real Integration Test', () => {
  const testContext = createTestContext();

  beforeAll(async () => {
    testContext.testLogger.info('Starting Real Integration Test');
    await testContext.ensureReady(30000);
    testContext.testLogger.info('Services ready, beginning tests');
  }, 30000);

  it('should complete user workflow', async () => {
    // 1. Create a user
    const registerResponse = await testContext.httpClient.post('/auth/register', {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPassword123!'
    });

    expect(registerResponse.status).toBe(201);

    // 2. Login
    const loginResponse = await testContext.httpClient.post('/auth/login', {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });

    expect(loginResponse.status).toBe(200);

    // 3. Set auth token
    const { accessToken } = loginResponse.data.tokens;
    testContext.httpClient.setAuthToken(accessToken);

    // 4. Get profile
    const profileResponse = await testContext.httpClient.get('/auth/profile');
    expect(profileResponse.status).toBe(200);

    testContext.testLogger.info('✓ User workflow completed successfully');
  });
});

/**
 * Example 5: Conditional test execution based on service availability
 *
 * Useful for CI/CD environments where some services might not be available.
 */
describe('Example 5: Conditional Test Execution', () => {
  const testContext = createTestContext();

  beforeAll(async () => {
    const health = await testContext.checkHealth();

    if (!health.localStackReady) {
      testContext.testLogger.warn('LocalStack not available, skipping tests');
      return;
    }

    if (!health.apiReady) {
      testContext.testLogger.warn('API server not available, skipping tests');
      return;
    }

    testContext.testLogger.info('All services available, running tests');
  }, 30000);

  it('should run when services are available', async () => {
    const health = await testContext.checkHealth();

    if (!health.localStackReady || !health.apiReady) {
      console.log('Skipping test - services not available');
      return;
    }

    // Run actual test
    const response = await testContext.httpClient.get('/health');
    expect(response.status).toBe(200);
  });
});

/**
 * Migration Guide: Before and After
 *
 * BEFORE (old pattern - verbose and repetitive):
 */
describe('Old Pattern - Verbose', () => {
  beforeAll(async () => {
    // testLogger.info('Starting tests');
    // await environmentDetector.waitForServices(30000);
    // const serviceUrls = environmentDetector.getServiceUrls();
    // testLogger.debug('Service URLs:', serviceUrls);
    // const localStackReady = await environmentDetector.isLocalStackAvailable();
    // const apiReady = await environmentDetector.isApiServerAvailable();
    // if (!localStackReady) {
    //   throw new Error('LocalStack is not available...');
    // }
    // if (!apiReady) {
    //   throw new Error('API server is not available...');
    // }
    // testLogger.info('All required services are ready');
  }, 30000);
});

/**
 * AFTER (new pattern - clean and DRY):
 */
describe('New Pattern - Clean', () => {
  const testContext = createTestContext();

  beforeAll(async () => {
    await testContext.ensureReady();
    // That's it! Everything is ready.
  }, 30000);
});
