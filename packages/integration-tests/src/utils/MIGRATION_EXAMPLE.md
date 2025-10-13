# Migration Example: Before and After

This document shows a real-world example of migrating an existing test file to use the new test factory functions.

## Before: Original Code (comments-workflow.test.ts)

**Lines of code in `beforeAll`: ~45 lines**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  RegisterResponseSchema,
  CreatePostResponseSchema,
  type RegisterResponse,
  type CreatePostResponse
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  environmentDetector,
  testLogger,
  delay
} from '../utils/index.js';
import {
  createRegisterRequest,
  createPostRequest
} from '../fixtures/index.js';

describe('Comments Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();

  // Test users and posts
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let testPostId: string;

  beforeAll(async () => {
    testLogger.info('Starting Comments Workflow Integration Tests');

    // Wait for services to be ready
    await environmentDetector.waitForServices(30000);

    // Verify services are available
    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady || !apiReady) {
      throw new Error('Required services are not available');
    }

    testLogger.info('All required services are ready');

    // Setup: Create two test users and a post
    const uniqueId1 = randomUUID().slice(0, 8);
    const uniqueId2 = randomUUID().slice(0, 8);

    // Register user 1 (15 lines of boilerplate)
    const user1RegisterRequest = createRegisterRequest()
      .withEmail(`comments-test-user1-${uniqueId1}@tamafriends.local`)
      .withUsername(`commentsuser1_${uniqueId1}`)
      .withPassword('TestPassword123!')
      .build();

    const user1RegisterResponse = await httpClient.post<RegisterResponse>(
      '/auth/register',
      user1RegisterRequest
    );
    const user1RegisterData = await parseResponse(
      user1RegisterResponse,
      RegisterResponseSchema
    );
    user1Token = user1RegisterData.tokens!.accessToken;
    user1Id = user1RegisterData.user.id;

    // Register user 2 (15 lines of boilerplate - DUPLICATE!)
    const user2RegisterRequest = createRegisterRequest()
      .withEmail(`comments-test-user2-${uniqueId2}@tamafriends.local`)
      .withUsername(`commentsuser2_${uniqueId2}`)
      .withPassword('TestPassword123!')
      .build();

    const user2RegisterResponse = await httpClient.post<RegisterResponse>(
      '/auth/register',
      user2RegisterRequest
    );
    const user2RegisterData = await parseResponse(
      user2RegisterResponse,
      RegisterResponseSchema
    );
    user2Token = user2RegisterData.tokens!.accessToken;
    user2Id = user2RegisterData.user.id;

    // Create a test post (10 lines of boilerplate)
    const postRequest = createPostRequest()
      .withCaption('Test post for comments integration')
      .build();

    const createPostResponse = await httpClient.post<CreatePostResponse>(
      '/posts',
      postRequest,
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    const createPostData = await parseResponse(
      createPostResponse,
      CreatePostResponseSchema
    );
    testPostId = createPostData.post.id;

    testLogger.info('Setup complete', { user1Id, user2Id, testPostId });
  }, 30000);

  // Tests...
});
```

## After: Using Test Factories

**Lines of code in `beforeAll`: ~20 lines (55% reduction)**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createLocalStackHttpClient,
  environmentDetector,
  testLogger,
  createTestUsers,
  createTestPost,
  type TestUser
} from '../utils/index.js';

describe('Comments Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();

  // Test users and post
  let user1: TestUser;
  let user2: TestUser;
  let testPostId: string;

  beforeAll(async () => {
    testLogger.info('Starting Comments Workflow Integration Tests');

    // Wait for services to be ready
    await environmentDetector.waitForServices(30000);

    // Verify services are available
    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady || !apiReady) {
      throw new Error('Required services are not available');
    }

    testLogger.info('All required services are ready');

    // Setup: Create two test users in parallel
    [user1, user2] = await createTestUsers(httpClient, {
      prefix: 'comments-test',
      count: 2
    });

    // Create test post
    const { postId } = await createTestPost(httpClient, user1.token, {
      caption: 'Test post for comments integration',
      waitForStreams: true
    });
    testPostId = postId;

    testLogger.info('Setup complete', {
      user1Id: user1.userId,
      user2Id: user2.userId,
      testPostId
    });
  }, 30000);

  // Tests... (no changes needed!)
  it('should create a comment on a post successfully', async () => {
    const createResponse = await httpClient.post(
      '/comments',
      { postId: testPostId, content: 'This is a great post!' },
      { headers: { Authorization: `Bearer ${user1.token}` } }
    );
    // ... rest of test unchanged
  });
});
```

## Key Improvements

### 1. Reduced Boilerplate
- **Before:** 45 lines of setup code
- **After:** 20 lines of setup code
- **Reduction:** 55% fewer lines

### 2. Better Type Safety
- **Before:** Multiple variables (`user1Token`, `user1Id`) to track
- **After:** Single `TestUser` object with all data
- **Benefit:** Less prone to errors, better autocomplete

### 3. Parallel Execution
- **Before:** Users created sequentially (~4 seconds)
- **After:** Users created in parallel (~2 seconds)
- **Benefit:** 50% faster test setup

### 4. Consistency
- **Before:** Easy to forget fields or use inconsistent naming
- **After:** Standardized factory ensures consistency
- **Benefit:** Easier to maintain and debug

### 5. Stream Processing
- **Before:** No explicit delay, counts might be stale
- **After:** `waitForStreams: true` ensures data consistency
- **Benefit:** More reliable tests

## Migration Checklist

For each test file:

- [ ] Import test factories from utils
  ```typescript
  import { createTestUser, createTestPost, createTestUsers } from '../utils/index.js';
  ```

- [ ] Replace user registration boilerplate
  ```typescript
  // Before: ~15 lines
  const uniqueId = randomUUID().slice(0, 8);
  const registerRequest = createRegisterRequest()...

  // After: 1 line
  const user = await createTestUser(httpClient, { prefix: 'test-name' });
  ```

- [ ] Replace post creation boilerplate
  ```typescript
  // Before: ~10 lines
  const postRequest = createPostRequest()...

  // After: 1 line
  const { postId } = await createTestPost(httpClient, user.token, { waitForStreams: true });
  ```

- [ ] Update variable references
  ```typescript
  // Before: user1Token, user1Id
  // After: user1.token, user1.userId
  ```

- [ ] Use bulk factories where appropriate
  ```typescript
  // Before: Create users one by one
  const user1 = await createTestUser(...);
  const user2 = await createTestUser(...);
  const user3 = await createTestUser(...);

  // After: Create in parallel
  const [user1, user2, user3] = await createTestUsers(httpClient, {
    prefix: 'test-name',
    count: 3
  });
  ```

- [ ] Add `waitForStreams: true` where needed
  ```typescript
  const { postId } = await createTestPost(httpClient, user.token, {
    caption: 'Test post',
    waitForStreams: true // Wait for counts to update
  });
  ```

- [ ] Run tests to verify migration
  ```bash
  pnpm test your-test-file.test.ts
  ```

## Common Patterns to Look For

### Pattern 1: Repeated User Creation
If you see this pattern 2+ times in a file:
```typescript
const uniqueId = randomUUID().slice(0, 8);
const registerRequest = createRegisterRequest()
  .withEmail(`test-${uniqueId}@tamafriends.local`)
  // ...
```

Replace with:
```typescript
const user = await createTestUser(httpClient, { prefix: 'your-test' });
```

### Pattern 2: Sequential User Creation
If you see users created one after another:
```typescript
const user1 = await createTestUser(...);
const user2 = await createTestUser(...);
const user3 = await createTestUser(...);
```

Replace with:
```typescript
const [user1, user2, user3] = await createTestUsers(httpClient, {
  prefix: 'your-test',
  count: 3
});
```

### Pattern 3: Post Creation Without Delays
If tests fail intermittently with incorrect counts:
```typescript
const { postId } = await createTestPost(httpClient, user.token);
// Later: Expect counts to be updated (might fail!)
```

Add stream processing delay:
```typescript
const { postId } = await createTestPost(httpClient, user.token, {
  waitForStreams: true
});
// Counts are now guaranteed to be updated
```

## Files That Could Benefit

The following test files would benefit from migration:

1. ✅ `comments-workflow.test.ts` - Example shown above
2. ✅ `likes-workflow.test.ts` - 2 users + 1 post pattern
3. ✅ `follows-workflow.test.ts` - 3 users pattern
4. ✅ `feed-workflow.test.ts` - Multiple users + posts pattern
5. ✅ `notifications-workflow.test.ts` - Multiple users + posts
6. ✅ `user-lifecycle.test.ts` - Single user pattern
7. ✅ `feed-read-state.test.ts` - Multiple users + posts pattern
8. ⚠️ `image-upload.test.ts` - Special case (uses presigned URLs)

## Testing Your Migration

After migrating a test file:

```bash
# Run the specific test
pnpm test your-test-file.test.ts

# Run all integration tests
pnpm test:integration

# Check for type errors
pnpm tsc --noEmit
```

## Questions?

- See `TEST_FACTORIES_README.md` for detailed API documentation
- See `test-factories.example.ts` for more usage examples
- See `test-factories.test.ts` for implementation tests
