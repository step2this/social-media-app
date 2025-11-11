# Phase 2: Posts Module Migration to Pothos

**Branch:** `claude/phase-2-posts-migration-011CV2JGXbaX37TLLMs7PbdC`
**Status:** 🚧 In Progress

---

## Scope: What We're Migrating

### Types
- ✅ `Post` - Main post type with author, caption, images, counts
- ✅ `CreatePostPayload` - Response for createPost mutation
- ✅ `PostConnection` - Relay-style pagination wrapper
- ✅ `PostEdge` - Pagination edge type
- ✅ `DeleteResponse` - Shared response type

### Input Types
- ✅ `CreatePostInput` - { fileType, caption? }
- ✅ `UpdatePostInput` - { caption? }

### Queries
- ✅ `post(id: ID!): Post` - Get single post by ID
- ✅ `userPosts(handle: String!, limit: Int, cursor: String): PostConnection!` - Get user's posts with pagination

### Mutations
- ✅ `createPost(input: CreatePostInput!): CreatePostPayload!` - Create new post (requires auth)
- ✅ `updatePost(id: ID!, input: UpdatePostInput!): Post!` - Update post caption (requires auth + ownership)
- ✅ `deletePost(id: ID!): DeleteResponse!` - Delete post (requires auth + ownership)

---

## Implementation Plan

### 1. Create Pothos Types (~30 min)
**File:** `src/schema/pothos/types/posts.ts`

```typescript
// DeleteResponse (shared)
builder.objectType('DeleteResponse', {
  fields: (t) => ({
    success: t.boolean({ required: true }),
  }),
});

// Post type
builder.objectType('Post', {
  fields: (t) => ({
    id: t.id({ required: true }),
    userId: t.id({ required: true }),
    author: t.field({ type: 'PublicProfile', required: true }),
    caption: t.string(),
    imageUrl: t.string({ required: true }),
    thumbnailUrl: t.string({ required: true }),
    likesCount: t.int({ required: true }),
    commentsCount: t.int({ required: true }),
    isLiked: t.boolean(),
    createdAt: t.string({ required: true }),
    updatedAt: t.string({ required: true }),
    comments: t.field({
      type: 'CommentConnection',
      required: true,
      args: {
        first: t.arg.int(),
        after: t.arg.string(),
      },
    }),
  }),
});

// CreatePostPayload
builder.objectType('CreatePostPayload', {
  fields: (t) => ({
    post: t.field({ type: 'Post', required: true }),
    uploadUrl: t.string({ required: true }),
    thumbnailUploadUrl: t.string({ required: true }),
  }),
});

// PostConnection & PostEdge for pagination
builder.objectType('PostEdge', {
  fields: (t) => ({
    cursor: t.string({ required: true }),
    node: t.field({ type: 'Post', required: true }),
  }),
});

builder.objectType('PostConnection', {
  fields: (t) => ({
    edges: t.field({ type: ['PostEdge'], required: true }),
    pageInfo: t.field({ type: 'PageInfo', required: true }),
  }),
});
```

### 2. Create Pothos Queries (~20 min)
**File:** `src/schema/pothos/queries/posts.ts`

```typescript
export const postsQueries = (builder: PothosSchemaTypes.SchemaBuilder) => {
  // post query - public, no auth required
  builder.queryField('post', (t) =>
    t.field({
      type: 'Post',
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (parent, args, context) => {
        const { container } = context;
        const getPost = container.resolve('getPost');
        return await getPost.execute({ postId: args.id as string });
      },
    })
  );

  // userPosts query - public, no auth required
  builder.queryField('userPosts', (t) =>
    t.field({
      type: 'PostConnection',
      required: true,
      args: {
        handle: t.arg.string({ required: true }),
        limit: t.arg.int(),
        cursor: t.arg.string(),
      },
      resolve: async (parent, args, context) => {
        const { container } = context;
        const getUserPosts = container.resolve('getUserPosts');
        return await getUserPosts.execute({
          handle: args.handle,
          limit: args.limit,
          cursor: args.cursor,
        });
      },
    })
  );
};
```

### 3. Create Pothos Mutations (~30 min)
**File:** `src/schema/pothos/mutations/posts.ts`

```typescript
export const postsMutations = (builder: PothosSchemaTypes.SchemaBuilder) => {
  // createPost - requires authentication
  builder.mutationField('createPost', (t) =>
    t.field({
      type: 'CreatePostPayload',
      required: true,
      authScopes: { authenticated: true },
      args: {
        input: t.arg({
          type: builder.inputType('CreatePostInput', {
            fields: (t) => ({
              fileType: t.string({ required: true }),
              caption: t.string(),
            }),
          }),
          required: true,
        }),
      },
      resolve: async (parent, args, context) => {
        const { container, userId } = context;
        const createPost = container.resolve('createPost');
        return await createPost.execute({
          userId: userId!,
          fileType: args.input.fileType,
          caption: args.input.caption,
        });
      },
    })
  );

  // updatePost - requires authentication + ownership check in use case
  builder.mutationField('updatePost', (t) =>
    t.field({
      type: 'Post',
      required: true,
      authScopes: { authenticated: true },
      args: {
        id: t.arg.id({ required: true }),
        input: t.arg({
          type: builder.inputType('UpdatePostInput', {
            fields: (t) => ({
              caption: t.string(),
            }),
          }),
          required: true,
        }),
      },
      resolve: async (parent, args, context) => {
        const { container, userId } = context;
        const updatePost = container.resolve('updatePost');
        return await updatePost.execute({
          userId: userId!,
          postId: args.id as string,
          caption: args.input.caption,
        });
      },
    })
  );

  // deletePost - requires authentication + ownership check in use case
  builder.mutationField('deletePost', (t) =>
    t.field({
      type: 'DeleteResponse',
      required: true,
      authScopes: { authenticated: true },
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (parent, args, context) => {
        const { container, userId } = context;
        const deletePost = container.resolve('deletePost');
        return await deletePost.execute({
          userId: userId!,
          postId: args.id as string,
        });
      },
    })
  );
};
```

### 4. Write Integration Tests (~45 min)
**File:** `src/schema/pothos/__tests__/posts-integration.test.ts`

Test coverage:
- ✅ Post queries (authenticated/unauthenticated)
- ✅ Create post (authenticated/unauthenticated)
- ✅ Update post (owner/non-owner)
- ✅ Delete post (owner/non-owner)
- ✅ UserPosts pagination
- ✅ Type validation

### 5. Remove Old Tests (~15 min)
- Remove Posts sections from `__tests__/resolvers/Mutation.test.ts`
- Remove Posts sections from `__tests__/schema.test.ts`
- Keep Posts use-case tests (business logic)

### 6. Update SDL Schema (~5 min)
- Remove Posts types, queries, mutations from `schema.graphql`
- Add comments noting migration to Pothos

---

## Testing Strategy

**Behavioral Tests (following Phase 1 pattern):**
- Test through `executeOperation`, not direct resolver calls
- No mocks, use dependency injection
- DRY with shared helpers
- Test WHAT code does, not HOW

**Example test structure:**
```typescript
describe('Post Operations', () => {
  const createPost = async (server, input, userId) => { ... };

  it('should allow authenticated users to create posts', async () => {
    // Test behavior, not implementation
  });

  it('should reject unauthenticated post creation', async () => {
    // Test auth scope enforcement
  });

  it('should allow owners to update their posts', async () => {
    // Test ownership
  });

  it('should reject non-owners from updating posts', async () => {
    // Test authorization
  });
});
```

---

## Success Criteria

- [  ] All Pothos types created and building
- [  ] All Pothos queries working
- [  ] All Pothos mutations working
- [  ] Integration tests written and passing
- [  ] Old SDL tests removed
- [  ] No new test regressions
- [  ] Documentation updated
- [  ] Schema changes in SDL

---

## Estimated Time: 2-3 hours

**Breakdown:**
- Types: 30 min
- Queries: 20 min
- Mutations: 30 min
- Tests: 45 min
- Cleanup: 20 min
- Validation: 15 min

---

**Next Phase:** Comments Module Migration
