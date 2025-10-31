# Feed Queries Test Refactoring Analysis

## Executive Summary

The frontend package already has **extensive, high-quality test helpers** that can be reused for the GraphQL server test refactoring. This analysis maps existing frontend test utilities to the refactoring plan phases and recommends creating a shared test utilities package.

---

## Frontend Test Helpers Inventory

### 📁 Location: `/packages/frontend/src/services/__tests__/`

#### **1. Test Helpers** (`helpers/serviceTestHelpers.ts`)

```typescript
✅ HIGHLY REUSABLE - Can adapt for GraphQL server

// Error/Success Testing
- expectServiceError<T>()
- expectServiceSuccess<T>()
- expectMutationCalledWith<T>()
- expectQueryCalledWith<T>()

// Error Scenarios Catalog (lines 135-283)
- errorScenarios.authentication.*
- errorScenarios.validation.*
- errorScenarios.notFound.*
- errorScenarios.permission.*
- errorScenarios.server.*
- errorScenarios.network.*
```

**🎯 Maps to Refactoring Phase 2: Constants and Test Data**
- Comprehensive error code catalog
- Reusable across frontend and backend
- Already follows DRY principles

---

#### **2. GraphQL Fixtures** (`fixtures/graphqlFixtures.ts`)

```typescript
✅ PARTIALLY REUSABLE - Frontend uses AsyncState pattern

// Response Wrappers
- wrapInGraphQLSuccess<T>(data)
- wrapInGraphQLError(message, code)
- createSuccessState<T>(data)
- createErrorState(message, code)

// Auction-Specific
- createAuctionConnection(auctions, pageInfo)
- createBidConnection(bids, total)
- createListAuctionsResponse()
- createGetAuctionResponse()
- createCreateAuctionResponse()
- createPlaceBidResponse()

// Like-Specific
- createLikeResponse()
- createUnlikeResponse()
- createLikeStatusResponse()
```

**🎯 Maps to Refactoring Phase 1: Type Safety Foundation**
- Pattern: AsyncState<T> vs GraphQLResult<T>
- Frontend: Client-side AsyncState (status: 'success' | 'error' | 'loading')
- Backend: Server-side SingleResult (data | errors)
- **Recommendation**: Create adapter layer in shared package

---

#### **3. Feed Fixtures** (`fixtures/feedFixtures.ts`)

```typescript
✅ HIGHLY REUSABLE - Perfect for backend tests

// Feed Builders
- createMockExploreFeed(postCount, hasNextPage)
- createMockFollowingFeed(postCount, hasNextPage)
- createMockEmptyFeed()
- createMockFeedWithPostIds(postIds, hasNextPage)

// Feed Operations
- createMockMarkPostsAsReadInput(postIds)
- createMockMarkPostsAsReadResult(success, markedCount)
```

**🎯 Maps to Refactoring Phase 3: Test Data Builders**
- ✅ Already implements Factory pattern
- ✅ Sensible defaults with overrides
- ✅ DRY principle applied
- **Recommendation**: Move to shared package, adapt for backend types

---

#### **4. Post Fixtures** (`fixtures/postFixtures.ts`)

```typescript
✅ HIGHLY REUSABLE - Core test data builders

// Post Builders
- createMockPost(overrides)
- createMockPosts(count, overrides)
- createMockPostWithLikes(likesCount, isLiked)
- createMockPostWithComments(commentsCount)
- createMockPostByUser(userId, handle)

// Post Operations
- createMockCreatePostInput(overrides)
- createMockUpdatePostInput(overrides)
- createMockCreatePostPayload(overrides)

// Pagination
- createMockPostConnection(posts, hasNextPage)
```

**🎯 Maps to Refactoring Phase 3: Test Data Builders**
- ✅ Comprehensive builder functions
- ✅ Type-safe with Partial<T> overrides
- ✅ Handles Relay pagination (edges, cursors, pageInfo)
- **Recommendation**: Move to shared package

---

#### **5. Profile Fixtures** (`fixtures/profileFixtures.ts`)

```typescript
✅ HIGHLY REUSABLE - Already handles Profile/PublicProfile distinction!

// Profile Builders
- createMockProfile(overrides): Profile          // Full profile with email
- createMockPublicProfile(overrides): PublicProfile  // Without email, has isFollowing
- createMockProfiles(count): Profile[]

// GraphQL Response Builders
- createMockGetProfileResponse(profile): GetProfileByHandleResponse
- createMockUpdateProfileResponse(updates): UpdateProfileResponse

// Semantic Aliases (Auction Context)
- createMockSeller()
- createMockBidder()
- createMockWinner()

// Pre-built Profiles
- mockOwnProfile
- mockFollowedProfile
- mockUnfollowedProfile
```

**🎯 Maps to Refactoring Phase 3: Test Data Builders**
- ✅ **ALREADY SOLVES Profile vs PublicProfile distinction!**
- ✅ Type-safe GraphQL response conversion (undefined → null)
- ✅ Handles complex type relationships
- ✅ Semantic aliases for domain contexts
- **Recommendation**: Move to shared package **IMMEDIATELY**

---

#### **6. Other Fixtures**

```typescript
// auctionFixtures.ts
- createMockAuction(overrides)
- createMockBid(overrides)
- createMockBids(count, auctionId)
// ... extensive auction builders

// commentFixtures.ts
- createMockComment(overrides)
- createMockComments(count)

// likeFixtures.ts
- createMockLikeResponse(overrides)
- createMockLikeStatus(overrides)

// notificationFixtures.ts
- createMockNotification(overrides)
- createMockNotifications(count)
```

---

## Mapping to Refactoring Plan Phases

### Phase 1: Type Safety Foundation ⚠️ NEEDS ADAPTATION

**Frontend Has:**
```typescript
// AsyncState pattern (client-side)
type AsyncState<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: GraphQLError }
  | { status: 'loading' }
```

**Backend Needs:**
```typescript
// GraphQL server response pattern
type GraphQLResult<T> =
  | { kind: 'single'; singleResult: SingleResult<T> }
  | { kind: 'incremental'; initialResult: SingleResult<T> }

interface SingleResult<T> {
  data?: T;
  errors?: GraphQLErrorResponse[];
}
```

**✅ Action:** Create adapter layer in shared package

---

### Phase 2: Constants and Test Data ✅ READY TO MOVE

**Frontend Has:**
```typescript
// errorScenarios object in serviceTestHelpers.ts
export const errorScenarios = {
  authentication: {
    notAuthenticated: {
      message: 'Not authenticated',
      code: 'UNAUTHENTICATED',
    },
  },
  notFound: {
    post: { message: 'Post not found', code: 'NOT_FOUND' },
    comment: { message: 'Comment not found', code: 'NOT_FOUND' },
    // ... comprehensive catalog
  },
  server: {
    fetchExploreFeed: {
      message: 'Failed to fetch explore feed',
      code: 'INTERNAL_SERVER_ERROR',
    },
    fetchFollowingFeed: {
      message: 'Failed to fetch following feed',
      code: 'INTERNAL_SERVER_ERROR',
    },
    // ... 20+ server error scenarios
  },
};
```

**✅ Action:** Move to `@social-media-app/shared/src/test-utils/error-scenarios.ts`

---

### Phase 3: Test Data Builders ✅ READY TO MOVE

**Frontend Has:**
- ✅ `createMockPost()` - Complete post builder
- ✅ `createMockPosts()` - Batch builder
- ✅ `createMockPostConnection()` - Relay pagination
- ✅ `createMockProfile()` - Profile builder
- ✅ `createMockPublicProfile()` - PublicProfile builder
- ✅ `createMockExploreFeed()` - Feed builder
- ✅ `createMockFollowingFeed()` - Feed builder

**Backend Needs:**
- Adapt for DAL types (`PostGridItem`, `PostWithAuthor`, `FeedResponse`)
- Create type converters (frontend Post → backend PostGridItem)

**✅ Action:** Move fixtures to shared, create type converters

---

### Phase 4: Helper Functions ⚠️ NEEDS NEW IMPLEMENTATION

**Frontend Has (not applicable to backend):**
```typescript
- expectServiceError() // Uses AsyncState pattern
- expectServiceSuccess() // Uses AsyncState pattern
- MockGraphQLClient // Frontend mock client
```

**Backend Needs:**
```typescript
- QueryExecutor<T> // Type-safe Apollo Server execution
- ContextBuilder // Build GraphQL context
- FEED_QUERIES // GraphQL query strings
- FeedMatchers // Custom assertions
```

**❌ Action:** Implement new backend-specific helpers (cannot reuse frontend helpers)

---

### Phase 5: Refactored Tests ✅ CAN USE SHARED FIXTURES

**With Shared Fixtures:**
```typescript
import {
  createMockPost,
  createMockPostConnection,
  createMockPublicProfile,
  errorScenarios,
} from '@social-media-app/shared/test-utils';

// Convert to backend types
function toPostGridItem(post: Post): PostGridItem {
  return {
    id: post.id,
    userId: post.userId,
    userHandle: post.author.handle,
    thumbnailUrl: post.thumbnailUrl,
    caption: post.caption,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
  };
}

// Use in tests
const mockPosts = createMockPosts(3).map(toPostGridItem);
```

---

## Recommended Shared Package Structure

```
packages/shared/src/test-utils/
├── index.ts                          # Central exports
├── error-scenarios.ts                # From frontend serviceTestHelpers
├── fixtures/
│   ├── post-fixtures.ts             # From frontend postFixtures
│   ├── profile-fixtures.ts          # From frontend profileFixtures
│   ├── feed-fixtures.ts             # From frontend feedFixtures
│   ├── comment-fixtures.ts          # From frontend commentFixtures
│   ├── auction-fixtures.ts          # From frontend auctionFixtures
│   └── like-fixtures.ts             # From frontend likeFixtures
├── converters/
│   ├── post-converters.ts           # Convert Post → PostGridItem/PostWithAuthor
│   ├── profile-converters.ts       # Convert Profile → backend Profile
│   └── feed-converters.ts          # Convert frontend → backend feed types
└── graphql/
    ├── response-types.ts            # GraphQLResult, SingleResult types
    ├── response-builders.ts         # wrapInGraphQLSuccess, etc.
    └── type-guards.ts               # assertSingleResult, assertNoErrors
```

---

## Benefits of Moving to Shared Package

### ✅ **Immediate Benefits**

1. **Zero Duplication**
   - Single source of truth for test data
   - Consistent test patterns across packages
   - Reduce maintenance burden

2. **Type Safety**
   - Shared types ensure consistency
   - Catch type mismatches at compile time
   - Leverage TypeScript's advanced features

3. **Consistency**
   - Same mock data in frontend and backend tests
   - Consistent error messages and codes
   - Standardized pagination patterns

### ✅ **Long-term Benefits**

1. **Easier Testing**
   - New developers learn one pattern
   - Less cognitive load
   - Faster test writing

2. **Better Test Quality**
   - Proven, battle-tested utilities
   - Comprehensive error scenarios
   - Edge cases already handled

3. **Maintainability**
   - Update fixtures once, benefit everywhere
   - Easier to add new test utilities
   - Clear separation of concerns

---

## Migration Strategy

### Phase 1: Move Error Scenarios (30 minutes)

1. Create `/packages/shared/src/test-utils/error-scenarios.ts`
2. Copy `errorScenarios` from `frontend/serviceTestHelpers.ts`
3. Export from `/packages/shared/src/test-utils/index.ts`
4. Update frontend to import from shared
5. Run frontend tests to verify

### Phase 2: Move Profile Fixtures (1 hour)

1. Create `/packages/shared/src/test-utils/fixtures/profile-fixtures.ts`
2. Copy profile fixture functions from frontend
3. Add JSDoc comments for backend usage
4. Export from test-utils index
5. Update frontend imports
6. Run all tests to verify

### Phase 3: Move Post and Feed Fixtures (1.5 hours)

1. Create post-fixtures.ts and feed-fixtures.ts in shared
2. Copy from frontend
3. Add type converters for backend types
4. Update frontend imports
5. Create examples for backend usage
6. Run all tests

### Phase 4: Create GraphQL Server Helpers (2 hours)

1. Create graphql directory in shared test-utils
2. Implement response types and builders
3. Create type guards for assertions
4. Add comprehensive tests
5. Document usage patterns

### Phase 5: Update Backend Tests (3 hours)

1. Import shared fixtures in graphql-server tests
2. Create type converters as needed
3. Implement QueryExecutor and ContextBuilder
4. Refactor feed-queries.test.ts
5. Run full test suite
6. Measure improvements (lines reduced, duplication %)

---

## Updated Refactoring Plan

### Phase 1: Shared Error Scenarios (30 min)
- Move `errorScenarios` to shared package
- Update frontend imports
- Verify all tests pass

### Phase 2: Shared Profile Fixtures (1 hour)
- Move profile fixtures to shared
- Already handles Profile/PublicProfile distinction!
- Update frontend imports
- Create usage docs

### Phase 3: Shared Post/Feed Fixtures (1.5 hours)
- Move post and feed fixtures to shared
- Create type converters for backend
- Update frontend imports
- Document conversion patterns

### Phase 4: GraphQL Server Types (2 hours)
- Create GraphQL response types in shared
- Implement type guards and builders
- Add comprehensive tests
- Document for backend usage

### Phase 5: Backend Test Helpers (2 hours)
- Create QueryExecutor class
- Create ContextBuilder class
- Create FEED_QUERIES constants
- Create FeedMatchers utilities

### Phase 6: Refactor feed-queries.test.ts (2 hours)
- Use shared fixtures
- Use new helpers
- Reduce from 571 → ~300 lines
- Fix all 11 TypeScript errors
- Achieve <20 lines per test

---

## Success Metrics

### Code Quality

**Before:**
```
- File Lines: 571
- Code Duplication: ~40%
- TypeScript Errors: 11
- Method Length: 50-100 lines
- Setup Code: 100+ lines per suite
```

**After:**
```
- File Lines: ~300 (47% reduction)
- Code Duplication: <3% (93% improvement)
- TypeScript Errors: 0 (100% fixed)
- Method Length: <20 lines (80% reduction)
- Setup Code: ~20 lines per suite (80% reduction)
```

### Reusability

- **Shared Fixtures**: Used by 3+ packages (frontend, graphql-server, backend)
- **Error Scenarios**: Centralized catalog for all tests
- **Type Safety**: 100% type-safe builders
- **Documentation**: Comprehensive JSDoc comments

---

## Conclusion

The frontend package has **excellent test utilities** that can significantly accelerate the GraphQL server test refactoring. By moving these to the shared package:

1. ✅ **Eliminate 60-70% of planned work** (Phases 2-3 already done!)
2. ✅ **Ensure consistency** across all packages
3. ✅ **Improve maintainability** with single source of truth
4. ✅ **Accelerate future development** with proven patterns

**Recommendation:** Start with moving profile fixtures immediately, as they already solve the Profile/PublicProfile distinction that's causing test failures.
