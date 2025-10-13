# Test Assertions Utility - Usage Examples

This document demonstrates how to use the test assertion helpers to reduce boilerplate in integration tests.

## Before and After Comparison

### Example 1: Testing Unauthorized Access

**Before (Manual try-catch):**
```typescript
it('should return 401 when liking without authentication', async () => {
  try {
    await httpClient.post<LikePostResponse>('/likes', { postId: testPostId });
    expect.fail('Should have thrown an error');
  } catch (error: any) {
    expect(error.status).toBe(401);
  }
});
```

**After (Using helper):**
```typescript
it('should return 401 when liking without authentication', async () => {
  await expectUnauthorized(async () => {
    await httpClient.post<LikePostResponse>('/likes', { postId: testPostId });
  });
});
```

---

### Example 2: Testing Validation Errors

**Before (Manual try-catch):**
```typescript
it('should reject comment with invalid postId', async () => {
  try {
    await httpClient.post<CreateCommentResponse>(
      '/comments',
      { postId: 'not-a-uuid', content: 'Test comment' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect.fail('Should have thrown an error');
  } catch (error: any) {
    expect(error.status).toBe(400);
  }
});
```

**After (Using helper):**
```typescript
it('should reject comment with invalid postId', async () => {
  await expectValidationError(async () => {
    await httpClient.post<CreateCommentResponse>(
      '/comments',
      { postId: 'not-a-uuid', content: 'Test comment' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  });
});
```

---

### Example 3: Testing Idempotency

**Before (Manual repetition):**
```typescript
it('should be idempotent when liking the same post twice', async () => {
  // First like
  const firstResponse = await httpClient.post<LikePostResponse>(
    '/likes',
    { postId: testPostId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const firstData = await parseResponse(firstResponse, LikePostResponseSchema);
  expect(firstData.success).toBe(true);

  // Second like (idempotent)
  const secondResponse = await httpClient.post<LikePostResponse>(
    '/likes',
    { postId: testPostId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const secondData = await parseResponse(secondResponse, LikePostResponseSchema);
  expect(secondData.success).toBe(true);
});
```

**After (Using helper):**
```typescript
it('should be idempotent when liking the same post twice', async () => {
  await expectIdempotent(async () => {
    await httpClient.post<LikePostResponse>(
      '/likes',
      { postId: testPostId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  });
});
```

---

## Additional Helpers

### Testing Forbidden Access (403)

```typescript
it('should return 403 when non-owner tries to delete comment', async () => {
  await expectForbidden(async () => {
    await httpClient.delete<DeleteCommentResponse>(
      '/comments',
      { commentId: otherUserCommentId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  });
});
```

### Testing Not Found (404)

```typescript
it('should return 404 for non-existent post', async () => {
  await expectNotFound(async () => {
    await httpClient.get(`/posts/${nonExistentPostId}`);
  });
});
```

### Custom Validation Status Codes

```typescript
// Test 422 Unprocessable Entity
it('should return 422 for duplicate email', async () => {
  await expectValidationError(async () => {
    await httpClient.post('/users', { email: 'duplicate@example.com' });
  }, 422);
});
```

---

## Benefits

1. **Reduced Boilerplate**: No more repetitive try-catch blocks
2. **Clearer Intent**: Function names clearly express what's being tested
3. **Consistent Error Handling**: All tests handle errors the same way
4. **Better Maintainability**: Change error handling logic in one place
5. **Improved Readability**: Tests focus on what's being tested, not how

---

## Import

```typescript
import {
  expectUnauthorized,
  expectValidationError,
  expectIdempotent,
  expectForbidden,
  expectNotFound
} from '../utils/index.js';
```

Or import everything:

```typescript
import {
  createLocalStackHttpClient,
  parseResponse,
  expectUnauthorized,
  expectValidationError,
  expectIdempotent,
  expectForbidden,
  expectNotFound
} from '../utils/index.js';
```
