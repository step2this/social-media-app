# Test Factory Functions

## Overview

The test factory functions in `test-factories.ts` provide DRY (Don't Repeat Yourself) utilities for creating test users and posts across integration test files. These factories eliminate boilerplate code that was previously duplicated 2-4 times per test file.

## Why Use These Factories?

**Before (Repeated in every test file):**
```typescript
// 15-20 lines of boilerplate per user
const uniqueId = randomUUID().slice(0, 8);
const registerRequest = createRegisterRequest()
  .withEmail(`test-user-${uniqueId}@tamafriends.local`)
  .withUsername(`testuser_${uniqueId}`)
  .withPassword('TestPassword123!')
  .build();
const registerResponse = await httpClient.post<RegisterResponse>('/auth/register', registerRequest);
const registerData = await parseResponse(registerResponse, RegisterResponseSchema);
const token = registerData.tokens!.accessToken;
const userId = registerData.user.id;
```

**After (Single line):**
```typescript
const user = await createTestUser(httpClient, { prefix: 'likes-test' });
// user.token, user.userId, user.email, user.username ready to use
```

## Core Factory Functions

### `createTestUser(httpClient, options)`

Creates a single test user with registration and authentication.

**Parameters:**
- `httpClient`: HttpClient instance
- `options`: Optional configuration
  - `prefix`: Prefix for email/username (default: 'test')
  - `email`: Override email generation
  - `username`: Override username generation
  - `password`: Password (default: 'TestPassword123!')

**Returns:** `TestUser` object with:
- `token`: JWT access token
- `userId`: User's UUID
- `email`: Generated/custom email
- `username`: Generated/custom username
- `handle`: User's handle (optional, fetch via profile endpoint)

**Examples:**
```typescript
// Basic usage with default prefix
const user = await createTestUser(httpClient);
// user.email = 'test-user-abc123@tamafriends.local'

// With custom prefix for test organization
const user = await createTestUser(httpClient, { prefix: 'likes-test' });
// user.email = 'likes-test-user-abc123@tamafriends.local'

// With fully custom credentials
const user = await createTestUser(httpClient, {
  email: 'custom@example.com',
  username: 'customuser'
});
```

### `createTestPost(httpClient, token, options)`

Creates a single test post for an authenticated user.

**Parameters:**
- `httpClient`: HttpClient instance
- `token`: JWT access token
- `options`: Optional configuration
  - `caption`: Post caption (default: 'Test post caption')
  - `tags`: Array of tags (default: ['test', 'integration'])
  - `isPublic`: Visibility (default: true)
  - `waitForStreams`: Wait 3s for DynamoDB Streams (default: false)

**Returns:** `TestPost` object with:
- `postId`: Post's UUID
- `post`: Full Post object with metadata

**Important Note on Stream Processing:**
When `waitForStreams: true`, the function waits 3 seconds for DynamoDB Stream processors to update post counts (likesCount, commentsCount). Without this delay, counts will be 0 immediately after creation.

**Examples:**
```typescript
// Quick post creation
const { postId } = await createTestPost(httpClient, user.token);

// With custom content
const { post } = await createTestPost(httpClient, user.token, {
  caption: 'Testing likes feature',
  tags: ['test', 'likes'],
  waitForStreams: true
});

// Private post
const { post } = await createTestPost(httpClient, user.token, {
  isPublic: false
});
```

### `createTestUsers(httpClient, options)`

Creates multiple test users in parallel for efficiency.

**Parameters:**
- `httpClient`: HttpClient instance
- `options`: Configuration
  - `prefix`: Prefix for all users
  - `count`: Number of users to create (required)
  - `password`: Shared password (default: 'TestPassword123!')

**Returns:** `TestUser[]` array

**Examples:**
```typescript
// Create 3 users for follow testing
const [user1, user2, user3] = await createTestUsers(httpClient, {
  prefix: 'follow-test',
  count: 3
});

// Create 5 users with custom password
const users = await createTestUsers(httpClient, {
  prefix: 'bulk-test',
  count: 5,
  password: 'CustomPassword123!'
});
```

### `createTestPosts(httpClient, token, count, options)`

Creates multiple test posts for a user in parallel.

**Parameters:**
- `httpClient`: HttpClient instance
- `token`: JWT access token
- `count`: Number of posts to create
- `options`: Optional configuration (same as `createTestPost`)

**Returns:** `TestPost[]` array

**Examples:**
```typescript
// Create 5 posts for feed testing
const posts = await createTestPosts(httpClient, user.token, 5, {
  waitForStreams: true
});

// Create with custom options
const posts = await createTestPosts(httpClient, user.token, 3, {
  caption: 'Custom post',
  tags: ['custom'],
  isPublic: false
});
```

## TypeScript Types

### `TestUser` Interface
```typescript
interface TestUser {
  token: string;        // JWT access token
  userId: string;       // UUID
  email: string;        // User's email
  username: string;     // User's username
  handle?: string;      // User's handle (optional)
}
```

### `TestPost` Interface
```typescript
interface TestPost {
  postId: string;       // UUID
  post: Post;           // Full post object with metadata
}
```

## Common Patterns

### Pattern 1: Likes Testing Setup
```typescript
describe('Likes Workflow', () => {
  let user1: TestUser;
  let user2: TestUser;
  let testPostId: string;

  beforeAll(async () => {
    // Create users in parallel
    [user1, user2] = await createTestUsers(httpClient, {
      prefix: 'likes-test',
      count: 2
    });

    // Create post to be liked
    const { postId } = await createTestPost(httpClient, user1.token, {
      caption: 'Post for likes testing',
      waitForStreams: true
    });
    testPostId = postId;
  });

  // Tests here...
});
```

### Pattern 2: Comments Testing Setup
```typescript
describe('Comments Workflow', () => {
  let postOwner: TestUser;
  let commenter1: TestUser;
  let commenter2: TestUser;
  let testPostId: string;

  beforeAll(async () => {
    // Create three users
    [postOwner, commenter1, commenter2] = await createTestUsers(httpClient, {
      prefix: 'comments-test',
      count: 3
    });

    // Create post for commenting
    const { postId } = await createTestPost(httpClient, postOwner.token, {
      caption: 'Post for comments',
      waitForStreams: true
    });
    testPostId = postId;
  });

  // Tests here...
});
```

### Pattern 3: Feed Testing Setup
```typescript
describe('Feed Workflow', () => {
  let user1: TestUser;
  let user2: TestUser;
  let user1Posts: TestPost[];
  let user2Posts: TestPost[];

  beforeAll(async () => {
    // Create users
    [user1, user2] = await createTestUsers(httpClient, {
      prefix: 'feed-test',
      count: 2
    });

    // Create posts for each user in parallel
    [user1Posts, user2Posts] = await Promise.all([
      createTestPosts(httpClient, user1.token, 3, { waitForStreams: true }),
      createTestPosts(httpClient, user2.token, 3, { waitForStreams: true })
    ]);

    // 6 total posts ready for feed testing
  });

  // Tests here...
});
```

## Performance Benefits

### Parallel Execution
All `createTestUsers()` and `createTestPosts()` functions use `Promise.all()` for parallel execution, significantly reducing test setup time.

**Sequential (slow):**
```typescript
// ~6 seconds for 3 users
const user1 = await createTestUser(httpClient);
const user2 = await createTestUser(httpClient);
const user3 = await createTestUser(httpClient);
```

**Parallel (fast):**
```typescript
// ~2 seconds for 3 users
const [user1, user2, user3] = await createTestUsers(httpClient, { count: 3 });
```

## Migration Guide

To migrate existing tests to use these factories:

1. **Find repeated user registration code** (15-20 lines)
2. **Replace with:** `const user = await createTestUser(httpClient, { prefix: 'your-test' })`
3. **Find repeated post creation code** (10-15 lines)
4. **Replace with:** `const { postId } = await createTestPost(httpClient, user.token, { waitForStreams: true })`
5. **Update beforeAll hooks** to use bulk factories where appropriate

## Files

- `test-factories.ts` - Main factory functions
- `test-factories.test.ts` - Unit tests for factories
- `test-factories.example.ts` - Usage examples
- `TEST_FACTORIES_README.md` - This documentation

## Testing the Factories

The factories themselves have comprehensive unit tests in `test-factories.test.ts`:

```bash
# Run factory tests
pnpm test test-factories.test.ts
```

## Best Practices

1. **Always use prefixes** in test setup to namespace your test data
2. **Use `waitForStreams: true`** when you need accurate counts immediately
3. **Create users in parallel** with `createTestUsers()` for multiple users
4. **Organize test data** in `beforeAll` hooks using these factories
5. **Keep options objects readonly** for immutability (already enforced by TypeScript)

## Troubleshooting

### Issue: Counts are always 0
**Solution:** Add `waitForStreams: true` option when creating posts

### Issue: Email/username conflicts
**Solution:** Use unique prefixes for each test suite

### Issue: Authentication failing
**Solution:** Verify the token is being passed correctly and hasn't expired

## Future Enhancements

Potential additions to consider:
- `createTestComment(httpClient, token, postId, content)` - Comment factory
- `createTestFollow(httpClient, token, targetUserId)` - Follow relationship factory
- `createTestLike(httpClient, token, postId)` - Like factory
- `createTestNotification(...)` - Notification factory

These would follow the same patterns established by the current factories.
