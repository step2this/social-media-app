# Phase 4: DynamoDB & GraphQL Utilities Migration

**Created:** 2025-11-10
**Status:** Planning Phase
**Estimated Duration:** 2-3 weeks
**Risk Level:** Medium
**Priority:** Low-Medium (Quality of Life improvement)

---

## 🎯 Executive Summary

This plan implements ElectroDB for DynamoDB operations (Phase 4A) and graphql-relay for standardized cursor pagination (Phase 4B), replacing custom implementations with battle-tested libraries.

**Expected Benefits:**
- 60% reduction in DynamoDB query boilerplate
- Type-safe DynamoDB operations with compile-time validation
- Standardized Relay-spec cursor pagination
- Better developer experience with cleaner code
- Reduced maintenance burden

**Key Metrics:**
- Code reduction: ~800-1000 LOC
- Type safety improvement: 100% typed DynamoDB operations
- Query complexity reduction: 50-70%
- Zero data migration required (entities map to existing tables)

---

## 📋 Phase Overview

| Component | Technology | Purpose | Priority |
|-----------|-----------|---------|----------|
| **DynamoDB ORM** | ElectroDB | Type-safe queries | High |
| **Pagination** | graphql-relay | Standard cursors | Medium |
| **Migration Strategy** | Feature flags | Safe rollout | High |
| **Testing** | Dual-write validation | Zero data loss | Critical |

---

## 🚀 Phase 4A: ElectroDB Migration

### Goals
1. Replace custom DynamoDB query builders with ElectroDB
2. Achieve 100% type-safe DynamoDB operations
3. Reduce query boilerplate by 60%
4. Maintain backward compatibility during migration
5. Zero data migration (map to existing table structure)

### Why ElectroDB?

**Current Pain Points:**
```typescript
// ❌ Custom query builders - verbose, error-prone
const result = await dynamoClient.send(
  new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'POST#',
    },
    IndexName: undefined,
    ScanIndexForward: false,
    Limit: 20,
  })
);

const posts = result.Items?.map(item => ({
  id: item.id,
  userId: item.userId,
  // ... manual mapping
})) ?? [];
```

**With ElectroDB:**
```typescript
// ✅ ElectroDB - type-safe, concise, maintainable
const posts = await entities.post.query
  .byUser({ userId })
  .go({ limit: 20, order: 'desc' });
```

**Benefits:**
- ✅ Type-safe queries (compile-time validation)
- ✅ Automatic key construction (`PK`, `SK`, GSI keys)
- ✅ Built-in pagination support
- ✅ Transaction support
- ✅ Conditional updates/deletes
- ✅ Composite indexes

---

## 📦 Step 4A.1: Install Dependencies

```bash
cd packages/dal
pnpm add electrodb
pnpm add -D @types/electrodb
```

**ElectroDB Stats:**
- 1M+ monthly downloads
- Active maintenance (updated weekly)
- Used by AWS internally
- Excellent TypeScript support

---

## 🏗️ Step 4A.2: Define ElectroDB Entities

### Entity Design Philosophy

ElectroDB entities should **map to existing DynamoDB table structure** (no data migration required).

**Current Table Structure:**
```
PK                  | SK                    | GSI1PK              | GSI1SK
--------------------|-----------------------|---------------------|------------------
USER#123            | PROFILE               | EMAIL#test@test.com | PROFILE
USER#123            | POST#2024-01-01#abc   | -                   | -
USER#123            | FOLLOWING#456         | USER#456            | FOLLOWER#123
REFRESH_TOKEN#xyz   | TOKEN                 | REFRESH_TOKEN#xyz   | -
```

**File:** `packages/dal/src/entities/User.entity.ts`

```typescript
import { Entity, EntityItem } from 'electrodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * User Entity
 *
 * Represents user account with email, username, and basic profile info.
 * Maps to existing table structure: PK=USER#{userId}, SK=PROFILE
 */
export const createUserEntity = (
  client: DynamoDBDocumentClient,
  tableName: string
) => {
  return new Entity(
    {
      model: {
        entity: 'user',
        version: '1',
        service: 'social-media-app',
      },
      attributes: {
        userId: {
          type: 'string',
          required: true,
          readOnly: true,
        },
        email: {
          type: 'string',
          required: true,
        },
        username: {
          type: 'string',
          required: true,
        },
        handle: {
          type: 'string',
          required: true,
        },
        fullName: {
          type: 'string',
        },
        bio: {
          type: 'string',
        },
        profilePictureUrl: {
          type: 'string',
        },
        profilePictureThumbnailUrl: {
          type: 'string',
        },
        postsCount: {
          type: 'number',
          default: 0,
        },
        followersCount: {
          type: 'number',
          default: 0,
        },
        followingCount: {
          type: 'number',
          default: 0,
        },
        emailVerified: {
          type: 'boolean',
          default: false,
        },
        createdAt: {
          type: 'string',
          required: true,
          readOnly: true,
          default: () => new Date().toISOString(),
        },
        updatedAt: {
          type: 'string',
          required: true,
          default: () => new Date().toISOString(),
          set: () => new Date().toISOString(),
        },
      },
      indexes: {
        // Primary key: PK=USER#{userId}, SK=PROFILE
        primary: {
          pk: {
            field: 'PK',
            composite: ['userId'],
            template: 'USER#${userId}',
          },
          sk: {
            field: 'SK',
            composite: [],
            template: 'PROFILE',
          },
        },
        // GSI1: Lookup by email
        byEmail: {
          index: 'GSI1',
          pk: {
            field: 'GSI1PK',
            composite: ['email'],
            template: 'EMAIL#${email}',
          },
          sk: {
            field: 'GSI1SK',
            composite: [],
            template: 'PROFILE',
          },
        },
        // GSI2: Lookup by username
        byUsername: {
          index: 'GSI2',
          pk: {
            field: 'GSI2PK',
            composite: ['username'],
            template: 'USERNAME#${username}',
          },
          sk: {
            field: 'GSI2SK',
            composite: [],
            template: 'PROFILE',
          },
        },
      },
    },
    { client, table: tableName }
  );
};

// TypeScript type inference
export type UserEntityType = EntityItem<ReturnType<typeof createUserEntity>>;
```

**File:** `packages/dal/src/entities/Post.entity.ts`

```typescript
import { Entity, EntityItem } from 'electrodb';

export const createPostEntity = (client, tableName) => {
  return new Entity(
    {
      model: {
        entity: 'post',
        version: '1',
        service: 'social-media-app',
      },
      attributes: {
        postId: {
          type: 'string',
          required: true,
          readOnly: true,
        },
        userId: {
          type: 'string',
          required: true,
        },
        imageUrl: {
          type: 'string',
          required: true,
        },
        thumbnailUrl: {
          type: 'string',
          required: true,
        },
        caption: {
          type: 'string',
        },
        likesCount: {
          type: 'number',
          default: 0,
        },
        commentsCount: {
          type: 'number',
          default: 0,
        },
        createdAt: {
          type: 'string',
          required: true,
          readOnly: true,
          default: () => new Date().toISOString(),
        },
        updatedAt: {
          type: 'string',
          required: true,
          default: () => new Date().toISOString(),
          set: () => new Date().toISOString(),
        },
      },
      indexes: {
        // Primary key: PK=USER#{userId}, SK=POST#{createdAt}#{postId}
        primary: {
          pk: {
            field: 'PK',
            composite: ['userId'],
            template: 'USER#${userId}',
          },
          sk: {
            field: 'SK',
            composite: ['createdAt', 'postId'],
            template: 'POST#${createdAt}#${postId}',
          },
        },
        // GSI1: Global feed (all posts)
        globalFeed: {
          index: 'GSI1',
          pk: {
            field: 'GSI1PK',
            composite: [],
            template: 'POSTS',
          },
          sk: {
            field: 'GSI1SK',
            composite: ['createdAt', 'postId'],
            template: 'POST#${createdAt}#${postId}',
          },
        },
      },
    },
    { client, table: tableName }
  );
};

export type PostEntityType = EntityItem<ReturnType<typeof createPostEntity>>;
```

**File:** `packages/dal/src/entities/Follow.entity.ts`

```typescript
export const createFollowEntity = (client, tableName) => {
  return new Entity(
    {
      model: {
        entity: 'follow',
        version: '1',
        service: 'social-media-app',
      },
      attributes: {
        followerId: {
          type: 'string',
          required: true,
        },
        followedId: {
          type: 'string',
          required: true,
        },
        createdAt: {
          type: 'string',
          required: true,
          readOnly: true,
          default: () => new Date().toISOString(),
        },
      },
      indexes: {
        // Primary: PK=USER#{followerId}, SK=FOLLOWING#{followedId}
        byFollower: {
          pk: {
            field: 'PK',
            composite: ['followerId'],
            template: 'USER#${followerId}',
          },
          sk: {
            field: 'SK',
            composite: ['followedId'],
            template: 'FOLLOWING#${followedId}',
          },
        },
        // GSI1: Reverse lookup - PK=USER#{followedId}, SK=FOLLOWER#{followerId}
        byFollowed: {
          index: 'GSI1',
          pk: {
            field: 'GSI1PK',
            composite: ['followedId'],
            template: 'USER#${followedId}',
          },
          sk: {
            field: 'GSI1SK',
            composite: ['followerId'],
            template: 'FOLLOWER#${followerId}',
          },
        },
      },
    },
    { client, table: tableName }
  );
};

export type FollowEntityType = EntityItem<ReturnType<typeof createFollowEntity>>;
```

**File:** `packages/dal/src/entities/index.ts` (Entity Container)

```typescript
import { Service } from 'electrodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createUserEntity } from './User.entity.js';
import { createPostEntity } from './Post.entity.js';
import { createFollowEntity } from './Follow.entity.js';
import { createCommentEntity } from './Comment.entity.js';
import { createLikeEntity } from './Like.entity.js';
import { createNotificationEntity } from './Notification.entity.js';
import { createAuctionEntity } from './Auction.entity.js';
import { createBidEntity } from './Bid.entity.js';

/**
 * ElectroDB Service
 *
 * Groups all entities into a single service for cross-entity operations.
 * Enables transactions, batch operations, and collections.
 */
export function createEntities(
  client: DynamoDBDocumentClient,
  tableName: string
) {
  // Create individual entities
  const user = createUserEntity(client, tableName);
  const post = createPostEntity(client, tableName);
  const follow = createFollowEntity(client, tableName);
  const comment = createCommentEntity(client, tableName);
  const like = createLikeEntity(client, tableName);
  const notification = createNotificationEntity(client, tableName);
  const auction = createAuctionEntity(client, tableName);
  const bid = createBidEntity(client, tableName);

  // Group into service (enables transactions)
  const service = new Service(
    {
      user,
      post,
      follow,
      comment,
      like,
      notification,
      auction,
      bid,
    },
    { client, table: tableName }
  );

  return {
    // Individual entities
    user,
    post,
    follow,
    comment,
    like,
    notification,
    auction,
    bid,
    // Service (for transactions)
    service,
  };
}

export type Entities = ReturnType<typeof createEntities>;
```

---

## 🔄 Step 4A.3: Migration Strategy (Dual-Write Pattern)

**Goal:** Zero downtime, gradual migration with rollback capability.

**Phase 1: Add ElectroDB alongside existing code**

```typescript
export class ProfileService {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly entities?: Entities // Optional during migration
  ) {}

  async getProfileById(userId: string): Promise<Profile | null> {
    const USE_ELECTRODB = process.env.USE_ELECTRODB === 'true';

    if (USE_ELECTRODB && this.entities) {
      // ✅ New: ElectroDB
      const result = await this.entities.user.get({ userId }).go();
      return result.data ? this.mapToProfile(result.data) : null;
    } else {
      // ✅ Old: Custom query
      const result = await this.dynamoClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        })
      );
      return result.Item ? this.mapToProfile(result.Item) : null;
    }
  }
}
```

**Phase 2: Dual-write validation (writes go to both)**

```typescript
async updateProfile(userId: string, updates: ProfileUpdates): Promise<Profile> {
  const USE_ELECTRODB = process.env.USE_ELECTRODB === 'true';

  if (USE_ELECTRODB && this.entities) {
    // Write with ElectroDB
    const result = await this.entities.user
      .update({ userId })
      .set(updates)
      .go();

    // Validation: Read with old method and compare
    if (process.env.VALIDATE_ELECTRODB === 'true') {
      const oldResult = await this.getProfileByIdLegacy(userId);
      if (!this.deepEqual(result.data, oldResult)) {
        console.error('❌ Data mismatch detected!', { electrodb: result.data, legacy: oldResult });
      }
    }

    return this.mapToProfile(result.data);
  } else {
    // Write with legacy method
    return this.updateProfileLegacy(userId, updates);
  }
}
```

**Phase 3: Switch reads to ElectroDB, keep dual-write**

```typescript
// Reads use ElectroDB (fast)
// Writes still use both (safety)
```

**Phase 4: Remove legacy code**

```typescript
// After 1-2 weeks of production validation, remove legacy code
```

---

## 🎯 Step 4A.4: Update ProfileService with ElectroDB

**Before:** `packages/dal/src/services/profile.service.ts` (Custom Queries)

```typescript
// ❌ OLD: 50+ lines of boilerplate
async getProfileByHandle(handle: string): Promise<Profile | null> {
  const result = await this.dynamoClient.send(
    new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `HANDLE#${handle}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const item = result.Items[0];
  return {
    id: item.userId,
    email: item.email,
    username: item.username,
    handle: item.handle,
    fullName: item.fullName ?? null,
    bio: item.bio ?? null,
    profilePictureUrl: item.profilePictureUrl ?? null,
    profilePictureThumbnailUrl: item.profilePictureThumbnailUrl ?? null,
    postsCount: item.postsCount ?? 0,
    followersCount: item.followersCount ?? 0,
    followingCount: item.followingCount ?? 0,
    emailVerified: item.emailVerified ?? false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
```

**After:** (ElectroDB)

```typescript
// ✅ NEW: 3 lines, type-safe
async getProfileByHandle(handle: string): Promise<Profile | null> {
  const result = await this.entities.user.query.byHandle({ handle }).go();
  return result.data[0] ?? null;
}
```

**Savings:** 47 lines removed, 100% type-safe!

---

## 📊 Step 4A.5: Complex Queries with ElectroDB

### Transaction Example

**Before:** Manual transaction with 10+ lines

```typescript
// ❌ OLD: Verbose, error-prone
const transaction = new TransactWriteCommand({
  TransactItems: [
    {
      Update: {
        TableName: this.tableName,
        Key: { PK: `USER#${followerId}`, SK: 'PROFILE' },
        UpdateExpression: 'ADD followingCount :inc',
        ExpressionAttributeValues: { ':inc': 1 },
      },
    },
    {
      Update: {
        TableName: this.tableName,
        Key: { PK: `USER#${followedId}`, SK: 'PROFILE' },
        UpdateExpression: 'ADD followersCount :inc',
        ExpressionAttributeValues: { ':inc': 1 },
      },
    },
    {
      Put: {
        TableName: this.tableName,
        Item: {
          PK: `USER#${followerId}`,
          SK: `FOLLOWING#${followedId}`,
          GSI1PK: `USER#${followedId}`,
          GSI1SK: `FOLLOWER#${followerId}`,
          createdAt: new Date().toISOString(),
        },
      },
    },
  ],
});

await this.dynamoClient.send(transaction);
```

**After:** ElectroDB transactions

```typescript
// ✅ NEW: Clean, type-safe
await this.entities.service
  .transaction
  .write(({ user, follow }) => [
    user.update({ userId: followerId })
      .add({ followingCount: 1 }),
    user.update({ userId: followedId })
      .add({ followersCount: 1 }),
    follow.create({
      followerId,
      followedId,
      createdAt: new Date().toISOString(),
    }),
  ])
  .go();
```

### Pagination Example

```typescript
// ✅ ElectroDB pagination (built-in cursor support)
const firstPage = await entities.post.query
  .byUser({ userId })
  .go({ limit: 20 });

// Get next page using cursor
const secondPage = await entities.post.query
  .byUser({ userId })
  .go({
    limit: 20,
    cursor: firstPage.cursor, // Automatic cursor handling
  });
```

### Conditional Updates

```typescript
// ✅ ElectroDB conditional updates
await entities.user
  .update({ userId })
  .set({ bio: 'New bio' })
  .where((attr, op) =>
    op.eq(attr.userId, currentUserId) // Only update if owner
  )
  .go();
```

---

## 🚀 Phase 4B: GraphQL Relay Pagination

### Goals
1. Replace custom cursor pagination with Relay spec
2. Standardize connection types
3. Reduce pagination boilerplate
4. Full type safety with TypeScript

### Why graphql-relay?

**Current Pain Points:**
```typescript
// ❌ Custom pagination - reinventing the wheel
export function createConnection<T>(
  items: T[],
  cursors: string[],
  hasNextPage: boolean
): Connection<T> {
  return {
    edges: items.map((item, i) => ({
      cursor: cursors[i],
      node: item,
    })),
    pageInfo: {
      hasNextPage,
      hasPreviousPage: false,
      startCursor: cursors[0] ?? null,
      endCursor: cursors[cursors.length - 1] ?? null,
    },
  };
}
```

**With graphql-relay:**
```typescript
// ✅ Relay standard - battle-tested
import { connectionFromArray } from 'graphql-relay';

const connection = connectionFromArray(items, args);
// Done! Handles cursors, pageInfo, edges automatically
```

---

## 📦 Step 4B.1: Install Dependencies

```bash
cd packages/graphql-server
pnpm add graphql-relay
pnpm add -D @types/graphql-relay
```

---

## 🏗️ Step 4B.2: Update GraphQL Schema (Relay Compatible)

**Current Schema:** Custom connection types

```graphql
# ❌ Custom (works but non-standard)
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  cursor: String!
  node: Post!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

**Good News:** Your schema is **already Relay-compatible!** ✅

GraphQL Relay uses the exact same structure, so no schema changes needed.

---

## 🎯 Step 4B.3: Update Resolvers with graphql-relay

**Before:** Custom pagination logic

```typescript
// ❌ OLD: Custom cursor encoding/decoding
async getUserPosts(
  _parent: any,
  args: { handle: string; limit?: number; cursor?: string },
  context: GraphQLContext
) {
  const limit = args.limit ?? 20;
  const profile = await context.services.profileService.getProfileByHandle(args.handle);

  if (!profile) {
    throw new GraphQLError('Profile not found');
  }

  // Custom cursor decoding
  const startKey = args.cursor
    ? JSON.parse(Buffer.from(args.cursor, 'base64').toString('utf-8'))
    : undefined;

  const result = await context.services.postService.getPostsByUserId(
    profile.id,
    limit + 1, // +1 to check hasNextPage
    startKey
  );

  const hasNextPage = result.items.length > limit;
  const items = hasNextPage ? result.items.slice(0, limit) : result.items;

  // Custom cursor encoding
  const edges = items.map((post) => ({
    cursor: Buffer.from(JSON.stringify({
      PK: post.PK,
      SK: post.SK,
    })).toString('base64'),
    node: post,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
}
```

**After:** graphql-relay

```typescript
// ✅ NEW: Relay standard (10 lines vs 50)
import { connectionFromArraySlice, cursorToOffset } from 'graphql-relay';

async getUserPosts(
  _parent: any,
  args: { handle: string; first?: number; after?: string },
  context: GraphQLContext
) {
  const profile = await context.services.profileService.getProfileByHandle(args.handle);

  if (!profile) {
    throw new GraphQLError('Profile not found');
  }

  // Relay cursor to offset
  const offset = args.after ? cursorToOffset(args.after) + 1 : 0;
  const limit = args.first ?? 20;

  // Fetch posts (with +1 for hasNextPage)
  const result = await context.services.postService.getPostsByUserId(
    profile.id,
    limit + 1,
    offset
  );

  // Relay connection helper
  return connectionFromArraySlice(
    result.items.slice(0, limit), // Don't include +1 item
    args,
    {
      sliceStart: offset,
      arrayLength: offset + result.items.length,
    }
  );
}
```

---

## 🔄 Step 4B.4: Advanced Relay Patterns

### Connection from Promise

For async data sources (DynamoDB):

```typescript
import { connectionFromPromisedArray } from 'graphql-relay';

async getUserPosts(parent, args, context) {
  const postsPromise = context.services.postService.getPostsByUserId(userId);
  return connectionFromPromisedArray(postsPromise, args);
}
```

### Custom Edge Types

Add extra fields to edges:

```typescript
// GraphQL Schema
type PostEdge {
  cursor: String!
  node: Post!
  # Custom fields
  readAt: String
  bookmarked: Boolean
}

// Resolver
const connection = connectionFromArray(posts, args);
connection.edges = connection.edges.map(edge => ({
  ...edge,
  readAt: getReadAt(edge.node.id, context.userId),
  bookmarked: isBookmarked(edge.node.id, context.userId),
}));
```

### Global Object Identification (Relay Node Interface)

```graphql
interface Node {
  id: ID!
}

type Post implements Node {
  id: ID! # Global ID: base64("Post:123")
  # ... other fields
}

type Query {
  node(id: ID!): Node
}
```

```typescript
import { fromGlobalId, toGlobalId } from 'graphql-relay';

// Encode
const globalId = toGlobalId('Post', '123'); // "UG9zdDoxMjM="

// Decode
const { type, id } = fromGlobalId(globalId); // { type: 'Post', id: '123' }

// Resolver
Query: {
  node: async (_parent, args, context) => {
    const { type, id } = fromGlobalId(args.id);

    switch (type) {
      case 'Post':
        return context.services.postService.getPostById(id);
      case 'User':
        return context.services.profileService.getProfileById(id);
      default:
        return null;
    }
  },
}
```

---

## 🧪 Testing Strategy

### ElectroDB Entity Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createEntities } from '../entities/index.js';

describe('User Entity', () => {
  let entities: Entities;

  beforeAll(() => {
    const client = createMockDynamoClient();
    entities = createEntities(client, 'test-table');
  });

  it('should create user', async () => {
    const user = await entities.user.create({
      userId: '123',
      email: 'test@example.com',
      username: 'testuser',
      handle: 'testuser',
    }).go();

    expect(user.data).toMatchObject({
      userId: '123',
      email: 'test@example.com',
      username: 'testuser',
    });
  });

  it('should query by email', async () => {
    const result = await entities.user.query
      .byEmail({ email: 'test@example.com' })
      .go();

    expect(result.data).toHaveLength(1);
    expect(result.data[0].email).toBe('test@example.com');
  });

  it('should enforce unique constraints', async () => {
    // Attempt to create duplicate email
    await expect(
      entities.user.create({
        userId: '456',
        email: 'test@example.com', // Duplicate
        username: 'testuser2',
        handle: 'testuser2',
      }).go()
    ).rejects.toThrow('ConditionalCheckFailedException');
  });
});
```

### Relay Pagination Tests

```typescript
import { describe, it, expect } from 'vitest';
import { connectionFromArray } from 'graphql-relay';

describe('Relay Pagination', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: `post-${i}`,
    content: `Post ${i}`,
  }));

  it('should return first page', () => {
    const connection = connectionFromArray(items, { first: 10 });

    expect(connection.edges).toHaveLength(10);
    expect(connection.pageInfo.hasNextPage).toBe(true);
    expect(connection.pageInfo.hasPreviousPage).toBe(false);
  });

  it('should return second page', () => {
    const firstPage = connectionFromArray(items, { first: 10 });
    const secondPage = connectionFromArray(items, {
      first: 10,
      after: firstPage.pageInfo.endCursor,
    });

    expect(secondPage.edges).toHaveLength(10);
    expect(secondPage.edges[0].node.id).toBe('post-10');
  });

  it('should handle last page', () => {
    const connection = connectionFromArray(items, { first: 10, after: 'cursor-95' });

    expect(connection.edges.length).toBeLessThanOrEqual(10);
    expect(connection.pageInfo.hasNextPage).toBe(false);
  });
});
```

---

## 📊 Migration Metrics & Monitoring

### ElectroDB Metrics

**Track during migration:**
- Query performance (ElectroDB vs legacy)
- Data consistency (dual-write validation)
- Error rates
- Memory usage

```typescript
// Log query performance
const startTime = Date.now();
const result = await entities.user.get({ userId }).go();
const duration = Date.now() - startTime;

await cloudwatch.putMetricData({
  Namespace: 'SocialMediaApp/ElectroDB',
  MetricData: [{
    MetricName: 'QueryDuration',
    Value: duration,
    Unit: 'Milliseconds',
    Dimensions: [{ Name: 'Entity', Value: 'User' }],
  }],
});
```

### Data Consistency Checks

```typescript
// Validation mode: Compare ElectroDB vs legacy results
if (process.env.VALIDATE_ELECTRODB === 'true') {
  const electrodbResult = await entities.user.get({ userId }).go();
  const legacyResult = await this.getUserLegacy(userId);

  const match = deepEqual(electrodbResult.data, legacyResult);

  await cloudwatch.putMetricData({
    Namespace: 'SocialMediaApp/ElectroDB',
    MetricData: [{
      MetricName: 'DataConsistency',
      Value: match ? 1 : 0,
      Unit: 'Count',
    }],
  });

  if (!match) {
    console.error('❌ Data mismatch!', { electrodb: electrodbResult.data, legacy: legacyResult });
  }
}
```

---

## 🔄 Rollback Strategy

### Feature Flags

```typescript
// Environment variables
const USE_ELECTRODB = process.env.USE_ELECTRODB === 'true';
const USE_RELAY_PAGINATION = process.env.USE_RELAY_PAGINATION === 'true';

// Service-level flags
export class ProfileService {
  async getProfileById(userId: string) {
    if (USE_ELECTRODB && this.entities) {
      return this.getProfileByIdElectroDB(userId);
    } else {
      return this.getProfileByIdLegacy(userId);
    }
  }
}
```

### Gradual Rollout

**Week 1:** Deploy with flags disabled (baseline)
**Week 2:** Enable ElectroDB for 10% of reads (A/B test)
**Week 3:** Enable for 50% of reads, monitor consistency
**Week 4:** Enable for 100% of reads
**Week 5:** Enable dual-write (both ElectroDB + legacy)
**Week 6:** ElectroDB-only writes (remove legacy)

### Emergency Rollback

```bash
# Instant rollback via environment variable
aws lambda update-function-configuration \
  --function-name social-media-app-graphql \
  --environment Variables={USE_ELECTRODB=false}

# Or via CDK
cdk deploy --context useElectroDB=false
```

---

## 📅 Implementation Timeline

### Week 1: ElectroDB Entities
- **Day 1**: Install ElectroDB, create User entity
- **Day 2**: Create Post, Follow, Comment entities
- **Day 3**: Create Like, Notification entities
- **Day 4**: Create Auction, Bid entities
- **Day 5**: Write entity tests

### Week 2: Service Integration (Reads)
- **Day 1**: Update ProfileService (read operations)
- **Day 2**: Update PostService (read operations)
- **Day 3**: Update FollowService (read operations)
- **Day 4**: Update remaining services
- **Day 5**: Integration tests

### Week 3: ElectroDB Writes & Validation
- **Day 1**: Dual-write implementation
- **Day 2**: Data consistency validation
- **Day 3**: Transaction migration
- **Day 4**: Load testing
- **Day 5**: Deploy to production (read-only)

### Week 4: GraphQL Relay
- **Day 1**: Install graphql-relay
- **Day 2**: Update Query resolvers (posts, comments)
- **Day 3**: Update remaining resolvers
- **Day 4**: Global ID implementation (optional)
- **Day 5**: Testing & deployment

### Week 5: Production Validation
- **Day 1-3**: Monitor dual-write consistency
- **Day 4**: Switch to ElectroDB-only writes
- **Day 5**: Performance analysis

### Week 6: Cleanup
- **Day 1-2**: Remove legacy query code
- **Day 3**: Update documentation
- **Day 4**: Final testing
- **Day 5**: Retrospective

---

## ✅ Success Criteria

### Phase 4A: ElectroDB
- ✅ All entities created and tested
- ✅ 100% type-safe DynamoDB operations
- ✅ Zero data inconsistencies during dual-write
- ✅ Query performance equal or better than legacy
- ✅ 60% reduction in query boilerplate
- ✅ All tests passing
- ✅ Legacy code removed

### Phase 4B: GraphQL Relay
- ✅ All connections use graphql-relay
- ✅ Cursor pagination works correctly
- ✅ Backward/forward pagination supported
- ✅ Global IDs implemented (if applicable)
- ✅ Client code unaffected (schema compatible)
- ✅ 50% reduction in pagination code

---

## 💰 Cost Analysis

### ElectroDB
- **No additional infrastructure cost** (library only)
- **Potential DynamoDB savings**: Better query patterns = fewer RCUs
- **Developer time savings**: 60% less boilerplate = faster development

### graphql-relay
- **No additional infrastructure cost** (library only)
- **No performance impact**: Same underlying pagination logic

### Total Cost
- **Infrastructure**: $0
- **Developer time**: 2-3 weeks one-time investment
- **Ongoing savings**: Faster development, fewer bugs

**ROI:**
- Reduced maintenance burden
- Better developer experience
- Fewer query-related bugs
- Easier onboarding for new developers

---

## 🚨 Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data inconsistency during migration | Medium | High | Dual-write validation, extensive testing |
| Performance regression | Low | Medium | Load testing, gradual rollout, feature flags |
| Breaking changes in ElectroDB | Low | Medium | Pin version, monitor releases |
| Learning curve for team | Medium | Low | Documentation, pair programming |

---

## 🔗 References

- [ElectroDB Documentation](https://electrodb.dev/)
- [GraphQL Relay Specification](https://relay.dev/graphql/connections.htm)
- [graphql-relay NPM](https://www.npmjs.com/package/graphql-relay)
- [DynamoDB Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [Relay Cursor Connections](https://relay.dev/docs/guides/graphql-server-specification/)

---

## 📝 Next Steps

1. **Review this plan** with team
2. **Get approval** for 2-3 week timeline
3. **Create feature branch**: `feat/electrodb-relay-migration`
4. **Begin Week 1**: ElectroDB entities
5. **Schedule weekly progress reviews**

---

**Ready to implement when Phase 3B/3C is complete!** 🚀
