# Query Resolver TDD Completion Plan

## Executive Summary

**Goal**: Complete Query.ts refactoring using Test-Driven Development (TDD) for the remaining 8 resolvers.

**Current State**: 6/14 resolvers refactored into separate files with use cases
**Target State**: 14/14 resolvers with full SOLID architecture + 100% test coverage

**Remaining Resolvers** (already using TDD helpers, need extraction to separate files):
1. `comments` (lines 129-146)
2. `followStatus` (lines 148-161)
3. `postLikeStatus` (lines 163-179)
4. `notifications` (lines 182-200)
5. `unreadNotificationsCount` (lines 202-205)
6. `auction` (lines 208-212)
7. `auctions` (lines 215-231)
8. `bids` (lines 234-245)

**Estimated Time**: 8-12 hours (1-1.5 hours per resolver)

---

## TDD Principles We'll Follow

### Red-Green-Refactor Cycle
```
1. 🔴 RED: Write failing test
2. 🟢 GREEN: Write minimal code to pass
3. 🔵 REFACTOR: Clean up while keeping tests green
```

### Test First, Always
- Write use case test → Implement use case
- Write resolver test → Implement resolver
- Never write code without a failing test first

### 100% Coverage Target
- Every use case fully unit tested
- Every resolver integration tested
- Every error path covered

---

## Phase 1: Comments Resolver (TDD)

### Step 1.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/comment/__tests__/GetCommentsByPost.test.ts`

**Test Cases**:
```typescript
describe('GetCommentsByPost', () => {
  // Happy path
  it('should return comments for a post', async () => {
    // Arrange: Mock repository with test data
    // Act: Execute use case
    // Assert: Verify correct comments returned
  });

  // Pagination
  it('should respect limit parameter', async () => {});
  it('should respect cursor parameter', async () => {});
  it('should return hasMore=true when more comments exist', async () => {});
  it('should return hasMore=false when no more comments', async () => {});

  // Edge cases
  it('should return empty array for post with no comments', async () => {});
  it('should handle invalid postId gracefully', async () => {});

  // Error handling
  it('should return error when repository throws', async () => {});
});
```

**Lines**: ~150 lines of tests

### Step 1.2: Create Domain Interface (🟢 GREEN)

**File**: `packages/graphql-server/src/domain/repositories/ICommentRepository.ts`

```typescript
import type { Result } from '../../shared/types/result.js';
import type { PaginatedResult } from '../../shared/types/pagination.js';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ICommentRepository {
  getCommentsByPost(
    postId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Comment>, Error>>;
}
```

**Lines**: ~20 lines

### Step 1.3: Implement Use Case (🟢 GREEN)

**File**: `packages/graphql-server/src/application/use-cases/comment/GetCommentsByPost.ts`

```typescript
import type { ICommentRepository, Comment } from '../../../domain/repositories/ICommentRepository.js';
import type { Result } from '../../../shared/types/result.js';
import type { PaginatedResult } from '../../../shared/types/pagination.js';

export class GetCommentsByPost {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async execute(
    postId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Comment>, Error>> {
    return this.commentRepository.getCommentsByPost(postId, limit, cursor);
  }
}
```

**Lines**: ~20 lines

Run tests: `npm test -- GetCommentsByPost.test.ts` → 🟢 GREEN

### Step 1.4: Create Adapter (🟢 GREEN)

**File**: `packages/graphql-server/src/infrastructure/adapters/CommentServiceAdapter.ts`

```typescript
import type { ICommentRepository, Comment } from '../../domain/repositories/ICommentRepository.js';
import type { ICommentService } from '@social-media-app/dal';
import { success, failure } from '../../shared/types/result.js';

export class CommentServiceAdapter implements ICommentRepository {
  constructor(private readonly commentService: ICommentService) {}

  async getCommentsByPost(postId: string, limit: number, cursor?: string) {
    try {
      const result = await this.commentService.getCommentsByPost(postId, limit, cursor);
      return success({
        items: result.comments,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      return failure(error as Error);
    }
  }
}
```

**Lines**: ~30 lines

**Test File**: `packages/graphql-server/src/infrastructure/adapters/__tests__/CommentServiceAdapter.test.ts` (~80 lines)

### Step 1.5: Write Resolver Test (🔴 RED)

**File**: `packages/graphql-server/src/resolvers/comment/__tests__/commentsResolver.test.ts`

```typescript
import { createCommentsResolver } from '../commentsResolver.js';
import { Container } from '../../../infrastructure/di/Container.js';
import type { GraphQLContext } from '../../../context.js';

describe('commentsResolver', () => {
  let container: Container;
  let context: GraphQLContext;

  beforeEach(() => {
    // Setup container with mock services
    // Setup context
  });

  it('should return comments connection', async () => {
    // Arrange: Mock use case
    // Act: Call resolver
    // Assert: Verify connection structure
  });

  it('should validate cursor', async () => {});
  it('should handle errors gracefully', async () => {});
  it('should build correct cursor keys', async () => {});
});
```

**Lines**: ~100 lines

### Step 1.6: Implement Resolver (🟢 GREEN)

**File**: `packages/graphql-server/src/resolvers/comment/commentsResolver.ts`

```typescript
import type { QueryResolvers } from '../../schema/generated/types.js';
import type { Container } from '../../infrastructure/di/Container.js';
import { requireValidCursor } from '../../infrastructure/resolvers/helpers/validateCursor.js';
import { buildConnection } from '../../infrastructure/resolvers/helpers/ConnectionBuilder.js';

export function createCommentsResolver(container: Container): QueryResolvers['comments'] {
  return async (_parent, args, _context, _info) => {
    const useCase = container.resolve('GetCommentsByPost');
    const cursor = requireValidCursor(args.cursor);
    
    const result = await useCase.execute(args.postId, args.limit || 20, cursor);
    
    if (!result.success) {
      throw result.error;
    }

    return buildConnection({
      items: result.value.items,
      hasMore: result.value.hasMore,
      getCursorKeys: (comment) => ({
        PK: `POST#${args.postId}`,
        SK: `COMMENT#${comment.createdAt}#${comment.id}`,
      }),
    });
  };
}
```

**Lines**: ~30 lines

Run tests: `npm test -- commentsResolver.test.ts` → 🟢 GREEN

### Step 1.7: Register in DI Container (🟢 GREEN)

**File**: `packages/graphql-server/src/infrastructure/di/registerServices.ts`

```typescript
// Add to registerServices function:
container.register('GetCommentsByPost', () => {
  const adapter = new CommentServiceAdapter(services.commentService);
  return new GetCommentsByPost(adapter);
});
```

### Step 1.8: Update createQueryResolvers (🟢 GREEN)

**File**: `packages/graphql-server/src/resolvers/createQueryResolvers.ts`

```typescript
import { createCommentsResolver } from './comment/index.js';

// Update resolvers object:
comments: async (parent, args, context, info) => {
  const resolver = createCommentsResolver(context.container);
  return resolver(parent, args, context, info);
},
```

### Step 1.9: Verify (🔵 REFACTOR)

```bash
npm test -- comment
npm test -- createQueryResolvers.test.ts
npm run type-check
```

All green? Move to next resolver! 🎉

**Total for Phase 1**: ~430 lines written (tests + implementation)

---

## Phase 2: FollowStatus Resolver (TDD)

### Step 2.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/follow/__tests__/GetFollowStatus.test.ts`

**Test Cases**:
```typescript
describe('GetFollowStatus', () => {
  it('should return follow status for user', async () => {});
  it('should require authentication', async () => {});
  it('should return isFollowing=true when following', async () => {});
  it('should return isFollowing=false when not following', async () => {});
  it('should return correct counts', async () => {});
  it('should handle repository errors', async () => {});
});
```

**Lines**: ~120 lines

### Step 2.2: Create Domain Interface (🟢 GREEN)

**File**: `packages/graphql-server/src/domain/repositories/IFollowRepository.ts`

```typescript
export interface FollowStatus {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export interface IFollowRepository {
  getFollowStatus(
    currentUserId: string,
    targetUserId: string
  ): Promise<Result<FollowStatus, Error>>;
}
```

**Lines**: ~15 lines

### Step 2.3: Implement Use Case (🟢 GREEN)

**File**: `packages/graphql-server/src/application/use-cases/follow/GetFollowStatus.ts`

```typescript
export class GetFollowStatus {
  constructor(private readonly followRepository: IFollowRepository) {}

  async execute(
    currentUserId: string,
    targetUserId: string
  ): Promise<Result<FollowStatus, Error>> {
    return this.followRepository.getFollowStatus(currentUserId, targetUserId);
  }
}
```

**Lines**: ~15 lines

### Step 2.4: Create Adapter + Tests (🟢 GREEN)

**File**: `packages/graphql-server/src/infrastructure/adapters/FollowServiceAdapter.ts`

**Lines**: ~30 lines

**Test File**: `__tests__/FollowServiceAdapter.test.ts` (~80 lines)

### Step 2.5: Write Resolver Test (🔴 RED)

**File**: `packages/graphql-server/src/resolvers/follow/__tests__/followStatusResolver.test.ts`

**Lines**: ~100 lines

### Step 2.6: Implement Resolver (🟢 GREEN)

**File**: `packages/graphql-server/src/resolvers/follow/followStatusResolver.ts`

```typescript
export function createFollowStatusResolver(container: Container): QueryResolvers['followStatus'] {
  return async (_parent, args, context, _info) => {
    requireAuth(context, 'check follow status');
    
    const useCase = container.resolve('GetFollowStatus');
    const result = await useCase.execute(context.userId, args.userId);
    
    if (!result.success) {
      throw result.error;
    }

    return result.value;
  };
}
```

**Lines**: ~20 lines

### Step 2.7-2.9: Register, Update, Verify

Same pattern as Phase 1.

**Total for Phase 2**: ~380 lines

---

## Phase 3: PostLikeStatus Resolver (TDD)

### Step 3.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/like/__tests__/GetPostLikeStatus.test.ts`

**Test Cases**:
```typescript
describe('GetPostLikeStatus', () => {
  it('should return like status for post', async () => {});
  it('should require authentication', async () => {});
  it('should return isLiked=true when liked', async () => {});
  it('should return correct likesCount', async () => {});
  it('should handle multiple posts', async () => {});
  it('should default to isLiked=false if not in statusMap', async () => {});
  it('should handle repository errors', async () => {});
});
```

**Lines**: ~140 lines

### Step 3.2: Create Domain Interface (🟢 GREEN)

**File**: `packages/graphql-server/src/domain/repositories/ILikeRepository.ts`

```typescript
export interface LikeStatus {
  isLiked: boolean;
  likesCount: number;
}

export interface ILikeRepository {
  getPostLikeStatus(
    userId: string,
    postId: string
  ): Promise<Result<LikeStatus, Error>>;
}
```

**Lines**: ~15 lines

### Step 3.3-3.9: Implement (Following TDD Cycle)

Similar structure to Phases 1-2.

**Total for Phase 3**: ~400 lines

---

## Phase 4: Notifications Resolver (TDD)

### Step 4.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/notification/__tests__/GetNotifications.test.ts`

**Test Cases**:
```typescript
describe('GetNotifications', () => {
  it('should return notifications for user', async () => {});
  it('should require authentication', async () => {});
  it('should respect pagination', async () => {});
  it('should handle cursor validation', async () => {});
  it('should map notification types correctly', async () => {});
  it('should handle empty results', async () => {});
});
```

**Lines**: ~150 lines

### Step 4.2-4.9: Implement

**Files**:
- Domain: `INotificationRepository.ts` (~20 lines)
- Use Case: `GetNotifications.ts` (~25 lines)
- Adapter: `NotificationServiceAdapter.ts` (~35 lines) + tests (~90 lines)
- Resolver: `notificationsResolver.ts` (~30 lines) + tests (~110 lines)

**Total for Phase 4**: ~460 lines

---

## Phase 5: UnreadNotificationsCount Resolver (TDD)

This is the simplest resolver - no pagination, just a count.

### Step 5.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/notification/__tests__/GetUnreadNotificationsCount.test.ts`

**Test Cases**:
```typescript
describe('GetUnreadNotificationsCount', () => {
  it('should return unread count for user', async () => {});
  it('should require authentication', async () => {});
  it('should return 0 for user with no notifications', async () => {});
  it('should handle repository errors', async () => {});
});
```

**Lines**: ~80 lines

### Step 5.2-5.9: Implement

**Files**:
- Use Case: `GetUnreadNotificationsCount.ts` (~15 lines)
- Resolver: `unreadNotificationsCountResolver.ts` (~15 lines) + tests (~60 lines)

**Total for Phase 5**: ~170 lines

---

## Phase 6: Auction Resolver (TDD)

### Step 6.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/auction/__tests__/GetAuction.test.ts`

**Test Cases**:
```typescript
describe('GetAuction', () => {
  it('should return auction by id', async () => {});
  it('should return null for non-existent auction', async () => {});
  it('should handle repository errors', async () => {});
  it('should include all auction fields', async () => {});
});
```

**Lines**: ~100 lines

### Step 6.2-6.9: Implement

**Files**:
- Domain: `IAuctionRepository.ts` (~25 lines)
- Use Case: `GetAuction.ts` (~15 lines)
- Adapter: `AuctionServiceAdapter.ts` (~30 lines) + tests (~80 lines)
- Resolver: `auctionResolver.ts` (~20 lines) + tests (~80 lines)

**Total for Phase 6**: ~350 lines

---

## Phase 7: Auctions Resolver (TDD)

### Step 7.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/auction/__tests__/GetAuctions.test.ts`

**Test Cases**:
```typescript
describe('GetAuctions', () => {
  it('should return paginated auctions', async () => {});
  it('should filter by status', async () => {});
  it('should filter by userId', async () => {});
  it('should respect pagination limits', async () => {});
  it('should handle cursors correctly', async () => {});
  it('should return empty array when no auctions', async () => {});
});
```

**Lines**: ~140 lines

### Step 7.2-7.9: Implement

**Files**:
- Use Case: `GetAuctions.ts` (~25 lines)
- Resolver: `auctionsResolver.ts` (~30 lines) + tests (~100 lines)

**Total for Phase 7**: ~295 lines

---

## Phase 8: Bids Resolver (TDD)

### Step 8.1: Write Use Case Test (🔴 RED)

**File**: `packages/graphql-server/src/application/use-cases/auction/__tests__/GetBidHistory.test.ts`

**Test Cases**:
```typescript
describe('GetBidHistory', () => {
  it('should return bid history for auction', async () => {});
  it('should respect limit parameter', async () => {});
  it('should respect offset parameter', async () => {});
  it('should return total count', async () => {});
  it('should handle empty results', async () => {});
});
```

**Lines**: ~120 lines

### Step 8.2-8.9: Implement

**Files**:
- Use Case: `GetBidHistory.ts` (~20 lines)
- Resolver: `bidsResolver.ts` (~25 lines) + tests (~90 lines)

**Total for Phase 8**: ~255 lines

---

## Phase 9: Integration & Cleanup

### Step 9.1: Update Index Files

**File**: `packages/graphql-server/src/resolvers/comment/index.ts`
```typescript
export { createCommentsResolver } from './commentsResolver.js';
```

Repeat for all new resolver directories.

**Lines**: ~40 lines total (8 index files)

### Step 9.2: Run Full Test Suite

```bash
# Run all unit tests
npm test

# Run all integration tests
npm test -- --testPathPattern=integration

# Verify coverage
npm test -- --coverage
```

**Expected**:
- ✅ 100% test coverage for all use cases
- ✅ All resolver tests passing
- ✅ All integration tests passing
- ✅ No TypeScript errors

### Step 9.3: Performance Testing

Create benchmark test to verify container-per-request pattern:

**File**: `packages/graphql-server/__tests__/performance/resolver-performance.test.ts`

```typescript
describe('Resolver Performance', () => {
  it('should create container only once per request', async () => {
    // Measure container creation overhead
    // Verify single container per request context
  });

  it('should resolve queries in < 100ms', async () => {
    // Benchmark query execution
  });
});
```

**Lines**: ~80 lines

### Step 9.4: Delete Old Code

After verifying all tests pass:

1. Remove inline resolver logic from `createQueryResolvers.ts`
2. Remove old helper functions (already done - using new helpers)
3. Clean up any unused imports

**Lines Deleted**: ~150 lines

### Step 9.5: Update Documentation

**File**: `packages/graphql-server/RESOLVER_ARCHITECTURE.md`

Document:
- Resolver pattern used
- How to add new resolvers
- TDD workflow
- Container-per-request pattern

**Lines**: ~200 lines

---

## Summary: Lines of Code by Phase

| Phase | Tests | Implementation | Total |
|-------|-------|---------------|-------|
| 1. Comments | 230 | 200 | 430 |
| 2. FollowStatus | 200 | 180 | 380 |
| 3. PostLikeStatus | 220 | 180 | 400 |
| 4. Notifications | 250 | 210 | 460 |
| 5. UnreadCount | 140 | 30 | 170 |
| 6. Auction | 180 | 170 | 350 |
| 7. Auctions | 240 | 155 | 395 |
| 8. Bids | 210 | 145 | 355 |
| 9. Integration | 80 | 240 | 320 |
| **TOTAL** | **1,750** | **1,510** | **3,260** |

**Test-to-Code Ratio**: 1.16:1 (More test code than implementation - good TDD!)

---

## Checklist: TDD Workflow Per Resolver

For each of the 8 resolvers, follow this checklist:

### Domain Layer
- [ ] 🔴 Write use case tests (RED)
- [ ] 🟢 Create domain interface (GREEN)
- [ ] 🟢 Implement use case (GREEN)
- [ ] ✅ Verify use case tests pass

### Infrastructure Layer
- [ ] 🔴 Write adapter tests (RED)
- [ ] 🟢 Implement adapter (GREEN)
- [ ] ✅ Verify adapter tests pass

### Resolver Layer
- [ ] 🔴 Write resolver tests (RED)
- [ ] 🟢 Implement resolver (GREEN)
- [ ] ✅ Verify resolver tests pass

### Integration
- [ ] 🟢 Register in DI container
- [ ] 🟢 Update createQueryResolvers
- [ ] 🟢 Export from index file
- [ ] ✅ Run all tests
- [ ] ✅ Verify TypeScript compilation
- [ ] 🔵 REFACTOR if needed

---

## Estimated Timeline

**Per Resolver** (average 1-1.5 hours):
- 30 min: Write all tests (RED phase)
- 30 min: Implement use case + adapter (GREEN phase)
- 15 min: Implement resolver (GREEN phase)
- 15 min: Register + verify (GREEN phase)

**Total Time**:
- 8 resolvers × 1.5 hours = **12 hours**
- Integration & cleanup = **2 hours**
- **Grand Total: 14 hours**

**Suggested Schedule**:
- Day 1 (4 hours): Phases 1-2 (Comments, FollowStatus)
- Day 2 (4 hours): Phases 3-4 (PostLikeStatus, Notifications)
- Day 3 (4 hours): Phases 5-6 (UnreadCount, Auction)
- Day 4 (2 hours): Phases 7-8 (Auctions, Bids)
- Day 4 (2 hours): Phase 9 (Integration & cleanup)

---

## Success Criteria

### Must Have ✅
- [ ] All 8 resolvers extracted to separate files
- [ ] 100% test coverage for all use cases
- [ ] All resolver integration tests passing
- [ ] All TypeScript types correct
- [ ] DI container properly configured
- [ ] Zero linter errors

### Nice to Have 🎯
- [ ] Performance benchmarks documented
- [ ] Architecture documentation updated
- [ ] Code review completed
- [ ] Team walkthrough conducted

---

## Risk Mitigation

### Risk 1: Test Complexity
**Problem**: Writing tests takes longer than expected
**Mitigation**: 
- Use existing test patterns from completed resolvers
- Copy-paste test structure, just change names
- Focus on critical paths first

### Risk 2: Type Mismatches
**Problem**: DAL types differ from GraphQL types
**Mitigation**:
- Use `@ts-ignore` with clear comments (like existing code)
- Document type differences
- Field resolvers handle missing fields

### Risk 3: Breaking Existing Functionality
**Mitigation**:
- Run full test suite after each resolver
- Keep old code until all resolvers migrated
- Use feature flag if needed

---

## Next Steps After Completion

Once all 8 resolvers are complete:

1. **Performance Testing**
   - Benchmark queries before/after
   - Measure memory usage
   - Verify container-per-request pattern

2. **Documentation**
   - Update QUERY_RESOLVER_SOLID_REFACTORING_PLAN.md
   - Create team training materials
   - Document patterns for future resolvers

3. **Code Review**
   - Review all new code with team
   - Get feedback on patterns
   - Share learnings

4. **Celebration** 🎉
   - Query.ts fully refactored!
   - SOLID principles achieved
   - 100% test coverage
   - Clean architecture complete

---

## Commands Reference

```bash
# Run specific test file
npm test -- GetCommentsByPost.test.ts

# Run all tests in a directory
npm test -- comment

# Run tests with coverage
npm test -- --coverage

# Watch mode for TDD
npm test -- --watch

# Type check
npm run type-check

# Lint
npm run lint

# Run integration tests
npm test -- --testPathPattern=integration
```

---

## Questions to Answer During Development

1. Should we create a shared `INotificationRepository` or reuse existing?
2. Do we need a separate `ILikeRepository` or extend `IPostRepository`?
3. Should auction resolvers go in their own directory or with posts?
4. Do we want to add instrumentation/metrics to resolvers?
5. Should we add request tracing for debugging?

---

Let's start with Phase 1 (Comments) and establish the pattern! 🚀