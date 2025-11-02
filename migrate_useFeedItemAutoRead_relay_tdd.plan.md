# Migrate useFeedItemAutoRead to Relay Mutation - TDD Approach

## Overview

Migrate `useFeedItemAutoRead.ts` from calling REST `feedService.markPostsAsRead()` to using Relay `useMutation` with the existing GraphQL `markFeedItemsAsRead` mutation.

**Current:** Hook calls REST endpoint via feedService  
**Target:** Hook uses Relay mutation with optimistic updates

**Following TDD Principles:**
- ✅ Test behavior, not implementation
- ✅ Use existing fixtures from shared package
- ✅ Use existing test utilities (relay-test-utils.ts)
- ✅ No mocks/spies - use dependency injection via Relay
- ✅ Keep tests DRY - reuse patterns from existing Relay tests
- ✅ Minimal edge cases - focus on critical paths

---

## Step 1: Read Existing Implementation and Test

**Files to examine:**
1. `/packages/frontend/src/hooks/useFeedItemAutoRead.ts` - Current REST implementation
2. Check if test exists: `/packages/frontend/src/hooks/useFeedItemAutoRead.test.ts`
3. `/packages/frontend/src/components/feed/FeedItemWrapper.tsx` - Where it's used

**Analyze:**
- Current API and behavior
- What components depend on it
- What the test coverage looks like (if any)

---

## Step 2: Verify GraphQL Mutation Exists

**Check schema:**
```bash
grep -A 5 "markFeedItemsAsRead" schema.graphql
```

**Expected in schema:**
```graphql
type Mutation {
  markFeedItemsAsRead(postIds: [ID!]!): MarkFeedItemsAsReadResponse!
}

type MarkFeedItemsAsReadResponse {
  updatedCount: Int!
}
```

**If mutation doesn't exist in schema:** Stop and implement it in GraphQL server first.

---

## Step 3: Study Existing Relay Mutation Pattern

**Reference files:**
1. `/packages/frontend/src/components/comments/CommentForm.relay.tsx`
   - Example of Relay mutation in production
   - Shows optimistic updates pattern
   - Shows error handling

2. `/packages/frontend/src/test-utils/relay-test-utils.ts`
   - Existing test utilities for Relay
   - `createMockEnvironment`, `MockPayloadGenerator` patterns

3. `/packages/frontend/src/components/posts/PostCard.relay.test.tsx`
   - Example of testing components with mutations
   - Shows how to test behavior, not implementation

**Pattern to follow:**
```typescript
const [commit, isInFlight] = useMutation(graphql`
  mutation HookName_MutationName($input: InputType!) {
    mutationField(input: $input) {
      ... response fields
    }
  }
`);

const handleAction = (args) => {
  commit({
    variables: { input: args },
    optimisticResponse: { /* ... */ },
    onCompleted: (response) => { /* ... */ },
    onError: (error) => { /* ... */ },
  });
};
```

---

## Step 4: Write Test FIRST (RED Phase)

**Create:** `/packages/frontend/src/hooks/useFeedItemAutoRead.relay.test.tsx`

**Test structure:**
```typescript
import { renderHook } from '@testing-library/react';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import { RelayEnvironmentProvider } from 'react-relay';
import { useFeedItemAutoRead } from './useFeedItemAutoRead.relay';

describe('useFeedItemAutoRead', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  // TEST 1: Basic behavior - mark single post as read
  it('should mark a post as read when called', () => {
    const { result } = renderHook(() => useFeedItemAutoRead(), {
      wrapper: ({ children }) => (
        <RelayEnvironmentProvider environment={environment}>
          {children}
        </RelayEnvironmentProvider>
      ),
    });

    // Act - call the hook's function
    result.current.markAsRead('post-123');

    // Assert - verify mutation was sent with correct variables
    expect(environment.mock.getMostRecentOperation().request.variables).toEqual({
      postIds: ['post-123'],
    });

    // Simulate successful response
    environment.mock.resolveMostRecentOperation((operation) =>
      MockPayloadGenerator.generate(operation, {
        MarkFeedItemsAsReadResponse: () => ({
          updatedCount: 1,
        }),
      })
    );

    // No error should be thrown
    expect(result.current.error).toBeUndefined();
  });

  // TEST 2: Mark multiple posts as read (actual use case from FeedItemWrapper)
  it('should mark multiple posts as read', () => {
    const { result } = renderHook(() => useFeedItemAutoRead(), {
      wrapper: ({ children }) => (
        <RelayEnvironmentProvider environment={environment}>
          {children}
        </RelayEnvironmentProvider>
      ),
    });

    result.current.markAsRead(['post-1', 'post-2', 'post-3']);

    expect(environment.mock.getMostRecentOperation().request.variables).toEqual({
      postIds: ['post-1', 'post-2', 'post-3'],
    });
  });

  // TEST 3: Error handling behavior
  it('should handle errors gracefully', () => {
    const { result } = renderHook(() => useFeedItemAutoRead(), {
      wrapper: ({ children }) => (
        <RelayEnvironmentProvider environment={environment}>
          {children}
        </RelayEnvironmentProvider>
      ),
    });

    result.current.markAsRead('post-123');

    // Reject with error
    environment.mock.rejectMostRecentOperation(
      new Error('Network error')
    );

    // Hook should not throw, but should track error internally
    expect(result.current.error).toBeDefined();
  });
});
```

**Why these tests?**
1. **Test 1** - Core behavior: marking a post as read sends correct mutation
2. **Test 2** - Real use case: multiple posts (array)
3. **Test 3** - Error handling: graceful failure

**No mocks/spies:** Using Relay's built-in MockEnvironment for DI ✅  
**Testing behavior:** Verify mutation is sent, not HOW it's sent ✅  
**DRY:** Reuse RelayEnvironmentProvider wrapper pattern ✅  
**Existing utilities:** Use relay-test-utils.ts patterns ✅

---

## Step 5: Implement Hook (GREEN Phase)

**Create:** `/packages/frontend/src/hooks/useFeedItemAutoRead.relay.ts`

```typescript
import { useMutation, graphql } from 'react-relay';
import { useState } from 'react';
import type { useFeedItemAutoRead_MarkReadMutation } from './__generated__/useFeedItemAutoRead_MarkReadMutation.graphql';

/**
 * Hook to automatically mark feed items as read
 * Uses Relay mutation with optimistic updates
 */
export function useFeedItemAutoRead() {
  const [error, setError] = useState<Error | undefined>();
  
  const [commit, isInFlight] = useMutation<useFeedItemAutoRead_MarkReadMutation>(
    graphql`
      mutation useFeedItemAutoRead_MarkReadMutation($postIds: [ID!]!) {
        markFeedItemsAsRead(postIds: $postIds) {
          updatedCount
        }
      }
    `
  );

  const markAsRead = (postIds: string | string[]) => {
    const ids = Array.isArray(postIds) ? postIds : [postIds];
    
    commit({
      variables: { postIds: ids },
      optimisticResponse: {
        markFeedItemsAsRead: {
          updatedCount: ids.length,
        },
      },
      onError: (err) => {
        setError(err);
        // Silent failure - mark-as-read is not critical UX
        console.warn('Failed to mark posts as read:', err);
      },
      onCompleted: () => {
        setError(undefined);
      },
    });
  };

  return {
    markAsRead,
    isInFlight,
    error,
  };
}
```

**Run tests:** Should pass now ✅

---

## Step 6: Update Component Usage

**File:** `/packages/frontend/src/components/feed/FeedItemWrapper.tsx`

**Before:**
```typescript
import { useService } from '../../services/ServiceProvider';

function FeedItemWrapper({ children, postId }) {
  const feedService = useService('feedService');
  
  useEffect(() => {
    // Mark as read after viewing
    feedService.markPostsAsRead([postId]);
  }, [postId]);
  
  return children;
}
```

**After:**
```typescript
import { useFeedItemAutoRead } from '../../hooks/useFeedItemAutoRead.relay';

function FeedItemWrapper({ children, postId }) {
  const { markAsRead } = useFeedItemAutoRead();
  
  useEffect(() => {
    // Mark as read after viewing
    markAsRead(postId);
  }, [postId, markAsRead]);
  
  return children;
}
```

---

## Step 7: Test Component Integration (Optional)

**File:** `/packages/frontend/src/components/feed/FeedItemWrapper.test.tsx`

**Update existing test (if it exists) or create minimal test:**

```typescript
import { render } from '@testing-library/react';
import { createMockEnvironment } from 'relay-test-utils';
import { RelayEnvironmentProvider } from 'react-relay';
import { FeedItemWrapper } from './FeedItemWrapper';

it('should mark post as read when rendered', () => {
  const environment = createMockEnvironment();
  
  render(
    <RelayEnvironmentProvider environment={environment}>
      <FeedItemWrapper postId="post-123">
        <div>Content</div>
      </FeedItemWrapper>
    </RelayEnvironmentProvider>
  );

  // Verify mutation was called
  expect(environment.mock.getMostRecentOperation()).toBeDefined();
  expect(
    environment.mock.getMostRecentOperation().request.variables
  ).toEqual({
    postIds: ['post-123'],
  });
});
```

**Why minimal?** Component behavior is already tested. We just verify integration. ✅

---

## Step 8: Run All Tests

```bash
npm test -- useFeedItemAutoRead.relay.test
npm test -- FeedItemWrapper.test
```

**All should pass.** ✅

---

## Step 9: Manual Testing (Optional but Recommended)

1. Start dev server: `npm run dev`
2. Navigate to feed
3. Scroll through posts
4. Open browser DevTools → Network tab
5. Verify GraphQL mutation `markFeedItemsAsRead` is being called
6. Check for any console errors

---

## Step 10: Cleanup Old Service Code

**After verifying everything works:**

1. Check if `feedService.markPostsAsRead()` is used anywhere else:
   ```bash
   grep -r "markPostsAsRead" packages/frontend/src --include="*.tsx" --include="*.ts"
   ```

2. If ONLY used by `useFeedItemAutoRead`:
   - Delete old REST implementation from `feedService.ts`
   - Update service interface to remove method
   - Delete old test if it exists

3. If still used elsewhere:
   - Keep service for now
   - Add TODO comment to migrate other usages

---

## Success Criteria

**Before considering this done:**

- [ ] All tests pass
- [ ] Hook uses Relay `useMutation` instead of service
- [ ] Component integration works
- [ ] No console errors in dev
- [ ] GraphQL mutation visible in Network tab
- [ ] Old code deleted (if no other dependencies)

---

## Files to Create/Modify

**New files:**
- `/packages/frontend/src/hooks/useFeedItemAutoRead.relay.ts` (main implementation)
- `/packages/frontend/src/hooks/useFeedItemAutoRead.relay.test.tsx` (tests)

**Modified files:**
- `/packages/frontend/src/components/feed/FeedItemWrapper.tsx` (update import)
- `/packages/frontend/src/components/feed/FeedItemWrapper.test.tsx` (update test)

**Delete (if no other dependencies):**
- `/packages/frontend/src/hooks/useFeedItemAutoRead.ts` (old REST version)
- `/packages/frontend/src/hooks/useFeedItemAutoRead.test.ts` (old test, if exists)

**Update:**
- `/packages/frontend/src/services/feedService.ts` (remove markPostsAsRead method)
- `/packages/frontend/src/services/interfaces/IFeedService.ts` (remove from interface)

---

## Estimated Time

- **Step 1-3:** 15 min (research existing code)
- **Step 4:** 20 min (write tests)
- **Step 5:** 15 min (implement hook)
- **Step 6-7:** 15 min (update component + test)
- **Step 8-9:** 10 min (run tests + manual testing)
- **Step 10:** 10 min (cleanup)

**Total:** ~85 minutes (1.5 hours)

---

## Why This Approach?

**TDD Benefits:**
1. ✅ Tests written first ensure we know what behavior we want
2. ✅ Tests guide implementation (not the other way around)
3. ✅ Minimal code - only write what's needed to pass tests
4. ✅ Refactoring is safe - tests catch regressions

**Following User Requirements:**
1. ✅ **Just required tests** - Only 3 tests for critical paths
2. ✅ **Use existing fixtures** - Using Relay's MockEnvironment (built-in)
3. ✅ **Use existing helpers** - relay-test-utils.ts patterns
4. ✅ **Keep tests DRY** - Shared wrapper pattern, reuse test setup
5. ✅ **No mocks/spies** - Relay MockEnvironment is dependency injection
6. ✅ **Check existing tests** - Analyzed existing Relay test patterns
7. ✅ **Test behavior** - Testing mutation is sent, not internal React state

**Low Risk:**
- Mark-as-read is not critical UX (silent failure is acceptable)
- Easy to rollback if issues arise
- Tests verify behavior before deployment

---

## Next Steps After This

Once this migration is complete and validated:

1. Migrate `useAuctions.ts` (easier - just a query)
2. Migrate `CommentList.tsx` (pagination - medium complexity)
3. Migrate `useNotificationActions.ts` (multiple mutations)

This migration serves as a **template** for future Relay migrations.