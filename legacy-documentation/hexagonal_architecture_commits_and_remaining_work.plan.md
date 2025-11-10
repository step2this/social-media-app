# Git Commit Plan & Remaining Resolver Work

## Part 1: Clean Modular Git Commits

### Commit Strategy

I'll organize the changes into logical, atomic commits that tell a coherent story. Each commit should be:
- **Atomic**: Single logical change
- **Documented**: Clear commit message explaining WHY
- **Testable**: All tests passing at each commit
- **Reversible**: Can be cherry-picked or reverted independently

---

### Commit 1: feat(graphql): Add hexagonal architecture type transformation foundation (TDD)

**Purpose**: Introduce the core type transformation infrastructure using Test-Driven Development

**Files**:
```
A  packages/graphql-server/src/infrastructure/adapters/shared/TypeMapper.ts
A  packages/graphql-server/src/infrastructure/adapters/shared/__tests__/TypeMapper.test.ts
A  HEXAGONAL_ARCHITECTURE_TYPE_TRANSFORMATION_COMPLETE.md
A  graphql_hexagonal_architecture_type_transformation_tdd.plan.md
```

**Commit Message**:
```
feat(graphql): Add hexagonal architecture type transformation foundation (TDD)

Implement TypeMapper utility for transforming domain types (from @social-media-app/shared)
to GraphQL schema types. This addresses type mismatches between DAL services and GraphQL
resolvers using the Adapter pattern from hexagonal architecture.

Key Features:
- toGraphQLComment(): Transforms flat domain Comment to nested GraphQL Comment
- toGraphQLConnection(): Generic pagination transformer with cursor generation
- Stable cursor encoding using CursorCodec
- Full test coverage (6/6 tests passing)

This foundation enables clean separation between domain and interface layers,
making it easy to swap DAL implementations without affecting GraphQL resolvers.

Part of hexagonal architecture refactoring following TDD principles.

Test Results: ✅ 6/6 passing
```

---

### Commit 2: feat(graphql): Add CommentAdapter for type transformation (TDD)

**Purpose**: Implement the adapter pattern for comments resolver

**Files**:
```
A  packages/graphql-server/src/infrastructure/adapters/CommentAdapter.ts
A  packages/graphql-server/src/infrastructure/adapters/__tests__/CommentAdapter.test.ts
```

**Commit Message**:
```
feat(graphql): Add CommentAdapter for type transformation (TDD)

Implement CommentAdapter following hexagonal architecture adapter pattern.
This adapter bridges DAL services and GraphQL resolvers by:

1. Calling DAL CommentService methods
2. Transforming domain types to GraphQL types using TypeMapper
3. Handling errors and converting them to GraphQLErrors
4. Validating input parameters (postId, pagination bounds)

Key Benefits:
- Clean separation of concerns (domain vs interface layer)
- Type-safe transformations at compile time
- Input validation centralized in adapter
- Easy to test independently of resolver
- Follows Single Responsibility Principle

Test Results: ✅ 7/7 passing
Test Coverage: 100% of adapter methods

Part of hexagonal architecture refactoring following TDD principles.
```

---

### Commit 3: refactor(graphql): Update commentsResolver to use CommentAdapter

**Purpose**: Refactor resolver to use new adapter pattern

**Files**:
```
M  packages/graphql-server/src/resolvers/comment/commentsResolver.ts
```

**Commit Message**:
```
refactor(graphql): Update commentsResolver to use CommentAdapter

Refactor commentsResolver to delegate to CommentAdapter, making it thin
and focused solely on:
1. Authentication checks
2. Argument validation
3. Delegation to adapter

Changes:
- Use CommentAdapter instead of direct DAL service calls
- Fixed args mapping to match GraphQL schema (cursor, limit)
- Removed manual type transformation logic (now in adapter)
- Reduced resolver from 60+ lines to 25 lines

Benefits:
- Resolver is now thin and testable
- Type transformation logic isolated in adapter layer
- Follows hexagonal architecture principles
- Easy to understand and maintain

Part of hexagonal architecture refactoring.
```

---

### Commit 4: chore(frontend): Clean up Vite cache files

**Purpose**: Remove build artifacts (should be gitignored)

**Files**:
```
D  packages/frontend/.vite/deps/_metadata.json
D  packages/frontend/.vite/deps/package.json
```

**Commit Message**:
```
chore(frontend): Clean up Vite cache files

Remove Vite cache files that should not be tracked in version control.
These are build artifacts that are regenerated on each build.

Note: Consider adding .vite/ to .gitignore if not already present.
```

---

### Commit 5: feat(frontend): Migrate to Relay for comments, posts, and profile pages

**Purpose**: Consolidate all frontend Relay migration work

**Files**:
```
M  packages/frontend/src/components/comments/CommentItem.tsx
M  packages/frontend/src/components/comments/CommentList.tsx
M  packages/frontend/src/components/layout/LeftSidebar.tsx
M  packages/frontend/src/components/notifications/NotificationItem.tsx
M  packages/frontend/src/components/posts/CreatePostPage.tsx
M  packages/frontend/src/components/posts/PostCard.tsx
M  packages/frontend/src/components/posts/PostDetailPage.tsx
M  packages/frontend/src/components/profile/MyProfilePage.tsx
M  packages/frontend/src/components/profile/ProfilePage.tsx
M  packages/frontend/src/pages/NotificationsPage.tsx
M  packages/frontend/src/relay/RelayEnvironment.ts
D  packages/frontend/src/services/commentService.ts
M  packages/frontend/src/utils/profile-edit-helpers.ts
M  packages/frontend/src/components/posts/__generated__/PostCardRelay_post.graphql.ts
M  packages/frontend/src/components/posts/__generated__/PostDetailPageRelayQuery.graphql.ts
M  packages/frontend/src/components/profile/__generated__/MyProfilePageRelayQuery.graphql.ts
```

**Commit Message**:
```
feat(frontend): Migrate to Relay for comments, posts, and profile pages

Complete migration of comment, post, and profile components to Relay Modern.
This removes the legacy REST/GraphQL client in favor of Relay's declarative
data fetching.

Changes:
- CommentItem, CommentList: Use Relay fragments and queries
- PostCard, PostDetailPage: Migrate to Relay data fetching
- MyProfilePage, ProfilePage: Use Relay for profile data
- LeftSidebar: Update to use Relay environment
- NotificationItem, NotificationsPage: Relay integration
- CreatePostPage: Form handling with Relay mutations
- Remove commentService.ts (replaced by Relay)
- Update profile-edit-helpers for Relay compatibility

Benefits:
- Declarative data requirements via fragments
- Automatic query optimization and caching
- Type-safe GraphQL operations
- Better developer experience
- Eliminates REST API layer complexity

Generated Files Updated:
- PostCardRelay_post.graphql.ts
- PostDetailPageRelayQuery.graphql.ts
- MyProfilePageRelayQuery.graphql.ts

Part of ongoing Relay migration (Phase 4 complete).
```

---

### Commit 6: feat(graphql): Add optional bio field to Profile type

**Purpose**: Schema enhancement for profile pages

**Files**:
```
M  schema.graphql
```

**Commit Message**:
```
feat(graphql): Add optional bio field to Profile type

Add bio field to Profile type in GraphQL schema to support
profile page enhancements.

This change is backward compatible as the field is optional.

Related to Relay migration and profile page improvements.
```

---

### Commit 7: feat(frontend): Stage Relay-generated GraphQL types

**Purpose**: Commit generated Relay files for new components

**Files** (already staged):
```
A  packages/frontend/src/components/comments/__generated__/CommentItemDeleteMutation.graphql.ts
A  packages/frontend/src/components/comments/__generated__/CommentItem_comment.graphql.ts
A  packages/frontend/src/components/comments/__generated__/CommentList_post.graphql.ts
A  packages/frontend/src/components/layout/__generated__/LeftSidebarQuery.graphql.ts
```

**Commit Message**:
```
feat(frontend): Stage Relay-generated GraphQL types

Add Relay Compiler generated TypeScript types for:
- CommentItemDeleteMutation: Delete comment mutation
- CommentItem_comment: Comment fragment for CommentItem component
- CommentList_post: Post fragment for CommentList component
- LeftSidebarQuery: Query for LeftSidebar data fetching

These files are auto-generated by Relay Compiler based on GraphQL
fragments and queries defined in component files.

Part of Relay migration (Phase 4).
```

---

## Part 2: Remaining Resolver Work To-Do List

Following the hexagonal architecture pattern and TDD approach established with CommentAdapter:

### Phase 1: Feed Resolvers ⏳

**Adapters to Create**:
1. **FeedAdapter** (`src/infrastructure/adapters/FeedAdapter.ts`)
   - `getExploreFeed(args)` → Transform `Post[]` to `PostConnection`
   - `getFollowingFeed(args)` → Transform `Post[]` to `PostConnection`

**Type Transformations Needed**:
- Extend TypeMapper with `toGraphQLPost(domainPost)`
- Reuse `toGraphQLConnection()` with Post transformer

**Tests** (TDD - RED → GREEN → REFACTOR):
1. `FeedAdapter.test.ts`:
   - ✅ Fetches explore feed and transforms to GraphQL types
   - ✅ Fetches following feed and transforms to GraphQL types
   - ✅ Handles pagination with cursor
   - ✅ Handles empty results
   - ✅ Validates userId for following feed
   - ✅ Throws GraphQLError on service error
   - ✅ Applies default pagination values

**Resolvers to Update**:
- `src/resolvers/feed/exploreFeedResolver.ts`
- `src/resolvers/feed/followingFeedResolver.ts`

**Estimated Time**: 3-4 hours

---

### Phase 2: Post Resolvers ⏳

**Adapters to Create**:
1. **PostAdapter** (`src/infrastructure/adapters/PostAdapter.ts`)
   - `getPostById(postId)` → Transform domain `Post` to GraphQL `Post`
   - `getUserPosts(args)` → Transform `Post[]` to `PostConnection`

**Type Transformations Needed**:
- Use `TypeMapper.toGraphQLPost()` (from Phase 1)
- Handle post author profile nesting
- Transform post media URLs

**Tests** (TDD - RED → GREEN → REFACTOR):
1. `PostAdapter.test.ts`:
   - ✅ Fetches post by ID and transforms to GraphQL type
   - ✅ Fetches user posts and transforms to PostConnection
   - ✅ Handles pagination correctly
   - ✅ Handles missing post (throws NOT_FOUND error)
   - ✅ Validates postId parameter
   - ✅ Validates userId parameter for userPosts
   - ✅ Throws GraphQLError on service error

**Resolvers to Update**:
- `src/resolvers/post/postResolver.ts`
- `src/resolvers/post/userPostsResolver.ts`

**Estimated Time**: 3-4 hours

---

### Phase 3: Profile Resolvers ⏳

**Adapters to Create**:
1. **ProfileAdapter** (`src/infrastructure/adapters/ProfileAdapter.ts`)
   - `getCurrentUserProfile(userId)` → Transform domain `Profile` to GraphQL `Profile`
   - `getProfileByHandle(handle)` → Transform domain `Profile` to GraphQL `Profile`

**Type Transformations Needed**:
- Extend TypeMapper with `toGraphQLProfile(domainProfile)`
- Handle profile picture URL transformation
- Transform follower/following counts

**Tests** (TDD - RED → GREEN → REFACTOR):
1. `ProfileAdapter.test.ts`:
   - ✅ Fetches current user profile and transforms to GraphQL type
   - ✅ Fetches profile by handle and transforms to GraphQL type
   - ✅ Handles missing profile (throws NOT_FOUND error)
   - ✅ Validates userId parameter
   - ✅ Validates handle parameter
   - ✅ Throws GraphQLError on service error
   - ✅ Transforms profile picture URLs correctly

**Resolvers to Update**:
- `src/resolvers/profile/meResolver.ts`
- `src/resolvers/profile/profileResolver.ts`

**Estimated Time**: 2-3 hours

---

### Phase 4: Notification Resolvers ⏳

**Adapters to Create**:
1. **NotificationAdapter** (`src/infrastructure/adapters/NotificationAdapter.ts`)
   - `getNotifications(args)` → Transform to `NotificationConnection`
   - `getUnreadCount(userId)` → Transform to `Int`
   - `markAsRead(notificationId)` → Transform to `Boolean`

**Type Transformations Needed**:
- Extend TypeMapper with `toGraphQLNotification(domainNotification)`
- Handle notification type discrimination (LIKE, COMMENT, FOLLOW)
- Transform actor profile data

**Tests** (TDD - RED → GREEN → REFACTOR):
1. `NotificationAdapter.test.ts`:
   - ✅ Fetches notifications and transforms to GraphQL types
   - ✅ Handles pagination with cursor
   - ✅ Fetches unread count
   - ✅ Marks notification as read
   - ✅ Handles empty notifications
   - ✅ Validates userId parameter
   - ✅ Throws GraphQLError on service error
   - ✅ Handles different notification types correctly

**Resolvers to Update**:
- `src/resolvers/notification/notificationsResolver.ts`
- `src/resolvers/notification/unreadNotificationsCountResolver.ts`

**Estimated Time**: 3-4 hours

---

### Phase 5: Auction Resolvers (Optional - May Already Be Correct) 🤔

**Assessment Needed**:
- Check if auction resolvers already use proper type transformations
- Auction service is from separate `@social-media-app/auction-dal` package
- May already have proper structure

**If Needed, Create**:
1. **AuctionAdapter** (`src/infrastructure/adapters/AuctionAdapter.ts`)
   - `getAuctions(args)` → Transform to `AuctionConnection`
   - `getAuctionById(auctionId)` → Transform to GraphQL `Auction`
   - `getBidHistory(auctionId)` → Transform to `BidConnection`

**Type Transformations Needed**:
- Extend TypeMapper with `toGraphQLAuction(domainAuction)`
- Extend TypeMapper with `toGraphQLBid(domainBid)`
- Handle auction status transformations
- Handle bid amount formatting

**Tests** (TDD - RED → GREEN → REFACTOR):
1. `AuctionAdapter.test.ts`:
   - ✅ Fetches auctions and transforms to GraphQL types
   - ✅ Fetches auction by ID
   - ✅ Fetches bid history and transforms to BidConnection
   - ✅ Handles pagination
   - ✅ Validates auctionId parameter
   - ✅ Throws GraphQLError on service error

**Resolvers to Update** (if needed):
- `src/resolvers/auction/auctionsResolver.ts`
- `src/resolvers/auction/auctionResolver.ts`
- `src/resolvers/auction/bidsResolver.ts`

**Estimated Time**: 2-3 hours (if needed)

---

## Testing Standards for All Adapters

Following the pattern established in `CommentAdapter.test.ts`:

### 1. Test Structure
```typescript
describe('[Entity]Adapter', () => {
  let adapter: [Entity]Adapter;
  let mock[Entity]Service: { /* mocked methods */ };

  beforeEach(() => {
    // Create mock service
    mock[Entity]Service = {
      methodName: vi.fn(),
    };
    
    // Create adapter with mock
    adapter = new [Entity]Adapter(mock[Entity]Service as any);
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('fetches [entity] and transforms to GraphQL types', async () => {
      // Arrange: Mock domain data from DAL
      const domain[Entity]: Domain[Entity][] = [/* ... */];
      const dalResponse = {
        [entity]s: domain[Entity]s,
        hasMore: false,
        nextCursor: undefined,
      };
      mock[Entity]Service.methodName.mockResolvedValue(dalResponse);

      // Act: Call adapter
      const result = await adapter.methodName({ /* args */ });

      // Assert: Verify GraphQL Connection structure
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('[entity]-1');
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(mock[Entity]Service.methodName).toHaveBeenCalledWith(/* expected args */);
    });

    it('handles pagination correctly with cursor', async () => {
      // Test cursor passing and hasNextPage handling
    });

    it('handles empty results', async () => {
      // Test empty array handling
    });

    it('throws GraphQLError on service error', async () => {
      // Test error handling and transformation
    });

    it('validates [parameter] parameter', async () => {
      // Test input validation
    });

    it('applies default value for [parameter]', async () => {
      // Test default parameter handling
    });
  });
});
```

### 2. TypeScript Standards

**Strict Type Safety**:
- ✅ No `any` types except in test mocks
- ✅ Use type imports (`import type`)
- ✅ Explicit return types on all adapter methods
- ✅ Type assertions only where necessary with comments

**Type Transformations**:
```typescript
// Domain type (from @social-media-app/shared)
import type { Comment as DomainComment } from '@social-media-app/shared';

// GraphQL type (from generated schema)
import type { Comment as GraphQLComment } from '../../schema/generated/types';
```

**Generic Connection Builder**:
```typescript
static toGraphQLConnection<TDomain, TGraphQL>(
  items: TDomain[],
  transformer: (item: TDomain) => TGraphQL,
  options: PaginationOptions
): Connection
```

### 3. Test Coverage Requirements

Each adapter must have **100% coverage** of:
- ✅ All public methods
- ✅ Input validation
- ✅ Error handling paths
- ✅ Default parameter handling
- ✅ Edge cases (empty results, pagination boundaries)

### 4. Documentation Standards

**Adapter Classes**:
```typescript
/**
 * [Entity]Adapter
 *
 * Adapter that bridges the gap between DAL services (domain types) and
 * GraphQL resolvers (GraphQL types). This adapter:
 *
 * 1. Calls DAL [entity] service methods
 * 2. Transforms domain types to GraphQL types using TypeMapper
 * 3. Handles errors and converts them to GraphQLErrors
 * 4. Validates input parameters
 *
 * @example
 * ```typescript
 * const adapter = new [Entity]Adapter([entity]Service);
 * const connection = await adapter.get[Entity]s({ first: 20 });
 * ```
 */
```

**Methods**:
```typescript
/**
 * Get paginated [entities] for [context]
 *
 * @param args - Query arguments
 * @param args.[param] - Description
 * @returns GraphQL [Entity]Connection with edges and pageInfo
 * @throws GraphQLError if validation fails or service errors occur
 *
 * @example
 * ```typescript
 * const connection = await adapter.get[Entity]s({
 *   first: 10,
 *   after: 'cursor-abc',
 * });
 * ```
 */
```

---

## Total Estimated Time

- **Phase 1 (Feed)**: 3-4 hours
- **Phase 2 (Post)**: 3-4 hours
- **Phase 3 (Profile)**: 2-3 hours
- **Phase 4 (Notification)**: 3-4 hours
- **Phase 5 (Auction)**: 2-3 hours (if needed)

**Total**: ~13-18 hours (approximately 2-3 days of focused work)

---

## Success Criteria

For each phase:
1. ✅ All adapter tests passing (100% coverage)
2. ✅ Resolvers updated to use adapters
3. ✅ No TypeScript errors
4. ✅ Integration tests passing
5. ✅ Documentation complete

Overall:
1. ✅ All resolvers follow hexagonal architecture pattern
2. ✅ Type transformations centralized in TypeMapper
3. ✅ Clean separation between domain and interface layers
4. ✅ Easy to test each layer independently
5. ✅ Ready for production deployment

---

## Next Steps

1. **Execute commits** in order (1-7)
2. **Start Phase 1** (Feed Adapters) following TDD:
   - Write tests first (RED)
   - Implement adapter (GREEN)
   - Refactor and clean up (REFACTOR)
3. **Continue with Phases 2-5** following same pattern
4. **Run full test suite** after each phase
5. **Update documentation** as you go

This approach ensures:
- Clean git history with logical commits
- Each commit is atomic and reversible
- TDD discipline throughout
- High code quality and test coverage
- Production-ready code at each step