# Test Data Builder System - Production-Grade Implementation Plan

**Created**: 2025-11-18  
**Status**: Phase 1 Complete ✅  
**Total Estimated Time**: 15-22 hours

---

## Executive Summary

Build a type-safe, DRY, highly composable test data builder system using advanced TypeScript patterns and **Awilix DI container** (following existing codebase patterns). The system will generate realistic seed data for all entities (Users, Posts, Likes, Comments, Follows, Feed Items) while ensuring data integrity by using the **service layer** instead of direct database writes.

### Key Innovation
Use builder pattern + service layer integration + TypeScript generics + **Awilix DI** to create a maintainable, correct-by-construction seeding system.

---

## Problem Statement

### Current Issue
The existing seed script (`scripts/seed-database.ts`) writes directly to DynamoDB, bypassing business logic. This causes:

❌ **Incorrect like counts**: Posts show 0 likes on load, but correct count after clicking like button  
❌ **Missing relationships**: LIKE entities created but counts not incremented  
❌ **Data integrity issues**: Seeded data doesn't match production data structure  
❌ **Maintenance burden**: Changes to business logic require updating both services AND seed script

### Root Cause
```typescript
// ❌ WRONG: Direct DB write bypasses business logic
await dynamoClient.send(new PutCommand({
  TableName: tableName,
  Item: {
    PK: `POST#${postId}`,
    SK: `LIKE#${userId}`,
    // ... missing count increment logic
  }
}));
```

### Solution
```typescript
// ✅ CORRECT: Use real service layer
const container = createBuilderContainer();
const likeService = container.resolve('likeService');

await likeService.likePost(userId, postId, postUserId, postSK);
// ^ Creates LIKE entity AND increments count
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Test Data Builders                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ UserBuilder  │  │ PostBuilder  │  │ LikeBuilder  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                          │                               │
│                   extends BaseBuilder                    │
│                          │                               │
│         ┌────────────────┴────────────────┐             │
│         │                                  │             │
│    ┌────▼────┐                     ┌──────▼──────┐      │
│    │ Awilix  │────────────────────>│   DAL       │      │
│    │Container│  resolve services   │  Services   │      │
│    └─────────┘                     └─────────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Layers
1. **Type System** - Comprehensive TypeScript types for safety
2. **BaseBuilder** - Abstract base class with retry, validation, hooks
3. **BuilderContainer** - Awilix DI container (follows existing patterns)
4. **Entity Builders** - Concrete builders for each entity type
5. **Scenario Builders** - High-level compositions for complex test cases

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### 1.1 Type Definitions ✅
**File**: `scripts/builders/types/index.ts`

**Status**: ✅ Complete (300+ lines)

Implemented:
- BuilderConfig, BuildResult, BuildMetadata
- DeepPartial, DeepRequired, Range, Awaited
- SeededUser, SeededPost, SeededLike, etc.
- ValidationResult, ValidationError
- BuildContext, BuilderState, BuilderHook

### 1.2 BaseBuilder Abstraction ✅
**File**: `scripts/builders/base/BaseBuilder.ts`

**Status**: ✅ Complete (600+ lines)

Features implemented:
- ✅ Generic abstract base class `BaseBuilder<TEntity, TConfig, TOutput>`
- ✅ Fluent interface with method chaining
- ✅ Automatic retry logic with exponential backoff
- ✅ Comprehensive validation pipeline
- ✅ Dry run mode support
- ✅ Before/after build hooks
- ✅ Batch operations with concurrency control
- ✅ Custom error classes (ValidationFailureError, BuildFailureError)

### 1.3 BuilderContainer (Awilix) ✅
**File**: `scripts/builders/base/BuilderContainer.ts`

**Status**: ✅ Complete - **Follows existing Awilix pattern!**

Implementation:
```typescript
export function createBuilderContainer(
  config: BuilderContainerConfig = {}
): AwilixContainer<BuilderContainer> {
  const container = createContainer<BuilderContainer>({
    injectionMode: InjectionMode.CLASSIC,
  });
  
  // Register DAL services
  container.register({
    likeService: asValue(likeService),
    postService: asValue(postService),
    profileService: asValue(profileService),
    // ... all services
  });
  
  return container;
}
```

### 1.4 Barrel Exports ✅
**File**: `scripts/builders/base/index.ts`

**Status**: ✅ Complete

---

## Phase 2: Entity Builders 🔜 NEXT

### 2.1 UserBuilder
**File**: `scripts/builders/UserBuilder.ts`

**Priority**: HIGH (foundation for all other entities)

```typescript
export class UserBuilder extends BaseBuilder<
  UserProfileEntity,
  UserConfig,
  SeededUser
> {
  // Fluent configuration
  withName(name: string): this;
  withEmail(email: string): this;
  verified(value: boolean): this;
  
  // High-level presets
  asInfluencer(): this; // High follower count
  asNewUser(): this;    // Minimal data
  
  // Relationships (deferred)
  following(userIds: string[]): this;
  followers(count: number): this;
  
  protected async validate(): Promise<ValidationResult> {
    const errors = this.validateRequired({
      email: this.config.email,
      username: this.config.username,
      handle: this.config.handle,
    });
    return errors.length > 0 
      ? this.validationFailure(errors)
      : this.validationSuccess();
  }
  
  protected async buildInternal(): Promise<SeededUser> {
    const container = createBuilderContainer();
    const profileService = container.resolve('profileService');
    
    // Generate defaults
    const email = this.config.email || faker.internet.email();
    const username = this.config.username || faker.internet.userName();
    const handle = this.config.handle || username.toLowerCase();
    
    // ✅ Use real service layer
    const result = await profileService.createProfile({
      email,
      username,
      handle,
      fullName: this.config.fullName || faker.person.fullName(),
      bio: this.config.bio || null,
      profilePictureUrl: this.config.profilePictureUrl || null,
      emailVerified: this.config.emailVerified ?? true,
    });
    
    return {
      id: result.userId,
      email: result.email,
      username: result.username,
      handle: result.handle,
      fullName: result.fullName,
      bio: result.bio,
      profilePictureUrl: result.profilePictureUrl,
      emailVerified: result.emailVerified,
      createdAt: result.createdAt,
    };
  }
}
```

**Usage**:
```typescript
const user = await new UserBuilder()
  .withEmail('test@example.com')
  .verified(true)
  .build();

const influencer = await new UserBuilder()
  .asInfluencer()
  .build();

const users = await new UserBuilder()
  .buildMany(50);
```

**Advanced TypeScript Features**:
- Conditional types based on configuration
- Type guards for validation
- Inferred return types

**Estimated Time**: 2-3 hours

---

### 2.2 PostBuilder
**File**: `scripts/builders/PostBuilder.ts`

**Priority**: HIGH (core entity)

```typescript
export class PostBuilder extends BaseBuilder<
  PostEntity,
  PostConfig,
  SeededPost
> {
  // Configuration
  byUser(userId: string): this;
  withCaption(caption: string): this;
  withImage(imageUrl: string): this;
  withTags(tags: string[]): this;
  
  // Preset scenarios
  viral(): this;      // High engagement
  trending(): this;   // Recent + popular
  
  // Engagement (deferred - creates after post)
  withLikes(count: number | Range): this;
  withComments(count: number | Range): this;
  
  protected async validate(): Promise<ValidationResult> {
    const errors = this.validateRequired({
      userId: this.config.userId,
      imageUrl: this.config.imageUrl,
    });
    return errors.length > 0 
      ? this.validationFailure(errors)
      : this.validationSuccess();
  }
  
  protected async buildInternal(): Promise<SeededPost> {
    const container = createBuilderContainer();
    const postService = container.resolve('postService');
    
    // 1. Create post via PostService
    const post = await postService.createPost({
      userId: this.config.userId!,
      caption: this.config.caption || faker.lorem.sentence(),
      imageUrl: this.config.imageUrl!,
      tags: this.config.tags || [],
      isPublic: this.config.isPublic ?? true,
    });
    
    // 2. Create engagement (likes/comments) if specified
    if (this.config.likesCount) {
      await this.createLikes(post.id, this.config.likesCount);
    }
    if (this.config.commentsCount) {
      await this.createComments(post.id, this.config.commentsCount);
    }
    
    return post;
  }
  
  private async createLikes(postId: string, count: number | Range) {
    const likeCount = isRange(count) 
      ? RangeHandler.random(count)
      : count;
    
    // Create users to like this post
    const users = await new UserBuilder().buildMany(likeCount);
    
    // Like the post using LikeBuilder
    await Promise.all(
      users.map(user =>
        new LikeBuilder()
          .byUser(user.id)
          .onPost(postId)
          .build()
      )
    );
  }
}
```

**Key Features**:
- Deferred relationship building
- Range support for random counts
- Composite entity management
- Preset scenarios (viral, trending)

**Estimated Time**: 3-4 hours

---

### 2.3 LikeBuilder
**File**: `scripts/builders/LikeBuilder.ts`

**Priority**: CRITICAL (fixes the original bug!)

```typescript
export class LikeBuilder extends BaseBuilder<
  LikeEntity,
  LikeConfig,
  SeededLike
> {
  byUser(userId: string): this {
    this.config.userId = userId;
    return this;
  }
  
  onPost(postId: string): this {
    this.config.postId = postId;
    return this;
  }
  
  protected async validate(): Promise<ValidationResult> {
    const errors = this.validateRequired({
      userId: this.config.userId,
      postId: this.config.postId,
    });
    return errors.length > 0 
      ? this.validationFailure(errors)
      : this.validationSuccess();
  }
  
  protected async buildInternal(): Promise<SeededLike> {
    const container = createBuilderContainer();
    const likeService = container.resolve('likeService');
    const postService = container.resolve('postService');
    
    // Get post details for postUserId and postSK
    const post = await postService.getPostById(this.config.postId!);
    
    // ✅ CRITICAL: Use real service layer
    // This creates LIKE entity AND increments count!
    const result = await likeService.likePost(
      this.config.userId!,
      this.config.postId!,
      post.userId,      // postUserId
      `POST#${post.id}` // postSK
    );
    
    return {
      userId: this.config.userId!,
      postId: this.config.postId!,
      createdAt: result.createdAt,
      likesCount: result.likesCount,
      isLiked: result.isLiked,
    };
  }
  
  // Batch operations (optimized)
  static async createMany(
    userIds: string[],
    postId: string
  ): Promise<SeededLike[]> {
    const container = createBuilderContainer();
    const batchSize = 10; // Control concurrency
    
    const results: SeededLike[] = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(userId =>
          new LikeBuilder()
            .byUser(userId)
            .onPost(postId)
            .build()
        )
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}
```

**This is the key fix!** Using `likeService.likePost()` ensures:
- ✅ LIKE entity is created
- ✅ Post's likesCount is incremented
- ✅ All business logic is preserved

**Estimated Time**: 1-2 hours

---

### 2.4 CommentBuilder
**File**: `scripts/builders/CommentBuilder.ts`

**Priority**: MEDIUM

```typescript
export class CommentBuilder extends BaseBuilder<
  CommentEntity,
  CommentConfig,
  SeededComment
> {
  byUser(userId: string): this;
  onPost(postId: string): this;
  withContent(content: string): this;
  
  // Thread support
  replyingTo(commentId: string): this;
  
  protected async buildInternal(): Promise<SeededComment> {
    const container = createBuilderContainer();
    const commentService = container.resolve('commentService');
    
    // ✅ Use real service layer
    return await commentService.createComment({
      userId: this.config.userId!,
      postId: this.config.postId!,
      content: this.config.content || faker.lorem.sentence(),
      parentCommentId: this.config.parentCommentId,
    });
  }
}
```

**Estimated Time**: 1-2 hours

---

### 2.5 FollowBuilder
**File**: `scripts/builders/FollowBuilder.ts`

**Priority**: MEDIUM

```typescript
export class FollowBuilder extends BaseBuilder<
  FollowEntity,
  FollowConfig,
  SeededFollow
> {
  follower(userId: string): this;
  followee(userId: string): this;
  
  // Batch operations
  static async createFollowGraph(
    users: string[],
    strategy: 'random' | 'influencer' | 'complete'
  ): Promise<SeededFollow[]> {
    switch (strategy) {
      case 'random':
        return await this.createRandomGraph(users);
      case 'influencer':
        return await this.createInfluencerGraph(users);
      case 'complete':
        return await this.createCompleteGraph(users);
    }
  }
  
  protected async buildInternal(): Promise<SeededFollow> {
    const container = createBuilderContainer();
    const followService = container.resolve('followService');
    
    // ✅ Use real service layer
    return await followService.followUser(
      this.config.followerId!,
      this.config.followeeId!
    );
  }
}
```

**Estimated Time**: 2-3 hours

---

## Phase 3: Scenario Builders (High-Level Compositions)

### 3.1 Scenario Builder Base
**File**: `scripts/builders/scenarios/ScenarioBuilder.ts`

```typescript
export abstract class ScenarioBuilder<TResult> {
  protected container: AwilixContainer<BuilderContainer>;
  
  constructor() {
    this.container = createBuilderContainer();
  }
  
  abstract build(): Promise<TResult>;
  
  // Helpers
  protected async createUsers(count: number): Promise<SeededUser[]> {
    return await new UserBuilder().buildMany(count);
  }
  
  protected async createPosts(
    users: SeededUser[], 
    postsPerUser: number
  ): Promise<SeededPost[]> {
    const posts: SeededPost[] = [];
    for (const user of users) {
      const userPosts = await Promise.all(
        Array.from({ length: postsPerUser }, () =>
          new PostBuilder()
            .byUser(user.id)
            .build()
        )
      );
      posts.push(...userPosts);
    }
    return posts;
  }
}
```

---

### 3.2 Popular Post Scenario
**File**: `scripts/builders/scenarios/PopularPostScenario.ts`

```typescript
export class PopularPostScenario extends ScenarioBuilder<PopularPostResult> {
  async build(): Promise<PopularPostResult> {
    // 1. Create influencer user
    const influencer = await new UserBuilder()
      .asInfluencer()
      .build();
    
    // 2. Create viral post
    const post = await new PostBuilder()
      .byUser(influencer.id)
      .viral()
      .withLikes({ min: 100, max: 500 })
      .withComments({ min: 20, max: 50 })
      .build();
    
    return { influencer, post };
  }
}
```

---

### 3.3 Active Community Scenario
**File**: `scripts/builders/scenarios/ActiveCommunityScenario.ts`

```typescript
export class ActiveCommunityScenario extends ScenarioBuilder<CommunityResult> {
  async build(): Promise<CommunityResult> {
    // Creates:
    // - 10 active users
    // - Follow graph (everyone follows everyone)
    // - 5 posts per user
    // - Random likes across posts
    // - Comments on popular posts
    
    const users = await this.createUsers(10);
    await FollowBuilder.createFollowGraph(
      users.map(u => u.id), 
      'complete'
    );
    
    const posts = await this.createPosts(users, 5);
    
    // Add random engagement
    for (const post of posts) {
      await new PostBuilder()
        .withLikes({ min: 5, max: 15 })
        .withComments({ min: 1, max: 5 })
        .build();
    }
    
    return { users, posts };
  }
}
```

**Estimated Time for Phase 3**: 2-3 hours

---

## Phase 4: Utilities & Helpers

### 4.1 Faker Integration
**File**: `scripts/builders/utils/FakerHelpers.ts`

```typescript
export class FakerHelpers {
  static socialMediaCaption(): string {
    return faker.lorem.sentence() + ' ' + this.hashtags(3).join(' ');
  }
  
  static hashtags(count: number): string[] {
    return Array.from({ length: count }, () => 
      '#' + faker.word.adjective()
    );
  }
  
  static username(): string {
    return faker.internet.userName().toLowerCase();
  }
  
  static profileBio(): string {
    return faker.lorem.paragraph(1);
  }
  
  static imageUrl(width: number = 800, height: number = 600): string {
    return `https://picsum.photos/${width}/${height}`;
  }
}
```

**Estimated Time**: 1 hour

---

### 4.2 Range Handler
**File**: `scripts/builders/utils/Range.ts`

```typescript
export type Range = { min: number; max: number };

export class RangeHandler {
  static random(range: Range): number {
    return Math.floor(
      Math.random() * (range.max - range.min + 1) + range.min
    );
  }
  
  static distribute(total: number, range: Range): number[] {
    // Distribute total items across range
    const items: number[] = [];
    let remaining = total;
    
    while (remaining > 0) {
      const count = Math.min(
        this.random(range),
        remaining
      );
      items.push(count);
      remaining -= count;
    }
    
    return items;
  }
}
```

**Estimated Time**: 30 minutes

---

### 4.3 Concurrency Manager
**File**: `scripts/builders/utils/ConcurrencyManager.ts`

```typescript
export class ConcurrencyManager {
  static async batch<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency: number = 10
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(fn)
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}
```

**Prevents DynamoDB throttling during bulk operations.**

**Estimated Time**: 30 minutes

---

## Phase 5: Configuration System

### 5.1 Seed Configuration
**File**: `scripts/builders/config/SeedConfig.ts`

```typescript
export interface SeedConfig {
  users: {
    count: number;
    verified: { percentage: number };
    influencers: { count: number };
  };
  
  posts: {
    perUser: Range;
    engagement: {
      likes: Range;
      comments: Range;
    };
  };
  
  relationships: {
    followRatio: number; // avg follows per user
  };
}

export const DEFAULT_SEED_CONFIG: SeedConfig = {
  users: {
    count: 50,
    verified: { percentage: 0.2 },
    influencers: { count: 5 }
  },
  posts: {
    perUser: { min: 3, max: 10 },
    engagement: {
      likes: { min: 0, max: 20 },
      comments: { min: 0, max: 5 }
    }
  },
  relationships: {
    followRatio: 10
  }
};

export const MINIMAL_CONFIG: SeedConfig = {
  users: { count: 10, verified: { percentage: 0.5 }, influencers: { count: 1 } },
  posts: { perUser: { min: 1, max: 3 }, engagement: { likes: { min: 0, max: 5 }, comments: { min: 0, max: 2 } } },
  relationships: { followRatio: 3 }
};

export const STRESS_TEST_CONFIG: SeedConfig = {
  users: { count: 1000, verified: { percentage: 0.1 }, influencers: { count: 50 } },
  posts: { perUser: { min: 5, max: 20 }, engagement: { likes: { min: 10, max: 100 }, comments: { min: 5, max: 30 } } },
  relationships: { followRatio: 50 }
};
```

**Estimated Time**: 1 hour

---

### 5.2 Environment-Based Config
**File**: `scripts/builders/config/EnvironmentConfig.ts`

```typescript
export class EnvironmentConfig {
  static getConfig(): SeedConfig {
    const env = process.env.SEED_ENV || 'default';
    
    switch (env) {
      case 'minimal': return MINIMAL_CONFIG;
      case 'realistic': return DEFAULT_SEED_CONFIG;
      case 'stress': return STRESS_TEST_CONFIG;
      default: return DEFAULT_SEED_CONFIG;
    }
  }
}
```

**Estimated Time**: 30 minutes

---

## Phase 6: Main Seeder Script

### 6.1 Orchestrator
**File**: `scripts/seed-database-v2.ts`

```typescript
async function seedDatabase() {
  const config = EnvironmentConfig.getConfig();
  
  console.log('🌱 Starting database seeding...');
  console.log('📊 Configuration:', JSON.stringify(config, null, 2));
  
  // 1. Create users
  console.log('👥 Creating users...');
  const users = await new UserBuilder()
    .buildMany(config.users.count);
  console.log(`✅ Created ${users.length} users`);
  
  // 2. Create influencers
  console.log('⭐ Creating influencers...');
  const influencers = await new UserBuilder()
    .asInfluencer()
    .buildMany(config.users.influencers.count);
  console.log(`✅ Created ${influencers.length} influencers`);
  
  // 3. Create follow relationships
  console.log('🔗 Creating follow relationships...');
  const allUsers = [...users, ...influencers];
  await FollowBuilder.createFollowGraph(
    allUsers.map(u => u.id), 
    'random'
  );
  console.log('✅ Follow relationships created');
  
  // 4. Create posts with engagement
  console.log('📝 Creating posts...');
  let totalPosts = 0;
  for (const user of allUsers) {
    const postCount = RangeHandler.random(config.posts.perUser);
    
    for (let i = 0; i < postCount; i++) {
      await new PostBuilder()
        .byUser(user.id)
        .withLikes(config.posts.engagement.likes)
        .withComments(config.posts.engagement.comments)
        .build();
      totalPosts++;
    }
  }
  console.log(`✅ Created ${totalPosts} posts with engagement`);
  
  console.log('✅ Seeding complete!');
  console.log('📊 Summary:');
  console.log(`  - Users: ${allUsers.length}`);
  console.log(`  - Posts: ${totalPosts}`);
}

seedDatabase().catch(console.error);
```

**Estimated Time**: 1 hour

---

### 6.2 CLI Interface
**File**: `scripts/seed-cli.ts`

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('seed')
  .description('Seed database with test data')
  .option('-e, --env <env>', 'Environment (minimal|realistic|stress)', 'realistic')
  .option('-s, --scenario <name>', 'Run specific scenario')
  .option('--dry-run', 'Preview without writing to DB')
  .action(async (options) => {
    if (options.dryRun) {
      console.log('🔍 Dry run mode enabled');
    }
    
    if (options.scenario) {
      console.log(`📋 Running scenario: ${options.scenario}`);
      // Run specific scenario
    } else {
      await seedDatabase();
    }
  });

program.parse();
```

**Usage**:
```bash
# Default seeding
tsx scripts/seed-cli.ts

# Minimal data
SEED_ENV=minimal tsx scripts/seed-cli.ts

# Stress test
SEED_ENV=stress tsx scripts/seed-cli.ts

# Dry run
tsx scripts/seed-cli.ts --dry-run

# Specific scenario
tsx scripts/seed-cli.ts -s popular-post
```

**Estimated Time**: 1 hour

---

## Phase 7: Testing & Validation

### 7.1 Builder Tests
**File**: `scripts/builders/__tests__/UserBuilder.test.ts`

```typescript
describe('UserBuilder', () => {
  it('should create user with default values', async () => {
    const user = await new UserBuilder().build();
    
    expect(user.id).toBeDefined();
    expect(user.email).toMatch(/@/);
    expect(user.username).toBeDefined();
  });
  
  it('should respect custom configuration', async () => {
    const user = await new UserBuilder()
      .withEmail('test@example.com')
      .verified(true)
      .build();
    
    expect(user.email).toBe('test@example.com');
    expect(user.emailVerified).toBe(true);
  });
  
  it('should create influencer preset correctly', async () => {
    const user = await new UserBuilder()
      .asInfluencer()
      .build();
    
    expect(user.followersCount).toBeGreaterThan(1000);
  });
  
  it('should batch create multiple users', async () => {
    const users = await new UserBuilder().buildMany(5);
    
    expect(users).toHaveLength(5);
    expect(users[0].id).not.toBe(users[1].id);
  });
});
```

**Estimated Time**: 2-3 hours for all builder tests

---

### 7.2 Integration Tests
**File**: `scripts/builders/__tests__/integration.test.ts`

```typescript
describe('Data Builder Integration', () => {
  it('should create complete post with engagement', async () => {
    const post = await new PostBuilder()
      .withLikes({ min: 5, max: 10 })
      .build();
    
    // Verify post exists
    const container = createBuilderContainer();
    const postService = container.resolve('postService');
    const postEntity = await postService.getPostById(