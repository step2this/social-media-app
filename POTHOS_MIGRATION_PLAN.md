# Pothos GraphQL Migration Plan

## Executive Summary

This document outlines a phased migration plan from schema-first GraphQL (using SDL + codegen) to code-first GraphQL using [Pothos GraphQL](https://pothos-graphql.dev/). The migration will be executed module-by-module, starting with an Auth POC to validate the approach.

---

## Table of Contents

1. [Why Pothos?](#why-pothos)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Migration Strategy](#migration-strategy)
4. [Phase 1: Auth Module POC](#phase-1-auth-module-poc)
5. [Phase 2: Core Modules](#phase-2-core-modules)
6. [Phase 3: Advanced Features](#phase-3-advanced-features)
7. [Technical Implementation](#technical-implementation)
8. [Risk Mitigation](#risk-mitigation)
9. [Success Criteria](#success-criteria)

---

## Why Pothos?

### Current Pain Points

1. **Type Mismatches**: Constant friction between DAL types and GraphQL types
   - `undefined` vs `null` conversions
   - Field name mismatches (e.g., `userId` → `sellerId`)
   - Manual type adapters needed everywhere
   - 50+ `@ts-expect-error` suppressions in codebase

2. **Schema/Code Drift**: Schema-first approach requires constant synchronization
   - `schema.graphql` must be manually kept in sync with TypeScript
   - Codegen generates types that don't always match reality
   - Breaking changes not caught until runtime

3. **Poor Developer Experience**
   - No autocomplete when writing resolvers
   - Type errors don't appear until build time
   - Refactoring is dangerous (no compile-time safety)
   - Hard to discover what fields are available

### Pothos Benefits

✅ **Type Safety**: Types flow from TypeScript → GraphQL schema
✅ **No Type Mismatches**: Schema matches TypeScript exactly
✅ **Excellent DX**: Full autocomplete and IntelliSense
✅ **Refactoring Safety**: Rename a field = schema updates automatically
✅ **Plugin Ecosystem**: Auth, validation, DataLoader, Relay pagination
✅ **Zod Integration**: Already using Zod for validation in use cases
✅ **Gradual Migration**: Can run side-by-side with existing schema

---

## Current Architecture Analysis

### Schema Stats
- **Total Types**: ~50+ (Post, Profile, Comment, Notification, Auction, etc.)
- **Mutations**: ~25 (auth, posts, comments, likes, follows, auctions, etc.)
- **Queries**: ~15 (feed, profile, posts, notifications, etc.)
- **Total Lines**: ~800 lines in schema.graphql

### Auth Module Breakdown

**Types**: 5
- `AuthPayload`
- `AuthTokens`
- `LogoutResponse`
- `RegisterInput` (input)
- `LoginInput` (input)

**Mutations**: 4
- `register`
- `login`
- `refreshToken`
- `logout`

**Queries**: 2
- `me` (protected)
- `profile` (public with optional auth)

**Complexity**: Low-Medium
- Simple input/output types
- Clear authentication boundaries
- Well-established patterns

**Perfect for POC**: ✅

---

## Migration Strategy

### Approach: **Gradual Module Migration**

Instead of big-bang rewrite, migrate one module at a time:

```
Current:               Pothos (side-by-side):
┌─────────────┐       ┌─────────────┐
│ schema.graphql│       │ schema.graphql│
│             │       │             │
│ All types   │  →   │ Non-Auth    │
│ All mutations│       │ types       │
│ All queries │       │             │
└─────────────┘       └─────────────┘
                             ⊕
                      ┌─────────────┐
                      │ Pothos      │
                      │ Schema      │
                      │             │
                      │ Auth module │
                      └─────────────┘
```

### Migration Order

**Phase 1: Auth Module** (POC)
- Lowest risk, highest value
- Clear boundaries
- Already well-structured
- Tests existing

**Phase 2: Core Modules**
- Posts
- Comments
- Likes
- Follows

**Phase 3: Advanced Features**
- Notifications
- Auctions
- Feed (complex with DataLoader)
- Search

---

## Phase 1: Auth Module POC

### Goal
Prove that Pothos:
1. Eliminates type mismatches
2. Improves developer experience
3. Integrates with existing use case pattern
4. Works alongside current schema

### Scope

**In Scope:**
- ✅ Auth types (AuthPayload, AuthTokens, etc.)
- ✅ Auth mutations (register, login, refreshToken, logout)
- ✅ Auth queries (me, profile)
- ✅ Auth middleware (@requiresAuth)
- ✅ Integration with existing use cases
- ✅ Side-by-side with current resolvers

**Out of Scope:**
- ❌ Other modules (posts, comments, etc.)
- ❌ Removing old schema (parallel operation)
- ❌ Migration of tests (reuse existing)

### Implementation Steps

1. **Install Pothos Dependencies**
   ```bash
   pnpm add @pothos/core @pothos/plugin-scope-auth @pothos/plugin-validation
   ```

2. **Create Pothos Schema Builder**
   ```typescript
   // packages/graphql-server/src/schema/pothos/builder.ts
   import SchemaBuilder from '@pothos/core';
   import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
   import ValidationPlugin from '@pothos/plugin-validation';

   export const builder = new SchemaBuilder<{
     Context: GraphQLContext;
     AuthScopes: {
       authenticated: boolean;
     };
   }>({
     plugins: [ScopeAuthPlugin, ValidationPlugin],
     authScopes: async (context) => ({
       authenticated: !!context.userId,
     }),
   });
   ```

3. **Define Auth Types**
   ```typescript
   // packages/graphql-server/src/schema/pothos/types/auth.ts

   // Profile type (from DAL)
   const ProfileType = builder.objectRef<ProfileFromDAL>('Profile');
   ProfileType.implement({
     fields: (t) => ({
       id: t.exposeID('id'),
       username: t.exposeString('username'),
       email: t.exposeString('email'),
       handle: t.exposeString('handle'),
       fullName: t.exposeString('fullName', { nullable: true }),
       // ... auto-complete all fields from ProfileFromDAL
     }),
   });

   // AuthTokens
   const AuthTokensType = builder.objectType('AuthTokens', {
     fields: (t) => ({
       accessToken: t.string({ resolve: (parent) => parent.accessToken }),
       refreshToken: t.string({ resolve: (parent) => parent.refreshToken }),
       expiresIn: t.int({ resolve: () => 3600 }),
     }),
   });

   // AuthPayload
   builder.objectType('AuthPayload', {
     fields: (t) => ({
       user: t.field({ type: ProfileType, resolve: (parent) => parent.user }),
       tokens: t.field({ type: AuthTokensType, resolve: (parent) => parent.tokens }),
     }),
   });
   ```

4. **Define Auth Mutations**
   ```typescript
   // packages/graphql-server/src/schema/pothos/mutations/auth.ts

   builder.mutationFields((t) => ({
     register: t.field({
       type: 'AuthPayload',
       args: {
         email: t.arg.string({ required: true }),
         password: t.arg.string({ required: true }),
         username: t.arg.string({ required: true }),
         handle: t.arg.string({ required: true }),
         fullName: t.arg.string({ required: true }),
       },
       resolve: async (parent, args, context) => {
         const result = await executeUseCase(
           context.container.resolve('register'),
           args
         );
         return result;
       },
     }),

     login: t.field({
       type: 'AuthPayload',
       args: {
         email: t.arg.string({ required: true }),
         password: t.arg.string({ required: true }),
       },
       resolve: async (parent, args, context) => {
         const result = await executeUseCase(
           context.container.resolve('login'),
           args
         );
         return result;
       },
     }),

     logout: t.field({
       type: 'LogoutResponse',
       authScopes: { authenticated: true }, // ✨ Built-in auth!
       resolve: async (parent, args, context) => {
         const result = await executeUseCase(
           context.container.resolve('logout'),
           { userId: context.userId! }
         );
         return result;
       },
     }),
   }));
   ```

5. **Define Auth Queries**
   ```typescript
   // packages/graphql-server/src/schema/pothos/queries/auth.ts

   builder.queryFields((t) => ({
     me: t.field({
       type: ProfileType,
       authScopes: { authenticated: true }, // ✨ Built-in auth!
       resolve: async (parent, args, context) => {
         const result = await executeUseCase(
           context.container.resolve('getCurrentUserProfile'),
           { userId: context.userId! }
         );
         return result;
       },
     }),
   }));
   ```

6. **Merge Schemas**
   ```typescript
   // packages/graphql-server/src/server.ts
   import { mergeSchemas } from '@graphql-tools/schema';

   const currentSchema = buildSchemaFromSDL(typeDefs, resolvers);
   const pothosSchema = builder.toSchema();

   const mergedSchema = mergeSchemas({
     schemas: [currentSchema, pothosSchema],
   });

   const server = new ApolloServer({
     schema: mergedSchema,
     // ...
   });
   ```

### Testing Strategy

**Reuse Existing Tests**: Auth resolver tests should work unchanged
- Tests call GraphQL operations
- Don't care about schema implementation
- Just verify correct behavior

**Add Pothos-Specific Tests**:
- Verify type safety (TypeScript compilation)
- Test auth scope plugin
- Verify merged schema works

### Success Metrics

✅ **Type Safety**: No `@ts-expect-error` in auth code
✅ **DX**: Autocomplete works in all resolvers
✅ **Tests Pass**: All existing auth tests pass
✅ **Performance**: No degradation in response time
✅ **Schema Validity**: `schema.graphql` still works for non-auth queries

---

## Phase 2: Core Modules

After successful Auth POC, migrate in order:

### 2.1 Posts Module
- `Post` type
- `CreatePost`, `UpdatePost`, `DeletePost` mutations
- `post`, `posts` queries
- **Complexity**: Medium (image handling, privacy)

### 2.2 Comments Module
- `Comment` type
- `CreateComment`, `DeleteComment` mutations
- `comments` query
- **Complexity**: Low (simple CRUD)

### 2.3 Likes Module
- `likePost`, `unlikePost` mutations
- `likes` query
- **Complexity**: Low (simple boolean operations)

### 2.4 Follows Module
- `followUser`, `unfollowUser` mutations
- `followers`, `following` queries
- **Complexity**: Low (simple relationships)

**Estimated Time**: 2-3 weeks per module

---

## Phase 3: Advanced Features

### 3.1 Notifications Module
- Complex type unions
- Real-time subscriptions (if using)
- **Complexity**: High

### 3.2 Auctions Module
- Complex business logic
- Bidding system
- **Complexity**: High

### 3.3 Feed System
- DataLoader integration
- Pagination (Relay cursor-based)
- Caching strategies
- **Complexity**: Very High

**Estimated Time**: 1-2 months

---

## Technical Implementation

### File Structure

```
packages/graphql-server/src/
├── schema/
│   ├── pothos/                    # NEW: Pothos schema
│   │   ├── builder.ts             # Schema builder config
│   │   ├── types/
│   │   │   ├── auth.ts            # Auth types
│   │   │   ├── post.ts            # Post types
│   │   │   └── ...
│   │   ├── mutations/
│   │   │   ├── auth.ts            # Auth mutations
│   │   │   ├── post.ts            # Post mutations
│   │   │   └── ...
│   │   ├── queries/
│   │   │   ├── auth.ts            # Auth queries
│   │   │   ├── post.ts            # Post queries
│   │   │   └── ...
│   │   └── index.ts               # Export merged schema
│   │
│   ├── typeDefs.ts                # OLD: SDL schema (gradually shrinking)
│   ├── resolvers/                 # OLD: Resolvers (gradually shrinking)
│   └── generated/                 # Codegen types
│
└── server.ts                      # Merge old + new schemas
```

### Dependency Management

**New Dependencies**:
```json
{
  "dependencies": {
    "@pothos/core": "^4.0.0",
    "@pothos/plugin-scope-auth": "^4.0.0",
    "@pothos/plugin-validation": "^4.0.0",
    "@pothos/plugin-relay": "^4.0.0",        // For pagination
    "@pothos/plugin-dataloader": "^4.0.0",   // For DataLoader integration
    "@graphql-tools/schema": "^10.0.0",      // For schema merging
    "@graphql-tools/merge": "^9.0.0"         // For merging utilities
  }
}
```

**Total Size**: ~2MB additional (acceptable)

### Integration Points

**Use Cases**: ✅ No changes required
- Use cases are schema-agnostic
- Just call `executeUseCase()` as before

**Context**: ✅ No changes required
- Pothos uses same `GraphQLContext`
- Auth middleware works the same

**DataLoaders**: ✅ Works better
- Pothos has DataLoader plugin
- Auto-batching built-in

**Validation**: ✅ Simplified
- Can use Zod directly in Pothos
- Or keep validation in use cases (preferred)

---

## Risk Mitigation

### Risk 1: Schema Merging Complexity
**Mitigation**: Use `@graphql-tools/schema` merging
- Well-tested library
- POC will validate approach
- Can run schemas in parallel

### Risk 2: Breaking Changes
**Mitigation**: Gradual migration
- Old schema remains working
- New schema added alongside
- Clients don't notice difference

### Risk 3: Learning Curve
**Mitigation**: Start small (Auth POC)
- Team learns on simple module
- Document patterns
- Create templates for other modules

### Risk 4: Performance Impact
**Mitigation**: Benchmark early
- Test response times in POC
- DataLoader plugin optimizes N+1
- Can optimize if needed

### Risk 5: Type Generation for Clients
**Mitigation**: Pothos generates SDL
- Can still use codegen for clients
- `builder.toSchema()` → SDL
- No client changes needed

---

## Success Criteria

### POC Success Criteria (Phase 1)

✅ **All auth operations work**: register, login, logout, refreshToken, me
✅ **Type safety**: No type errors in auth resolvers
✅ **Tests pass**: All existing auth tests pass unchanged
✅ **Performance**: Response time within 5% of current
✅ **DX**: Team prefers Pothos over current approach

### Full Migration Success Criteria

✅ **Zero type mismatches**: No `@ts-expect-error` in resolvers
✅ **100% Pothos**: All modules migrated
✅ **Schema.graphql removed**: Only Pothos remains
✅ **Tests pass**: All tests pass
✅ **Performance**: Same or better than before
✅ **Client compatibility**: Clients work without changes

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **Phase 1: Auth POC** | 1 week | Working auth module in Pothos, POC validation |
| **Phase 2.1: Posts** | 2 weeks | Posts module migrated |
| **Phase 2.2: Comments** | 1 week | Comments module migrated |
| **Phase 2.3: Likes** | 1 week | Likes module migrated |
| **Phase 2.4: Follows** | 1 week | Follows module migrated |
| **Phase 3: Advanced** | 4 weeks | All modules migrated |
| **Cleanup** | 1 week | Remove old schema, cleanup |

**Total Estimated Time**: 10-12 weeks

---

## Decision Points

### After POC (Week 1)

**Go/No-Go Decision**: Continue with full migration?

**Evaluate**:
- Is type safety significantly better?
- Does DX improve workflow?
- Are there unexpected issues?
- Does team prefer it?

**Options**:
1. ✅ **Go**: Continue to Phase 2
2. ⚠️ **Iterate**: Fix POC issues, retry
3. ❌ **No-Go**: Stay with current approach

### After Phase 2 (Week 7)

**Mid-Point Check**: Is migration worth continuing?

**Evaluate**:
- Are we on schedule?
- Is complexity manageable?
- Are benefits materializing?

---

## Rollback Plan

If migration needs to be abandoned:

1. **Delete Pothos schema code**: Remove `schema/pothos/` directory
2. **Remove schema merging**: Revert to single SDL schema
3. **Uninstall dependencies**: Remove Pothos packages
4. **Git revert**: Roll back commits

**Effort**: 1-2 hours (minimal risk)

---

## Resources

**Documentation**:
- Pothos Docs: https://pothos-graphql.dev/
- Auth Plugin: https://pothos-graphql.dev/docs/plugins/scope-auth
- Validation Plugin: https://pothos-graphql.dev/docs/plugins/validation

**Examples**:
- GitHub repo: https://github.com/hayes/pothos
- Example apps: https://github.com/hayes/pothos/tree/main/examples

---

## Next Steps

1. ✅ **Review this plan** with team
2. ⏭️ **Approve POC** (Phase 1)
3. ⏭️ **Create branch** for POC work
4. ⏭️ **Implement Auth POC** (1 week)
5. ⏭️ **Evaluate results** (Go/No-Go decision)

---

## Conclusion

Pothos offers a compelling path forward:
- **Eliminates type mismatches** (current pain point)
- **Improves developer experience** (autocomplete, refactoring)
- **Gradual migration** (low risk)
- **Proven technology** (used by many production apps)

The Auth POC will validate this approach with minimal investment (1 week) before committing to full migration.

**Recommendation**: ✅ **Proceed with Auth POC**
