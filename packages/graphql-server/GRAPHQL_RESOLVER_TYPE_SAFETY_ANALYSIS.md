# GraphQL Resolver Type Safety Analysis

**Date**: 2025-11-08
**Scope**: packages/graphql-server resolver architecture and type safety
**Status**: Critical issues identified - requires refactoring

---

## Executive Summary

The GraphQL server package has fundamental architectural issues stemming from **missing generated types** and a **double-wrapper anti-pattern** that defeats TypeScript's type safety. The current approach fights against GraphQL Codegen's intended design, leading to:

- ❌ Extensive use of `any` types and type assertions
- ❌ Manual type declarations that duplicate what codegen should provide
- ❌ Unnecessary layers of indirection (3 layers where 1 is needed)
- ❌ Loss of schema-to-implementation type flow
- ❌ Poor developer experience with broken IntelliSense

**Root Cause**: GraphQL Codegen has never been run - the generated types directory doesn't exist.

**Impact**: Type safety is compromised throughout the resolver chain, making bugs harder to catch at compile time.

---

## Monorepo Architecture Context

### System Overview

This is a **pnpm monorepo** for a full-stack social media application with:

- **Frontend**: React 18 + Vite + Relay (GraphQL client)
- **GraphQL Server**: Apollo Server v4 + Express + DataLoader
- **Backend**: REST API with Express + Lambda + Middy
- **Data Layer**: DynamoDB (social media) + PostgreSQL (auctions)
- **Auth**: JWT with jose library
- **DI**: Awilix for dependency injection
- **Infrastructure**: AWS CDK (Lambda, API Gateway, DynamoDB, S3, CloudFront)

### Package Dependency Graph

```
shared (foundation)
  ↑
  ├── dal ────────┐
  ├── auction-dal ├──→ backend
  ├── auth-utils  ├──→ graphql-server
  └── aws-utils   │
                  ├──→ integration-tests
                  └──→ frontend
```

### GraphQL Server Architecture

**Current Stack**:
- Apollo Server v4.11.3
- Express.js wrapper (standalone server)
- Awilix DI container (hexagonal architecture)
- DataLoader for N+1 prevention
- GraphQL Code Generator (configured but never run)

**Hexagonal Architecture Layers**:
1. **Domain Layer**: Use cases (business logic)
2. **Application Layer**: GraphQL resolvers
3. **Infrastructure Layer**: Repository adapters wrapping DAL services
4. **Context**: Per-request Awilix container with DAL services

---

## Critical Issues Identified

### 1. Missing Generated Types (Root Cause)

**Problem**: GraphQL Codegen has never been executed.

**Evidence**:
```bash
$ ls packages/graphql-server/src/schema/generated/
# ls: cannot access: No such file or directory
```

**Configuration** (`codegen.yml`):
```yaml
schema: "../../../schema.graphql"
generates:
  ./src/schema/generated/types.ts:  # This file doesn't exist
    plugins:
      - typescript
      - typescript-resolvers
    config:
      contextType: "../../context#GraphQLContext"
      useIndexSignature: true
      maybeValue: T | null
```

**Impact**: Every import of generated types fails, forcing developers to use `any` types:

```typescript
// This import fails because file doesn't exist:
import type { QueryResolvers } from '../schema/generated/types.js';

// Results in:
me: async (
  _parent: unknown,  // Should be auto-generated
  _args: unknown,    // Should be auto-generated
  context: GraphQLContext,  // Manually typed
  info: GraphQLResolveInfo  // Manually typed
) => {
  // ...
  return result.data as any;  // Type assertion needed
}
```

**Why it hasn't been run**: `node_modules` missing - dependencies not installed.

---

### 2. Double Wrapper Anti-Pattern

**Current Architecture**: Three unnecessary layers of indirection.

**Layer 1**: Individual resolver factories (`meResolver.ts`, `profileResolver.ts`, etc.)

```typescript
// packages/graphql-server/src/resolvers/profile/meResolver.ts
export const createMeResolver = (
  container: AwilixContainer<GraphQLContainer>
): QueryResolvers['me'] => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    //                     ^^^^^^^^^^  ^^^^^^^^^^        ^^^^
    //                     All type safety LOST

    const useCase = container.resolve('getCurrentUserProfile');
    const result = await useCase.execute({ userId: context.userId! });

    if (!result.success || !result.data) {
      throw ErrorFactory.notFound('Profile', context.userId!);
    }

    return result.data as any;  // Type assertion required
    //                    ^^^
  });
};
```

**Layer 2**: Query resolver wrapper (`createQueryResolvers.ts`)

```typescript
// packages/graphql-server/src/resolvers/createQueryResolvers.ts
export function createQueryResolvers(): QueryResolvers {
  return {
    me: async (
      _parent: unknown,        // Manually typed
      _args: unknown,          // Manually typed
      context: GraphQLContext, // Manually typed
      info: GraphQLResolveInfo // Manually typed
    ) => {
      // Extract container from context
      const resolver = createMeResolver(context.container);

      // Null check (unnecessary - factory always returns resolver)
      if (!resolver) {
        throw new Error('Failed to create me resolver');
      }

      // Call the wrapper
      return resolver(_parent, _args, context, info);
    },
  };
}
```

**Layer 3**: Schema composition (`Query.ts`)

```typescript
// packages/graphql-server/src/schema/resolvers/Query.ts
export const Query: QueryResolvers = createQueryResolvers();
```

**Problems**:

1. **Type safety lost at Layer 1**: Using `any` types defeats TypeScript
2. **Manual type duplication at Layer 2**: Re-declaring types that GraphQL Codegen should provide
3. **Unnecessary null checks**: Factories always return resolvers
4. **Container already in context**: No need to pass it separately
5. **No value added**: Layer 2 wrapper adds complexity without benefit

**Performance Impact**:
- More function calls per resolver execution
- Larger bundle size
- Harder to tree-shake

---

### 3. Type Assertion Cascade

Because generated types don't exist, type assertions propagate through the codebase:

**In resolvers**:
```typescript
// meResolver.ts:40
return result.data as any;

// auctionsResolver.ts - Less severe but still manual
return async (_parent, args, _context, _info) => {
  // args.status is manually typed instead of auto-inferred
};
```

**In createQueryResolvers.ts**:
```typescript
// Lines 49-54, 66-71, 83-88, etc.
me: async (
  _parent: unknown,  // Should be ParentType from codegen
  _args: unknown,    // Should be {} (no args for 'me')
  context: GraphQLContext,
  info: GraphQLResolveInfo
)
```

This defeats the entire purpose of TypeScript and GraphQL Codegen.

---

### 4. Inconsistent Import Paths

Files import generated types from different locations:

```typescript
// Most resolver files:
import type { QueryResolvers } from '../schema/generated/types.js';

// resolvers/index.ts:
import type { Resolvers } from '../../generated/types.js';
```

This suggests confusion about architecture and where types should live. Both imports fail because neither file exists.

---

### 5. Unclear Separation of Concerns

**Current structure**:
```
src/
├── resolvers/
│   ├── createQueryResolvers.ts    # Wrapper layer
│   ├── profile/
│   │   ├── meResolver.ts          # Factory for 'me'
│   │   └── profileResolver.ts     # Factory for 'profile'
│   └── post/
│       ├── postResolver.ts        # Factory for 'post'
│       └── userPostsResolver.ts   # Factory for 'userPosts'
└── schema/
    └── resolvers/
        ├── Query.ts               # Composition layer
        ├── Mutation.ts
        └── Post.ts                # Field resolvers
```

**Confusion**:
- Two `resolvers/` directories with different purposes
- Unclear which is the "source of truth"
- Factory functions in one, composition in the other

---

## Root Architectural Problems

### Problem A: Fighting GraphQL Codegen

GraphQL Codegen's `typescript-resolvers` plugin is designed to **eliminate manual wrapper functions**. It generates:

1. **Resolver function signatures** with correct types for:
   - Parent object (e.g., `Post` for `Post.comments`)
   - Arguments (e.g., `{ handle: string }` for `profile`)
   - Context (configured via `contextType`)
   - Return type (inferred from schema)

2. **Type safety across the entire resolver chain**

**Current approach fights this by**:
- Creating manual factory functions
- Re-declaring types that codegen provides
- Using wrappers that obscure generated types
- Requiring type assertions to bridge gaps

**What codegen provides** (when run):

```typescript
// Generated QueryResolvers type
export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = {
  me?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  profile?: Resolver<
    Maybe<ResolversTypes['PublicProfile']>,
    ParentType,
    ContextType,
    RequireFields<QueryProfileArgs, 'handle'>
  >;
  // ... etc
};
```

**This means**:
- TypeScript knows `me` has no args: `RequireFields<QueryMeArgs, never>`
- TypeScript knows `profile` requires `handle: string`
- Return types are validated against schema
- Context type is injected

---

### Problem B: Container-per-Resolver vs Container-per-Request

**Current pattern suggests container-per-resolver**:
```typescript
// createQueryResolvers.ts:55
const resolver = createMeResolver(context.container);
```

But you **actually have container-per-request** (correct):
```typescript
// context.ts:88-91
const container = createGraphQLContainer(context);
context.container = container;
```

**This means**:
- Container is created once per GraphQL request
- Container is available in `context.container`
- No need to extract and pass separately
- Factory pattern adds no value

---

### Problem C: Type Safety Illusion

The current architecture **appears** type-safe on the surface:

```typescript
export const createMeResolver = (
  container: AwilixContainer<GraphQLContainer>
): QueryResolvers['me'] => {  // ← Claims to return QueryResolvers['me']
  return withAuth(async (_parent: any, _args: any, context: any) => {
    //                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                     But uses 'any' internally
```

**The problem**:
- Return type annotation masks internal type unsafety
- TypeScript doesn't verify parameter types match schema
- Type assertions bridge the gap silently
- Bugs slip through at runtime

**Better approach**:
```typescript
export const Query: QueryResolvers = {
  me: withAuth(async (_parent, _args, context) => {
    // TypeScript infers all parameter types from QueryResolvers
    // No 'any' types, no assertions needed
  }),
};
```

---

## Industry Best Practices

### How GraphQL Codegen is Meant to Be Used

**Pattern: Direct Resolver Implementation**

```typescript
// ✅ RECOMMENDED: packages/graphql-server/src/resolvers/Query.ts

import type { QueryResolvers } from '../generated/types.js';
import { withAuth } from '../infrastructure/auth/withAuth.js';
import { executeUseCase } from '../infrastructure/resolvers/helpers.js';

export const Query: QueryResolvers = {
  // =====================================================
  // Fully typed by codegen - no manual declarations
  // =====================================================

  me: withAuth(async (_parent, _args, context) => {
    // TypeScript knows:
    // - _parent: {} (Query has no parent)
    // - _args: {} (me has no arguments)
    // - context: GraphQLContext & { userId: string } (from withAuth)
    // - return: Profile (from schema)

    return executeUseCase(
      context.container.resolve('getCurrentUserProfile'),
      { userId: context.userId }
    );
  }),

  profile: async (_parent, args, context) => {
    // TypeScript knows:
    // - args: { handle: string } (from schema)
    // - return: PublicProfile | null (from schema)

    return executeUseCase(
      context.container.resolve('getProfileByHandle'),
      { handle: args.handle }  // TypeScript validates 'handle' exists
    );
  },

  post: async (_parent, args, context) => {
    // TypeScript knows:
    // - args: { id: string } (from schema)
    // - return: Post | null (from schema)

    return executeUseCase(
      context.container.resolve('getPostById'),
      { id: args.id }
    );
  },

  userPosts: async (_parent, args, context) => {
    // TypeScript knows:
    // - args: { handle: string; first?: number | null; after?: string | null }
    // - return: PostConnection (from schema)

    return executeUseCase(
      context.container.resolve('getUserPosts'),
      {
        handle: args.handle,
        first: args.first ?? 20,
        after: args.after ?? undefined
      }
    );
  },
};
```

**Helper for consistent error handling**:

```typescript
// packages/graphql-server/src/infrastructure/resolvers/helpers.ts

import { ErrorFactory } from '../errors/ErrorFactory.js';
import type { Result } from '../../shared/types/result.js';

/**
 * Execute a use case and handle errors consistently.
 * Throws GraphQL errors for failures, returns data on success.
 */
export async function executeUseCase<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<TOutput> {
  const result = await useCase.execute(input);

  if (!result.success) {
    throw ErrorFactory.fromUseCaseError(result.error);
  }

  if (!result.data) {
    throw ErrorFactory.notFound();
  }

  return result.data;
}

/**
 * Execute use case that may return null (for optional fields).
 */
export async function executeOptionalUseCase<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<TOutput | null> {
  const result = await useCase.execute(input);

  if (!result.success) {
    // Log error but return null for optional fields
    console.warn('Use case failed:', result.error);
    return null;
  }

  return result.data ?? null;
}
```

**Benefits of this approach**:

✅ **No type assertions** - TypeScript validates everything
✅ **No manual type declarations** - Codegen provides them
✅ **No factory functions** - Direct implementation
✅ **Schema changes auto-flow** - Change schema → codegen → TypeScript errors guide you
✅ **Single source of truth** - GraphQL schema drives TypeScript types
✅ **Better IDE support** - IntelliSense works perfectly
✅ **Easier to understand** - Less indirection
✅ **Easier to debug** - Shorter stack traces

---

## Codegen Configuration Issues

### Current Configuration

```yaml
# packages/graphql-server/codegen.yml
schema: "../../../schema.graphql"
generates:
  ./src/schema/generated/types.ts:
    plugins:
      - typescript
      - typescript-resolvers
    config:
      contextType: "../../context#GraphQLContext"  # ✅ Good
      useIndexSignature: true                       # ⚠️ Loosens safety
      maybeValue: T | null                         # ✅ Good
```

### Problems

1. **Missing mappers**: Domain types from use cases may differ from GraphQL types
2. **No strictness config**: Should enable strict options for better type safety
3. **useIndexSignature: true**: Allows arbitrary fields, loosening type safety
4. **No avoidOptionals config**: Unclear whether partial resolvers are allowed

### Recommended Configuration

```yaml
# packages/graphql-server/codegen.yml
schema: "../../../schema.graphql"
generates:
  ./src/generated/types.ts:  # Simpler path
    plugins:
      - typescript
      - typescript-resolvers
    config:
      # ===================================
      # Context Configuration
      # ===================================
      contextType: "../context#GraphQLContext"

      # ===================================
      # Nullability & Type Safety
      # ===================================
      maybeValue: T | null              # null instead of undefined
      inputMaybeValue: T | null         # consistent with outputs
      enumsAsTypes: true                # Better TypeScript enums
      useIndexSignature: false          # Stricter type checking

      # ===================================
      # Mappers (if domain types differ)
      # ===================================
      # If your use cases return different types than GraphQL schema,
      # configure mappers to tell codegen about your domain types:
      # mappers:
      #   Profile: "../domain/types#DomainProfile"
      #   Post: "../domain/types#DomainPost"

      # ===================================
      # Resolver Configuration
      # ===================================
      # Allow partial resolvers (recommended for field resolvers)
      avoidOptionals: false

      # Use default mapper for flexible composition
      defaultMapper: Partial<{T}>

      # ===================================
      # Import Configuration
      # ===================================
      # Generate ESM imports
      useTypeImports: true

      # ===================================
      # Naming Conventions
      # ===================================
      # Keep GraphQL naming
      namingConvention:
        typeNames: keep
        enumValues: keep
```

### Key Configuration Options Explained

**contextType**: Points to your GraphQL context type
- Enables type-safe `context` parameter in resolvers
- Format: `"path#TypeName"`

**maybeValue**: How to represent nullable fields
- `T | null` is more explicit than `T | undefined`
- Matches GraphQL semantics better

**mappers**: Map GraphQL types to domain types
- Use when your use cases return different types than GraphQL schema
- Format: `GraphQLType: "path#DomainType"`

**avoidOptionals**: Whether all resolvers must be implemented
- `false` = partial resolvers allowed (common for field resolvers)
- `true` = all resolvers required (stricter)

**defaultMapper**: Default type for resolver return values
- `Partial<{T}>` allows flexible resolver composition
- Resolvers can return subsets of fields

---

## Common Patterns for Hexagonal Architecture

Given your architecture with:
- Use cases (application layer)
- Repository adapters (infrastructure)
- Awilix DI container

### Pattern 1: Resolvers as Thin Wrappers (Recommended)

```typescript
// Direct implementation with helper
export const Query: QueryResolvers = {
  me: withAuth(async (_parent, _args, context) => {
    return executeUseCase(
      context.container.resolve('getCurrentUserProfile'),
      { userId: context.userId }
    );
  }),
};
```

**Pros**:
- Minimal boilerplate
- Type-safe end-to-end
- Easy to understand

**Cons**:
- Requires helper function for error handling

---

### Pattern 2: Resolver Service Layer

```typescript
// Create a resolver service for complex logic
class ProfileResolvers {
  async me(_parent: unknown, _args: {}, context: GraphQLContext & { userId: string }) {
    const useCase = context.container.resolve('getCurrentUserProfile');
    const result = await useCase.execute({ userId: context.userId });

    if (!result.success) {
      throw ErrorFactory.fromUseCaseError(result.error);
    }

    return result.data!;
  }
}

// Use in resolver map
const profileResolvers = new ProfileResolvers();

export const Query: QueryResolvers = {
  me: withAuth(profileResolvers.me.bind(profileResolvers)),
};
```

**Pros**:
- Easier to test (can test service independently)
- Encapsulates error handling

**Cons**:
- More code
- Binding required

---

### Pattern 3: Resolver Builders (Current - Not Recommended)

```typescript
// Your current approach
const createMeResolver = (container) => withAuth(async (...) => { ... });

export const Query: QueryResolvers = {
  me: async (...args) => {
    const resolver = createMeResolver(context.container);
    return resolver(...args);
  }
};
```

**Pros**:
- None (adds complexity without benefit)

**Cons**:
- Type safety lost
- Extra indirection
- Harder to debug
- More code to maintain

---

## Specific Recommendations

### Immediate Actions (Critical)

#### 1. Generate Types

```bash
cd packages/graphql-server
pnpm install  # Install dependencies (including @graphql-codegen/cli)
pnpm codegen  # Generate types
```

**Expected output**:
- Creates `src/schema/generated/types.ts` (or `src/generated/types.ts` if config updated)
- File should be ~2000-5000 lines
- Contains `QueryResolvers`, `MutationResolvers`, `Resolvers`, etc.

**Verification**:
```bash
ls -lh src/schema/generated/types.ts
# Should show file exists and is non-empty
```

---

#### 2. Fix One Resolver as Proof of Concept

Pick the simplest resolver (`me`) and refactor:

**Before** (current):
```typescript
// resolvers/profile/meResolver.ts
export const createMeResolver = (container) => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    const useCase = container.resolve('getCurrentUserProfile');
    const result = await useCase.execute({ userId: UserId(context.userId!) });
    if (!result.success) throw ErrorFactory.internalServerError(result.error.message);
    if (!result.data) throw ErrorFactory.notFound('Profile', context.userId!);
    return result.data as any;
  });
};
```

**After** (recommended):
```typescript
// resolvers/Query.ts
export const Query: QueryResolvers = {
  me: withAuth(async (_parent, _args, context) => {
    const useCase = context.container.resolve('getCurrentUserProfile');
    const result = await useCase.execute({ userId: context.userId });

    if (!result.success) {
      throw ErrorFactory.fromUseCaseError(result.error);
    }

    if (!result.data) {
      throw ErrorFactory.notFound('Profile', context.userId);
    }

    return result.data;
  }),
};
```

**Verify**:
- No type assertions (`as any`)
- No manual type declarations
- TypeScript validates parameter and return types
- IntelliSense works

---

#### 3. Create Helper for Use Case Execution

```typescript
// src/infrastructure/resolvers/useCase.ts

import { ErrorFactory } from '../errors/ErrorFactory.js';
import type { Result } from '../../shared/types/result.js';

export async function executeUseCase<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<TOutput> {
  const result = await useCase.execute(input);

  if (!result.success) {
    throw ErrorFactory.fromUseCaseError(result.error);
  }

  if (result.data === undefined || result.data === null) {
    throw ErrorFactory.notFound();
  }

  return result.data;
}

export async function executeOptionalUseCase<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<TOutput | null> {
  const result = await useCase.execute(input);
  return result.success ? result.data ?? null : null;
}
```

---

### Short-term Actions (1-2 weeks)

#### 4. Migrate All Query Resolvers

Batch migrate resolvers in groups:
- Profile queries (`me`, `profile`)
- Post queries (`post`, `userPosts`)
- Feed queries (`followingFeed`, `exploreFeed`)
- Status queries (`followStatus`, `postLikeStatus`)
- Notification queries
- Auction queries

**For each group**:
1. Implement directly in `Query.ts`
2. Remove factory file
3. Test
4. Commit

---

#### 5. Remove Factory Pattern

After migration:
```bash
# Remove individual resolver factories
rm -rf src/resolvers/profile/meResolver.ts
rm -rf src/resolvers/profile/profileResolver.ts
# ... etc

# Remove wrapper
rm src/resolvers/createQueryResolvers.ts
```

---

#### 6. Consolidate Resolver Structure

**Target structure**:
```
src/
├── generated/
│   └── types.ts                    # Generated by codegen
├── resolvers/
│   ├── Query.ts                    # All Query resolvers
│   ├── Mutation.ts                 # All Mutation resolvers
│   ├── Post.ts                     # Post field resolvers
│   ├── Profile.ts                  # Profile field resolvers
│   ├── Auction.ts                  # Auction field resolvers
│   └── index.ts                    # Export combined resolver map
└── infrastructure/
    └── resolvers/
        ├── useCase.ts              # Use case execution helpers
        └── helpers/
            ├── ConnectionBuilder.ts
            └── validateCursor.ts
```

**Remove**:
```
src/schema/resolvers/   # Duplicate directory
```

---

### Long-term Actions (Next sprint)

#### 7. Improve Codegen Configuration

Update `codegen.yml` with stricter settings:
- Add mappers if domain types differ
- Enable strict nullability
- Configure proper naming conventions

---

#### 8. Add Type Safety Tests

Create tests that verify type safety:

```typescript
// src/resolvers/__tests__/type-safety.test.ts

import { describe, it, expectTypeOf } from 'vitest';
import type { QueryResolvers } from '../../generated/types.js';
import { Query } from '../Query.js';

describe('Resolver Type Safety', () => {
  it('Query resolvers match generated types', () => {
    expectTypeOf(Query).toMatchTypeOf<QueryResolvers>();
  });

  it('me resolver has correct signature', () => {
    expectTypeOf(Query.me).toBeFunction();
    expectTypeOf(Query.me).parameters.toMatchTypeOf<
      [unknown, {}, GraphQLContext, GraphQLResolveInfo]
    >();
  });
});
```

---

#### 9. Document Resolver Patterns

Create `RESOLVER_PATTERNS.md` documenting:
- How to create new resolvers
- When to use `executeUseCase` vs `executeOptionalUseCase`
- Error handling patterns
- Authentication patterns

---

#### 10. Add CI Checks

Ensure types are always generated:

```yaml
# .github/workflows/ci.yml
- name: Generate GraphQL types
  run: pnpm --filter @social-media-app/graphql-server codegen

- name: Type check
  run: pnpm typecheck

- name: Verify no 'any' types in resolvers
  run: |
    ! grep -r "as any" packages/graphql-server/src/resolvers/
```

---

## Migration Strategy

### Phase 1: Foundation (Day 1 - 1 hour)

**Goals**:
- Generate types
- Verify they work
- Create proof of concept

**Steps**:
1. Install dependencies: `pnpm install`
2. Generate types: `pnpm codegen`
3. Verify: `ls src/schema/generated/types.ts`
4. Refactor `me` resolver as POC
5. Test manually
6. Commit

**Success criteria**:
- ✅ Generated types file exists
- ✅ One resolver migrated successfully
- ✅ No type errors for that resolver
- ✅ Tests pass

---

### Phase 2: Query Resolvers (Day 2-3 - 4 hours)

**Goals**:
- Migrate all Query resolvers
- Create helper functions
- Remove factory pattern

**Steps**:
1. Create `executeUseCase` helper
2. Migrate Query resolvers in batches:
   - Profile queries
   - Post queries
   - Feed queries
   - Status queries
   - Notification queries
   - Auction queries
3. Remove factory files
4. Remove `createQueryResolvers.ts`
5. Update tests
6. Commit per batch

**Success criteria**:
- ✅ All Query resolvers migrated
- ✅ No factory functions remain
- ✅ All tests pass
- ✅ No type assertions in resolvers

---

### Phase 3: Mutation & Field Resolvers (Day 4-5 - 4 hours)

**Goals**:
- Migrate Mutation resolvers
- Migrate field resolvers (Post, Profile, etc.)

**Steps**:
1. Apply same pattern to Mutations
2. Migrate field resolvers
3. Remove remaining factory files
4. Update tests
5. Commit

**Success criteria**:
- ✅ All resolvers migrated
- ✅ Clean directory structure
- ✅ All tests pass

---

### Phase 4: Cleanup & Documentation (Day 6 - 2 hours)

**Goals**:
- Remove unused code
- Document patterns
- Verify type safety

**Steps**:
1. Remove duplicate `schema/resolvers/` directory
2. Update imports
3. Run type checker: `pnpm typecheck`
4. Document patterns in README
5. Add CI checks
6. Final commit

**Success criteria**:
- ✅ No TypeScript errors
- ✅ No unused files
- ✅ Documentation complete
- ✅ CI passes

---

## Testing Strategy

### Type Safety Tests

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type { QueryResolvers, MutationResolvers } from '../generated/types.js';
import { Query } from './Query.js';
import { Mutation } from './Mutation.js';

describe('Type Safety', () => {
  it('Query resolvers match schema', () => {
    expectTypeOf(Query).toMatchTypeOf<QueryResolvers>();
  });

  it('Mutation resolvers match schema', () => {
    expectTypeOf(Mutation).toMatchTypeOf<MutationResolvers>();
  });
});
```

### Integration Tests

Ensure resolvers still work after migration:

```typescript
describe('Query.me', () => {
  it('returns authenticated user profile', async () => {
    const context = createTestContext({ userId: 'user-123' });
    const result = await Query.me!({}, {}, context, createMockInfo());

    expect(result).toMatchObject({
      id: 'user-123',
      username: expect.any(String),
      // ...
    });
  });
});
```

---

## Risk Mitigation

### Low Risk Changes

- ✅ Generating types (additive)
- ✅ Refactoring individual resolvers (isolated)
- ✅ Adding helper functions (new code)

### Medium Risk Changes

- ⚠️ Removing factory files (need to ensure all references updated)
- ⚠️ Changing import paths (need search/replace)

### Mitigation Strategies

1. **Incremental migration**: One resolver at a time
2. **Comprehensive testing**: Run tests after each batch
3. **Git commits per batch**: Easy rollback if needed
4. **Code review**: Review type safety improvements
5. **Pair programming**: For complex resolvers

---

## Expected Outcomes

### Before (Current State)

```typescript
// ❌ Type safety lost
me: async (
  _parent: unknown,
  _args: unknown,
  context: GraphQLContext,
  info: GraphQLResolveInfo
) => {
  const resolver = createMeResolver(context.container);
  return resolver(_parent, _args, context, info);
}

// In createMeResolver:
return withAuth(async (_parent: any, _args: any, context: any) => {
  //                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  return result.data as any;
})
```

**Issues**:
- Type assertions required
- Manual type declarations
- No schema validation
- Poor IntelliSense

---

### After (Target State)

```typescript
// ✅ Fully type-safe
export const Query: QueryResolvers = {
  me: withAuth(async (_parent, _args, context) => {
    // All types inferred from QueryResolvers
    // No manual declarations needed
    // No type assertions needed

    return executeUseCase(
      context.container.resolve('getCurrentUserProfile'),
      { userId: context.userId }
    );
  }),
};
```

**Benefits**:
- ✅ No type assertions
- ✅ Full type inference
- ✅ Schema changes flow through automatically
- ✅ Perfect IntelliSense
- ✅ Compile-time validation

---

## Success Metrics

### Quantitative

- [ ] 0 TypeScript errors in `packages/graphql-server`
- [ ] 0 uses of `as any` in resolver files
- [ ] 0 manual parameter type declarations in resolvers
- [ ] 100% test coverage maintained
- [ ] Generated types file exists and is non-empty

### Qualitative

- [ ] IntelliSense works in resolvers
- [ ] Schema changes immediately show TypeScript errors in affected resolvers
- [ ] New developers can understand resolver structure easily
- [ ] Code reviews focus on logic, not type gymnastics

---

## Key Takeaways

### The Fundamental Problem

**You're fighting GraphQL Codegen instead of leveraging it.**

GraphQL Codegen is designed to eliminate:
- Manual type declarations
- Type assertions
- Wrapper functions
- Type safety loss

The current architecture adds these problems instead of solving them.

### The Solution

**Simplify, don't add layers.**

Direct resolver implementations with proper codegen configuration give you:
- End-to-end type safety
- Zero runtime overhead
- Better developer experience
- Easier maintenance

### The Path Forward

1. **Generate types** (5 minutes)
2. **Refactor one resolver** (15 minutes)
3. **Batch migrate remaining** (2-3 days)
4. **Remove factory pattern** (1 day)
5. **Document & test** (1 day)

**Total effort**: ~1 week
**Long-term benefit**: Permanent improvement in type safety and developer experience

---

## References

### GraphQL Code Generator Documentation

- [TypeScript Resolvers Plugin](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-resolvers)
- [Better Type Safety Article](https://the-guild.dev/blog/better-type-safety-for-resolvers-with-graphql-codegen)
- [How to Write GraphQL Resolvers Effectively](https://the-guild.dev/graphql/hive/blog/how-to-write-graphql-resolvers-effectively)

### Related Documentation

- [Apollo Server TypeScript Documentation](https://www.apollographql.com/docs/apollo-server/workflow/generate-types)
- [Awilix Documentation](https://github.com/jeffijoe/awilix)
- [Hexagonal Architecture in TypeScript](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)

---

## Appendix: Example Migration

### Before: Current Pattern

```typescript
// ❌ resolvers/profile/meResolver.ts
export const createMeResolver = (
  container: AwilixContainer<GraphQLContainer>
): QueryResolvers['me'] => {
  return withAuth(async (_parent: any, _args: any, context: any) => {
    const useCase = container.resolve('getCurrentUserProfile');
    const result = await useCase.execute({ userId: UserId(context.userId!) });

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }

    if (!result.data) {
      throw ErrorFactory.notFound('Profile', context.userId!);
    }

    return result.data as any;
  });
};

// ❌ resolvers/createQueryResolvers.ts
export function createQueryResolvers(): QueryResolvers {
  return {
    me: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      const resolver = createMeResolver(context.container);
      if (!resolver) {
        throw new Error('Failed to create me resolver');
      }
      return resolver(_parent, _args, context, info);
    },
  };
}

// ❌ schema/resolvers/Query.ts
export const Query: QueryResolvers = createQueryResolvers();
```

**Issues**: 3 files, type assertions, manual types, unnecessary wrappers

---

### After: Recommended Pattern

```typescript
// ✅ resolvers/Query.ts
import type { QueryResolvers } from '../generated/types.js';
import { withAuth } from '../infrastructure/auth/withAuth.js';
import { executeUseCase } from '../infrastructure/resolvers/useCase.js';

export const Query: QueryResolvers = {
  me: withAuth(async (_parent, _args, context) => {
    return executeUseCase(
      context.container.resolve('getCurrentUserProfile'),
      { userId: context.userId }
    );
  }),

  profile: async (_parent, args, context) => {
    return executeUseCase(
      context.container.resolve('getProfileByHandle'),
      { handle: args.handle }
    );
  },

  // ... all other Query resolvers
};

// ✅ infrastructure/resolvers/useCase.ts
import { ErrorFactory } from '../errors/ErrorFactory.js';
import type { Result } from '../../shared/types/result.js';

export async function executeUseCase<TInput, TOutput>(
  useCase: { execute: (input: TInput) => Promise<Result<TOutput>> },
  input: TInput
): Promise<TOutput> {
  const result = await useCase.execute(input);

  if (!result.success) {
    throw ErrorFactory.fromUseCaseError(result.error);
  }

  if (!result.data) {
    throw ErrorFactory.notFound();
  }

  return result.data;
}

// ✅ resolvers/index.ts
import type { Resolvers } from '../generated/types.js';
import { Query } from './Query.js';
import { Mutation } from './Mutation.js';
import { Post } from './Post.js';
import { Profile } from './Profile.js';

export const resolvers: Resolvers = {
  Query,
  Mutation,
  Post,
  Profile,
};
```

**Benefits**:
- 2 files (vs 3+)
- No type assertions
- No manual types
- Full type safety
- Easier to understand

---

## Next Steps

1. **Review this analysis** with the team
2. **Decide on migration timeline** (recommended: 1 week sprint)
3. **Run codegen** to generate types
4. **Create POC** with one refactored resolver
5. **Execute migration plan** in phases
6. **Document patterns** for future development

---

**End of Analysis**
