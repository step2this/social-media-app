# Like Button Fix - Flash Bug Resolution

**Date:** 2025-11-13
**Updated:** 2025-11-13 (Added race condition fix)
**Branch:** `claude/nextjs-migration-review-011CV6DBgCYw4RgnooVfZp5j`
**Issue:** Like count flashes 0 → 1 → 0, heart stays red

---

## 🐛 The Problem

When clicking the like button on the explore page, users experienced:
- Like count flashes: `0 → 1 → 0`
- Heart icon turns red (filled) then stays red
- Server logs show successful mutation
- But the UI resets to the unliked state

## 🔍 Root Cause Analysis

### The Event Sequence

1. **User clicks like** → PostCard sets optimistic state
   ```typescript
   setOptimisticLiked(true);
   setOptimisticCount(count + 1);
   ```

2. **Server action executes** → GraphQL mutation succeeds
   ```
   [GQL] mutation LikePost - Success
   [NEXT] response: {success: true, likesCount: 1, isLiked: true}
   ```

3. **Revalidation triggers** → `revalidatePath('/(app)', 'layout')` called
   - This was revalidating the ENTIRE app layout
   - Caused the explore page to re-fetch immediately

4. **Race condition occurs** → Explore page fetches `GET_EXPLORE_FEED`
   ```
   [NEXT] Fetching explore feed
   ```
   - The feed query returns STALE data (before the like)
   - Due to: GraphQL caching, database read lag, or timing

5. **Props update with stale data** → PostCard receives:
   ```typescript
   post.isLiked = false  // OLD value
   post.likesCount = 0   // OLD value
   ```

6. **useEffect overwrites optimistic state** → The bug!
   ```typescript
   useEffect(() => {
     setOptimisticLiked(post.isLiked);    // Resets to false
     setOptimisticCount(post.likesCount); // Resets to 0
   }, [post.isLiked, post.likesCount]);
   ```

### The Core Issues

1. **useEffect didn't check `isPending`** before syncing props
2. **Overly broad revalidation** - entire layout instead of specific pages
3. **No protection against race conditions** between mutation and query

---

## ✅ The Fix

### 1. Guard the useEffect with isPending Check

**File:** `apps/web/components/posts/PostCard.tsx`

**Before:**
```typescript
useEffect(() => {
  setOptimisticLiked(post.isLiked);
  setOptimisticCount(post.likesCount);
}, [post.isLiked, post.likesCount]);
```

**After:**
```typescript
useEffect(() => {
  // Only sync if there's no pending mutation
  // This prevents revalidation from overwriting optimistic updates
  if (!isPending) {
    setOptimisticLiked(post.isLiked);
    setOptimisticCount(post.likesCount);
  }
}, [post.isLiked, post.likesCount, isPending]);
```

**Why this works:**
- While the mutation is pending (`isPending = true`), props changes are ignored
- Preserves the optimistic UI during the server round-trip
- Once mutation completes and `isPending` becomes false, sync with server data

### 2. More Targeted Revalidation

**File:** `apps/web/app/actions/posts.ts`

**Before:**
```typescript
revalidatePath('/(app)', 'layout');  // Revalidates entire app
```

**After:**
```typescript
revalidatePath('/explore', 'page');      // Only explore page
revalidatePath('/(app)/page', 'page');   // Only home feed
```

**Why this helps:**
- Reduces unnecessary re-fetches
- More predictable revalidation behavior
- Doesn't trigger layout-level cache invalidation

---

## 🧪 Testing the Fix

### Manual Test Steps

1. Start the development environment:
   ```bash
   # Terminal 1: GraphQL server
   pnpm run dev:graphql-server

   # Terminal 2: Next.js app
   pnpm run dev:web
   ```

2. Navigate to `/explore` page

3. Click the like button on a post

4. **Expected behavior:**
   - Heart immediately turns red
   - Count immediately increments
   - No flashing or reverting
   - State persists after server response

5. Refresh the page
   - Like state should be preserved (from server)

### Check the Logs

You should see:
```
[PostCard useEffect] { ..., isPending: true, willSync: false }
[PostCard handleLike] Optimistic update
[NEXT] Liking post
[GQL] mutation LikePost - Success
[PostCard handleLike] Server response { success: true }
[PostCard handleLike] Syncing with server response
[NEXT] Fetching explore feed
[PostCard useEffect] { ..., isPending: false, willSync: true }
```

Key: `willSync: false` while pending, `willSync: true` after completion.

---

## 🎯 Why The Previous Attempts Didn't Work

Looking at the git history, there were several attempted fixes:

1. **`658a8a4` - "fix: sync PostCard state with props after revalidation"**
   - Added the useEffect to sync with props
   - **But** didn't guard against syncing during pending mutations
   - This was the change that introduced the bug!

2. **`394775a` - "fix: correct error revert logic in like button"**
   - Fixed error handling
   - But didn't address the race condition with revalidation

3. **`21e615d` - "fix: remove isPending from useEffect dependencies"**
   - Removed `isPending` from dependencies
   - Made it worse! Now the effect can't react to pending state changes

The core issue was that optimistic updates and revalidation were fighting each other.

---

## 🚀 Alternative Approaches (Future Improvements)

### Option 1: Remove Revalidation Entirely

For instant user interactions like likes, you could skip revalidation:

```typescript
export async function likePost(postId: string): Promise<LikeResponse> {
  const data = await client.request<LikePostResponse>(LIKE_POST, { postId });

  // NO revalidatePath() call
  // Rely purely on optimistic updates

  return data.likePost;
}
```

**Pros:**
- No race conditions
- Faster perceived performance
- Simpler code

**Cons:**
- Stale data if user navigates away and back
- Needs manual refresh to see others' likes

### Option 2: Optimistic Relay-Style Updates

Implement proper cache updates in the GraphQL client:

```typescript
// Update the cache directly after mutation
cache.updateQuery({ query: GET_EXPLORE_FEED }, (data) => {
  const updatedPosts = data.exploreFeed.edges.map(edge =>
    edge.node.id === postId
      ? { ...edge.node, isLiked: true, likesCount: likesCount + 1 }
      : edge.node
  );
  return { ...data, exploreFeed: { ...data.exploreFeed, edges: updatedPosts } };
});
```

This is how Relay works in the old frontend.

### Option 3: Debounced Revalidation

Only revalidate after a delay:

```typescript
// Revalidate after 2 seconds to let mutation settle
setTimeout(() => {
  revalidatePath('/explore', 'page');
}, 2000);
```

**Pros:**
- Gives mutation time to propagate
- Avoids immediate race condition

**Cons:**
- Arbitrary delay
- Hacky solution

---

## 📝 Summary

**The fix:**
1. ✅ Guard `useEffect` with `!isPending` check
2. ✅ Use targeted `revalidatePath` instead of layout-level
3. ✅ Added `isPending` to useEffect dependencies

**Result:**
- Optimistic updates stay visible during mutations
- No more flashing
- Proper sync with server after mutation completes
- Race conditions handled gracefully

**Files changed:**
- `apps/web/components/posts/PostCard.tsx` - Added isPending guard
- `apps/web/app/actions/posts.ts` - More targeted revalidation

---

## 🔗 Related Files

- `apps/web/components/posts/PostCard.tsx` - The component with the bug
- `apps/web/app/actions/posts.ts` - Server actions for like/unlike
- `apps/web/app/(app)/explore/page.tsx` - Explore page that shows posts
- `apps/web/lib/graphql/queries.ts` - GraphQL queries and mutations

---

## 🔄 Update: Race Condition Fix (Session 2)

After testing, discovered a **backend race condition**:

### The Backend Race Condition

The like mutation performs two separate DynamoDB operations:
1. Create `LIKE#userId` entity (fast)
2. Update Post's `likesCount` counter (slower)

When `revalidatePath` triggered immediately after the mutation:
- Feed re-fetches posts from GraphQL
- `isLiked` resolver checks LIKE entity → **true** ✅ (already created)
- `likesCount` field reads Post entity → **0** ❌ (not updated yet)

Result: `props.isLiked: true, props.likesCount: 0` (inconsistent!)

### The Final Solution

**Removed `revalidatePath` calls entirely from like/unlike actions.**

**Why this works:**
- Optimistic updates provide instant UI feedback
- Server response syncs the correct count immediately
- No race condition with backend updates
- Data refreshes on next navigation or manual refresh
- Follows modern SPA patterns (optimistic + eventual consistency)

### Files Changed (Session 2)
- `apps/web/app/actions/posts.ts` - Removed revalidatePath calls

---

## 🎯 Final Solution: Pure Client State Pattern (Session 3)

After deeper analysis, discovered the real issue: **conflicting state management**.

### The Core Problem

We were trying to sync state in TWO places:
1. `useEffect` syncing props → state (when props change)
2. `handleLike` syncing server response → state (after mutation)

This created a battle between stale props and fresh server data.

### The Pattern That Works

**Pure client-side state** (used by Instagram, Twitter, etc.):

```typescript
// 1. Initialize from props ONCE (on mount)
const [optimisticLiked, setOptimisticLiked] = useState(post.isLiked);
const [optimisticCount, setOptimisticCount] = useState(post.likesCount);

// 2. Update optimistically on click
setOptimisticLiked(true);
setOptimisticCount(count + 1);

// 3. Sync with server response
const result = await likePost(postId);
setOptimisticLiked(result.isLiked);
setOptimisticCount(result.likesCount);

// 4. NEVER sync with props again (removed useEffect)
```

### Why This Works

- ✅ No prop syncing = no conflicts
- ✅ Server response is authoritative
- ✅ State persists across re-renders
- ✅ Fresh data on navigation/refresh
- ✅ Eventual consistency (acceptable for likes)

### Trade-offs

- ⚠️ Like counts may be slightly stale until page refresh
- ⚠️ Multiple users won't see each other's likes in real-time
- ✅ This is acceptable and matches industry patterns

### Files Changed (Session 3)
- `apps/web/components/posts/PostCard.tsx` - Removed useEffect entirely

---

**Status:** 🟢 **Fixed** - Pure client state pattern implemented

**Commits:**
- `6f2782a` - Added isPending guard (partial fix)
- `838fd0e` - Removed revalidatePath (race condition fix)
- `c763e3b` - Removed isPending from dependencies (didn't work - already tried)
- `638a273` - Removed useEffect entirely (FINAL FIX)
