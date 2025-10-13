# Test Setup Utilities

Comprehensive utilities for DRY test environment setup across all integration tests.

## Overview

The test-setup utilities consolidate the repetitive service readiness checks and environment configuration that appears in every integration test file. This reduces boilerplate code and ensures consistent test setup across the entire test suite.

## Files

- **test-setup.ts**: Core utilities for service readiness and environment setup
- **test-setup.example.ts**: Comprehensive usage examples and patterns
- **TEST_SETUP_README.md**: This documentation file

## Core Functions

### `ensureServicesReady(timeoutMs?: number): Promise<ServiceReadiness>`

Ensures all required services (LocalStack and API server) are ready before running tests.

**Parameters:**
- `timeoutMs` (optional): Maximum time to wait for services (default: 30000ms)

**Returns:**
- `ServiceReadiness` object with status and service URLs

**Throws:**
- Error if services are not ready within timeout
- Error with clear message if LocalStack is not available
- Error with clear message if API server is not available

**Example:**
```typescript
beforeAll(async () => {
  await ensureServicesReady();
}, 30000);
```

---

### `setupTestEnvironment(timeoutMs?: number): Promise<TestEnvironmentSetup>`

Complete test environment setup with all required utilities in one call.

**Parameters:**
- `timeoutMs` (optional): Maximum time to wait for services (default: 30000ms)

**Returns:**
- `TestEnvironmentSetup` object containing:
  - `httpClient`: Pre-configured HTTP client for API calls
  - `environmentDetector`: Environment detector for service health checks
  - `testLogger`: Logger for test output

**Example:**
```typescript
let httpClient: HttpClient;

beforeAll(async () => {
  const setup = await setupTestEnvironment();
  httpClient = setup.httpClient;
}, 30000);
```

---

### `createTestContext(): TestContext`

Creates a reusable test context with all utilities and helper methods.

**Returns:**
- Test context object with:
  - `httpClient`: HTTP client for API calls
  - `environmentDetector`: Environment detector
  - `testLogger`: Test logger
  - `ensureReady(timeoutMs?)`: Helper to ensure services are ready
  - `checkHealth()`: Helper to check service health
  - `waitForService(service, timeoutMs?)`: Helper to wait for specific service

**Example:**
```typescript
const testContext = createTestContext();

beforeAll(async () => {
  await testContext.ensureReady();
}, 30000);

it('should work', async () => {
  const response = await testContext.httpClient.get('/health');
  expect(response.status).toBe(200);
});
```

---

### `checkServiceHealth(): Promise<ServiceReadiness>`

Non-throwing service health check for conditional test execution.

**Returns:**
- `ServiceReadiness` object with status and URLs

**Example:**
```typescript
const status = await checkServiceHealth();
if (!status.localStackReady) {
  console.warn('LocalStack not available, skipping tests');
  return;
}
```

---

### `waitForService(service: 'localstack' | 'api', timeoutMs?: number): Promise<void>`

Waits for a specific service to become available.

**Parameters:**
- `service`: Service to wait for ('localstack' or 'api')
- `timeoutMs` (optional): Maximum time to wait (default: 30000ms)

**Throws:**
- Error if service is not available within timeout

**Example:**
```typescript
await waitForService('api', 60000);
```

## Usage Patterns

### Pattern 1: Minimal Setup (Service Validation Only)

Best when you need custom HTTP client configuration or only need service validation.

```typescript
describe('My Integration Test', () => {
  beforeAll(async () => {
    await ensureServicesReady();
    // Custom setup here
  }, 30000);
});
```

**Pros:**
- Minimal overhead
- Maximum flexibility
- Custom client configuration

**Cons:**
- Must manually create HTTP client
- More boilerplate

---

### Pattern 2: Complete Setup (Recommended)

Best for most integration tests - provides everything you need.

```typescript
describe('My Integration Test', () => {
  let httpClient: HttpClient;
  let setup: TestEnvironmentSetup;

  beforeAll(async () => {
    setup = await setupTestEnvironment();
    httpClient = setup.httpClient;
  }, 30000);

  it('should work', async () => {
    const response = await httpClient.get('/api/endpoint');
    expect(response.status).toBe(200);
  });
});
```

**Pros:**
- One-line setup
- All utilities available
- Clean and simple

**Cons:**
- Less flexibility than manual setup

---

### Pattern 3: Test Context (Most Flexible)

Best when sharing test context across multiple test files or when you need all utilities.

```typescript
describe('My Integration Test', () => {
  const testContext = createTestContext();

  beforeAll(async () => {
    await testContext.ensureReady();
    testContext.testLogger.info('Tests starting');
  }, 30000);

  it('should work', async () => {
    const response = await testContext.httpClient.get('/api/endpoint');
    expect(response.status).toBe(200);
  });

  it('should check health', async () => {
    const health = await testContext.checkHealth();
    expect(health.localStackReady).toBe(true);
  });
});
```

**Pros:**
- All utilities accessible
- Helper methods included
- Reusable across tests

**Cons:**
- Slightly more overhead

## Migration Guide

### Before (Old Pattern - Verbose)

```typescript
describe('User Lifecycle Integration', () => {
  const httpClient = createLocalStackHttpClient();

  beforeAll(async () => {
    testLogger.info('Starting tests');
    await environmentDetector.waitForServices(30000);
    const serviceUrls = environmentDetector.getServiceUrls();
    testLogger.debug('Service URLs:', serviceUrls);

    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady) {
      throw new Error('LocalStack is not available. Please start LocalStack...');
    }

    if (!apiReady) {
      throw new Error('API server is not available. Please start the backend...');
    }

    testLogger.info('All required services are ready');
  }, 30000);
});
```

**Lines of code: ~20**

### After (New Pattern - Clean)

```typescript
describe('User Lifecycle Integration', () => {
  const testContext = createTestContext();

  beforeAll(async () => {
    await testContext.ensureReady();
  }, 30000);
});
```

**Lines of code: ~3**

**Reduction: 85% less boilerplate**

## Type Safety

All functions are fully typed with TypeScript:

```typescript
interface ServiceReadiness {
  localStackReady: boolean;
  apiReady: boolean;
  serviceUrls: Record<string, string>;
}

interface TestEnvironmentSetup {
  httpClient: HttpClient;
  environmentDetector: EnvironmentDetector;
  testLogger: TestLogger;
}
```

## Error Messages

All error messages are clear and actionable:

```
LocalStack is not available. Please start LocalStack before running integration tests. Run: pnpm dev or pnpm quick:localstack
```

```
API server is not available. Please start the backend server before running integration tests. Run: pnpm dev
```

## Logging

All functions provide informative logging:

```
[INFO] Checking service readiness...
[DEBUG] Service URLs: { "api": "http://localhost:3001", "localstack": "http://localhost:4566" }
[INFO] ✓ All required services are ready { "localStack": "http://localhost:4566", "api": "http://localhost:3001" }
```

## Best Practices

1. **Always use 30-second timeout for beforeAll**
   ```typescript
   beforeAll(async () => {
     await ensureServicesReady();
   }, 30000);  // Always include timeout
   ```

2. **Use Pattern 3 (Test Context) for new tests**
   ```typescript
   const testContext = createTestContext();
   ```

3. **Log test progress for debugging**
   ```typescript
   testContext.testLogger.info('Starting user registration test');
   ```

4. **Check service health before expensive operations**
   ```typescript
   const health = await testContext.checkHealth();
   if (!health.apiReady) return;
   ```

5. **Use non-throwing health checks for conditional tests**
   ```typescript
   const status = await checkServiceHealth();
   if (!status.localStackReady) {
     console.log('Skipping test - LocalStack not available');
     return;
   }
   ```

## Benefits

### Code Reduction
- **85% less boilerplate** in test setup
- **Consistent patterns** across all tests
- **Easier maintenance** with centralized logic

### Developer Experience
- **Clear error messages** with actionable instructions
- **Type safety** with full TypeScript support
- **Flexible patterns** for different use cases

### Reliability
- **Consistent service checks** across all tests
- **Proper timeout handling** with configurable values
- **Clear logging** for debugging failures

## Related Files

- **environment.ts**: Core environment detection and configuration
- **http-client.ts**: HTTP client for API calls
- **helpers.ts**: Additional test helpers
- **index.ts**: Barrel exports for all utilities

## Support

For questions or issues:
1. Check the examples in `test-setup.example.ts`
2. Review existing integration tests for patterns
3. Consult the SERVER_MANAGEMENT.md for server troubleshooting
