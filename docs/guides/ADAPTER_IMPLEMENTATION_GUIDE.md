# Adapter Implementation Guide

**Version**: 1.0  
**Last Updated**: 2025-11-03  
**For**: GraphQL Server Type Transformation Adapters

---

## Table of Contents

1. [Overview](#overview)
2. [When to Create an Adapter](#when-to-create-an-adapter)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Code Templates](#code-templates)
5. [Testing Guide](#testing-guide)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Type Transformation Adapters bridge the gap between DAL services (domain types) and GraphQL resolvers (GraphQL schema types). They handle:

- **Type Transformations**: Domain types → GraphQL types
- **Input Validation**: Ensure required parameters are present
- **Error Handling**: Convert domain errors to GraphQLErrors
- **Pagination**: Build GraphQL Connection structures

### Architecture

```
GraphQL Resolver
      ↓
Type Transformation Adapter  ← YOU ARE HERE
      ↓
DAL Service
      ↓
Database
```

---

## When to Create an Adapter

Create a new adapter when:

✅ Adding a new GraphQL query that returns domain entities  
✅ Domain types don't match GraphQL schema types  
✅ You need pagination (Connection pattern)  
✅ You want to isolate type transformations from resolvers

**Don't create an adapter when:**

❌ Simple scalar queries (e.g., count, status)  
❌ Mutations (use mutation handlers instead)  
❌ Field resolvers (use direct transformations)

---

## Step-by-Step Guide

### Step 1: Identify Requirements

**Questions to Answer:**
1. What DAL service method will you call?
2. What domain types does it return?
3. What GraphQL types do you need?
4. Do you need pagination?
5. What validation is needed?

**Example:**
- DAL Method: `PostService.getUserPostsByHandle()`
- Domain Type: `PostGridItem[]`
- GraphQL Type: `PostConnection`
- Pagination: Yes
- Validation: `handle` required

---

### Step 2: Add Type Transformers to TypeMapper (if needed)

If TypeMapper doesn't have a transformer for your domain type, add one:

```typescript
// packages/graphql-server/src/infrastructure/adapters/shared/TypeMapper.ts

/**
 * Transform domain [Entity] to GraphQL [Entity]
 *
 * @param domain - The domain [Entity] from @social-media-app/shared
 * @returns GraphQL [Entity] type compatible with schema
 */
static toGraphQL[Entity](domain: Domain[Entity]): GraphQL[Entity] {
  return {
    id: domain.id,
    // Map all required fields
    fieldName: domain.fieldName ?? null, // Handle optional fields
    createdAt: domain.createdAt,
  } as GraphQL[Entity];
}
```

**TypeMapper Rules:**
- ✅ Static methods only
- ✅ Pure functions (no side effects)
- ✅ Handle null/undefined with `?? null`
- ✅ Add JSDoc comments
- ✅ Use type assertions `as GraphQL[Entity]`

---

### Step 3: Write Tests FIRST (TDD - RED)

```typescript
// packages/graphql-server/src/infrastructure/adapters/__tests__/[Entity]Adapter.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { [Entity]Adapter } from '../[Entity]Adapter';
import { createMock[Entity]s } from '@social-media-app/shared/test-utils';
import { GraphQLError } from 'graphql';
import type { [Entity]Service } from '@social-media-app/dal';

describe('[Entity]Adapter', () => {
  let adapter: [Entity]Adapter;
  let mock[Entity]Service: [Entity]Service;

  beforeEach(() => {
    mock[Entity]Service = {
      get[Entity]s: async () => ({ [entity]s: [], hasMore: false }),
    } as any;
    adapter = new [Entity]Adapter(mock[Entity]Service);
  });

  describe('get[Entity]s', () => {
    it('transforms [Entity]s to GraphQL [Entity]Connection', async () => {
      const [entity]s = createMock[Entity]s(2);
      mock[Entity]Service.get[Entity]s = async () => ({
        [entity]s,
        hasMore: false,
      });

      const result = await adapter.get[Entity]s({ first: 10 });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('[entity]-1');
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('handles pagination correctly', async () => {
      const [entity]s = createMock[Entity]s(1);
      mock[Entity]Service.get[Entity]s = async () => ({
        [entity]s,
        hasMore: true,
      });

      const result = await adapter.get[Entity]s({ first: 1, after: 'cursor-abc' });

      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('validates required parameter', async () => {
      await expect(adapter.get[Entity]s({ requiredParam: '' })).rejects.toThrow(
        'requiredParam is required'
      );
    });

    it('throws GraphQLError on service error', async () => {
      mock[Entity]Service.get[Entity]s = async () => {
        throw new Error('Database error');
      };

      await expect(adapter.get[Entity]s({ first: 10 })).rejects.toThrow(GraphQLError);
    });
  });
});
```

**Run tests - they should FAIL (RED):**
```bash
npm run test -- [Entity]Adapter.test.ts
```

---

### Step 4: Implement Adapter (TDD - GREEN)

```typescript
// packages/graphql-server/src/infrastructure/adapters/[Entity]Adapter.ts

/**
 * [Entity]Adapter
 *
 * Adapter that bridges [Entity]Service (DAL) and GraphQL [entity] resolvers.
 * Transforms domain [Entity] types to GraphQL [Entity] types using TypeMapper.
 *
 * Following hexagonal architecture adapter pattern.
 */

import { GraphQLError } from 'graphql';
import type { [Entity]Service } from '@social-media-app/dal';
import type { [Entity]Connection } from '../../schema/generated/types';
import { TypeMapper } from './shared/TypeMapper';
import type { [Entity] } from '@social-media-app/shared';

interface Get[Entity]sArgs {
  requiredParam: string;
  first?: number;
  after?: string;
}

/**
 * [Entity]Adapter - Adapts [Entity]Service to GraphQL [entity] queries
 */
export class [Entity]Adapter {
  constructor(private readonly [entity]Service: [Entity]Service) {}

  /**
   * Get paginated [entity]s
   *
   * @param args - Query arguments
   * @returns GraphQL [Entity]Connection with edges and pageInfo
   * @throws GraphQLError if validation fails or service errors occur
   */
  async get[Entity]s(args: Get[Entity]sArgs): Promise<[Entity]Connection> {
    // 1. Validate inputs
    if (!args.requiredParam) {
      throw new GraphQLError('requiredParam is required');
    }

    try {
      // 2. Call DAL service
      const limit = args.first ?? 20;
      const cursor = args.after;

      const response = await this.[entity]Service.get[Entity]s({
        requiredParam: args.requiredParam,
        limit,
        cursor,
      });

      // 3. Transform to GraphQL connection
      return TypeMapper.toGraphQLConnection<[Entity], any, [Entity]Connection>(
        response.[entity]s,
        TypeMapper.toGraphQL[Entity],
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

**Run tests - they should PASS (GREEN):**
```bash
npm run test -- [Entity]Adapter.test.ts
```

---

### Step 5: Update Resolver (TDD - REFACTOR)

```typescript
// packages/graphql-server/src/resolvers/[entity]/[entity]sResolver.ts

/**
 * [entity]sResolver - Get [Entity]s
 *
 * Returns paginated [entity]s.
 * Public/authenticated operation depending on requirements.
 */

import { Container } from '../../infrastructure/di/Container.js';
import type { QueryResolvers } from '../../schema/generated/types';
import { [Entity]Adapter } from '../../infrastructure/adapters/[Entity]Adapter';
import type { [Entity]Service } from '@social-media-app/dal';

/**
 * Create the [entity]s resolver with DI container.
 *
 * @param container - DI container for resolving services
 * @returns GraphQL resolver for Query.[entity]s
 */
export const create[Entity]sResolver = (container: Container): QueryResolvers['[entity]s'] => {
  return async (_parent: any, args: { requiredParam: string; first?: number | null; after?: string | null }) => {
    const [entity]Service = container.resolve<[Entity]Service>('[Entity]Service');
    const adapter = new [Entity]Adapter([entity]Service);

    return adapter.get[Entity]s({
      requiredParam: args.requiredParam,
      first: args.first ?? undefined,
      after: args.after ?? undefined,
    });
  };
};
```

---

### Step 6: Validate & Commit

```bash
# Run tests
npm run test -- [Entity]Adapter.test.ts

# Check for TypeScript errors
npm run typecheck

# Stage files
git add \
  packages/graphql-server/src/infrastructure/adapters/[Entity]Adapter.ts \
  packages/graphql-server/src/infrastructure/adapters/__tests__/[Entity]Adapter.test.ts \
  packages/graphql-server/src/resolvers/[entity]/[entity]sResolver.ts

# Commit
git commit -m "feat(graphql): Add [Entity]Adapter with TDD

- Created [Entity]Adapter for type transformations
- Added comprehensive tests (X/X passing)
- Updated [entity]sResolver to use adapter
- Follows hexagonal architecture pattern"
```

---

## Code Templates

### Template 1: Simple Adapter (No Pagination)

```typescript
export class [Entity]Adapter {
  constructor(private readonly [entity]Service: [Entity]Service) {}

  async get[Entity]ById(id: string): Promise<GraphQL[Entity] | null> {
    if (!id) {
      throw new GraphQLError('id is required');
    }

    try {
      const [entity] = await this.[entity]Service.get[Entity]ById(id);
      if (![entity]) {
        return null;
      }

      return TypeMapper.toGraphQL[Entity]([entity]);
    } catch (error) {
      throw new GraphQLError((error as Error).message);
    }
  }
}
```

### Template 2: Paginated Adapter

```typescript
export class [Entity]Adapter {
  constructor(private readonly [entity]Service: [Entity]Service) {}

  async get[Entity]s(args: Get[Entity]sArgs): Promise<[Entity]Connection> {
    if (!args.requiredParam) {
      throw new GraphQLError('requiredParam is required');
    }

    try {
      const limit = args.first ?? 20;
      const cursor = args.after;

      const response = await this.[entity]Service.get[Entity]s({
        requiredParam: args.requiredParam,
        limit,
        cursor,
      });

      return TypeMapper.toGraphQLConnection<[Entity], any, [Entity]Connection>(
        response.[entity]s,
        TypeMapper.toGraphQL[Entity],
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

### Template 3: Multi-Method Adapter

```typescript
export class [Entity]Adapter {
  constructor(private readonly [entity]Service: [Entity]Service) {}

  async get[Entity]ById(id: string): Promise<GraphQL[Entity] | null> {
    // ... single entity logic
  }

  async get[Entity]s(args: Get[Entity]sArgs): Promise<[Entity]Connection> {
    // ... paginated list logic
  }

  async getCount(userId: string): Promise<number> {
    // ... simple count logic (no transformation)
    return this.[entity]Service.getCount(userId);
  }
}
```

---

## Testing Guide

### Test Coverage Requirements

Every adapter must have:

✅ **Happy Path**: Transforms entities correctly  
✅ **Pagination**: Handles cursor and hasNextPage  
✅ **Empty Results**: Returns empty connection  
✅ **Validation**: Throws on invalid inputs  
✅ **Error Handling**: Wraps errors in GraphQLError

### Test Pattern

```typescript
describe('[Entity]Adapter', () => {
  let adapter: [Entity]Adapter;
  let mock[Entity]Service: [Entity]Service;

  beforeEach(() => {
    // Create mock service
    mock[Entity]Service = {
      methodName: async () => ({ [entity]s: [], hasMore: false }),
    } as any;
    
    // Create adapter with mock
    adapter = new [Entity]Adapter(mock[Entity]Service);
  });

  describe('methodName', () => {
    it('happy path test', async () => {
      // Arrange
      const [entity]s = createMock[Entity]s(2);
      mock[Entity]Service.methodName = async () => ({ [entity]s, hasMore: false });

      // Act
      const result = await adapter.methodName({ first: 10 });

      // Assert
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('[entity]-1');
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('pagination test', async () => { /* ... */ });
    it('validation test', async () => { /* ... */ });
    it('error handling test', async () => { /* ... */ });
  });
});
```

### Running Tests

```bash
# Run single adapter test
npm run test -- [Entity]Adapter.test.ts

# Run all adapter tests
npm run test -- adapters/__tests__/

# Run with coverage
npm run test:coverage -- [Entity]Adapter.test.ts
```

---

## Common Patterns

### Pattern 1: Multiple Domain Types

When DAL returns different domain types, create multiple transformers:

```typescript
// In TypeMapper.ts
static toGraphQLPost(domain: Post): GraphQLPost { /* full post */ }
static toGraphQLPostGridItem(domain: PostGridItem): GraphQLPost { /* minimal */ }
static toGraphQLFeedPost(domain: PostWithAuthor): GraphQLPost { /* with author */ }

// In Adapter
async getExploreFeed(args): Promise<PostConnection> {
  const response = await this.postService.getFeedPosts(...);
  return TypeMapper.toGraphQLConnection(
    response.posts,
    TypeMapper.toGraphQLPostGridItem, // ← Choose transformer
    { hasNextPage: response.hasMore }
  );
}
```

### Pattern 2: Multiple Services

When adapter needs multiple services:

```typescript
export class FeedAdapter {
  constructor(
    private readonly postService: PostService,
    private readonly followService: FollowService // ← Multiple services
  ) {}

  async getFollowingFeed(args): Promise<PostConnection> {
    const response = await this.postService.getFollowingFeedPosts(
      args.userId,
      this.followService, // ← Pass through
      args.first,
      args.after
    );
    
    return TypeMapper.toGraphQLConnection(...);
  }
}
```

### Pattern 3: Default Values

Apply defaults before calling DAL:

```typescript
async get[Entity]s(args: Get[Entity]sArgs): Promise<[Entity]Connection> {
  const limit = args.first ?? 20; // ← Default value
  const cursor = args.after;

  const response = await this.[entity]Service.get[Entity]s({
    limit, // Use defaulted value
    cursor,
  });

  // ...
}
```

### Pattern 4: Readonly Array Conversion

DAL services may return readonly arrays:

```typescript
return TypeMapper.toGraphQLConnection<[Entity], any, [Entity]Connection>(
  [...response.[entity]s], // ← Convert readonly to mutable
  TypeMapper.toGraphQL[Entity],
  { hasNextPage: response.hasMore }
);
```

---

## Troubleshooting

### Problem: TypeScript Error "Type X is not assignable to type Y"

**Cause**: Domain type doesn't match GraphQL type

**Solution**:
1. Check TypeMapper transformer returns correct GraphQL type
2. Use type assertion: `as GraphQL[Entity]`
3. Ensure all required fields are mapped

```typescript
// ❌ Wrong
return {
  id: domain.id,
  // Missing required fields
};

// ✅ Correct
return {
  id: domain.id,
  requiredField: domain.requiredField,
  optionalField: domain.optionalField ?? null, // Handle nulls
} as GraphQL[Entity];
```

---

### Problem: Tests Fail with "Cannot read property X of undefined"

**Cause**: Mock service not set up correctly

**Solution**: Ensure mock returns expected structure

```typescript
// ❌ Wrong
mock[Entity]Service.methodName = async () => undefined;

// ✅ Correct
mock[Entity]Service.methodName = async () => ({
  [entity]s: [],
  hasMore: false,
  // All expected fields
});
```

---

### Problem: Validation Error Not Thrown

**Cause**: Check is too permissive

**Solution**: Use strict checks

```typescript
// ❌ Wrong
if (args.userId) { /* ... */ }

// ✅ Correct
if (!args.userId) {
  throw new GraphQLError('userId is required');
}
```

---

### Problem: Cursor Not Working

**Cause**: Not passing cursor to DAL service

**Solution**: Pass cursor in service call

```typescript
// ❌ Wrong
const response = await this.[entity]Service.get[Entity]s({
  limit: args.first,
  // Missing cursor
});

// ✅ Correct
const response = await this.[entity]Service.get[Entity]s({
  limit: args.first,
  cursor: args.after, // ← Pass cursor
});
```

---

## Checklist

Before submitting PR, ensure:

- [ ] TypeMapper has transformer for your domain type
- [ ] Adapter tests written (TDD RED)
- [ ] Adapter implemented (TDD GREEN)
- [ ] All tests passing (5+ tests minimum)
- [ ] Resolver updated to use adapter
- [ ] No TypeScript errors
- [ ] GraphQL query tested manually (optional but recommended)
- [ ] Documentation updated (if new pattern)
- [ ] Git commit follows convention

---

## Reference Examples

See these adapters as reference:

1. **CommentAdapter** - Simple paginated adapter (golden template)
2. **FeedAdapter** - Multiple services, multiple transformers
3. **PostAdapter** - Single entity + paginated queries
4. **ProfileAdapter** - Public vs. private profile handling
5. **NotificationAdapter** - Simple passthrough + transformation

**File Locations**:
```
packages/graphql-server/src/infrastructure/adapters/
├── CommentAdapter.ts         ← Start here
├── FeedAdapter.ts             ← Multiple services
├── PostAdapter.ts             ← Multiple methods
├── ProfileAdapter.ts          ← Variants
├── NotificationAdapter.ts     ← Simple
└── __tests__/
    └── [All adapter tests]
```

---

## Getting Help

- **Documentation**: Read [ADR-001-Type-Transformation-Adapter-Layer.md](../adr/ADR-001-Type-Transformation-Adapter-Layer.md)
- **Code Review**: Ask team for feedback
- **Stack Overflow**: Check hexagonal architecture patterns
- **Team Chat**: #graphql-server channel

---

**Happy Coding!** 🚀

Remember: **Write tests first (TDD), keep adapters thin, use TypeMapper for all transformations.**
