# Profile Entity Cleanup Analysis & Plan

**Date**: 2025-10-25
**Status**: Planning Phase
**Goal**: Clean up schema drift and establish clear domain boundaries for User/Profile entities

---

## 🔍 **CURRENT STATE ANALYSIS**

### **Problem 1: Profile has both `id` and `userId` (Redundant)**

**Evidence:**
1. **GraphQL Schema** (`typeDefs.ts` lines 78-92):
   ```graphql
   type Profile {
     id: ID!           # ← This is userId
     handle: String!
     username: String!
     email: String!
     # ... profile fields
   }
   ```

2. **GraphQL Operations** (`profiles.ts` lines 12-24):
   ```graphql
   query GetProfileByHandle($handle: String!) {
     profile(handle: $handle) {
       id        # ← Returns userId
       userId    # ← Also returns userId (DUPLICATE!)
       handle
       # ...
     }
   }
   ```

3. **Frontend Service** (`ProfileService.graphql.ts` lines 60-85):
   ```typescript
   function transformGraphQLProfile(graphqlProfile: {
     id: string;        // ← userId from GraphQL
     userId: string;    // ← Also userId (redundant!)
     // ...
   }): Profile {
     return {
       id: graphqlProfile.id,       // ← Setting both
       userId: graphqlProfile.userId, // ← is redundant
       // ...
     };
   }
   ```

4. **Shared Schema** (`profile.schema.ts` lines 36):
   ```typescript
   export const ProfileSchema = UserSchema.merge(ProfileDataSchema);
   // This merges User (which has id) with ProfileData
   // Result: Profile has id from User
   ```

**Root Cause:** Profile is conceptually "User + presentation data", not a separate entity with its own ID. The `id` field in Profile **IS** the user ID, so having both is redundant.

---

### **Problem 2: Inconsistent Entity Boundaries**

**User vs Profile Confusion:**

**DynamoDB Entity** (`user-profile.entity.ts`):
- Single unified entity: `UserProfileEntity`
- PK: `USER#<userId>`, SK: `PROFILE`
- Contains: Identity (email, password) + Profile (handle, bio, counts)
- **Correctly models**: One record per user in DynamoDB

**Domain Schemas** (`user.schema.ts` + `profile.schema.ts`):
- `User`: Identity-only (id, email, username, emailVerified, timestamps)
- `ProfileData`: Presentation-only (handle, bio, counts)
- `Profile` = `User.merge(ProfileData)` ← Composition pattern

**GraphQL Schema** (`typeDefs.ts`):
- Exposes only `Profile` type, not separate `User`
- Profile includes auth fields (email) that shouldn't be public

---

### **Problem 3: Schema Evolution Drift**

**Different layers define Profile differently:**

| Layer | Has `id`? | Has `userId`? | Has `username`? | Has `email`? | Has `displayName`? |
|-------|-----------|---------------|-----------------|--------------|-------------------|
| **DynamoDB Entity** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Shared `Profile` schema** | ✅ (from User) | ❌ | ✅ (from User) | ✅ (from User) | ❌ |
| **Shared `PublicProfile` schema** | ✅ | ❌ | ✅ | ❌ (excluded) | ❌ |
| **GraphQL `Profile` type** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **GraphQL Operations** | ✅ | ✅ (added!) | ❌ (not queried) | ❌ (not queried) | ❌ (not queried) |
| **Frontend `ProfileService.graphql.ts`** | ✅ | ✅ (kept!) | ❌ | ❌ | ❌ |

**Notice:**
- GraphQL operations **add** `userId` field that doesn't exist in GraphQL schema
- GraphQL schema has `displayName` field that isn't used anywhere
- Frontend uses `userId` but shared schema doesn't define it on Profile

---

### **Problem 4: `username` vs `handle` Confusion**

**Current State:**
- **`username`**: Identity field (login, unique, from User domain)
- **`handle`**: Public display name (optional, can match username, from Profile domain)
- **Fallback logic**: `handle || username` (in mappers)

**Issues:**
1. GraphQL schema exposes both, but clients don't know which to use
2. DAL entity stores both, but handle is optional
3. If handle is not set, should clients use username or error?
4. Frontend queries both but only uses one

---

## 📐 **CORRECT DOMAIN MODEL (Based on SKILL.md Principles)**

Using **TypeScript Advanced Types** principles from SKILL.md:

### **1. Core Entities (Single Source of Truth)**

```typescript
/**
 * User - Identity & Authentication Domain
 * Represents the authenticated user account
 */
export interface User {
  id: string;              // UUID - THE identity
  email: string;           // For login
  username: string;        // Unique handle for @ mentions
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ProfileData - Presentation Domain
 * Public-facing profile information
 */
export interface ProfileData {
  handle: string;          // Public display handle (defaults to username)
  fullName?: string;       // Display name
  bio?: string;
  profilePictureUrl?: string;
  profilePictureThumbnailUrl?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

/**
 * Profile - Complete user profile for logged-in user
 * Uses TypeScript intersection for composition
 */
export type Profile = User & ProfileData;

/**
 * PublicProfile - Public-facing profile (no sensitive data)
 * Uses Pick and Omit utility types
 */
export type PublicProfile = Omit<Profile, 'email' | 'emailVerified' | 'updatedAt'>;
```

**Why this is correct:**
- ✅ User has only **one** identifier: `id`
- ✅ Profile doesn't need separate `userId` - it **IS** a User + ProfileData
- ✅ Clear domain boundaries (User = identity, ProfileData = presentation)
- ✅ Type composition via intersection (&) - from SKILL.md Section 1
- ✅ PublicProfile uses Omit utility type - from SKILL.md Section 5

---

### **2. GraphQL Schema (Aligned with Domain Model)**

```graphql
# User type - for authentication responses only
type User {
  id: ID!
  email: String!
  username: String!
  emailVerified: Boolean!
  createdAt: String!
}

# Profile type - complete profile for logged-in user
type Profile {
  # Identity (from User)
  id: ID!              # User ID - THE identifier
  username: String!    # Login username
  email: String!       # Only exposed for own profile
  emailVerified: Boolean!

  # Presentation (from ProfileData)
  handle: String!      # Public handle (defaults to username)
  fullName: String
  bio: String
  profilePictureUrl: String

  # Stats (from ProfileData)
  postsCount: Int!
  followersCount: Int!
  followingCount: Int!

  # Contextual field (resolved)
  isFollowing: Boolean  # Only for other users' profiles

  # Timestamps
  createdAt: String!
}

# PublicProfile - for viewing other users
type PublicProfile {
  id: ID!              # User ID
  username: String!    # For @ mentions
  handle: String!      # Public display
  fullName: String
  bio: String
  profilePictureUrl: String
  postsCount: Int!
  followersCount: Int!
  followingCount: Int!
  isFollowing: Boolean # Whether current user follows this profile
  createdAt: String!
}

type Query {
  me: Profile!                              # Returns full Profile
  profile(handle: String!): PublicProfile   # Returns PublicProfile
}
```

**Key Changes:**
- ❌ **Remove** `userId` field (redundant with `id`)
- ❌ **Remove** `displayName` field (unused, use `fullName`)
- ✅ `Profile` includes `email` (for own profile only)
- ✅ `PublicProfile` excludes `email` (for other users)
- ✅ Clear separation: me() → Profile, profile() → PublicProfile

---

### **3. DynamoDB Structure (No Changes Needed)**

**Current structure is CORRECT:**

```typescript
interface UserProfileEntity {
  // Keys
  PK: 'USER#<userId>';
  SK: 'PROFILE';

  // User fields
  id: string;       // ← This IS the user ID
  email: string;
  username: string;

  // Profile fields
  handle?: string;
  fullName?: string;
  bio?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

**Why it's correct:**
- Single record per user (DynamoDB best practice)
- PK contains userId
- Entity has `id` field (userId)
- No redundant `userId` field

---

## 🛠️ **CLEANUP PLAN**

### **Phase 1: Update Shared Schemas (Foundation)**

**File:** `/packages/shared/src/schemas/profile.schema.ts`

**Changes:**
1. Keep current User/ProfileData separation
2. ❌ Remove any `userId` references
3. ✅ Ensure Profile = User & ProfileData (intersection)
4. ✅ Ensure PublicProfile excludes sensitive fields

```typescript
// Current (CORRECT - keep this):
export const ProfileSchema = UserSchema.merge(ProfileDataSchema);
export type Profile = z.infer<typeof ProfileSchema>;

// PublicProfile - ensure no email/emailVerified
export const PublicProfileSchema = ProfileSchema.pick({
  id: true,           // User ID
  username: true,
  handle: true,
  fullName: true,
  bio: true,
  profilePictureUrl: true,
  profilePictureThumbnailUrl: true,
  postsCount: true,
  followersCount: true,
  followingCount: true,
  createdAt: true
}).extend({
  isFollowing: z.boolean().optional()
});
```

---

### **Phase 2: Update GraphQL Schema (See JWT_GRAPHQL_AUTH_GUIDE.md for details)**

**File:** `/packages/graphql-server/src/schema/typeDefs.ts`

**Changes:**
1. ❌ Remove `displayName` field (unused)
2. Split Profile into two types: `Profile` (authenticated) and `PublicProfile` (public)
3. Update queries to return correct type

```graphql
type Profile {
  id: ID!              # User ID (not userId!)
  username: String!
  email: String!       # Only for authenticated user
  emailVerified: Boolean!
  handle: String!
  fullName: String
  bio: String
  profilePictureUrl: String
  postsCount: Int!
  followersCount: Int!
  followingCount: Int!
  createdAt: String!
}

type PublicProfile {
  id: ID!              # User ID
  username: String!
  handle: String!
  fullName: String
  bio: String
  profilePictureUrl: String
  postsCount: Int!
  followersCount: Int!
  followingCount: Int!
  isFollowing: Boolean
  createdAt: String!
}

type Query {
  me: Profile!
  profile(handle: String!): PublicProfile  # Changed return type
}
```

---

### **Phase 3: Update GraphQL Operations (Frontend)**

**File:** `/packages/frontend/src/graphql/operations/profiles.ts`

**Changes:**
1. ❌ Remove `userId` from queries
2. Use `id` consistently

```typescript
export const GET_PROFILE_BY_HANDLE_QUERY = `
  query GetProfileByHandle($handle: String!) {
    profile(handle: $handle) {
      id              # ← User ID (not userId!)
      username
      handle
      fullName
      bio
      profilePictureUrl
      followersCount
      followingCount
      postsCount
      isFollowing
      createdAt
    }
  }
`;

// Response type
export interface GetProfileByHandleResponse {
  profile: {
    id: string;        // ← User ID
    username: string;
    handle: string;
    // ... NO userId field
  };
}
```

---

### **Phase 4: Update Frontend Service**

**File:** `/packages/frontend/src/services/implementations/ProfileService.graphql.ts`

**Changes:**
1. ❌ Remove `userId` from transform function
2. Map `id` → `id` (it's the user ID)

```typescript
function transformGraphQLProfile(graphqlProfile: {
  id: string;        // ← This IS userId, no separate userId field
  username: string;
  handle: string;
  fullName: string | null;
  bio: string | null;
  profilePictureUrl: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean | null;
  createdAt: string;
}): Profile {
  return {
    id: graphqlProfile.id,  // ← User ID
    username: graphqlProfile.username,
    handle: graphqlProfile.handle,
    fullName: graphqlProfile.fullName ?? undefined,
    bio: graphqlProfile.bio ?? undefined,
    profilePictureUrl: graphqlProfile.profilePictureUrl ?? undefined,
    followersCount: graphqlProfile.followersCount,
    followingCount: graphqlProfile.followingCount,
    postsCount: graphqlProfile.postsCount,
    isFollowing: graphqlProfile.isFollowing ?? undefined,
    createdAt: graphqlProfile.createdAt,
  };
}
```

---

### **Phase 5: Update Related Types (Auction, Post, etc.)**

**Files:** Anywhere Profile is referenced

**Check:**
- Auction seller/winner: Use `Profile` or `PublicProfile`?
- Post author: Should be `PublicProfile` (no email needed)
- Comment author: Should be `PublicProfile`

**Example - Auction types:**
```typescript
interface Auction {
  id: string;
  userId: string;        // ← Keep this (FK to user)
  seller: PublicProfile; // ← Use PublicProfile (no email)
  winnerId: string | null;
  winner: PublicProfile | null;
  // ...
}
```

**Key Decision:** When to use `userId` as FK:
- ✅ Use `userId` as **foreign key** in other entities (Auction, Post, etc.)
- ❌ DON'T use `userId` as field in Profile itself

---

## 🎯 **IMPLEMENTATION CHECKLIST**

### **Pre-flight Checks**
- [ ] Read SKILL.md principles (Discriminated Unions, Utility Types)
- [ ] Review all files using `Profile` type
- [ ] Identify all `userId` references in frontend
- [ ] Identify all GraphQL queries fetching Profile

### **Phase 1: Shared Schemas**
- [ ] Update `/packages/shared/src/schemas/profile.schema.ts`
  - [ ] Remove any `userId` definitions
  - [ ] Ensure Profile = User & ProfileData
  - [ ] Ensure PublicProfile excludes email/emailVerified
- [ ] Run tests: `pnpm --filter @social-media-app/shared test`

### **Phase 2: GraphQL Schema**
- [ ] Update `/packages/graphql-server/src/schema/typeDefs.ts`
  - [ ] Remove `displayName` field
  - [ ] Remove `userId` field from Profile type
  - [ ] Split Profile into Profile (auth) and PublicProfile (public)
- [ ] Update `/packages/graphql-server/src/schema/resolvers/Query.ts`
  - [ ] Change profile() return type to PublicProfile
- [ ] Run tests: `pnpm --filter @social-media-app/graphql-server test`

### **Phase 3: Frontend GraphQL Operations**
- [ ] Update `/packages/frontend/src/graphql/operations/profiles.ts`
  - [ ] Remove `userId` from queries
  - [ ] Remove `userId` from response types
- [ ] Run tests: `pnpm --filter @social-media-app/frontend test`

### **Phase 4: Frontend Service**
- [ ] Update `/packages/frontend/src/services/implementations/ProfileService.graphql.ts`
  - [ ] Remove `userId` from transform function
  - [ ] Update mapper to use `id` only
- [ ] Update `/packages/frontend/src/services/interfaces/IProfileService.ts`
  - [ ] Ensure return types use Profile or PublicProfile correctly
- [ ] Run tests: `pnpm --filter @social-media-app/frontend test`

### **Phase 5: Related Entities**
- [ ] Search for all `userId` references in frontend
- [ ] Update Auction/Post/Comment types to:
  - [ ] Keep `userId` as FK
  - [ ] Use `PublicProfile` for author/seller/bidder
- [ ] Run full test suite: `pnpm test`

### **Phase 6: Validation**
- [ ] Run `pnpm dev` and test locally
- [ ] Test profile page load
- [ ] Test auction seller profile display
- [ ] Test post author profile display
- [ ] Run lint/typecheck: `pnpm typecheck && pnpm lint`

---

## 📊 **RISK ASSESSMENT**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking GraphQL clients | High | High | Test with frontend first, deploy together |
| Missing userId FK references | Medium | High | Search codebase for `userId` usage |
| DynamoDB query breaks | Low | Critical | DAL layer unchanged, safe |
| Frontend component breaks | Medium | High | Full test suite + manual testing |
| JWT auth token issues | Low | High | See JWT_GRAPHQL_AUTH_GUIDE.md |

---

## 🔑 **KEY INSIGHTS FROM SKILL.md**

1. **Use Discriminated Unions** (Section 6, Pattern 6):
   ```typescript
   type ProfileState =
     | { status: 'loading' }
     | { status: 'authenticated'; profile: Profile }
     | { status: 'public'; profile: PublicProfile }
     | { status: 'error'; error: Error };
   ```

2. **Use Utility Types** (Section 5):
   ```typescript
   type PublicProfile = Omit<Profile, 'email' | 'emailVerified'>;
   ```

3. **Type Guards** (Section 9.2):
   ```typescript
   function isAuthenticatedProfile(profile: Profile | PublicProfile): profile is Profile {
     return 'email' in profile;
   }
   ```

---

## 🎓 **SUMMARY**

**Problem:** Profile has redundant `id` + `userId`, causing confusion and drift across layers.

**Solution:** Recognize that Profile IS a User (identity) + ProfileData (presentation). The `id` field IS the user ID.

**Changes:**
1. Remove `userId` from Profile type everywhere
2. Keep `userId` as FK in other entities (Auction, Post, etc.)
3. Split GraphQL into Profile (auth) and PublicProfile (public)
4. Use TypeScript utility types for composition

**Result:** Clean domain boundaries, single source of truth, no redundancy.

---

## 📚 **RELATED DOCUMENTATION**

- `JWT_GRAPHQL_AUTH_GUIDE.md` - Detailed guide on JWT authentication with GraphQL (Phase 2)
- `SKILL.md` - TypeScript advanced types reference
- `GRAPHQL_MIGRATION_PLAN.md` - Overall GraphQL migration strategy
