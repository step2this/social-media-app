# GraphQL Anti-Patterns Analysis Report

**Repository**: social-media-app
**Date**: 2025-11-05
**Scope**: Complete GraphQL implementation (schema, resolvers, queries, mutations)

---

## Executive Summary

This report identifies **20 GraphQL anti-patterns** found across the social-media-app monorepo. While the codebase demonstrates many good practices (DataLoaders, cursor pagination, clean architecture), there are significant schema design, consistency, and implementation issues that should be addressed.

**Severity Breakdown:**
- 🔴 **Critical** (4): Issues that cause bugs or major performance problems
- 🟡 **High** (8): Significant design flaws affecting maintainability or API quality
- 🟠 **Medium** (5): Issues affecting developer experience or minor inconsistencies
- 🟢 **Low** (3): Minor improvements or optimization opportunities

---

## 🔴 Critical Issues

### 1. Schema Duplication (Maintenance Hazard)
**Severity**: 🔴 Critical
**Location**:
- `/schema.graphql` (root)
- `/packages/graphql-server/src/schema/typeDefs.ts`

**Issue**:
Two separate GraphQL schema files exist with nearly identical content. This creates a high risk of schema drift and inconsistencies.

**Evidence**:
```typescript
// typeDefs.ts (line 94)
updatedAt: String!

// schema.graphql (line 88) - MISSING updatedAt field!
// This proves the schemas are already drifting
```

**Impact**:
- Schema drift has already occurred (Profile type missing `updatedAt` in typeDefs.ts)
- Developers must remember to update both files
- Risk of runtime errors when schemas diverge
- CodeGen may use different schema than runtime

**Recommendation**:
Remove one schema file. Use single source of truth:
- Option A: Keep `typeDefs.ts`, delete `schema.graphql`
- Option B: Keep `schema.graphql`, import as string in typeDefs.ts

---

### 2. Missing Field Resolver (N+1 Risk)
**Severity**: 🔴 Critical
**Location**:
- Schema: `schema.graphql:118`
- Missing: `packages/graphql-server/src/schema/resolvers/Post.ts`

**Issue**:
The `Post` type defines a `comments` field that accepts pagination parameters, but there's NO field resolver implementation.

**Evidence**:
```graphql
# schema.graphql:118
type Post {
  # ... other fields
  comments(first: Int, after: String): CommentConnection!
}
```

```typescript
// Post.ts - NO comments resolver!
export const Post: PostResolvers = {
  author: async (parent, _args, context) => { /* ... */ },
  isLiked: async (parent, _args, context) => { /* ... */ },
  // ❌ Missing: comments resolver
};
```

**Impact**:
- If this field is ever queried, it will return undefined or cause runtime errors
- Cannot query comments nested under posts
- Potential N+1 problem if resolver is added without DataLoader

**Recommendation**:
Either:
1. Implement the field resolver with proper DataLoader batching
2. Remove the field from the schema if not used

---

### 3. Broken Logout Implementation
**Severity**: 🔴 Critical
**Location**: `packages/graphql-server/src/schema/resolvers/Mutation.ts:461-478`

**Issue**:
The `logout` mutation doesn't accept or use a refresh token, making it impossible to actually invalidate the token.

**Evidence**:
```typescript
// Mutation.ts:461
logout: async (_parent, _args, context) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // ❌ Note: The auth service logout expects (refreshToken, userId)
  // ❌ But we don't have refreshToken in the mutation args
  // ❌ We'll make it idempotent - always return success

  return { success: true }; // Does nothing!
}
```

```graphql
# schema.graphql:38
logout: LogoutResponse!  # ❌ No refreshToken parameter!
```

**Impact**:
- Logout doesn't actually invalidate refresh tokens
- Security vulnerability: old tokens remain valid
- Users cannot properly sign out

**Recommendation**:
Add refreshToken parameter to logout mutation:
```graphql
logout(refreshToken: String!): LogoutResponse!
```

---

### 4. Type Mismatch Architecture Issues
**Severity**: 🔴 Critical
**Location**: Multiple locations in `Mutation.ts`

**Issue**:
Multiple `@ts-ignore` comments suppress TypeScript errors caused by mismatches between DAL types and GraphQL types.

**Evidence**:
```typescript
// Mutation.ts:563
// @ts-ignore - DAL Notification type differs from GraphQL Notification type
markNotificationAsRead: async (_parent, args, context) => { /* ... */ }

// Mutation.ts:711
// @ts-ignore - DAL Auction type differs from GraphQL Auction type
createAuction: async (_parent, args, context) => { /* ... */ }

// Mutation.ts:770
// @ts-ignore - DAL Auction type differs from GraphQL Auction type
activateAuction: async (_parent, args, context) => { /* ... */ }
```

**Impact**:
- Type safety is compromised
- Runtime errors may occur when DAL types change
- No compiler protection against breaking changes
- Comments indicate architectural debt

**Recommendation**:
Create proper type adapters/transformers between DAL and GraphQL layers instead of suppressing type errors.

---

## 🟡 High Priority Issues

### 5. Inconsistent Pagination Patterns
**Severity**: 🟡 High
**Location**: `schema.graphql:413-416` vs other Connection types

**Issue**:
`BidConnection` uses a different pagination structure than all other connections in the schema.

**Evidence**:
```graphql
# Relay-style connections (consistent) ✅
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

# BidConnection (inconsistent) ❌
type BidConnection {
  bids: [Bid!]!      # Different structure!
  total: Int!        # Different fields!
}
```

**Impact**:
- Frontend code must handle two different pagination patterns
- Cannot reuse pagination components
- Violates Relay specification
- Confuses API consumers

**Recommendation**:
Refactor BidConnection to use standard Relay pattern:
```graphql
type BidConnection {
  edges: [BidEdge!]!
  pageInfo: PageInfo!
}

type BidEdge {
  cursor: String!
  node: Bid!
}
```

---

### 6. Mixed Pagination Parameters
**Severity**: 🟡 High
**Location**: `schema.graphql:18-20, 25-27`

**Issue**:
Feed queries accept BOTH legacy pagination parameters AND Relay parameters, creating confusion and ambiguity.

**Evidence**:
```graphql
# schema.graphql:18-20
feed(
  limit: Int,        # ❌ Legacy offset-based
  cursor: String,    # ❌ Legacy cursor
  first: Int,        # ✅ Relay standard
  after: String      # ✅ Relay standard
): FeedConnection!

exploreFeed(limit: Int, cursor: String, first: Int, after: String): PostConnection!
followingFeed(limit: Int, cursor: String, first: Int, after: String): PostConnection!
```

**Impact**:
- Unclear which parameters to use
- What happens if both are provided?
- Implementation must handle multiple code paths
- API documentation is confusing

**Recommendation**:
Remove legacy `limit` and `cursor` parameters, standardize on Relay `first` and `after`.

---

### 7. Scalar Type Misuse
**Severity**: 🟡 High
**Location**: Throughout schema (`schema.graphql`)

**Issue**:
Using primitive types (String, Float) for dates and currency instead of custom scalars.

**Evidence**:
```graphql
# Dates as String ❌
type Post {
  createdAt: String!
  updatedAt: String!
}

type Auction {
  startTime: String!
  endTime: String!
}

# Currency as Float ❌
type Auction {
  startPrice: Float!     # Money shouldn't use Float!
  reservePrice: Float
  currentPrice: Float!
}

type Bid {
  amount: Float!         # Money shouldn't use Float!
}
```

**Impact**:
- Dates: No type safety, can be any string format
- Currency: Float precision issues (e.g., $0.1 + $0.2 = $0.30000000000000004)
- Validation happens at runtime instead of schema level
- No client-side type coercion

**Recommendation**:
Define custom scalars:
```graphql
scalar DateTime
scalar Decimal

type Auction {
  startTime: DateTime!
  endTime: DateTime!
  startPrice: Decimal!
}
```

---

### 8. Missing Input Validation
**Severity**: 🟡 High
**Location**: Most mutations in `Mutation.ts`

**Issue**:
Only 2 out of 17 mutations use Zod validation (`createAuction`, `placeBid`). All others pass unvalidated input directly to services.

**Evidence**:
```typescript
// ✅ createAuction uses validation (line 720)
const validationResult = CreateAuctionRequestSchema.safeParse(args.input);

// ❌ createPost has NO validation (line 41)
createPost: async (_parent, args, context) => {
  // No validation! Direct pass to service
  const post = await context.services.postService.createPost(
    context.userId,
    userProfile.handle,
    {
      fileType: args.input.fileType as 'image/jpeg' | ...,  // Type assertion = danger!
      caption: args.input.caption ?? undefined,
    }
  );
}

// ❌ createComment has NO validation (line 220)
// ❌ updateProfile has NO validation (line 485)
// ❌ followUser has NO validation (line 179)
// etc...
```

**Impact**:
- Invalid data can reach services layer
- Business rules not enforced at GraphQL boundary
- Inconsistent error messages
- No standardized validation error format

**Recommendation**:
Create Zod schemas for ALL input types and validate in resolvers:
```typescript
const CreatePostInputSchema = z.object({
  fileType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  caption: z.string().max(2200).optional(),
});
```

---

### 9. Redundant Success Fields
**Severity**: 🟡 High
**Location**: `schema.graphql:292-311`

**Issue**:
Response types include `success: Boolean!` field which is redundant in GraphQL (errors are handled via error responses).

**Evidence**:
```graphql
# schema.graphql:292-311
type LikeResponse {
  success: Boolean!     # ❌ Redundant
  likesCount: Int!
  isLiked: Boolean!
}

type FollowResponse {
  success: Boolean!     # ❌ Redundant
  followersCount: Int!
  followingCount: Int!
  isFollowing: Boolean!
}

type DeleteResponse {
  success: Boolean!     # ❌ Redundant (only field!)
}
```

**Impact**:
- Violates GraphQL best practices
- Forces clients to check both success field AND errors
- Wastes bandwidth
- DeleteResponse becomes pointless (only has success field)

**Recommendation**:
Remove success fields. Use GraphQL errors for failures:
```graphql
type LikeResponse {
  likesCount: Int!
  isLiked: Boolean!
}

# For DeleteResponse, just return ID of deleted item
type DeletePayload {
  deletedId: ID!
}
```

---

### 10. Exposed Internal IDs
**Severity**: 🟡 High
**Location**: Throughout schema

**Issue**:
Exposing raw internal foreign key IDs alongside resolved objects creates unnecessary API surface.

**Evidence**:
```graphql
type Post {
  id: ID!
  userId: ID!          # ❌ Internal FK exposed
  author: PublicProfile!  # ✅ Already provides user data
  # ...
}

type Comment {
  id: ID!
  postId: ID!          # ❌ Internal FK exposed
  userId: ID!          # ❌ Internal FK exposed
  author: PublicProfile!  # ✅ Already provides user data
  # ...
}

type Notification {
  userId: ID!          # ❌ Internal FK exposed
  actor: NotificationActor  # ✅ Already provides actor data
  # ...
}
```

**Impact**:
- Clients might use internal IDs instead of resolved objects
- Exposes database structure
- Creates temptation to make additional queries with these IDs
- Violates GraphQL principle of fetching related data in one query

**Recommendation**:
Remove internal FK fields unless there's a specific use case:
```graphql
type Post {
  id: ID!
  # userId: ID!  # Remove this
  author: PublicProfile!
}
```

---

### 11. Missing Interface Usage
**Severity**: 🟡 High
**Location**: `schema.graphql:74-104`

**Issue**:
`Profile` and `PublicProfile` have significant field overlap but don't use GraphQL interfaces, leading to duplication.

**Evidence**:
```graphql
type Profile {
  id: ID!
  username: String!
  handle: String!
  fullName: String
  bio: String
  profilePictureUrl: String
  followersCount: Int!
  followingCount: Int!
  postsCount: Int!
  createdAt: String!
  # Plus: email, emailVerified, updatedAt
}

type PublicProfile {
  id: ID!
  username: String!     # Duplicated
  handle: String!       # Duplicated
  fullName: String      # Duplicated
  bio: String           # Duplicated
  profilePictureUrl: String  # Duplicated
  followersCount: Int!  # Duplicated
  followingCount: Int!  # Duplicated
  postsCount: Int!      # Duplicated
  createdAt: String!    # Duplicated
  # Plus: isFollowing
}
```

**Impact**:
- Schema duplication (8 duplicated fields)
- Cannot query common fields polymorphically
- Changes must be made in two places
- Harder to maintain consistency

**Recommendation**:
Use interfaces to reduce duplication:
```graphql
interface ProfileInterface {
  id: ID!
  username: String!
  handle: String!
  fullName: String
  bio: String
  profilePictureUrl: String
  followersCount: Int!
  followingCount: Int!
  postsCount: Int!
  createdAt: String!
}

type Profile implements ProfileInterface {
  # ... interface fields
  email: String!
  emailVerified: Boolean!
  updatedAt: String!
}

type PublicProfile implements ProfileInterface {
  # ... interface fields
  isFollowing: Boolean
}
```

---

### 12. Untyped String Enum
**Severity**: 🟡 High
**Location**: `schema.graphql:151`

**Issue**:
`NotificationTarget.type` uses `String!` instead of an enum, allowing arbitrary values.

**Evidence**:
```graphql
type NotificationTarget {
  type: String!     # ❌ Should be enum!
  id: ID!
  url: String
  preview: String
}

# Existing enums for reference:
enum NotificationType {
  LIKE
  COMMENT
  FOLLOW
  MENTION
  SYSTEM
}
```

**Impact**:
- No type safety for notification target types
- Runtime errors if invalid string is provided
- Cannot autocomplete in GraphQL clients
- Unclear what valid values are

**Recommendation**:
Create enum for target types:
```graphql
enum NotificationTargetType {
  POST
  COMMENT
  USER
  AUCTION
}

type NotificationTarget {
  type: NotificationTargetType!
}
```

---

## 🟠 Medium Priority Issues

### 13. Auth Check Duplication
**Severity**: 🟠 Medium
**Location**: Throughout `Mutation.ts`

**Issue**:
Every mutation manually checks authentication instead of using the available `withAuth` HOC.

**Evidence**:
```typescript
// Repeated in 13+ mutations:
if (!context.userId) {
  throw new GraphQLError('Authentication required', {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}

// Meanwhile, withAuth HOC exists but is only used for queries!
// packages/graphql-server/src/infrastructure/resolvers/withAuth.ts
export const withAuth = (resolver) => { /* ... */ };
```

**Impact**:
- Code duplication (50+ lines of repeated auth checks)
- Inconsistent error messages
- Easy to forget auth check when adding new mutations
- Harder to update auth logic globally

**Recommendation**:
Use `withAuth` wrapper for all mutations that require authentication:
```typescript
export const Mutation: MutationResolvers = {
  createPost: withAuth(async (_parent, args, context) => {
    // No manual auth check needed!
  }),
};
```

---

### 14. Repeated Profile Fetches
**Severity**: 🟠 Medium
**Location**: `Mutation.ts:49, 228`

**Issue**:
Multiple mutations fetch the user's profile just to get their handle, when this could be cached in context.

**Evidence**:
```typescript
// createPost (line 49)
const userProfile = await context.services.profileService.getProfileById(context.userId);
if (!userProfile) throw new GraphQLError('User profile not found', ...);

// createComment (line 228)
const profile = await context.services.profileService.getProfileById(context.userId);
if (!profile) throw new GraphQLError('User profile not found', ...);

// Both just need the handle field!
```

**Impact**:
- Unnecessary database queries
- Slower mutation response times
- Wasted DynamoDB read capacity

**Recommendation**:
Include user handle in GraphQL context during authentication:
```typescript
interface GraphQLContext {
  userId?: string;
  userHandle?: string;  // Add this
  // ...
}
```

---

### 15. Inconsistent Error Handling
**Severity**: 🟠 Medium
**Location**: Throughout `Mutation.ts`

**Issue**:
Some mutations use try-catch with specific error handling, others throw errors directly, creating inconsistent error responses.

**Evidence**:
```typescript
// login uses try-catch (line 331)
login: async (_parent, args, context) => {
  try {
    // ...
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid email')) {
      throw new GraphQLError(error.message, { extensions: { code: 'UNAUTHENTICATED' } });
    }
    throw new GraphQLError('Failed to login', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
  }
}

// createPost throws directly (line 43)
createPost: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('You must be authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  // ... no try-catch!
}

// deleteNotification has idempotent error handling (line 658)
deleteNotification: async (_parent, args, context) => {
  try {
    // ...
  } catch (error) {
    // For idempotent behavior, still return success for other errors
    return { success: true };  // ❌ Swallows errors!
  }
}
```

**Impact**:
- Unpredictable error responses
- Some errors leak implementation details
- Some errors are swallowed
- Harder to implement global error logging

**Recommendation**:
Standardize error handling with consistent patterns or error middleware.

---

### 16. Coupling to Database Implementation
**Severity**: 🟠 Medium
**Location**: `packages/graphql-server/src/resolvers/auction/bidsResolver.ts:27-30`

**Issue**:
Cursor encoding exposes DynamoDB partition key structure, coupling GraphQL API to database implementation.

**Evidence**:
```typescript
// bidsResolver.ts:27-30
return buildConnection({
  items: result.data.items,
  hasMore: result.data.hasMore,
  getCursorKeys: (bid) => ({
    PK: `AUCTION#${args.auctionId}`,  // ❌ Exposes DynamoDB key structure!
    SK: `BID#${bid.createdAt}#${bid.id}`,  // ❌ Exposes composite key format!
  }),
});
```

**Impact**:
- Cannot change database structure without breaking API
- Cursors contain implementation details
- Harder to migrate to different database
- Security risk: exposes internal data model

**Recommendation**:
Use opaque cursor encoding that doesn't expose database keys:
```typescript
getCursorKeys: (bid) => ({
  id: bid.id,
  createdAt: bid.createdAt,
  // Let CursorCodec handle encoding without exposing DB structure
})
```

---

### 17. Missing Total Count in Connections
**Severity**: 🟠 Medium
**Location**: All Connection types

**Issue**:
Connection types don't include total count fields, making it impossible to show "Showing X of Y results" UI.

**Evidence**:
```graphql
# Current PageInfo
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
  # ❌ Missing: totalCount field
}
```

**Impact**:
- Cannot show total results count in UI
- Cannot calculate "X of Y pages"
- Poor user experience for pagination
- Inconsistent with common GraphQL patterns

**Recommendation**:
Add optional totalCount to connections:
```graphql
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int  # Optional, may be expensive to compute
}
```

---

## 🟢 Low Priority Issues

### 18. Unused Input Field
**Severity**: 🟢 Low
**Location**:
- Schema: `schema.graphql:201` (typeDefs.ts:205)
- Mutation: `Mutation.ts:495`

**Issue**:
`UpdateProfileInput.displayName` is defined in schema but never used in the mutation implementation.

**Evidence**:
```graphql
# schema.graphql:199-208
input UpdateProfileInput {
  handle: String
  displayName: String    # ❌ Defined but unused!
  fullName: String
  bio: String
}
```

```typescript
// Mutation.ts:495
const updatedProfile = await context.services.profileService.updateProfile(
  context.userId,
  {
    handle: args.input.handle ?? undefined,
    fullName: args.input.fullName ?? undefined,
    bio: args.input.bio ?? undefined,
    // ❌ displayName is ignored!
  }
);
```

**Impact**:
- API promises a feature that doesn't work
- Confuses API consumers
- Dead code in schema

**Recommendation**:
Either implement displayName support or remove it from UpdateProfileInput.

---

### 19. Overly Permissive Nullable Fields
**Severity**: 🟢 Low
**Location**: Various types in schema

**Issue**:
Some ID fields are nullable when they could be non-nullable based on business logic.

**Evidence**:
```graphql
type Auction {
  winnerId: ID       # Nullable - OK when auction is active
  winner: PublicProfile  # But winner field is also nullable!
  # If winnerId exists, winner should too
}

type PublicProfile {
  isFollowing: Boolean  # Should this be nullable?
  # If checking follow status, should always return true/false
}
```

**Impact**:
- Forces clients to handle more null cases
- Unclear when nulls are expected
- May hide bugs

**Recommendation**:
Review nullable fields and make non-nullable where possible. Consider using unions for states:
```graphql
union AuctionWinner = NoWinner | WinnerInfo

type WinnerInfo {
  winnerId: ID!
  winner: PublicProfile!
}
```

---

### 20. Missing Subscription Support
**Severity**: 🟢 Low
**Location**: Schema (no subscriptions defined)

**Issue**:
Real-time features (notifications, auction bids, likes) would benefit from GraphQL subscriptions but none are implemented.

**Evidence**:
```graphql
# Only Query and Mutation roots exist
type Query { ... }
type Mutation { ... }

# ❌ No Subscription root!
# type Subscription { ... }
```

**Impact**:
- Clients must poll for real-time updates
- Higher server load from polling
- Worse user experience (delays)
- Wasted bandwidth

**Recommendation**:
Consider adding subscriptions for real-time features:
```graphql
type Subscription {
  notificationReceived(userId: ID!): Notification!
  bidPlaced(auctionId: ID!): Bid!
  postLiked(postId: ID!): LikeEvent!
}
```

---

## Summary Statistics

| Severity | Count | Percentage |
|----------|-------|------------|
| 🔴 Critical | 4 | 20% |
| 🟡 High | 8 | 40% |
| 🟠 Medium | 5 | 25% |
| 🟢 Low | 3 | 15% |
| **Total** | **20** | **100%** |

---

## Positive Patterns Found ✅

Despite the anti-patterns, the codebase demonstrates several **best practices**:

1. ✅ **DataLoaders Implemented**: Proper N+1 prevention with batching and caching
2. ✅ **Cursor Pagination**: Relay-style pagination (mostly) implemented correctly
3. ✅ **Query Depth Limiting**: Max depth of 7 to prevent DoS attacks
4. ✅ **Clean Architecture**: Clear separation of concerns with hexagonal architecture
5. ✅ **Type Safety**: GraphQL CodeGen for type-safe resolvers
6. ✅ **Authentication Guards**: `withAuth` HOC pattern exists (though underutilized)
7. ✅ **Error Codes**: Standardized error codes (UNAUTHENTICATED, NOT_FOUND, etc.)
8. ✅ **Input Types**: Proper use of input types vs inline arguments
9. ✅ **Comprehensive Testing**: Good test coverage for resolvers
10. ✅ **Connection Types**: Properly structured for most queries

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Week 1)
1. Fix schema duplication - choose single source of truth
2. Implement or remove Post.comments field resolver
3. Fix logout mutation to accept and use refresh token
4. Create type adapters to remove @ts-ignore comments

### Phase 2: High Priority (Weeks 2-3)
5. Standardize pagination (remove BidConnection inconsistency)
6. Remove mixed pagination parameters from feed queries
7. Implement custom DateTime and Decimal scalars
8. Add Zod validation to all mutations
9. Remove redundant success fields from response types
10. Review and remove unnecessary exposed internal IDs
11. Refactor Profile/PublicProfile to use interfaces
12. Add NotificationTargetType enum

### Phase 3: Medium Priority (Week 4)
13. Apply withAuth HOC to all authenticated mutations
14. Add userHandle to GraphQL context to avoid repeated fetches
15. Standardize error handling patterns
16. Abstract cursor encoding to hide database structure
17. Add optional totalCount to connection types

### Phase 4: Low Priority (Future)
18. Remove or implement displayName field
19. Review and tighten nullable field definitions
20. Consider implementing GraphQL subscriptions for real-time features

---

## Conclusion

The GraphQL implementation shows a solid foundation with good performance practices (DataLoaders, pagination) and architecture (clean architecture, DI). However, schema design inconsistencies, validation gaps, and maintenance issues (schema duplication) require attention. Addressing the 4 critical issues and 8 high-priority issues will significantly improve API quality, maintainability, and developer experience.

**Estimated Effort**: 3-4 weeks for Phases 1-3 (critical through medium priority issues)
