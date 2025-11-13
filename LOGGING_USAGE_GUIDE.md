# Logging Usage Guide

## How to See Logs

### Development Mode
Logs appear in the terminal where you run `pnpm dev`:

```bash
cd apps/web
pnpm dev
```

When you interact with the app, you'll see pretty-printed logs like:
```
[14:09:45] INFO: Fetching explore feed
    app: "social-media-web"
[14:09:45] INFO: Explore feed loaded
    app: "social-media-web"
    count: 15
[14:09:46] INFO: Liking post
    app: "social-media-app"
    postId: "post-123"
[14:09:46] INFO: Server Action likePost
    type: "server-action"
    action: "likePost"
    postId: "post-123"
    likesCount: 11
    result: "success"
```

### Production Mode
To see JSON logs (what production looks like):

```bash
# Build and run in production mode
NODE_ENV=production pnpm build
NODE_ENV=production pnpm start
```

Output will be JSON (for log aggregation):
```json
{"level":"info","time":1736780985,"app":"social-media-web","msg":"Fetching explore feed"}
{"level":"info","time":1736780985,"app":"social-media-web","count":15,"msg":"Explore feed loaded"}
```

### Filtering Logs by Level

Set the `LOG_LEVEL` environment variable:

```bash
# Only show errors
LOG_LEVEL=error pnpm dev

# Show debug and above
LOG_LEVEL=debug pnpm dev

# Default (info and above)
LOG_LEVEL=info pnpm dev
```

Available levels (lowest to highest):
- `trace` - Very detailed (rarely used)
- `debug` - Development debugging
- `info` - Important events (default)
- `warn` - Warnings
- `error` - Errors
- `fatal` - Fatal errors

## What's Already Logged

### ✅ Currently Logging:

1. **Server Actions** (app/actions/posts.ts)
   - Like/unlike operations
   - Success/failure with context

2. **Server Components** (pages)
   - Feed fetching (home, explore)
   - Success with counts
   - Errors with context

3. **API Routes** (auth)
   - Registration requests
   - Validation
   - Success/failure
   - Auth events

4. **Auth System**
   - JWT configuration
   - Session errors
   - Cookie setting

## When to Add Logging

### ✅ DO Log:

1. **Entry points** - API routes, Server Actions, page loads
2. **External calls** - GraphQL queries, database operations, 3rd party APIs
3. **State changes** - User registration, post creation, follow/unfollow
4. **Errors** - Always log errors with context
5. **Business logic decisions** - "User is admin", "Post is private"
6. **Performance bottlenecks** - Slow queries, large operations

### ❌ DON'T Log:

1. **Every function call** - Too noisy
2. **Sensitive data** - Passwords, tokens, API keys (always redact)
3. **Inside loops** - Creates log spam
4. **Utility functions** - Unless they fail
5. **Client-side UI updates** - Use browser DevTools instead

## Strategic Logging Pattern

```typescript
export async function createPost(data: CreatePostInput) {
  // LOG: Entry point with key data
  logger.info({ userId: data.userId }, 'Creating post');

  try {
    // LOG: Before external call
    logger.debug({ userId: data.userId, caption: data.caption }, 'Validating post data');

    const validated = validatePost(data);

    // LOG: Before database operation
    logger.debug({ userId: data.userId }, 'Saving post to database');

    const post = await db.posts.create(validated);

    // LOG: Success with result
    logger.info({ userId: data.userId, postId: post.id }, 'Post created successfully');

    return post;
  } catch (error) {
    // LOG: Always log errors with context
    logger.error({ userId: data.userId, error }, 'Failed to create post');
    throw error;
  }
}
```

## Examples by Use Case

### Example 1: GraphQL Query
```typescript
export default async function PostPage({ params }: { params: { id: string } }) {
  logger.info({ postId: params.id }, 'Fetching post details');

  try {
    const client = await getGraphQLClient();
    const data = await client.request(GET_POST, { id: params.id });

    logger.info({ postId: params.id }, 'Post loaded successfully');
    return <PostDetail post={data.post} />;
  } catch (error) {
    logger.error({ postId: params.id, error }, 'Failed to fetch post');
    return <ErrorPage />;
  }
}
```

### Example 2: Server Action with Validation
```typescript
export async function followUser(targetUserId: string) {
  const session = await getServerSession();

  logger.info({ userId: session?.userId, targetUserId }, 'Follow user request');

  if (!session) {
    logger.warn({ targetUserId }, 'Unauthorized follow attempt');
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const result = await graphql.mutate(FOLLOW_USER, { targetUserId });

    logger.info(
      { userId: session.userId, targetUserId },
      'User followed successfully'
    );

    return { success: true };
  } catch (error) {
    logger.error(
      { userId: session.userId, targetUserId, error },
      'Failed to follow user'
    );
    return { success: false, error: 'Failed to follow' };
  }
}
```

### Example 3: Business Logic with Decision Points
```typescript
export async function deletePost(postId: string) {
  const session = await getServerSession();
  logger.info({ userId: session?.userId, postId }, 'Delete post request');

  const post = await getPost(postId);

  // LOG: Authorization decision
  if (post.userId !== session?.userId) {
    logger.warn(
      { userId: session?.userId, postId, ownerId: post.userId },
      'Unauthorized delete attempt'
    );
    return { success: false, error: 'Forbidden' };
  }

  // LOG: Before destructive operation
  logger.info({ userId: session.userId, postId }, 'Deleting post');

  await db.posts.delete(postId);

  logger.info({ userId: session.userId, postId }, 'Post deleted');
  return { success: true };
}
```

## Structured Context

Always add relevant context to logs:

```typescript
// ❌ BAD - No context
logger.info('Post created');

// ✅ GOOD - With context
logger.info({ userId, postId, caption: caption.substring(0, 50) }, 'Post created');

// ✅ GOOD - With error
logger.error({ userId, postId, error }, 'Failed to create post');

// ✅ GOOD - With timing
const start = Date.now();
await heavyOperation();
logger.info({ duration: Date.now() - start }, 'Heavy operation completed');
```

## Tips

1. **Use child loggers** for related operations:
   ```typescript
   const reqLogger = createLogger({ requestId: req.headers.get('x-request-id') });
   reqLogger.info('Processing request'); // Automatically includes requestId
   reqLogger.error('Request failed');
   ```

2. **Log request/response for debugging**:
   ```typescript
   logger.debug({ body: { ...body, password: '[REDACTED]' } }, 'Request received');
   ```

3. **Use appropriate levels**:
   - `debug` - Only in development
   - `info` - Important business events
   - `warn` - Recoverable issues
   - `error` - Failures that need attention

4. **Performance**: Pino is extremely fast, but avoid logging inside tight loops

5. **Privacy**: Always redact sensitive data:
   ```typescript
   logger.info({
     email: user.email,
     password: '[REDACTED]',
     token: '[REDACTED]'
   }, 'User registered');
   ```

## Next Steps

- Add logging to remaining Server Actions (comment, follow, create post)
- Add request ID middleware for tracing
- Integrate with monitoring platform (Phase 4)
- Add OpenTelemetry for distributed tracing (Phase 2)
