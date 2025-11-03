# GraphQL Server: Hexagonal Architecture Type Transformation (TDD)

## Problem Statement

The GraphQL server has type mismatches between:
1. **DAL Services**: Return domain types from `@social-media-app/shared`
2. **GraphQL Resolvers**: Expect GraphQL schema types (generated from `schema.graphql`)

This causes:
- Build errors (missing modules, type mismatches)
- Runtime errors (wrong object shapes)
- Coupling between infrastructure and domain layers

**Current Error:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 
'/Users/.../dist/infrastructure/resolvers/helpers/validateCursor' 
imported from /Users/.../dist/resolvers/comment/commentsResolver.js
```

## Solution: Hexagonal Architecture with Type Adapters

Implement proper layer separation:

```
┌─────────────────────────────────────────┐
│   Interface Layer (GraphQL Resolvers)   │
│   - Thin, delegates to use cases        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Application Layer (Use Cases)         │
│   - Business logic orchestration        │
│   - No infrastructure details           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Infrastructure Layer (Adapters)       │
│   - Transform DAL types → Domain types  │
│   - Transform Domain → GraphQL types    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Domain Layer (DAL Services)           │
│   - Pure domain logic                   │
│   - No knowledge of GraphQL/HTTP        │
└─────────────────────────────────────────┘
```

---

## Phase 1: Foundation - Type Transformation Infrastructure (TDD)

### 1.1: Create Type Mapping Utilities (RED)

**Test First:** `src/infrastructure/adapters/shared/__tests__/TypeMapper.test.ts`

```typescript
import { TypeMapper } from '../TypeMapper';
import { Comment as DomainComment } from '@social-media-app/shared';
import { Comment as GraphQLComment } from '../../../schema/generated/types';

describe('TypeMapper', () => {
  describe('toGraphQLComment', () => {
    it('transforms domain Comment to GraphQL Comment', () => {
      const domainComment: DomainComment = {
        id: 'comment-1',
        postId: 'post-1',
        userId: 'user-1',
        userHandle: 'testuser',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const result = TypeMapper.toGraphQLComment(domainComment);

      expect(result).toEqual({
        id: 'comment-1',
        postId: 'post-1',
        userId: 'user-1',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00Z',
        author: {
          id: 'user-1',
          handle: 'testuser',
        },
      });
    });

    it('handles missing optional fields', () => {
      const domainComment: DomainComment = {
        id: 'comment-1',
        postId: 'post-1',
        userId: 'user-1',
        userHandle: 'testuser',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const result = TypeMapper.toGraphQLComment(domainComment);

      expect(result.author).toBeDefined();
      expect(result.author.handle).toBe('testuser');
    });
  });

  describe('toGraphQLConnection', () => {
    it('transforms paginated domain results to GraphQL Connection', () => {
      const domainComments: DomainComment[] = [
        {
          id: 'comment-1',
          postId: 'post-1',
          userId: 'user-1',
          userHandle: 'user1',
          content: 'First',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'comment-2',
          postId: 'post-1',
          userId: 'user-2',
          userHandle: 'user2',
          content: 'Second',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      const result = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        {
          first: 2,
          hasNextPage: true,
        }
      );

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('comment-1');
      expect(result.edges[0].cursor).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('generates stable cursors for pagination', () => {
      const domainComments: DomainComment[] = [
        {
          id: 'comment-1',
          postId: 'post-1',
          userId: 'user-1',
          userHandle: 'user1',
          content: 'First',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result1 = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        { first: 1 }
      );
      const result2 = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        { first: 1 }
      );

      expect(result1.edges[0].cursor).toBe(result2.edges[0].cursor);
    });
  });
});
```

### 1.2: Implement TypeMapper (GREEN)

**File:** `src/infrastructure/adapters/shared/TypeMapper.ts`

```typescript
import { Comment as DomainComment } from '@social-media-app/shared';
import {
  Comment as GraphQLComment,
  CommentConnection,
  CommentEdge,
  PageInfo,
} from '../../../schema/generated/types';
import { CursorCodec } from '../../pagination/CursorCodec';

export class TypeMapper {
  /**
   * Transform domain Comment to GraphQL Comment
   */
  static toGraphQLComment(domain: DomainComment): GraphQLComment {
    return {
      id: domain.id,
      postId: domain.postId,
      userId: domain.userId,
      content: domain.content,
      createdAt: domain.createdAt,
      author: {
        id: domain.userId,
        handle: domain.userHandle,
        username: domain.userHandle, // Fallback if no username
      },
    };
  }

  /**
   * Transform array of domain items to GraphQL Connection
   * Generic function that works with any type
   */
  static toGraphQLConnection<TDomain, TGraphQL>(
    items: TDomain[],
    transformer: (item: TDomain) => TGraphQL,
    options: {
      first?: number;
      after?: string;
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
    }
  ): CommentConnection {
    const edges: CommentEdge[] = items.map((item, index) => {
      const node = transformer(item);
      const cursor = CursorCodec.encode({
        id: (node as any).id,
        timestamp: (node as any).createdAt,
      });

      return {
        node: node as GraphQLComment,
        cursor,
      };
    });

    const pageInfo: PageInfo = {
      hasNextPage: options.hasNextPage ?? false,
      hasPreviousPage: options.hasPreviousPage ?? false,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
      totalCount: items.length,
    };
  }
}
```

### 1.3: Refactor (REFACTOR)

- Extract cursor encoding to shared utility
- Add type safety for connection builder
- Document transformation patterns

---

## Phase 2: Comment Resolver Adapter Pattern (TDD)

### 2.1: Create CommentAdapter Tests (RED)

**Test First:** `src/infrastructure/adapters/__tests__/CommentAdapter.test.ts`

```typescript
import { CommentAdapter } from '../CommentAdapter';
import { commentService } from '@social-media-app/dal';
import { Comment as DomainComment } from '@social-media-app/shared';
import { createMockComment } from '@social-media-app/shared/test-utils';

jest.mock('@social-media-app/dal');

describe('CommentAdapter', () => {
  let adapter: CommentAdapter;
  const mockCommentService = commentService as jest.Mocked<typeof commentService>;

  beforeEach(() => {
    adapter = new CommentAdapter(mockCommentService);
    jest.clearAllMocks();
  });

  describe('getCommentsByPostId', () => {
    it('fetches comments and transforms to GraphQL types', async () => {
      const domainComments: DomainComment[] = [
        createMockComment({ id: 'comment-1', content: 'First' }),
        createMockComment({ id: 'comment-2', content: 'Second' }),
      ];

      mockCommentService.getCommentsByPostId.mockResolvedValue({
        status: 'success',
        data: {
          comments: domainComments,
          hasMore: false,
          nextCursor: null,
        },
      });

      const result = await adapter.getCommentsByPostId({
        postId: 'post-1',
        first: 10,
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.content).toBe('First');
      expect(result.edges[0].node.author).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('handles pagination correctly', async () => {
      const domainComments: DomainComment[] = [
        createMockComment({ id: 'comment-3' }),
      ];

      mockCommentService.getCommentsByPostId.mockResolvedValue({
        status: 'success',
        data: {
          comments: domainComments,
          hasMore: true,
          nextCursor: 'cursor-abc',
        },
      });

      const result = await adapter.getCommentsByPostId({
        postId: 'post-1',
        first: 1,
        after: 'cursor-prev',
      });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBeDefined();
      expect(mockCommentService.getCommentsByPostId).toHaveBeenCalledWith(
        'post-1',
        expect.objectContaining({ cursor: 'cursor-prev' })
      );
    });

    it('throws on service error', async () => {
      mockCommentService.getCommentsByPostId.mockResolvedValue({
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error',
        },
      });

      await expect(
        adapter.getCommentsByPostId({ postId: 'post-1', first: 10 })
      ).rejects.toThrow('Database error');
    });
  });
});
```

### 2.2: Implement CommentAdapter (GREEN)

**File:** `src/infrastructure/adapters/CommentAdapter.ts`

```typescript
import { commentService } from '@social-media-app/dal';
import type { CommentService } from '@social-media-app/dal';
import { CommentConnection } from '../../schema/generated/types';
import { TypeMapper } from './shared/TypeMapper';
import { GraphQLError } from 'graphql';

interface GetCommentsArgs {
  postId: string;
  first: number;
  after?: string;
}

export class CommentAdapter {
  constructor(private readonly commentService: CommentService) {}

  async getCommentsByPostId(args: GetCommentsArgs): Promise<CommentConnection> {
    const result = await this.commentService.getCommentsByPostId(
      args.postId,
      {
        limit: args.first,
        cursor: args.after,
      }
    );

    if (result.status === 'error') {
      throw new GraphQLError(result.error.message, {
        extensions: { code: result.error.code },
      });
    }

    return TypeMapper.toGraphQLConnection(
      result.data.comments,
      TypeMapper.toGraphQLComment,
      {
        first: args.first,
        after: args.after,
        hasNextPage: result.data.hasMore,
      }
    );
  }
}

// Export singleton instance
export const commentAdapter = new CommentAdapter(commentService);
```

### 2.3: Update commentsResolver to Use Adapter (GREEN)

**File:** `src/resolvers/comment/commentsResolver.ts`

```typescript
import { QueryResolvers } from '../../schema/generated/types';
import { commentAdapter } from '../../infrastructure/adapters/CommentAdapter';
import { requireAuth } from '../../infrastructure/auth/AuthGuard';

export const commentsResolver: QueryResolvers['comments'] = async (
  _parent,
  args,
  context
) => {
  // Require authentication
  requireAuth(context);

  // Validate args
  if (!args.postId) {
    throw new GraphQLError('postId is required');
  }

  const first = args.first ?? 20;
  if (first < 1 || first > 100) {
    throw new GraphQLError('first must be between 1 and 100');
  }

  // Delegate to adapter (handles all transformation)
  return commentAdapter.getCommentsByPostId({
    postId: args.postId,
    first,
    after: args.after,
  });
};
```

### 2.4: Integration Test (RED → GREEN)

**File:** `src/resolvers/comment/__tests__/commentsResolver.integration.test.ts`

```typescript
import { executeQuery } from '../../../__tests__/helpers/query-executor';
import { commentService } from '@social-media-app/dal';
import { createMockComment } from '@social-media-app/shared/test-utils';

jest.mock('@social-media-app/dal');

describe('commentsResolver Integration', () => {
  const COMMENTS_QUERY = `
    query GetComments($postId: ID!, $first: Int, $after: String) {
      comments(postId: $postId, first: $first, after: $after) {
        edges {
          node {
            id
            content
            author {
              handle
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns transformed comments from DAL service', async () => {
    const mockComments = [
      createMockComment({ id: 'c1', content: 'Hello' }),
      createMockComment({ id: 'c2', content: 'World' }),
    ];

    (commentService.getCommentsByPostId as jest.Mock).mockResolvedValue({
      status: 'success',
      data: {
        comments: mockComments,
        hasMore: false,
      },
    });

    const result = await executeQuery({
      query: COMMENTS_QUERY,
      variables: { postId: 'post-1', first: 10 },
      userId: 'user-1',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.comments.edges).toHaveLength(2);
    expect(result.data.comments.edges[0].node.content).toBe('Hello');
    expect(result.data.comments.edges[0].node.author.handle).toBeDefined();
  });
});
```

---

## Phase 3: Apply Pattern to All Resolvers (TDD)

### 3.1: Feed Resolvers

**Test → Implement → Refactor cycle for:**

1. **FeedAdapter** (`src/infrastructure/adapters/FeedAdapter.ts`)
   - `getExploreFeed()` → Transform `Post[]` to `PostConnection`
   - `getFollowingFeed()` → Transform `Post[]` to `PostConnection`

2. **Update Resolvers:**
   - `src/resolvers/feed/exploreFeedResolver.ts`
   - `src/resolvers/feed/followingFeedResolver.ts`

### 3.2: Post Resolvers

**Test → Implement → Refactor cycle for:**

1. **PostAdapter** (`src/infrastructure/adapters/PostAdapter.ts`)
   - `getPostById()` → Transform `Post` to GraphQL `Post`
   - `getUserPosts()` → Transform `Post[]` to `PostConnection`

2. **Update Resolvers:**
   - `src/resolvers/post/postResolver.ts`
   - `src/resolvers/post/userPostsResolver.ts`

### 3.3: Profile Resolvers

**Test → Implement → Refactor cycle for:**

1. **ProfileAdapter** (`src/infrastructure/adapters/ProfileAdapter.ts`)
   - `getCurrentUserProfile()` → Transform domain `Profile` to GraphQL `Profile`
   - `getProfileByHandle()` → Transform domain `Profile` to GraphQL `Profile`

2. **Update Resolvers:**
   - `src/resolvers/profile/meResolver.ts`
   - `src/resolvers/profile/profileResolver.ts`

### 3.4: Notification Resolvers

**Test → Implement → Refactor cycle for:**

1. **NotificationAdapter**
   - `getNotifications()` → Transform to `NotificationConnection`
   - `getUnreadCount()` → Transform to `Int`

2. **Update Resolvers:**
   - `src/resolvers/notification/notificationsResolver.ts`
   - `src/resolvers/notification/unreadNotificationsCountResolver.ts`

### 3.5: Auction Resolvers

**Test → Implement → Refactor cycle for:**

1. **AuctionAdapter**
   - `getAuctions()` → Transform to `AuctionConnection`
   - `getAuctionById()` → Transform to GraphQL `Auction`
   - `getBidHistory()` → Transform to `BidConnection`

2. **Update Resolvers:**
   - `src/resolvers/auction/auctionsResolver.ts`
   - `src/resolvers/auction/auctionResolver.ts`
   - `src/resolvers/auction/bidsResolver.ts`

---

## Phase 4: Fix ESM Module Resolution

### 4.1: Update Import Paths (RED)

**Test:** Ensure all imports have explicit `.js` extensions for ESM

```typescript
// ❌ Bad (CommonJS style)
import { validateCursor } from '../infrastructure/resolvers/helpers/validateCursor';

// ✅ Good (ESM style)
import { validateCursor } from '../infrastructure/resolvers/helpers/validateCursor.js';
```

### 4.2: Create ESLint Rule (GREEN)

**File:** `.eslintrc.js` (add rule)

```javascript
module.exports = {
  rules: {
    'import/extensions': [
      'error',
      'always',
      {
        ts: 'never',
        tsx: 'never',
        js: 'always',
        jsx: 'always',
      },
    ],
  },
};
```

### 4.3: Fix All Import Paths (GREEN)

Run automated fix:

```bash
cd packages/graphql-server
npx eslint --fix src/**/*.ts
```

---

## Phase 5: Rebuild and Verify

### 5.1: Run Test Suite

```bash
cd packages/graphql-server
pnpm test
```

**Expected:** All tests pass (adapters, resolvers, integration)

### 5.2: Build Package

```bash
cd packages/graphql-server
pnpm build
```

**Expected:** Clean build with no errors

### 5.3: Verify ESM Module Resolution

```bash
node dist/standalone-server.js
```

**Expected:** Server starts without module resolution errors

### 5.4: Integration Smoke Test

```bash
# Start servers
pnpm dev

# Query GraphQL endpoint
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query":"{ me { id handle } }"}'
```

**Expected:** Valid response with transformed data

---

## Success Criteria

✅ **Type Safety:**
- All resolvers use typed adapters
- No `any` types in transformation layer
- GraphQL schema types match resolver return types

✅ **Test Coverage:**
- Unit tests for all adapters (>90% coverage)
- Integration tests for all resolvers
- E2E tests for critical paths

✅ **Build Success:**
- `pnpm build` completes without errors
- ESM modules resolve correctly
- No circular dependencies

✅ **Runtime Verification:**
- GraphQL server starts successfully
- All queries return properly transformed data
- Pagination works correctly
- Error handling preserves error codes

✅ **Architecture:**
- Clean separation of concerns (Hexagonal)
- Adapters isolate infrastructure from domain
- Resolvers are thin delegation layers
- Easy to test each layer independently

---

## Benefits of This Approach

1. **Type Safety**: Compile-time guarantees that transformations are correct
2. **Testability**: Each layer can be tested in isolation
3. **Maintainability**: Clear responsibilities, easy to understand
4. **Flexibility**: Easy to swap out DAL implementation
5. **Performance**: Transformations happen in adapters, not resolvers
6. **Error Handling**: Centralized error transformation logic

---

## Rollback Plan

If issues arise during implementation:

1. **Keep old resolvers** alongside new ones initially
2. **Feature flag** to toggle between old and new implementations
3. **Monitor errors** in production with detailed logging
4. **Quick rollback** by reverting adapter imports

---

## Time Estimates

- **Phase 1**: 2 hours (type infrastructure)
- **Phase 2**: 3 hours (comment adapter + resolver)
- **Phase 3**: 6 hours (all other adapters)
- **Phase 4**: 1 hour (ESM fixes)
- **Phase 5**: 2 hours (verification)

**Total**: ~14 hours (2 days)

---

## Next Steps

1. Review this plan with team
2. Confirm test structure and patterns
3. Start with Phase 1 (foundation)
4. Implement Phase 2 as proof-of-concept
5. Parallel work on Phase 3 (multiple adapters)
6. Complete Phases 4-5 together