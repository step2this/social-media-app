# Phase 12 Continuation: Complete HomePage Refactoring

## Current State Summary

### ✅ Completed
- **Step 1-3:** All three hooks created with comprehensive tests (34 total tests, all passing)
  - `useFeed.ts` + 15 tests
  - `useFeedInfiniteScroll.ts` + 8 tests  
  - `useHomePage.ts` + 11 tests
- **Step 5 (Partial):** HomePage.tsx refactored to use hooks (126 lines, 42% reduction)
- **Step 4 (Partial):** 5/8 feed components created but **ZERO tests**

### ❌ Remaining Work

**Step 4: Add Missing Tests for Feed Components** (~60 tests needed)
- FeedLoading.tsx (0/8 tests)
- FeedError.tsx (0/10 tests)
- FeedEmpty.tsx (0/8 tests)
- FeedLoadingMore.tsx (0/8 tests)
- FeedEndMessage.tsx (0/8 tests)
- Missing: FeedList.tsx component + tests
- Missing: FeedItemWrapper.tsx component + tests

**Step 6: Refactor ExplorePage** 
- Currently 211 lines with duplicate logic
- **Critical Issue:** Creates new GraphQL client (breaks singleton pattern)
- Should reuse `useHomePage` hook with `feedType='explore'`
- Target: Reduce to ~80-100 lines (same as HomePage)

---

## Implementation Plan

### Phase 1: Create Tests for Existing Feed Components

#### 1.1: FeedLoading Component Tests
**File:** `src/components/feed/FeedLoading.test.tsx`

**Tests (8):**
- Renders loading spinner
- Displays "Loading your feed..." message
- Has correct CSS classes
- Matches snapshot
- Accessible (aria-live="polite")
- Spinner has aria-label
- Container has test ID
- Renders without crashing

#### 1.2: FeedError Component Tests  
**File:** `src/components/feed/FeedError.test.tsx`

**Tests (10):**
- Renders error message
- Displays custom error message prop
- Shows retry button
- Calls onRetry when button clicked
- Has correct CSS classes
- Matches snapshot
- Accessible (role="alert")
- Retry button has correct text
- Error icon displays
- Renders without crashing

#### 1.3: FeedEmpty Component Tests
**File:** `src/components/feed/FeedEmpty.test.tsx`

**Tests (8):**
- Renders empty state message
- Displays emoji/icon
- Shows helpful text
- Has correct CSS classes
- Matches snapshot
- Accessible (proper semantics)
- Container has test ID
- Renders without crashing

#### 1.4: FeedLoadingMore Component Tests
**File:** `src/components/feed/FeedLoadingMore.test.tsx`

**Tests (8):**
- Shows spinner when loading=true
- Hides spinner when loading=false
- Displays "Loading more..." text
- Has correct CSS classes
- Matches snapshot (loading state)
- Matches snapshot (not loading state)
- Accessible (aria-live="polite")
- Renders without crashing

#### 1.5: FeedEndMessage Component Tests
**File:** `src/components/feed/FeedEndMessage.test.tsx`

**Tests (8):**
- Renders end message
- Displays emoji/icon
- Shows "You're all caught up!" text
- Has correct CSS classes
- Matches snapshot
- Accessible (proper semantics)
- Container has test ID
- Renders without crashing

---

### Phase 2: Extract FeedItemWrapper Component

Currently embedded in HomePage.tsx (lines 25-37), should be extracted.

#### 2.1: Create FeedItemWrapper Component
**File:** `src/components/feed/FeedItemWrapper.tsx`

```typescript
import React from 'react';
import type { PostWithAuthor } from '@social-media-app/shared';
import { PostCard } from '../posts/PostCard';
import { useFeedItemAutoRead } from '../../hooks/useFeedItemAutoRead';

interface FeedItemWrapperProps {
  post: PostWithAuthor;
  compact?: boolean;
}

export const FeedItemWrapper: React.FC<FeedItemWrapperProps> = ({ 
  post, 
  compact = true 
}) => {
  const elementRef = useFeedItemAutoRead(post.id);

  return (
    <div ref={elementRef} className="feed-item-wrapper">
      <PostCard post={post} compact={compact} />
    </div>
  );
};
```

#### 2.2: Create FeedItemWrapper Tests
**File:** `src/components/feed/FeedItemWrapper.test.tsx`

**Tests (10):**
- Renders PostCard with correct props
- Uses auto-read hook
- Passes post to PostCard
- Defaults to compact=true
- Respects compact prop override
- Has wrapper div with class
- Ref is attached to wrapper
- Matches snapshot
- Renders without post errors
- Hook called with correct post ID

---

### Phase 3: Create FeedList Component

Currently the feed list logic is inline in HomePage.tsx (lines 94-98).

#### 3.1: Create FeedList Component
**File:** `src/components/feed/FeedList.tsx`

```typescript
import React from 'react';
import type { PostWithAuthor } from '@social-media-app/shared';
import { FeedItemWrapper } from './FeedItemWrapper';

interface FeedListProps {
  posts: readonly PostWithAuthor[];
  compact?: boolean;
}

export const FeedList: React.FC<FeedListProps> = ({ 
  posts, 
  compact = true 
}) => {
  return (
    <div className="feed-list">
      {posts.map((post) => (
        <FeedItemWrapper key={post.id} post={post} compact={compact} />
      ))}
    </div>
  );
};
```

#### 3.2: Create FeedList Tests
**File:** `src/components/feed/FeedList.test.tsx`

**Tests (10):**
- Renders empty list
- Renders single post
- Renders multiple posts
- Each post has FeedItemWrapper
- Passes compact prop to items
- Uses post.id as key
- Has feed-list class
- Matches snapshot (empty)
- Matches snapshot (with posts)
- Renders without crashing

#### 3.3: Update Barrel Export
**File:** `src/components/feed/index.ts`

Add exports:
```typescript
export { FeedList } from './FeedList';
export { FeedItemWrapper } from './FeedItemWrapper';
```

---

### Phase 4: Fix ExplorePage Singleton Violation

**Critical Issue:** ExplorePage currently violates the singleton pattern by creating its own GraphQL client.

#### 4.1: Analyze Current Issues

**Lines 3, 8, 15 in ExplorePage.tsx:**
```typescript
import { FeedServiceGraphQL } from '../../services/implementations/FeedService.graphql.js';
import { createGraphQLClient } from '../../graphql/client.js';

const feedService = new FeedServiceGraphQL(createGraphQLClient());
```

This breaks the singleton pattern we established!

#### 4.2: Refactor ExplorePage to Use Singleton Services

**File:** `src/components/explore/ExplorePage.tsx`

**Changes:**

1. **Remove incorrect imports:**
```typescript
- import { FeedServiceGraphQL } from '../../services/implementations/FeedService.graphql.js';
- import { createGraphQLClient } from '../../graphql/client.js';
- import { unwrap } from '../../graphql/types';
```

2. **Add correct imports:**
```typescript
+ import { useServices } from '../../services/ServiceProvider';
+ import { useHomePage } from '../../hooks/useHomePage';
+ import { 
+   FeedLoading,
+   FeedError, 
+   FeedEmpty,
+   FeedLoadingMore,
+   FeedEndMessage
+ } from '../feed';
```

3. **Simplify component:**
```typescript
export const ExplorePage: React.FC = () => {
  const { feedService } = useServices();
  
  const {
    posts,
    loading,
    error,
    hasMore,
    loadingMore,
    retry,
    sentinelRef
  } = useHomePage(feedService, 'explore');

  // Transform posts to grid items
  const gridItems = useMemo(
    () => posts.map(transformToGridItem),
    [posts]
  );

  // Scramble for diversity
  const scrambledPosts = useMemo(
    () => scramblePosts(gridItems),
    [gridItems]
  );

  if (loading && posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <FeedLoading />
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <FeedError message={error} onRetry={retry} />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <FeedEmpty />
        </div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <div className="explore-container">
        <h1 className="explore-title">Explore</h1>

        <div className="posts-grid">
          {scrambledPosts.map((post) => (
            <PostThumbnail key={post.id} post={post} />
          ))}
        </div>

        {hasMore && (
          <div ref={sentinelRef} className="scroll-sentinel">
            <FeedLoadingMore loading={loadingMore} />
          </div>
        )}

        {!hasMore && posts.length > 0 && <FeedEndMessage />}
      </div>
    </div>
  );
};
```

**Expected Outcome:**
- 211 lines → ~100 lines (52% reduction)
- Reuses `useHomePage` hook (DRY principle)
- Respects singleton pattern (uses shared services)
- No duplicate business logic

---

### Phase 5: Update HomePage to Use FeedList

Currently HomePage manually maps posts (lines 95-97). Should use FeedList component.

**File:** `src/pages/HomePage.tsx`

**Change:**
```typescript
// Before:
<div className="home-page__feed">
  {posts.map((post) => (
    <FeedItemWrapper key={post.id} post={post} />
  ))}
</div>

// After:
<FeedList posts={posts} compact={true} />
```

This further reduces HomePage and makes it more declarative.

---

## Test Execution Strategy

### Test Coverage Goals
- **Feed Components:** 60+ tests
  - FeedLoading: 8 tests
  - FeedError: 10 tests
  - FeedEmpty: 8 tests
  - FeedLoadingMore: 8 tests
  - FeedEndMessage: 8 tests
  - FeedItemWrapper: 10 tests
  - FeedList: 10 tests

- **Integration Tests:** Already passing
  - useFeed: 15 tests ✅
  - useFeedInfiniteScroll: 8 tests ✅
  - useHomePage: 11 tests ✅

### Validation Checklist
- [ ] All 60+ component tests passing
- [ ] ExplorePage reduced to ~100 lines
- [ ] No GraphQL client violations
- [ ] HomePage uses FeedList component
- [ ] TypeScript validation clean
- [ ] All existing HomePage tests still pass
- [ ] ExplorePage functionality unchanged

---

## Git Commit Strategy

Following the established pattern from Phase 11:

1. **Commit 1:** `test(components): add comprehensive tests for feed components`
   - FeedLoading.test.tsx
   - FeedError.test.tsx  
   - FeedEmpty.test.tsx
   - FeedLoadingMore.test.tsx
   - FeedEndMessage.test.tsx

2. **Commit 2:** `feat(components): extract FeedItemWrapper component`
   - FeedItemWrapper.tsx
   - FeedItemWrapper.test.tsx
   - Update barrel export

3. **Commit 3:** `feat(components): create FeedList component`
   - FeedList.tsx
   - FeedList.test.tsx
   - Update barrel export

4. **Commit 4:** `refactor(pages): use FeedList in HomePage`
   - Update HomePage.tsx
   - Verify tests still pass

5. **Commit 5:** `refactor(pages): migrate ExplorePage to useHomePage hook`
   - Fix singleton pattern violation
   - Eliminate duplicate business logic
   - Reuse feed components

6. **Commit 6:** `docs: update Phase 12 completion summary`
   - Document final metrics
   - Note breaking changes avoided
   - Record lessons learned

---

## Success Metrics

### Code Reduction
- **HomePage:** 217 → ~90 lines (58% reduction) ✅ Currently 126 lines (42%)
- **ExplorePage:** 211 → ~100 lines (52% reduction) ❌ Not started

### Test Coverage
- **Target:** 100+ tests total
- **Current:** 34 hook tests ✅
- **Missing:** 60+ component tests ❌

### Pattern Consistency
- ✅ Singleton pattern respected in hooks
- ❌ ExplorePage violates singleton pattern
- ✅ Hooks follow TDD approach
- ❌ Components lack tests entirely

### Reusability
- ✅ useHomePage works for both feeds
- ✅ Feed components are atomic
- ❌ ExplorePage doesn't reuse useHomePage yet

---

## Risk Assessment

### Low Risk ✅
- Hook tests are comprehensive and passing
- HomePage refactor is complete and working
- Feed components exist and render correctly

### Medium Risk ⚠️
- Component tests might reveal edge cases
- ExplorePage refactor touches user-facing feature
- Must maintain scramblePosts behavior for explore feed

### High Risk 🚨
- **ExplorePage singleton violation:** Creates new GraphQL client
  - **Impact:** Multiple client instances, auth issues, memory leaks
  - **Mitigation:** Use ServiceProvider like all other pages

---

## Benefits Summary

### Achieved ✅
- **Reduced Complexity:** HomePage down 42%
- **Better Testability:** 34 hook tests added
- **Improved Maintainability:** Logic centralized in hooks
- **Type Safety:** Full TypeScript inference
- **Consistency:** Same patterns as NotificationsPage (Phase 11)

### Pending ❌
- **Full Code Reduction:** Need to finish ExplorePage
- **Complete Test Coverage:** Need 60+ component tests
- **Pattern Compliance:** Fix ExplorePage singleton violation
- **Reusability:** ExplorePage should reuse hooks

---

## Estimated Effort

- **Phase 1 (Component Tests):** 2-3 hours
- **Phase 2 (FeedItemWrapper):** 30 minutes
- **Phase 3 (FeedList):** 30 minutes  
- **Phase 4 (ExplorePage Refactor):** 1-2 hours
- **Phase 5 (HomePage Polish):** 15 minutes

**Total:** 4-6 hours (matches original estimate)

---

## Next Steps After Completion

Once Phase 12 is complete, consider applying the same pattern to:

1. **ProfilePage** - User profile with posts grid
2. **PostDetailPage** - Single post with comments
3. **SearchPage** - Search results with infinite scroll

These pages could benefit from:
- Custom hooks for business logic
- Atomic presentation components
- Comprehensive test coverage
- Singleton pattern compliance

---

## Conclusion

The Phase 12 refactoring is **~60% complete**. The hook architecture is solid (34 tests, all passing), but we need to:

1. **Add 60+ component tests** (currently zero)
2. **Fix ExplorePage singleton violation** (critical)
3. **Complete ExplorePage refactor** (reuse useHomePage hook)
4. **Polish HomePage** (use FeedList component)

This will achieve the original goals:
- ✅ HomePage: 217 → ~90 lines (58% reduction)
- ✅ ExplorePage: 211 → ~100 lines (52% reduction)
- ✅ 100+ tests total
- ✅ Singleton pattern respected
- ✅ Full reusability between pages