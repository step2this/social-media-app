# Migrate useCreatePost Hook - Extract from Component (TDD)

## Goal
Extract the `createPost` Relay mutation from `CreatePostPageRelay.tsx` into a reusable `useCreatePost` hook with **minimal required tests**. Continue Phase 1 of the Relay migration audit.

## Current State
- **Component:** `/packages/frontend/src/components/posts/CreatePostPage.relay.tsx`
  - Uses `useMutation` inline (lines 35-55)
  - Handles S3 upload and navigation
  - 288 lines with mixed concerns
  
- **Pattern:** Mutation logic is embedded in component
- **Issue:** Not reusable, harder to test, violates single responsibility

## Target State
- Reusable `useCreatePost.ts` hook with Relay `useMutation`
- Minimal test suite (4 tests) using Relay MockEnvironment
- Same behavior, cleaner component
- Follows pattern established with `useFeedItemAutoRead`

---

## Phase 1: Write Failing Tests (RED)

### File: `/packages/frontend/src/hooks/useCreatePost.test.tsx`

Following the pattern from `useFeedItemAutoRead.test.tsx`, write 4 focused tests:

1. **Test mutation execution with correct variables**
2. **Test in-flight state tracking**
3. **Test error handling**
4. **Test error clearing on retry**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { useCreatePost } from './useCreatePost';
import type { Environment } from 'relay-runtime';

/**
 * Test wrapper that provides Relay environment
 */
function createWrapper(environment: Environment) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    );
  };
}

describe('useCreatePost (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  describe('mutation execution', () => {
    it('should call mutation with correct variables', () => {
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // Execute mutation
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test caption'
        });
      });

      // Verify mutation was called
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.node.operation.name).toBe('useCreatePostMutation');
      expect(operation.request.variables.input).toEqual({
        fileType: 'image/jpeg',
        caption: 'Test caption'
      });
    });
  });

  describe('mutation state', () => {
    it('should track in-flight state during mutation', async () => {
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // Initially not in flight
      expect(result.current.isInFlight).toBe(false);

      // Start mutation
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test'
        });
      });

      // Should be in flight
      expect(result.current.isInFlight).toBe(true);

      // Resolve mutation
      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            CreatePostPayload: () => ({
              post: {
                id: 'post-123',
                imageUrl: 'https://example.com/image.jpg',
                caption: 'Test',
                createdAt: new Date().toISOString()
              },
              uploadUrl: 'https://s3.amazonaws.com/upload',
              thumbnailUploadUrl: 'https://s3.amazonaws.com/thumb'
            })
          })
        );
      });

      // Should no longer be in flight
      await waitFor(() => {
        expect(result.current.isInFlight).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle mutation errors gracefully', async () => {
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // Start mutation
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test'
        });
      });

      // Reject mutation
      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create post')
        );
      });

      // Should have error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Failed to create post');
      });
    });

    it('should clear error on subsequent successful mutation', async () => {
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // First mutation fails
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test 1'
        });
      });

      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create post')
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second mutation succeeds
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test 2'
        });
      });

      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            CreatePostPayload: () => ({
              post: {
                id: 'post-456',
                imageUrl: 'https://example.com/image2.jpg',
                caption: 'Test 2',
                createdAt: new Date().toISOString()
              },
              uploadUrl: 'https://s3.amazonaws.com/upload2',
              thumbnailUploadUrl: 'https://s3.amazonaws.com/thumb2'
            })
          })
        );
      });

      // Error should be cleared
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
```

**Test Patterns Used:**
- ✅ Relay MockEnvironment (no mocks, no spies)
- ✅ DRY helper: `createWrapper`
- ✅ Focused tests on behavior
- ✅ Uses `act()` for state updates
- ✅ Uses `waitFor()` for async assertions

---

## Phase 2: Implement Hook (GREEN)

### File: `/packages/frontend/src/hooks/useCreatePost.ts`

```typescript
import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { useCreatePostMutation } from './__generated__/useCreatePostMutation.graphql';

/**
 * Input for creating a post
 */
export interface CreatePostInput {
  fileType: string;
  caption: string | null;
}

/**
 * Result of creating a post
 */
export interface CreatePostResult {
  post: {
    id: string;
    imageUrl: string;
    caption: string | null;
    createdAt: string;
    author: {
      id: string;
      handle: string;
      username: string;
    };
  };
  uploadUrl: string;
  thumbnailUploadUrl: string;
}

/**
 * Hook to create a post using Relay mutation
 *
 * Provides a reusable mutation for creating posts with image upload URLs.
 * Extracted from CreatePostPageRelay to improve reusability and testability.
 *
 * @returns {object} Object containing createPost function, isInFlight state, and error state
 *
 * @example
 * ```tsx
 * const { createPost, isInFlight, error } = useCreatePost();
 *
 * const handleCreate = async () => {
 *   const result = await createPost({
 *     fileType: 'image/jpeg',
 *     caption: 'My new post'
 *   });
 *
 *   if (result) {
 *     await uploadToS3(result.uploadUrl, file);
 *     navigate(`/post/${result.post.id}`);
 *   }
 * };
 * ```
 */
export function useCreatePost() {
  const [error, setError] = useState<Error | null>(null);

  const [commit, isInFlight] = useMutation<useCreatePostMutation>(
    graphql`
      mutation useCreatePostMutation($input: CreatePostInput!) {
        createPost(input: $input) {
          post {
            id
            imageUrl
            caption
            createdAt
            author {
              id
              handle
              username
            }
          }
          uploadUrl
          thumbnailUploadUrl
        }
      }
    `
  );

  /**
   * Create a new post
   *
   * @param input - Post creation input (fileType, caption)
   * @returns Promise that resolves with post data and upload URLs, or null on error
   */
  const createPost = useCallback((input: CreatePostInput): Promise<CreatePostResult | null> => {
    setError(null);

    return new Promise((resolve) => {
      commit({
        variables: { input },
        onCompleted: (response) => {
          if (response.createPost) {
            resolve(response.createPost as CreatePostResult);
          } else {
            const err = new Error('Failed to create post');
            setError(err);
            resolve(null);
          }
        },
        onError: (err) => {
          setError(err);
          resolve(null);
        }
      });
    });
  }, [commit]);

  return {
    createPost,
    isInFlight,
    error
  };
}
```

**API Design:**
- Returns `createPost` function that returns a Promise
- Promise resolves with result or null (on error)
- Tracks `isInFlight` and `error` states
- Follows pattern from `useFeedItemAutoRead`

### Run Relay Compiler

```bash
cd packages/frontend && npm run relay
```

This generates:
- `__generated__/useCreatePostMutation.graphql.ts`

---

## Phase 3: Update Component to Use Hook

### File: `/packages/frontend/src/components/posts/CreatePostPage.relay.tsx`

**Changes:**

1. **Import the hook:**
```typescript
import { useCreatePost } from '../../hooks/useCreatePost';
```

2. **Replace useMutation with hook:**
```typescript
// Before:
const [commitCreatePost, isSubmitting] = useMutation<CreatePostPageRelayMutation>(
  graphql`mutation CreatePostPageRelayMutation...`
);

// After:
const { createPost, isInFlight: isSubmitting, error: mutationError } = useCreatePost();
```

3. **Update handleSubmit:**
```typescript
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    setActionError('Please fix validation errors');
    return;
  }

  if (!selectedFile) {
    setActionError('Please select an image');
    return;
  }

  setActionError(null);

  // Use the hook's createPost function
  const result = await createPost({
    fileType: selectedFile.type,
    caption: caption.trim() || null
  });

  if (!result) {
    setActionError(mutationError?.message || 'Failed to create post');
    return;
  }

  try {
    // S3 upload
    await uploadImageToS3(result.uploadUrl, selectedFile);

    // Success - cleanup and navigate
    resetForm();
    clearImage();
    navigate(`/post/${result.post.id}`);
  } catch (error) {
    console.error('Error uploading image:', error);
    setActionError('Failed to upload image. Please try again.');
  }
}, [createPost, validateForm, selectedFile, caption, mutationError, resetForm, clearImage, navigate]);
```

4. **Remove old mutation GraphQL:**
- Delete lines 35-55 (the old `useMutation` and `graphql` tag)

**Benefits:**
- ✅ ~20 lines removed from component
- ✅ Reusable mutation hook
- ✅ Better separation of concerns
- ✅ Easier to test
- ✅ Consistent with other hooks

---

## Phase 4: Run Tests & Verify

```bash
# Run hook tests
cd packages/frontend && npm test -- useCreatePost.test

# Verify no regressions in component (if tests exist)
npm test -- CreatePostPage

# Run all tests
npm test
```

---

## Phase 5: Clean Git Commits

```bash
# Commit 1: Hook implementation
git add packages/frontend/src/hooks/useCreatePost.ts \
        packages/frontend/src/hooks/__generated__/useCreatePostMutation.graphql.ts
git commit -m "feat(hooks): Add useCreatePost Relay hook

- Extract createPost mutation from CreatePostPageRelay component
- Reusable hook with createPost, isInFlight, error API
- Returns Promise with post data and S3 upload URLs
- Follow pattern from useFeedItemAutoRead hook

Related: migrate_useCreatePost_relay_tdd.plan.md"

# Commit 2: Hook tests
git add packages/frontend/src/hooks/useCreatePost.test.tsx
git commit -m "test: Add useCreatePost hook tests with Relay patterns

- 4 focused tests using Relay MockEnvironment
- Test mutation execution, in-flight state, error handling
- No mocks/spies, use relay-test-utils patterns
- All tests passing

Tests verify:
- Mutation called with correct variables
- In-flight state tracking
- Error handling and propagation
- Error clearing on retry

Related: migrate_useCreatePost_relay_tdd.plan.md"

# Commit 3: Component update
git add packages/frontend/src/components/posts/CreatePostPage.relay.tsx
git commit -m "refactor(components): Use useCreatePost hook in CreatePostPageRelay

- Replace inline useMutation with useCreatePost hook
- Simplified handleSubmit logic
- Remove ~20 lines of mutation code
- Better separation of concerns

Component now focuses on UI and flow, hook handles mutation

Related: migrate_useCreatePost_relay_tdd.plan.md"

# Commit 4: Plan documentation
git add migrate_useCreatePost_relay_tdd.plan.md
git commit -m "docs: Add useCreatePost migration TDD plan

TDD plan for extracting createPost mutation into reusable hook:
- Phase 1: Write 4 failing tests (RED)
- Phase 2: Implement hook (GREEN)
- Phase 3: Update component
- Timeline: ~80 minutes

Related: useCreatePost.ts, CreatePostPage.relay.tsx"
```

---

## Success Criteria

- ✅ 4 tests passing (minimal required tests)
- ✅ Hook uses Relay `useMutation`
- ✅ Component uses hook (cleaner code)
- ✅ Same behavior as before
- ✅ Better testability and reusability
- ✅ Follows established patterns

---

## Notes

### Comparison with Other Hooks

| Hook | Type | Returns | Use Case |
|------|------|---------|----------|
| `useAuctions` | Query | `{ auctions, isLoading, error, hasMore, refetch }` | Fetch list |
| `useFeedItemAutoRead` | Mutation | `{ markAsRead, isInFlight, error }` | Fire & forget |
| `useCreatePost` | Mutation | `{ createPost, isInFlight, error }` | Async result |

**Key Difference:**
- `useFeedItemAutoRead`: `markAsRead()` returns void (fire & forget)
- `useCreatePost`: `createPost()` returns Promise (need result)

This is because we need the upload URLs from the response.

### S3 Upload Pattern

The hook returns upload URLs but doesn't handle S3 upload itself:
- **Hook:** GraphQL mutation (create post record + get upload URLs)
- **Component:** S3 upload (upload actual file to S3)

This keeps concerns separated and makes the hook reusable.

### Error Handling

Two error states:
1. **Mutation error:** GraphQL API failed
2. **Upload error:** S3 upload failed

Component handles both cases appropriately.

---

## Timeline

- Phase 1 (Tests): 20 minutes
- Phase 2 (Implementation): 20 minutes
- Phase 3 (Component Update): 20 minutes
- Phase 4 (Testing): 10 minutes
- Phase 5 (Git Commits): 10 minutes

**Total:** ~80 minutes (1.3 hours)

---

## Migration Progress

After this migration:

**Phase 1: Hooks Migration**
- ✅ useFeedItemAutoRead (COMPLETE)
- ✅ useAuctions (COMPLETE)
- ✅ useCreatePost (COMPLETE - this migration)
- ❌ usePlaceBid (TODO)
- ❌ useCreateAuction (TODO)

**Progress:** 60% → 80% (Phase 1)

**Remaining:** 2 hooks (usePlaceBid, useCreateAuction)
