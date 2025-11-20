# Test Data Builders

A type-safe, production-ready test data builder system for generating realistic test data using your DAL services. Built with Zod schemas, TypeScript, and Awilix dependency injection.

## Features

- ✅ **Type-Safe**: Full TypeScript support with Zod schema validation
- ✅ **DAL Integration**: Uses real service layer methods to preserve business logic
- ✅ **Fluent API**: Chainable builder pattern for easy configuration
- ✅ **Realistic Data**: Powered by @faker-js/faker for authentic test data
- ✅ **Batch Operations**: Efficient concurrent batch creation
- ✅ **Scenario Builders**: High-level presets for common test patterns
- ✅ **Production-Ready**: Validated schemas, error handling, and logging

## Installation

```bash
pnpm add -D @social-media-app/test-data-builders
```

## Quick Start

```typescript
import { UserBuilder, PostBuilder, LikeBuilder } from '@social-media-app/test-data-builders';

// Create a user
const user = await new UserBuilder()
  .withEmail('test@example.com')
  .verified(true)
  .build();

// Create a post for that user
const post = await new PostBuilder()
  .byUser(user.id, user.handle)
  .withCaption('Amazing sunset!')
  .build();

// Add likes
await LikeBuilder.createMany([userId1, userId2, userId3], post.id);
```

## Entity Builders

### UserBuilder

Creates test user profiles with authentication data.

```typescript
// Basic user
const user = await new UserBuilder().build();

// Custom user
const user = await new UserBuilder()
  .withEmail('influencer@example.com')
  .withHandle('theinfluencer')
  .verified(true)
  .build();

// Influencer preset
const influencer = await new UserBuilder()
  .asInfluencer()
  .build();

// Batch create
const users = await new UserBuilder().buildMany(50);
```

### PostBuilder

Creates posts using PostService (preserves postsCount increment).

```typescript
// Basic post
const post = await new PostBuilder()
  .byUser(userId, userHandle)
  .build();

// Viral post preset
const viralPost = await new PostBuilder()
  .byUser(userId, userHandle)
  .viral()
  .build();

// Custom post
const post = await new PostBuilder()
  .byUser(userId, userHandle)
  .withCaption('Check this out!')
  .withImage('https://example.com/image.jpg')
  .withTags(['travel', 'photography'])
  .build();
```

### LikeBuilder

Creates likes using LikeService (preserves likesCount increment).

**⚠️ CRITICAL**: Always use LikeBuilder instead of direct DB writes to ensure post likesCount is incremented correctly.

```typescript
// Single like
const like = await new LikeBuilder()
  .byUser(userId)
  .onPost(postId)
  .build();

// Batch likes
await LikeBuilder.createMany([user1, user2, user3], postId);

// Random likes across posts
await LikeBuilder.createRandomLikes(
  allUserIds,
  postIds,
  { min: 5, max: 15 }
);
```

### CommentBuilder

Creates comments using CommentService.

```typescript
// Single comment
const comment = await new CommentBuilder()
  .byUser(userId, userHandle)
  .onPost(postId)
  .withContent('Great post!')
  .build();

// Batch comments
await CommentBuilder.createMany(
  [{ userId: user1.id, handle: user1.handle }, ...],
  postId
);
```

### FollowBuilder

Creates follow relationships using FollowService.

```typescript
// Single follow
const follow = await new FollowBuilder()
  .follower(userId1)
  .followee(userId2)
  .build();

// Give influencer many followers
await FollowBuilder.createMany(followerIds, influencerId);

// Complete social graph
await FollowBuilder.createCompleteGraph(userIds);

// Random follows
await FollowBuilder.createRandomFollows(
  userIds,
  { min: 5, max: 15 }
);
```

## Scenario Builders

High-level builders that compose multiple entities to create realistic test patterns.

### PopularPostScenario

Creates an influencer with a viral post and engagement.

```typescript
import { PopularPostScenario } from '@social-media-app/test-data-builders';

const scenario = await new PopularPostScenario().build();

console.log(`Influencer: @${scenario.influencer.handle}`);
console.log(`Viral post: ${scenario.post.id}`);
console.log(`Total likes: ${scenario.totalLikes}`);
console.log(`Total comments: ${scenario.totalComments}`);
console.log(`Engagers: ${scenario.engagers.length}`);
```

Creates:
- 1 influencer with verified status
- 1 viral post
- 50-100 regular users
- 100-500 likes on the post
- 20-50 comments on the post

### ActiveCommunityScenario

Creates an active community with multiple users, posts, and engagement.

```typescript
import { ActiveCommunityScenario } from '@social-media-app/test-data-builders';

const scenario = await new ActiveCommunityScenario().build();

console.log(`Users: ${scenario.users.length}`);
console.log(`Posts: ${scenario.posts.length}`);
console.log(`Total likes: ${scenario.totalLikes}`);
console.log(`Total comments: ${scenario.totalComments}`);
console.log(`Total follows: ${scenario.totalFollows}`);
```

Creates:
- 10-20 active users
- 30-60 posts distributed across users
- Random likes on posts (5-20 per post)
- Random comments (2-10 per post)
- Random follow relationships (each user follows 3-8 others)

## Schema Validation

All builders use Zod schemas for runtime validation:

```typescript
// UserBuilder validates:
- email format
- username (3-30 chars, alphanumeric + underscores)
- handle (3-30 chars, lowercase alphanumeric + underscores)
- profilePictureUrl (valid URL)

// PostBuilder validates:
- userId (UUID)
- userHandle (required string)
- imageUrl (valid URL, optional - auto-generated)
- caption (max 2200 chars)

// LikeBuilder validates:
- userId (UUID)
- postId (UUID)

// CommentBuilder validates:
- userId (UUID)
- userHandle (required)
- postId (UUID)
- content (1-500 chars, optional - auto-generated)

// FollowBuilder validates:
- followerId (UUID)
- followeeId (UUID)
- Prevents self-follows
```

## Advanced Usage

### Custom Configuration

```typescript
// Builder with custom global config
const builder = new UserBuilder({
  logLevel: 'debug',
  maxRetries: 5,
  batchSize: 20
});
```

### Dry Run Mode

```typescript
// Validation only, no DB writes
const result = await new UserBuilder()
  .enableDryRun()
  .withEmail('test@example.com')
  .build();
```

### Hooks

```typescript
// Pre/post build hooks
const user = await new UserBuilder()
  .beforeBuild(async (config, context) => {
    console.log('About to build:', config);
  })
  .afterBuild(async (result, context) => {
    console.log('Built user:', result.id);
  })
  .build();
```

## Architecture

### DAL Integration

This package uses your real DAL services to ensure business logic is preserved:

- **UserBuilder**: Creates users with dummy auth data (direct DB write)
- **PostBuilder**: Uses `PostService.createPost()` (increments user's postsCount)
- **LikeBuilder**: Uses `LikeService.likePost()` (increments post's likesCount) ✅
- **CommentBuilder**: Uses `CommentService.createComment()`
- **FollowBuilder**: Uses `FollowService.followUser()`

### Why This Matters

Using real services instead of direct DB writes ensures:
- ✅ Business logic is executed (counts incremented, validation applied)
- ✅ GSI indexes are properly set
- ✅ Timestamps are generated correctly
- ✅ Test data matches production data structure

### Dependency Injection

Uses Awilix for dependency injection:

```typescript
const container = await createBuilderContainer();
const likeService = container.resolve('likeService');
```

All DAL services are registered as singleton values in the container.

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

## Testing

Run the test scenarios:

```bash
tsx scripts/test-builder-scenarios.ts
```

This runs both PopularPostScenario and ActiveCommunityScenario to validate the builder system.

## Best Practices

### 1. Use Builders Instead of Direct DB Writes

❌ **Don't:**
```typescript
await dynamoClient.send(new PutCommand({
  TableName: tableName,
  Item: likeEntity
}));
```

✅ **Do:**
```typescript
await new LikeBuilder()
  .byUser(userId)
  .onPost(postId)
  .build();
```

### 2. Batch Operations for Performance

```typescript
// ✅ Good: Batch with concurrency control
await LikeBuilder.createMany(userIds, postId, 10);

// ❌ Bad: Sequential individual creates
for (const userId of userIds) {
  await new LikeBuilder().byUser(userId).onPost(postId).build();
}
```

### 3. Use Scenarios for Complex Setup

```typescript
// ✅ Good: Use scenario for complete setup
const scenario = await new PopularPostScenario().build();

// ❌ Bad: Manual orchestration
const influencer = await new UserBuilder().asInfluencer().build();
const post = await new PostBuilder().byUser(...).viral().build();
const users = await new UserBuilder().buildMany(100);
// ... many more lines
```

### 4. Leverage Presets

```typescript
// ✅ Good: Use presets
const influencer = await new UserBuilder().asInfluencer().build();
const viralPost = await new PostBuilder().byUser(...).viral().build();

// ❌ Bad: Manual configuration
const influencer = await new UserBuilder()
  .withFollowersCount(50000)
  .withFollowingCount(500)
  .verified(true)
  .build();
```

## Troubleshooting

### Validation Errors

```
ValidationFailureError: Validation failed
  validationErrors: [{ field: 'imageUrl', message: 'imageUrl is required' }]
```

**Solution**: imageUrl is optional and auto-generated. This error shouldn't occur with the latest version. Ensure you're using the Zod schema-validated builders.

### Like Count Not Incrementing

**Problem**: Post shows 0 likes even though likes were created.

**Solution**: Ensure you're using `LikeBuilder` (which calls `LikeService.likePost()`) instead of direct DB writes.

### Connection Issues

**Problem**: Cannot connect to DynamoDB.

**Solution**: Ensure LocalStack is running and environment variables are set:
```bash
USE_LOCALSTACK=true
TABLE_NAME=tamafriends-local
LOCALSTACK_ENDPOINT=http://localhost:4566
```

## License

MIT

## Contributing

1. Add new builders in `src/builders/`
2. Add Zod schemas in `src/types/schemas.ts`
3. Create scenarios in `src/scenarios/`
4. Update this README with examples
5. Run `pnpm build` and test
