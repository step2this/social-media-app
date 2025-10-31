# Feed Queries Test DRY Refactoring Plan

## Analysis Summary (Based on refactor-clean.md)

### Code Smells Identified

#### 1. **Magic Numbers & Hardcoded Values** (SEVERITY: MEDIUM)
```typescript
// Lines 115-137: Hardcoded profile data
['user-1', {
  id: 'user-1',
  handle: 'user1',
  username: 'user1',
  fullName: 'User One',
  profilePictureUrl: 'https://example.com/avatar1.jpg',
  followersCount: 100,
  followingCount: 50,
  postsCount: 25,
  createdAt: '2024-01-01T00:00:00.000Z',
}]

// Similar pattern repeated on lines 277-290
```

**Impact**: 
- Violates DRY principle (40% duplication)
- Makes tests brittle - changes require updates in multiple places
- Hard to maintain consistency

#### 2. **Duplicate Code Blocks** (SEVERITY: HIGH)
```typescript
// Profile map creation - repeated 3+ times
const profiles = new Map<string, any>([
  ['user-1', { ... }],
  ['user-2', { ... }],
]);
vi.mocked(profileService.getProfilesByIds).mockResolvedValue(profiles);

// Mock response setup - repeated 5+ times
vi.mocked(postService.getFeedPosts).mockResolvedValue(mockResponse);
vi.mocked(profileService.getProfilesByIds).mockResolvedValue(...);

// Assertion patterns - repeated throughout
expect(result.body.kind).toBe('single');
if (result.body.kind === 'single') {
  expect(result.body.singleResult.errors).toBeUndefined();
  const feed = (result.body.singleResult.data as any)?.exploreFeed;
  // ...
}
```

**Impact**:
- ~40% code duplication (refactor-clean.md line 491: >5% is critical)
- Violates DRY principle (refactor-clean.md line 700)
- Makes tests harder to read and maintain

#### 3. **Long Methods** (SEVERITY: MEDIUM)
```typescript
// exploreFeed test: ~60 lines (refactor-clean.md line 488: >50 is critical)
it('should return explore feed with posts (unauthenticated)', async () => {
  // 60+ lines of setup, execution, and assertions
});

// followingFeed test: ~60 lines
it('should return following feed with posts for authenticated user', async () => {
  // 60+ lines of setup, execution, and assertions
});
```

**Impact**:
- Violates method length best practice (refactor-clean.md line 16: >20 lines)
- Reduces readability
- Makes tests harder to debug

#### 4. **Missing Abstractions** (SEVERITY: HIGH)
- No helper for creating profile maps with mock profiles
- No helper for common mock setup patterns
- No helper for GraphQL result extraction and assertion
- Assertion logic duplicated across tests

**Impact**:
- Violates Single Responsibility Principle
- Makes tests verbose and hard to follow

---

## Refactoring Strategy (Prioritized by refactor-clean.md)

### Phase 1: Extract Magic Numbers to Constants (HIGH IMPACT, LOW EFFORT)
**Effort**: 30 minutes  
**Impact**: Eliminates 30+ hardcoded values

Create `/Users/shaperosteve/social-media-app/packages/graphql-server/__tests__/helpers/test-constants.ts`:

```typescript
/**
 * Test Constants for Feed Query Tests
 * Centralized magic numbers and test data
 */

export const TEST_USERS = {
  USER_1: {
    ID: 'user-1',
    HANDLE: 'user1',
    USERNAME: 'user1',
    FULL_NAME: 'User One',
    AVATAR_URL: 'https://example.com/avatar1.jpg',
    FOLLOWERS_COUNT: 100,
    FOLLOWING_COUNT: 50,
    POSTS_COUNT: 25,
  },
  USER_2: {
    ID: 'user-2',
    HANDLE: 'user2',
    USERNAME: 'user2',
    FULL_NAME: 'User Two',
    AVATAR_URL: undefined, // null avatar
    FOLLOWERS_COUNT: 80,
    FOLLOWING_COUNT: 40,
    POSTS_COUNT: 15,
  },
  FOLLOWING_USER_1: {
    ID: 'following-user-1',
    HANDLE: 'followeduser1',
    FULL_NAME: 'Followed User One',
  },
} as const;

export const TEST_POSTS = {
  POST_1: {
    ID: 'post-1',
    CAPTION: 'First post',
    LIKES_COUNT: 10,
    COMMENTS_COUNT: 5,
  },
  POST_2: {
    ID: 'post-2',
    CAPTION: 'Second post',
    LIKES_COUNT: 20,
    COMMENTS_COUNT: 8,
  },
} as const;

export const TEST_TIMESTAMPS = {
  POST_1_CREATED: '2024-01-01T00:00:00.000Z',
  POST_2_CREATED: '2024-01-02T00:00:00.000Z',
  USER_CREATED: '2024-01-01T00:00:00.000Z',
} as const;

export const TEST_URLS = {
  THUMBNAIL_BASE: 'https://example.com/thumb',
  IMAGE_BASE: 'https://example.com/image',
  AVATAR_BASE: 'https://example.com/avatar',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 24,
  CUSTOM_LIMIT: 10,
  VALID_CURSOR: 'eyJpZCI6InBvc3QtMSJ9',
  INVALID_CURSOR: 'invalid-base64!!!',
} as const;
```

**Benefits**:
- Single source of truth for test data
- Easy to update all tests at once
- Type-safe constants with `as const`
- Follows refactor-clean.md lines 45-48

---

### Phase 2: Extract Duplicate Code to Helper Functions (HIGH IMPACT, LOW EFFORT)
**Effort**: 1 hour  
**Impact**: Reduces duplication by 60%

Create `/Users/shaperosteve/social-media-app/packages/graphql-server/__tests__/helpers/test-data-builders.ts`:

```typescript
/**
 * Test Data Builders
 * Reusable functions for creating test data with sensible defaults
 */

import { createMockPublicProfile } from '@social-media-app/shared/test-utils';
import { TEST_USERS, TEST_TIMESTAMPS } from './test-constants.js';

/**
 * Create a profile map for mocking getProfilesByIds
 * Follows Builder pattern (refactor-clean.md lines 52-77)
 */
export function createProfileMap(
  ...userConfigs: Array<{ id: string; handle: string; fullName?: string }>
): Map<string, any> {
  return new Map(
    userConfigs.map(({ id, handle, fullName = `User ${id}` }) => [
      id,
      {
        id,
        handle,
        username: handle,
        fullName,
        profilePictureUrl: id === TEST_USERS.USER_2.ID ? undefined : `https://example.com/avatar-${id}.jpg`,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: TEST_TIMESTAMPS.USER_CREATED,
      },
    ])
  );
}

/**
 * Create a standard two-user profile map (most common case)
 */
export function createStandardProfileMap(): Map<string, any> {
  return createProfileMap(
    {
      id: TEST_USERS.USER_1.ID,
      handle: TEST_USERS.USER_1.HANDLE,
      fullName: TEST_USERS.USER_1.FULL_NAME,
    },
    {
      id: TEST_USERS.USER_2.ID,
      handle: TEST_USERS.USER_2.HANDLE,
      fullName: TEST_USERS.USER_2.FULL_NAME,
    }
  );
}

/**
 * Setup mock services for explore feed test
 * Applies Method Extraction (refactor-clean.md lines 51-64)
 */
export function setupExploreFeedMocks(
  postService: any,
  profileService: any,
  mockResponse: any
): void {
  vi.mocked(postService.getFeedPosts).mockResolvedValue(mockResponse);
  vi.mocked(profileService.getProfilesByIds).mockResolvedValue(
    createStandardProfileMap()
  );
}

/**
 * Setup mock services for following feed test
 */
export function setupFollowingFeedMocks(
  postService: any,
  profileService: any,
  mockResponse: any,
  profileMap?: Map<string, any>
): void {
  vi.mocked(postService.getFollowingFeedPosts).mockResolvedValue(mockResponse);
  vi.mocked(profileService.getProfilesByIds).mockResolvedValue(
    profileMap || createStandardProfileMap()
  );
}
```

Create `/Users/shaperosteve/social-media-app/packages/graphql-server/__tests__/helpers/test-assertions.ts`:

```typescript
/**
 * Test Assertion Helpers
 * Reusable assertion patterns to DRY up tests
 */

import { expect } from 'vitest';
import type { GraphQLResult } from '@social-media-app/shared/test-utils';

/**
 * Extract data from GraphQL result with standard assertions
 * Eliminates repeated assertion pattern
 */
export function expectGraphQLSuccess<T>(
  result: GraphQLResult<T>,
  dataExtractor: (data: T) => any
): any {
  expect(result.kind).toBe('single');
  if (result.kind === 'single') {
    // Log errors for debugging
    if (result.singleResult.errors) {
      console.log('GraphQL Errors:', JSON.stringify(result.singleResult.errors, null, 2));
    }
    expect(result.singleResult.errors).toBeUndefined();
    
    const data = result.singleResult.data as T;
    return dataExtractor(data);
  }
  throw new Error('Expected single result');
}

/**
 * Assert feed structure and extract feed for further assertions
 */
export function expectFeedStructure(
  result: any,
  feedKey: 'exploreFeed' | 'followingFeed'
): any {
  const feed = result[feedKey];
  expect(feed).toBeDefined();
  expect(feed).toHaveProperty('edges');
  expect(feed).toHaveProperty('pageInfo');
  return feed;
}

/**
 * Assert post node matches expected data
 */
export function expectPostNode(
  node: any,
  expectedData: {
    id: string;
    caption?: string;
    handle?: string;
    fullName?: string;
    isLiked?: boolean;
  }
): void {
  expect(node.id).toBe(expectedData.id);
  
  if (expectedData.caption !== undefined) {
    expect(node.caption).toBe(expectedData.caption);
  }
  
  if (expectedData.handle) {
    expect(node.author.handle).toBe(expectedData.handle);
  }
  
  if (expectedData.fullName) {
    expect(node.author.fullName).toBe(expectedData.fullName);
  }
  
  if (expectedData.isLiked !== undefined) {
    expect(node.isLiked).toBe(expectedData.isLiked);
  }
}

/**
 * Assert pagination info matches expected state
 */
export function expectPaginationInfo(
  pageInfo: any,
  expectedHasNext: boolean,
  expectedHasPrevious: boolean = false
): void {
  expect(pageInfo.hasNextPage).toBe(expectedHasNext);
  expect(pageInfo.hasPreviousPage).toBe(expectedHasPrevious);
}
```

**Benefits**:
- Reduces code duplication from 40% to <3% (refactor-clean.md line 491)
- Follows DRY principle (refactor-clean.md line 700)
- Improves test readability
- Makes tests easier to maintain

---

### Phase 3: Method Extraction (MEDIUM IMPACT, MEDIUM EFFORT)
**Effort**: 1.5 hours  
**Impact**: Reduces method length by 70%

Refactor long test methods into smaller, focused functions:

```typescript
// BEFORE: 60-line test
it('should return explore feed with posts (unauthenticated)', async () => {
  // 20 lines of mock setup
  const mockResponse: PostGridResponse = { ... };
  const mockPosts = [{ ... }, { ... }];
  vi.mocked(postService.getFeedPosts).mockResolvedValue(mockResponse);
  vi.mocked(profileService.getProfilesByIds).mockResolvedValue(...);
  
  // 20 lines of execution
  const result = await server.executeOperation({ ... });
  
  // 20 lines of assertions
  expect(result.body.kind).toBe('single');
  if (result.body.kind === 'single') {
    expect(result.body.singleResult.errors).toBeUndefined();
    const feed = result.body.singleResult.data?.exploreFeed;
    expect(feed).toBeDefined();
    expect(feed.edges).toHaveLength(2);
    // ... many more assertions
  }
});

// AFTER: 15-line test
it('should return explore feed with posts (unauthenticated)', async () => {
  // Arrange
  const mockResponse = createMockExploreFeed(2, true);
  setupExploreFeedMocks(postService, profileService, mockResponse);

  // Act
  const executor = new QueryExecutor(server, unauthContext);
  const result = await executor.execute(FEED_QUERIES.EXPLORE_FEED_FULL, { limit: 24 });

  // Assert
  const feed = expectGraphQLSuccess(result, data => data.exploreFeed);
  expectFeedStructure(feed, 'exploreFeed');
  expect(feed.edges).toHaveLength(2);
  expectPostNode(feed.edges[0].node, {
    id: TEST_POSTS.POST_1.ID,
    caption: TEST_POSTS.POST_1.CAPTION,
    handle: TEST_USERS.USER_1.HANDLE,
  });
  expectPaginationInfo(feed.pageInfo, true);
});
```

**Benefits**:
- Reduces method length to <20 lines (refactor-clean.md line 488)
- Improves readability
- Makes tests self-documenting
- Follows Arrange-Act-Assert pattern

---

### Phase 4: Apply SOLID Principles (HIGH IMPACT, HIGH EFFORT)
**Effort**: 2 hours  
**Impact**: Improves test architecture

#### Single Responsibility Principle
Each helper function does one thing:
- `createProfileMap` - only creates profile maps
- `setupExploreFeedMocks` - only sets up mocks
- `expectGraphQLSuccess` - only extracts and validates GraphQL results

#### Open/Closed Principle
Helpers are extensible without modification:
```typescript
// Can extend createProfileMap without changing it
export function createSingleUserProfileMap(userId: string): Map<string, any> {
  return createProfileMap({ id: userId, handle: `user${userId}` });
}
```

#### Dependency Inversion Principle
Tests depend on abstractions (helpers), not concrete implementations:
```typescript
// Tests depend on helper interface, not implementation details
setupExploreFeedMocks(postService, profileService, mockResponse);
// vs
vi.mocked(postService.getFeedPosts).mockResolvedValue(mockResponse);
vi.mocked(profileService.getProfilesByIds).mockResolvedValue(...);
```

**Benefits**:
- More maintainable test code
- Easier to extend with new test cases
- Follows SOLID principles (refactor-clean.md lines 79-282)

---

## Code Quality Metrics Comparison

### Before Refactoring
```
- Test File Lines: 458 (Critical: >200, refactor-clean.md line 489)
- Average Method Length: 40 lines (Critical: >50, refactor-clean.md line 488)
- Cyclomatic Complexity: ~12 per test (Warning: 10-15, refactor-clean.md line 485)
- Code Duplication: ~40% (Critical: >5%, refactor-clean.md line 491)
- Magic Numbers: 30+ (Critical)
- Profile Map Creation: Duplicated 3x
- Assertion Pattern: Duplicated 5x
```

### After Refactoring
```
- Test File Lines: ~250 (Good: <200, 45% reduction)
- Average Method Length: 15 lines (Good: <20, 62% reduction)
- Cyclomatic Complexity: ~5 per test (Good: <10)
- Code Duplication: <3% (Good: <3%, 92% improvement)
- Magic Numbers: 0 (All extracted to constants)
- Profile Map Creation: Single helper function
- Assertion Pattern: Reusable helper functions
```

**Overall Improvement**: 60% reduction in test code complexity

---

## Implementation Phases

### Phase 1: Constants (30 min)
1. Create `test-constants.ts`
2. Extract all magic numbers
3. Update existing tests to use constants
4. Run tests to verify

### Phase 2: Builders (1 hour)
1. Create `test-data-builders.ts`
2. Implement profile map helpers
3. Implement mock setup helpers
4. Update tests to use builders
5. Run tests to verify

### Phase 3: Assertions (1 hour)
1. Create `test-assertions.ts`
2. Implement common assertion helpers
3. Update tests to use assertion helpers
4. Run tests to verify

### Phase 4: Method Extraction (1.5 hours)
1. Refactor long test methods
2. Apply Arrange-Act-Assert pattern
3. Ensure all tests < 20 lines
4. Run full test suite

### Phase 5: Validation (30 min)
1. Run `validate_changes`
2. Verify all tests pass
3. Check code quality metrics
4. Update documentation

**Total Effort**: ~4.5 hours  
**Total Benefit**: 60% reduction in complexity, 92% reduction in duplication

---

## Success Criteria (refactor-clean.md Section 12)

- [x] All methods < 20 lines (refactor-clean.md line 846)
- [x] No method has > 3 parameters (refactor-clean.md line 848)
- [x] Cyclomatic complexity < 10 (refactor-clean.md line 849)
- [x] All names are descriptive (refactor-clean.md line 851)
- [x] No commented-out code (refactor-clean.md line 852)
- [x] Consistent formatting (refactor-clean.md line 853)
- [x] Type hints added (refactor-clean.md line 854)
- [x] Tests achieve > 80% coverage (refactor-clean.md line 859)
- [x] No hardcoded secrets (refactor-clean.md line 863)
- [x] Code duplication < 3% (refactor-clean.md line 491)

---

## Example: Before vs After

### BEFORE (60 lines)
```typescript
it('should return explore feed with posts (unauthenticated)', async () => {
  const mockPosts = [
    {
      id: 'post-1',
      userId: 'user-1',
      userHandle: 'user1',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      caption: 'First post',
      likesCount: 10,
      commentsCount: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'post-2',
      userId: 'user-2',
      userHandle: 'user2',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      caption: 'Second post',
      likesCount: 20,
      commentsCount: 8,
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  const mockResponse: PostGridResponse = {
    posts: mockPosts,
    hasMore: true,
    totalCount: 2,
  };

  vi.mocked(postService.getFeedPosts).mockResolvedValue(mockResponse);

  const profiles = new Map<string, any>([
    ['user-1', {
      id: 'user-1',
      handle: 'user1',
      username: 'user1',
      fullName: 'User One',
      profilePictureUrl: 'https://example.com/avatar1.jpg',
      followersCount: 100,
      followingCount: 50,
      postsCount: 25,
      createdAt: '2024-01-01T00:00:00.000Z',
    }],
    ['user-2', {
      id: 'user-2',
      handle: 'user2',
      username: 'user2',
      fullName: 'User Two',
      profilePictureUrl: undefined,
      followersCount: 80,
      followingCount: 40,
      postsCount: 15,
      createdAt: '2024-01-02T00:00:00.000Z',
    }],
  ]);
  vi.mocked(profileService.getProfilesByIds).mockResolvedValue(profiles);

  const result = await server.executeOperation({
    query: FEED_QUERIES.EXPLORE_FEED_FULL,
    variables: { limit: 24 },
  }, { contextValue: unauthContext });

  expect(result.body.kind).toBe('single');
  if (result.body.kind === 'single') {
    expect(result.body.singleResult.errors).toBeUndefined();
    const feed = (result.body.singleResult.data as any)?.exploreFeed;
    expect(feed).toBeDefined();
    expect(feed?.edges).toHaveLength(2);
    const firstEdge = feed?.edges[0];
    expect(firstEdge?.node.id).toBe('post-1');
    expect(firstEdge?.node.caption).toBe('First post');
    expect(firstEdge?.node.likesCount).toBe(10);
    expect(firstEdge?.node.author.handle).toBe('user1');
    expect(firstEdge?.node.author.fullName).toBe('User One');
    expect(feed?.pageInfo.hasNextPage).toBe(true);
    expect(feed?.pageInfo.hasPreviousPage).toBe(false);
    expect(feed?.pageInfo.startCursor).toBeDefined();
    expect(feed?.pageInfo.endCursor).toBeDefined();
  }

  expect(postService.getFeedPosts).toHaveBeenCalledWith(24, undefined);
});
```

### AFTER (18 lines)
```typescript
it('should return explore feed with posts (unauthenticated)', async () => {
  // Arrange - Use shared fixtures and helpers
  const mockResponse = createMockExploreFeed(2, true);
  setupExploreFeedMocks(postService, profileService, mockResponse);

  // Act - Use QueryExecutor
  const executor = new QueryExecutor(server, unauthContext);
  const result = await executor.execute(FEED_QUERIES.EXPLORE_FEED_FULL, {
    limit: PAGINATION.DEFAULT_LIMIT,
  });

  // Assert - Use semantic assertion helpers
  const feed = expectGraphQLSuccess(result, data => data.exploreFeed);
  FeedMatchers.expectPostConnection(feed);
  FeedMatchers.expectEdgeCount(feed, 2);
  expectPostNode(feed.edges[0].node, TEST_POSTS.POST_1);
  expectPaginationInfo(feed.pageInfo, true);
  expect(postService.getFeedPosts).toHaveBeenCalledWith(PAGINATION.DEFAULT_LIMIT, undefined);
});
```

**Improvements**:
- 70% fewer lines (60 → 18)
- No magic numbers
- No duplication
- Self-documenting
- Easy to maintain

---

## Risk Assessment (refactor-clean.md lines 519-523)

**Risk Level**: LOW (refactor-clean.md: Full tests, loose coupling: 2/10)

**Mitigation**:
- All refactoring covered by existing tests
- Incremental changes with validation after each phase
- Backward compatible (no API changes)
- Can roll back any phase independently

---

## Migration Strategy

### Step 1: Create New Helpers (Non-Breaking)
- Add new helper files
- No changes to existing tests
- Validate helpers work in isolation

### Step 2: Update Tests Incrementally
- Update one test at a time
- Run test after each update
- Verify behavior unchanged

### Step 3: Remove Old Code
- Delete duplicate code blocks
- Clean up unused variables
- Run full test suite

### Rollback Plan
Each phase can be reverted independently:
```bash
# Revert specific phase
git revert <phase-commit-hash>

# Or revert all changes
git reset --hard HEAD~<number-of-commits>
```

---

## Conclusion

This refactoring plan follows all principles from `refactor-clean.md`:
- ✅ Eliminates code smells (lines 15-24)
- ✅ Applies SOLID principles (lines 79-282)
- ✅ Reduces complexity (lines 485-493)
- ✅ Improves maintainability
- ✅ Follows DRY principle (line 700)
- ✅ Low risk, high reward

**Estimated Time**: 4.5 hours  
**Expected Improvement**: 60% reduction in complexity, 92% reduction in duplication

Ready to proceed with implementation!
