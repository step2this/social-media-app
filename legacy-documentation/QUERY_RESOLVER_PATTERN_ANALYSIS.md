# Query Resolver Pattern Analysis & Recommendations

**Date:** 2025-11-08
**Context:** GraphQL Server Query Resolver Patterns
**Status:** Analysis Complete

---

## 🔍 Current Situation

### The Problem

The `/Users/shaperosteve/social-media-app/packages/graphql-server/src/resolvers/createQueryResolvers.ts` file has **14 TypeScript errors** and uses a highly **repetitive pattern** that's error-prone and hard to maintain.

### Current Pattern

```typescript
// ❌ CURRENT: Repetitive and Error-Prone
export function createQueryResolvers(): QueryResolvers {
  return {
    me: async (_parent, _args, context, info) => {
      return createMeResolver(context.container)!(_parent, _args, context, info);
    },

    profile: async (_parent, args, context, info) => {
      return createProfileResolver(context.container)!(_parent, args, context, info);
    },

    // ... repeated 11 more times
  };
}
```

### TypeScript Errors Breakdown

1. **"This expression is not callable" (11 occurrences)**
   - **Root Cause**: GraphQL Codegen's `Resolver` type is a union:
     ```typescript
     type Resolver<TResult, TParent, TContext, TArgs> =
       | ResolverFn<TResult, TParent, TContext, TArgs>
       | ResolverWithResolve<TResult, TParent, TContext, TArgs>
     ```
   - Factory functions return `QueryResolvers['me']` (which is a `Resolver` union)
   - Immediately calling with `()` fails because `ResolverWithResolve` has no call signatures
   - It has a `resolve` property instead of being directly callable

2. **Arguments Type Mismatch (3 occurrences)**
   - `followStatus`: expects `userId`, receives `followeeId`
   - `notifications`: type structure mismatch
   - These are bugs in the resolver implementations

### Architecture Context

```
┌─────────────────────────────────────────────────────────┐
│                 createQueryResolvers.ts                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  me: async (...) => {                            │  │
│  │    return createMeResolver(container)!(...)      │  │
│  │  }                                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│               Resolver Factory Functions                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  createMeResolver(container) {                   │  │
│  │    return withAuth(async (...) => {              │  │
│  │      const useCase = container.resolve(...)      │  │
│  │      return useCase.execute(...)                 │  │
│  │    })                                            │  │
│  │  }                                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                 Awilix DI Container                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Use Cases → Repositories → DAL Services         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Pattern Comparison Analysis

### Pattern 1: Current Factory Pattern (With Type Fix)

```typescript
// ✅ FIXED: Type-safe wrapper function
function wrapFactory<TArgs, TResult>(
  factory: (container: AwilixContainer<GraphQLContainer>) => GraphQLFieldResolver<any, GraphQLContext, TArgs, TResult>
): GraphQLFieldResolver<any, GraphQLContext, TArgs, TResult> {
  return (parent, args, context, info) => {
    const resolver = factory(context.container);
    return resolver(parent, args, context, info);
  };
}

export function createQueryResolvers(): QueryResolvers {
  return {
    me: wrapFactory(createMeResolver),
    profile: wrapFactory(createProfileResolver),
    // ... etc
  };
}
```

**Pros:**
- ✅ Fixes TypeScript errors
- ✅ Maintains existing factory architecture
- ✅ Works with existing `withAuth` HOC pattern
- ✅ Minimal changes needed

**Cons:**
- ⚠️ Still somewhat verbose
- ⚠️ Extra indirection (factory → resolver)
- ⚠️ Resolver files still needed (but they already exist)

---

### Pattern 2: Direct Inline Resolution

```typescript
export function createQueryResolvers(): QueryResolvers {
  return {
    // ✅ OPTION 2A: Direct resolution with auth HOC
    me: withAuth(async (_parent, _args, context) => {
      const useCase = context.container.resolve('getCurrentUserProfile');
      const result = await useCase.execute({ userId: UserId(context.userId!) });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }
      if (!result.data) {
        throw ErrorFactory.notFound('Profile', context.userId!);
      }

      return result.data as any;
    }),

    // ✅ OPTION 2B: Public resolver (no auth)
    profile: async (_parent, args: { handle: string }, context) => {
      const useCase = context.container.resolve('getProfileByHandle');
      const result = await useCase.execute({ handle: args.handle });

      if (!result.success) {
        throw ErrorFactory.internalServerError(result.error.message);
      }
      if (!result.data) {
        throw ErrorFactory.notFound('Profile', args.handle);
      }

      return result.data as any;
    }
  };
}
```

**Pros:**
- ✅ **Extremely clear** - all logic in one place
- ✅ **No factories needed** - simpler architecture
- ✅ **Easy to debug** - no indirection
- ✅ **Fewer files** - no separate resolver files
- ✅ Works perfectly with `withAuth` HOC

**Cons:**
- ⚠️ Larger single file (but still manageable ~400-500 LOC)
- ⚠️ **Repetitive error handling** (but can be abstracted)
- ⚠️ Need to delete existing resolver factory files

---

### Pattern 3: Generic Resolver Builder

```typescript
// ✅ OPTION 3: Generic builder with automatic error handling

interface ResolverConfig<TArgs, TUseCaseName extends keyof GraphQLContainer> {
  useCaseName: TUseCaseName;
  requireAuth?: boolean;
  mapArgs: (args: TArgs, context: GraphQLContext) => Parameters<GraphQLContainer[TUseCaseName]['execute']>[0];
  notFoundEntity?: string;
  getNotFoundId?: (args: TArgs) => string;
}

function buildResolver<TArgs, TUseCaseName extends keyof GraphQLContainer>(
  config: ResolverConfig<TArgs, TUseCaseName>
) {
  const resolver = async (_parent: any, args: TArgs, context: GraphQLContext) => {
    const useCase = context.container.resolve(config.useCaseName);
    const useCaseArgs = config.mapArgs(args, context);
    const result = await useCase.execute(useCaseArgs);

    if (!result.success) {
      throw ErrorFactory.internalServerError(result.error.message);
    }
    if (!result.data && config.notFoundEntity) {
      const id = config.getNotFoundId?.(args) ?? 'unknown';
      throw ErrorFactory.notFound(config.notFoundEntity, id);
    }

    return result.data as any;
  };

  return config.requireAuth ? withAuth(resolver) : resolver;
}

export function createQueryResolvers(): QueryResolvers {
  return {
    me: buildResolver({
      useCaseName: 'getCurrentUserProfile',
      requireAuth: true,
      mapArgs: (_args, context) => ({ userId: UserId(context.userId!) }),
      notFoundEntity: 'Profile',
      getNotFoundId: (_args) => context.userId!
    }),

    profile: buildResolver({
      useCaseName: 'getProfileByHandle',
      mapArgs: (args: { handle: string }) => ({ handle: args.handle }),
      notFoundEntity: 'Profile',
      getNotFoundId: (args) => args.handle
    })
  };
}
```

**Pros:**
- ✅ **DRY** - no repeated error handling
- ✅ **Type-safe** - full TypeScript inference
- ✅ **Declarative** - reads like configuration
- ✅ **Composable** - auth is opt-in
- ✅ **Single file** - all resolvers in one place

**Cons:**
- ⚠️ More complex abstraction
- ⚠️ Requires learning the builder API
- ⚠️ Slightly less flexible for edge cases

---

## 🎯 Recommendation

### Primary Recommendation: **Pattern 2 (Direct Inline Resolution)** + Helper Utilities

**Why?**

1. **Clarity**: All resolver logic is visible in one place - no factory indirection
2. **Simplicity**: Easiest to understand and maintain
3. **Debuggability**: Clear stack traces, no extra layers
4. **Alignment with Migration Plan**: The Library Migration Plan (Phase 2) emphasizes **direct Awilix resolution** in handlers

### Implementation Strategy

#### Step 1: Create Helper Utilities (Reduce Boilerplate)

```typescript
// /Users/shaperosteve/social-media-app/packages/graphql-server/src/resolvers/helpers/resolverHelpers.ts

import type { AwilixContainer } from 'awilix';
import type { GraphQLContext } from '../../context.js';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';

/**
 * Execute use case and handle common error patterns
 *
 * @example
 * const profile = await executeUseCase(
 *   container,
 *   'getCurrentUserProfile',
 *   { userId: UserId(context.userId!) },
 *   { notFoundEntity: 'Profile', notFoundId: context.userId! }
 * );
 */
export async function executeUseCase<
  TUseCaseName extends keyof GraphQLContainer,
  TUseCase extends GraphQLContainer[TUseCaseName],
  TArgs extends Parameters<TUseCase['execute']>[0]
>(
  container: AwilixContainer<GraphQLContainer>,
  useCaseName: TUseCaseName,
  args: TArgs,
  options?: {
    notFoundEntity?: string;
    notFoundId?: string;
  }
) {
  const useCase = container.resolve(useCaseName) as TUseCase;
  const result = await useCase.execute(args);

  if (!result.success) {
    throw ErrorFactory.internalServerError(result.error.message);
  }

  if (!result.data && options?.notFoundEntity) {
    throw ErrorFactory.notFound(options.notFoundEntity, options.notFoundId ?? 'unknown');
  }

  return result.data;
}
```

#### Step 2: Refactor `createQueryResolvers.ts`

```typescript
// /Users/shaperosteve/social-media-app/packages/graphql-server/src/resolvers/createQueryResolvers.ts

import type { QueryResolvers } from '../schema/generated/types.js';
import type { GraphQLContext } from '../context.js';
import { withAuth } from '../infrastructure/resolvers/withAuth.js';
import { executeUseCase } from './helpers/resolverHelpers.js';
import { UserId, PostId, AuctionId } from '../shared/types/index.js';

/**
 * Create all Query resolvers with direct Awilix container resolution.
 *
 * Benefits of this approach:
 * - Clear and explicit - all logic in one place
 * - Easy to debug - no factory indirection
 * - Type-safe - full TypeScript inference
 * - Consistent error handling via executeUseCase helper
 */
export function createQueryResolvers(): QueryResolvers {
  return {
    /**
     * Query.me - Get current user's profile
     * Requires authentication
     */
    me: withAuth(async (_parent, _args, context) => {
      return executeUseCase(
        context.container,
        'getCurrentUserProfile',
        { userId: UserId(context.userId!) },
        { notFoundEntity: 'Profile', notFoundId: context.userId! }
      ) as any;
    }),

    /**
     * Query.profile - Get public profile by handle
     * Public - no authentication required
     */
    profile: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getProfileByHandle',
        { handle: args.handle },
        { notFoundEntity: 'Profile', notFoundId: args.handle }
      ) as any;
    },

    /**
     * Query.post - Get single post by ID
     * Public - no authentication required
     */
    post: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getPostById',
        { postId: PostId(args.id) },
        { notFoundEntity: 'Post', notFoundId: args.id }
      ) as any;
    },

    /**
     * Query.userPosts - Get paginated posts for a user
     * Public - no authentication required
     */
    userPosts: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getUserPosts',
        {
          handle: args.handle,
          first: args.first ?? undefined,
          after: args.after ?? undefined
        }
      ) as any;
    },

    /**
     * Query.followingFeed - Get posts from followed users
     * Requires authentication
     */
    followingFeed: withAuth(async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getFollowingFeed',
        {
          userId: UserId(context.userId!),
          first: args.first ?? undefined,
          after: args.after ?? undefined
        }
      ) as any;
    }),

    /**
     * Query.exploreFeed - Get explore feed (public posts)
     * Public - no authentication required
     */
    exploreFeed: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getExploreFeed',
        {
          first: args.first ?? undefined,
          after: args.after ?? undefined
        }
      ) as any;
    },

    /**
     * Query.comments - Get paginated comments for a post
     * Public - no authentication required
     */
    comments: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getCommentsByPost',
        {
          postId: PostId(args.postId),
          first: args.first ?? undefined,
          after: args.after ?? undefined
        }
      ) as any;
    },

    /**
     * Query.followStatus - Check if current user follows another user
     * Requires authentication
     */
    followStatus: withAuth(async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getFollowStatus',
        {
          followerId: UserId(context.userId!),
          followeeId: UserId(args.userId)  // ✅ FIXED: was followeeId
        }
      ) as any;
    }),

    /**
     * Query.postLikeStatus - Check if current user liked a post
     * Requires authentication
     */
    postLikeStatus: withAuth(async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getPostLikeStatus',
        {
          userId: UserId(context.userId!),
          postId: PostId(args.postId)
        }
      ) as any;
    }),

    /**
     * Query.notifications - Get paginated notifications for current user
     * Requires authentication
     */
    notifications: withAuth(async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getNotifications',
        {
          userId: UserId(context.userId!),
          first: args.first ?? undefined,
          after: args.after ?? undefined
        }
      ) as any;
    }),

    /**
     * Query.unreadNotificationsCount - Get count of unread notifications
     * Requires authentication
     */
    unreadNotificationsCount: withAuth(async (_parent, _args, context) => {
      return executeUseCase(
        context.container,
        'getUnreadNotificationsCount',
        { userId: UserId(context.userId!) }
      ) as any;
    }),

    /**
     * Query.auction - Get single auction by ID
     * Public - no authentication required
     */
    auction: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getAuction',
        { auctionId: AuctionId(args.id) },
        { notFoundEntity: 'Auction', notFoundId: args.id }
      ) as any;
    },

    /**
     * Query.auctions - Get paginated auctions with optional filtering
     * Public - no authentication required
     */
    auctions: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getAuctions',
        {
          status: args.status ?? undefined,
          limit: args.limit ?? undefined,
          cursor: args.cursor ?? undefined
        }
      ) as any;
    }),

    /**
     * Query.bids - Get paginated bid history for an auction
     * Public - no authentication required
     */
    bids: async (_parent, args, context) => {
      return executeUseCase(
        context.container,
        'getBidHistory',
        {
          auctionId: AuctionId(args.auctionId),
          limit: args.limit ?? undefined,
          cursor: args.cursor ?? undefined
        }
      ) as any;
    })
  };
}
```

#### Step 3: Cleanup

1. **Delete factory files** (optional - can keep for reference initially):
   - `/Users/shaperosteve/social-media-app/packages/graphql-server/src/resolvers/profile/meResolver.ts`
   - `/Users/shaperosteve/social-media-app/packages/graphql-server/src/resolvers/profile/profileResolver.ts`
   - `/Users/shaperosteve/social-media-app/packages/graphql-server/src/resolvers/post/postResolver.ts`
   - ... (all other resolver factory files)

2. **Update tests** to test resolvers directly through GraphQL queries instead of factory functions

---

## 🔄 Alternative: Keep Factories (Pattern 1)

If you prefer to keep the factory architecture (for organizational reasons), here's the minimal fix:

```typescript
// /Users/shaperosteve/social-media-app/packages/graphql-server/src/resolvers/helpers/wrapFactory.ts

import type { GraphQLFieldResolver } from 'graphql';
import type { AwilixContainer } from 'awilix';
import type { GraphQLContext } from '../../context.js';
import type { GraphQLContainer } from '../../infrastructure/di/awilix-container.js';

/**
 * Type-safe wrapper for resolver factory functions.
 *
 * Fixes TypeScript error: "This expression is not callable"
 * by ensuring the factory returns a callable resolver function.
 */
export function wrapFactory<TArgs, TResult>(
  factory: (container: AwilixContainer<GraphQLContainer>) => GraphQLFieldResolver<any, GraphQLContext, TArgs, TResult>
): GraphQLFieldResolver<any, GraphQLContext, TArgs, TResult> {
  return (parent, args, context, info) => {
    const resolver = factory(context.container);
    return resolver(parent, args, context, info);
  };
}
```

Then update `createQueryResolvers.ts`:

```typescript
import { wrapFactory } from './helpers/wrapFactory.js';

export function createQueryResolvers(): QueryResolvers {
  return {
    me: wrapFactory(createMeResolver),
    profile: wrapFactory(createProfileResolver),
    post: wrapFactory(createPostResolver),
    // ... etc - much cleaner!
  };
}
```

---

## 📈 Comparison Summary

| Aspect | Pattern 1 (Factory + Wrapper) | **Pattern 2 (Direct Inline)** | Pattern 3 (Generic Builder) |
|--------|-------------------------------|-------------------------------|----------------------------|
| **Lines of Code** | ~300 (split across files) | ~250 (single file) | ~200 (with builder) |
| **Complexity** | Medium | **Low** ✅ | High |
| **Debuggability** | Medium (factory indirection) | **High** ✅ | Medium |
| **Type Safety** | High | **High** ✅ | High |
| **Boilerplate** | Low (with wrapper) | Medium (reduced with helper) | **Very Low** |
| **Learning Curve** | Low | **Very Low** ✅ | High |
| **Flexibility** | High | **High** ✅ | Medium |
| **Testability** | High | **High** ✅ | High |
| **Migration Effort** | **Low** ✅ | Medium | High |

---

## ✅ Action Items

### Immediate Fix (Pattern 1 - Minimal Changes)

1. Create `wrapFactory` helper
2. Update `createQueryResolvers.ts` to use `wrapFactory`
3. Fix argument mismatches (`followeeId` → `userId`)
4. Run type check: `pnpm typecheck`
5. **Time estimate:** 30 minutes

### Recommended Refactor (Pattern 2 - Best Practice)

1. Create `resolverHelpers.ts` with `executeUseCase` utility
2. Refactor `createQueryResolvers.ts` to use direct inline resolution
3. Update tests to test through GraphQL queries
4. Delete old factory files (after verification)
5. **Time estimate:** 2-3 hours

---

## 📚 References

- **Library Migration Plan**: Pattern aligns with Phase 2 (Awilix migration)
- **GraphQL Best Practices**: Direct resolvers > Factory pattern for simplicity
- **Awilix Docs**: Recommends resolving dependencies at usage point
- **TypeScript Handbook**: Union types and callable signatures

---

## 🎓 Key Takeaways

1. **The factory pattern was adding unnecessary complexity** - it was a layer of indirection that didn't provide enough value
2. **Direct Awilix resolution is simpler and clearer** - aligns with the migration plan's philosophy
3. **Helper utilities can eliminate boilerplate** without introducing complex abstractions
4. **Type safety can be maintained** in all approaches with proper typing

**Bottom Line**: Pattern 2 (Direct Inline Resolution) offers the best balance of **simplicity**, **clarity**, and **maintainability** for this codebase.
