# Shared Test Utilities

Reusable AWS mock utilities for testing across the monorepo. These utilities eliminate code duplication across 27+ test files and provide consistent, well-tested mock behavior.

## Installation

The test utilities are part of the `@social-media-app/shared` package and are available via the `/test-utils` subpath export:

```typescript
import {
  createMockDynamoClient,
  createMockAPIGatewayEvent,
  createMockJWT
} from '@social-media-app/shared/test-utils';
```

## Available Utilities

### `createMockDynamoClient(options?)`

Creates a fully-functional mock DynamoDB DocumentClient for testing.

**Supported Commands:**
- `GetCommand` - Retrieve items by PK/SK
- `QueryCommand` - Query with PK and SK prefix, supports GSI2 and GSI3
- `UpdateCommand` - Update items with expression parsing
- `PutCommand` - Create items with condition expressions
- `DeleteCommand` - Remove items

**Update Expression Support:**
- Counter operations: `postsCount = postsCount + :inc`
- Counter with if_not_exists: `postsCount = if_not_exists(postsCount, :zero) + :inc`
- Simple SET operations: `#handle = :handle`, `#bio = :bio`
- Profile picture updates: `profilePictureUrl = :url`
- GSI3 updates: `GSI3PK = :gsi3pk`

**Condition Expression Support:**
- `attribute_not_exists(PK)` - Prevent duplicate items
- `postsCount > :zero` - Conditional updates

**Helper Methods:**
- `_setItem(key, item)` - Set an item directly for test setup
- `_getItems()` - Get all stored items
- `_getGSI3Items()` - Get GSI3 index items
- `_clear()` - Clear all data

**Example:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockDynamoClient } from '@social-media-app/shared/test-utils';
import { ProfileService } from '@social-media-app/dal';

describe('ProfileService', () => {
  let mockClient: ReturnType<typeof createMockDynamoClient>;
  let service: ProfileService;

  beforeEach(() => {
    mockClient = createMockDynamoClient();
    service = new ProfileService(mockClient as any, 'test-table');
  });

  it('should retrieve a profile', async () => {
    // Setup test data
    mockClient._setItem('USER#123#PROFILE', {
      PK: 'USER#123',
      SK: 'PROFILE',
      id: '123',
      username: 'testuser',
      handle: 'testhandle'
    });

    // Test
    const profile = await service.getProfileById('123');

    expect(profile?.username).toBe('testuser');
  });
});
```

### `createMockAPIGatewayEvent(config?)`

Creates a realistic APIGatewayProxyEventV2 for testing Lambda handlers.

**Configuration:**
```typescript
interface APIGatewayEventConfig {
  body?: string | Record<string, unknown>;  // Auto-stringified if object
  authHeader?: string;                       // Authorization header
  method?: string;                           // HTTP method (default: 'POST')
  path?: string;                             // Request path (default: '/api')
  routeKey?: string;                         // Route key (auto-generated)
  headers?: Record<string, string>;          // Additional headers
  queryStringParameters?: Record<string, string>;
  sourceIp?: string;                         // Source IP (default: '127.0.0.1')
  userAgent?: string;                        // User agent (default: 'test-agent')
}
```

**Example:**
```typescript
import { createMockAPIGatewayEvent, createMockJWT } from '@social-media-app/shared/test-utils';
import { handler } from './like-post.js';

describe('like-post handler', () => {
  it('should like a post', async () => {
    const event = createMockAPIGatewayEvent({
      body: { postId: '123e4567-e89b-12d3-a456-426614174001' },
      authHeader: `Bearer ${createMockJWT('user-123')}`
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
  });

  it('should support GET requests', async () => {
    const event = createMockAPIGatewayEvent({
      method: 'GET',
      path: '/posts/123',
      routeKey: 'GET /posts/{id}',
      queryStringParameters: { limit: '10' }
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });
});
```

### `setupS3Mocks(config?)`

Sets up S3-related mocks (S3Client and getSignedUrl).

**Configuration:**
```typescript
interface S3MockConfig {
  defaultPresignedUrl?: string;  // Default: 'https://example.com/signed-url'
  getSignedUrlMock?: ReturnType<typeof vi.fn>;  // Custom mock function
}
```

**Example:**
```typescript
import { vi } from 'vitest';
import { setupS3Mocks } from '@social-media-app/shared/test-utils';

// Basic setup
setupS3Mocks();

// Custom presigned URL
setupS3Mocks({
  defaultPresignedUrl: 'https://my-bucket.s3.amazonaws.com/upload'
});

// Custom behavior
setupS3Mocks({
  getSignedUrlMock: vi.fn().mockImplementation(async (client, command) => {
    return `https://custom-url.com/${command.input.Key}`;
  })
});
```

### `createMockJWT(userId?)`

Creates a mock JWT token for testing.

**Example:**
```typescript
import { createMockJWT } from '@social-media-app/shared/test-utils';

const token = createMockJWT('user-123');
// Returns: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.user-123'

const event = createMockAPIGatewayEvent({
  authHeader: `Bearer ${token}`
});
```

### `isConditionalCheckFailedException(error)`

Type guard to check if an error is a ConditionalCheckFailedException.

**Example:**
```typescript
import { isConditionalCheckFailedException } from '@social-media-app/shared/test-utils';

try {
  await service.createItem(item);
} catch (error) {
  if (isConditionalCheckFailedException(error)) {
    // Handle duplicate item gracefully
    return existingItem;
  }
  throw error;
}
```

## Migration Guide

### Before (Duplicated Code)

```typescript
// In every test file (150+ lines of duplicated code)
const createMockDynamoClient = () => {
  const items = new Map();
  return {
    send: vi.fn(async (command) => {
      // Complex implementation...
    })
  };
};

const createMockEvent = (body, authHeader) => ({
  version: '2.0',
  routeKey: 'POST /likes',
  // 30+ lines of boilerplate...
});
```

### After (Clean Imports)

```typescript
import {
  createMockDynamoClient,
  createMockAPIGatewayEvent,
  createMockJWT
} from '@social-media-app/shared/test-utils';

const mockClient = createMockDynamoClient();
const event = createMockAPIGatewayEvent({
  body: { postId: '123' },
  authHeader: `Bearer ${createMockJWT()}`
});
```

## Advanced Usage

### Custom Command Handlers

```typescript
const mockClient = createMockDynamoClient({
  customHandlers: {
    'TransactWriteCommand': async (command) => {
      // Custom transactional write logic
      return { $metadata: {} };
    }
  }
});
```

### Disabling GSI Support

```typescript
const mockClient = createMockDynamoClient({
  enableGSI3: false,  // Disable GSI3 (handle lookups)
  enableGSI2: false   // Disable GSI2 (user-based queries)
});
```

### Asserting DynamoDB Operations

```typescript
it('should use correct DynamoDB keys', async () => {
  const mockClient = createMockDynamoClient();
  const service = new LikeService(mockClient as any, 'test-table');

  await service.likePost('user-123', 'post-456');

  // Access sent commands
  const putCommand = mockClient.send.mock.calls.find(
    call => call[0].constructor.name === 'PutCommand'
  );

  expect(putCommand[0].input.Item.PK).toBe('POST#post-456');
  expect(putCommand[0].input.Item.SK).toBe('LIKE#user-123');
});
```

## Benefits

1. **Eliminates Duplication**: 150+ lines of mock code reduced to single import
2. **Consistent Behavior**: All tests use same well-tested mocks
3. **Better Maintenance**: Update once, applies everywhere
4. **Type Safety**: Full TypeScript support with exported types
5. **Comprehensive**: Covers all DynamoDB commands and AWS services
6. **Well Documented**: JSDoc comments and examples
7. **Battle Tested**: Used in 27+ test files across the monorepo

## TypeScript Types

All utilities export comprehensive TypeScript types:

```typescript
import type {
  MockDynamoClient,
  MockDynamoCommand,
  MockDynamoClientOptions,
  APIGatewayEventConfig,
  S3MockConfig
} from '@social-media-app/shared/test-utils';
```

## Testing the Test Utilities

The test utilities themselves are thoroughly tested. See `aws-mocks.test.ts` for comprehensive test coverage including:

- All DynamoDB commands (Get, Put, Query, Update, Delete)
- GSI queries (GSI2 and GSI3)
- Counter operations (increment/decrement)
- Condition expressions
- API Gateway event generation
- JWT token creation
- Error type guards

## Contributing

When adding new features to the test utilities:

1. Add the new utility to `aws-mocks.ts`
2. Export it from `index.ts`
3. Add comprehensive tests to `aws-mocks.test.ts`
4. Update this README with usage examples
5. Rebuild the shared package: `pnpm build`

## See Also

- [DynamoDB DocumentClient Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_lib_dynamodb.html)
- [API Gateway Event Format](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html)
- [Vitest Documentation](https://vitest.dev/)
