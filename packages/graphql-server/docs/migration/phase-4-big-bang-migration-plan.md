# Phase 4: Big Bang Pothos Migration - Complete SDL Elimination

**Date:** 2025-11-12
**Branch:** claude/review-pothos-commits-011CV2j1CHitg612J1qRcsrw
**Status:** 🚧 In Progress

---

## Executive Summary

Complete the Pothos migration by migrating all remaining modules (Posts, Profile, Feed, Auctions) in a single "big bang" approach, then eliminating the SDL schema entirely. This avoids incremental type dependency issues and provides a clean, fully type-safe Pothos implementation.

---

## Why Big Bang Instead of Gradual?

**Problem with Gradual Approach:**
- Type dependencies between modules cause codegen errors
- `DeleteResponse` needed by both migrated and unmigrated modules
- `Comment` type references `Post` type
- Complex schema merging edge cases
- Maintaining two parallel schemas is error-prone

**Big Bang Benefits:**
- ✅ Eliminate all SDL/Pothos conflicts at once
- ✅ Clean type dependencies
- ✅ Single source of truth immediately
- ✅ Easier to test and validate
- ✅ Rollback is simpler (one revert vs many)

---

## Current State

### ✅ Already Migrated to Pothos:
- **Phase 1**: Auth module (4 mutations, 2 queries)
- **Phase 3**: Comments, Social, Notifications (9 mutations, 5 queries)

### ❌ Still in SDL Schema:
- **Posts Module**: Post type, createPost, updatePost, deletePost, post, userPosts
- **Profile Module**: updateProfile, getProfilePictureUploadUrl
- **Feed Module**: FeedItem, feed queries, markFeedItemsAsRead
- **Auctions Module**: All auction types and operations

---

## Migration Plan

### Architecture Principles

**Type Safety:**
- Use generics for reusable, type-flexible components
- Employ conditional types for sophisticated type logic
- Use mapped types to transform existing types
- Use template literal types for string-based types with pattern matching
- Maintain type safety at all times - avoid `any` or `unknown`

**Code Quality:**
- SOLID principles - Single Responsibility, clean separation of concerns
- DRY - Don't Repeat Yourself
- Co-locate related code (types + resolvers)

**Testing Principles:**
- ✅ No mocks or spies - use real services with DI
- ✅ DRY tests with helper functions
- ✅ Behavioral testing - test what code does, not how
- ✅ Type-safe throughout (no any types except Lambda context)
- ✅ Test core use cases and key edge cases only
- ✅ Use existing shared test fixtures and utilities

**Git Workflow:**
- ✅ Commit after each meaningful delivery
- ✅ Push after each step (for crash recovery)
- ✅ Descriptive commit messages following conventional commits

---

## Execution Steps

### Step 1: Create Pothos Types for Posts Module
**Files to create:**
- `src/schema/pothos/types/posts.ts`

**Types to migrate:**
- Post
- PostConnection
- PostEdge
- CreatePostPayload
- CreatePostInput (as args)
- UpdatePostInput (as args)

**Commit:** `feat(pothos): add Posts types`

---

### Step 2: Create Pothos Types for Feed Module
**Files to create:**
- `src/schema/pothos/types/feed.ts`

**Types to migrate:**
- FeedItem
- FeedConnection
- FeedEdge
- MarkFeedReadResponse

**Commit:** `feat(pothos): add Feed types`

---

### Step 3: Create Pothos Types for Auctions Module
**Files to create:**
- `src/schema/pothos/types/auctions.ts`

**Types to migrate:**
- Auction
- Bid
- AuctionConnection
- AuctionEdge
- BidConnection
- CreateAuctionPayload
- PlaceBidPayload
- CreateAuctionInput (as args)
- PlaceBidInput (as args)
- AuctionStatus enum

**Commit:** `feat(pothos): add Auctions types`

---

### Step 4: Create Pothos Mutations for Posts Module
**Files to create:**
- `src/schema/pothos/mutations/posts.ts`

**Mutations to migrate:**
- createPost(input: CreatePostInput!): CreatePostPayload!
- updatePost(id: ID!, input: UpdatePostInput!): Post!
- deletePost(id: ID!): DeleteResponse!

**Commit:** `feat(pothos): add Posts mutations`

---

### Step 5: Create Pothos Mutations for Profile Module
**Files to create:**
- `src/schema/pothos/mutations/profile.ts`

**Mutations to migrate:**
- updateProfile(input: UpdateProfileInput!): Profile!
- getProfilePictureUploadUrl(fileType: String): PresignedUrlResponse!

**Types needed:**
- UpdateProfileInput (as args)
- PresignedUrlResponse

**Commit:** `feat(pothos): add Profile mutations`

---

### Step 6: Create Pothos Mutations for Feed Module
**Files to create:**
- `src/schema/pothos/mutations/feed.ts`

**Mutations to migrate:**
- markFeedItemsAsRead(postIds: [ID!]!): MarkFeedReadResponse!

**Commit:** `feat(pothos): add Feed mutations`

---

### Step 7: Create Pothos Mutations for Auctions Module
**Files to create:**
- `src/schema/pothos/mutations/auctions.ts`

**Mutations to migrate:**
- createAuction(input: CreateAuctionInput!): CreateAuctionPayload!
- activateAuction(id: ID!): Auction!
- placeBid(input: PlaceBidInput!): PlaceBidPayload!

**Commit:** `feat(pothos): add Auctions mutations`

---

### Step 8: Create Pothos Queries for Posts Module
**Files to create:**
- `src/schema/pothos/queries/posts.ts`

**Queries to migrate:**
- post(id: ID!): Post
- userPosts(handle: String!, limit: Int, cursor: String): PostConnection!

**Commit:** `feat(pothos): add Posts queries`

---

### Step 9: Create Pothos Queries for Feed Module
**Files to create:**
- `src/schema/pothos/queries/feed.ts`

**Queries to migrate:**
- feed(limit: Int, cursor: String, first: Int, after: String): FeedConnection!
- exploreFeed(limit: Int, cursor: String, first: Int, after: String): PostConnection!
- followingFeed(limit: Int, cursor: String, first: Int, after: String): PostConnection!

**Commit:** `feat(pothos): add Feed queries`

---

### Step 10: Create Pothos Queries for Auctions Module
**Files to create:**
- `src/schema/pothos/queries/auctions.ts`

**Queries to migrate:**
- auction(id: ID!): Auction
- auctions(limit: Int, cursor: String, status: AuctionStatus, userId: ID): AuctionConnection!
- bids(auctionId: ID!, limit: Int, offset: Int): BidConnection!

**Commit:** `feat(pothos): add Auctions queries`

---

### Step 11: Create Integration Tests for Posts Module
**Files to create:**
- `src/schema/pothos/__tests__/posts-integration.test.ts`

**Test coverage:**
- Schema structure validation (Post types exist)
- createPost mutation (auth enforcement, type safety)
- updatePost mutation (auth enforcement, ownership)
- deletePost mutation (auth enforcement, ownership)
- post query (public access)
- userPosts query (pagination)

**Testing principles:**
- No mocks - use real services with DI
- DRY with createTestContext and executeOperation helpers
- Behavioral - test outcomes, not implementation
- Type-safe throughout

**Commit:** `test(pothos): add Posts integration tests`

---

### Step 12: Create Integration Tests for Profile Module
**Files to create:**
- `src/schema/pothos/__tests__/profile-integration.test.ts`

**Test coverage:**
- updateProfile mutation (auth enforcement)
- getProfilePictureUploadUrl mutation (auth enforcement)

**Commit:** `test(pothos): add Profile integration tests`

---

### Step 13: Create Integration Tests for Feed Module
**Files to create:**
- `src/schema/pothos/__tests__/feed-integration.test.ts`

**Test coverage:**
- feed query (auth enforcement or public)
- exploreFeed query (public access)
- followingFeed query (auth enforcement)
- markFeedItemsAsRead mutation (auth enforcement)

**Commit:** `test(pothos): add Feed integration tests`

---

### Step 14: Create Integration Tests for Auctions Module
**Files to create:**
- `src/schema/pothos/__tests__/auctions-integration.test.ts`

**Test coverage:**
- createAuction mutation (auth enforcement)
- activateAuction mutation (auth enforcement, ownership)
- placeBid mutation (auth enforcement, validation)
- auction query (public access)
- auctions query (public access, filtering)
- bids query (public access)

**Commit:** `test(pothos): add Auctions integration tests`

---

### Step 15: Remove SDL Schema and Update Server Config
**Files to modify:**
- `src/schema/pothos/index.ts` - Add all new module imports
- `src/server-with-pothos.ts` - Remove SDL schema merging, use only Pothos
- `src/lambda.ts` - Update to use Pothos-only schema
- `src/standalone-server.ts` - Update to use Pothos-only schema

**Files to delete:**
- `schema.graphql` - Delete SDL schema entirely
- `src/schema/resolvers/` - Delete entire directory
- `src/schema/typeDefs.ts` - Delete SDL type definitions

**Files to update:**
- `codegen.yml` - Update to use Pothos schema or remove if no longer needed
- `package.json` - Remove codegen script if no longer needed

**Commit:** `refactor(pothos): remove SDL schema, migrate to Pothos-only`

---

### Step 16: Run Full Test Suite and Fix Issues
**Actions:**
1. Run integration tests: `npm test`
2. Verify all Pothos integration tests pass
3. Run use case tests: `npm test -- use-cases`
4. Fix any failing tests or type issues
5. Ensure no regressions

**Commit:** `fix(pothos): resolve test failures and type issues`

---

### Step 17: Clean Up Brittle Tests
**Tests to remove:**
- Tests that directly call SDL resolvers (e.g., `Mutation.createPost()`)
- Schema structure tests for SDL types
- Mock-heavy tests that don't follow clean principles
- Tests that test implementation details instead of behavior

**Tests to keep:**
- All Pothos integration tests
- Use case tests (business logic)
- Infrastructure tests (middleware, loaders, etc.)

**Commit:** `test(cleanup): remove brittle SDL-dependent tests`

---

### Step 18: Create Final Completion Document
**Files to create:**
- `docs/migration/phase-4-pothos-complete.md`

**Document contents:**
- Migration summary
- What was migrated
- Test coverage statistics
- Performance impact
- Breaking changes (if any)
- Next steps / recommendations

**Commit:** `docs(pothos): add Phase 4 completion summary`

---

## Success Criteria

### ✅ Schema
- SDL schema completely removed
- Only Pothos schema remains
- All types properly defined with full type safety
- No `any` or `unknown` types (except Lambda context)

### ✅ Tests
- All integration tests passing
- All use case tests passing
- No brittle tests remaining
- Test coverage follows clean principles

### ✅ Type Safety
- Zero TypeScript errors
- Full type inference throughout
- Proper use of generics and conditional types
- No type assertions unless absolutely necessary

### ✅ Code Quality
- SOLID principles followed
- DRY - no code duplication
- Clear separation of concerns
- Well-documented complex logic

---

## Rollback Plan

If migration needs to be abandoned:

```bash
# Find the commit before Step 1
git log --oneline

# Revert to that commit
git reset --hard <commit-hash-before-step-1>

# Force push to remote (if already pushed)
git push --force origin claude/review-pothos-commits-011CV2j1CHitg612J1qRcsrw
```

**Effort**: < 5 minutes (atomic revert)

---

## Risk Mitigation

### Risk 1: Type Dependency Cycles
**Mitigation**:
- Define shared types first (Post, Profile, etc.)
- Use forward references where needed
- Import types carefully to avoid circular dependencies

### Risk 2: Breaking Changes
**Mitigation**:
- Keep GraphQL API identical (same field names, args, types)
- Run integration tests to verify behavior
- Compare introspection before/after

### Risk 3: Test Failures
**Mitigation**:
- Commit after each step (easy rollback)
- Run tests frequently during migration
- Fix issues immediately before proceeding

### Risk 4: Performance Degradation
**Mitigation**:
- Schema build time should be similar
- Query execution should be identical
- Monitor memory usage

---

## Timeline Estimate

**Total Estimated Time**: 4-6 hours

- Steps 1-3 (Types): 1 hour
- Steps 4-7 (Mutations): 1 hour
- Steps 8-10 (Queries): 45 minutes
- Steps 11-14 (Tests): 1.5 hours
- Step 15 (Remove SDL): 30 minutes
- Step 16 (Test Suite): 30 minutes
- Step 17 (Cleanup): 30 minutes
- Step 18 (Documentation): 15 minutes

---

## Progress Tracking

- [ ] Step 1: Create Pothos Types for Posts Module
- [ ] Step 2: Create Pothos Types for Feed Module
- [ ] Step 3: Create Pothos Types for Auctions Module
- [ ] Step 4: Create Pothos Mutations for Posts Module
- [ ] Step 5: Create Pothos Mutations for Profile Module
- [ ] Step 6: Create Pothos Mutations for Feed Module
- [ ] Step 7: Create Pothos Mutations for Auctions Module
- [ ] Step 8: Create Pothos Queries for Posts Module
- [ ] Step 9: Create Pothos Queries for Feed Module
- [ ] Step 10: Create Pothos Queries for Auctions Module
- [ ] Step 11: Create Integration Tests for Posts Module
- [ ] Step 12: Create Integration Tests for Profile Module
- [ ] Step 13: Create Integration Tests for Feed Module
- [ ] Step 14: Create Integration Tests for Auctions Module
- [ ] Step 15: Remove SDL Schema and Update Server Config
- [ ] Step 16: Run Full Test Suite and Fix Issues
- [ ] Step 17: Clean Up Brittle Tests
- [ ] Step 18: Create Final Completion Document

---

## Notes

**Important Considerations:**
- Commit and push after EACH step for crash recovery
- Test frequently - don't wait until the end
- Keep commits atomic and focused
- Write clear commit messages
- Document any tricky decisions inline

**If Session Crashes:**
1. Check this document for progress tracking
2. Look at git log to see last completed step
3. Review todo list in code
4. Continue from next uncompleted step
5. Run tests before proceeding

---

## Conclusion

This big bang approach will eliminate all SDL/Pothos conflicts, provide a clean fully type-safe implementation, and ensure comprehensive test coverage following clean testing principles. The step-by-step approach with commits after each step ensures we can recover from crashes and rollback incrementally if needed.

**Ready to proceed!** 🚀
