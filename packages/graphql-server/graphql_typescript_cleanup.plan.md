# GraphQL Server TypeScript Cleanup Plan

**Goal**: Fix all 366 TypeScript compilation errors to enable successful builds and improve developer experience

**Status**: Ready for implementation  
**Estimated Time**: 2-3 hours  
**Risk Level**: Low (pure refactoring, no behavioral changes)

---

## Overview

After completing Phases 1-4 of the DAL/GraphQL alignment, we have 366 TypeScript errors that need systematic cleanup. These errors fall into clear categories that can be fixed in dependency order.

**Key Benefits**:
- ✅ TypeScript will catch bugs at compile time
- ✅ IntelliSense will work properly
- ✅ Easier debugging with clear type errors
- ✅ Prevents future technical debt
- ✅ Clean foundation for future work

---

## Phase 1: Foundation Types (Fixes ~160 errors)

**Goal**: Define missing types and fix Result API usage throughout the codebase

### Task 1.1: Define and Export `PaginatedResult<T>`

**File**: `/packages/graphql-server/src/shared/types/pagination.ts`

Add the missing `PaginatedResult<T>` type that many files are trying to import:

```typescript
/**
 * PaginatedResult<T> - Simple paginated response
 *
 * Used for basic pagination (not Relay connections).
 * Contains items and metadata about pagination state.
 *
 * @template T - The type of items in the result
 *
 * @example
 * ```typescript
 * const result: PaginatedResult<Post> = {
 *   items: [post1, post2],
 *   hasMore: true,
 *   cursor: 'cursor-abc',
 *   totalCount: 42
 * };
 * ```
 */
export interface PaginatedResult<T> {
  /**
   * Array of items in this page.
   */
  items: T[];

  /**
   * Whether more items exist after this page.
   */
  hasMore: boolean;

  /**
   * Optional cursor for fetching the next page.
   */
  cursor?: string;

  /**
   * Optional total count of all items (expensive to compute).
   */
  totalCount?: number;
}
```

**Files affected**: ~40 files importing `PaginatedResult`

### Task 1.2: Update Result Type API Usage

**Problem**: Code uses `result.value` but the Result type uses `result.data`

**Strategy**: Find and replace all occurrences:
- Find: `result.value`
- Replace: `result.data`

**Files to update** (search for `result.value`):
- All use case test files (`__tests__/Get*.test.ts`)
- All repository adapter test files
- All resolver test files

**Affected areas**:
- `/src/application/use-cases/auction/__tests__/*.test.ts`
- `/src/application/use-cases/comment/__tests__/*.test.ts`
- `/src/application/use-cases/follow/__tests__/*.test.ts`
- `/src/application/use-cases/like/__tests__/*.test.ts`
- `/src/application/use-cases/notification/__tests__/*.test.ts`
- `/src/infrastructure/adapters/__tests__/*.test.ts`

**Validation**: After this phase, ~160 errors should be resolved

---

## Phase 2: Import/Export Alignment (Fixes ~50 errors)

**Goal**: Fix interface naming mismatches and missing exports

### Task 2.1: Fix Interface Import Naming (Remove `I` Prefix)

**Problem**: Code imports interfaces that don't exist in DAL

**Files to fix**:

1. **CommentServiceAdapter.ts**
   - Change: `import { ICommentService } from '@social-media-app/dal'`
   - To: `import { CommentService } from '@social-media-app/dal'`
   - Update type annotations: `ICommentService` → `CommentService`

2. **FollowServiceAdapter.ts**
   - Change: `import { IFollowService } from '@social-media-app/dal'`
   - To: `import { FollowService } from '@social-media-app/dal'`
   - Update type annotations: `IFollowService` → `FollowService`

3. **LikeServiceAdapter.ts**
   - Change: `import { ILikeService } from '@social-media-app/dal'`
   - To: `import { LikeService } from '@social-media-app/dal'`
   - Update type annotations: `ILikeService` → `LikeService`

4. **NotificationServiceAdapter.ts**
   - Change: `import { INotificationService } from '@social-media-app/dal'`
   - To: `import { NotificationService } from '@social-media-app/dal'`
   - Update type annotations: `INotificationService` → `NotificationService`

5. **AuctionServiceAdapter.ts**
   - Change: `import { IAuctionService } from '@social-media-app/auction-dal'`
   - To: `import { AuctionService } from '@social-media-app/auction-dal'`
   - Update type annotations: `IAuctionService` → `AuctionService`

### Task 2.2: Fix GraphQL Schema Type Exports

**Problem**: Missing `PublicProfileResolvers` export

**File**: `/packages/graphql-server/src/schema/resolvers/Profile.ts`

**Option A**: Remove the import (if not used)
```typescript
// Remove this line if PublicProfile doesn't need resolvers
import type { ProfileResolvers, PublicProfileResolvers } from '../generated/types.js';
```

**Option B**: Check if PublicProfile needs separate resolvers and update schema accordingly

### Task 2.3: Fix Auction Image Purpose Union Type

**File**: `/packages/graphql-server/src/schema/resolvers/Mutation.ts`

**Problem**: `'auction-image'` is not in the union type for image purposes

**Fix**: Update the union type to include `'auction-image'` or change code to use `'post-image'`

**Validation**: After this phase, ~50 more errors should be resolved

---

## Phase 3: Test Structure Cleanup (Fixes ~50 errors)

**Goal**: Fix test helper files being outside TypeScript's rootDir

### Task 3.1: Restructure Test Helpers

**Problem**: Files in `__tests__/helpers/` are imported by files in `src/` but are outside rootDir

**Solution**: Move test helpers into `src/`

**Commands**:
```bash
cd /packages/graphql-server
mkdir -p src/__tests__/helpers
mv __tests__/helpers/* src/__tests__/helpers/
```

**Files to move**:
- `fake-repositories.ts`
- `context-builder.ts`
- `query-executor.ts`
- `feed-matchers.ts`
- `feed-query-constants.ts`
- `refactored-query-constants.ts`
- `test-assertions.ts`
- `localstack-client.ts`
- `index.ts`

### Task 3.2: Update Imports

After moving files, update all imports to use new paths:

**Find**: `'../../../../__tests__/helpers/`  
**Replace**: `'../../../__tests__/helpers/`

**Find**: `'../../../../../__tests__/helpers/`  
**Replace**: `'../../../../__tests__/helpers/`

**Affected files**: All use case tests, resolver tests, and integration tests

**Validation**: After this phase, ~50 more errors should be resolved

---

## Phase 4: Adapter Type Cleanup (Fixes ~40 errors)

**Goal**: Fix type mismatches in adapters from recent refactoring

### Task 4.1: Fix Post Type Mismatches

**File**: `/packages/graphql-server/src/infrastructure/adapters/PostServiceAdapter.ts`

**Issues**:
1. Missing properties: `tags`, `thumbnailUrl`, `isPublic`, `userHandle`
2. Caption type mismatch: `string | undefined` vs `string | null`

**Fix**: Ensure Post type from DAL is correctly mapped to domain Post type:

```typescript
// When transforming DAL Post to domain Post, ensure all fields are present:
const domainPost: Post = {
  ...dalPost,
  tags: dalPost.tags || [],
  thumbnailUrl: dalPost.thumbnailUrl || dalPost.imageUrl, // fallback to imageUrl
  isPublic: dalPost.isPublic ?? true, // default to public
  userHandle: dalPost.userHandle,
  caption: dalPost.caption ?? null, // convert undefined to null
};
```

**Test File**: `/packages/graphql-server/src/infrastructure/adapters/__tests__/PostServiceAdapter.test.ts`

Update mock Post fixtures to include all required fields.

### Task 4.2: Fix Notification Type Mismatches

**File**: `/packages/graphql-server/src/infrastructure/adapters/__tests__/NotificationAdapter.test.ts`

**Problem**: `actorId` property doesn't exist, should be `actor`

**Fix**: Update test fixtures to use correct property name:

```typescript
// Change from:
{ actorId: 'user-123', ... }

// To:
{ actor: { id: 'user-123', handle: '@user', ... }, ... }
```

### Task 4.3: Fix Method Name Mismatches

**File**: `/packages/graphql-server/src/infrastructure/adapters/__tests__/PostServiceAdapter.test.ts`

**Problem**: Tests call `getPostsByUser()` which doesn't exist

**Fix**: Replace with correct method name:
- Find: `getPostsByUser`
- Replace: `getUserPostsByHandle` or `getUserPosts` (check DAL PostService)

### Task 4.4: Fix CommentAdapter Return Type

**File**: `/packages/graphql-server/src/infrastructure/adapters/CommentAdapter.ts`

**Problem**: TypeScript error on line 114: `Type 'unknown' is not assignable to type 'CommentConnection'`

**Fix**: Add explicit return type annotation or type assertion:

```typescript
const connection: CommentConnection = TypeMapper.toGraphQLConnection(
  dalResponse.comments,
  TypeMapper.toGraphQLComment,
  {
    first,
    after: args.after,
    hasNextPage: dalResponse.hasMore,
    hasPreviousPage: false,
  }
);

return connection;
```

**Validation**: After this phase, ~40 more errors should be resolved

---

## Phase 5: Type Safety & Strictness (Fixes ~66 errors)

**Goal**: Remove unused code and add missing type annotations

### Task 5.1: Remove Unused Variables

**Strategy**: Use TypeScript's `--noUnusedLocals` errors to identify and remove:
- Unused imports
- Unused function parameters (prefix with `_` if needed)
- Declared but never read variables

**Examples**:
```typescript
// Remove unused imports
import { createMockNotFollowing } from '...' // if never used, delete

// Prefix unused params with underscore
async function handler(_unusedParam, args, context) { ... }

// Remove unused variables
const result = await someFunction(); // if 'result' never used, just call function
```

**Files affected**: Test files primarily

### Task 5.2: Add Missing Type Annotations

**Problem**: Parameters with implicit `any` type

**Files to fix**:
- `/packages/graphql-server/src/schema/resolvers/Profile.ts` - Add types to `parent`, `_args`, `context`
- `/packages/graphql-server/src/application/use-cases/auction/__tests__/GetAuctions.test.ts` - Add type to `a` parameter

**Example fix**:
```typescript
// Before
isFollowing: async (parent, _args, context) => { ... }

// After
isFollowing: async (
  parent: PublicProfile,
  _args: {},
  context: GraphQLContext
) => { ... }
```

### Task 5.3: Fix `unknown` Type Handling

**Problem**: Operations on `unknown` types without type guards

**Files**:
- `/packages/graphql-server/src/shared/types/__tests__/result.test.ts`

**Fix**: Add proper type guards or assertions:

```typescript
// Before
const mapped = map(result, (n) => n * 2); // n is unknown

// After
const mapped = map(result, (n) => (n as number) * 2);
// OR
const mapped = map(result, (n: number) => n * 2);
```

**Validation**: After this phase, ~66 more errors should be resolved

---

## Phase 6: Validation & Testing (Fixes remaining errors)

**Goal**: Ensure 0 TypeScript errors and working server

### Task 6.1: Full TypeScript Build

```bash
cd /packages/graphql-server
rm -rf dist
pnpm build
```

**Expected**: 0 errors (down from 366)

If any errors remain, analyze and fix based on error messages.

### Task 6.2: Fix Standalone Server Context

**File**: `/packages/graphql-server/src/standalone-server.ts`

**Already fixed**: Added Container creation and registration to context

**Verify**: Context has all required properties:
- `userId`
- `dynamoClient`
- `tableName`
- `services`
- `loaders`
- `container` ✓

### Task 6.3: Test Apollo Server Startup

```bash
cd /packages/graphql-server
pnpm dev:server
```

**Expected**: Server starts successfully on port 4000

**Test query**:
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

**Expected response**:
```json
{"data":{"__typename":"Query"}}
```

### Task 6.4: Run Test Suite

```bash
cd /packages/graphql-server
pnpm test
```

**Goal**: All tests pass (or identify specific test failures to fix)

**Note**: Some tests may need fixture updates if types changed

---

## Success Criteria

- [ ] TypeScript compiles with 0 errors
- [ ] Apollo server starts without errors
- [ ] Simple GraphQL query executes successfully
- [ ] Test suite passes (or specific failures identified and documented)
- [ ] No behavioral changes (pure refactoring)
- [ ] IntelliSense works properly in VS Code

---

## Risk Mitigation

**Low Risk Changes**:
- Adding `PaginatedResult` export (new code)
- Fixing `.value` → `.data` (mechanical change)
- Removing unused variables (no behavioral impact)

**Medium Risk Changes**:
- Moving test files (need to verify all imports updated)
- Fixing adapter types (need careful validation)

**Rollback Strategy**:
- All changes are in git
- Can revert individual commits if issues arise
- Changes are isolated to graphql-server package

---

## Time Estimates

- **Phase 1**: 30-45 minutes (foundation types)
- **Phase 2**: 20-30 minutes (imports/exports)
- **Phase 3**: 15-20 minutes (test structure)
- **Phase 4**: 30-45 minutes (adapter types)
- **Phase 5**: 20-30 minutes (type safety)
- **Phase 6**: 10-15 minutes (validation)

**Total**: 2-3 hours

---

## Post-Cleanup Benefits

1. **Better DX**: IntelliSense will work correctly
2. **Fewer Bugs**: TypeScript catches errors at compile time
3. **Easier Debugging**: Clear types make issues obvious
4. **Clean Foundation**: Ready for future features
5. **Team Velocity**: No more fighting the type system

---

## Notes

- This is pure refactoring work - no behavioral changes
- Each phase builds on the previous one (dependency order)
- Validate after each phase to catch issues early
- Document any unexpected findings during implementation
- Can pause between phases if needed

Ready to begin implementation!