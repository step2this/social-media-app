# Deprecated SDL Tests

These tests have been deprecated as part of the Pothos migration (Phase 4 - Big Bang).

## Why Deprecated?

These tests were written for the SDL (Schema Definition Language) based GraphQL schema. After migrating to Pothos, these tests are no longer relevant because:

1. **Schema Structure Changed**: Pothos uses code-first schema definition instead of SDL
2. **Resolver Structure Changed**: Pothos uses field resolvers co-located with types instead of separate resolver files
3. **Brittle Tests**: These tests validate SDL schema structure, which no longer exists

## What Replaced Them?

The SDL tests have been replaced with comprehensive Pothos integration tests:

- `src/schema/pothos/__tests__/auth-integration.test.ts` - Auth module tests
- `src/schema/pothos/__tests__/phase3-integration.test.ts` - Comments, Social, Notifications tests
- `src/schema/pothos/__tests__/posts-integration.test.ts` - Posts module tests
- `src/schema/pothos/__tests__/profile-integration.test.ts` - Profile module tests
- `src/schema/pothos/__tests__/feed-integration.test.ts` - Feed module tests
- `src/schema/pothos/__tests__/auctions-integration.test.ts` - Auctions module tests

## Testing Principles for New Tests

The new Pothos integration tests follow these principles:

- ✅ **No mocks** - use real services with dependency injection
- ✅ **Behavioral testing** - test what operations do, not how they do it
- ✅ **DRY** - helper functions for common patterns
- ✅ **Type-safe** - proper TypeScript typing throughout

## Files Deprecated

### Schema Structure Tests
- `schema.test.ts` - Tested SDL schema structure (Query, Mutation, types)
- `schema-auctions.test.ts` - Tested SDL auction schema structure

### Resolver Tests
- `resolvers/Query.test.ts` - Tested SDL query resolvers
- `resolvers/Mutation.test.ts` - Tested SDL mutation resolvers
- `resolvers/FieldResolvers.test.ts` - Tested SDL field resolvers
- `resolvers/FeedQueries.test.ts` - Tested SDL feed query resolvers
- `resolvers/ProfileNotifications.test.ts` - Tested SDL profile/notifications resolvers
- `resolvers/auctions.test.ts` - Tested SDL auction resolvers

## Can These Be Deleted?

Yes, these files can be safely deleted after the Pothos migration is fully validated in production. They are kept temporarily for reference during the transition period.
