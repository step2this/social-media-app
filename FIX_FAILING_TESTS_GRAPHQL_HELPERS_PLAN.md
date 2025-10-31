# Fix Failing Tests: GraphQL Helpers & TypeScript Advanced Types

**Date:** 2025-10-30
**Status:** In Progress (Phase 2 Complete)
**Related:** SKILL.md (TypeScript Advanced Types), NOTIFICATION_SERVICE_IMPLEMENTATION.md

## Executive Summary

Fix 19 failing frontend tests by applying TypeScript advanced type patterns from SKILL.md. The root cause is **duplicated GraphQL response helpers** across hook tests that create inconsistent structures, particularly missing the proper Relay Connection pattern (edges/pageInfo).

**Key Insight:** The shared `graphqlFixtures.ts` already has correct Connection helpers for Auctions, but is incomplete for other operations (Likes, Follows, Posts, Comments). Hook tests compensate by creating local helpers with **wrong structures**.

## Problem Analysis

### 🔍 Failing Tests Breakdown

- **useAuctions hook** (9 tests) - Wrong GraphQL response structure (missing Connection pattern)
- **useLike hook** (1 test) - Wrong field name in test fixture (`likeStatus` vs `postLikeStatus`)
- **HomePage tests** (8 tests) - Missing ServiceProvider context wrapper
- **useFollow hook** (0 tests currently failing, but has duplicated helpers)

### 🚨 Root Cause: Duplicated & Inconsistent GraphQL Response Helpers

#### ✅ What EXISTS in Shared Fixtures

**`graphqlFixtures.ts`** (Auction responses ONLY):
```typescript
✅ createListAuctionsResponse() - With proper Connection/edges/pageInfo structure
✅ createGetAuctionResponse()
✅ createGetBidsResponse()
✅ createCreateAuctionResponse()
✅ createPlaceBidResponse()
```

**Domain Fixtures** (Entity data creators):
```typescript
✅ auctionFixtures.ts - createMockAuction(), createMockBid()
✅ likeFixtures.ts - createMockLikeStatus(), createMockLikeResponse()
✅ commentFixtures.ts - createMockComment()
✅ postFixtures.ts - createMockPost()
✅ feedFixtures.ts - createMockFeedItem()
✅ profileFixtures.ts - createMockProfile()
✅ notificationFixtures.ts - createMockNotification()
✅ followFixtures.ts (NOT FOUND - needs creation)
```

#### ❌ What's MISSING in Shared Fixtures

**Missing GraphQL Response Wrappers:**
```typescript
❌ createLikeResponse() - for likePost mutation
❌ createUnlikeResponse() - for unlikePost mutation
❌ createLikeStatusResponse() - for getLikeStatus query (WRONG FIELD NAME in tests!)
❌ createFollowResponse() - for followUser mutation
❌ createUnfollowResponse() - for unfollowUser mutation
❌ createFollowStatusResponse() - for getFollowStatus query
❌ createGetPostResponse() - for getPost query
❌ createGetCommentsResponse() - for getComments query (needs Connection)
❌ createGetFeedResponse() - for feed queries (needs Connection)
```

### 📊 Current Problems by File

#### 1. **useAuctions.test.ts** - Wrong Structure (9 failing tests)

```typescript
// LOCAL (BROKEN - doesn't use Connection pattern):
const createListAuctionsResponse = (auctions, hasMore, nextCursor) =>
  wrapInGraphQLSuccess({
    listAuctions: { auctions, hasMore, nextCursor }  // ❌ WRONG!
  });

// SHOULD USE SHARED (CORRECT):
import { createListAuctionsResponse } from '../services/__tests__/fixtures/graphqlFixtures';
// Returns: { auctions: { edges: [...], pageInfo: {...} } }  ✅ CORRECT!
```

**Problem:** Test creates flat structure instead of Connection (edges/pageInfo).

#### 2. **useLike.test.ts** - Wrong Field Name (1 failing test)

```typescript
// LOCAL (WRONG FIELD NAME):
const createLikeStatusResponse = (overrides) => wrapInGraphQLSuccess({
  likeStatus: { isLiked: true, likesCount: 42 }  // ❌ Wrong field!
});

// ACTUAL QUERY EXPECTS:
query GetLikeStatus {
  postLikeStatus { isLiked, likesCount }  // ✅ Correct field name
}

// NEEDS SHARED:
export function createLikeStatusResponse(status: LikeStatus) {
  return wrapInGraphQLSuccess({
    postLikeStatus: status  // ✅ Matches actual query
  });
}
```

**Problem:** Test fixture uses wrong GraphQL field name.

#### 3. **useFollow.test.ts** - Duplicated Helpers (no failures yet)

```typescript
// THREE local helpers that should be shared:
const createFollowResponse = (overrides) => wrapInGraphQLSuccess({ ... });
const createUnfollowResponse = (overrides) => wrapInGraphQLSuccess({ ... });
const createFollowStatusResponse = (overrides) => wrapInGraphQLSuccess({ ... });
```

**Problem:** Duplicated code that should be in shared fixtures.

#### 4. **HomePage.test.tsx** - Missing ServiceProvider (8 failing tests)

```typescript
// CURRENT (MISSING PROVIDER):
const renderHomePage = () => render(
  <BrowserRouter>
    <HomePage />  {/* ❌ useServices() hook fails without provider */}
  </BrowserRouter>
);

// NEEDED:
const renderHomePage = () => renderWithProviders(<HomePage />);
```

**Problem:** HomePage uses `useServices()` which requires ServiceProvider wrapper (see NOTIFICATION_SERVICE_IMPLEMENTATION.md lines 149-167).

## Solution Strategy

Following **TypeScript Advanced Types** (SKILL.md) and **DRY principles**:

### Phase 1: Add Type Guards & Safe Helpers ✅ COMPLETE

**Status:** All 37 tests passing

**Implementation:**
- ✅ Added `isConnection<T>()` type guard (SKILL.md lines 622-641)
- ✅ Added `hasEdges<T>()` type guard
- ✅ Added `safeUnwrapConnection<T>()` - wraps existing helper with null safety
- ✅ Added `safeGetPageInfo<T>()` - wraps existing helper with null safety
- ✅ Added `safeHasNextPage<T>()` - wraps existing helper with null safety
- ✅ Added `assertConnection<T>()` assertion function (SKILL.md lines 643-657)

**File:** `/packages/frontend/src/graphql/helpers.ts`

**Benefits:**
- Extends existing helpers without breaking them
- Uses TypeScript utility types (SKILL.md lines 222-248)
- Returns safe defaults instead of crashing
- Applies type guards for runtime safety

### Phase 2: Fix AuctionService ✅ COMPLETE

**Status:** All 13 AuctionService tests passing

**Implementation:**
- ✅ Updated AuctionService to use `safeUnwrapConnection()` and `safeGetPageInfo()`
- ✅ Fixed test expectation (`toBeUndefined()` instead of `toBeNull()`)
- ✅ No more crashes on null/undefined GraphQL responses

**File:** `/packages/frontend/src/services/implementations/AuctionService.graphql.ts`

### Phase 2.5: Extend graphqlFixtures.ts (CURRENT PHASE)

**Goal:** Add missing GraphQL response wrappers for all operations.

**Pattern:** Generic type-safe wrappers following SKILL.md patterns.

#### Add Like Operation Responses

```typescript
/**
 * Like operation responses
 * Following TypeScript generics pattern (SKILL.md lines 38-53)
 */
export function createLikeResponse(
  response: LikeResponse
): AsyncState<{ likePost: LikeResponse }> {
  return wrapInGraphQLSuccess({ likePost: response });
}

export function createUnlikeResponse(
  response: LikeResponse
): AsyncState<{ unlikePost: LikeResponse }> {
  return wrapInGraphQLSuccess({ unlikePost: response });
}

export function createLikeStatusResponse(
  status: LikeStatus
): AsyncState<{ postLikeStatus: LikeStatus }> {  // ✅ Correct field name!
  return wrapInGraphQLSuccess({ postLikeStatus: status });
}
```

#### Add Follow Operation Responses

```typescript
/**
 * Follow operation responses
 */
export function createFollowResponse(
  response: FollowResponse
): AsyncState<{ followUser: FollowResponse }> {
  return wrapInGraphQLSuccess({ followUser: response });
}

export function createUnfollowResponse(
  response: FollowResponse
): AsyncState<{ unfollowUser: FollowResponse }> {
  return wrapInGraphQLSuccess({ unfollowUser: response });
}

export function createFollowStatusResponse(
  status: FollowStatus
): AsyncState<{ followStatus: FollowStatus }> {
  return wrapInGraphQLSuccess({ followStatus: status });
}
```

#### Add Post/Comment Operation Responses

```typescript
/**
 * Post operation responses
 */
export function createGetPostResponse(
  post: Post | null
): AsyncState<{ post: Post | null }> {
  return createSuccessState({ post });
}

/**
 * Comment operation responses (with Connection pattern)
 */
export function createGetCommentsResponse(
  comments: Comment[],
  pageInfo: Partial<PageInfo> = {}
): AsyncState<{ comments: CommentConnection }> {
  return createSuccessState({
    comments: createCommentConnection(comments, pageInfo)
  });
}

// Helper for comment connections
function createCommentConnection(
  comments: Comment[],
  pageInfo: Partial<PageInfo> = {}
): CommentConnection {
  const edges: CommentEdge[] = comments.map((comment, i) => ({
    cursor: `cursor-${i + 1}`,
    node: comment,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
      ...pageInfo,
    },
  };
}
```

#### Create followFixtures.ts (Missing Domain Fixtures)

```typescript
/**
 * Test Fixtures for Follow Service
 */
import type { FollowResponse, FollowStatus } from '../../../graphql/operations/follows';

export function createMockFollowResponse(
  overrides: Partial<FollowResponse> = {}
): FollowResponse {
  return {
    success: true,
    followerCount: 1,
    followingCount: 0,
    isFollowing: true,
    ...overrides,
  };
}

export function createMockUnfollowResponse(
  overrides: Partial<FollowResponse> = {}
): FollowResponse {
  return {
    success: true,
    followerCount: 0,
    followingCount: 0,
    isFollowing: false,
    ...overrides,
  };
}

export function createMockFollowStatus(
  overrides: Partial<FollowStatus> = {}
): FollowStatus {
  return {
    isFollowing: false,
    followerCount: 0,
    followingCount: 0,
    ...overrides,
  };
}
```

### Phase 3: Fix Hook Tests to Use Shared Helpers

#### 3.1 Fix useAuctions.test.ts

**Current:** Local `createListAuctionsResponse` with wrong structure
**Fix:** Import and use shared helper

```typescript
// REMOVE LOCAL HELPER (lines 25-33)

// ADD IMPORT:
import { createListAuctionsResponse } from '../services/__tests__/fixtures/graphqlFixtures.js';

// Tests now work because shared helper uses correct Connection structure
```

#### 3.2 Fix useLike.test.ts

**Current:** Local helpers with wrong field names
**Fix:** Import and use shared helpers

```typescript
// REMOVE LOCAL HELPERS (lines 35-50)

// ADD IMPORTS:
import {
  createLikeResponse,
  createUnlikeResponse,
  createLikeStatusResponse,
} from '../services/__tests__/fixtures/graphqlFixtures.js';
import {
  createMockLikeResponse,
  createMockUnlikeResponse,
  createMockLikeStatus,
} from '../services/__tests__/fixtures/likeFixtures.js';

// Example usage:
mockClient.setMutationResponse(
  createLikeResponse(createMockLikeResponse({ likesCount: 43 }))
);

mockClient.setQueryResponse(
  createLikeStatusResponse(createMockLikeStatus({ isLiked: true }))
);
```

#### 3.3 Fix useFollow.test.ts

**Current:** Local helpers duplicating logic
**Fix:** Import and use shared helpers

```typescript
// REMOVE LOCAL HELPERS (lines ~40-55)

// ADD IMPORTS:
import {
  createFollowResponse,
  createUnfollowResponse,
  createFollowStatusResponse,
} from '../services/__tests__/fixtures/graphqlFixtures.js';
import {
  createMockFollowResponse,
  createMockUnfollowResponse,
  createMockFollowStatus,
} from '../services/__tests__/fixtures/followFixtures.js';
```

### Phase 4: Add ServiceProvider to HomePage Tests

#### 4.1 Create Test Utility

**File:** `/packages/frontend/src/test-utils/test-providers.tsx` (new)

```typescript
import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ServiceProvider } from '../services/ServiceProvider';

/**
 * Test wrapper with all required providers
 * Pattern follows NOTIFICATION_SERVICE_IMPLEMENTATION.md (lines 149-167)
 */
export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <ServiceProvider>
        {children}
      </ServiceProvider>
    </BrowserRouter>
  );
}

/**
 * Render helper with providers pre-configured
 */
export function renderWithProviders(ui: ReactNode) {
  return render(ui, { wrapper: AllProviders });
}
```

#### 4.2 Update HomePage.test.tsx

```typescript
// ADD IMPORT:
import { renderWithProviders } from '../test-utils/test-providers';

// REPLACE:
const renderHomePage = () => render(
  <BrowserRouter><HomePage /></BrowserRouter>
);

// WITH:
const renderHomePage = () => renderWithProviders(<HomePage />);
```

### Phase 5: Add Edge Case Tests for AuctionService

Add tests for null/undefined responses:

```typescript
describe('AuctionServiceGraphQL edge cases', () => {
  it('should handle null auctions field', async () => {
    mockClient.setQueryResponse(wrapInGraphQLSuccess({
      auctions: null
    }));

    const result = await service.listAuctions();

    expect(result.status).toBe('success');
    expect(result.data.auctions).toEqual([]);
    expect(result.data.hasMore).toBe(false);
  });

  it('should handle undefined auctions field', async () => {
    mockClient.setQueryResponse(wrapInGraphQLSuccess({
      auctions: undefined
    }));

    const result = await service.listAuctions();

    expect(result.status).toBe('success');
    expect(result.data.auctions).toEqual([]);
  });
});
```

## Implementation Checklist

### ✅ Phase 1: Type Guards & Safe Helpers (COMPLETE)
- [x] Write tests for `isConnection`, `hasEdges` type guards
- [x] Implement type guards
- [x] Write tests for safe extraction utilities
- [x] Implement `safeUnwrapConnection`, `safeGetPageInfo`, `safeHasNextPage`
- [x] Write tests for assertion function
- [x] Implement `assertConnection`
- [x] All 37 helper tests passing

### ✅ Phase 2: Fix AuctionService (COMPLETE)
- [x] Update AuctionService to use safe helpers
- [x] Fix test expectation (undefined vs null)
- [x] All 13 AuctionService tests passing

### 🔄 Phase 2.5: Extend graphqlFixtures.ts (IN PROGRESS)
- [ ] Create `followFixtures.ts` domain fixtures
- [ ] Add Like response wrappers to graphqlFixtures.ts
- [ ] Add Follow response wrappers to graphqlFixtures.ts
- [ ] Add Post/Comment response wrappers to graphqlFixtures.ts
- [ ] Add tests for new helpers

### 📋 Phase 3: Fix Hook Tests (PENDING)
- [ ] Fix useAuctions.test.ts - remove local helper, import shared
- [ ] Fix useLike.test.ts - remove local helpers, import shared
- [ ] Fix useFollow.test.ts - remove local helpers, import shared
- [ ] Run hook tests to verify

### 📋 Phase 4: HomePage Tests (PENDING)
- [ ] Create test-providers.tsx utility
- [ ] Update HomePage.test.tsx to use renderWithProviders
- [ ] Run HomePage tests to verify

### 📋 Phase 5: Edge Cases (PENDING)
- [ ] Add null/undefined tests to AuctionService.test.ts
- [ ] Add similar tests to other services as needed

### 📋 Phase 6: Validation (PENDING)
- [ ] Run all frontend tests: `pnpm --filter @social-media-app/frontend test`
- [ ] Verify TypeScript: `pnpm --filter @social-media-app/frontend typecheck`
- [ ] Run linting: `pnpm --filter @social-media-app/frontend lint`

## Success Criteria

### Tests Fixed
- [x] Phase 1 helper tests: 37/37 passing ✅
- [x] Phase 2 AuctionService tests: 13/13 passing ✅
- [ ] useAuctions tests: 0/14 passing (currently 9 failing)
- [ ] useLike tests: 0/1 failing (field name issue)
- [ ] HomePage tests: 0/8 failing (ServiceProvider issue)
- [ ] **TOTAL TARGET:** All 19+ failing tests passing

### Type Safety Improvements
- [x] Type guards for GraphQL responses ✅
- [x] Safe extraction utilities ✅
- [x] Assertion functions for type narrowing ✅
- [ ] Generic constraints on response helpers
- [ ] Proper Connection types throughout

### Code Quality
- [x] No TypeScript errors ✅
- [ ] No linting errors
- [ ] Comprehensive test coverage
- [ ] Documentation updated

### Patterns Applied from SKILL.md
- [x] Type Guards (lines 622-641) ✅
- [x] Utility Types (lines 222-248) ✅
- [ ] Conditional Types (lines 68-112)
- [x] Generic Constraints (lines 38-53) ✅
- [x] Assertion Functions (lines 643-657) ✅

## Benefits

### Immediate
- ✅ Phase 1: All helper tests passing (37/37)
- ✅ Phase 2: All AuctionService tests passing (13/13)
- 🔄 Phase 3+: Will fix remaining 18+ failing tests
- ✅ No more runtime crashes from undefined properties
- ✅ Type-safe GraphQL response handling

### Long-term
- 🚀 Single Source of Truth for all GraphQL response structures
- 🚀 Reusable type guards for all services
- 🚀 Consistent error handling patterns
- 🚀 Easier to add new GraphQL operations
- 🚀 Better developer experience with proper types
- 🚀 Prevention of similar bugs in future

### Maintainability
- 📚 DRY - No duplicated response creation logic
- 📚 Type-safe - Proper field names enforced by TypeScript
- 📚 Testable - All fixtures have proper test coverage
- 📚 Documented - Clear patterns for future developers
- 📚 Composable - Mix domain fixtures with GraphQL wrappers

## Files Modified

### ✅ Phase 1 (COMPLETE)
- [x] `/packages/frontend/src/graphql/helpers.ts` - Added safe helpers
- [x] `/packages/frontend/src/graphql/__tests__/helpers.test.ts` - Added 37 tests

### ✅ Phase 2 (COMPLETE)
- [x] `/packages/frontend/src/services/implementations/AuctionService.graphql.ts` - Use safe helpers
- [x] `/packages/frontend/src/services/__tests__/AuctionService.test.ts` - Fix expectation

### 🔄 Phase 2.5 (IN PROGRESS)
- [ ] `/packages/frontend/src/services/__tests__/fixtures/graphqlFixtures.ts` - Add Like/Follow/Post wrappers
- [ ] `/packages/frontend/src/services/__tests__/fixtures/followFixtures.ts` - Create new file

### 📋 Phase 3 (PENDING)
- [ ] `/packages/frontend/src/hooks/useAuctions.test.ts` - Remove local helper
- [ ] `/packages/frontend/src/hooks/useLike.test.ts` - Remove local helpers
- [ ] `/packages/frontend/src/hooks/useFollow.test.ts` - Remove local helpers

### 📋 Phase 4 (PENDING)
- [ ] `/packages/frontend/src/test-utils/test-providers.tsx` - Create new file
- [ ] `/packages/frontend/src/pages/HomePage.test.tsx` - Use renderWithProviders

## Related Documentation

- **SKILL.md** - TypeScript Advanced Types reference
- **NOTIFICATION_SERVICE_IMPLEMENTATION.md** - ServiceProvider pattern
- **TEST_FIXTURES_COMPLETE.md** - Existing fixture patterns
- **GRAPHQL_HELPERS_EXTRACTION_PLAN.md** - GraphQL helper patterns

## Progress Tracking

**Session Started:** 2025-10-30 13:16:32 UTC
**Last Updated:** 2025-10-30 13:30:41 UTC

**Phase 1:** ✅ Complete (37 tests passing)
**Phase 2:** ✅ Complete (13 tests passing)
**Phase 2.5:** 🔄 In Progress (Adding shared GraphQL response wrappers)
**Phase 3:** 📋 Pending (Fix hook tests)
**Phase 4:** 📋 Pending (Fix HomePage tests)
**Phase 5:** 📋 Pending (Add edge case tests)

**Overall:** 50/19 tests passing (Phases 1-2 added new tests, Phase 3+ will fix failing ones)
