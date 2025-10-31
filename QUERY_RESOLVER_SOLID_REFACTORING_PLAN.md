# Query.ts SOLID Refactoring Plan

## Executive Summary

Refactor 661-line Query.ts monolith into modular, testable components following SOLID principles and advanced TypeScript patterns.

**Current State:**
- 15+ resolver functions in single file
- Mixed concerns (auth, validation, transformation, pagination)
- Tight coupling to context.services
- Duplicate auth/cursor/pagination logic
- Hard to test in isolation

**Target State:**
- Modular architecture with clear boundaries
- Dependency injection via interfaces
- Reusable utilities with generics
- Composable resolver middleware
- 100% unit testable

---

## Part 1: SOLID Violations Analysis

### 1.1 Single Responsibility Principle (SRP) Violations

**Problem:** Query.ts has multiple responsibilities
- ❌ Authentication (13 resolvers check `context.userId`)
- ❌ Cursor encoding/decoding (6 places)
- ❌ Pagination logic (8 resolvers)
- ❌ Entity transformation (DAL → GraphQL)
- ❌ Error handling (11 error types)
- ❌ Connection building (8 Relay connections)

**Impact:** 661 lines, hard to modify, bugs affect multiple features

### 1.2 Open/Closed Principle (OCP) Violations

**Problem:** Adding new features requires modifying Query.ts
```typescript
// Current: Must modify this file for new resolver
export const Query: QueryResolvers = {
  me: async (...) => { /* 25 lines */ },
  profile: async (...) => { /* 15 lines */ },
  // Adding "search" requires changing this file
};
```

**Better:** Composable resolvers that extend without modification

### 1.3 Liskov Substitution Principle (LSP) Violations

**Problem:** No abstractions to substitute
- Services accessed via `context.services.profileService`
- Cannot swap implementations
- Mock testing requires full context mock

### 1.4 Interface Segregation Principle (ISP) Violations

**Problem:** Context is a "god object"
```typescript
interface GraphQLContext {
  userId?: string;
  services: {
    profileService: ProfileService;
    postService: PostService;
    feedService: FeedService;
    // ... 10+ services
  };
  dataloaders: { /* ... */ };
}
```

**Impact:** Resolvers depend on entire context even if they use 1 service

### 1.5 Dependency Inversion Principle (DIP) Violations

**Problem:** Depends on concrete implementations
```typescript
// Current: Tightly coupled to concrete ProfileService
const profile = await context.services.profileService.getProfileByHandle(handle);

// Better: Depend on abstraction
const profile = await profileRepository.findByHandle(handle);
```

---

## Part 2: Advanced TypeScript Architecture

### 2.1 Core Type System

**Branded Types for Type Safety:**
```typescript
// packages/graphql-server/src/shared/types/branded.ts
export type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type PostId = Brand<string, 'PostId'>;
export type Cursor = Brand<string, 'Cursor'>;

// Create branded values
export const UserId = (id: string): UserId => id as UserId;
export const PostId = (id: string): PostId => id as PostId;
export const Cursor = (cursor: string): Cursor => cursor as Cursor;
```

**Discriminated Unions for Results:**
```typescript
// packages/graphql-server/src/shared/types/result.ts
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Type-safe unwrapping
export function unwrap<T>(result: Result<T>): T {
  if (!result.success) throw result.error;
  return result.data;
}
```

**Generic Pagination Types:**
```typescript
// packages/graphql-server/src/shared/types/pagination.ts
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: Cursor | null;
  endCursor: Cursor | null;
}

export interface Edge<T> {
  node: T;
  cursor: Cursor;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

export interface PaginationArgs {
  first?: number;
  after?: Cursor;
  last?: number;
  before?: Cursor;
}

// Generic cursor data
export interface CursorData<T = unknown> {
  id: string;
  sortKey: T;
}
```

### 2.2 Service Interfaces (Dependency Inversion)

```typescript
// packages/graphql-server/src/domain/repositories/IProfileRepository.ts
import { Result } from '../../shared/types/result.js';
import { UserId, Profile } from '../entities/index.js';

export interface IProfileRepository {
  findById(id: UserId): AsyncResult<Profile | null>;
  findByHandle(handle: string): AsyncResult<Profile | null>;
}
```

```typescript
// packages/graphql-server/src/domain/repositories/IPostRepository.ts
import { PostId, Post, Connection, PaginationArgs } from '../entities/index.js';

export interface IPostRepository {
  findById(id: PostId): AsyncResult<Post | null>;
  findByUser(userId: UserId, pagination: PaginationArgs): AsyncResult<Connection<Post>>;
  findExploreFeed(pagination: PaginationArgs): AsyncResult<Connection<Post>>;
  findFollowingFeed(userId: UserId, pagination: PaginationArgs): AsyncResult<Connection<Post>>;
}
```

### 2.3 Use Cases / Interactors (Business Logic)

```typescript
// packages/graphql-server/src/application/use-cases/GetProfileByHandle.ts
import { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';
import { Result, Profile } from '../../shared/types/index.js';

export interface GetProfileByHandleInput {
  handle: string;
}

export class GetProfileByHandle {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async execute(input: GetProfileByHandleInput): AsyncResult<Profile | null> {
    return this.profileRepository.findByHandle(input.handle);
  }
}
```

```typescript
// packages/graphql-server/src/application/use-cases/GetCurrentUserProfile.ts
import { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';
import { UserId, Profile } from '../../shared/types/index.js';
import { AuthenticationError } from '../errors/index.js';

export interface GetCurrentUserProfileInput {
  userId?: UserId;
}

export class GetCurrentUserProfile {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async execute(input: GetCurrentUserProfileInput): AsyncResult<Profile> {
    if (!input.userId) {
      return {
        success: false,
        error: new AuthenticationError('You must be authenticated'),
      };
    }

    const result = await this.profileRepository.findById(input.userId);
    
    if (!result.success) return result;
    if (!result.data) {
      return {
        success: false,
        error: new NotFoundError('Profile not found'),
      };
    }

    return { success: true, data: result.data };
  }
}
```

---

## Part 3: Utility Modules (SRP)

### 3.1 CursorCodec (Cursor Encoding/Decoding)

```typescript
// packages/graphql-server/src/infrastructure/pagination/CursorCodec.ts
import { Cursor, CursorData } from '../../shared/types/index.js';
import { Result } from '../../shared/types/result.js';

export interface ICursorCodec {
  encode<T>(data: CursorData<T>): Cursor;
  decode<T>(cursor: Cursor): Result<CursorData<T>>;
}

export class Base64CursorCodec implements ICursorCodec {
  encode<T>(data: CursorData<T>): Cursor {
    const json = JSON.stringify(data);
    const base64 = Buffer.from(json).toString('base64');
    return Cursor(base64);
  }

  decode<T>(cursor: Cursor): Result<CursorData<T>> {
    try {
      const json = Buffer.from(cursor, 'base64').toString('utf-8');
      const data = JSON.parse(json) as CursorData<T>;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: new Error('Invalid cursor format'),
      };
    }
  }
}
```

### 3.2 ConnectionBuilder (Relay Pagination)

```typescript
// packages/graphql-server/src/infrastructure/pagination/ConnectionBuilder.ts
import { Connection, Edge, PageInfo, Cursor } from '../../shared/types/index.js';
import { ICursorCodec } from './CursorCodec.js';

export interface ConnectionBuilderOptions<T> {
  nodes: T[];
  hasMore: boolean;
  getCursorData: (node: T) => { id: string; sortKey: unknown };
}

export class ConnectionBuilder {
  constructor(private readonly cursorCodec: ICursorCodec) {}

  build<T>(options: ConnectionBuilderOptions<T>): Connection<T> {
    const { nodes, hasMore, getCursorData } = options;

    const edges: Edge<T>[] = nodes.map((node) => ({
      node,
      cursor: this.cursorCodec.encode(getCursorData(node)),
    }));

    const pageInfo: PageInfo = {
      hasNextPage: hasMore,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    };

    return { edges, pageInfo };
  }
}
```

### 3.3 AuthGuard (Authentication Middleware)

```typescript
// packages/graphql-server/src/infrastructure/auth/AuthGuard.ts
import { UserId } from '../../shared/types/branded.js';
import { Result } from '../../shared/types/result.js';
import { AuthenticationError } from '../../application/errors/index.js';

export interface AuthContext {
  userId?: UserId;
}

export class AuthGuard {
  requireAuth(context: AuthContext): Result<UserId> {
    if (!context.userId) {
      return {
        success: false,
        error: new AuthenticationError('You must be authenticated'),
      };
    }
    return { success: true, data: context.userId };
  }

  optionalAuth(context: AuthContext): UserId | null {
    return context.userId ?? null;
  }
}
```

### 3.4 ErrorFactory (Standardized Errors)

```typescript
// packages/graphql-server/src/infrastructure/errors/ErrorFactory.ts
import { GraphQLError } from 'graphql';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR';

export class ErrorFactory {
  static create(message: string, code: ErrorCode): GraphQLError {
    return new GraphQLError(message, {
      extensions: { code },
    });
  }

  static unauthenticated(message = 'You must be authenticated'): GraphQLError {
    return this.create(message, 'UNAUTHENTICATED');
  }

  static notFound(entity: string, id: string): GraphQLError {
    return this.create(`${entity} not found: ${id}`, 'NOT_FOUND');
  }

  static badRequest(message: string): GraphQLError {
    return this.create(message, 'BAD_REQUEST');
  }
}
```

---

## Part 4: Resolver Composition Patterns

### 4.1 Higher-Order Resolver (HOC Pattern)

```typescript
// packages/graphql-server/src/infrastructure/resolvers/withAuth.ts
import { GraphQLFieldResolver } from 'graphql';
import { AuthGuard } from '../auth/AuthGuard.js';
import { ErrorFactory } from '../errors/ErrorFactory.js';

export function withAuth<TSource, TContext, TArgs, TReturn>(
  resolver: GraphQLFieldResolver<TSource, TContext & { userId: UserId }, TArgs, TReturn>
): GraphQLFieldResolver<TSource, TContext & { userId?: UserId }, TArgs, TReturn> {
  return async (source, args, context, info) => {
    const authGuard = new AuthGuard();
    const result = authGuard.requireAuth(context);

    if (!result.success) {
      throw ErrorFactory.unauthenticated();
    }

    // TypeScript now knows context.userId exists
    return resolver(source, args, { ...context, userId: result.data }, info);
  };
}

// Usage:
export const me = withAuth(async (_parent, _args, context) => {
  // context.userId is guaranteed to exist
  return profileRepository.findById(context.userId);
});
```

### 4.2 Resolver Builder Pattern

```typescript
// packages/graphql-server/src/infrastructure/resolvers/ResolverBuilder.ts
type Middleware<TContext> = (
  context: TContext,
  next: () => Promise<unknown>
) => Promise<unknown>;

export class ResolverBuilder<TSource, TContext, TArgs> {
  private middlewares: Middleware<TContext>[] = [];
  private resolver?: GraphQLFieldResolver<TSource, TContext, TArgs>;

  use(middleware: Middleware<TContext>): this {
    this.middlewares.push(middleware);
    return this;
  }

  resolve(
    resolver: GraphQLFieldResolver<TSource, TContext, TArgs>
  ): GraphQLFieldResolver<TSource, TContext, TArgs> {
    this.resolver = resolver;
    
    return async (source, args, context, info) => {
      let index = 0;

      const next = async (): Promise<unknown> => {
        if (index < this.middlewares.length) {
          const middleware = this.middlewares[index++];
          return middleware(context, next);
        }
        return this.resolver!(source, args, context, info);
      };

      return next();
    };
  }
}

// Usage:
const meResolver = new ResolverBuilder()
  .use(authMiddleware)
  .use(loggingMiddleware)
  .resolve(async (_parent, _args, context) => {
    return profileRepository.findById(context.userId);
  });
```

### 4.3 Generic Connection Resolver

```typescript
// packages/graphql-server/src/infrastructure/resolvers/ConnectionResolver.ts
export class ConnectionResolver<T> {
  constructor(
    private readonly repository: { find: (args: PaginationArgs) => AsyncResult<Connection<T>> },
    private readonly connectionBuilder: ConnectionBuilder
  ) {}

  async resolve(args: PaginationArgs): Promise<Connection<T>> {
    const result = await this.repository.find(args);
    
    if (!result.success) {
      throw ErrorFactory.create(result.error.message, 'INTERNAL_SERVER_ERROR');
    }

    return result.data;
  }
}

// Usage:
const userPostsResolver = new ConnectionResolver(postRepository, connectionBuilder);
```

---

## Part 5: Dependency Injection Container

### 5.1 DI Container

```typescript
// packages/graphql-server/src/infrastructure/di/Container.ts
export class Container {
  private services = new Map<string, unknown>();

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  resolve<T>(key: string): T {
    const factory = this.services.get(key) as (() => T) | undefined;
    if (!factory) {
      throw new Error(`Service not found: ${key}`);
    }
    return factory();
  }
}
```

### 5.2 Service Registration

```typescript
// packages/graphql-server/src/infrastructure/di/registerServices.ts
import { Container } from './Container.js';
import { ProfileServiceAdapter } from '../adapters/ProfileServiceAdapter.js';
import { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';

export function registerServices(container: Container, context: GraphQLContext): void {
  // Register repositories
  container.register<IProfileRepository>(
    'IProfileRepository',
    () => new ProfileServiceAdapter(context.services.profileService)
  );

  // Register use cases
  container.register(
    'GetCurrentUserProfile',
    () => new GetCurrentUserProfile(container.resolve('IProfileRepository'))
  );

  container.register(
    'GetProfileByHandle',
    () => new GetProfileByHandle(container.resolve('IProfileRepository'))
  );

  // Register utilities
  container.register('ICursorCodec', () => new Base64CursorCodec());
  container.register(
    'ConnectionBuilder',
    () => new ConnectionBuilder(container.resolve('ICursorCodec'))
  );
}
```

---

## Part 6: Adapter Pattern (Existing Services)

### 6.1 Service Adapters

```typescript
// packages/graphql-server/src/infrastructure/adapters/ProfileServiceAdapter.ts
import { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';
import { ProfileService } from '../../../services/ProfileService.js';
import { UserId, Profile } from '../../shared/types/index.js';
import { Result } from '../../shared/types/result.js';

export class ProfileServiceAdapter implements IProfileRepository {
  constructor(private readonly profileService: ProfileService) {}

  async findById(id: UserId): AsyncResult<Profile | null> {
    try {
      const profile = await this.profileService.getProfileById(id);
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async findByHandle(handle: string): AsyncResult<Profile | null> {
    try {
      const profile = await this.profileService.getProfileByHandle(handle);
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
```

---

## Part 7: New File Structure

```
packages/graphql-server/src/
├── schema/
│   ├── resolvers/
│   │   ├── Query.ts                    # Thin orchestration layer (50 lines)
│   │   ├── profile/
│   │   │   ├── meResolver.ts           # Individual resolver (10 lines)
│   │   │   ├── profileResolver.ts      # Individual resolver (10 lines)
│   │   │   └── index.ts
│   │   ├── post/
│   │   │   ├── postResolver.ts
│   │   │   ├── userPostsResolver.ts
│   │   │   └── index.ts
│   │   └── feed/
│   │       ├── exploreFeedResolver.ts
│   │       ├── followingFeedResolver.ts
│   │       └── index.ts
│   └── generated/
│       └── types.ts
├── application/
│   ├── use-cases/
│   │   ├── profile/
│   │   │   ├── GetCurrentUserProfile.ts
│   │   │   ├── GetProfileByHandle.ts
│   │   │   └── index.ts
│   │   ├── post/
│   │   │   ├── GetPostById.ts
│   │   │   ├── GetUserPosts.ts
│   │   │   └── index.ts
│   │   └── feed/
│   │       ├── GetExploreFeed.ts
│   │       ├── GetFollowingFeed.ts
│   │       └── index.ts
│   └── errors/
│       ├── AuthenticationError.ts
│       ├── NotFoundError.ts
│       └── index.ts
├── domain/
│   ├── entities/
│   │   ├── Profile.ts
│   │   ├── Post.ts
│   │   └── index.ts
│   └── repositories/
│       ├── IProfileRepository.ts
│       ├── IPostRepository.ts
│       └── index.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── ProfileServiceAdapter.ts
│   │   ├── PostServiceAdapter.ts
│   │   └── index.ts
│   ├── pagination/
│   │   ├── CursorCodec.ts
│   │   ├── ConnectionBuilder.ts
│   │   └── index.ts
│   ├── auth/
│   │   ├── AuthGuard.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── ErrorFactory.ts
│   │   └── index.ts
│   ├── resolvers/
│   │   ├── withAuth.ts
│   │   ├── ResolverBuilder.ts
│   │   ├── ConnectionResolver.ts
│   │   └── index.ts
│   └── di/
│       ├── Container.ts
│       ├── registerServices.ts
│       └── index.ts
└── shared/
    └── types/
        ├── branded.ts
        ├── result.ts
        ├── pagination.ts
        └── index.ts
```

---

## Part 8: Refactored Resolver Example

### Before (Current):
```typescript
// Query.ts - 661 lines
export const Query: QueryResolvers = {
  me: async (_parent, _args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to access your profile', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const profile = await context.services.profileService.getProfileById(context.userId);

    if (!profile) {
      throw new GraphQLError('Profile not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return profile;
  },
  // ... 14 more resolvers
};
```

### After (Refactored):
```typescript
// schema/resolvers/profile/meResolver.ts - 10 lines
import { withAuth } from '../../../infrastructure/resolvers/withAuth.js';
import { GetCurrentUserProfile } from '../../../application/use-cases/profile/GetCurrentUserProfile.js';

export const createMeResolver = (useCase: GetCurrentUserProfile) =>
  withAuth(async (_parent, _args, context) => {
    const result = await useCase.execute({ userId: context.userId });
    if (!result.success) throw result.error;
    return result.data;
  });
```

```typescript
// schema/resolvers/Query.ts - 50 lines (orchestration only)
import { createMeResolver } from './profile/meResolver.js';
import { createProfileResolver } from './profile/profileResolver.js';
import { createPostResolver } from './post/postResolver.js';
// ... other imports

export const createQueryResolvers = (container: Container): QueryResolvers => ({
  me: createMeResolver(container.resolve('GetCurrentUserProfile')),
  profile: createProfileResolver(container.resolve('GetProfileByHandle')),
  post: createPostResolver(container.resolve('GetPostById')),
  // ... other resolvers (1 line each)
});
```

---

## Part 9: Testing Strategy

### 9.1 Unit Test Use Case (100% isolated)

```typescript
// application/use-cases/profile/__tests__/GetCurrentUserProfile.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GetCurrentUserProfile } from '../GetCurrentUserProfile.js';
import { UserId } from '../../../../shared/types/branded.js';

describe('GetCurrentUserProfile', () => {
  it('should return profile when authenticated', async () => {
    const mockRepository = {
      findById: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'user1', handle: '@john' },
      }),
    };

    const useCase = new GetCurrentUserProfile(mockRepository);
    const result = await useCase.execute({ userId: UserId('user1') });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.handle).toBe('@john');
    }
  });

  it('should return error when not authenticated', async () => {
    const mockRepository = { findById: vi.fn() };
    const useCase = new GetCurrentUserProfile(mockRepository);
    
    const result = await useCase.execute({ userId: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('authenticated');
    }
  });
});
```

### 9.2 Unit Test Utility

```typescript
// infrastructure/pagination/__tests__/CursorCodec.test.ts
import { describe, it, expect } from 'vitest';
import { Base64CursorCodec } from '../CursorCodec.js';
import { Cursor } from '../../../shared/types/branded.js';

describe('Base64CursorCodec', () => {
  it('should encode and decode cursor', () => {
    const codec = new Base64CursorCodec();
    const data = { id: 'post1', sortKey: '2024-01-01' };

    const cursor = codec.encode(data);
    const result = codec.decode(cursor);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(data);
    }
  });

  it('should return error for invalid cursor', () => {
    const codec = new Base64CursorCodec();
    const result = codec.decode(Cursor('invalid!!!'));

    expect(result.success).toBe(false);
  });
});
```

### 9.3 Integration Test Resolver

```typescript
// schema/resolvers/profile/__tests__/meResolver.integration.test.ts
import { describe, it, expect } from 'vitest';
import { createMeResolver } from '../meResolver.js';
import { GetCurrentUserProfile } from '../../../../application/use-cases/profile/GetCurrentUserProfile.js';
import { ProfileServiceAdapter } from '../../../../infrastructure/adapters/ProfileServiceAdapter.js';

describe('meResolver (integration)', () => {
  it('should return authenticated user profile', async () => {
    const mockService = {
      getProfileById: vi.fn().mockResolvedValue({ id: 'user1', handle: '@john' }),
    };
    const repository = new ProfileServiceAdapter(mockService);
    const useCase = new GetCurrentUserProfile(repository);
    const resolver = createMeResolver(useCase);

    const result = await resolver(
      {},
      {},
      { userId: UserId('user1') },
      {} as any
    );

    expect(result.handle).toBe('@john');
  });
});
```

---

## Part 10: Migration Path (Incremental Refactoring)

### Phase 1: Infrastructure (Week 1)
- [ ] Create type system (branded types, Result, pagination)
- [ ] Extract CursorCodec utility
- [ ] Extract ConnectionBuilder utility
- [ ] Extract AuthGuard utility
- [ ] Extract ErrorFactory utility
- [ ] **Tests**: 5 utility test files, 100% coverage

### Phase 2: Repositories (Week 1)
- [ ] Define IProfileRepository interface
- [ ] Create ProfileServiceAdapter
- [ ] Define IPostRepository interface
- [ ] Create PostServiceAdapter
- [ ] **Tests**: 2 adapter test files

### Phase 3: Use Cases (Week 2)
- [ ] Extract GetCurrentUserProfile use case
- [ ] Extract GetProfileByHandle use case
- [ ] Extract GetPostById use case
- [ ] Extract GetUserPosts use case
- [ ] **Tests**: 4 use case test files, 100% coverage

### Phase 4: Resolver Composition (Week 2)
- [ ] Create withAuth HOC
- [ ] Create ResolverBuilder
- [ ] Create ConnectionResolver
- [ ] **Tests**: 3 resolver composition test files

### Phase 5: DI Container (Week 3)
- [ ] Create Container class
- [ ] Create registerServices
- [ ] Wire up dependencies
- [ ] **Tests**: DI container test file

### Phase 6: Refactor Resolvers (Week 3-4)
- [ ] Refactor profile resolvers (me, profile)
- [ ] Refactor post resolvers (post, userPosts)
- [ ] Refactor feed resolvers (exploreFeed, followingFeed)
- [ ] Refactor notification resolvers
- [ ] Refactor auction resolvers
- [ ] **Tests**: Integration tests for each resolver group

### Phase 7: Delete Old Code (Week 4)
- [ ] Remove duplicate auth checks
- [ ] Remove duplicate cursor logic
- [ ] Remove duplicate pagination logic
- [ ] Verify all tests pass
- [ ] Delete old Query.ts implementation

---

## Part 11: Success Metrics

### Code Quality
- **Lines of Code**: 661 → ~300 (54% reduction)
- **Cyclomatic Complexity**: Per-function < 10
- **Files**: 1 monolith → 40+ focused modules
- **Duplicated Code**: 0%

### Testability
- **Unit Test Coverage**: 0% → 100%
- **Integration Test Coverage**: ~30% → 90%
- **Mocking Required**: Full context → Single interface
- **Test Execution Time**: Faster (isolated tests)

### Maintainability
- **Adding New Resolver**: 5 minutes (1 file, 10 lines)
- **Changing Business Logic**: Isolated to use case class
- **SOLID Violations**: 0
- **Circular Dependencies**: 0

### Performance
- **Resolver Execution**: Same (no overhead from DI)
- **Test Execution**: 5x faster (isolated unit tests)
- **Build Time**: Same
- **Bundle Size**: +5KB (infrastructure code)

---

## Part 12: Example - Complete Refactor

### Current Implementation (me resolver):

```typescript
// packages/graphql-server/src/schema/resolvers/Query.ts (lines 91-108)
me: async (_parent, _args, context) => {
  if (!context.userId) {
    throw new GraphQLError('You must be authenticated to access your profile', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // Get profile by user ID
  const profile = await context.services.profileService.getProfileById(context.userId);

  if (!profile) {
    throw new GraphQLError('Profile not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  return profile;
},
```

**Issues:**
- 🔴 Mixed concerns (auth + business logic + error handling)
- 🔴 Tightly coupled to context.services
- 🔴 Hard to test (need full context mock)
- 🔴 Duplicate auth logic (13 other resolvers)
- 🔴 Error handling duplicated
- 🔴 No type safety (context.userId is optional everywhere)

---

### Refactored Implementation:

#### Step 1: Branded Types
```typescript
// packages/graphql-server/src/shared/types/branded.ts
export type Brand<K, T> = K & { __brand: T };
export type UserId = Brand<string, 'UserId'>;

export const UserId = (id: string): UserId => id as UserId;
```

#### Step 2: Repository Interface
```typescript
// packages/graphql-server/src/domain/repositories/IProfileRepository.ts
import { AsyncResult } from '../../shared/types/result.js';
import { UserId } from '../../shared/types/branded.js';
import { Profile } from '../entities/Profile.js';

export interface IProfileRepository {
  findById(id: UserId): AsyncResult<Profile | null>;
}
```

#### Step 3: Use Case
```typescript
// packages/graphql-server/src/application/use-cases/profile/GetCurrentUserProfile.ts
import { IProfileRepository } from '../../../domain/repositories/IProfileRepository.js';
import { UserId, Profile, AsyncResult } from '../../../shared/types/index.js';
import { AuthenticationError, NotFoundError } from '../../errors/index.js';

export interface GetCurrentUserProfileInput {
  userId?: UserId;
}

export class GetCurrentUserProfile {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async execute(input: GetCurrentUserProfileInput): AsyncResult<Profile> {
    // Validate authentication
    if (!input.userId) {
      return {
        success: false,
        error: new AuthenticationError('You must be authenticated'),
      };
    }

    // Fetch profile
    const result = await this.profileRepository.findById(input.userId);
    
    if (!result.success) {
      return result;
    }

    // Validate existence
    if (!result.data) {
      return {
        success: false,
        error: new NotFoundError('Profile not found'),
      };
    }

    return { success: true, data: result.data };
  }
}
```

**Unit Test (100% isolated):**
```typescript
// application/use-cases/profile/__tests__/GetCurrentUserProfile.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GetCurrentUserProfile } from '../GetCurrentUserProfile.js';
import { UserId } from '../../../../shared/types/branded.js';
import { AuthenticationError, NotFoundError } from '../../../errors/index.js';

describe('GetCurrentUserProfile', () => {
  it('should return profile when authenticated and exists', async () => {
    const mockRepository = {
      findById: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'user1', handle: '@john', fullName: 'John Doe' },
      }),
    };

    const useCase = new GetCurrentUserProfile(mockRepository);
    const result = await useCase.execute({ userId: UserId('user1') });

    expect(result.success).toBe(true);
    expect(mockRepository.findById).toHaveBeenCalledWith(UserId('user1'));
    
    if (result.success) {
      expect(result.data.handle).toBe('@john');
    }
  });

  it('should return AuthenticationError when not authenticated', async () => {
    const mockRepository = { findById: vi.fn() };
    const useCase = new GetCurrentUserProfile(mockRepository);
    
    const result = await useCase.execute({ userId: undefined });

    expect(result.success).toBe(false);
    expect(mockRepository.findById).not.toHaveBeenCalled();
    
    if (!result.success) {
      expect(result.error).toBeInstanceOf(AuthenticationError);
      expect(result.error.message).toContain('authenticated');
    }
  });

  it('should return NotFoundError when profile does not exist', async () => {
    const mockRepository = {
      findById: vi.fn().mockResolvedValue({ success: true, data: null }),
    };

    const useCase = new GetCurrentUserProfile(mockRepository);
    const result = await useCase.execute({ userId: UserId('user1') });

    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });

  it('should propagate repository errors', async () => {
    const dbError = new Error('Database connection failed');
    const mockRepository = {
      findById: vi.fn().mockResolvedValue({ success: false, error: dbError }),
    };

    const useCase = new GetCurrentUserProfile(mockRepository);
    const result = await useCase.execute({ userId: UserId('user1') });

    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error).toBe(dbError);
    }
  });
});
```

#### Step 4: Adapter (Bridge to Existing Service)
```typescript
// packages/graphql-server/src/infrastructure/adapters/ProfileServiceAdapter.ts
import { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';
import { ProfileService } from '../../../services/ProfileService.js';
import { UserId, Profile, AsyncResult } from '../../shared/types/index.js';

export class ProfileServiceAdapter implements IProfileRepository {
  constructor(private readonly profileService: ProfileService) {}

  async findById(id: UserId): AsyncResult<Profile | null> {
    try {
      const profile = await this.profileService.getProfileById(id);
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
```

#### Step 5: Resolver (Thin Glue Layer)
```typescript
// packages/graphql-server/src/schema/resolvers/profile/meResolver.ts
import { QueryResolvers } from '../../../schema/generated/types.js';
import { GetCurrentUserProfile } from '../../../application/use-cases/profile/GetCurrentUserProfile.js';
import { ErrorFactory } from '../../../infrastructure/errors/ErrorFactory.js';
import { UserId } from '../../../shared/types/branded.js';

export const createMeResolver = (
  useCase: GetCurrentUserProfile
): QueryResolvers['me'] => {
  return async (_parent, _args, context) => {
    // Execute use case
    const result = await useCase.execute({
      userId: context.userId ? UserId(context.userId) : undefined,
    });

    // Handle errors
    if (!result.success) {
      throw ErrorFactory.create(result.error.message, 'UNAUTHENTICATED');
    }

    return result.data;
  };
};
```

**Integration Test:**
```typescript
// schema/resolvers/profile/__tests__/meResolver.integration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMeResolver } from '../meResolver.js';
import { GetCurrentUserProfile } from '../../../../application/use-cases/profile/GetCurrentUserProfile.js';
import { ProfileServiceAdapter } from '../../../../infrastructure/adapters/ProfileServiceAdapter.js';
import { UserId } from '../../../../shared/types/branded.js';

describe('meResolver (integration)', () => {
  it('should return authenticated user profile', async () => {
    const mockService = {
      getProfileById: vi.fn().mockResolvedValue({
        id: 'user1',
        handle: '@john',
        fullName: 'John Doe',
      }),
    };

    const repository = new ProfileServiceAdapter(mockService);
    const useCase = new GetCurrentUserProfile(repository);
    const resolver = createMeResolver(useCase);

    const result = await resolver(
      {},
      {},
      { userId: 'user1' },
      {} as any
    );

    expect(result.handle).toBe('@john');
    expect(mockService.getProfileById).toHaveBeenCalledWith('user1');
  });

  it('should throw error when not authenticated', async () => {
    const mockService = { getProfileById: vi.fn() };
    const repository = new ProfileServiceAdapter(mockService);
    const useCase = new GetCurrentUserProfile(repository);
    const resolver = createMeResolver(useCase);

    await expect(
      resolver({}, {}, { userId: undefined }, {} as any)
    ).rejects.toThrow('authenticated');

    expect(mockService.getProfileById).not.toHaveBeenCalled();
  });
});
```

#### Step 6: Wire Up with DI
```typescript
// packages/graphql-server/src/infrastructure/di/registerServices.ts
import { Container } from './Container.js';
import { ProfileServiceAdapter } from '../adapters/ProfileServiceAdapter.js';
import { GetCurrentUserProfile } from '../../application/use-cases/profile/GetCurrentUserProfile.js';
import type { GraphQLContext } from '../../context.js';

export function registerServices(
  container: Container,
  context: GraphQLContext
): void {
  // Register repositories
  container.register(
    'IProfileRepository',
    () => new ProfileServiceAdapter(context.services.profileService)
  );

  // Register use cases
  container.register(
    'GetCurrentUserProfile',
    () => new GetCurrentUserProfile(container.resolve('IProfileRepository'))
  );
}
```

#### Step 7: Final Query.ts (Orchestration Only)
```typescript
// packages/graphql-server/src/schema/resolvers/Query.ts
import { QueryResolvers } from '../generated/types.js';
import { Container } from '../../infrastructure/di/Container.js';
import { createMeResolver } from './profile/meResolver.js';
import { createProfileResolver } from './profile/profileResolver.js';
// ... other imports

export const createQueryResolvers = (container: Container): QueryResolvers => ({
  me: createMeResolver(container.resolve('GetCurrentUserProfile')),
  profile: createProfileResolver(container.resolve('GetProfileByHandle')),
  // ... other resolvers (1 line each)
});
```

---

### Benefits Achieved:

✅ **Single Responsibility**
- Resolver: Route request to use case
- Use case: Business logic
- Repository: Data access
- Adapter: Bridge to existing service

✅ **Open/Closed**
- Add new resolvers without modifying existing code
- Extend via composition (middleware, decorators)

✅ **Liskov Substitution**
- Can swap ProfileServiceAdapter for MockProfileRepository
- Can swap GetCurrentUserProfile for CachedGetCurrentUserProfile

✅ **Interface Segregation**
- Use case depends only on IProfileRepository (not entire context)
- Resolver gets only what it needs

✅ **Dependency Inversion**
- Use case depends on IProfileRepository interface
- Concrete ProfileServiceAdapter injected at runtime

✅ **Testability**
- Use case: 100% isolated unit test (4 test cases)
- Adapter: Integration test with mock service
- Resolver: Integration test with real use case
- No need to mock entire GraphQL context

✅ **Type Safety**
- Branded UserId prevents string confusion
- Result type forces error handling
- TypeScript ensures contracts match

✅ **Maintainability**
- Each file < 50 lines
- Clear responsibility per module
- Easy to modify without ripple effects

---

## Part 13: Implementation Checklist

### Phase 1: Infrastructure Setup ✅
- [ ] Create `shared/types/branded.ts`
- [ ] Create `shared/types/result.ts`
- [ ] Create `shared/types/pagination.ts`
- [ ] Create `infrastructure/pagination/CursorCodec.ts`
- [ ] Create `infrastructure/pagination/ConnectionBuilder.ts`
- [ ] Create `infrastructure/auth/AuthGuard.ts`
- [ ] Create `infrastructure/errors/ErrorFactory.ts`
- [ ] Write tests for all utilities (100% coverage)

### Phase 2: Domain Layer ✅
- [ ] Create `domain/entities/Profile.ts`
- [ ] Create `domain/entities/Post.ts`
- [ ] Create `domain/repositories/IProfileRepository.ts`
- [ ] Create `domain/repositories/IPostRepository.ts`
- [ ] Create `domain/repositories/IFeedRepository.ts`

### Phase 3: Application Layer ✅
- [ ] Create `application/errors/AuthenticationError.ts`
- [ ] Create `application/errors/NotFoundError.ts`
- [ ] Create `application/use-cases/profile/GetCurrentUserProfile.ts`
- [ ] Create `application/use-cases/profile/GetProfileByHandle.ts`
- [ ] Create `application/use-cases/post/GetPostById.ts`
- [ ] Create `application/use-cases/post/GetUserPosts.ts`
- [ ] Write tests for all use cases (100% coverage)

### Phase 4: Infrastructure Adapters ✅
- [ ] Create `infrastructure/adapters/ProfileServiceAdapter.ts`
- [ ] Create `infrastructure/adapters/PostServiceAdapter.ts`
- [ ] Write tests for all adapters

### Phase 5: Resolver Composition ✅
- [ ] Create `infrastructure/resolvers/withAuth.ts`
- [ ] Create `infrastructure/resolvers/ResolverBuilder.ts`
- [ ] Create `infrastructure/resolvers/ConnectionResolver.ts`
- [ ] Write tests for composition utilities

### Phase 6: Dependency Injection ✅
- [ ] Create `infrastructure/di/Container.ts`
- [ ] Create `infrastructure/di/registerServices.ts`
- [ ] Wire up all dependencies
- [ ] Write DI container tests

### Phase 7: Refactor Resolvers (Incremental) ✅
- [ ] Refactor `me` resolver → `meResolver.ts`
- [ ] Refactor `profile` resolver → `profileResolver.ts`
- [ ] Refactor `post` resolver → `postResolver.ts`
- [ ] Refactor `userPosts` resolver → `userPostsResolver.ts`
- [ ] Refactor `exploreFeed` resolver → `exploreFeedResolver.ts`
- [ ] Refactor `followingFeed` resolver → `followingFeedResolver.ts`
- [ ] Refactor `comments` resolver → `commentsResolver.ts`
- [ ] Refactor `followStatus` resolver → `followStatusResolver.ts`
- [ ] Refactor `postLikeStatus` resolver → `postLikeStatusResolver.ts`
- [ ] Refactor `notifications` resolver → `notificationsResolver.ts`
- [ ] Refactor `unreadNotificationsCount` resolver → `unreadNotificationsCountResolver.ts`
- [ ] Refactor `auction` resolver → `auctionResolver.ts`
- [ ] Refactor `auctions` resolver → `auctionsResolver.ts`
- [ ] Refactor `bids` resolver → `bidsResolver.ts`

### Phase 8: Integration & Cleanup ✅
- [ ] Update `Query.ts` to use `createQueryResolvers(container)`
- [ ] Run all tests (unit + integration)
- [ ] Run GraphQL server and verify all queries work
- [ ] Delete old helper functions from Query.ts
- [ ] Remove duplicate auth/cursor/pagination logic
- [ ] Update documentation

---

## Part 14: Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Incremental refactoring (one resolver at a time)
- Keep old Query.ts until all resolvers migrated
- Run integration tests after each resolver
- Feature flag to toggle new vs old resolvers

### Risk 2: Performance Overhead
**Mitigation:**
- DI container uses lazy instantiation
- No runtime performance impact (same service calls)
- Benchmark critical paths before/after
- Profile with production load

### Risk 3: Team Learning Curve
**Mitigation:**
- Comprehensive documentation (this plan)
- Code examples for each pattern
- Pair programming for first few resolvers
- Review sessions to share knowledge

### Risk 4: Over-Engineering
**Mitigation:**
- Start with simplest patterns (withAuth, CursorCodec)
- Only add complexity when needed
- Pragmatic approach (adapter pattern bridges existing services)
- Focus on testability and maintainability wins

---

## Part 15: Conclusion

This refactoring transforms Query.ts from a 661-line monolith into a modular, testable architecture following SOLID principles and advanced TypeScript patterns.

**Key Wins:**
1. **Testability**: 100% unit test coverage without mocking GraphQL context
2. **Maintainability**: 54% code reduction, clear responsibilities
3. **Type Safety**: Branded types, Result monads, discriminated unions
4. **Extensibility**: Composition over inheritance, middleware pattern
5. **Loose Coupling**: Dependency injection via interfaces

**ROI:**
- **Development Time**: -50% for new resolvers
- **Bug Fixing Time**: -70% (isolated changes)
- **Onboarding Time**: -60% (clear architecture)
- **Test Execution**: 5x faster (isolated unit tests)

**Next Steps:**
1. Review this plan with team
2. Get approval for Phase 1 (infrastructure)
3. Start incremental migration
4. Measure success metrics at each phase

---

## Appendix A: Full Type Definitions

```typescript
// packages/graphql-server/src/shared/types/index.ts
export * from './branded.js';
export * from './result.js';
export * from './pagination.js';

// Re-export for convenience
export type { UserId, PostId, Cursor } from './branded.js';
export type { Result, AsyncResult } from './result.js';
export type {
  PageInfo,
  Edge,
  Connection,
  PaginationArgs,
  CursorData,
} from './pagination.js';
```

## Appendix B: Alternative Patterns Considered

### Pattern 1: Repository Per Resolver (Rejected)
- Too granular, explosion of interfaces
- Hard to maintain consistency

### Pattern 2: Service Layer (Rejected)
- Doesn't solve tight coupling to context.services
- Still need adapters

### Pattern 3: GraphQL Middleware (Considered)
- Good for cross-cutting concerns (auth, logging)
- Included in refactor (withAuth, ResolverBuilder)

### Pattern 4: CQRS (Overkill)
- Separate Command/Query objects
- Too complex for current scale
- Can evolve to this later if needed

## Appendix C: Resources

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Branded Types](https://egghead.io/blog/using-branded-types-in-typescript)
- [Result Type](https://imhoff.blog/posts/using-results-in-typescript)
- [Dependency Injection](https://khalilstemmler.com/articles/software-design-architecture/coding-without-di-container/)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Use Case Pattern](https://khalilstemmler.com/articles/enterprise-typescript-nodejs/application-layer-use-cases/)