# Migration Example: Using Shared Test Utilities

This document shows a real-world example of migrating from duplicated test code to using the shared test utilities.

## Before: Duplicated Code

Here's what a typical test file looked like before (from `profile.service.test.ts`):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileService } from './profile.service';

// ❌ DUPLICATED: Mock AWS SDK (found in 2 test files)
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed-url')
}));

// ❌ DUPLICATED: Mock DynamoDB Command Interface (found in 27+ test files)
interface MockDynamoCommand {
  readonly constructor: { readonly name: string };
  readonly input: {
    readonly TableName?: string;
    readonly Item?: Record<string, unknown>;
    readonly Key?: Record<string, unknown>;
    readonly IndexName?: string;
    readonly KeyConditionExpression?: string;
    readonly ExpressionAttributeValues?: Record<string, unknown>;
    readonly Limit?: number;
    readonly UpdateExpression?: string;
    readonly ExpressionAttributeNames?: Record<string, unknown>;
    readonly ReturnValues?: string;
    readonly ConditionExpression?: string;
  };
}

// ❌ DUPLICATED: Mock DynamoDB Client (150+ lines, found in 27+ test files)
const createMockDynamoClient = () => {
  const items = new Map<string, Record<string, unknown>>();
  const gsi3Items = new Map<string, Record<string, unknown>[]>();

  const updateGSI3 = (item: Record<string, unknown>) => {
    const gsi3Key = item.GSI3PK as string;
    if (gsi3Key) {
      if (!gsi3Items.has(gsi3Key)) {
        gsi3Items.set(gsi3Key, []);
      }
      gsi3Items.get(gsi3Key)!.push(item);
    }
  };

  const handleGetCommand = (command: MockDynamoCommand) => {
    const { Key } = command.input;
    const key = `${Key!.PK}#${Key!.SK}`;
    const item = items.get(key);
    return { Item: item };
  };

  const handleQueryCommand = (command: MockDynamoCommand) => {
    // 30+ more lines...
  };

  const handleUpdateCommand = (command: MockDynamoCommand) => {
    // 60+ more lines of expression parsing...
  };

  return {
    send: vi.fn().mockImplementation((command: MockDynamoCommand) => {
      switch (command.constructor.name) {
        case 'GetCommand':
          return Promise.resolve(handleGetCommand(command));
        case 'QueryCommand':
          return Promise.resolve(handleQueryCommand(command));
        case 'UpdateCommand':
          return Promise.resolve(handleUpdateCommand(command));
        default:
          return Promise.reject(new Error(`Unknown command`));
      }
    }),
    _getItems: () => items,
    _getGSI3Items: () => gsi3Items,
    _setItem: (key: string, item: Record<string, unknown>) => {
      items.set(key, item);
      updateGSI3(item);
    }
  };
};

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockDynamoClient: ReturnType<typeof createMockDynamoClient>;

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    profileService = new ProfileService(
      mockDynamoClient as unknown as DynamoDBDocumentClient,
      'test-table'
    );
  });

  it('should return profile when found', async () => {
    mockDynamoClient._setItem('USER#123#PROFILE', {
      PK: 'USER#123',
      SK: 'PROFILE',
      id: '123',
      username: 'testuser'
    });

    const result = await profileService.getProfileById('123');
    expect(result?.username).toBe('testuser');
  });
});
```

**Total Lines**: ~167 lines of duplicated mock code
**Found In**: 27+ test files
**Maintenance**: Update in 27+ places when behavior changes

---

## After: Using Shared Test Utilities

Here's the same test file using shared utilities:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileService } from './profile.service';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createMockDynamoClient, setupS3Mocks } from '@social-media-app/shared/test-utils';

// ✅ CLEAN: One-line S3 setup
setupS3Mocks();

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockDynamoClient: ReturnType<typeof createMockDynamoClient>;

  beforeEach(() => {
    // ✅ CLEAN: One-line DynamoDB client creation
    mockDynamoClient = createMockDynamoClient();
    profileService = new ProfileService(
      mockDynamoClient as unknown as DynamoDBDocumentClient,
      'test-table'
    );
  });

  it('should return profile when found', async () => {
    mockDynamoClient._setItem('USER#123#PROFILE', {
      PK: 'USER#123',
      SK: 'PROFILE',
      id: '123',
      username: 'testuser'
    });

    const result = await profileService.getProfileById('123');
    expect(result?.username).toBe('testuser');
  });
});
```

**Total Lines**: ~10 lines (including imports)
**Found In**: Shared package, imported everywhere
**Maintenance**: Update once, applies to all 27+ test files

---

## Lambda Handler Example

### Before: API Gateway Event Mock

```typescript
import { handler } from './like-post.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// ❌ DUPLICATED: Mock event creator (found in many handler tests)
const createMockEvent = (body?: string, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'POST /likes',
  rawPath: '/likes',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader })
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'POST',
      path: '/likes',
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent'
    },
    stage: 'test',
    time: '2024-01-01T00:00:00.000Z',
    timeEpoch: 1704067200000,
    domainName: 'api.example.com',
    accountId: '123456789012',
    apiId: 'api123',
    routeKey: 'POST /likes',
    domainPrefix: 'api'
  },
  body: body || '',
  isBase64Encoded: false
});

// ❌ DUPLICATED: Mock JWT
const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0In0.test';

describe('like-post handler', () => {
  it('should like a post', async () => {
    const event = createMockEvent(
      JSON.stringify({ postId: '123' }),
      `Bearer ${mockJWT}`
    );

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });
});
```

### After: Using Shared Utilities

```typescript
import { handler } from './like-post.js';
import { createMockAPIGatewayEvent, createMockJWT } from '@social-media-app/shared/test-utils';

describe('like-post handler', () => {
  it('should like a post', async () => {
    // ✅ CLEAN: One-line event creation with auto-stringified body
    const event = createMockAPIGatewayEvent({
      body: { postId: '123' },
      authHeader: `Bearer ${createMockJWT()}`
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });
});
```

---

## Complex Example: Full Test Suite

### Before

```typescript
// 150+ lines of duplicated mock setup code
const createMockDynamoClient = () => { /* ... */ };
const createMockEvent = () => { /* ... */ };

// Mock setup
vi.mock('@aws-sdk/client-s3', () => ({ /* ... */ }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ /* ... */ }));

describe('CommentService', () => {
  let service: CommentService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockDynamoClient();
    service = new CommentService(mockClient as any, 'test-table');
  });

  it('should create comment', async () => {
    // Test implementation
  });
});
```

### After

```typescript
import { createMockDynamoClient } from '@social-media-app/shared/test-utils';

describe('CommentService', () => {
  let service: CommentService;
  let mockClient: ReturnType<typeof createMockDynamoClient>;

  beforeEach(() => {
    mockClient = createMockDynamoClient();
    service = new CommentService(mockClient as any, 'test-table');
  });

  it('should create comment', async () => {
    // Test implementation (exactly the same)
  });
});
```

---

## Impact Across the Codebase

### Files Affected (27+)

**DAL Service Tests:**
- `profile.service.test.ts` - 167 lines removed
- `follow.service.test.ts` - 95 lines removed
- `like.service.test.ts` - Similar savings
- `comment.service.test.ts` - Similar savings
- `notification.service.test.ts` - Similar savings
- `post.service.test.ts` - Similar savings
- `feed.service.test.ts` - Similar savings
- `auth.service.test.ts` - Similar savings

**Backend Handler Tests:**
- `like-post.test.ts` - Mock event and DynamoDB setup
- `unlike-post.test.ts` - Similar pattern
- `create-comment.test.ts` - Similar pattern
- `delete-comment.test.ts` - Similar pattern
- `get-comments.test.ts` - Similar pattern
- `follow-user.test.ts` - Similar pattern
- `unfollow-user.test.ts` - Similar pattern
- `get-follow-status.test.ts` - Similar pattern
- Plus 15+ more handler tests

**Stream Processor Tests:**
- `like-counter.test.ts`
- `comment-counter.test.ts`
- `follow-counter.test.ts`
- `notification-processor.test.ts`

### Total Impact

- **Lines Removed**: ~4,000+ lines of duplicated code
- **Files Simplified**: 27+ test files
- **Maintenance Points**: 27 → 1 (96% reduction)
- **Consistency**: 100% (all tests use same mocks)
- **Type Safety**: Improved (comprehensive TypeScript types)

---

## Migration Checklist

When migrating a test file:

1. ✅ Import utilities from `@social-media-app/shared/test-utils`
2. ✅ Replace local `createMockDynamoClient` with imported version
3. ✅ Replace local `createMockEvent` with `createMockAPIGatewayEvent`
4. ✅ Replace hardcoded JWT with `createMockJWT()`
5. ✅ Replace S3 mock setup with `setupS3Mocks()`
6. ✅ Remove duplicated interface definitions
7. ✅ Run tests to verify behavior unchanged
8. ✅ Remove old mock code

---

## Next Steps

1. **Gradual Migration**: Migrate test files incrementally
2. **Team Communication**: Share this guide with the team
3. **CI/CD**: Ensure all tests pass after migration
4. **Documentation**: Keep this example up to date as utilities evolve
5. **Extend**: Add new utilities as patterns emerge
