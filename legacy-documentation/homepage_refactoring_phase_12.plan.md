# Phase 12: HomePage Refactoring Plan

## Overview

Refactor HomePage.tsx (217 lines) following the same successful pattern used for NotificationsPage in Phase 11. Extract business logic into custom hooks and create atomic presentation components.

**Expected Outcome:** Reduce HomePage from 217 → ~80-100 lines (55-60% reduction)

## Current State Analysis

### HomePage.tsx Issues (Same as NotificationsPage had)
- All business logic in component (data fetching, pagination, infinite scroll)
- Manual IntersectionObserver setup (lines 98-120)
- 4 render states mixed with logic (loading, error, empty, success)
- No separation of concerns

### Existing Resources ✅
- `IFeedService` interface with pagination
- `useIntersectionObserver` hook (exists but unused)
- `useFeedItemAutoRead` hook (already working)
- `PostCard` component (reusable)

## Phase 12 Implementation

### Step 1: Create `useFeed` Hook (TDD)

**File:** `src/hooks/useFeed.ts`

```typescript
export interface UseFeedReturn {
  readonly posts: readonly PostWithAuthor[];
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: string | null;
  readonly hasMore: boolean;
  readonly cursor: string | undefined;
  readonly retry: () => void;
  readonly loadMore: () => Promise<void>;
  readonly setPosts: React.Dispatch<React.SetStateAction<PostWithAuthor[]>>;
}

export const useFeed = (
  feedService: IFeedService,
  feedType: 'following' | 'explore'
): UseFeedReturn;
```

**Tests:** ~12-15 tests
- Initial state
- Load posts on mount
- Error handling with retry
- Pagination (loadMore, hasMore, cursor)
- State setter exposure

### Step 2: Create `useFeedInfiniteScroll` Hook (TDD)

**File:** `src/hooks/useFeedInfiniteScroll.ts`

```typescript
export const useFeedInfiniteScroll = (
  loadMore: () => Promise<void>,
  hasMore: boolean,
  isLoading: boolean
): RefObject<HTMLDivElement>;
```

Wraps existing `useIntersectionObserver` for infinite scroll sentinel.

**Tests:** ~5-8 tests
- Returns sentinel ref
- Calls loadMore when visible
- Respects hasMore flag
- Respects loading state

### Step 3: Create `useHomePage` Composite Hook (TDD)

**File:** `src/hooks/useHomePage.ts`

```typescript
export type UseHomePageReturn = 
  ReturnType<typeof useFeed> & 
  { readonly sentinelRef: RefObject<HTMLDivElement> };

export const useHomePage = (
  feedService: IFeedService,
  feedType: 'following' | 'explore' = 'following'
): UseHomePageReturn;
```

**Tests:** ~10-12 tests
- Hook composition
- Type inference
- Complete user flow (load, scroll, load more)
- Error states

### Step 4: Create Atomic Feed Components

**Directory:** `src/components/feed/`

Components to create (7-8 components):

1. **FeedLoading.tsx** - Loading spinner state
2. **FeedError.tsx** - Error message with retry button  
3. **FeedEmpty.tsx** - Empty state message
4. **FeedList.tsx** - List container wrapper
5. **FeedLoadingMore.tsx** - "Loading more..." spinner
6. **FeedEndMessage.tsx** - "You're all caught up!" 
7. **FeedItemWrapper.tsx** - Extract from HomePage (with auto-read)
8. **index.ts** - Barrel export

Each component: ~8-10 tests (~60 tests total)

### Step 5: Refactor HomePage.tsx

**Before:** 217 lines with all logic
**After:** ~80-100 lines, pure presentation

```typescript
export const HomePage: React.FC = () => {
  const { feedService } = useServices();
  
  const {
    posts,
    loading,
    error,
    hasMore,
    loadingMore,
    retry,
    sentinelRef
  } = useHomePage(feedService, 'following');
  
  // Discriminated union rendering
  if (loading && posts.length === 0) return <FeedLoading />;
  if (error && posts.length === 0) return <FeedError message={error} onRetry={retry} />;
  if (posts.length === 0) return <FeedEmpty />;
  
  return (
    <div className="home-page">
      <FeedList posts={posts} />
      {hasMore && (
        <div ref={sentinelRef}>
          <FeedLoadingMore loading={loadingMore} />
        </div>
      )}
      {!hasMore && posts.length > 0 && <FeedEndMessage />}
    </div>
  );
};
```

### Step 6: Bonus - Refactor ExplorePage

Reuse same hooks for ExplorePage:

```typescript
const hook = useHomePage(feedService, 'explore');
```

## Test Strategy (TDD Red-Green-Refactor)

### Estimated Test Coverage
- `useFeed`: 12-15 tests
- `useFeedInfiniteScroll`: 5-8 tests  
- `useHomePage`: 10-12 tests
- Feed components: ~60 tests (8-10 per component)
- HomePage: 16 existing tests (should still pass)

**Total:** ~100-110 new tests

## Git Commit Strategy

Following Phase 11 pattern:

1. **Commit 1:** `feat(hooks): create useFeed hook with TDD`
2. **Commit 2:** `feat(hooks): create useFeedInfiniteScroll hook`
3. **Commit 3:** `feat(hooks): create useHomePage composite hook`
4. **Commit 4:** `feat(components): create atomic feed components`
5. **Commit 5:** `refactor(pages): migrate HomePage to composite hook`
6. **Commit 6:** `refactor(pages): apply same pattern to ExplorePage`

## Benefits

✅ **Code Reduction:** 217 → ~80-100 lines (55-60% reduction)
✅ **Reusability:** Same hooks work for both HomePage and ExplorePage
✅ **Testability:** Hooks and components tested in isolation
✅ **Maintainability:** Logic centralized in hooks
✅ **Type Safety:** Full TypeScript inference
✅ **Consistency:** Same patterns as NotificationsPage (Phase 11)
✅ **Better UX:** Reuses existing `useIntersectionObserver` properly

## Success Criteria

- [ ] All tests passing (~100-110 new tests)
- [ ] HomePage reduced to <100 lines
- [ ] No duplicate logic
- [ ] ExplorePage can reuse hooks
- [ ] TypeScript validation clean
- [ ] No regressions in existing functionality

## Next Steps After Completion

Consider refactoring other pages with similar patterns:
- ProfilePage
- PostDetailPage  
- SearchPage

---

**Estimated Time:** 4-6 hours following Phase 11's proven approach

**Risk:** Low - Pattern already proven successful in Phase 11