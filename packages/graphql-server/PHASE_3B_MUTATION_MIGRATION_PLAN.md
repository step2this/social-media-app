# Phase 3b: Mutation Resolver Migration - Implementation Plan

## Current Status (as of commit 7428386)

### ✅ Completed Work

**Phase 1**: Query resolver type safety migration
- Generated GraphQL types with codegen
- Created helper functions (executeUseCase, executeOptionalUseCase)
- Enhanced ErrorFactory with fromUseCaseError
- Fixed withAuth HOC type signature
- Migrated all 14 Query resolvers to direct implementation
- All tests passing (440 tests)

**Phase 2**: Factory pattern cleanup
- Deleted 33 factory files (2,660 lines removed)
- Removed entire `src/resolvers/` directory tree
- All Query resolvers now in single file `src/schema/resolvers/Query.ts`

**Phase 3a**: Mutation use case creation
- Created 18 mutation use cases (1,326 lines added)
- All use cases follow consistent pattern
- Imports added to `awilix-container.ts`

### 📍 Current State

**Branch**: `claude/graphql-resolver-phase1-migration-011CUw5Wz5A5wz19nUmNiHcA`

**Files Modified**:
- ✅ `src/application/use-cases/post/CreatePost.ts` (new)
- ✅ `src/application/use-cases/post/UpdatePost.ts` (new)
- ✅ `src/application/use-cases/post/DeletePost.ts` (new)
- ✅ `src/application/use-cases/like/LikePost.ts` (new)
- ✅ `src/application/use-cases/like/UnlikePost.ts` (new)
- ✅ `src/application/use-cases/follow/FollowUser.ts` (new)
- ✅ `src/application/use-cases/follow/UnfollowUser.ts` (new)
- ✅ `src/application/use-cases/comment/CreateComment.ts` (new)
- ✅ `src/application/use-cases/comment/DeleteComment.ts` (new)
- ✅ `src/application/use-cases/profile/UpdateProfile.ts` (new)
- ✅ `src/application/use-cases/profile/GetProfilePictureUploadUrl.ts` (new)
- ✅ `src/application/use-cases/notification/MarkNotificationAsRead.ts` (new)
- ✅ `src/application/use-cases/notification/MarkAllNotificationsAsRead.ts` (new)
- ✅ `src/application/use-cases/notification/DeleteNotification.ts` (new)
- ✅ `src/application/use-cases/feed/MarkFeedItemsAsRead.ts` (new)
- ✅ `src/application/use-cases/auction/CreateAuction.ts` (new)
- ✅ `src/application/use-cases/auction/ActivateAuction.ts` (new)
- ✅ `src/application/use-cases/auction/PlaceBid.ts` (new)
- 🟡 `src/infrastructure/di/awilix-container.ts` (imports added, registration pending)
- ⏳ `src/schema/resolvers/Mutation.ts` (needs migration)

## 🎯 Remaining Work for Phase 3b

### Task 1: Register Mutation Use Cases in DI Container

**File**: `src/infrastructure/di/awilix-container.ts`

**What to do**:
1. Add mutation use cases to `GraphQLContainer` interface
2. Register use cases in container with factory functions (since they need services object)
3. Add `feedService` to registered services

**Implementation**:

```typescript
// In GraphQLContainer interface (around line 84), add after query use cases:

  // Mutation Use Cases
  createPost: CreatePost;
  updatePost: UpdatePost;
  deletePost: DeletePost;
  likePost: LikePost;
  unlikePost: UnlikePost;
  followUser: FollowUser;
  unfollowUser: UnfollowUser;
  createComment: CreateComment;
  deleteComment: DeleteComment;
  updateProfile: UpdateProfile;
  getProfilePictureUploadUrl: GetProfilePictureUploadUrl;
  markNotificationAsRead: MarkNotificationAsRead;
  markAllNotificationsAsRead: MarkAllNotificationsAsRead;
  deleteNotification: DeleteNotification;
  markFeedItemsAsRead: MarkFeedItemsAsRead;
  createAuction: CreateAuction;
  activateAuction: ActivateAuction;
  placeBid: PlaceBid;
```

```typescript
// In Layer 0 (around line 148), add feedService:
container.register({
  profileService: asValue(context.services.profileService),
  postService: asValue(context.services.postService),
  commentService: asValue(context.services.commentService),
  followService: asValue(context.services.followService),
  likeService: asValue(context.services.likeService),
  notificationService: asValue(context.services.notificationService),
  auctionService: asValue(context.services.auctionService),
  feedService: asValue(context.services.feedService), // ADD THIS LINE
});
```

```typescript
// In Layer 2 (after line 221), add mutation use case registrations:

// Mutation use cases need services object, use factory functions
container.register({
  // Post mutations
  createPost: asValue(new CreatePost({
    profileService: context.services.profileService,
    postService: context.services.postService,
  })),
  updatePost: asValue(new UpdatePost({
    postService: context.services.postService,
  })),
  deletePost: asValue(new DeletePost({
    postService: context.services.postService,
  })),

  // Like mutations
  likePost: asValue(new LikePost({
    likeService: context.services.likeService,
  })),
  unlikePost: asValue(new UnlikePost({
    likeService: context.services.likeService,
  })),

  // Follow mutations
  followUser: asValue(new FollowUser({
    followService: context.services.followService,
  })),
  unfollowUser: asValue(new UnfollowUser({
    followService: context.services.followService,
  })),

  // Comment mutations
  createComment: asValue(new CreateComment({
    profileService: context.services.profileService,
    postService: context.services.postService,
    commentService: context.services.commentService,
  })),
  deleteComment: asValue(new DeleteComment({
    commentService: context.services.commentService,
  })),

  // Profile mutations
  updateProfile: asValue(new UpdateProfile({
    profileService: context.services.profileService,
  })),
  getProfilePictureUploadUrl: asValue(new GetProfilePictureUploadUrl({
    profileService: context.services.profileService,
  })),

  // Notification mutations
  markNotificationAsRead: asValue(new MarkNotificationAsRead({
    notificationService: context.services.notificationService,
  })),
  markAllNotificationsAsRead: asValue(new MarkAllNotificationsAsRead({
    notificationService: context.services.notificationService,
  })),
  deleteNotification: asValue(new DeleteNotification({
    notificationService: context.services.notificationService,
  })),

  // Feed mutations
  markFeedItemsAsRead: asValue(new MarkFeedItemsAsRead({
    feedService: context.services.feedService,
  })),

  // Auction mutations
  createAuction: asValue(new CreateAuction({
    profileService: context.services.profileService,
    auctionService: context.services.auctionService,
  })),
  activateAuction: asValue(new ActivateAuction({
    auctionService: context.services.auctionService,
  })),
  placeBid: asValue(new PlaceBid({
    auctionService: context.services.auctionService,
  })),
});
```

### Task 2: Migrate Mutation.ts Resolvers

**File**: `src/schema/resolvers/Mutation.ts`

**Current state**: Mutations directly use `context.services` with manual auth checks

**Target state**: Mutations use `context.container.resolve()` with withAuth HOC and ErrorFactory

**Pattern to apply**:

```typescript
// BEFORE (current):
createPost: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('You must be authenticated to create a post', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const userProfile = await context.services.profileService.getProfileById(context.userId);
  // ... more service calls
  return result as any;
},

// AFTER (target):
createPost: withAuth(async (_parent, args, context) => {
  return executeUseCase(
    context.container.resolve('createPost'),
    {
      userId: UserId(context.userId),
      fileType: args.input.fileType as ImageFileType,
      caption: args.input.caption ?? undefined,
    }
  );
}),
```

**Steps for each mutation**:

1. **Add imports** at top of file:
```typescript
import { withAuth } from '../../infrastructure/resolvers/withAuth.js';
import {
  executeUseCase,
  executeOptionalUseCase,
} from '../../infrastructure/resolvers/helpers/useCase.js';
import { ErrorFactory } from '../../infrastructure/errors/ErrorFactory.js';
import { UserId, PostId, Cursor } from '../../shared/types/index.js';
```

2. **For authenticated mutations**:
   - Wrap with `withAuth(async (_parent, args, context) => { ... })`
   - Remove manual `if (!context.userId)` check
   - Use `context.container.resolve('useCaseName')`
   - Call `executeUseCase(useCase, input)`
   - TypeScript knows `context.userId` is string (not null) inside withAuth

3. **For public mutations** (register, login, refreshToken):
   - Keep as regular async functions
   - Use `executeUseCase` or handle Result manually
   - Use `ErrorFactory` instead of `new GraphQLError()`

4. **For mutations returning complex types**:
   - May need `as any` type assertions (like Query resolvers)
   - This is acceptable - runtime types are compatible

### Task 3: Handle Special Cases

**Auth mutations** (register, login, refreshToken, logout):
- These don't have use cases yet (they use `context.services.authService` directly)
- Option 1: Create auth use cases
- Option 2: Keep them as-is for now (focus on other mutations first)
- **Recommendation**: Skip auth mutations for Phase 3b, tackle separately

**Zod validation** (createAuction, placeBid):
- Keep existing Zod validation in resolvers
- Or move into use cases (better)
- Use cases already receive the data, so validation should be there

**@ts-ignore comments**:
- `markNotificationAsRead` has `@ts-ignore` comment
- `createAuction`, `activateAuction` have `@ts-ignore` comments
- Keep these for now, address in type refinement phase

### Task 4: Testing

**Run tests**:
```bash
pnpm test --run
```

**Expected results**:
- Existing passing tests should still pass
- Some mutation tests may fail if they mock `context.services` directly
- Integration tests should still work

**If tests fail**:
- Check if test mocks need updating to use `context.container`
- May need to update test setup to include container

### Task 5: Commit Strategy

**Commit 1**: Register use cases in DI container
```bash
git add src/infrastructure/di/awilix-container.ts
git commit -m "feat(graphql-server): register mutation use cases in DI container (Phase 3b)"
```

**Commit 2**: Migrate Mutation.ts resolvers
```bash
git add src/schema/resolvers/Mutation.ts
git commit -m "feat(graphql-server): migrate Mutation resolvers to use case pattern (Phase 3b)"
```

**Commit 3**: Fix any test failures
```bash
git add <test-files>
git commit -m "test(graphql-server): update mutation tests for use case pattern"
```

## 📊 Migration Checklist

### Post Mutations
- [ ] `createPost` - withAuth + executeUseCase
- [ ] `updatePost` - withAuth + executeUseCase
- [ ] `deletePost` - withAuth + executeUseCase

### Social Mutations
- [ ] `likePost` - withAuth + executeUseCase
- [ ] `unlikePost` - withAuth + executeUseCase
- [ ] `followUser` - withAuth + executeUseCase (has self-follow check in use case)
- [ ] `unfollowUser` - withAuth + executeUseCase

### Comment Mutations
- [ ] `createComment` - withAuth + executeUseCase
- [ ] `deleteComment` - withAuth + executeUseCase

### Profile Mutations
- [ ] `updateProfile` - withAuth + executeUseCase
- [ ] `getProfilePictureUploadUrl` - withAuth + executeUseCase

### Notification Mutations
- [ ] `markNotificationAsRead` - withAuth + executeUseCase (keep @ts-ignore)
- [ ] `markAllNotificationsAsRead` - withAuth + executeUseCase
- [ ] `deleteNotification` - withAuth + executeUseCase

### Feed Mutations
- [ ] `markFeedItemsAsRead` - withAuth + executeUseCase

### Auction Mutations
- [ ] `createAuction` - withAuth + executeUseCase (keep Zod validation & @ts-ignore)
- [ ] `activateAuction` - withAuth + executeUseCase (keep @ts-ignore)
- [ ] `placeBid` - withAuth + executeUseCase (keep Zod validation)

### Auth Mutations (SKIP for Phase 3b)
- [ ] `register` - Keep as-is (no use case)
- [ ] `login` - Keep as-is (no use case)
- [ ] `refreshToken` - Keep as-is (no use case)
- [ ] `logout` - Keep as-is (no use case)

## 🔍 Code Examples

### Example 1: Simple Mutation (deletePost)

**Before**:
```typescript
deletePost: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('You must be authenticated to delete a post', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const success = await context.services.postService.deletePost(args.id, context.userId);

  if (!success) {
    throw new GraphQLError('Post not found or you do not have permission to delete it', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  return { success: true };
},
```

**After**:
```typescript
deletePost: withAuth(async (_parent, args, context) => {
  return executeUseCase(
    context.container.resolve('deletePost'),
    {
      postId: PostId(args.id),
      userId: UserId(context.userId),
    }
  );
}),
```

### Example 2: Complex Mutation (createComment)

**Before**:
```typescript
createComment: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('You must be authenticated to create a comment', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const profile = await context.services.profileService.getProfileById(context.userId);
  if (!profile) {
    throw new GraphQLError('User profile not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  const post = await context.services.postService.getPostById(args.input.postId);
  if (!post) {
    throw new GraphQLError('Post not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  const comment = await context.services.commentService.createComment(
    context.userId,
    args.input.postId,
    profile.handle,
    args.input.content,
    post.userId,
    `POST#${post.createdAt}#${post.id}`
  );

  return comment as any;
},
```

**After**:
```typescript
createComment: withAuth(async (_parent, args, context) => {
  const result = await executeUseCase(
    context.container.resolve('createComment'),
    {
      userId: UserId(context.userId),
      postId: PostId(args.input.postId),
      content: args.input.content,
    }
  );
  return result as any; // Type assertion for structural compatibility
}),
```

### Example 3: Mutation with Validation (createAuction)

**Before**:
```typescript
createAuction: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // ✅ Validate input with Zod schema (business rules)
  const validationResult = CreateAuctionRequestSchema.safeParse(args.input);

  if (!validationResult.success) {
    throw new GraphQLError('Validation failed', {
      extensions: {
        code: 'BAD_USER_INPUT',
        validationErrors: validationResult.error.format(),
      },
    });
  }

  const validatedInput = validationResult.data;

  // Generate presigned URLs, create auction...
  return { auction, uploadUrl };
},
```

**After** (Option A - Keep validation in resolver):
```typescript
// @ts-ignore - DAL Auction type differs from GraphQL Auction type
createAuction: withAuth(async (_parent, args, context) => {
  // ✅ Validate input with Zod schema (business rules)
  const validationResult = CreateAuctionRequestSchema.safeParse(args.input);

  if (!validationResult.success) {
    throw ErrorFactory.badRequest('Validation failed', {
      validationErrors: validationResult.error.format(),
    });
  }

  const validatedInput = validationResult.data;

  return executeUseCase(
    context.container.resolve('createAuction'),
    {
      userId: UserId(context.userId),
      ...validatedInput,
    }
  );
}),
```

**After** (Option B - Move validation to use case):
```typescript
// @ts-ignore - DAL Auction type differs from GraphQL Auction type
createAuction: withAuth(async (_parent, args, context) => {
  return executeUseCase(
    context.container.resolve('createAuction'),
    {
      userId: UserId(context.userId),
      ...args.input,
    }
  );
}),
```
// Then add validation inside CreateAuction.execute()

## ⚠️ Important Notes

1. **Type Assertions**: Some mutations may need `as any` type assertions for return values (like Query resolvers). This is acceptable - the types are structurally compatible at runtime.

2. **Auth Mutations**: Skip register, login, refreshToken, logout for Phase 3b. These use `context.services.authService` directly and don't have use cases yet.

3. **Zod Validation**: Current approach keeps Zod validation in resolvers. Future optimization: move to use cases.

4. **feedService**: Must be added to container registration (currently missing).

5. **Error Handling**: Use cases return Result<T>, so executeUseCase handles errors. No need for try/catch in resolvers.

6. **withAuth**: Automatically narrows `context.userId` from `string | null` to `string`, so no need for `context.userId!` inside withAuth.

7. **Branded Types**: Use `UserId()`, `PostId()`, `Cursor()` etc. to wrap string IDs when passing to use cases.

## 🎯 Success Criteria

Phase 3b is complete when:

✅ All mutation use cases registered in DI container
✅ All 18 mutations migrated to use case pattern (auth mutations excepted)
✅ All mutations use `withAuth` HOC (where appropriate)
✅ All mutations use `ErrorFactory` instead of raw GraphQLError
✅ TypeScript builds without errors
✅ Existing tests still pass (or updated to work with new pattern)
✅ All changes committed and pushed

## 📝 Next Session Quick Start

1. Pull latest from branch
2. Open `src/infrastructure/di/awilix-container.ts`
3. Follow Task 1 to register use cases
4. Open `src/schema/resolvers/Mutation.ts`
5. Follow Task 2 to migrate resolvers
6. Run `pnpm test --run` to verify
7. Commit and push

## 🔗 Related Files

- `src/infrastructure/di/awilix-container.ts` - DI container setup
- `src/schema/resolvers/Mutation.ts` - Mutation resolvers to migrate
- `src/schema/resolvers/Query.ts` - Example of completed migration pattern
- `src/infrastructure/resolvers/helpers/useCase.ts` - Helper functions
- `src/infrastructure/errors/ErrorFactory.ts` - Error utilities
- `src/infrastructure/resolvers/withAuth.ts` - Auth HOC
- All use case files in `src/application/use-cases/*/`

## 📚 Architecture Reference

**Layers** (bottom to top):
1. DAL Services (`context.services.*`) - Data access
2. Use Cases (`container.resolve('*')`) - Business logic
3. Resolvers (`Mutation.*`) - GraphQL interface

**Flow**:
```
Resolver (withAuth)
  → resolve use case from container
  → executeUseCase(useCase, input)
    → useCase.execute(input)
      → services.*.method()
      → return Result<T>
    → check result.success
    → throw ErrorFactory on failure
    → return result.data on success
```

---

**Document created**: 2025-11-08
**Last commit**: 7428386 (Phase 3a complete)
**Branch**: `claude/graphql-resolver-phase1-migration-011CUw5Wz5A5wz19nUmNiHcA`
