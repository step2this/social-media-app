# tRPC Migration Analysis: GraphQL → tRPC + TanStack Query

**Date:** November 10, 2025
**Status:** Investigation Phase
**Author:** Claude Code Analysis

---

## Executive Summary

This document analyzes the feasibility, costs, and benefits of migrating from GraphQL (Apollo Server + Relay) to tRPC + TanStack Query for the social-media-app monorepo.

### Critical Clarification: Relay vs TanStack Query

**Important:** Relay is a GraphQL-specific client and **cannot be used with tRPC**. The migration would replace:
- **Backend:** Apollo Server (GraphQL) → tRPC Server
- **Frontend:** Relay (GraphQL client) → TanStack Query (tRPC client)

---

## Current Architecture Pain Points

### 1. TypeScript Type Safety Issues

**Critical:** The `graphql-server` package has relaxed TypeScript configuration:
```json
{
  "strict": false,
  "noImplicitAny": false,
  "strictNullChecks": false
}
```

**Impact:**
- **76 `as any` type assertions** throughout resolvers
- **20 `@ts-ignore` comments** to bypass type checking
- Type mismatches between DAL types and GraphQL schema types
- Manual type casting at every resolver boundary

### 2. Code Generation Overhead

**Current Setup:**
- GraphQL schema → GraphQL Code Generator → TypeScript types
- Codegen generates strict types including field resolver fields
- Use cases return partial objects (domain types)
- Requires custom "Parent" types + mappers to bridge the gap
- Regeneration needed on every schema change

**Example:**
```typescript
// Use case returns PostParent (without author, isLiked)
return result as PostParent; // Manual type assertion needed

// GraphQL expects full Post (with author, isLiked)
// Field resolvers must fill the gap
```

### 3. Type Boundary Mismatches

**DAL vs GraphQL Type Incompatibilities:**

| Issue | DAL Type | GraphQL Type | Workaround |
|-------|----------|--------------|------------|
| Optional vs Nullable | `caption?: string` | `caption: string \| null` | Adapter layer transforms |
| Enum Values | `NotificationStatus.UNREAD` | Different enum values | @ts-ignore + runtime mapping |
| Partial Objects | Domain entities | Full schema types | "Parent" types + field resolvers |
| Field Resolvers | Exclude computed fields | Include all fields | Custom mapper configuration |

### 4. Architectural Complexity

**Current Layers:**
```
Frontend (React + Relay)
    ↓
Relay Runtime (Cache + Network)
    ↓
GraphQL Schema (SDL)
    ↓
GraphQL Code Generator
    ↓
Apollo Server (Resolver execution)
    ↓
Resolvers (executeUseCase wrappers)
    ↓
Use Cases (Business logic)
    ↓
Repository Adapters (Type transformations)
    ↓
DAL Services (DynamoDB/PostgreSQL)
```

**Type Boundaries:** 5+ distinct type systems must align

---

## tRPC Architecture Benefits

### 1. End-to-End Type Safety WITHOUT Code Generation

**Key Advantage:** tRPC infers types automatically from server procedures.

```typescript
// Server (tRPC)
export const appRouter = router({
  post: {
    byId: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        return ctx.postRepository.findById(PostId(input.id));
      }),
  },
});

export type AppRouter = typeof appRouter;

// Client (React + TanStack Query)
import type { AppRouter } from '@server/router';
const trpc = createTRPCReact<AppRouter>();

// ✅ Fully typed - no codegen needed!
const { data } = trpc.post.byId.useQuery({ id: '123' });
//     ^? data: Post | undefined
```

**Benefits:**
- Zero code generation
- Instant type updates on server changes
- Compiler catches breaking changes immediately
- No `as any` assertions needed

### 2. Simplified Architecture

**Proposed tRPC Layers:**
```
Frontend (React + TanStack Query)
    ↓
tRPC Client (Type-safe RPC calls)
    ↓
tRPC Server (Procedure execution)
    ↓
Use Cases (Business logic) ← UNCHANGED
    ↓
Repository Adapters ← UNCHANGED
    ↓
DAL Services ← UNCHANGED
```

**Type Boundaries:** 2 distinct systems (DAL → Domain, Domain → tRPC)

**Eliminated:**
- GraphQL schema definition
- GraphQL Code Generator
- Resolver wrapper layer
- Parent type adapters
- Field resolver complexity

### 3. Monorepo-First Design

tRPC is built specifically for TypeScript monorepos:

```typescript
// packages/trpc-server/src/router/index.ts
export const appRouter = router({
  auth: authRouter,
  post: postRouter,
  profile: profileRouter,
  // ... etc
});

// packages/frontend/src/utils/trpc.ts
import type { AppRouter } from '@social-media-app/trpc-server';
const trpc = createTRPCReact<AppRouter>();
```

**Benefits:**
- Types shared directly via workspace imports
- No schema synchronization
- No separate type packages
- Automatic type updates across packages

### 4. Modern React Integration (TanStack Query)

**Released:** February 17, 2025 - New TanStack React Query integration

```typescript
// Server
export const postRouter = router({
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) => ctx.postUseCase.execute(input)),
});

// Client
const { data, isLoading, error, refetch } = trpc.post.byId.useQuery(
  { id: postId },
  {
    enabled: !!postId,
    staleTime: 5000,
    // Full TanStack Query options
  }
);

// Mutations
const createPost = trpc.post.create.useMutation({
  onSuccess: () => {
    trpc.post.list.invalidate(); // Type-safe cache invalidation
  },
});
```

**Benefits:**
- Full TanStack Query power (caching, refetching, optimistic updates)
- Type-safe query keys and cache invalidation
- No custom cache logic needed
- Server State management built-in

---

## Detailed Comparison: GraphQL vs tRPC

### Type Safety

| Feature | GraphQL + Relay | tRPC + TanStack Query | Winner |
|---------|-----------------|----------------------|--------|
| **Type inference** | No (codegen required) | Yes (automatic) | ✅ tRPC |
| **Breaking changes** | Runtime errors | Compile-time errors | ✅ tRPC |
| **Setup complexity** | High (schema + codegen) | Low (just TypeScript) | ✅ tRPC |
| **Type assertions** | 76+ `as any` | Zero needed | ✅ tRPC |
| **Strict mode** | Disabled | Enabled | ✅ tRPC |

### Developer Experience

| Feature | GraphQL + Relay | tRPC + TanStack Query | Winner |
|---------|-----------------|----------------------|--------|
| **Learning curve** | Steep (SDL, resolvers, Relay) | Moderate (just TS) | ✅ tRPC |
| **Refactoring** | Manual schema updates | Auto-propagated | ✅ tRPC |
| **IDE support** | Good | Excellent | ✅ tRPC |
| **Debugging** | Complex (layers) | Simple (direct calls) | ✅ tRPC |
| **Build time** | Slower (codegen) | Faster | ✅ tRPC |

### Flexibility & Power

| Feature | GraphQL + Relay | tRPC + TanStack Query | Winner |
|---------|-----------------|----------------------|--------|
| **Query flexibility** | Client-defined queries | Fixed endpoints | ✅ GraphQL |
| **Over-fetching prevention** | Excellent | Manual | ✅ GraphQL |
| **Under-fetching prevention** | Excellent | Manual | ✅ GraphQL |
| **Public API** | Excellent | Poor | ✅ GraphQL |
| **Multiple clients** | Language-agnostic | TypeScript only | ✅ GraphQL |
| **Introspection** | Built-in | None | ✅ GraphQL |
| **Third-party tools** | Extensive ecosystem | Growing | ✅ GraphQL |

### Caching & Performance

| Feature | GraphQL + Relay | tRPC + TanStack Query | Winner |
|---------|-----------------|----------------------|--------|
| **Normalized cache** | Yes (automatic) | No (manual with TanStack) | ✅ GraphQL |
| **Cache updates** | Automatic | Manual invalidation | ✅ GraphQL |
| **Optimistic updates** | Built-in | Manual | ✅ GraphQL |
| **Query batching** | Built-in | Built-in | 🟰 Tie |
| **Pagination** | Relay Connections | TanStack useInfiniteQuery | 🟰 Tie |

### Monorepo Fit

| Feature | GraphQL + Relay | tRPC + TanStack Query | Winner |
|---------|-----------------|----------------------|--------|
| **Type sharing** | Codegen | Direct import | ✅ tRPC |
| **Monorepo design** | Not specific | Built for monorepos | ✅ tRPC |
| **Cross-package types** | Separate packages | Workspace imports | ✅ tRPC |
| **Setup overhead** | High | Low | ✅ tRPC |

---

## Trade-off Analysis

### What You GAIN with tRPC

1. **✅ End-to-End Type Safety**
   - Zero `as any` assertions
   - Compile-time error detection
   - Automatic type propagation
   - No codegen maintenance

2. **✅ Simplified Architecture**
   - Remove GraphQL schema layer
   - Remove codegen pipeline
   - Remove resolver wrappers
   - Remove parent type adapters
   - Fewer type boundaries

3. **✅ Better Developer Experience**
   - Instant refactoring feedback
   - Reduced boilerplate
   - Faster iteration
   - Better IDE support
   - No schema synchronization

4. **✅ Reduced Complexity**
   - Fewer layers to debug
   - Direct function calls
   - Less configuration
   - Simpler testing

5. **✅ Performance**
   - Faster builds (no codegen)
   - Simpler runtime
   - Less transformation overhead

### What You LOSE with tRPC

1. **❌ Query Flexibility**
   - **GraphQL:** Clients compose custom queries
   - **tRPC:** Fixed endpoints, fetch all or nothing
   - **Impact:** More data over-fetching potential

2. **❌ Normalized Caching**
   - **GraphQL + Relay:** Automatic normalized cache, smart updates
   - **tRPC + TanStack:** Query-based cache, manual invalidation
   - **Impact:** More cache management code needed

3. **❌ Public API Capability**
   - **GraphQL:** Language-agnostic, introspectable, self-documenting
   - **tRPC:** TypeScript-only, requires shared types
   - **Impact:** Cannot expose to non-TypeScript clients

4. **❌ Ecosystem & Tooling**
   - **GraphQL:** Mature ecosystem (Apollo Studio, GraphiQL, etc.)
   - **tRPC:** Smaller ecosystem, fewer third-party tools
   - **Impact:** Fewer debugging/monitoring tools

5. **❌ Separation of Concerns**
   - **GraphQL:** Clear contract between frontend/backend
   - **tRPC:** Tight coupling via shared types
   - **Impact:** Harder to work on frontend/backend independently

---

## Migration Complexity Assessment

### High-Impact Changes

1. **Backend: Apollo Server → tRPC Server**
   - Effort: **HIGH**
   - Lines Changed: ~2,000+ (entire graphql-server package)
   - Risk: **MEDIUM** (business logic unchanged)

2. **Frontend: Relay → TanStack Query**
   - Effort: **VERY HIGH**
   - Lines Changed: ~1,500+ (all data fetching)
   - Risk: **HIGH** (user-facing changes)

3. **Caching Strategy Rewrite**
   - Effort: **HIGH**
   - Complexity: Relay's normalized cache → TanStack Query cache
   - Risk: **HIGH** (performance impact)

### Low-Impact (Unchanged)

✅ **Business Logic Layer:** Use cases remain identical
✅ **Data Access Layer:** DAL services unchanged
✅ **Database:** No schema changes
✅ **Infrastructure:** AWS resources unchanged
✅ **Authentication:** JWT logic unchanged

### Overall Complexity

| Factor | Assessment |
|--------|------------|
| **Development Time** | 3-4 weeks (1 senior engineer) |
| **Testing Time** | 2-3 weeks |
| **Total Timeline** | 6-7 weeks |
| **Risk Level** | HIGH |
| **Rollback Difficulty** | VERY HIGH (breaking changes) |

---

## Alternative: Fix GraphQL TypeScript Issues

### Option A: Fix Existing Issues WITHOUT Migration

Instead of migrating to tRPC, you could:

1. **Enable Strict TypeScript** (1 day)
   ```json
   // packages/graphql-server/tsconfig.json
   {
     "strict": true,
     "noImplicitAny": true,
     "strictNullChecks": true
   }
   ```

2. **Fix Type Assertions** (3-5 days)
   - Create proper adapter functions
   - Fix codegen mapper configuration
   - Align DAL types with GraphQL types
   - Remove all `as any` and `@ts-ignore`

3. **Improve Codegen Setup** (2 days)
   - Better mapper configuration
   - Automated type testing
   - Pre-commit type checks

**Total Effort:** 1-2 weeks
**Risk:** LOW
**Benefit:** Full type safety with current architecture
**Downside:** Codegen overhead remains

### Recommendation: Fix First, Then Decide

**Suggested Approach:**
1. ✅ Fix TypeScript strict mode (enable it)
2. ✅ Eliminate all type assertions
3. ✅ Improve codegen configuration
4. ⏸️ Re-evaluate tRPC migration after fixes

**Rationale:**
- Most pain points stem from relaxed TypeScript config, not GraphQL itself
- Migration is high-risk and time-consuming
- Fixing current issues is faster and lower-risk
- GraphQL's query flexibility is valuable for this social media app
- After fixes, you can make an informed decision about migration

---

## If You Decide to Migrate: Comprehensive Plan

### Phase 1: Foundation (Week 1)

#### 1.1 Setup tRPC Server Infrastructure

**Files to Create:**
```
packages/trpc-server/
├── src/
│   ├── server.ts           # tRPC server setup
│   ├── context.ts          # Request context (userId, container)
│   ├── middleware/
│   │   ├── auth.ts         # Authentication middleware
│   │   ├── logging.ts      # Request logging
│   │   └── error.ts        # Error formatting
│   ├── routers/
│   │   ├── index.ts        # Root router
│   │   ├── auth.ts         # Auth procedures
│   │   ├── post.ts         # Post procedures
│   │   ├── profile.ts      # Profile procedures
│   │   ├── comment.ts      # Comment procedures
│   │   ├── like.ts         # Like procedures
│   │   ├── follow.ts       # Follow procedures
│   │   ├── notification.ts # Notification procedures
│   │   ├── feed.ts         # Feed procedures
│   │   └── auction.ts      # Auction procedures
│   └── types/
│       └── index.ts        # Shared type exports
├── package.json
├── tsconfig.json           # STRICT MODE ENABLED
└── vitest.config.ts
```

**Example: Context Creation**
```typescript
// packages/trpc-server/src/context.ts
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyAccessToken } from '@social-media-app/auth-utils';
import { createContainer } from './di/container.js';
import type { GraphQLContainer } from './di/container.js';

export interface Context {
  userId?: string;
  container: GraphQLContainer;
}

export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> => {
  // Extract and verify JWT
  const token = extractTokenFromHeader(req.headers.authorization);
  let userId: string | undefined;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.userId;
    } catch (error) {
      // Invalid token - proceed as unauthenticated
    }
  }

  // Create DI container (same as GraphQL context)
  const container = createContainer();

  return {
    userId,
    container,
  };
};
```

**Example: Auth Middleware**
```typescript
// packages/trpc-server/src/middleware/auth.ts
import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc.js';

export const isAuthenticated = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      userId: ctx.userId, // Type narrowing: string (not undefined)
    },
  });
});

// Usage in procedures
export const protectedProcedure = publicProcedure.use(isAuthenticated);
```

#### 1.2 Create Root Router

```typescript
// packages/trpc-server/src/routers/index.ts
import { router } from '../trpc.js';
import { authRouter } from './auth.js';
import { postRouter } from './post.js';
import { profileRouter } from './profile.js';
import { commentRouter } from './comment.js';
import { likeRouter } from './like.js';
import { followRouter } from './follow.js';
import { notificationRouter } from './notification.js';
import { feedRouter } from './feed.js';
import { auctionRouter } from './auction.js';

export const appRouter = router({
  auth: authRouter,
  post: postRouter,
  profile: profileRouter,
  comment: commentRouter,
  like: likeRouter,
  follow: followRouter,
  notification: notificationRouter,
  feed: feedRouter,
  auction: auctionRouter,
});

export type AppRouter = typeof appRouter;
```

#### 1.3 Example Router: Auth

```typescript
// packages/trpc-server/src/routers/auth.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { UserId } from '@social-media-app/shared';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        username: z.string().min(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.container
        .resolve('register')
        .execute(input);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error.message,
        });
      }

      return result.data; // ✅ Fully typed! No assertions needed
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.container
        .resolve('login')
        .execute(input);

      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error.message,
        });
      }

      return result.data;
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await ctx.container
        .resolve('logout')
        .execute({ userId: UserId(ctx.userId) });

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error.message,
        });
      }

      return result.data;
    }),

  refreshToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.container
        .resolve('refreshToken')
        .execute(input);

      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error.message,
        });
      }

      return result.data;
    }),
});
```

**Key Differences from GraphQL:**
- ✅ No resolver wrappers needed
- ✅ No type assertions (`as any`)
- ✅ Zod validation built-in
- ✅ Direct use case execution
- ✅ Full type inference

#### 1.4 Example Router: Posts with Pagination

```typescript
// packages/trpc-server/src/routers/post.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { UserId, PostId, Cursor } from '@social-media-app/shared';
import { TRPCError } from '@trpc/server';

export const postRouter = router({
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.container
        .resolve('getPostById')
        .execute({ postId: PostId(input.id) });

      if (!result.success) {
        return null; // Nullable query
      }

      return result.data;
    }),

  byUser: publicProcedure
    .input(
      z.object({
        handle: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Step 1: Get profile by handle
      const profileResult = await ctx.container
        .resolve('getProfileByHandle')
        .execute({ handle: Handle(input.handle) });

      if (!profileResult.success || !profileResult.data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Profile not found: ${input.handle}`,
        });
      }

      // Step 2: Get user posts
      const postsResult = await ctx.container
        .resolve('getUserPosts')
        .execute({
          userId: UserId(profileResult.data.id),
          pagination: {
            first: input.limit,
            after: input.cursor ? Cursor(input.cursor) : undefined,
          },
        });

      if (!postsResult.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: postsResult.error.message,
        });
      }

      return postsResult.data; // Connection<Post>
    }),

  create: protectedProcedure
    .input(
      z.object({
        fileType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
        caption: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.container
        .resolve('createPost')
        .execute({
          userId: UserId(ctx.userId),
          fileType: input.fileType,
          caption: input.caption,
        });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error.message,
        });
      }

      return result.data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        caption: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.container
        .resolve('updatePost')
        .execute({
          postId: PostId(input.postId),
          userId: UserId(ctx.userId),
          caption: input.caption,
        });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error.message,
        });
      }

      return result.data;
    }),

  delete: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.container
        .resolve('deletePost')
        .execute({
          postId: PostId(input.postId),
          userId: UserId(ctx.userId),
        });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error.message,
        });
      }

      return result.data;
    }),
});
```

#### 1.5 Server Setup (Express Adapter)

```typescript
// packages/trpc-server/src/server.ts
import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import { createContext } from './context.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// tRPC endpoint
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 tRPC server running on http://localhost:${PORT}/trpc`);
});
```

**Testing Strategy (TDD):**

```typescript
// packages/trpc-server/src/routers/__tests__/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appRouter } from '../index.js';
import type { Context } from '../../context.js';
import { createTestContainer } from '../../di/testContainer.js';

describe('auth router', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = {
      userId: undefined,
      container: createTestContainer(), // Dependency injection for testing
    };
  });

  describe('register', () => {
    it('should register new user with valid input', async () => {
      // RED: Write failing test first
      const caller = appRouter.createCaller(mockContext);

      const result = await caller.auth.register({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      });

      // GREEN: Implement to make it pass
      expect(result).toMatchObject({
        user: expect.objectContaining({
          email: 'test@example.com',
          username: 'testuser',
        }),
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('should throw error for duplicate email', async () => {
      const caller = appRouter.createCaller(mockContext);

      // First registration succeeds
      await caller.auth.register({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      });

      // Second registration fails
      await expect(
        caller.auth.register({
          email: 'test@example.com',
          password: 'password456',
          username: 'testuser2',
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    it('should login existing user with correct credentials', async () => {
      const caller = appRouter.createCaller(mockContext);

      // Setup: Register user
      await caller.auth.register({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      });

      // Test: Login
      const result = await caller.auth.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toMatchObject({
        user: expect.objectContaining({
          email: 'test@example.com',
        }),
        accessToken: expect.any(String),
      });
    });
  });
});
```

---

### Phase 2: Frontend tRPC Client Setup (Week 2)

#### 2.1 Install Dependencies

```bash
pnpm add @trpc/client @trpc/react-query @tanstack/react-query
```

#### 2.2 Create tRPC Client

```typescript
// packages/frontend/src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@social-media-app/trpc-server';

export const trpc = createTRPCReact<AppRouter>();
```

#### 2.3 Setup TanStack Query Provider

```typescript
// packages/frontend/src/utils/trpcClient.ts
import { httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import { trpc } from './trpc.js';
import { getAccessToken } from '../stores/authStore.js';

// Create QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

// Create tRPC client
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_URL || 'http://localhost:4000/trpc',
      headers: () => {
        const token = getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

#### 2.4 Setup React Providers

```typescript
// packages/frontend/src/App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { trpc, trpcClient, queryClient } from './utils/trpc.js';

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

#### 2.5 Example: Replace Relay with tRPC

**Before (Relay):**

```typescript
// packages/frontend/src/components/PostList.tsx (OLD)
import { useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import { graphql } from 'relay-runtime';

const PostListQuery = graphql`
  query PostListQuery($handle: String!, $first: Int!, $after: String) {
    userPosts(handle: $handle, first: $first, after: $after) {
      edges {
        node {
          id
          imageUrl
          caption
          createdAt
          author {
            handle
            profilePictureUrl
          }
          isLiked
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function PostList({ handle }: { handle: string }) {
  const data = useLazyLoadQuery(PostListQuery, {
    handle,
    first: 20,
  });

  const { data: posts, loadNext, hasNext } = usePaginationFragment(
    graphql`
      fragment PostListFragment on Query
      @refetchable(queryName: "PostListPaginationQuery") {
        userPosts(handle: $handle, first: $first, after: $after)
          @connection(key: "PostList_userPosts") {
          edges {
            node {
              ...PostCard_post
            }
          }
        }
      }
    `,
    data
  );

  return (
    <div>
      {posts.userPosts.edges.map(({ node }) => (
        <PostCard key={node.id} post={node} />
      ))}
      {hasNext && <button onClick={() => loadNext(20)}>Load More</button>}
    </div>
  );
}
```

**After (tRPC + TanStack Query):**

```typescript
// packages/frontend/src/components/PostList.tsx (NEW)
import { trpc } from '../utils/trpc.js';

function PostList({ handle }: { handle: string }) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.post.byUser.useInfiniteQuery(
    {
      handle,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.pageInfo.endCursor,
      enabled: !!handle,
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const posts = data?.pages.flatMap((page) => page.edges.map((e) => e.node)) ?? [];

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

**Benefits:**
- ✅ Fully typed (no manual type imports)
- ✅ No GraphQL fragments
- ✅ No codegen step
- ✅ Simpler API

**Trade-offs:**
- ❌ Manual cache invalidation (vs Relay's automatic)
- ❌ Fetch full post objects (vs Relay's field selection)

#### 2.6 Example: Mutations with Cache Invalidation

```typescript
// packages/frontend/src/components/CreatePostForm.tsx
import { trpc } from '../utils/trpc.js';
import { useForm } from 'react-hook-form';

function CreatePostForm() {
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch user posts
      utils.post.byUser.invalidate();
      utils.feed.following.invalidate();
    },
    onError: (error) => {
      console.error('Failed to create post:', error);
    },
  });

  const { register, handleSubmit } = useForm<{
    fileType: 'image/jpeg' | 'image/png';
    caption?: string;
  }>();

  const onSubmit = (data: any) => {
    createPost.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('fileType')}>
        <option value="image/jpeg">JPEG</option>
        <option value="image/png">PNG</option>
      </select>
      <textarea {...register('caption')} />
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

**Cache Management:**

```typescript
// Optimistic update example
const likePost = trpc.like.toggle.useMutation({
  onMutate: async ({ postId }) => {
    // Cancel outgoing refetches
    await utils.post.byId.cancel({ id: postId });

    // Snapshot previous value
    const previousPost = utils.post.byId.getData({ id: postId });

    // Optimistically update
    utils.post.byId.setData({ id: postId }, (old) =>
      old ? { ...old, isLiked: !old.isLiked, likesCount: old.likesCount + 1 } : old
    );

    return { previousPost };
  },
  onError: (_err, { postId }, context) => {
    // Rollback on error
    utils.post.byId.setData({ id: postId }, context?.previousPost);
  },
  onSettled: (_data, _error, { postId }) => {
    // Refetch to ensure consistency
    utils.post.byId.invalidate({ id: postId });
  },
});
```

---

### Phase 3: Complete Router Migration (Week 3-4)

Migrate all remaining routers following the same pattern:

1. **Profile Router** (`profile.ts`)
   - `byHandle` (query)
   - `me` (query, protected)
   - `update` (mutation, protected)
   - `getPictureUploadUrl` (mutation, protected)

2. **Comment Router** (`comment.ts`)
   - `byPost` (query, protected)
   - `create` (mutation, protected)
   - `delete` (mutation, protected)

3. **Like Router** (`like.ts`)
   - `status` (query, protected)
   - `toggle` (mutation, protected)

4. **Follow Router** (`follow.ts`)
   - `status` (query, protected)
   - `follow` (mutation, protected)
   - `unfollow` (mutation, protected)

5. **Notification Router** (`notification.ts`)
   - `list` (query, protected, paginated)
   - `unreadCount` (query, protected)
   - `markAsRead` (mutation, protected)
   - `markAllAsRead` (mutation, protected)
   - `delete` (mutation, protected)

6. **Feed Router** (`feed.ts`)
   - `following` (query, protected, paginated)
   - `explore` (query, public, paginated)
   - `markAsRead` (mutation, protected)

7. **Auction Router** (`auction.ts`)
   - `byId` (query, public)
   - `list` (query, public, paginated, filtered)
   - `bids` (query, public, paginated)
   - `create` (mutation, protected)
   - `activate` (mutation, protected)
   - `placeBid` (mutation, protected)

**Testing Each Router:**
- Unit tests for procedures
- Integration tests with real DAL (using test database)
- E2E tests from frontend

---

### Phase 4: Frontend Migration (Week 5-6)

#### Replace All Relay Hooks

| Component | Relay Hook | tRPC Hook |
|-----------|------------|-----------|
| `ProfilePage` | `useLazyLoadQuery` | `trpc.profile.byHandle.useQuery` |
| `PostDetail` | `useLazyLoadQuery` | `trpc.post.byId.useQuery` |
| `FeedPage` | `usePaginationFragment` | `trpc.feed.following.useInfiniteQuery` |
| `NotificationList` | `usePaginationFragment` | `trpc.notification.list.useInfiniteQuery` |
| `CreatePost` | `useMutation` | `trpc.post.create.useMutation` |
| `LikeButton` | `useMutation` | `trpc.like.toggle.useMutation` |

#### Remove Relay Infrastructure

1. Delete `RelayEnvironment.ts`
2. Delete `relay.config.json`
3. Remove `babel-plugin-relay`
4. Remove all `__generated__` directories
5. Remove `graphql-request` dependency
6. Remove MSW GraphQL handlers

#### Update Cache Management

Create cache utility functions:

```typescript
// packages/frontend/src/utils/cacheHelpers.ts
import { trpc } from './trpc.js';

export function invalidateUserData() {
  const utils = trpc.useUtils();
  utils.profile.me.invalidate();
  utils.post.byUser.invalidate();
  utils.notification.list.invalidate();
}

export function invalidateFeed() {
  const utils = trpc.useUtils();
  utils.feed.following.invalidate();
  utils.feed.explore.invalidate();
}

export function invalidatePost(postId: string) {
  const utils = trpc.useUtils();
  utils.post.byId.invalidate({ id: postId });
  utils.comment.byPost.invalidate({ postId });
}
```

---

### Phase 5: Testing & Quality Assurance (Week 6-7)

#### 5.1 Unit Tests (Vitest)

**Backend:**
```typescript
// Test each router's procedures
// Use dependency injection for testability
// No mocks - use in-memory test containers
```

**Frontend:**
```typescript
// Test components with tRPC hooks
// Use msw to mock tRPC endpoints
// Test loading states, error states, success states
```

#### 5.2 Integration Tests

```typescript
// packages/integration-tests/src/trpc/post.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createCaller } from '@social-media-app/trpc-server';
import { setupTestDatabase, teardownTestDatabase } from './helpers.js';

describe('Post Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it('should create, update, and delete post', async () => {
    // RED-GREEN-REFACTOR cycle
    const caller = createCaller(testContext);

    // Create
    const created = await caller.post.create({
      fileType: 'image/jpeg',
      caption: 'Test post',
    });
    expect(created.caption).toBe('Test post');

    // Update
    const updated = await caller.post.update({
      postId: created.id,
      caption: 'Updated caption',
    });
    expect(updated.caption).toBe('Updated caption');

    // Delete
    await caller.post.delete({ postId: created.id });
    const deleted = await caller.post.byId({ id: created.id });
    expect(deleted).toBeNull();
  });
});
```

#### 5.3 E2E Tests (Playwright)

```typescript
// Test complete user flows
// Login → Create Post → Like → Comment → Logout
```

---

### Phase 6: Deployment & Rollback Plan (Week 7)

#### 6.1 Deployment Strategy

**Option 1: Big Bang (Recommended for Internal App)**
- Deploy both tRPC server and frontend simultaneously
- Downtime: ~5 minutes
- Risk: Medium (good test coverage)

**Option 2: Blue-Green Deployment**
- Run tRPC server alongside GraphQL server
- Switch frontend traffic gradually
- Downtime: Zero
- Complexity: High

**Option 3: Feature Flag**
- Use LaunchDarkly or similar
- Toggle between Relay and tRPC per user
- Gradual rollout
- Complexity: Very High

#### 6.2 Rollback Plan

**If Migration Fails:**

1. Revert frontend deployment (Relay version)
2. Keep GraphQL server running
3. Shut down tRPC server
4. Monitor error rates

**Rollback Time:** ~10 minutes

**Data Consistency:** No impact (DAL unchanged)

---

### Advanced TypeScript Patterns for tRPC

#### 1. Generic Router Factory

```typescript
// Create reusable CRUD patterns
export function createCrudRouter<
  TEntity,
  TCreateInput extends z.ZodType,
  TUpdateInput extends z.ZodType,
  TIdSchema extends z.ZodType
>({
  entityName,
  createSchema,
  updateSchema,
  idSchema,
  repository,
}: {
  entityName: string;
  createSchema: TCreateInput;
  updateSchema: TUpdateInput;
  idSchema: TIdSchema;
  repository: {
    findById: (id: string) => AsyncResult<TEntity>;
    create: (data: z.infer<TCreateInput>) => AsyncResult<TEntity>;
    update: (id: string, data: z.infer<TUpdateInput>) => AsyncResult<TEntity>;
    delete: (id: string) => AsyncResult<void>;
  };
}) {
  return router({
    byId: publicProcedure
      .input(z.object({ id: idSchema }))
      .query(async ({ input }) => {
        const result = await repository.findById(input.id);
        return result.success ? result.data : null;
      }),

    create: protectedProcedure
      .input(createSchema)
      .mutation(async ({ input }) => {
        const result = await repository.create(input);
        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error.message,
          });
        }
        return result.data;
      }),

    update: protectedProcedure
      .input(z.object({ id: idSchema, data: updateSchema }))
      .mutation(async ({ input }) => {
        const result = await repository.update(input.id, input.data);
        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error.message,
          });
        }
        return result.data;
      }),

    delete: protectedProcedure
      .input(z.object({ id: idSchema }))
      .mutation(async ({ input }) => {
        const result = await repository.delete(input.id);
        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error.message,
          });
        }
        return result.data;
      }),
  });
}

// Usage:
const postRouter = createCrudRouter({
  entityName: 'Post',
  createSchema: z.object({
    fileType: z.enum(['image/jpeg', 'image/png']),
    caption: z.string().optional(),
  }),
  updateSchema: z.object({
    caption: z.string().optional(),
  }),
  idSchema: z.string(),
  repository: postRepository,
});
```

#### 2. Conditional Types for Pagination

```typescript
// Generic pagination type that adapts to entity type
export type PaginatedResult<T> = {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

// Conditional type for different pagination strategies
export type PaginationInput<TStrategy extends 'cursor' | 'offset'> =
  TStrategy extends 'cursor'
    ? { first: number; after?: string }
    : { limit: number; offset?: number };

// Usage:
export function createPaginatedQuery<T, TStrategy extends 'cursor' | 'offset'>(
  strategy: TStrategy
) {
  return publicProcedure
    .input(
      strategy === 'cursor'
        ? z.object({ first: z.number(), after: z.string().optional() })
        : z.object({ limit: z.number(), offset: z.number().optional() })
    )
    .query(async ({ input }) => {
      // Type-safe pagination logic
    });
}
```

#### 3. Mapped Types for Result Unwrapping

```typescript
// Automatically unwrap Result types from use cases
export type UnwrapResult<T> = T extends AsyncResult<infer U> ? U : never;

// Helper to create procedure from use case
export function fromUseCase<
  TInput,
  TUseCase extends { execute: (input: TInput) => AsyncResult<any> }
>(
  useCase: TUseCase,
  errorCode: TRPCErrorCode = 'BAD_REQUEST'
): (input: TInput) => Promise<UnwrapResult<ReturnType<TUseCase['execute']>>> {
  return async (input: TInput) => {
    const result = await useCase.execute(input);
    if (!result.success) {
      throw new TRPCError({
        code: errorCode,
        message: result.error.message,
      });
    }
    return result.data;
  };
}

// Usage:
export const postRouter = router({
  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(({ input, ctx }) =>
      fromUseCase(ctx.container.resolve('createPost'))(input)
    ),
});
```

#### 4. Template Literal Types for Entity IDs

```typescript
// Type-safe entity ID branding with template literals
export type EntityId<TEntity extends string> = `${TEntity}Id`;

// Mapped type to extract ID types
export type IdMap = {
  Post: PostId;
  User: UserId;
  Comment: CommentId;
  Auction: AuctionId;
};

// Conditional type for ID validation
export type ValidateId<TEntity extends keyof IdMap> = IdMap[TEntity];

// Usage in procedures:
export const getEntityById = <TEntity extends keyof IdMap>(
  entity: TEntity
) =>
  publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }): Promise<ValidateId<TEntity> | null> => {
      // Fully type-safe entity retrieval
    });
```

---

## Final Recommendation

### 🎯 Recommended Path: Fix GraphQL Issues First

**Reasoning:**

1. **Lower Risk:** Fixing TypeScript issues is low-risk vs full migration
2. **Faster ROI:** 1-2 weeks vs 6-7 weeks
3. **Proven Architecture:** Your use case layer is excellent
4. **GraphQL Benefits:** Query flexibility valuable for social media app
5. **Type Safety Achievable:** Can eliminate all `as any` with proper setup

### ✅ Action Plan

**Week 1: Fix TypeScript**
1. Enable strict mode in graphql-server
2. Fix all type assertions
3. Improve codegen mappers
4. Add pre-commit type checks

**Week 2: Evaluate**
1. Measure developer experience improvement
2. Assess remaining pain points
3. Decide: Stay with GraphQL or migrate to tRPC

**If Migrating: Week 3-9**
Follow the 7-week plan above

---

## Conclusion

Both approaches are valid:

- **Fix GraphQL:** Low-risk, fast, preserves flexibility
- **Migrate to tRPC:** High-risk, slow, better type safety, simpler architecture

**My recommendation:** Start with fixing your GraphQL TypeScript issues. You'll gain 80% of the benefits with 20% of the effort. If you're still unhappy after that, then consider the full tRPC migration with a clearer understanding of your actual needs.

The TypeScript issues you're experiencing are **configuration problems**, not fundamental GraphQL limitations. Once fixed, you'll have a robust, type-safe GraphQL API that serves your social media application well.
