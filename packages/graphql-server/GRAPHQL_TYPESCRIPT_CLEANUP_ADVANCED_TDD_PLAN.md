# GraphQL TypeScript Cleanup - Advanced TDD Plan

**Goal**: Fix 320 remaining TypeScript compilation errors while mastering advanced TypeScript patterns

**Status**: Ready for implementation
**Estimated Time**: 1.5-2.5 hours
**Learning Focus**: Advanced TypeScript + TDD

---

## 📊 Current Status

**Errors**: 320 (down from 366 - 14% complete)
- ✅ Phase 1: `PaginatedResult<T>` defined
- ✅ Phase 2: Interface imports fixed
- ❌ Phase 3-6: Remaining work

---

## 🎯 Advanced TypeScript Patterns We'll Apply

### 1. **Discriminated Unions** (Already using!)
```typescript
// Our Result<T, E> type is a perfect discriminated union
type Result<T, E = Error> =
  | { success: true; data: T }      // Success case
  | { success: false; error: E };   // Error case

// Type narrowing with discriminant
if (result.success) {
  result.data  // TypeScript knows this exists
} else {
  result.error // TypeScript knows this exists
}
```

### 2. **Branded Types for Type Safety** (Already using!)
```typescript
// Prevent mixing up IDs
type PostId = string & { readonly __brand: 'PostId' };
type UserId = string & { readonly __brand: 'UserId' };

// This won't compile:
const postId: PostId = userId; // Error! ✅
```

### 3. **Conditional Types for Adapter Transformations**
```typescript
// Extract nullable properties
type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never
}[keyof T];

// Transform undefined to null for GraphQL
type GraphQLCompatible<T> = {
  [K in keyof T]: undefined extends T[K]
    ? Exclude<T[K], undefined> | null
    : T[K]
};

// Usage in adapters:
type DomainPost = GraphQLCompatible<DALPost>;
```

### 4. **Mapped Types for Type Transformations**
```typescript
// Make all properties required (useful for domain types)
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Adapter example:
type DomainProfile = RequireFields<DALProfile, 'fullName' | 'bio'>;
// fullName and bio are now required (never undefined)
```

### 5. **Type Guards for Safe Type Narrowing**
```typescript
// Better than type assertions
function isDomainPost(obj: unknown): obj is Post {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'userId' in obj &&
    'caption' in obj
  );
}

// Use in adapters
if (isDomainPost(dalResponse)) {
  // TypeScript knows obj is Post
  return { success: true, data: dalResponse };
}
```

### 6. **Template Literal Types for Error Codes**
```typescript
// Type-safe error codes
type EntityType = 'Post' | 'User' | 'Comment';
type ErrorAction = 'NotFound' | 'InvalidInput' | 'Unauthorized';
type ErrorCode = `${EntityType}_${ErrorAction}`;

// Usage:
const error: ErrorCode = 'Post_NotFound'; // ✅
const invalid: ErrorCode = 'Post_Invalid'; // ❌ Type error!
```

### 7. **Utility Types for DRY Code**
```typescript
// Extract common patterns
type AsyncResult<T> = Promise<Result<T, Error>>;
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

// Adapter return types become more readable:
async findById(id: PostId): AsyncResult<Nullable<Post>> { ... }
```

### 8. **Infer Keyword for Type Extraction**
```typescript
// Extract service response types automatically
type ServiceResponse<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : never;

// Usage:
type PostResponse = ServiceResponse<typeof postService.getPostById>;
// Automatically extracts the return type!
```

---

## 🔧 Phase-by-Phase Implementation with Advanced TypeScript

### **Phase 3: Test Helper Structure (Priority 1)** 🔥

**Objective**: Move test helpers into `src/` directory while applying TypeScript best practices

**Advanced TypeScript Concepts**:
- Generic helper functions
- Type inference for test fixtures
- Utility types for test data builders

**TDD Cycle**:
```bash
# 1. RED: Move helpers → imports break
mkdir -p src/__tests__/helpers
mv __tests__/helpers/* src/__tests__/helpers/

# 2. GREEN: Fix imports → tests pass
# Update all import paths in tests

# 3. REFACTOR: Apply TypeScript patterns
# Add generic type parameters to helpers
```

**Enhanced Helpers with Advanced TypeScript**:

```typescript
// src/__tests__/helpers/fixture-builder.ts

// Pattern: Builder Pattern with Type Safety
type BuilderState<T> = {
  [K in keyof T]: T[K] | undefined;
};

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type IsComplete<T, S> =
  RequiredKeys<T> extends keyof S
    ? S[RequiredKeys<T>] extends undefined
      ? false
      : true
    : false;

class TestFixtureBuilder<T, S extends BuilderState<T> = {}> {
  private state: S = {} as S;

  set<K extends keyof T>(
    key: K,
    value: T[K]
  ): TestFixtureBuilder<T, S & Record<K, T[K]>> {
    this.state[key] = value;
    return this as any;
  }

  build(
    this: IsComplete<T, S> extends true ? this : never
  ): T {
    return this.state as T;
  }
}

// Usage in tests:
const post = new TestFixtureBuilder<Post>()
  .set('id', 'post-123')
  .set('userId', 'user-123')
  .set('caption', 'Test')
  .build(); // ✅ Compiles only if all required fields set
```

**Type-Safe Test Utilities**:
```typescript
// src/__tests__/helpers/type-safe-mocks.ts

// Pattern: Conditional Types for Mock Creation
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};

function createMock<T>(overrides: DeepPartial<T>, defaults: T): T {
  return { ...defaults, ...overrides } as T;
}

// Usage:
const mockPost = createMock<Post>(
  { caption: 'Custom caption' },
  createDefaultPost()
);
```

**Estimated**: 15-20 minutes, ~50 errors fixed

---

### **Phase 4: Adapter Type Cleanup (Priority 2)** 🔥

**Objective**: Fix adapter type mismatches using advanced TypeScript patterns

#### **4.1: LikeServiceAdapter - Mapped Type Transformation**

**Problem**: Property mismatch (`likesCount` vs `likeCount`)

**Advanced Pattern**: Mapped type for property renaming
```typescript
// src/infrastructure/adapters/shared/type-transformers.ts

// Pattern: Mapped Type for Property Renaming
type RenameProperty<T, K extends keyof T, N extends string> =
  Omit<T, K> & Record<N, T[K]>;

// Transform DAL response to Domain type
type DomainLikeStatus = RenameProperty<
  DALLikeStatus,
  'likesCount',
  'likeCount'
>;

// Adapter implementation:
export class LikeServiceAdapter implements ILikeRepository {
  async getPostLikeStatus(
    userId: string,
    postId: string
  ): AsyncResult<LikeStatus> {
    try {
      const dalResponse = await this.likeService.getPostLikeStatus(userId, postId);

      // Type-safe transformation
      const domainStatus: LikeStatus = {
        isLiked: dalResponse.isLiked,
        likeCount: dalResponse.likesCount, // Rename here
      };

      return { success: true, data: domainStatus };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
```

**TDD Steps**:
1. 🔴 Update test fixture with correct property name → Test fails
2. 🟢 Fix adapter transformation → Test passes
3. 🔵 Extract mapping logic to type-safe helper

---

#### **4.2: PostServiceAdapter - Conditional Type Transformation**

**Problem**:
- `caption` type mismatch (`undefined` vs `null`)
- Method name mismatch (`getPostsByUser` doesn't exist)

**Advanced Pattern**: Conditional type for nullable transformation
```typescript
// src/infrastructure/adapters/shared/type-transformers.ts

// Pattern: Convert undefined to null (GraphQL requirement)
type UndefinedToNull<T> = {
  [K in keyof T]: undefined extends T[K]
    ? Exclude<T[K], undefined> | null
    : T[K]
};

// Transform DAL Post to Domain Post
type DomainPost = UndefinedToNull<DALPost> & {
  thumbnailUrl: string; // Always required
  isPublic: boolean;    // Always required
};

// Adapter with type-safe transformation:
export class PostServiceAdapter implements IPostRepository {
  async findById(id: PostId): AsyncResult<Post | null> {
    try {
      const dalPost = await this.postService.getPostById(id);
      if (!dalPost) return { success: true, data: null };

      const domainPost = this.transformToDomain(dalPost);
      return { success: true, data: domainPost };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async findByUser(
    userId: UserId,
    pagination: PaginationArgs
  ): AsyncResult<Connection<Post>> {
    try {
      // Use correct DAL method name
      const result = await this.postService.getUserPosts(userId, {
        limit: pagination.first || 10,
        cursor: pagination.after,
      });

      const connection = this.connectionBuilder.build<Post>({
        nodes: result.posts.map(this.transformToDomain),
        hasMore: result.hasMore,
        getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt }),
      });

      return { success: true, data: connection };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private transformToDomain(dalPost: DALPost): Post {
    return {
      ...dalPost,
      caption: dalPost.caption ?? null,           // undefined → null
      thumbnailUrl: dalPost.thumbnailUrl || dalPost.imageUrl,
      isPublic: dalPost.isPublic ?? true,
      tags: dalPost.tags || [],
    } as Post;
  }
}
```

**TDD Steps**:
1. 🔴 Check DAL interface for correct method names
2. 🔴 Update tests to expect `caption: null` instead of `undefined`
3. 🟢 Fix adapter: add `transformToDomain` helper
4. 🟢 Fix adapter: use correct DAL method name
5. 🔵 Extract transformation logic to shared helper

---

#### **4.3: ProfileServiceAdapter - Required Field Transformation**

**Problem**: `fullName` can be `undefined` but domain expects `string`

**Advanced Pattern**: Utility type for required fields
```typescript
// src/infrastructure/adapters/shared/type-transformers.ts

// Pattern: Make specific fields required with defaults
type WithDefaults<T, K extends keyof T, D extends Pick<T, K>> =
  Omit<T, K> & Required<Pick<T, K>>;

// Ensure Profile has required fields
type DomainProfile = WithDefaults<
  DALProfile,
  'fullName' | 'bio',
  { fullName: string; bio: string }
>;

// Adapter:
export class ProfileServiceAdapter implements IProfileRepository {
  async findByHandle(handle: string): AsyncResult<Profile | null> {
    try {
      const dalProfile = await this.profileService.getProfileByHandle(handle);
      if (!dalProfile) return { success: true, data: null };

      const domainProfile = this.transformToDomain(dalProfile);
      return { success: true, data: domainProfile };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private transformToDomain(dalProfile: DALProfile): Profile {
    return {
      ...dalProfile,
      fullName: dalProfile.fullName || '',  // Ensure string
      bio: dalProfile.bio || '',            // Ensure string
      email: dalProfile.email || '',        // Ensure string
    } as Profile;
  }
}
```

**TDD Steps**:
1. 🔴 Update test to verify `fullName` is always a string
2. 🟢 Add `transformToDomain` method with defaults
3. 🔵 Extract default value logic to configuration

---

#### **4.4: AuctionServiceAdapter - Type Assertion & Status Union**

**Problem**:
- Missing properties (`sellerId`, `postId`, `startingPrice`)
- Status type mismatch (string vs union)

**Advanced Pattern**: Type guards and assertion functions
```typescript
// src/infrastructure/adapters/shared/type-guards.ts

// Pattern: Type Guard for Status Validation
type AuctionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

function isValidAuctionStatus(status: string): status is AuctionStatus {
  return ['pending', 'active', 'completed', 'cancelled'].includes(status);
}

// Assertion function for runtime checking
function assertAuctionStatus(
  status: string
): asserts status is AuctionStatus {
  if (!isValidAuctionStatus(status)) {
    throw new Error(`Invalid auction status: ${status}`);
  }
}

// Adapter:
export class AuctionServiceAdapter implements IAuctionRepository {
  async findById(id: string): AsyncResult<Auction | null> {
    try {
      const dalAuction = await this.auctionService.getAuctionById(id);
      if (!dalAuction) return { success: true, data: null };

      const domainAuction = this.transformToDomain(dalAuction);
      return { success: true, data: domainAuction };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private transformToDomain(dalAuction: DALAuction): Auction {
    // Use assertion to validate status at runtime
    assertAuctionStatus(dalAuction.status);

    return {
      id: dalAuction.id,
      postId: dalAuction.postId,
      sellerId: dalAuction.userId,          // Map userId → sellerId
      startingPrice: dalAuction.startPrice, // Map startPrice → startingPrice
      currentPrice: dalAuction.currentPrice,
      status: dalAuction.status,            // Now type-safe!
      startTime: dalAuction.startTime,
      endTime: dalAuction.endTime,
      bidCount: dalAuction.bidCount,
      winnerId: dalAuction.winnerId,
    };
  }
}
```

**TDD Steps**:
1. 🔴 Check domain `Auction` interface for required properties
2. 🔴 Update test fixtures with all required properties
3. 🟢 Create type guard for status validation
4. 🟢 Add `transformToDomain` with property mapping
5. 🔵 Extract type guards to shared module

---

#### **4.5: NotificationServiceAdapter - Readonly Array Handling**

**Problem**: DAL returns `readonly` array but adapter expects mutable

**Advanced Pattern**: Type transformation for readonly removal
```typescript
// src/infrastructure/adapters/shared/type-transformers.ts

// Pattern: Remove readonly modifier
type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? U[]
    : T[P]
};

// Adapter:
export class NotificationServiceAdapter implements INotificationRepository {
  async getNotifications(
    userId: string,
    limit: number,
    cursor?: string
  ): AsyncResult<PaginatedResult<Notification>> {
    try {
      // DAL method signature (check actual interface)
      const dalResponse = await this.notificationService.getNotifications({
        userId,
        limit,
        cursor,
      });

      // Transform readonly array to mutable
      const mutableNotifications: Notification[] = [
        ...dalResponse.notifications
      ];

      return {
        success: true,
        data: {
          items: mutableNotifications,
          hasMore: dalResponse.hasMore,
          cursor: dalResponse.nextCursor,
        },
      };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
```

**TDD Steps**:
1. 🔴 Check DAL `NotificationService` interface signature
2. 🔴 Update test to match actual DAL signature
3. 🟢 Fix adapter to spread readonly array
4. 🔵 Create utility function for readonly transformation

---

#### **4.6: CommentAdapter - Type Annotation with Generics**

**Problem**: TypeScript can't infer return type (Type 'unknown')

**Advanced Pattern**: Explicit generic type parameters
```typescript
export class CommentAdapter {
  async getCommentsByPost(
    postId: string,
    first: number,
    after?: string
  ): AsyncResult<CommentConnection> {
    try {
      const dalResponse = await this.commentService.getCommentsByPost(
        postId,
        first,
        after
      );

      // Explicit generic type parameter for type inference
      const connection = TypeMapper.toGraphQLConnection<Comment>(
        dalResponse.comments,
        TypeMapper.toGraphQLComment,
        {
          first,
          after: args.after,
          hasNextPage: dalResponse.hasMore,
          hasPreviousPage: false,
        }
      );

      // Explicit type annotation
      const result: CommentConnection = connection;
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
```

---

#### **4.7: AdapterHelpers - Consistent Type Definitions**

**Problem**: `nextCursor` doesn't exist on `PaginatedResult`

**Advanced Pattern**: Template literal types for property names
```typescript
// Ensure consistent property naming
type PaginationMetadata = {
  cursor?: string;      // NOT nextCursor
  hasMore: boolean;
  totalCount?: number;
};

// Update helper function
export function adaptPaginatedResponse<T>(
  dalResponse: {
    items: T[];
    hasMore: boolean;
    nextCursor?: string;  // DAL uses nextCursor
  }
): PaginatedResult<T> {
  return {
    items: dalResponse.items,
    hasMore: dalResponse.hasMore,
    cursor: dalResponse.nextCursor,  // Map nextCursor → cursor
  };
}
```

---

#### **4.8: TypeMapper.test - Type Guards in Tests**

**Problem**: Tests operate on `unknown` types

**Advanced Pattern**: Type guards for test assertions
```typescript
describe('TypeMapper', () => {
  it('should map comment correctly', () => {
    const dalComment = createMockDALComment();
    const result = TypeMapper.toGraphQLComment(dalComment);

    // Type guard assertion
    if (!isGraphQLComment(result)) {
      throw new Error('Invalid GraphQL comment');
    }

    // Now TypeScript knows result is GraphQLComment
    expect(result.id).toBe(dalComment.id);
    expect(result.message).toBe(dalComment.message);
  });
});

// Type guard function
function isGraphQLComment(obj: unknown): obj is GraphQLComment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'message' in obj
  );
}
```

**Estimated**: 30-45 minutes, ~40 errors fixed

---

### **Phase 5: Type Safety & Strictness (Priority 3)**

#### **5.1: Remove Unused Variables with Type Utilities**

**Advanced Pattern**: Utility type for marking intentionally unused
```typescript
// Mark intentionally unused parameters
type Unused<T> = T;

// In resolvers:
async function resolver(
  _parent: Unused<unknown>,
  _args: Unused<Record<string, never>>,
  context: GraphQLContext
) {
  // Only context is used
}
```

**Estimated**: 15-20 minutes, ~30 errors fixed

---

#### **5.2: Add Missing Type Annotations with Inference**

**Advanced Pattern**: Use `Parameters` and `ReturnType` utilities
```typescript
// Extract types from functions
type ResolverContext = Parameters<typeof someResolver>[2];
type ResolverReturn = ReturnType<typeof someResolver>;

// Type resolver signatures
const isFollowing: GraphQLFieldResolver<
  PublicProfile,
  GraphQLContext,
  Record<string, never>,
  Promise<boolean>
> = async (parent, _args, context) => {
  // TypeScript knows all types now
  return context.services.followService.isFollowing(
    context.userId,
    parent.id
  );
};
```

**Estimated**: 10-15 minutes, ~20 errors fixed

---

#### **5.3: Fix Resolver Test Type Mismatches**

**Problem**: Mock resolvers return `Promise<T>` but tests expect `T`

**Advanced Pattern**: Conditional unwrapping for promises
```typescript
// Type utility to unwrap promises
type Awaited<T> = T extends Promise<infer U> ? U : T;

// Mock resolver helper
function createMockResolver<T>(
  returnValue: T
): GraphQLFieldResolver<any, any, any, Awaited<T>> {
  return vi.fn().mockResolvedValue(returnValue) as any;
}

// Usage in tests:
const mockResolver = createMockResolver({ id: '123', name: 'Test' });
// Type is correctly inferred
```

**Estimated**: 20-30 minutes, ~180 errors fixed

---

### **Phase 6: Validation & Testing (Priority 4)**

#### **6.1: Full TypeScript Build**
```bash
cd /packages/graphql-server
rm -rf dist
pnpm build
```
**Expected**: 0 errors ✅

#### **6.2: Run Test Suite**
```bash
pnpm test
```
**Expected**: All tests pass ✅

#### **6.3: Test Server Startup**
```bash
pnpm dev:server
```
**Expected**: Server starts successfully ✅

**Estimated**: 10-15 minutes

---

## 📚 Advanced TypeScript Learning Checkpoints

### Checkpoint 1: Type Transformations
- [ ] Understand `Mapped Types` for property transformation
- [ ] Apply `Conditional Types` for nullable handling
- [ ] Use `Template Literal Types` for string unions

### Checkpoint 2: Type Safety
- [ ] Implement `Type Guards` for runtime validation
- [ ] Create `Assertion Functions` for type narrowing
- [ ] Use `Branded Types` to prevent ID confusion

### Checkpoint 3: Generic Patterns
- [ ] Build type-safe test fixtures with generics
- [ ] Extract types with `infer` keyword
- [ ] Create reusable utility types

### Checkpoint 4: Advanced Patterns
- [ ] Apply `Discriminated Unions` for Result handling
- [ ] Use `Utility Types` (Pick, Omit, Exclude, Extract)
- [ ] Implement `Builder Pattern` with type constraints

---

## 🎯 Success Criteria

### Functional Requirements
- [ ] TypeScript builds with 0 errors (320 → 0)
- [ ] All tests pass (`pnpm test`)
- [ ] Apollo server starts successfully
- [ ] No behavioral changes (pure refactoring)

### Learning Outcomes
- [ ] Applied 5+ advanced TypeScript patterns
- [ ] Created reusable type utilities
- [ ] Documented type transformation strategies
- [ ] Built type-safe test helpers

### Code Quality
- [ ] No `any` types used
- [ ] All shared fixtures utilized
- [ ] Tests remain DRY with helper extraction
- [ ] Type guards preferred over assertions

---

## 📊 Execution Timeline

| Phase | Focus | Errors Fixed | Time | TypeScript Concepts |
|-------|-------|--------------|------|---------------------|
| **3** | Test helpers + Builders | ~50 | 15-20m | Generics, Builder Pattern |
| **4.1** | Like adapter | ~5 | 5-10m | Mapped Types |
| **4.2** | Post adapter | ~10 | 10-15m | Conditional Types |
| **4.3** | Profile adapter | ~5 | 5-10m | Utility Types |
| **4.4** | Auction adapter | ~10 | 10-15m | Type Guards, Assertions |
| **4.5** | Notification adapter | ~5 | 5-10m | Readonly Transformation |
| **4.6-4.8** | Comment/TypeMapper | ~5 | 5-10m | Generic Type Parameters |
| **5.1** | Unused variables | ~30 | 15-20m | Utility Types |
| **5.2** | Type annotations | ~20 | 10-15m | Type Inference |
| **5.3** | Resolver tests | ~180 | 20-30m | Conditional Unwrapping |
| **6** | Validation | - | 10-15m | - |

**Total**: 100-145 minutes (1.5-2.5 hours)

---

## 🔄 TDD Cycle Template

For each task:

### 1. 🔴 RED - Write/Update Test
```typescript
describe('AdapterName', () => {
  it('should transform DAL type to domain type', () => {
    // Use shared fixture
    const dalData = createMockDALEntity();

    // Call adapter
    const result = await adapter.findById(id);

    // Assert with type guards
    expect(result.success).toBe(true);
    if (result.success) {
      assertIsDomainEntity(result.data);
      expect(result.data.property).toBe(expected);
    }
  });
});
```

### 2. 🟢 GREEN - Implement with TypeScript Patterns
```typescript
export class ServiceAdapter implements IRepository {
  private transformToDomain(dalEntity: DALEntity): DomainEntity {
    // Apply type transformation pattern
    return typeTransformer(dalEntity);
  }

  async findById(id: EntityId): AsyncResult<DomainEntity | null> {
    try {
      const dalEntity = await this.service.getById(id);
      if (!dalEntity) return { success: true, data: null };

      const domainEntity = this.transformToDomain(dalEntity);
      return { success: true, data: domainEntity };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
```

### 3. 🔵 REFACTOR - Extract Patterns
```typescript
// Extract to shared type-transformers.ts
export function createTypeTransformer<TFrom, TTo>(
  mapping: TransformMapping<TFrom, TTo>
) {
  return (from: TFrom): TTo => {
    // Generic transformation logic
  };
}
```

### 4. ✅ VERIFY - Check Error Count
```bash
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

---

## 📖 Reference Documentation

### Type Transformation Patterns Library
Create `/src/infrastructure/adapters/shared/type-patterns.ts`:

```typescript
/**
 * Type Transformation Patterns
 *
 * Reusable TypeScript utilities for adapter layer
 */

// 1. Convert undefined to null (GraphQL compatibility)
export type UndefinedToNull<T> = {
  [K in keyof T]: undefined extends T[K]
    ? Exclude<T[K], undefined> | null
    : T[K]
};

// 2. Make specific fields required
export type WithDefaults<T, K extends keyof T> =
  Omit<T, K> & Required<Pick<T, K>>;

// 3. Remove readonly modifiers
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? U[]
    : T[P]
};

// 4. Rename property
export type RenameProperty<T, K extends keyof T, N extends string> =
  Omit<T, K> & Record<N, T[K]>;

// 5. Extract nullable keys
export type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never
}[keyof T];

// 6. Type guard builder
export function createTypeGuard<T>(
  validator: (obj: unknown) => boolean
): (obj: unknown) => obj is T {
  return (obj): obj is T => validator(obj);
}

// 7. Assertion function builder
export function createAssertion<T>(
  guard: (obj: unknown) => obj is T,
  errorMessage: string
): (obj: unknown) => asserts obj is T {
  return (obj): asserts obj is T => {
    if (!guard(obj)) {
      throw new Error(errorMessage);
    }
  };
}
```

---

## 🎓 TypeScript Learning Resources

### During Implementation
Reference these patterns from SKILL.md:

1. **Generics with Constraints** (Lines 39-53)
   - Used in: Test fixture builders, adapter transformers
   - Example: `function transform<T extends HasId>(item: T): DomainEntity`

2. **Conditional Types** (Lines 69-112)
   - Used in: Type transformations, nullable handling
   - Example: `type UndefinedToNull<T> = ...`

3. **Mapped Types** (Lines 114-173)
   - Used in: Property renaming, making fields required
   - Example: `type WithDefaults<T, K extends keyof T> = ...`

4. **Template Literal Types** (Lines 175-215)
   - Used in: Error codes, type-safe string patterns
   - Example: `type ErrorCode = \`\${EntityType}_\${ErrorAction}\``

5. **Type Guards** (Lines 622-641)
   - Used in: Runtime validation, safe type narrowing
   - Example: `function isValidStatus(s: string): s is Status`

6. **Infer Keyword** (Lines 599-620)
   - Used in: Extracting types from promises and functions
   - Example: `type Awaited<T> = T extends Promise<infer U> ? U : T`

7. **Discriminated Unions** (Lines 532-597)
   - Already using: Our `Result<T, E>` type
   - Pattern: State machines with type narrowing

8. **Builder Pattern** (Lines 351-408)
   - Used in: Type-safe test fixture creation
   - Enforces required fields at compile time

---

## 💡 Pro Tips for Implementation

### 1. **Type Inference Over Explicit Types**
```typescript
// ❌ Too explicit
const result: Result<Post, Error> = await adapter.findById(id);

// ✅ Let TypeScript infer
const result = await adapter.findById(id);
// Type is automatically Result<Post | null, Error>
```

### 2. **Prefer Type Guards Over Type Assertions**
```typescript
// ❌ Unsafe type assertion
const post = dalResponse as Post;

// ✅ Safe type guard
if (isDomainPost(dalResponse)) {
  // TypeScript knows it's Post here
  return { success: true, data: dalResponse };
}
```

### 3. **Use Const Assertions for Literals**
```typescript
// ❌ Wider type
const status = 'active'; // Type: string

// ✅ Exact literal type
const status = 'active' as const; // Type: 'active'
```

### 4. **Discriminated Unions for State**
```typescript
// ✅ Our Result type is perfect
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

// TypeScript narrows automatically
if (result.success) {
  result.data // Available
} else {
  result.error // Available
}
```

### 5. **Generic Constraints for Flexibility**
```typescript
// ✅ Flexible but type-safe
function mapToConnection<T extends { id: string }>(
  items: T[]
): Connection<T> {
  // T must have 'id' property
}
```

---

## 📝 Implementation Checklist

### Before Starting
- [ ] Read through advanced TypeScript patterns in SKILL.md
- [ ] Review existing `Result<T>` and branded type usage
- [ ] Understand current adapter pattern
- [ ] Set up TypeScript error tracking (run initial count)

### During Each Phase
- [ ] Write/update test first (🔴 RED)
- [ ] Implement minimal code to pass (🟢 GREEN)
- [ ] Refactor to apply TypeScript patterns (🔵 BLUE)
- [ ] Check error count decreased
- [ ] Document patterns used

### After Completion
- [ ] Final TypeScript build: 0 errors
- [ ] All tests passing
- [ ] Server starts successfully
- [ ] Type utilities extracted to shared module
- [ ] Documentation updated with patterns used
- [ ] Learning checkpoints reviewed

---

## 🚀 Quick Start

```bash
# 1. Check current error count
cd /packages/graphql-server
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Expected: 320

# 2. Start with Phase 3 (highest priority)
# Move test helpers and update imports

# 3. Track progress after each phase
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Watch the number decrease!

# 4. Run tests continuously
pnpm test --watch

# 5. Final validation
pnpm build && pnpm test && pnpm dev:server
```

---

## 📚 Additional Resources

From SKILL.md:
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Type Challenges**: https://github.com/type-challenges/type-challenges
- **TypeScript Deep Dive**: https://basarat.gitbook.io/typescript/

Project-Specific:
- **DAL/GraphQL Alignment**: See `/docs/guides/ADAPTER_IMPLEMENTATION_GUIDE.md`
- **ADR-001**: Type Transformation Strategy at Adapter Layer
- **Shared Fixtures**: `/packages/shared/src/test-utils/fixtures/`

---

## 🎯 Success Definition

We'll know we're done when:
1. ✅ **0 TypeScript errors** (down from 320)
2. ✅ **All tests pass** (no regressions)
3. ✅ **Server starts** (no runtime errors)
4. ✅ **5+ advanced patterns** applied and documented
5. ✅ **Type utilities** extracted to shared modules
6. ✅ **No `any` types** in production code
7. ✅ **Type guards** used instead of assertions
8. ✅ **Shared fixtures** utilized throughout

---

## 🔥 Let's Build Type-Safe Software!

This plan combines **Test-Driven Development** with **Advanced TypeScript** to create:
- 🛡️ **Type-safe** adapters that catch bugs at compile time
- 📚 **Reusable** type utilities for the entire codebase
- 🎓 **Learning opportunities** with every fix
- 🧪 **Comprehensive tests** that document behavior
- ⚡ **Better DX** with IntelliSense and autocomplete

**Ready to execute?** Let's start with Phase 3! 🚀
