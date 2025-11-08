# GraphQL Anti-Patterns & TypeScript Cleanup - Comprehensive Implementation Plan

**Date**: 2025-11-05  
**Current Status**: 150 TS errors, TypeMapper removed, 20 identified antipatterns  
**Goal**: Systematic cleanup addressing antipatterns while fixing TypeScript errors  
**Approach**: TDD, Advanced TypeScript patterns, Hexagonal Architecture principles

---

## Executive Summary

Rather than playing whack-a-mole with TypeScript errors, this plan systematically addresses the 20 identified GraphQL antipatterns while fixing the remaining ~150 TypeScript errors as part of the solution. Work is organized into logical phases that build upon each other.

**Total Estimated Time**: 2-3 weeks  
**Priority**: Critical → High → Medium (Low priority deferred)

---

## Phase 1: Critical Schema & Type Safety Foundation (Week 1, Days 1-2)

### 1.1 Fix Schema Duplication (Antipattern #1 - CRITICAL)

**Problem**: Two schema files (`schema.graphql` and `typeDefs.ts`) are drifting  
**Impact**: Already seeing drift (Profile missing `updatedAt` in typeDefs.ts)  
**TS Errors Fixed**: ~10-15 (schema type mismatches)

**Implementation**:
```bash
# Step 1: Choose single source of truth
# Decision: Keep schema.graphql, delete typeDefs.ts
# Rationale: schema.graphql is GraphQL-first, easier to maintain

# Step 2: Update schema loader
```

```typescript
// packages/graphql-server/src/schema/index.ts
import { readFileSync } from 'fs';
import { join } from 'path';

// Load schema from single source of truth
const typeDefs = readFileSync(
  join(__dirname, '../../schema.graphql'),
  'utf-8'
);

export { typeDefs };
```

**Validation**:
- ✅ CodeGen uses same schema as runtime
- ✅ No schema drift possible
- ✅ Single file to update
- ✅ TypeScript errors from mismatched types resolved

---

### 1.2 Remove @ts-ignore Comments - Create Type Adapters (Antipattern #4 - CRITICAL)

**Problem**: Multiple `@ts-ignore` suppress type mismatches between DAL and GraphQL  
**Impact**: No type safety, runtime errors possible  
**TS Errors Fixed**: ~20-30 (all @ts-ignore locations)

**Current Issues**:
```typescript
// Mutation.ts:563
// @ts-ignore - DAL Notification type differs from GraphQL Notification type
markNotificationAsRead: async (_parent, args, context) => { /* ... */ }

// Mutation.ts:711
// @ts-ignore - DAL Auction type differs from GraphQL Auction type
createAuction: async (_parent, args, context) => { /* ... */ }
```

**Solution - Type-Safe Adapters**:

```typescript
// src/infrastructure/adapters/types/NotificationTypeAdapter.ts
import type { Notification as DalNotification } from '@social-media-app/dal';
import type { Notification as GraphQLNotification } from '../../../schema/generated/types';

/**
 * Type-safe adapter for Notification types
 * Maps DAL Notification → GraphQL Notification
 */
export function adaptNotificationToGraphQL(
  dal: DalNotification
): GraphQLNotification {
  return {
    id: dal.id,
    userId: dal.userId,
    type: dal.type,
    title: dal.title,
    message: dal.message,
    status: dal.status,
    actor: dal.actor ?? null,
    target: dal.target ?? null,
    createdAt: dal.createdAt,
    readAt: dal.readAt ?? null,
  };
}
```

```typescript
// src/infrastructure/adapters/types/AuctionTypeAdapter.ts
import type { Auction as DalAuction } from '@social-media-app/auction-dal';
import type { Auction as GraphQLAuction } from '../../../schema/generated/types';

/**
 * Type-safe adapter for Auction types
 * Maps DAL Auction → GraphQL Auction
 */
export function adaptAuctionToGraphQL(
  dal: DalAuction
): GraphQLAuction {
  return {
    id: dal.id,
    sellerId: dal.sellerId,
    postId: dal.postId,
    startingPrice: dal.startingPrice,
    reservePrice: dal.reservePrice ?? null,
    currentPrice: dal.currentPrice,
    status: dal.status,
    startTime: dal.startTime,
    endTime: dal.endTime,
    winnerId: dal.winnerId ?? null,
    createdAt: dal.createdAt,
  };
}
```

**Update Mutation.ts**:
```typescript
// Before:
// @ts-ignore
markNotificationAsRead: async (_parent, args, context) => {
  const notification = await service.markAsRead(...);
  return notification; // Type mismatch!
}

// After:
markNotificationAsRead: async (_parent, args, context) => {
  const dalNotification = await service.markAsRead(...);
  return adaptNotificationToGraphQL(dalNotification); // ✅ Type-safe!
}
```

**Test Strategy** (TDD):
```typescript
// __tests__/NotificationTypeAdapter.test.ts
describe('adaptNotificationToGraphQL', () => {
  it('transforms all fields correctly', () => {
    const dalNotif = createMockDalNotification();
    const graphqlNotif = adaptNotificationToGraphQL(dalNotif);
    
    expect(graphqlNotif).toMatchObject({
      id: dalNotif.id,
      userId: dalNotif.userId,
      // ... verify all mappings
    });
  });
  
  it('handles optional fields correctly', () => {
    const dalNotif = { ...createMockDalNotification(), readAt: undefined };
    const graphqlNotif = adaptNotificationToGraphQL(dalNotif);
    
    expect(graphqlNotif.readAt).toBeNull(); // GraphQL expects null, not undefined
  });
});
```

**TS Errors Fixed**: All @ts-ignore comments removed (~20-30 errors)

---

### 1.3 Fix Logout Mutation (Antipattern #3 - CRITICAL)

**Problem**: Logout doesn't accept refresh token, can't invalidate tokens  
**Impact**: Security vulnerability  
**TS Errors Fixed**: 0 (but critical security fix)

**Schema Change**:
```graphql
# Before:
logout: LogoutResponse!

# After:
logout(refreshToken: String!): LogoutResponse!
```

**Implementation**:
```typescript
// Mutation.ts
logout: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // ✅ Now we have the refresh token!
  await context.services.authService.logout(
    args.refreshToken,
    context.userId
  );

  return { success: true };
}
```

**Frontend Update** (coordinate with frontend team):
```typescript
// Store refresh token in httpOnly cookie or secure storage
// Send it with logout mutation
```

---

### 1.4 Implement or Remove Post.comments Field (Antipattern #2 - CRITICAL)

**Problem**: Schema defines `Post.comments` but no resolver exists  
**Impact**: Runtime errors if field is queried  
**TS Errors Fixed**: 1-2

**Option A: Implement Field Resolver** (RECOMMENDED):
```typescript
// src/schema/resolvers/Post.ts
export const Post: PostResolvers = {
  author: async (parent, _args, context) => { /* existing */ },
  isLiked: async (parent, _args, context) => { /* existing */ },
  
  // ✅ NEW: Implement comments field resolver
  comments: async (parent, args, context) => {
    const commentAdapter = new CommentAdapter(context.services.commentService);
    
    return await commentAdapter.getCommentsByPostId({
      postId: parent.id,
      first: args.first ?? 20,
      after: args.after,
    });
  },
};
```

**With DataLoader** (prevent N+1):
```typescript
// src/dataloaders/CommentDataLoader.ts
export function createCommentsByPostLoader(commentService: CommentService) {
  return new DataLoader<string, CommentConnection>(
    async (postIds) => {
      // Batch fetch comments for multiple posts
      const results = await Promise.all(
        postIds.map(postId => 
          commentService.getCommentsByPost(postId, 20)
        )
      );
      
      return results;
    }
  );
}
```

**Option B: Remove from Schema** (if not used):
```graphql
type Post {
  # Remove this line:
  # comments(first: Int, after: String): CommentConnection!
}
```

**Decision**: Implement with DataLoader (better UX)

---

## Phase 2: High-Priority Type Safety & Consistency (Week 1, Days 3-5)

### 2.1 Add Custom Scalars (Antipattern #7 - HIGH)

**Problem**: Using String for dates, Float for currency  
**Impact**: No type safety, Float precision issues  
**TS Errors Fixed**: ~15-20 (date/currency type assertions)

**Implementation**:

```graphql
# schema.graphql - Add scalars
scalar DateTime
scalar Decimal

# Update types
type Post {
  createdAt: DateTime!  # Was: String!
  updatedAt: DateTime!  # Was: String!
}

type Auction {
  startTime: DateTime!     # Was: String!
  endTime: DateTime!       # Was: String!
  startPrice: Decimal!     # Was: Float!
  reservePrice: Decimal    # Was: Float
  currentPrice: Decimal!   # Was: Float!
}

type Bid {
  amount: Decimal!  # Was: Float!
  createdAt: DateTime!  # Was: String!
}
```

**Scalar Resolvers**:
```typescript
// src/schema/scalars/DateTime.ts
import { GraphQLScalarType, Kind } from 'graphql';

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 date-time string',
  
  // Server → Client: Date → String
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new TypeError('DateTime must be a Date or ISO string');
  },
  
  // Client → Server: String → Date
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new TypeError('Invalid DateTime format');
      }
      return date;
    }
    throw new TypeError('DateTime must be a string');
  },
  
  // Query literal → Date
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new TypeError('DateTime must be a string literal');
  },
});
```

```typescript
// src/schema/scalars/Decimal.ts
import { GraphQLScalarType, Kind } from 'graphql';
import Decimal from 'decimal.js'; // Use decimal.js for precision

export const DecimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  description: 'Arbitrary precision decimal',
  
  serialize(value: unknown): string {
    return new Decimal(value as any).toString();
  },
  
  parseValue(value: unknown): Decimal {
    return new Decimal(value as any);
  },
  
  parseLiteral(ast): Decimal {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return new Decimal(ast.value);
    }
    throw new TypeError('Decimal must be a number literal');
  },
});
```

**Register Scalars**:
```typescript
// src/schema/resolvers/index.ts
import { DateTimeScalar } from '../scalars/DateTime';
import { DecimalScalar } from '../scalars/Decimal';

export const resolvers = {
  DateTime: DateTimeScalar,
  Decimal: DecimalScalar,
  Query: { /* ... */ },
  Mutation: { /* ... */ },
  // ... other resolvers
};
```

**CodeGen Update**:
```typescript
// codegen.yml
config:
  scalars:
    DateTime: string  # In TypeScript, use ISO string
    Decimal: string   # In TypeScript, use string (for precision)
```

**Benefits**:
- ✅ Type-safe date handling
- ✅ No Float precision issues
- ✅ Client-side coercion
- ✅ Runtime validation

---

### 2.2 Standardize Pagination - Fix BidConnection (Antipattern #5 - HIGH)

**Problem**: BidConnection uses different structure than other connections  
**Impact**: Frontend must handle two patterns  
**TS Errors Fixed**: ~5-8

**Current (BROKEN)**:
```graphql
type BidConnection {
  bids: [Bid!]!   # ❌ Different from Relay
  total: Int!     # ❌ Different fields
}
```

**Fixed (Relay Standard)**:
```graphql
type BidConnection {
  edges: [BidEdge!]!
  pageInfo: PageInfo!
}

type BidEdge {
  cursor: String!
  node: Bid!
}
```

**Update Resolver**:
```typescript
// src/resolvers/auction/bidsResolver.ts
export const bidsResolver = async (
  parent: { id: string },
  args: { first?: number; after?: string },
  context: GraphQLContext
): Promise<BidConnection> => {
  const result = await getBidHistory.execute({
    auctionId: parent.id,
    limit: args.first ?? 20,
    cursor: args.after,
  });

  // ✅ Build standard Relay connection
  const codec = new CursorCodec();
  const edges: BidEdge[] = result.data.items.map(bid => ({
    node: bid,
    cursor: codec.encode({ id: bid.id, sortKey: bid.createdAt }),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: result.data.hasMore,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
};
```

---

### 2.3 Remove Mixed Pagination Parameters (Antipattern #6 - HIGH)

**Problem**: Feed queries accept BOTH legacy AND Relay parameters  
**Impact**: Confusion, ambiguity  
**TS Errors Fixed**: ~3-5

**Current (CONFUSING)**:
```graphql
feed(
  limit: Int,      # ❌ Legacy
  cursor: String,  # ❌ Legacy
  first: Int,      # ✅ Relay
  after: String    # ✅ Relay
): FeedConnection!
```

**Fixed (Clean)**:
```graphql
feed(
  first: Int,      # ✅ Relay only
  after: String    # ✅ Relay only
): FeedConnection!

exploreFeed(first: Int, after: String): PostConnection!
followingFeed(first: Int, after: String): PostConnection!
```

**Update Resolvers**:
```typescript
// Remove handling of limit/cursor parameters
// Only use first/after everywhere
```

**Migration Note**: Breaking change - coordinate with frontend

---

### 2.4 Add Zod Validation to All Mutations (Antipattern #8 - HIGH)

**Problem**: Only 2/17 mutations use validation  
**Impact**: Invalid data reaches services  
**TS Errors Fixed**: ~10-15 (type assertion issues)

**Pattern to Follow** (from existing createAuction):
```typescript
// schemas/CreatePostInput.schema.ts
export const CreatePostInputSchema = z.object({
  fileType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  caption: z.string().max(2200).optional(),
});

// Mutation.ts
createPost: async (_parent, args, context) => {
  // ✅ Validate input
  const validation = CreatePostInputSchema.safeParse(args.input);
  if (!validation.success) {
    throw new GraphQLError('Invalid input', {
      extensions: {
        code: 'BAD_USER_INPUT',
        validationErrors: validation.error.errors,
      },
    });
  }

  // ✅ Type-safe validated data
  const validatedInput = validation.data;
  
  const post = await context.services.postService.createPost(
    context.userId,
    userProfile.handle,
    validatedInput // No type assertions needed!
  );
  
  return post;
}
```

**Apply to All Mutations**:
- createPost ✅ (implement)
- updatePost ✅ (implement)
- createComment ✅ (implement)
- updateComment ✅ (implement)  
- updateProfile ✅ (implement)
- followUser ✅ (implement)
- unfollowUser ✅ (implement)
- likePost ✅ (implement)
- unlikePost ✅ (implement)
- ... all remaining mutations

---

### 2.5 Remove Redundant Success Fields (Antipattern #9 - HIGH)

**Problem**: Response types have `success: Boolean!` field  
**Impact**: Violates GraphQL best practices  
**TS Errors Fixed**: ~5

**Current (REDUNDANT)**:
```graphql
type LikeResponse {
  success: Boolean!     # ❌ Remove
  likesCount: Int!
  isLiked: Boolean!
}

type DeleteResponse {
  success: Boolean!     # ❌ Only field! Useless
}
```

**Fixed**:
```graphql
type LikeResponse {
  likesCount: Int!
  isLiked: Boolean!
}

type DeletePayload {
  deletedId: ID!  # Return what was deleted
}
```

**Update Resolvers**:
```typescript
// Before:
likePost: async () => {
  const result = await service.like(...);
  return {
    success: true,  // ❌ Remove
    likesCount: result.likesCount,
    isLiked: true,
  };
}

// After:
likePost: async () => {
  const result = await service.like(...);
  return {
    likesCount: result.likesCount,
    isLiked: true,
  };
}
```

**Error Handling**: Use GraphQL errors for failures (standard practice)

---

### 2.6 Add Type Enums (Antipattern #12 - HIGH)

**Problem**: NotificationTarget.type uses String instead of enum  
**Impact**: No type safety  
**TS Errors Fixed**: ~2-3

**Schema Update**:
```graphql
enum NotificationTargetType {
  POST
  COMMENT
  USER
  AUCTION
}

type NotificationTarget {
  type: NotificationTargetType!  # Was: String!
  id: ID!
  url: String
  preview: String
}
```

---

## Phase 3: Medium-Priority Improvements (Week 2, Days 1-3)

### 3.1 Use withAuth HOC for All Mutations (Antipattern #13 - MEDIUM)

**Problem**: Manual auth checks duplicated 13+ times  
**Impact**: Code duplication, easy to forget  
**TS Errors Fixed**: ~5

**Current (REPEATED)**:
```typescript
createPost: async (_parent, args, context) => {
  // ❌ Repeated 13+ times
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  // ... rest of logic
}
```

**Fixed (DRY)**:
```typescript
import { withAuth } from '../infrastructure/resolvers/withAuth';

export const Mutation: MutationResolvers = {
  createPost: withAuth(async (_parent, args, context) => {
    // ✅ No manual auth check needed!
    // context.userId is guaranteed to exist
    
    const post = await context.services.postService.createPost(
      context.userId, // TypeScript knows this is string, not string | undefined
      // ...
    );
  }),
  
  updatePost: withAuth(async (_parent, args, context) => {
    // ✅ Auth handled by HOC
  }),
  
  // Apply to all authenticated mutations
};
```

**TypeScript Improvement** - Update withAuth signature:
```typescript
// src/infrastructure/resolvers/withAuth.ts
export type AuthenticatedContext = GraphQLContext & {
  userId: string; // Not string | undefined!
};

export function withAuth<TArgs, TResult>(
  resolver: (
    parent: unknown,
    args: TArgs,
    context: AuthenticatedContext
  ) => Promise<TResult>
) {
  return async (
    parent: unknown,
    args: TArgs,
    context: GraphQLContext
  ): Promise<TResult> => {
    if (!context.userId) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    
    // ✅ Type-safe: userId is now guaranteed string
    return resolver(parent, args, context as AuthenticatedContext);
  };
}
```

---

### 3.2 Add userHandle to Context (Antipattern #14 - MEDIUM)

**Problem**: Multiple mutations fetch profile just for handle  
**Impact**: Unnecessary DB queries  
**TS Errors Fixed**: 0 (performance improvement)

**Update Context**:
```typescript
// src/context.ts
export interface GraphQLContext {
  userId?: string;
  userHandle?: string;  // ✅ Add this
  services: Services;
  loaders: DataLoaders;
}

// In createContext:
export async function createContext(req: Request): Promise<GraphQLContext> {
  const userId = extractUserIdFromToken(req);
  
  let userHandle: string | undefined;
  if (userId) {
    // Fetch once during context creation
    const profile = await profileService.getProfileById(userId);
    userHandle = profile?.handle;
  }
  
  return {
    userId,
    userHandle,  // ✅ Available in all resolvers
    services: createServices(),
    loaders: createDataLoaders(),
  };
}
```

**Update Mutations**:
```typescript
// Before:
createPost: withAuth(async (_parent, args, context) => {
  const userProfile = await context.services.profileService.getProfileById(
    context.userId
  ); // ❌ Unnecessary query!
  
  const post = await context.services.postService.createPost(
    context.userId,
    userProfile.handle, // Just needed this
    args.input
  );
});

// After:
createPost: withAuth(async (_parent, args, context) => {
  const post = await context.services.postService.createPost(
    context.userId,
    context.userHandle!, // ✅ Already in context
    args.input
  );
});
```

---

### 3.3 Standardize Error Handling (Antipattern #15 - MEDIUM)

**Problem**: Inconsistent error handling across mutations  
**Impact**: Unpredictable error responses  
**TS Errors Fixed**: ~5-10

**Create Error Handler Utility**:
```typescript
// src/infrastructure/errors/GraphQLErrorHandler.ts
export class GraphQLErrorHandler {
  static handle(error: unknown): never {
    if (error instanceof GraphQLError) {
      throw error; // Already a GraphQL error
    }
    
    if (error instanceof Error) {
      // Map known error types
      if (error.message.includes('not found')) {
        throw new GraphQLError(error.message, {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      
      if (error.message.includes('unauthorized')) {
        throw new GraphQLError(error.message, {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }
      
      // Default server error
      throw new GraphQLError('Internal server error', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          originalError: error.message,
        },
      });
    }
    
    // Unknown error type
    throw new GraphQLError('Unknown error occurred', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
```

**Apply Consistently**:
```typescript
// Pattern for all mutations:
createPost: withAuth(async (_parent, args, context) => {
  try {
    const validation = CreatePostInputSchema.safeParse(args.input);
    if (!validation.success) {
      throw new GraphQLError('Invalid input', {
        extensions: {
          code: 'BAD_USER_INPUT',
          validationErrors: validation.error.errors,
        },
      });
    }
    
    const post = await context.services.postService.createPost(
      context.userId,
      context.userHandle!,
      validation.data
    );
    
    return post;
  } catch (error) {
    GraphQLErrorHandler.handle(error); // ✅ Consistent handling
  }
}),
```

---

### 3.4 Abstract Cursor Encoding (Antipattern #16 - MEDIUM)

**Problem**: Cursor encoding exposes DynamoDB structure  
**Impact**: Couples API to database implementation  
**TS Errors Fixed**: 0 (architectural improvement)

**Current (COUPLED)**:
```typescript
getCursorKeys: (bid) => ({
  PK: `AUCTION#${args.auctionId}`,  // ❌ Exposes DynamoDB
  SK: `BID#${bid.createdAt}#${bid.id}`,
}),
```

**Fixed (ABSTRACT)**:
```typescript
getCursorKeys: (bid) => ({
  id: bid.id,
  sortKey: bid.createdAt,
  // ✅ CursorCodec handles encoding internally
})
```

**Update CursorCodec**:
```typescript
// src/infrastructure/pagination/CursorCodec.ts
export class CursorCodec {
  encode(data: { id: string; sortKey: string }): string {
    // Internal implementation can change without affecting API
    const payload = JSON