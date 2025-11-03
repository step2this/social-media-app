# DAL & GraphQL Architecture Alignment Plan

**Date**: 2025-11-03
**Status**: Strategic Analysis & Alignment Plan
**Goal**: Align DAL services with GraphQL hexagonal architecture using advanced TypeScript and TDD

---

## Executive Summary

This document provides a comprehensive analysis of the current DAL (Data Access Layer) services and GraphQL architecture, identifying mismatches and proposing a systematic alignment strategy using hexagonal architecture principles, dependency injection, and test-driven development.

**Key Findings:**
- ✅ 8 DAL services documented with complete API surfaces
- ❌ GraphQL adapters assume different API contracts than DAL provides
- ❌ Feed queries need special handling (materialized vs query-time patterns)
- ❌ Type transformations incomplete (missing PostConnection, etc.)
- ✅ CommentAdapter pattern works well as template

**Estimated Effort**: 15-20 hours over 2-3 days

---

## Part 1: DAL Services API Surface

### 1. AuthService

**Purpose**: User authentication, registration, token management
**Domain Entities**: `User`, `UserEntity`, `RefreshTokenEntity`

**Public API**:
```typescript
interface AuthService {
  register(request: RegisterRequest): Promise<RegisterResponse>
  login(request: LoginRequest): Promise<LoginResponse>
  refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse>
  getUserById(userId: string): Promise<User | null>
  logout(refreshToken: string, userId: string): Promise<void>
  updateUser(userId: string, updates: UpdateProfileWithHandleRequest): Promise<User>
}
```

**GraphQL Mapping**: Used by mutations, not query resolvers
**Status**: ✅ Correctly separated from GraphQL query layer

---

### 2. ProfileService

**Purpose**: Profile CRUD, handle uniqueness, profile pictures, post counts
**Domain Entities**: `Profile`, `PublicProfile`, `UserProfileEntity`

**Public API**:
```typescript
class ProfileService {
  async getProfileById(userId: string): Promise<Profile | null>
  async getProfilesByIds(userIds: string[]): Promise<Map<string, PublicProfile>>
  async getProfileByHandle(handle: string): Promise<PublicProfile | null>
  async isHandleAvailable(handle: string, excludeUserId?: string): Promise<boolean>
  async updateProfile(userId: string, updates: UpdateProfileWithHandleRequest): Promise<Profile>
  async updateProfilePicture(userId: string, profilePictureUrl: string, thumbnailUrl: string): Promise<Profile>
  async generatePresignedUrl(userId: string, request: GetPresignedUrlRequest): Promise<GetPresignedUrlResponse>
  async incrementPostsCount(userId: string): Promise<void>
  async decrementPostsCount(userId: string): Promise<void>
  async resetPostsCount(userId: string): Promise<void>
}
```

**GraphQL Resolvers**:
- `Query.me` → needs `getProfileById()`
- `Query.profile(handle)` → needs `getProfileByHandle()`
- `Post.author` → needs `getProfilesByIds()` (DataLoader batch)

**Current GraphQL Adapter**: `ProfileServiceAdapter` exists ✅

**Status**: ✅ Mostly aligned, may need ProfileAdapter for type transformations

---

### 3. PostService

**Purpose**: Post CRUD, user posts, feed posts
**Domain Entities**: `Post`, `PostGridItem`, `PostEntity`, `FeedPostItem`

**Public API**:
```typescript
class PostService {
  async createPost(userId: string, userHandle: string, request: CreatePostRequest, imageUrl: string, thumbnailUrl: string): Promise<Post>
  async getPostById(postId: string): Promise<Post | null>
  async getPostsByIds(postIds: string[]): Promise<Map<string, Post>>
  async updatePost(postId: string, userId: string, updates: UpdatePostRequest): Promise<Post | null>
  async deletePost(postId: string, userId: string): Promise<boolean>
  async getUserPostsByHandle(request: GetUserPostsRequest): Promise<PostGridResponse>
  async getUserPosts(userId: string, limit: number, cursor?: string): Promise<PostsListResponse>
  async getFeedPosts(limit: number, cursor?: string): Promise<PostGridResponse>
  async getFollowingFeedPosts(userId: string, followService, limit: number, cursor?: string): Promise<FeedResponse>
  async deleteAllUserPosts(userId: string): Promise<number>
}
```

**GraphQL Resolvers**:
- `Query.post(id)` → needs `getPostById()`
- `Query.userPosts(handle)` → needs `getUserPostsByHandle()`
- `Query.exploreFeed()` → needs `getFeedPosts()`
- `Query.followingFeed()` → needs `getFollowingFeedPosts()`

**Current GraphQL Adapter**: `PostServiceAdapter` exists ✅

**Issue**: Phase 1 tried to use non-existent FeedService methods
**Status**: ⚠️ Need PostAdapter for type transformations

---

### 4. CommentService

**Purpose**: Comment CRUD on posts
**Domain Entities**: `Comment`, `CommentEntity`

**Public API**:
```typescript
class CommentService {
  async createComment(userId: string, postId: string, userHandle: string, content: string, postUserId: string, postSK: string): Promise<CreateCommentResponse>
  async deleteComment(userId: string, commentId: string): Promise<DeleteCommentResponse>
  async getCommentsByPost(postId: string, limit: number, cursor?: string): Promise<CommentsListResponse>
}
```

**GraphQL Resolvers**:
- `Query.comments(postId)` → needs `getCommentsByPost()`

**Current GraphQL Adapter**: `CommentServiceAdapter` AND `CommentAdapter` ✅

**Status**: ✅ **This is our golden template!**

---

### 5. LikeService

**Purpose**: Like/unlike posts, batch like status
**Domain Entities**: `Like`, `LikeEntity`, `LikeStatus`

**Public API**:
```typescript
class LikeService {
  async likePost(userId: string, postId: string, postUserId: string, postSK: string): Promise<LikePostResponse>
  async unlikePost(userId: string, postId: string): Promise<UnlikePostResponse>
  async getPostLikeStatus(userId: string, postId: string): Promise<GetPostLikeStatusResponse>
  async getLikeStatusesByPostIds(userId: string, postIds: string[]): Promise<Map<string, LikeStatus>>
}
```

**GraphQL Resolvers**:
- `Query.postLikeStatus(postId)` → needs `getPostLikeStatus()`
- `Post.isLiked` field → needs `getLikeStatusesByPostIds()` (DataLoader batch)

**Current GraphQL Adapter**: `LikeServiceAdapter` exists ✅

**Status**: ✅ Aligned

---

### 6. FollowService

**Purpose**: Follow/unfollow users, follow status
**Domain Entities**: `Follow`, `FollowEntity`

**Public API**:
```typescript
class FollowService {
  async followUser(followerId: string, followeeId: string): Promise<FollowUserResponse>
  async unfollowUser(followerId: string, followeeId: string): Promise<UnfollowUserResponse>
  async getFollowStatus(followerId: string, followeeId: string): Promise<GetFollowStatusResponse>
  async getFollowingList(userId: string): Promise<string[]>
  async getFollowerCount(userId: string): Promise<number>
  async getAllFollowers(userId: string): Promise<string[]>
}
```

**GraphQL Resolvers**:
- `Query.followStatus(handle)` → needs `getFollowStatus()`
- Feed queries → need `getFollowingList()` for query-time pattern

**Current GraphQL Adapter**: `FollowServiceAdapter` exists ✅

**Status**: ✅ Aligned

---

### 7. NotificationService

**Purpose**: Notification CRUD, read/unread status
**Domain Entities**: `Notification`, `NotificationEntity`

**Public API**:
```typescript
class NotificationService {
  async createNotification(data: any): Promise<CreateNotificationResponse>
  async getNotifications(request: any): Promise<GetNotificationsResponse>
  async getUnreadCount(userId: string): Promise<number>
  async markAsRead(request: any): Promise<MarkAsReadResponse>
  async markAllAsRead(request: any): Promise<MarkAllAsReadResponse>
  async deleteNotification(request: any): Promise<DeleteNotificationResponse>
  async batchOperation(request: any): Promise<BatchOperationResponse>
}
```

**GraphQL Resolvers**:
- `Query.notifications()` → needs `getNotifications()`
- `Query.unreadNotificationsCount` → needs `getUnreadCount()`

**Current GraphQL Adapter**: `NotificationServiceAdapter` exists ✅

**Status**: ✅ Aligned

---

### 8. FeedService ⚠️ **CRITICAL MISMATCH**

**Purpose**: Materialized feed cache (Phase 2 hybrid feed architecture)
**Domain Entities**: `FeedItemEntity`, `FeedPostItem`, `CachedPost`

**Public API**:
```typescript
class FeedService {
  async writeFeedItem(params: { userId, postId, authorId, ... }): Promise<void>
  async writeFeedItemsBatch(items: Array<...>): Promise<{ successCount, failedItems }>
  async getMaterializedFeedItems(params: { userId, limit?, cursor? }): Promise<{ items: FeedPostItem[], nextCursor? }>
  async markFeedItemsAsRead(params: { userId, postIds }): Promise<{ updatedCount }>
  async deleteFeedItemsByPost(params: { postId }): Promise<{ deletedCount }>
  async deleteFeedItemsForUser(params: { userId, authorId }): Promise<{ deletedCount }>
}
```

**⚠️ PROBLEM**: This is for **materialized feed cache** (Phase 2), not for **query-time feeds**!

**What GraphQL Actually Needs**:
- `Query.exploreFeed()` → needs all public posts (uses `PostService.getFeedPosts()`)
- `Query.followingFeed()` → needs posts from followed users (uses `PostService.getFollowingFeedPosts()`)

**Architecture Insight**:
```
PHASE 1 (Current): Query-Time Feed Pattern
- exploreFeed → PostService.getFeedPosts() → Scan all posts, filter public
- followingFeed → PostService.getFollowingFeedPosts() → Query followed users' posts

PHASE 2 (Future): Hybrid Feed with Materialized Cache
- exploreFeed → Same as Phase 1
- followingFeed → FeedService.getMaterializedFeedItems() → Read from cache
```

**Status**: ❌ **Phase 1 FeedAdapter incorrectly tried to use FeedService methods that don't exist**

---

## Part 2: GraphQL Architecture Analysis

### Current Hexagonal Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    GraphQL Resolvers                    │
│          (Interface Layer - thin delegation)            │
│  exploreFeedResolver, postResolver, profileResolver...  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Use Cases                   │
│        (Business Logic - pure, testable)                │
│   GetExploreFeed, GetPostById, GetProfileByHandle...    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            Domain Repositories (Interfaces)              │
│     IFeedRepository, IPostRepository, IProfileRepository │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│          Infrastructure Adapters (Implementations)       │
│    FeedServiceAdapter, PostServiceAdapter, ProfileSer...│
│          (Transforms DAL types → Domain types)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                      DAL Services                        │
│            (Data Access - DynamoDB operations)           │
│     PostService, ProfileService, CommentService...       │
└─────────────────────────────────────────────────────────┘
```

### New Layer Proposed: Type Transformation Adapters

```
┌─────────────────────────────────────────────────────────┐
│                    GraphQL Resolvers                    │
│          (Interface Layer - thin delegation)            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│         ⭐ Type Transformation Adapters ⭐               │
│        (Domain Types → GraphQL Schema Types)            │
│   CommentAdapter, PostAdapter, FeedAdapter, ProfileA... │
│         Uses TypeMapper for transformations              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│          Infrastructure Service Adapters                 │
│    (DAL Service → Domain Repository Interface)          │
└─────────────────────────────────────────────────────────┘
```

**Why Two Adapter Layers?**

1. **ServiceAdapter** (e.g., `PostServiceAdapter`):
   - Implements `IPostRepository` domain interface
   - Calls DAL `PostService` methods
   - Transforms DAL types → Domain types (`Post` from shared → domain `Post`)
   - Returns `Result<T>` types for use case layer

2. **Type Transformation Adapter** (e.g., `PostAdapter`):
   - Takes domain entities from use cases
   - Transforms to GraphQL schema types (`Post` → `GraphQLPost`)
   - Builds GraphQL connections (edges, pageInfo, cursors)
   - Handles GraphQL-specific concerns (error messages, field nullability)

---

## Part 3: Gap Analysis

### ✅ What's Working

1. **CommentAdapter Pattern** (Phase 1 Complete)
   - ✅ `CommentAdapter` transforms domain Comments → GraphQL Comments
   - ✅ Uses `TypeMapper` for transformations
   - ✅ Builds GraphQL `CommentConnection`
   - ✅ Full test coverage (5/5 passing)
   - ✅ Resolver uses adapter cleanly

2. **Service Adapters Exist**
   - ✅ `ProfileServiceAdapter`, `PostServiceAdapter`, etc. all exist
   - ✅ They implement domain repository interfaces
   - ✅ They have good test coverage

3. **Use Cases Well Structured**
   - ✅ Pure business logic
   - ✅ Return `Result<T>` types
   - ✅ Well tested with mocks

---

### ❌ What's Broken

#### 1. **Feed Resolvers** (Phase 1 Incomplete)

**Problem**: FeedAdapter tried to use non-existent FeedService methods

```typescript
// ❌ WRONG - FeedService doesn't have these methods
const response = await this.feedService.getExploreFeed({
  limit, cursor, viewerId
});

const response = await this.feedService.getFollowingFeed({
  userId, limit, cursor
});
```

**Root Cause**: Misunderstanding of FeedService purpose
- FeedService = **Materialized cache** (Phase 2 future work)
- Explore/Following feeds = **Query-time** (uses PostService)

**Correct Approach**:
```typescript
// ✅ CORRECT - Use PostService for query-time feeds
class FeedAdapter {
  constructor(private postService: PostService) {}

  async getExploreFeed(args): Promise<PostConnection> {
    // Call PostService.getFeedPosts()
    const response = await this.postService.getFeedPosts(
      args.first ?? 20,
      args.after
    );

    // Transform PostGridResponse → PostConnection
    return TypeMapper.toGraphQLConnection(
      response.posts,
      TypeMapper.toGraphQLPost,
      { hasNextPage: response.hasMore, ... }
    );
  }

  async getFollowingFeed(args): Promise<PostConnection> {
    // Call PostService.getFollowingFeedPosts()
    const response = await this.postService.getFollowingFeedPosts(
      args.userId,
      followService, // Need to inject
      args.first ?? 20,
      args.after
    );

    // Transform FeedResponse → PostConnection
    return TypeMapper.toGraphQLConnection(
      response.posts,
      TypeMapper.toGraphQLFeedPost, // New transformer
      { hasNextPage: response.hasMore, ... }
    );
  }
}
```

---

#### 2. **TypeMapper Missing Post Transformations**

**Problem**: `TypeMapper.toGraphQLConnection()` returns `CommentConnection`

```typescript
// ❌ Current implementation
static toGraphQLConnection<TDomain, TGraphQL>(...): CommentConnection {
  // Hardcoded to return CommentConnection!
}
```

**Root Cause**: Generic method not properly generic

**Fix**: Make truly generic
```typescript
// ✅ CORRECT - Properly generic
static toGraphQLConnection<TDomain, TGraphQL, TConnection>(
  items: TDomain[],
  transformer: (item: TDomain) => TGraphQL,
  options: PaginationOptions
): TConnection {
  const edges = items.map((item) => ({
    node: transformer(item),
    cursor: generateCursor(item),
  }));

  return {
    edges,
    pageInfo: { ... }
  } as TConnection;
}

// Usage
TypeMapper.toGraphQLConnection<Post, GraphQLPost, PostConnection>(
  posts,
  TypeMapper.toGraphQLPost,
  options
);
```

---

#### 3. **Post Type Transformations Missing**

**Problem**: No transformers for different Post types

**Need**:
```typescript
class TypeMapper {
  // For PostGridItem (minimal post for grids)
  static toGraphQLPostGridItem(domain: PostGridItem): GraphQLPost {
    return {
      id: domain.id,
      userId: domain.userId,
      imageUrl: domain.thumbnailUrl, // Use thumbnail for grids
      caption: domain.caption ?? null,
      likesCount: domain.likesCount,
      commentsCount: domain.commentsCount,
      createdAt: domain.createdAt,
    } as GraphQLPost;
  }

  // For FeedPostItem (post with author info)
  static toGraphQLFeedPost(domain: FeedPostItem): GraphQLPost {
    return {
      id: domain.id,
      userId: domain.userId,
      imageUrl: domain.imageUrl,
      caption: domain.caption ?? null,
      likesCount: domain.likesCount,
      commentsCount: domain.commentsCount,
      createdAt: domain.createdAt,
      isLiked: domain.isLiked,
      author: {
        id: domain.authorId,
        handle: domain.authorHandle,
        fullName: domain.authorFullName ?? null,
        profilePictureUrl: domain.authorProfilePictureUrl ?? null,
      },
    } as GraphQLPost;
  }

  // For full Post
  static toGraphQLPost(domain: Post): GraphQLPost {
    return {
      id: domain.id,
      userId: domain.userId,
      imageUrl: domain.imageUrl,
      caption: domain.caption ?? null,
      likesCount: domain.likesCount,
      commentsCount: domain.commentsCount,
      createdAt: domain.createdAt,
    } as GraphQLPost;
  }
}
```

---

#### 4. **Resolver Import Paths Wrong**

**Problem**: Using wrong generated types path

```typescript
// ❌ WRONG
import type { QueryResolvers } from '../../../generated/types.js';

// ✅ CORRECT
import type { QueryResolvers } from '../../schema/generated/types';
```

---

## Part 4: Systematic Alignment Strategy

### Design Principles

1. **Hexagonal Architecture**: Business logic in use cases, infrastructure concerns in adapters
2. **Dependency Injection**: All services injected via constructor
3. **TDD**: Tests first (RED), implementation (GREEN), refactor (REFACTOR)
4. **DRY**: Reuse existing fixtures, helpers, utilities
5. **Type Safety**: Strict TypeScript, no `any`, branded types where appropriate
6. **Single Responsibility**: Each adapter has one job

---

### Phase 1: Fix Feed Adapters (Corrected)

**Goal**: Make feed queries work using correct DAL services

#### Step 1.1: Fix TypeMapper to be Properly Generic

```typescript
// TypeMapper.ts
export class TypeMapper {
  static toGraphQLConnection<TDomain, TGraphQL, TConnection>(
    items: TDomain[],
    transformer: (item: TDomain) => TGraphQL,
    options: PaginationOptions
  ): TConnection {
    const edges = items.map((item) => {
      const node = transformer(item);
      const cursor = CursorCodec.encode({
        id: (node as any).id,
        sortKey: (node as any).createdAt,
      });

      return { node, cursor };
    });

    const pageInfo = {
      hasNextPage: options.hasNextPage ?? false,
      hasPreviousPage: options.hasPreviousPage ?? false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    };

    return { edges, pageInfo } as TConnection;
  }

  // Post transformers
  static toGraphQLPost(domain: Post): GraphQLPost { ... }
  static toGraphQLPostGridItem(domain: PostGridItem): GraphQLPost { ... }
  static toGraphQLFeedPost(domain: FeedPostItem): GraphQLPost { ... }
}
```

**Tests** (TDD):
```typescript
describe('TypeMapper', () => {
  it('transforms Post[] to PostConnection', () => {
    const posts = createMockPosts(2);
    const connection = TypeMapper.toGraphQLConnection<Post, GraphQLPost, PostConnection>(
      posts,
      TypeMapper.toGraphQLPost,
      { hasNextPage: false }
    );

    expect(connection.edges).toHaveLength(2);
    expect(connection.edges[0].node.id).toBe('post-1');
    expect(connection.pageInfo.hasNextPage).toBe(false);
  });
});
```

---

#### Step 1.2: Create FeedAdapter Using PostService

```typescript
// FeedAdapter.ts
export class FeedAdapter {
  constructor(
    private readonly postService: PostService,
    private readonly followService: FollowService
  ) {}

  async getExploreFeed(args: GetExploreFeedArgs): Promise<PostConnection> {
    try {
      const limit = args.first ?? 20;
      const cursor = args.after;

      const response = await this.postService.getFeedPosts(limit, cursor);

      return TypeMapper.toGraphQLConnection<PostGridItem, GraphQLPost, PostConnection>(
        response.posts,
        TypeMapper.toGraphQLPostGridItem,
        {
          hasNextPage: response.hasMore,
          after: cursor,
        }
      );
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }

  async getFollowingFeed(args: GetFollowingFeedArgs): Promise<PostConnection> {
    if (!args.userId) {
      throw new GraphQLError('userId is required');
    }

    try {
      const limit = args.first ?? 20;
      const cursor = args.after;

      const response = await this.postService.getFollowingFeedPosts(
        args.userId,
        this.followService,
        limit,
        cursor
      );

      return TypeMapper.toGraphQLConnection<FeedPostItem, GraphQLPost, PostConnection>(
        response.posts,
        TypeMapper.toGraphQLFeedPost,
        {
          hasNextPage: response.hasMore,
          after: cursor,
        }
      );
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }
}
```

**Tests** (TDD):
```typescript
describe('FeedAdapter', () => {
  let adapter: FeedAdapter;
  let mockPostService: PostService;
  let mockFollowService: FollowService;

  beforeEach(() => {
    mockPostService = {
      getFeedPosts: async () => ({ posts: [], hasMore: false, totalCount: 0 }),
      getFollowingFeedPosts: async () => ({ posts: [], hasMore: false }),
    } as any;

    mockFollowService = {} as any;

    adapter = new FeedAdapter(mockPostService, mockFollowService);
  });

  it('transforms explore feed to GraphQL PostConnection', async () => {
    const posts = createMockPostGridItems(2);
    mockPostService.getFeedPosts = async () => ({
      posts,
      hasMore: false,
      totalCount: 2,
      nextCursor: undefined,
    });

    const result = await adapter.getExploreFeed({ first: 10 });

    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].node.id).toBe('post-1');
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('transforms following feed to GraphQL PostConnection', async () => {
    const posts = createMockPostsWithAuthor(2);
    mockPostService.getFollowingFeedPosts = async () => ({
      posts,
      hasMore: true,
      nextCursor: 'cursor-abc',
    });

    const result = await adapter.getFollowingFeed({ userId: 'user-1', first: 10 });

    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].node.id).toBe('post-1');
    expect(result.edges[0].node.author).toBeDefined();
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});
```

---

#### Step 1.3: Update Resolvers

```typescript
// exploreFeedResolver.ts
export const createExploreFeedResolver = (container: Container): QueryResolvers['exploreFeed'] =>
  async (_parent, args) => {
    const postService = container.resolve<PostService>('PostService');
    const followService = container.resolve<FollowService>('FollowService');
    const adapter = new FeedAdapter(postService, followService);

    return adapter.getExploreFeed({
      first: args.first,
      after: args.after,
    });
  };

// followingFeedResolver.ts
export const createFollowingFeedResolver = (container: Container): QueryResolvers['followingFeed'] =>
  withAuth(async (_parent, args, context) => {
    const postService = container.resolve<PostService>('PostService');
    const followService = container.resolve<FollowService>('FollowService');
    const adapter = new FeedAdapter(postService, followService);

    return adapter.getFollowingFeed({
      userId: context.userId!,
      first: args.first,
      after: args.after,
    });
  });
```

---

### Phase 2: Post Adapters

**Goal**: Create PostAdapter for post-related queries

**Why Separate from PostServiceAdapter?**
- `PostServiceAdapter` implements `IPostRepository` (domain interface)
- `PostAdapter` transforms domain types → GraphQL types

```typescript
export class PostAdapter {
  constructor(private readonly postService: PostService) {}

  async getPostById(postId: string): Promise<GraphQLPost | null> {
    const post = await this.postService.getPostById(postId);
    if (!post) return null;

    return TypeMapper.toGraphQLPost(post);
  }

  async getUserPosts(args: GetUserPostsArgs): Promise<PostConnection> {
    const response = await this.postService.getUserPostsByHandle({
      handle: args.handle,
      limit: args.first ?? 24,
      cursor: args.after,
    });

    return TypeMapper.toGraphQLConnection<PostGridItem, GraphQLPost, PostConnection>(
      response.posts,
      TypeMapper.toGraphQLPostGridItem,
      { hasNextPage: response.hasMore }
    );
  }
}
```

**Tests**: Same pattern as FeedAdapter

---

### Phase 3: Profile Adapters

**Goal**: Create ProfileAdapter for profile queries

```typescript
export class ProfileAdapter {
  constructor(private readonly profileService: ProfileService) {}

  async getCurrentUserProfile(userId: string): Promise<GraphQLProfile | null> {
    const profile = await this.profileService.getProfileById(userId);
    if (!profile) return null;

    return TypeMapper.toGraphQLProfile(profile);
  }

  async getProfileByHandle(handle: string): Promise<GraphQLProfile | null> {
    const profile = await this.profileService.getProfileByHandle(handle);
    if (!profile) return null;

    return TypeMapper.toGraphQLPublicProfile(profile);
  }
}
```

---

### Phase 4: Notification Adapters

**Goal**: Create NotificationAdapter

```typescript
export class NotificationAdapter {
  constructor(private readonly notificationService: NotificationService) {}

  async getNotifications(args: GetNotificationsArgs): Promise<NotificationConnection> {
    const response = await this.notificationService.getNotifications({
      userId: args.userId,
      limit: args.first ?? 20,
      cursor: args.after,
      status: args.status,
      type: args.type,
      priority: args.priority,
    });

    return TypeMapper.toGraphQLConnection<Notification, GraphQLNotification, NotificationConnection>(
      response.notifications,
      TypeMapper.toGraphQLNotification,
      {
        hasNextPage: response.hasMore,
        totalCount: response.totalCount,
      }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationService.getUnreadCount(userId);
  }
}
```

---

## Part 5: Testing Strategy

### Test Levels

1. **Unit Tests** (Adapters)
   - Mock DAL services using dependency injection
   - Test type transformations (domain → GraphQL)
   - Test error handling and GraphQLError wrapping
   - Test input validation
   - Test pagination with cursors
   - Use existing shared fixtures (`createMockPosts`, `createMockComments`, etc.)
   - No spies, no mocks - pure dependency injection

2. **Integration Tests** (Resolvers)
   - Test resolver → adapter → service flow
   - Use real DI container
   - Mock only at DAL service boundary
   - Test with actual GraphQL schema
   - Verify connection structure (edges, pageInfo)

3. **End-to-End Tests** (GraphQL queries)
   - Full GraphQL queries through HTTP
   - Test with real database (LocalStack DynamoDB)
   - Verify complete data flow
   - Test authentication/authorization

---

## Part 6: Implementation Checklist

### Phase 1: Fix Feed Adapters (Immediate Priority) ✅ COMPLETE

- [x] Update todos
- [x] Fix TypeMapper.toGraphQLConnection to be properly generic
- [x] Add TypeMapper.toGraphQLPost transformers (Post, PostGridItem, FeedPostItem)
- [x] Rewrite FeedAdapter to use PostService (not FeedService)
- [x] Write comprehensive tests for FeedAdapter
- [x] Update exploreFeedResolver to use corrected FeedAdapter
- [x] Update followingFeedResolver to use corrected FeedAdapter
- [x] Run integration tests
- [x] Validate changes (no TypeScript errors)

**Estimated Time**: 4-5 hours  
**Actual Time**: ~2 hours  
**Status**: ✅ COMPLETE - All 5 tests passing

---

### Phase 2: Post Adapter (High Priority) ✅ COMPLETE

- [x] Create PostAdapter with PostService dependency
- [x] Implement getPostById transformation
- [x] Implement getUserPosts transformation
- [x] Write comprehensive tests
- [x] Update postResolver to use PostAdapter
- [x] Update userPostsResolver to use PostAdapter
- [x] Run integration tests
- [x] Validate changes

**Estimated Time**: 3-4 hours  
**Actual Time**: ~1.5 hours  
**Status**: ✅ COMPLETE - All 7 tests passing

---

### Phase 3: Profile Adapter (Medium Priority) ✅ COMPLETE

- [x] Create ProfileAdapter with ProfileService dependency
- [x] Add TypeMapper.toGraphQLProfile transformations
- [x] Implement getCurrentUserProfile transformation
- [x] Implement getProfileByHandle transformation
- [x] Write comprehensive tests
- [x] Update meResolver to use ProfileAdapter
- [x] Update profileResolver to use ProfileAdapter
- [x] Run integration tests
- [x] Validate changes

**Estimated Time**: 2-3 hours  
**Actual Time**: ~1.5 hours  
**Status**: ✅ COMPLETE - All 7 tests passing

---

### Phase 4: Notification Adapter (Medium Priority) ✅ COMPLETE

- [x] Create NotificationAdapter with NotificationService dependency
- [x] Add TypeMapper.toGraphQLNotification transformations
- [x] Implement getNotifications transformation
- [x] Implement getUnreadCount passthrough
- [x] Write comprehensive tests
- [x] Update notificationsResolver to use NotificationAdapter
- [x] Update unreadNotificationsCountResolver to use NotificationAdapter
- [x] Run integration tests
- [x] Validate changes

**Estimated Time**: 2-3 hours  
**Actual Time**: ~1.5 hours  
**Status**: ✅ COMPLETE - All 6 tests passing

---

### Phase 5: Audit & Documentation (Low Priority) ⏳ IN PROGRESS

- [x] Audit all adapters for consistency
- [x] Ensure all follow same patterns
- [ ] Update architecture documentation
- [ ] Add ADR (Architecture Decision Record) for type transformation layer
- [ ] Update developer onboarding docs
- [ ] Create adapter implementation guide
- [ ] Document testing patterns

**Estimated Time**: 2-3 hours  
**Status**: ⏳ IN PROGRESS

---

## Part 7: Key Insights & Lessons Learned

### 1. **FeedService ≠ Feed Queries**

**Lesson**: FeedService is for **materialized cache** (Phase 2), not query-time feeds.

**Impact**: All feed queries should use PostService methods:
- `exploreFeed` → `PostService.getFeedPosts()`
- `followingFeed` → `PostService.getFollowingFeedPosts()`

**Action**: Update FeedAdapter to depend on PostService, not FeedService.

---

### 2. **Generic Type Parameters Need All Three**

**Lesson**: Generic connection builders need `<TDomain, TGraphQL, TConnection>`

**Before (wrong)**:
```typescript
static toGraphQLConnection<TDomain, TGraphQL>(...): CommentConnection
```

**After (correct)**:
```typescript
static toGraphQLConnection<TDomain, TGraphQL, TConnection>(...): TConnection
```

**Impact**: Enables reuse for Post, Comment, Notification connections.

---

### 3. **Multiple Post Representations Need Multiple Transformers**

**Lesson**: DAL has 3 Post types, each needs its own transformer:
1. `Post` → Full post with all fields
2. `PostGridItem` → Minimal for grid views (uses thumbnail)
3. `FeedPostItem` → Post with author info embedded

**Action**: Create `toGraphQLPost`, `toGraphQLPostGridItem`, `toGraphQLFeedPost`

---

### 4. **Two Adapter Layers Clarify Responsibilities**

**Lesson**: ServiceAdapter ≠ Type Transformation Adapter

**ServiceAdapter** (e.g., PostServiceAdapter):
- Implements domain repository interface
- Calls DAL service
- Returns `Result<T>` for use cases
- Handles domain errors

**Type Transformation Adapter** (e.g., PostAdapter):
- Takes domain entities
- Transforms to GraphQL types
- Builds connections
- Handles GraphQL errors

**Impact**: Clear separation of concerns, easier to test, easier to maintain.

---

### 5. **Dependency Injection Makes Testing Easy**

**Lesson**: Constructor injection > static methods > global state

**Pattern**:
```typescript
class FeedAdapter {
  constructor(
    private readonly postService: PostService,
    private readonly followService: FollowService
  ) {}
}

// Testing
const mockPostService = { getFeedPosts: async () => ({ ... }) };
const adapter = new FeedAdapter(mockPostService, mockFollowService);
```

**Benefits**:
- No mocks/spies needed
- Behavior-driven tests
- Easy to swap implementations
- Clear dependencies

---

## Part 8: Success Metrics

### Code Quality Metrics

- [ ] 100% test coverage on all adapters
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] All integration tests passing
- [ ] No `any` types in adapter code

### Performance Metrics

- [ ] Feed queries < 100ms P50
- [ ] Feed queries < 300ms P99
- [ ] No N+1 queries (DataLoader working)
- [ ] Cursor pagination working correctly

### Architecture Metrics

- [ ] All resolvers use adapters (no direct DAL calls)
- [ ] All type transformations in TypeMapper
- [ ] All validation errors are GraphQLErrors
- [ ] Clear layer boundaries (resolver → adapter → service)

---

## Part 9: Future Enhancements

### Phase 2 Materialized Feed (Future Work)

**When**: After Phase 1 complete and stable

**Goal**: Hybrid feed architecture

**Changes**:
1. Keep `exploreFeed` using PostService (query-time)
2. Switch `followingFeed` to FeedService.getMaterializedFeedItems()
3. Add stream processor for real-time feed fanout
4. Add Redis caching for hot feeds

**Why Later**: Need stable foundation first

---

### DataLoader Optimization (Future Work)

**When**: After all adapters complete

**Goal**: Eliminate N+1 queries in nested resolvers

**Changes**:
1. Add DataLoaders for batch fetching:
   - `profilesByIdsLoader`
   - `postsByIdsLoader`
   - `likeStatusesByPostIdsLoader`
2. Use in field resolvers (Post.author, etc.)
3. Add batch caching

---

### GraphQL Subscriptions (Future Work)

**When**: After core queries stable

**Goal**: Real-time updates for feeds and notifications

**Changes**:
1. Add subscription resolvers
2. Connect to event stream
3. Add PubSub infrastructure
4. Handle connection lifecycle

---

## Part 10: Migration Path

### Current State (Phase 0)

```
❌ FeedAdapter tries to use non-existent FeedService methods
❌ TypeMapper hardcoded to CommentConnection
❌ Missing Post type transformers
❌ Validation errors blocking deployment
```

### Target State (Phase 1 Complete)

```
✅ FeedAdapter uses PostService for query-time feeds
✅ TypeMapper generic for all connection types
✅ Complete Post transformers (3 variants)
✅ All tests passing
✅ Zero TypeScript errors
✅ Clean separation of concerns
```

### Final State (All Phases Complete)

```
✅ All resolvers use type transformation adapters
✅ All adapters follow CommentAdapter pattern
✅ 100% test coverage across adapter layer
✅ Clear hexagonal architecture boundaries
✅ Production-ready GraphQL API
✅ Easy to extend and maintain
```

---

## Appendix A: File Structure

```
packages/graphql-server/src/
├── infrastructure/
│   └── adapters/
│       ├── shared/
│       │   ├── TypeMapper.ts           # ⭐ Generic type transformations
│       │   └── __tests__/
│       │       └── TypeMapper.test.ts
│       ├── CommentAdapter.ts           # ✅ Template (complete)
│       ├── FeedAdapter.ts              # ⚠️  Needs fixing (Phase 1)
│       ├── PostAdapter.ts              # ❌ Missing (Phase 2)
│       ├── ProfileAdapter.ts           # ❌ Missing (Phase 3)
│       ├── NotificationAdapter.ts      # ❌ Missing (Phase 4)
│       └── __tests__/
│           ├── CommentAdapter.test.ts  # ✅ Template
│           ├── FeedAdapter.test.ts     # ⚠️  Needs fixing
│           ├── PostAdapter.test.ts     # ❌ Missing
│           ├── ProfileAdapter.test.ts  # ❌ Missing
│           └── NotificationAdapter.test.ts  # ❌ Missing
├── resolvers/
│   ├── feed/
│   │   ├── exploreFeedResolver.ts      # ⚠️  Needs updating
│   │   └── followingFeedResolver.ts    # ⚠️  Needs updating
│   ├── post/
│   │   ├── postResolver.ts             # ⏳ Needs PostAdapter
│   │   └── userPostsResolver.ts        # ⏳ Needs PostAdapter
│   ├── profile/
│   │   ├── meResolver.ts               # ⏳ Needs ProfileAdapter
│   │   └── profileResolver.ts          # ⏳ Needs ProfileAdapter
│   └── notification/
│       ├── notificationsResolver.ts         # ⏳ Needs NotificationAdapter
│       └── unreadNotificationsCountResolver.ts  # ⏳ Needs NotificationAdapter
└── schema/
    └── generated/
        └── types.ts                    # GraphQL schema types
```

---

## Appendix B: Quick Reference

### Import Patterns

```typescript
// Domain types (from shared package)
import type { Post, Comment } from '@social-media-app/shared';

// GraphQL types (from generated schema)
import type {
  Post as GraphQLPost,
  Comment as GraphQLComment,
  PostConnection,
  CommentConnection
} from '../../schema/generated/types';

// DAL services
import type { PostService } from '@social-media-app/dal';

// Utilities
import { TypeMapper } from './shared/TypeMapper';
import { GraphQLError } from 'graphql';
```

### Adapter Template

```typescript
export class [Entity]Adapter {
  constructor(
    private readonly [entity]Service: [Entity]Service
  ) {}

  async get[Entity]s(args: Get[Entity]sArgs): Promise<[Entity]Connection> {
    // 1. Validate inputs
    if (!args.requiredParam) {
      throw new GraphQLError('[Entity] requiredParam is required');
    }

    try {
      // 2. Call DAL service
      const response = await this.[entity]Service.get[Entity]s({
        param1: args.param1,
        limit: args.first ?? 20,
        cursor: args.after,
      });

      // 3. Transform to GraphQL connection
      return TypeMapper.toGraphQLConnection<
        Domain[Entity],
        GraphQL[Entity],
        [Entity]Connection
      >(
        response.[entity]s,
        TypeMapper.toGraphQL[Entity],
        {
          hasNextPage: response.hasMore,
          after: args.after,
        }
      );
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }
}
```

---

## Appendix C: Testing Checklist Per Adapter

For each new adapter, ensure these tests exist:

- [ ] ✅ Fetches entities and transforms to GraphQL types
- [ ] ✅ Handles pagination correctly with cursor
- [ ] ✅ Handles empty results
- [ ] ✅ Throws GraphQLError on service error
- [ ] ✅ Validates required parameters
- [ ] ✅ Applies default values for optional parameters
- [ ] ✅ Builds connection with correct edges structure
- [ ] ✅ Builds connection with correct pageInfo structure
- [ ] ✅ Generates stable cursors for pagination

---

## Conclusion

This alignment plan provides a systematic approach to fixing the DAL/GraphQL architecture mismatch. By following the TDD approach and using CommentAdapter as a template, we can ensure high quality, maintainable code that follows hexagonal architecture principles.

**Next Steps**:
1. Review and approve this plan
2. Start Phase 1: Fix Feed Adapters
3. Proceed through phases sequentially
4. Validate after each phase
5. Document lessons learned

**Questions or Concerns**: Discuss before starting implementation.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Status**: Ready for Review and Implementation
