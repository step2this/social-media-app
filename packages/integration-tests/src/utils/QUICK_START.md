# Test Setup Utilities - Quick Start

## TL;DR

Replace 20 lines of test setup with 3 lines:

```typescript
const testContext = createTestContext();

beforeAll(async () => {
  await testContext.ensureReady();
}, 30000);
```

## Quick Reference

### Import
```typescript
import { createTestContext } from '../utils/index.js';
```

### Setup
```typescript
const testContext = createTestContext();

beforeAll(async () => {
  await testContext.ensureReady();
}, 30000);
```

### Usage
```typescript
it('should work', async () => {
  // Make API calls
  const response = await testContext.httpClient.get('/api/endpoint');

  // Log information
  testContext.testLogger.info('Test completed');

  // Check service health
  const health = await testContext.checkHealth();
});
```

## What You Get

- `testContext.httpClient` - Pre-configured HTTP client
- `testContext.testLogger` - Logger for test output
- `testContext.environmentDetector` - Environment detector
- `testContext.ensureReady()` - Ensure services are ready
- `testContext.checkHealth()` - Check service health
- `testContext.waitForService()` - Wait for specific service

## Common Patterns

### Basic Test
```typescript
const testContext = createTestContext();

beforeAll(async () => {
  await testContext.ensureReady();
}, 30000);

it('should do something', async () => {
  const response = await testContext.httpClient.get('/health');
  expect(response.status).toBe(200);
});
```

### With Authentication
```typescript
const testContext = createTestContext();

beforeAll(async () => {
  await testContext.ensureReady();

  // Login and get token
  const loginResponse = await testContext.httpClient.post('/auth/login', {
    email: 'test@example.com',
    password: 'password'
  });

  // Set auth token for all subsequent requests
  const token = loginResponse.data.tokens.accessToken;
  testContext.httpClient.setAuthToken(token);
}, 30000);
```

### Conditional Execution
```typescript
const testContext = createTestContext();

beforeAll(async () => {
  const health = await testContext.checkHealth();

  if (!health.localStackReady) {
    console.log('Skipping tests - LocalStack not available');
    return;
  }

  await testContext.ensureReady();
}, 30000);
```

## Error Messages

### LocalStack Not Available
```
LocalStack is not available. Please start LocalStack before running
integration tests. Run: pnpm dev or pnpm quick:localstack
```

### API Server Not Available
```
API server is not available. Please start the backend server before
running integration tests. Run: pnpm dev
```

### Service Timeout
```
Services not ready after 30000ms timeout
```

## Full Example

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestContext } from '../utils/index.js';
import { randomUUID } from 'crypto';

describe('User Registration', () => {
  const testContext = createTestContext();

  beforeAll(async () => {
    testContext.testLogger.info('Starting User Registration Tests');
    await testContext.ensureReady();
    testContext.testLogger.info('Services ready');
  }, 30000);

  it('should register a new user', async () => {
    const uniqueId = randomUUID().slice(0, 8);
    const email = `test-${uniqueId}@example.com`;

    const response = await testContext.httpClient.post('/auth/register', {
      email,
      username: `user${uniqueId}`,
      password: 'Password123!'
    });

    expect(response.status).toBe(201);
    expect(response.data.user.email).toBe(email);

    testContext.testLogger.info('✓ User registered successfully');
  });
});
```

## Alternative: Full Setup

If you need direct access to setup objects:

```typescript
import { setupTestEnvironment } from '../utils/index.js';

let httpClient: HttpClient;

beforeAll(async () => {
  const setup = await setupTestEnvironment();
  httpClient = setup.httpClient;
}, 30000);
```

## Alternative: Minimal Setup

If you only need service validation:

```typescript
import { ensureServicesReady, createLocalStackHttpClient } from '../utils/index.js';

beforeAll(async () => {
  await ensureServicesReady();
  // Custom setup here
}, 30000);
```

## Documentation

- **Full API Reference:** See `TEST_SETUP_README.md`
- **Usage Examples:** See `test-setup.example.ts`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`

## Tips

1. Always use 30-second timeout for `beforeAll`
2. Use `testContext.testLogger` for debugging
3. Check service health before expensive operations
4. Use `createTestContext()` for consistency
5. Clear auth tokens between test suites

## Support

If services won't start:
```bash
pnpm dev                  # Start everything
pnpm quick:localstack     # Restart services
pnpm servers:stop         # Stop all servers
```

See `SERVER_MANAGEMENT.md` for detailed troubleshooting.
