# Pothos Plugin Migration - Detailed Implementation Plan

## Executive Summary

This document outlines the complete migration strategy for replacing hand-rolled GraphQL solutions with Pothos plugins. The migration is designed to be **incremental, safe, and reversible** with clear success criteria at each phase.

**Estimated Total Time:** 2-3 weeks
**LOC Reduction:** ~600+ lines
**Risk Level:** Medium (mitigated by phased approach)

---

## Table of Contents

1. [Pre-Migration Assessment](#pre-migration-assessment)
2. [Phase 0: Setup & Validation](#phase-0-setup--validation)
3. [Phase 1: Complexity Plugin](#phase-1-complexity-plugin)
4. [Phase 2: Relay Plugin](#phase-2-relay-plugin)
5. [Phase 3: Dataloader Plugin](#phase-3-dataloader-plugin)
6. [Phase 4: Tracing Plugin](#phase-4-tracing-plugin)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Procedures](#rollback-procedures)
9. [Success Metrics](#success-metrics)
10. [Risk Mitigation](#risk-mitigation)

---

## Pre-Migration Assessment

### Current State Inventory

**✅ Already Using:**
- `@pothos/core` (v4.10.0)
- `@pothos/plugin-scope-auth` (v4.1.6)
- `@pothos/plugin-validation` (v4.2.0)

**📦 Plugins to Install:**
- `@pothos/plugin-complexity`
- `@pothos/plugin-relay`
- `@pothos/plugin-dataloader`
- `@pothos/plugin-tracing`
- `@pothos/plugin-tracing-opentelemetry` (optional)

**🗑️ Dependencies to Remove:**
- `graphql-validation-complexity` (replaced by complexity plugin)
- `graphql-depth-limit` (replaced by complexity plugin)
- `dataloader` package (replaced by dataloader plugin)

**📝 Files to Update/Remove:**
| File | Action | Phase |
|------|--------|-------|
| `dataloaders/index.ts` | Remove | Phase 3 |
| `infrastructure/pagination/CursorCodec.ts` | Remove | Phase 2 |
| `infrastructure/pagination/ConnectionBuilder.ts` | Remove | Phase 2 |
| `shared/types/pagination.ts` | Keep (still needed for SDL) | Phase 2 |
| `schema/pothos/builder.ts` | Update | All Phases |
| `standalone-server.ts` | Update | Phase 1 |
| `server.ts` | Update | Phase 1 |

---

## Phase 0: Setup & Validation

**Duration:** 1 day
**Risk:** Low
**Blocker:** None

### Objectives
- Set up testing infrastructure
- Validate current system baseline
- Document current behavior
- Establish rollback checkpoints

### Detailed Steps

#### Step 0.1: Create Git Branch
```bash
cd /home/user/social-media-app
git checkout -b pothos-plugin-migration
```

#### Step 0.2: Run Baseline Tests
```bash
# Run all tests to establish baseline
cd packages/graphql-server
pnpm test

# Document results
mkdir -p docs/migration
pnpm test --reporter=json > docs/migration/baseline-tests.json
```

#### Step 0.3: Performance Baseline
```bash
# Run load test to establish performance baseline
# Document current query performance
node scripts/benchmark-queries.js > docs/migration/baseline-performance.json
```

**If benchmark script doesn't exist, create it:**
```typescript
// scripts/benchmark-queries.js
import { performance } from 'perf_hooks';
import { graphql } from 'graphql';
import { schema } from '../dist/schema/index.js';

const queries = [
  {
    name: 'posts_connection',
    query: `
      query Posts {
        posts(first: 10) {
          edges {
            node { id title author { username } }
            cursor
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `,
  },
  // Add more critical queries
];

async function benchmark() {
  const results = {};

  for (const { name, query } of queries) {
    const start = performance.now();
    await graphql({ schema, source: query });
    const duration = performance.now() - start;
    results[name] = { duration, timestamp: new Date().toISOString() };
  }

  console.log(JSON.stringify(results, null, 2));
}

benchmark();
```

#### Step 0.4: Document Current Schema
```bash
# Generate schema SDL for comparison
pnpm graphql-codegen
cp src/generated/schema.graphql docs/migration/baseline-schema.graphql
```

#### Step 0.5: Create Migration Tracking
```bash
# Create migration checklist
cat > docs/migration/checklist.md << 'EOF'
# Pothos Plugin Migration Checklist

## Phase 0: Setup ✅
- [ ] Git branch created
- [ ] Baseline tests run (all passing)
- [ ] Performance baseline documented
- [ ] Schema snapshot created

## Phase 1: Complexity Plugin
- [ ] Plugin installed
- [ ] Builder configured
- [ ] Validation rules updated
- [ ] Tests passing
- [ ] Performance validated
- [ ] Old dependencies removed

## Phase 2: Relay Plugin
- [ ] Plugin installed
- [ ] Builder configured
- [ ] Posts connection migrated
- [ ] Tests passing
- [ ] Performance validated

## Phase 3: Dataloader Plugin
- [ ] Plugin installed
- [ ] profileLoader migrated
- [ ] postLoader migrated
- [ ] likeStatusLoader migrated
- [ ] auctionLoader migrated
- [ ] Tests passing
- [ ] N+1 queries validated

## Phase 4: Tracing Plugin
- [ ] Plugin installed
- [ ] Tracing configured
- [ ] OpenTelemetry integrated
- [ ] Logs validated
EOF
```

### Success Criteria
- ✅ All baseline tests pass
- ✅ Performance metrics documented
- ✅ Schema SDL snapshot created
- ✅ Git branch created with clean working tree

### Rollback
Not applicable (no changes made yet)

---

## Phase 1: Complexity Plugin

**Duration:** 1-2 days
**Risk:** Low
**Dependencies:** Phase 0 complete
**LOC Removed:** ~30 lines

### Objectives
- Replace `graphql-validation-complexity` with Pothos complexity plugin
- Replace `graphql-depth-limit` with complexity plugin depth limiting
- Simplify validation rules

### Current Implementation
```typescript
// packages/graphql-server/src/standalone-server.ts (line ~30-40)
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  schema,
  validationRules: [
    depthLimit(10),
    createComplexityRule({
      maximumComplexity: 1000,
    }),
  ],
});
```

### Detailed Steps

#### Step 1.1: Install Plugin
```bash
cd packages/graphql-server
pnpm add @pothos/plugin-complexity
```

#### Step 1.2: Update Builder Configuration
**File:** `src/schema/pothos/builder.ts`

```typescript
// Add to imports
import ComplexityPlugin from '@pothos/plugin-complexity';

// Update builder
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: AuthScopes;
}>({
  plugins: [
    ScopeAuthPlugin,
    ValidationPlugin,
    ComplexityPlugin, // ADD THIS
  ],
  scopeAuth: {
    // ... existing config
  },
  // ADD COMPLEXITY CONFIG
  complexity: {
    // Default complexity for any field (if not specified)
    defaultComplexity: 1,

    // Multiplier for list fields
    defaultListMultiplier: 10,

    // Global limits
    limit: {
      // Max total complexity for entire query
      complexity: 1000,

      // Max query depth (replaces graphql-depth-limit)
      depth: 10,

      // Max query breadth (fields per level)
      breadth: 50,
    },
  },
});
```

#### Step 1.3: Add Per-Field Complexity (Optional Enhancement)
**File:** `src/schema/pothos/queries/auth.ts`

```typescript
// Example: Add dynamic complexity based on pagination args
builder.queryField('posts', (t) => ({
  type: PostConnectionType,
  args: {
    first: t.arg.int({ defaultValue: 10 }),
    after: t.arg.string({ required: false }),
  },
  // Dynamic complexity calculation
  complexity: (args) => {
    // Complexity = base + (items requested * multiplier)
    return 5 + (args.first ?? 10) * 2;
  },
  resolve: async (parent, args, context) => {
    // ... resolver logic
  },
}));
```

#### Step 1.4: Remove Old Validation Rules
**File:** `src/standalone-server.ts`

```typescript
// REMOVE these imports
// import depthLimit from 'graphql-depth-limit';
// import { createComplexityRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  schema, // Complexity plugin is already integrated into schema
  // REMOVE validationRules array
  plugins: [
    // ... existing plugins
  ],
});
```

**File:** `src/server.ts` (Express server)
```typescript
// Same changes as standalone-server.ts
```

#### Step 1.5: Remove Old Dependencies
**File:** `package.json`

```bash
# Remove old dependencies
pnpm remove graphql-validation-complexity graphql-depth-limit @types/graphql-depth-limit
```

#### Step 1.6: Update Tests
**File:** `src/__tests__/complexity.test.ts` (create if doesn't exist)

```typescript
import { describe, it, expect } from 'vitest';
import { graphql } from 'graphql';
import { schema } from '../schema/index.js';

describe('Query Complexity Limits', () => {
  it('should reject queries exceeding complexity limit', async () => {
    const query = `
      query TooComplex {
        posts(first: 100) {
          edges {
            node {
              id
              title
              author {
                id
                username
                posts(first: 100) {
                  edges {
                    node {
                      id
                      comments(first: 100) {
                        edges { node { id } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toContain('complexity');
  });

  it('should reject queries exceeding depth limit', async () => {
    const query = `
      query TooDeep {
        posts { edges { node { author { posts { edges { node {
          author { posts { edges { node { author { posts { edges { node {
            id
          }}}}}}}}
        }}}}}}
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toContain('depth');
  });

  it('should allow queries within limits', async () => {
    const query = `
      query Simple {
        posts(first: 5) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeUndefined();
  });
});
```

#### Step 1.7: Build and Test
```bash
# Build
pnpm build

# Run tests
pnpm test

# Run complexity tests specifically
pnpm test complexity.test.ts
```

#### Step 1.8: Manual Testing
```bash
# Start server
pnpm dev:server

# Test with GraphQL client (in another terminal)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query TooComplex { posts(first: 100) { edges { node { id author { posts(first: 100) { edges { node { id } } } } } } } }"
  }'

# Should return error about complexity limit
```

### Success Criteria
- ✅ All tests pass (including new complexity tests)
- ✅ Complex queries are rejected with clear error messages
- ✅ Simple queries work normally
- ✅ Old dependencies removed from package.json
- ✅ No performance regression (compare to baseline)

### Rollback Procedure
```bash
# Revert builder.ts changes
git checkout HEAD -- src/schema/pothos/builder.ts

# Revert server changes
git checkout HEAD -- src/standalone-server.ts src/server.ts

# Reinstall old dependencies
pnpm add graphql-validation-complexity graphql-depth-limit @types/graphql-depth-limit

# Remove plugin
pnpm remove @pothos/plugin-complexity

# Rebuild
pnpm build
```

---

## Phase 2: Relay Plugin

**Duration:** 3-4 days
**Risk:** Medium
**Dependencies:** Phase 1 complete, Posts module migrated to Pothos
**LOC Removed:** ~250 lines

### Objectives
- Replace manual cursor pagination with Relay plugin
- Migrate connection queries (posts, comments, notifications, auctions)
- Remove CursorCodec and ConnectionBuilder classes
- Implement global node interface

### Current Implementation
```typescript
// Manual cursor encoding/decoding
const cursor = cursorCodec.encode({ id: post.id, sortKey: post.createdAt });

// Manual connection building
const connection = connectionBuilder.build({
  nodes: posts,
  hasMore: posts.length === limit,
  getCursorData: (post) => ({ id: post.id, sortKey: post.createdAt }),
});
```

### Detailed Steps

#### Step 2.1: Install Plugin
```bash
pnpm add @pothos/plugin-relay
```

#### Step 2.2: Update Builder Configuration
**File:** `src/schema/pothos/builder.ts`

```typescript
// Add to imports
import RelayPlugin from '@pothos/plugin-relay';

// Update builder
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: AuthScopes;
}>({
  plugins: [
    ScopeAuthPlugin,
    ValidationPlugin,
    ComplexityPlugin,
    RelayPlugin, // ADD THIS - MUST BE AFTER COMPLEXITY
  ],
  // ADD RELAY CONFIG
  relayOptions: {
    // Client mutation ID handling
    clientMutationId: 'omit', // or 'required' if you want it

    // Cursor encoding
    cursorType: 'String', // opaque base64 strings

    // Default node query options
    nodeQueryOptions: {},

    // Default nodes query options
    nodesQueryOptions: {},

    // Disable if you don't want automatic node queries
    // (you already have explicit queries for most things)
    brandLoadedObjects: false,
  },
  // ... rest of config
});
```

#### Step 2.3: Implement Node Interface
**File:** `src/schema/pothos/interfaces/node.ts` (create new)

```typescript
import { builder } from '../builder.js';

/**
 * Global Node interface for Relay
 * All entities with a global ID should implement this
 */
export const NodeInterface = builder.node(builder.interfaceRef('Node'), {
  id: {
    resolve: (obj) => obj.id,
  },
  loadOne: async (id, context) => {
    // Parse the global ID to determine type and ID
    // Relay plugin automatically encodes/decodes { __typename, id }

    // This is called by the node(id: ID!) query
    // You can implement type-specific loading here
    // or return null if not found

    // Example implementation:
    // The id here is already decoded by Relay plugin
    // It's in format: base64({ __typename: "Post", id: "post-123" })

    // For now, return null - we'll implement per-type
    return null;
  },
  resolveType: (obj) => {
    // Determine GraphQL type from object
    if ('title' in obj && 'content' in obj) return 'Post';
    if ('username' in obj) return 'Profile';
    if ('text' in obj && 'postId' in obj) return 'Comment';
    return null;
  },
});
```

#### Step 2.4: Update Post Type to Implement Node
**File:** `src/schema/pothos/types/post.ts` (create new file for Posts migration)

```typescript
import { builder } from '../builder.js';
import { NodeInterface } from '../interfaces/node.js';
import type { Post } from '@social-media-app/dal';

/**
 * Post implements Node interface for global IDs
 */
export const PostType = builder.node('Post', {
  // Implement Node interface
  interfaces: [NodeInterface],

  // Load a single post by ID (for node query)
  loadOne: async (id, context) => {
    const post = await context.services.postService.getPost(id);
    return post ?? null;
  },

  // Load multiple posts by IDs (for nodes query)
  loadMany: async (ids, context) => {
    const posts = await context.services.postService.getPostsByIds(ids);
    return ids.map(id => posts.get(id) ?? null);
  },

  // Fields
  fields: (t) => ({
    // id field is automatically added by node() method

    title: t.exposeString('title'),

    content: t.exposeString('content'),

    createdAt: t.string({
      resolve: (post) => post.createdAt.toISOString(),
    }),

    author: t.field({
      type: ProfileType,
      resolve: async (post, args, context) => {
        return context.loaders.profileLoader.load(post.userId);
      },
    }),

    isLiked: t.boolean({
      nullable: true,
      resolve: async (post, args, context) => {
        if (!context.userId) return null;
        const status = await context.loaders.likeStatusLoader.load(post.id);
        return status?.isLiked ?? null;
      },
    }),

    likesCount: t.int({
      resolve: (post) => post.likesCount ?? 0,
    }),

    commentsCount: t.int({
      resolve: (post) => post.commentsCount ?? 0,
    }),
  }),
});
```

#### Step 2.5: Create Posts Connection Query
**File:** `src/schema/pothos/queries/posts.ts` (create new)

```typescript
import { builder } from '../builder.js';
import { PostType } from '../types/post.js';
import { executeUseCase } from '../../../infrastructure/resolvers/helpers/useCase.js';

builder.queryFields((t) => ({
  /**
   * Posts connection with Relay-style pagination
   * Automatically handles cursors, pageInfo, edges
   */
  posts: t.connection({
    type: PostType,

    // Additional args beyond first/after/last/before
    args: {
      status: t.arg.string({ required: false }),
      userId: t.arg.string({ required: false }),
    },

    // Complexity based on how many items requested
    complexity: (args) => {
      const count = args.first ?? args.last ?? 10;
      return 5 + count * 2;
    },

    resolve: async (parent, args, context) => {
      // Pothos provides:
      // - args.first (forward pagination)
      // - args.after (cursor for forward pagination)
      // - args.last (backward pagination)
      // - args.before (cursor for backward pagination)

      const result = await executeUseCase(
        context.container.resolve('getPosts'),
        {
          // Forward pagination
          first: args.first ?? undefined,
          after: args.after ?? undefined,

          // Backward pagination
          last: args.last ?? undefined,
          before: args.before ?? undefined,

          // Custom filters
          status: args.status ?? undefined,
          userId: args.userId ?? undefined,
        }
      );

      // Relay plugin expects:
      // 1. Array of nodes, OR
      // 2. Object with { edges, pageInfo }

      // For simple case, just return array:
      // Pothos will automatically create cursors from node IDs
      return result.posts;

      // For custom cursors (e.g., based on timestamp):
      // return {
      //   edges: result.posts.map(post => ({
      //     node: post,
      //     cursor: encodeCursor({ id: post.id, timestamp: post.createdAt }),
      //   })),
      //   pageInfo: {
      //     hasNextPage: result.hasMore,
      //     hasPreviousPage: false,
      //     startCursor: ...,
      //     endCursor: ...,
      //   },
      // };
    },
  }),
}));
```

#### Step 2.6: Update GetPosts Use Case
**File:** `src/application/use-cases/post/GetPosts.ts`

```typescript
// Update to support Relay pagination args
export interface GetPostsInput {
  // Forward pagination
  first?: number;
  after?: string; // cursor

  // Backward pagination
  last?: number;
  before?: string; // cursor

  // Filters
  status?: string;
  userId?: string;
}

export interface GetPostsOutput {
  posts: Post[];
  hasMore: boolean;
  // Optionally add total count
  totalCount?: number;
}

export class GetPosts {
  async execute(input: GetPostsInput): AsyncResult<GetPostsOutput> {
    // Decode cursor if provided
    let afterId: string | undefined;
    let beforeId: string | undefined;

    if (input.after) {
      // Relay cursors are base64 encoded
      // If you use simple cursors (just ID), decode:
      afterId = Buffer.from(input.after, 'base64').toString('utf-8');
    }

    if (input.before) {
      beforeId = Buffer.from(input.before, 'base64').toString('utf-8');
    }

    // Fetch posts from service
    const posts = await this.services.postService.getPosts({
      limit: input.first ?? input.last ?? 10,
      afterId,
      beforeId,
      status: input.status,
      userId: input.userId,
    });

    return {
      success: true,
      data: {
        posts,
        hasMore: posts.length === (input.first ?? input.last ?? 10),
      },
    };
  }
}
```

#### Step 2.7: Test Relay Implementation
**File:** `src/__tests__/relay-pagination.test.ts` (create new)

```typescript
import { describe, it, expect } from 'vitest';
import { graphql } from 'graphql';
import { schema } from '../schema/index.js';

describe('Relay Pagination', () => {
  it('should return posts connection with edges and pageInfo', async () => {
    const query = `
      query Posts {
        posts(first: 5) {
          edges {
            node {
              id
              title
            }
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query });

    expect(result.errors).toBeUndefined();
    expect(result.data?.posts).toBeDefined();
    expect(result.data?.posts.edges).toBeInstanceOf(Array);
    expect(result.data?.posts.pageInfo).toMatchObject({
      hasNextPage: expect.any(Boolean),
      hasPreviousPage: expect.any(Boolean),
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });
  });

  it('should support forward pagination with after cursor', async () => {
    // First query
    const firstQuery = `
      query FirstPage {
        posts(first: 2) {
          edges {
            node { id }
            cursor
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    `;

    const firstResult = await graphql({ schema, source: firstQuery });
    const endCursor = firstResult.data?.posts.pageInfo.endCursor;

    // Second query with cursor
    const secondQuery = `
      query SecondPage($after: String!) {
        posts(first: 2, after: $after) {
          edges {
            node { id }
          }
        }
      }
    `;

    const secondResult = await graphql({
      schema,
      source: secondQuery,
      variableValues: { after: endCursor },
    });

    expect(secondResult.errors).toBeUndefined();

    // Posts should be different
    const firstIds = firstResult.data?.posts.edges.map((e: any) => e.node.id);
    const secondIds = secondResult.data?.posts.edges.map((e: any) => e.node.id);
    expect(firstIds).not.toEqual(secondIds);
  });

  it('should support node(id:) query', async () => {
    // Get a post ID first
    const postsQuery = `
      query { posts(first: 1) { edges { node { id } } } }
    `;

    const postsResult = await graphql({ schema, source: postsQuery });
    const globalId = postsResult.data?.posts.edges[0]?.node.id;

    // Query by global ID
    const nodeQuery = `
      query GetNode($id: ID!) {
        node(id: $id) {
          id
          ... on Post {
            title
          }
        }
      }
    `;

    const nodeResult = await graphql({
      schema,
      source: nodeQuery,
      variableValues: { id: globalId },
    });

    expect(nodeResult.errors).toBeUndefined();
    expect(nodeResult.data?.node).toBeDefined();
    expect(nodeResult.data?.node.id).toBe(globalId);
  });
});
```

#### Step 2.8: Remove Old Pagination Code (After All Connections Migrated)
```bash
# Only do this after all connection queries are migrated
rm src/infrastructure/pagination/CursorCodec.ts
rm src/infrastructure/pagination/ConnectionBuilder.ts

# Update index exports
# Remove exports from src/infrastructure/pagination/index.ts
```

#### Step 2.9: Integration Test
```bash
# Build
pnpm build

# Run tests
pnpm test relay-pagination.test.ts

# Manual testing
pnpm dev:server

# Test in GraphQL Playground / Apollo Studio
```

### Migration Checklist for Each Connection

**Repeat for each connection type:**

- [ ] Posts connection
- [ ] Comments connection
- [ ] Notifications connection
- [ ] Auctions connection
- [ ] User's posts connection (Profile.posts field)

**For each connection:**
1. Create/update the type to implement Node interface
2. Add loadOne/loadMany methods
3. Create connection query with t.connection()
4. Update use case to support cursor pagination
5. Write tests for pagination
6. Verify in GraphQL playground

### Success Criteria
- ✅ All connection queries return proper Relay format
- ✅ Forward pagination works (first/after)
- ✅ Backward pagination works (last/before)
- ✅ Cursors are opaque (base64 encoded)
- ✅ node(id:) query works for all types
- ✅ Tests pass
- ✅ No N+1 queries (verify with logs/tracing)

### Rollback Procedure
```bash
# Revert schema changes
git checkout HEAD -- src/schema/pothos/

# Keep old pagination code
git restore src/infrastructure/pagination/

# Remove plugin
pnpm remove @pothos/plugin-relay

# Update builder
git checkout HEAD -- src/schema/pothos/builder.ts

# Rebuild
pnpm build
```

---

## Phase 3: Dataloader Plugin

**Duration:** 3-4 days
**Risk:** Medium-High
**Dependencies:** Phase 2 complete
**LOC Removed:** ~150 lines

### Objectives
- Replace manual DataLoader factory with Pothos dataloader plugin
- Convert loaders to loadable objects
- Simplify field resolvers
- Maintain N+1 prevention

### Current Implementation
```typescript
// Manual DataLoader creation
export function createLoaders(services: Services, userId: string | null) {
  return {
    profileLoader: new DataLoader(async (ids) => {
      const profiles = await services.profileService.getProfilesByIds([...ids]);
      return ids.map(id => profiles.get(id) || null);
    }),
    // ... more loaders
  };
}

// Usage in resolvers
const profile = await context.loaders.profileLoader.load(parent.userId);
```

### Detailed Steps

#### Step 3.1: Install Plugin
```bash
pnpm add @pothos/plugin-dataloader
```

#### Step 3.2: Update Builder Configuration
**File:** `src/schema/pothos/builder.ts`

```typescript
// Add to imports
import DataloaderPlugin from '@pothos/plugin-dataloader';

// Update builder
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: AuthScopes;
}>({
  plugins: [
    ScopeAuthPlugin,
    ValidationPlugin,
    ComplexityPlugin,
    RelayPlugin,
    DataloaderPlugin, // ADD THIS - MUST BE LAST
  ],
  // No additional config needed for dataloader plugin
  // It automatically creates loaders for loadableObject/loadableNode types
});
```

#### Step 3.3: Convert Profile to Loadable Object
**File:** `src/schema/pothos/types/profile.ts` (create new)

```typescript
import { builder } from '../builder.js';
import type { PublicProfile } from '@social-media-app/dal';

/**
 * Profile as a loadable object
 * Pothos will automatically create a DataLoader for this type
 */
export const ProfileType = builder.loadableObject('Profile', {
  // Load function - called with batched IDs
  load: async (ids: string[], context) => {
    const profiles = await context.services.profileService.getProfilesByIds(ids);

    // MUST return array in same order as input IDs
    // Return null for missing profiles
    return ids.map(id => profiles.get(id) || null);
  },

  fields: (t) => ({
    id: t.exposeID('id'),

    username: t.exposeString('username'),

    displayName: t.string({
      nullable: true,
      resolve: (profile) => profile.displayName ?? null,
    }),

    bio: t.string({
      nullable: true,
      resolve: (profile) => profile.bio ?? null,
    }),

    avatarUrl: t.string({
      nullable: true,
      resolve: (profile) => profile.avatarUrl ?? null,
    }),

    createdAt: t.string({
      resolve: (profile) => profile.createdAt.toISOString(),
    }),

    // Posts connection for this profile
    posts: t.connection({
      type: PostType,
      resolve: async (profile, args, context) => {
        const result = await context.services.postService.getPosts({
          userId: profile.id,
          first: args.first ?? 10,
          after: args.after,
        });
        return result.posts;
      },
    }),
  }),
});
```

#### Step 3.4: Update Post Type to Use Loadable Profile
**File:** `src/schema/pothos/types/post.ts`

```typescript
// Update the author field
export const PostType = builder.node('Post', {
  // ... existing config

  fields: (t) => ({
    // ... other fields

    author: t.field({
      type: ProfileType,
      // Just return the userId - Pothos will automatically use the loader!
      resolve: (post) => post.userId,
    }),

    // For loadable objects, you can also use t.loadable():
    // author: t.loadable({
    //   type: ProfileType,
    //   load: (post, context) => post.userId,
    // }),
  }),
});
```

#### Step 3.5: Create Loadable LikeStatus
**File:** `src/schema/pothos/types/like-status.ts` (create new)

```typescript
import { builder } from '../builder.js';

/**
 * LikeStatus loadable type
 * Batches like status checks for multiple posts
 */
export const LikeStatusType = builder.loadableObject('LikeStatus', {
  // Load function receives post IDs and context
  load: async (postIds: string[], context) => {
    // If user not authenticated, return all nulls
    if (!context.userId) {
      return postIds.map(() => null);
    }

    const statuses = await context.services.likeService.getLikeStatusesByPostIds(
      context.userId,
      postIds
    );

    return postIds.map(postId => statuses.get(postId) || null);
  },

  fields: (t) => ({
    isLiked: t.exposeBoolean('isLiked'),

    likedAt: t.string({
      nullable: true,
      resolve: (status) => status.likedAt?.toISOString() ?? null,
    }),
  }),
});

// Update Post type
export const PostType = builder.node('Post', {
  fields: (t) => ({
    // ... other fields

    // Simplified - just return post ID, loader handles batching
    likeStatus: t.field({
      type: LikeStatusType,
      nullable: true,
      resolve: (post) => post.id, // Returns post ID, loader uses it
    }),

    // Or keep the boolean field for backwards compatibility
    isLiked: t.boolean({
      nullable: true,
      resolve: async (post, args, context) => {
        if (!context.userId) return null;
        const status = await context.loaders.likeStatusLoader.load(post.id);
        return status?.isLiked ?? null;
      },
    }),
  }),
});
```

#### Step 3.6: Remove Manual Loader Creation
**File:** `src/context.ts`

```typescript
// BEFORE
import { createLoaders } from './dataloaders/index.js';

export async function createContext(event): Promise<GraphQLContext> {
  // ...

  // Create DataLoaders
  const loaders = createLoaders(services, userId);

  return {
    // ...
    loaders,
  };
}

// AFTER (with Pothos dataloader plugin)
export async function createContext(event): Promise<GraphQLContext> {
  // ...

  // NO NEED TO CREATE LOADERS MANUALLY!
  // Pothos plugin creates them automatically from loadableObject definitions

  return {
    // ...
    // Remove loaders from context
  };
}
```

**File:** `src/shared/types/context.ts`

```typescript
// Update context type
export interface GraphQLContext {
  userId: string | null;
  services: Services;
  container: AwilixContainer;
  correlationId: string;
  // REMOVE: loaders: DataLoaders;
}
```

#### Step 3.7: Update All Field Resolvers Using Loaders
**Search and replace pattern:**

**Before:**
```typescript
author: t.field({
  type: ProfileType,
  resolve: async (post, args, context) => {
    return context.loaders.profileLoader.load(post.userId);
  },
}),
```

**After:**
```typescript
author: t.field({
  type: ProfileType,
  // Just return the ID - Pothos handles loading!
  resolve: (post) => post.userId,
}),
```

#### Step 3.8: Delete Old DataLoader Factory
```bash
rm src/dataloaders/index.ts

# Update imports - remove any references to createLoaders
```

#### Step 3.9: Test N+1 Prevention
**File:** `src/__tests__/dataloader.test.ts` (create new)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { graphql } from 'graphql';
import { schema } from '../schema/index.js';
import { createContext } from '../context.js';

describe('DataLoader Plugin - N+1 Prevention', () => {
  it('should batch profile loads when querying multiple posts', async () => {
    const context = await createContext(mockEvent);

    // Spy on the getProfilesByIds method
    const spy = vi.spyOn(context.services.profileService, 'getProfilesByIds');

    const query = `
      query Posts {
        posts(first: 10) {
          edges {
            node {
              id
              author {
                username
              }
            }
          }
        }
      }
    `;

    const result = await graphql({ schema, source: query, contextValue: context });

    expect(result.errors).toBeUndefined();

    // getProfilesByIds should be called ONCE with all IDs
    // (not 10 times with individual IDs)
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toHaveLength(10); // All 10 profile IDs in one call
  });

  it('should cache results within a single request', async () => {
    const context = await createContext(mockEvent);
    const spy = vi.spyOn(context.services.profileService, 'getProfilesByIds');

    const query = `
      query Posts {
        posts(first: 5) {
          edges {
            node {
              id
              author { username }
            }
          }
        }

        # Query same profiles again
        me {
          id
          username
        }
      }
    `;

    await graphql({ schema, source: query, contextValue: context });

    // Should still only call once due to caching
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

#### Step 3.10: Integration Testing
```bash
# Build
pnpm build

# Run tests
pnpm test dataloader.test.ts

# Check N+1 queries with logging
# Enable query logging in DAL, then:
pnpm dev:server

# Run query in playground and check logs
# Should see batched queries, not N+1
```

### Success Criteria
- ✅ All field resolvers simplified (no manual loader.load() calls)
- ✅ N+1 tests pass (single batched query, not multiple individual queries)
- ✅ Request-scoped caching works
- ✅ No performance regression
- ✅ Old dataloader factory removed

### Rollback Procedure
```bash
# Restore old dataloader factory
git checkout HEAD -- src/dataloaders/index.ts

# Restore context with loaders
git checkout HEAD -- src/context.ts src/shared/types/context.ts

# Revert schema changes
git checkout HEAD -- src/schema/pothos/types/

# Remove plugin
pnpm remove @pothos/plugin-dataloader

# Update builder
git checkout HEAD -- src/schema/pothos/builder.ts

# Rebuild
pnpm build
```

---

## Phase 4: Tracing Plugin

**Duration:** 2-3 days
**Risk:** Low
**Dependencies:** Phase 3 complete
**LOC Removed:** ~50 lines (plus enhanced observability)

### Objectives
- Add automatic resolver tracing
- Integrate with OpenTelemetry (optional)
- Replace manual logging in resolvers
- Add performance monitoring

### Detailed Steps

#### Step 4.1: Install Plugins
```bash
# Base tracing plugin
pnpm add @pothos/plugin-tracing

# Optional: OpenTelemetry integration
pnpm add @pothos/plugin-tracing-opentelemetry @opentelemetry/api @opentelemetry/sdk-trace-node
```

#### Step 4.2: Update Builder Configuration
**File:** `src/schema/pothos/builder.ts`

```typescript
// Add to imports
import TracingPlugin, { isRootField } from '@pothos/plugin-tracing';

// Update builder
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: AuthScopes;
}>({
  plugins: [
    ScopeAuthPlugin,
    ValidationPlugin,
    ComplexityPlugin,
    RelayPlugin,
    DataloaderPlugin,
    TracingPlugin, // ADD THIS - SHOULD BE LAST
  ],
  tracing: {
    // Default tracing config - enable for all fields except __typename
    default: (config) => (config.name !== '__typename' ? true : false),

    // Wrap resolver execution with tracing
    wrap: (resolver, options, config) => {
      return async (source, args, context, info) => {
        const start = performance.now();
        const isRoot = isRootField(info);

        try {
          const result = await resolver(source, args, context, info);
          const duration = performance.now() - start;

          // Only log root fields (queries/mutations) or slow resolvers
          if (isRoot || duration > 100) {
            context.logger?.info('RESOLVER_EXECUTED', {
              resolver: info.fieldName,
              parentType: info.parentType.name,
              duration: Math.round(duration),
              correlationId: context.correlationId,
              isRoot,
            });
          }

          return result;
        } catch (error) {
          const duration = performance.now() - start;

          context.logger?.error('RESOLVER_ERROR', {
            resolver: info.fieldName,
            parentType: info.parentType.name,
            duration: Math.round(duration),
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId: context.correlationId,
          });

          throw error;
        }
      };
    },
  },
});
```

#### Step 4.3: Add Logger to Context
**File:** `src/context.ts`

```typescript
import { createStructuredLogger } from '@social-media-app/shared';

export async function createContext(event): Promise<GraphQLContext> {
  const correlationId = event.requestContext?.requestId || `gql-${Date.now()}`;

  // Create logger
  const logger = createStructuredLogger({
    requestId: event.requestContext?.requestId,
    correlationId,
  });

  return {
    // ...
    correlationId,
    logger, // ADD THIS
  };
}
```

**File:** `src/shared/types/context.ts`

```typescript
export interface GraphQLContext {
  userId: string | null;
  services: Services;
  container: AwilixContainer;
  correlationId: string;
  logger: StructuredLogger; // ADD THIS
}
```

#### Step 4.4: (Optional) OpenTelemetry Integration
**File:** `src/infrastructure/tracing/opentelemetry.ts` (create new)

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let tracerProvider: NodeTracerProvider | undefined;

export function initTracing() {
  if (tracerProvider) return tracerProvider;

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'graphql-server',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
  });

  // Use console exporter for development
  // In production, use OTLP exporter to send to your tracing backend
  provider.addSpanProcessor(
    new SimpleSpanProcessor(new ConsoleSpanExporter())
  );

  provider.register();

  tracerProvider = provider;
  return provider;
}

export function getTracer(name: string = 'graphql') {
  if (!tracerProvider) {
    initTracing();
  }
  return tracerProvider!.getTracer(name);
}
```

**File:** `src/schema/pothos/builder.ts` (update with OpenTelemetry)

```typescript
import TracingPlugin from '@pothos/plugin-tracing';
import OpenTelemetryPlugin from '@pothos/plugin-tracing-opentelemetry';
import { getTracer } from '../../infrastructure/tracing/opentelemetry.js';

// Initialize tracing on startup
const tracer = getTracer('graphql-schema');

export const builder = new SchemaBuilder({
  plugins: [
    // ... other plugins
    TracingPlugin,
    OpenTelemetryPlugin, // ADD THIS AFTER TracingPlugin
  ],
  tracing: {
    // ... existing config
  },
  tracingOpentelemetry: {
    tracer,
  },
});
```

#### Step 4.5: Test Tracing
**File:** `src/__tests__/tracing.test.ts` (create new)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { graphql } from 'graphql';
import { schema } from '../schema/index.js';
import { createContext } from '../context.js';

describe('Resolver Tracing', () => {
  it('should log resolver execution times', async () => {
    const context = await createContext(mockEvent);
    const loggerSpy = vi.spyOn(context.logger, 'info');

    const query = `
      query {
        posts(first: 5) {
          edges {
            node {
              id
              title
              author { username }
            }
          }
        }
      }
    `;

    await graphql({ schema, source: query, contextValue: context });

    // Should have logged the root query
    expect(loggerSpy).toHaveBeenCalledWith(
      'RESOLVER_EXECUTED',
      expect.objectContaining({
        resolver: 'posts',
        parentType: 'Query',
        duration: expect.any(Number),
        isRoot: true,
      })
    );
  });

  it('should log slow resolver executions', async () => {
    const context = await createContext(mockEvent);
    const loggerSpy = vi.spyOn(context.logger, 'info');

    // Create a slow resolver (artificially)
    const slowQuery = `
      query {
        slowField
      }
    `;

    await graphql({ schema, source: slowQuery, contextValue: context });

    // Should log slow resolvers even if not root
    expect(loggerSpy).toHaveBeenCalledWith(
      'RESOLVER_EXECUTED',
      expect.objectContaining({
        duration: expect.any(Number),
      })
    );
  });
});
```

#### Step 4.6: Integration Testing
```bash
# Build
pnpm build

# Run tests
pnpm test tracing.test.ts

# Manual testing - check logs
pnpm dev:server

# Run queries and observe structured logs with timing
```

### Success Criteria
- ✅ All resolver executions are traced
- ✅ Slow resolvers are logged (>100ms)
- ✅ Root queries/mutations are always logged
- ✅ Correlation IDs flow through traces
- ✅ OpenTelemetry spans created (if enabled)
- ✅ No performance regression

### Rollback Procedure
```bash
# Remove plugins
pnpm remove @pothos/plugin-tracing @pothos/plugin-tracing-opentelemetry

# Revert builder
git checkout HEAD -- src/schema/pothos/builder.ts

# Remove tracing infrastructure
rm -rf src/infrastructure/tracing/

# Rebuild
pnpm build
```

---

## Testing Strategy

### Unit Tests
**Location:** `packages/graphql-server/src/__tests__/`

For each phase, create focused unit tests:

```typescript
// Phase 1: Complexity
- complexity.test.ts
  ✓ Reject complex queries
  ✓ Reject deep queries
  ✓ Allow simple queries

// Phase 2: Relay
- relay-pagination.test.ts
  ✓ Connection format
  ✓ Forward pagination
  ✓ Backward pagination
  ✓ node(id:) query

// Phase 3: Dataloader
- dataloader.test.ts
  ✓ Batch loading
  ✓ Request caching
  ✓ N+1 prevention

// Phase 4: Tracing
- tracing.test.ts
  ✓ Resolver timing
  ✓ Slow resolver detection
  ✓ Error logging
```

### Integration Tests
**Location:** `packages/integration-tests/`

Test full flow after each phase:

```typescript
import { integrationTest } from '@social-media-app/integration-tests';

describe('GraphQL Integration - Phase 2', () => {
  integrationTest('can paginate through posts', async ({ client }) => {
    // Create 20 posts
    const posts = await client.createPosts(20);

    // Fetch first page
    const page1 = await client.query(`
      query { posts(first: 10) { edges { node { id } } pageInfo { endCursor hasNextPage } } }
    `);

    expect(page1.data.posts.edges).toHaveLength(10);
    expect(page1.data.posts.pageInfo.hasNextPage).toBe(true);

    // Fetch second page
    const page2 = await client.query(`
      query ($after: String!) { posts(first: 10, after: $after) { edges { node { id } } } }
    `, { after: page1.data.posts.pageInfo.endCursor });

    expect(page2.data.posts.edges).toHaveLength(10);

    // No duplicate posts
    const allIds = [...page1.data.posts.edges, ...page2.data.posts.edges].map(e => e.node.id);
    expect(new Set(allIds).size).toBe(20);
  });
});
```

### Performance Tests
**Location:** `packages/graphql-server/scripts/benchmark.ts`

After each phase, compare performance:

```typescript
import { performance } from 'perf_hooks';
import { graphql } from 'graphql';
import { schema } from '../dist/schema/index.js';
import { readFileSync, writeFileSync } from 'fs';

const queries = [
  { name: 'posts_simple', query: '...' },
  { name: 'posts_with_authors', query: '...' },
  { name: 'posts_paginated', query: '...' },
];

async function benchmark() {
  const results = {};

  for (const { name, query } of queries) {
    const iterations = 100;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await graphql({ schema, source: query });
      times.push(performance.now() - start);
    }

    results[name] = {
      avg: times.reduce((a, b) => a + b) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: times.sort()[Math.floor(times.length * 0.95)],
    };
  }

  // Compare with baseline
  const baseline = JSON.parse(readFileSync('docs/migration/baseline-performance.json'));
  const comparison = {};

  for (const [name, current] of Object.entries(results)) {
    const base = baseline[name];
    comparison[name] = {
      current: current.avg,
      baseline: base?.avg,
      change: base ? ((current.avg - base.avg) / base.avg * 100).toFixed(2) + '%' : 'N/A',
    };
  }

  console.log('\n=== Performance Comparison ===');
  console.table(comparison);

  // Save results
  writeFileSync(`docs/migration/phase-${process.env.PHASE}-performance.json`, JSON.stringify(results, null, 2));
}

benchmark();
```

### Manual Testing Checklist

After each phase:

- [ ] Start GraphQL server (`pnpm dev:server`)
- [ ] Open Apollo Studio / GraphQL Playground
- [ ] Test all affected queries
- [ ] Verify error messages are clear
- [ ] Check server logs for warnings/errors
- [ ] Test with authentication (logged in/out)
- [ ] Test with various pagination arguments
- [ ] Verify schema introspection works

---

## Rollback Procedures

### General Rollback Steps

For any phase that needs rollback:

1. **Stop the server**
   ```bash
   # Kill running servers
   pkill -f "node.*graphql-server"
   ```

2. **Revert code changes**
   ```bash
   # Find the commit before migration phase started
   git log --oneline

   # Revert to that commit
   git revert <commit-hash>

   # Or cherry-pick specific reverts
   git revert <bad-commit>
   ```

3. **Restore dependencies**
   ```bash
   # Check out old package.json
   git checkout HEAD~1 -- package.json

   # Reinstall
   pnpm install
   ```

4. **Rebuild**
   ```bash
   pnpm build
   ```

5. **Verify rollback**
   ```bash
   # Run tests
   pnpm test

   # Check that old functionality works
   pnpm dev:server
   ```

6. **Document issue**
   ```bash
   # Create rollback report
   cat > docs/migration/rollback-report-phase-X.md << EOF
   # Phase X Rollback Report

   ## Date: $(date)

   ## Reason for Rollback:
   [Describe the issue that caused rollback]

   ## Steps Taken:
   1. Reverted commits: [list commits]
   2. Restored dependencies: [list]
   3. Verified tests: [status]

   ## Impact:
   [What functionality was affected]

   ## Next Steps:
   [How to fix the issue for retry]
   EOF
   ```

### Phase-Specific Rollback

See each phase section above for specific rollback commands.

---

## Success Metrics

### Code Metrics

**After each phase, measure:**

| Metric | Baseline | Target | Actual |
|--------|----------|--------|--------|
| Total LOC | ~3000 | -20% | _____ |
| Custom infrastructure LOC | ~600 | -70% | _____ |
| Test coverage | 65% | 75% | _____ |
| Build time (seconds) | 12 | <15 | _____ |
| Bundle size (KB) | 850 | <900 | _____ |

### Performance Metrics

**After each phase, measure:**

| Query | Baseline (ms) | Target (ms) | Actual (ms) | Change % |
|-------|---------------|-------------|-------------|----------|
| posts(first: 10) | ___ | <5% slower | ___ | ___ |
| posts with authors | ___ | <5% slower | ___ | ___ |
| complex nested query | ___ | <10% slower | ___ | ___ |

### Developer Experience Metrics

**After completion, measure:**

| Metric | Before | After |
|--------|--------|-------|
| Lines to add new query | ~50 | ~20 |
| Lines to add new mutation | ~60 | ~25 |
| Time to add new type | 30min | 15min |
| TypeScript errors on refactor | High | Low |

---

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Performance regression** | Medium | High | Benchmark each phase, revert if >10% slower |
| **Breaking schema changes** | Low | High | Maintain SDL alongside Pothos during migration |
| **DataLoader bugs** | Medium | High | Extensive N+1 testing, log all DB queries |
| **Cursor incompatibility** | Low | Medium | Test cursor format changes with old clients |
| **Plugin conflicts** | Low | Medium | Add plugins one at a time, test between each |
| **Context changes** | Medium | Medium | Update all context usage in single commit |

### Mitigation Strategies

1. **Incremental Migration**
   - One plugin at a time
   - Full testing between phases
   - Git commits after each successful phase

2. **Parallel Running**
   - Keep SDL schema alongside Pothos
   - Gradually migrate types
   - Both can coexist

3. **Feature Flags** (Optional)
   ```typescript
   // Use feature flags for risky changes
   const USE_RELAY_PAGINATION = process.env.USE_RELAY_PAGINATION === 'true';

   builder.queryFields((t) => ({
     posts: USE_RELAY_PAGINATION
       ? t.connection({ /* Relay */ })
       : t.field({ /* Old approach */ })
   }));
   ```

4. **Monitoring**
   - Add detailed logging during migration
   - Monitor error rates
   - Set up alerts for performance degradation

5. **Staged Rollout** (If applicable)
   - Deploy to dev environment first
   - Then staging
   - Then production (with canary deployment)

---

## Post-Migration Cleanup

After all phases complete:

### Step 1: Remove Old Code
```bash
# Remove old infrastructure
rm -rf src/infrastructure/pagination/
rm src/dataloaders/index.ts

# Remove SDL schema files (if fully migrated)
# rm src/schema/typeDefs/*.graphql

# Remove old tests
rm src/__tests__/cursor-codec.test.ts
rm src/__tests__/connection-builder.test.ts
```

### Step 2: Remove Old Dependencies
```bash
pnpm remove graphql-validation-complexity graphql-depth-limit dataloader
```

### Step 3: Update Documentation
- Update README with new Pothos architecture
- Document plugin usage patterns
- Create migration guide for team
- Update schema documentation

### Step 4: Update CI/CD
```bash
# Update build scripts in package.json if needed
# Update CI/CD pipelines
# Update deployment documentation
```

### Step 5: Team Training
- Schedule knowledge sharing session
- Create Pothos best practices guide
- Update onboarding documentation

---

## Timeline Summary

| Phase | Duration | Start After | Deliverable |
|-------|----------|-------------|-------------|
| **Phase 0** | 1 day | Now | Baseline metrics, test infrastructure |
| **Phase 1** | 1-2 days | Phase 0 | Complexity plugin integrated |
| **Phase 2** | 3-4 days | Phase 1 | Relay pagination working |
| **Phase 3** | 3-4 days | Phase 2 | DataLoader plugin integrated |
| **Phase 4** | 2-3 days | Phase 3 | Tracing enabled |
| **Cleanup** | 1-2 days | Phase 4 | Old code removed, docs updated |

**Total Estimated Time:** 11-16 days (~2-3 weeks)

---

## Conclusion

This migration plan provides a safe, incremental path to adopting Pothos plugins while maintaining system stability. Each phase is independently valuable and can be stopped/rolled back at any point.

The phased approach ensures:
- ✅ No big-bang migrations
- ✅ Clear success criteria at each step
- ✅ Easy rollback if issues arise
- ✅ Continuous validation through testing
- ✅ Measurable improvements in DX and maintainability

**Next Step:** Begin Phase 0 - Setup & Validation
