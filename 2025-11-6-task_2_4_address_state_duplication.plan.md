# Task 2.4: Address State Duplication in Frontend

## Executive Summary

The analysis document identified that hooks like `useFollow` maintain local state that duplicates Relay's normalized cache. This creates potential synchronization issues, stale data, and unnecessary complexity.

**Current State:**
- ✅ `useFollow` hook exists and uses Relay mutations
- ✅ `FollowButton` component uses the hook
- ✅ `ProfilePage` integrates the button
- ❌ Local `useState` duplicates data that Relay already caches
- ❌ No fragment-based data reading from Relay store

**Goal:** Refactor to read follow state directly from Relay's normalized cache using fragments, eliminating local state duplication while maintaining optimistic updates.

---

## Phase 1: Analysis & Discovery (Read-Only)

### Step 1.1: Identify All State Duplication Patterns

**Search for hooks with potential state duplication:**

```bash
# Find all hooks that use both Relay and useState
grep -r "useMutation.*graphql" packages/frontend/src/hooks/*.ts | xargs -I {} grep -l "useState"
```

**Files to analyze:**
1. `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/useFollow.ts` ✓ (Primary target)
2. `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/useFeedItemAutoRead.ts` (Only error state - OK)
3. `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/useNotifications.ts` (Uses REST service - different pattern)

**Analysis Result:**
- `useFollow` is the **primary issue** - duplicates: `isFollowing`, `followersCount`, `followingCount`
- Other hooks either don't duplicate Relay data or use REST services

### Step 1.2: Review GraphQL Schema for Follow Data

**Check what fields are available:**

```graphql
type User {
  id: ID!
  handle: String!
  isFollowedByMe: Boolean!  # <-- This is what we need
  followersCount: Int!
  followingCount: Int!
}

type FollowUserResponse {
  success: Boolean!
  isFollowing: Boolean!
  followersCount: Int!
  followingCount: Int!
}
```

**Finding:** The schema has `isFollowedByMe` on User type, but we need to ensure mutations update this field in Relay's cache.

### Step 1.3: Review Existing Relay Fragment Patterns

**Look at working Relay patterns in the codebase:**

Files to review:
- `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationItemRelay.tsx` (deleted - check git history)
- `/Users/shaperosteve/social-media-app/packages/frontend/src/components/posts/PostCard.tsx`

**Expected pattern:**
```typescript
// ✅ Correct Relay pattern
const NotificationItemFragment = graphql`
  fragment NotificationItemRelay_notification on Notification {
    id
    type
    title
    actor { userId, handle, displayName }
  }
`;

const notification = useFragment(NotificationItemFragment, notificationRef);
```

---

## Phase 2: Refactor useFollow Hook

### Step 2.1: Update GraphQL Mutations

**Current mutation returns flat response:**
```graphql
mutation useFollowFollowUserMutation($userId: ID!) {
  followUser(userId: $userId) {
    success
    isFollowing
    followersCount
    followingCount
  }
}
```

**New approach - Update user in cache:**
```graphql
mutation useFollowFollowUserMutation($userId: ID!) {
  followUser(userId: $userId) {
    success
    user {
      id
      isFollowedByMe
      followersCount
      followingCount
    }
  }
}
```

**Files to modify:**
- `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/useFollow.ts`

### Step 2.2: Create useFollow with Fragment Pattern

**New implementation strategy:**

```typescript
// Option A: Fragment-based (Ideal)
const useFollowFragment = graphql`
  fragment useFollow_user on User {
    id
    isFollowedByMe
    followersCount
    followingCount
  }
`;

export function useFollow(userRef: FragmentRef) {
  const user = useFragment(useFollowFragment, userRef);
  
  const [commitFollow] = useMutation<useFollowFollowUserMutation>(...);
  
  const followUser = useCallback(() => {
    commitFollow({
      variables: { userId: user.id },
      optimisticUpdater: (store) => {
        // Optimistically update Relay cache
        const userRecord = store.get(user.id);
        userRecord?.setValue(true, 'isFollowedByMe');
        userRecord?.setValue(user.followersCount + 1, 'followersCount');
      }
    });
  }, [user.id, commitFollow]);
  
  return {
    isFollowing: user.isFollowedByMe,
    followersCount: user.followersCount,
    followUser,
    unfollowUser
  };
}
```

**Alternative Option B: Hybrid approach (if fragments don't work)**
- Keep mutations as-is
- Add `updater` function to manually update Relay store
- Remove local useState
- Still need user ID as input

**Decision point:** Choose Option A if schema supports it, Option B as fallback.

### Step 2.3: Update FollowButton Component

**Current implementation:**
```typescript
// ❌ Passes initial values, creates state duplication
<FollowButton
  userId={profile.id}
  initialIsFollowing={profile.isFollowing}
  initialFollowersCount={profile.followersCount}
/>
```

**New implementation (Option A - Fragment):**
```typescript
// ✅ Passes fragment reference
<FollowButton userRef={profileRef} />
```

**New implementation (Option B - Hybrid):**
```typescript
// ✅ Only passes userId, reads from cache
<FollowButton userId={profile.id} />
```

**Files to modify:**
- `/Users/shaperosteve/social-media-app/packages/frontend/src/components/common/FollowButton.tsx`
- `/Users/shaperosteve/social-media-app/packages/frontend/src/components/profile/ProfilePage.tsx`

---

## Phase 3: Update GraphQL Schema & Resolvers

### Step 3.1: Update FollowUserResponse Type

**Current schema:**
```graphql
type FollowUserResponse {
  success: Boolean!
  isFollowing: Boolean!
  followersCount: Int!
  followingCount: Int!
}
```

**New schema:**
```graphql
type FollowUserResponse {
  success: Boolean!
  user: User!  # Return full user object for Relay cache update
}
```

**Files to modify:**
- `/Users/shaperosteve/social-media-app/schema.graphql`
- GraphQL resolver for `followUser` mutation

### Step 3.2: Update Follow Mutation Resolvers

**Ensure resolvers return user object:**

```typescript
// Resolver should return:
return {
  success: true,
  user: {
    id: userId,
    isFollowedByMe: true,
    followersCount: updatedCount,
    ...
  }
};
```

**Files to check/modify:**
- `/Users/shaperosteve/social-media-app/packages/graphql-server/src/schema/resolvers/Mutation.ts`
- Follow mutation resolver file

---

## Phase 4: Testing & Validation

### Step 4.1: Update Hook Tests

**Test file to update:**
- Create: `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/useFollow.test.tsx`

**Test scenarios:**
1. Hook receives fragment and extracts follow state
2. `followUser()` triggers mutation with optimistic update
3. `unfollowUser()` triggers mutation with optimistic update
4. Error handling rolls back optimistic update
5. Relay cache is properly updated after mutation

### Step 4.2: Update Component Tests

**Files to update:**
- `/Users/shaperosteve/social-media-app/packages/frontend/src/components/common/FollowButton.test.tsx`
- `/Users/shaperosteve/social-media-app/packages/frontend/src/components/profile/ProfilePage.test.tsx`

**Test scenarios:**
1. Button displays correct follow state from fragment
2. Click triggers mutation
3. Optimistic UI updates immediately
4. Button disables during loading
5. Error state displays correctly

### Step 4.3: Integration Testing

**Manual testing checklist:**
- [ ] Visit profile page, see correct follow status
- [ ] Click follow button, see optimistic update
- [ ] Refresh page, status persists
- [ ] Check Relay DevTools - cache updates correctly
- [ ] Test error scenario (network offline)
- [ ] Verify no console warnings about state updates

---

## Phase 5: Documentation & Cleanup

### Step 5.1: Update Documentation

**Files to update/create:**
- Update: `/Users/shaperosteve/social-media-app/RELAY_GUIDE.md`
- Add section: "Fragment-Based Hooks Pattern"
- Document: When to use fragments vs. mutations

### Step 5.2: Remove Deprecated Code

**Files to clean up:**
- Remove `useFollow.ts.backup` if exists
- Remove any commented-out code
- Clean up unused imports

### Step 5.3: Update Codebase Analysis Document

**File to update:**
- `/Users/shaperosteve/social-media-app/CODEBASE_ANALYSIS_2025-11-05.md`

**Mark as complete:**
- Task 2.4: Address State Duplication ✅
- Update status from "NOT STARTED" to "COMPLETE"

---

## Implementation Order

### **Recommended Approach: Incremental TDD**

**Day 1 (2-3 hours):**
1. Phase 1: Analysis & Discovery (all steps)
2. Write failing tests for new useFollow behavior
3. Decision: Choose Option A (fragment) or Option B (hybrid)

**Day 2 (3-4 hours):**
1. Phase 2: Implement new useFollow hook
2. Phase 3: Update schema/resolvers if needed
3. Make tests pass

**Day 3 (2-3 hours):**
1. Phase 2.3: Update FollowButton component
2. Phase 4.2: Update component tests
3. Integration testing

**Day 4 (1-2 hours):**
1. Phase 4.3: Manual testing & validation
2. Phase 5: Documentation & cleanup
3. Update analysis document

**Total Estimated Time: 8-12 hours (1-2 days)**

---

## Success Criteria

- [ ] ✅ Zero `useState` in useFollow for follow-related state
- [ ] ✅ FollowButton reads state from Relay fragment
- [ ] ✅ Optimistic updates work correctly
- [ ] ✅ Relay cache updates after mutation
- [ ] ✅ All tests passing (hook + component)
- [ ] ✅ No state synchronization issues
- [ ] ✅ Console has no warnings
- [ ] ✅ Manual testing passes all scenarios

---

## Risk Assessment

### **Low Risk:**
- Hook is well-isolated
- Only used in one place (FollowButton → ProfilePage)
- Clear rollback path (git revert)

### **Medium Risk:**
- Schema changes may affect other consumers
- Relay cache updates need careful testing

### **Mitigation:**
- Feature flag: Not needed (low usage)
- Incremental testing at each step
- Keep backup of working code

---

## Alternative Approaches Considered

### **Option 1: Keep useState, Add Relay Subscription**
❌ Rejected: Adds complexity, doesn't solve root cause

### **Option 2: Remove Hook, Inline Mutations**
❌ Rejected: Reduces reusability, violates DRY

### **Option 3: Hybrid - Fragments for Reading, useState for Optimistic**  
⚠️ Considered: Valid fallback if Option A doesn't work

---

## Open Questions

1. **Q:** Does the GraphQL schema already support returning `User` in `FollowUserResponse`?
   **A:** Need to check schema.graphql - Phase 1.2

2. **Q:** Are there other places besides ProfilePage that use follow state?
   **A:** Search codebase - Phase 1.1

3. **Q:** Should we use Relay's `updater` or `optimisticUpdater`?
   **A:** Both - optimisticUpdater for instant UI, updater for final state

---

## Notes

- This refactoring aligns with Relay best practices
- Eliminates a class of bugs (stale state)
- Makes code more maintainable and testable
- Pattern can be applied to other hooks if needed

**After Task 2.4:**
- Consider applying same pattern to other hooks with state duplication
- Document pattern for future hook development
- Add to RELAY_GUIDE.md as canonical example