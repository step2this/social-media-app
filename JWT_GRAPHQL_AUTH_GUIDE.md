# JWT Authentication with GraphQL: Complete Architecture Guide

**Date**: 2025-10-25
**Context**: Phase 2 of Profile Entity Cleanup - GraphQL Schema Changes
**Status**: Planning Phase
**Goal**: Understand how JWT tokens work with GraphQL and implications of Profile/PublicProfile split

---

## 🎯 **EXECUTIVE SUMMARY**

**Your Current Architecture:**
- ✅ **REST Auth Endpoints**: `/auth/login`, `/auth/register`, `/auth/refresh` (working)
- ✅ **JWT Tokens**: Access tokens (short-lived) + Refresh tokens (long-lived)
- ✅ **Token Storage**: Frontend stores in memory (secure)
- ✅ **GraphQL Queries**: Protected by JWT via HTTP Authorization header
- ❌ **No GraphQL Auth Mutations**: Login/register still use REST (CORRECT approach)

**Good News:** Your JWT architecture is solid! You DON'T need to migrate auth to GraphQL.

**What Changes in Phase 2:**
1. Split `Profile` type into `Profile` (authenticated) and `PublicProfile` (public)
2. GraphQL resolvers use JWT `userId` from context to determine which type to return
3. No changes to JWT flow, token generation, or storage

---

## 🏗️ **CURRENT JWT ARCHITECTURE (Analysis)**

### **1. Authentication Flow (REST - Keep This!)**

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ 1. POST /auth/login
       │    { email, password }
       ▼
┌─────────────────────────────────┐
│   Backend API Gateway           │
│   (REST endpoint)               │
│                                 │
│   POST /auth/login              │
│   ├─ Validate credentials       │
│   ├─ Generate Access Token      │
│   │   (JWT, 15 min expiry)      │
│   └─ Generate Refresh Token     │
│       (JWT, 7 day expiry)       │
└──────┬──────────────────────────┘
       │ 2. Returns:
       │    {
       │      accessToken: "eyJhbG...",
       │      refreshToken: "eyJhbG...",
       │      expiresIn: 900,
       │      user: { id, email, username }
       │    }
       ▼
┌─────────────┐
│   Browser   │
│             │
│ Stores:     │
│ • accessToken (memory)          │
│ • refreshToken (memory)         │
│ • user (Zustand store)          │
└─────────────┘
```

**Why REST for Auth?**
- ✅ Standard practice (OAuth, Auth0, Cognito all use REST)
- ✅ Token generation is stateless operation, doesn't need GraphQL flexibility
- ✅ Avoids exposing credentials in GraphQL logs
- ✅ Separates concerns: Auth = REST, Data = GraphQL

---

### **2. GraphQL Request Flow (With JWT)**

```
┌─────────────┐
│   Browser   │
│             │
│ Has: accessToken = "eyJhbG..."
└──────┬──────┘
       │ 3. GraphQL Query with Authorization header
       │
       │    POST /graphql
       │    Headers: {
       │      Authorization: "Bearer eyJhbG...",
       │      Content-Type: "application/json"
       │    }
       │    Body: {
       │      query: "query { me { id email handle } }"
       │    }
       ▼
┌────────────────────────────────────────────────┐
│   GraphQL Server                               │
│                                                │
│   1. Middleware: Extract JWT from header      │
│      const token = req.headers.authorization  │
│                                                │
│   2. Verify JWT signature                     │
│      jwt.verify(token, SECRET_KEY)            │
│                                                │
│   3. Decode JWT payload                       │
│      {                                         │
│        userId: "abc-123",                     │
│        email: "user@example.com",             │
│        iat: 1698765432,                       │
│        exp: 1698766332                        │
│      }                                         │
│                                                │
│   4. Create GraphQL Context                   │
│      context = {                              │
│        userId: "abc-123",   ← From JWT        │
│        services: { ... }    ← DI services     │
│      }                                         │
│                                                │
│   5. Execute Resolver                         │
│      Query.me(parent, args, context) {        │
│        return context.services.profileService │
│          .getProfileById(context.userId)      │
│      }                                         │
└────────────────┬───────────────────────────────┘
                 │ 4. Returns:
                 │    {
                 │      data: {
                 │        me: {
                 │          id: "abc-123",
                 │          email: "user@example.com",
                 │          handle: "johndoe"
                 │        }
                 │      }
                 │    }
                 ▼
        ┌─────────────┐
        │   Browser   │
        │             │
        │ Receives    │
        │ user profile│
        └─────────────┘
```

**Key Points:**
- JWT is verified ONCE at GraphQL entry (middleware)
- `userId` extracted from JWT is available in ALL resolvers via `context`
- No need to pass `userId` as query argument - it's implicit from auth

---

### **3. Token Refresh Flow (REST - Keep This!)**

```
┌─────────────┐
│   Browser   │
│             │
│ Access token expired (15 min)
│ Has: refreshToken = "eyJhbG..."
└──────┬──────┘
       │ 5. POST /auth/refresh
       │    { refreshToken: "eyJhbG..." }
       ▼
┌─────────────────────────────────┐
│   Backend API Gateway           │
│                                 │
│   POST /auth/refresh            │
│   ├─ Verify refresh token       │
│   ├─ Check not revoked          │
│   ├─ Generate new Access Token  │
│   └─ Generate new Refresh Token │
└──────┬──────────────────────────┘
       │ 6. Returns new tokens
       ▼
┌─────────────┐
│   Browser   │
│             │
│ Updates:    │
│ • accessToken (new)             │
│ • refreshToken (new)            │
└─────────────┘
```

**Why REST for Refresh?**
- ✅ Refresh happens in background (interceptors)
- ✅ Doesn't compete with GraphQL requests
- ✅ Standard OAuth flow

---

## 🔐 **JWT TOKEN STRUCTURE**

### **Access Token Payload**

```typescript
interface AccessTokenPayload {
  // Standard JWT claims
  sub: string;        // Subject (userId) - standard JWT field
  iat: number;        // Issued at (timestamp)
  exp: number;        // Expiration (timestamp)

  // Custom claims (your app-specific data)
  userId: string;     // User ID (same as sub, for convenience)
  email: string;      // User email
  username: string;   // User username

  // Optional: Role-based access control
  roles?: string[];   // e.g., ["user", "admin"]
}
```

**Example Decoded Access Token:**
```json
{
  "sub": "abc-123-def-456",
  "userId": "abc-123-def-456",
  "email": "john@example.com",
  "username": "johndoe",
  "iat": 1698765432,
  "exp": 1698766332
}
```

**Why Include userId/email in Token?**
- ✅ Resolvers can access user info without database lookup
- ✅ Fast authorization checks (no DB query needed)
- ❌ Token size increases (but still under 1KB)

---

### **Refresh Token Payload**

```typescript
interface RefreshTokenPayload {
  sub: string;        // Subject (userId)
  iat: number;        // Issued at
  exp: number;        // Expiration (7 days)
  tokenFamily?: string; // Token rotation tracking
}
```

**Why Minimal Payload?**
- ✅ Refresh tokens are longer-lived, minimize data exposure
- ✅ Only need userId to generate new access token

---

## 🎭 **PHASE 2: PROFILE/PUBLICPROFILE SPLIT WITH JWT**

### **Before (Current State)**

```graphql
type Profile {
  id: ID!
  handle: String!
  email: String!       # ← Exposed to everyone!
  # ...
}

type Query {
  me: Profile!
  profile(handle: String!): Profile  # ← Returns same type!
}
```

**Problem:** When you query `profile(handle: "alice")`, you get Alice's email (privacy leak!)

---

### **After (Phase 2 - Secure)**

```graphql
type Profile {
  id: ID!
  username: String!
  email: String!       # ← Only for authenticated user viewing own profile
  handle: String!
  # ...
}

type PublicProfile {
  id: ID!
  username: String!
  handle: String!      # ← No email field
  # ...
}

type Query {
  me: Profile!                              # Authenticated user's own profile
  profile(handle: String!): PublicProfile   # Someone else's public profile
}
```

**How JWT Enables This:**

```typescript
// Query.me resolver
me: async (parent, args, context) => {
  // JWT middleware already verified token
  // context.userId is populated from JWT payload

  if (!context.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }

  // Get full profile (with email)
  const profile = await context.services.profileService
    .getProfileById(context.userId);

  return profile; // Returns Profile type (with email)
}

// Query.profile resolver
profile: async (parent, { handle }, context) => {
  // No authentication required
  // Returns PublicProfile (no email)

  const publicProfile = await context.services.profileService
    .getProfileByHandle(handle);

  if (!publicProfile) {
    throw new GraphQLError('Profile not found', {
      extensions: { code: 'NOT_FOUND' }
    });
  }

  return publicProfile; // Returns PublicProfile type (no email)
}
```

**Key Insight:** JWT `userId` determines which profile type to return:
- `me()`: Uses `context.userId` from JWT → Returns `Profile` (with email)
- `profile(handle)`: Ignores JWT → Returns `PublicProfile` (no email)

---

## 🔒 **SECURITY ARCHITECTURE**

### **1. Authentication vs Authorization**

**Authentication**: "Who are you?" (JWT verification)
```typescript
// Middleware (runs before resolvers)
const token = req.headers.authorization?.replace('Bearer ', '');
const decoded = jwt.verify(token, SECRET_KEY);
context.userId = decoded.userId;  // Identity established
```

**Authorization**: "What can you do?" (Resolver logic)
```typescript
// Resolver
updateProfile: async (parent, { input }, context) => {
  // Check if authenticated
  if (!context.userId) {
    throw new GraphQLError('Must be logged in');
  }

  // Check if user can modify this profile
  if (context.userId !== input.userId) {
    throw new GraphQLError('Can only update your own profile');
  }

  // Authorized - proceed
  return context.services.profileService.updateProfile(context.userId, input);
}
```

---

### **2. Three Levels of Access Control**

```typescript
// Level 1: Public (no JWT required)
type Query {
  profile(handle: String!): PublicProfile  # Anyone can view
  auctions: [Auction!]!                    # Anyone can browse
}

// Level 2: Authenticated (JWT required, any user)
type Query {
  me: Profile!                             # Must be logged in
  myAuctions: [Auction!]!                  # Must be logged in
}

// Level 3: Authorized (JWT required, specific user)
type Mutation {
  updateProfile(input: UpdateProfileInput!): Profile!  # Own profile only
  deletePost(id: ID!): Boolean!                        # Own post only
}
```

**Implementation:**

```typescript
// Level 1: Public - No check
profile: async (parent, { handle }, context) => {
  return context.services.profileService.getProfileByHandle(handle);
}

// Level 2: Authenticated - Check userId exists
me: async (parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
  return context.services.profileService.getProfileById(context.userId);
}

// Level 3: Authorized - Check ownership
deletePost: async (parent, { id }, context) => {
  if (!context.userId) {
    throw new GraphQLError('Not authenticated');
  }

  const post = await context.services.postService.getPostById(id);

  if (post.userId !== context.userId) {
    throw new GraphQLError('Not authorized to delete this post', {
      extensions: { code: 'FORBIDDEN' }
    });
  }

  await context.services.postService.deletePost(id);
  return true;
}
```

---

## 🛠️ **IMPLEMENTATION GUIDE FOR PHASE 2**

### **Step 1: Update GraphQL Schema**

**File:** `/packages/graphql-server/src/schema/typeDefs.ts`

```graphql
# NEW: Profile type (authenticated user's own profile)
type Profile {
  id: ID!
  username: String!
  email: String!         # ← Only for own profile
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

# NEW: PublicProfile type (viewing other users)
type PublicProfile {
  id: ID!
  username: String!
  handle: String!
  fullName: String
  bio: String
  profilePictureUrl: String
  postsCount: Int!
  followersCount: Int!
  followingCount: Int!
  isFollowing: Boolean   # ← Contextual field
  createdAt: String!
}

type Query {
  me: Profile!                              # ← Returns Profile (with email)
  profile(handle: String!): PublicProfile   # ← Returns PublicProfile (no email)
}

type Mutation {
  updateProfile(input: UpdateProfileInput!): Profile!  # ← Returns Profile
}
```

**Changes:**
- ❌ Remove `displayName` field (unused)
- ✅ Split into `Profile` (auth) and `PublicProfile` (public)
- ✅ `me` returns `Profile`, `profile` returns `PublicProfile`

---

### **Step 2: Update Query Resolvers**

**File:** `/packages/graphql-server/src/schema/resolvers/Query.ts`

```typescript
import { GraphQLError } from 'graphql';
import type { QueryResolvers } from '../generated/types.js';

export const Query: QueryResolvers = {
  /**
   * Get authenticated user's own profile
   * Requires JWT authentication
   * Returns full Profile with email
   */
  me: async (parent, args, context) => {
    // JWT middleware has already verified token and set context.userId
    if (!context.userId) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' }
      });
    }

    // Get full profile (includes email)
    const profile = await context.services.profileService
      .getProfileById(context.userId);

    if (!profile) {
      throw new GraphQLError('Profile not found', {
        extensions: { code: 'NOT_FOUND' }
      });
    }

    return profile; // Returns Profile type (with email)
  },

  /**
   * Get public profile by handle
   * No authentication required
   * Returns PublicProfile without email
   */
  profile: async (parent, { handle }, context) => {
    // Public query - no authentication check
    const publicProfile = await context.services.profileService
      .getProfileByHandle(handle);

    if (!publicProfile) {
      throw new GraphQLError('Profile not found', {
        extensions: { code: 'NOT_FOUND' }
      });
    }

    return publicProfile; // Returns PublicProfile type (no email)
  },
};
```

**Key Changes:**
- `me()`: Checks `context.userId` (from JWT), returns `Profile` (with email)
- `profile()`: No auth check, returns `PublicProfile` (no email)

---

### **Step 3: Update Profile Field Resolver**

**File:** `/packages/graphql-server/src/schema/resolvers/Profile.ts`

```typescript
import type { ProfileResolvers, PublicProfileResolvers } from '../generated/types.js';

/**
 * Profile field resolvers (for authenticated user's own profile)
 */
export const Profile: ProfileResolvers = {
  // All fields are direct mappings, no custom resolvers needed
  // TypeScript ensures Profile type matches schema
};

/**
 * PublicProfile field resolvers (for viewing other users)
 */
export const PublicProfile: PublicProfileResolvers = {
  /**
   * Check if the current authenticated user follows this profile
   * Returns null if:
   * - User is not authenticated
   * - User is viewing their own profile
   */
  isFollowing: async (parent, args, context) => {
    // Cannot follow yourself
    if (!context.userId || context.userId === parent.id) {
      return null;
    }

    // Get follow status
    const status = await context.services.followService
      .getFollowStatus(context.userId, parent.id);

    return status.isFollowing;
  },
};
```

**Why Two Resolvers?**
- `Profile`: For `me()` query (no `isFollowing` field needed)
- `PublicProfile`: For `profile()` query (has `isFollowing` field)

---

### **Step 4: Update Context Type**

**File:** `/packages/graphql-server/src/context.ts`

```typescript
import type { ProfileService } from '@social-media-app/dal';

/**
 * GraphQL Context
 * Available to all resolvers
 */
export interface GraphQLContext {
  // Authentication
  userId?: string;        // From JWT (undefined if not authenticated)

  // Services (Dependency Injection)
  services: {
    profileService: ProfileService;
    postService: PostService;
    followService: FollowService;
    // ... other services
  };
}

/**
 * Create GraphQL context from HTTP request
 * Extracts userId from JWT token
 */
export async function createContext(req: Request): Promise<GraphQLContext> {
  // Extract JWT from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  let userId: string | undefined;

  if (token) {
    try {
      // Verify JWT and extract userId
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email: string;
        username: string;
      };

      userId = decoded.userId;
    } catch (error) {
      // Invalid token - log but don't throw (public queries still work)
      console.warn('Invalid JWT token:', error.message);
    }
  }

  // Create service instances (DI)
  const services = {
    profileService: new ProfileService(/* ... */),
    postService: new PostService(/* ... */),
    // ... other services
  };

  return {
    userId,      // undefined if not authenticated
    services,
  };
}
```

**Key Points:**
- JWT verification happens ONCE per request
- `userId` is `undefined` if not authenticated (not an error)
- Resolvers check `context.userId` to enforce authentication

---

### **Step 5: Update Frontend GraphQL Operations**

**File:** `/packages/frontend/src/graphql/operations/profiles.ts`

```typescript
/**
 * Get authenticated user's own profile
 * Requires authentication (JWT in header)
 */
export const GET_ME_QUERY = `
  query GetMe {
    me {
      id
      username
      email           # ← Only available in me() query
      emailVerified
      handle
      fullName
      bio
      profilePictureUrl
      postsCount
      followersCount
      followingCount
      createdAt
    }
  }
`;

/**
 * Get public profile by handle
 * No authentication required
 */
export const GET_PROFILE_BY_HANDLE_QUERY = `
  query GetProfileByHandle($handle: String!) {
    profile(handle: $handle) {
      id
      username
      handle
      fullName
      bio
      profilePictureUrl
      postsCount
      followersCount
      followingCount
      isFollowing     # ← Contextual (if authenticated)
      createdAt
    }
  }
`;

// Type definitions
export interface GetMeResponse {
  me: {
    id: string;
    username: string;
    email: string;        // ← Only in GetMe response
    emailVerified: boolean;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    createdAt: string;
  };
}

export interface GetProfileByHandleResponse {
  profile: {
    id: string;
    username: string;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean | null;
    createdAt: string;
  };
}
```

**Changes:**
- ❌ Remove `userId` field (redundant with `id`)
- ✅ Separate queries: `GetMe` (with email) and `GetProfileByHandle` (no email)

---

### **Step 6: Frontend GraphQL Client (JWT Injection)**

**File:** `/packages/frontend/src/graphql/client.ts`

**Current Implementation (Already Correct!):**

```typescript
import { GraphQLClient } from 'graphql-request';
import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';
import type { AsyncState } from './types.js';

export class GraphQLClientImpl implements IGraphQLClient {
  private gqlClient: GraphQLClient;
  private authToken: string | null = null;

  constructor(endpoint: string) {
    this.gqlClient = new GraphQLClient(endpoint);
  }

  /**
   * Set JWT access token
   * Called when user logs in or token refreshes
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    // Update client headers with new token
    this.updateHeaders();
  }

  /**
   * Clear JWT access token
   * Called when user logs out
   */
  clearAuthToken(): void {
    this.authToken = null;
    this.updateHeaders();
  }

  /**
   * Execute GraphQL query with JWT token in header
   */
  async query<TData>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<AsyncState<TData>> {
    try {
      // graphql-request automatically includes headers
      const data = await this.gqlClient.request<TData>(query, variables);
      return { status: 'success', data };
    } catch (error) {
      // Handle errors...
      return { status: 'error', error: mapError(error) };
    }
  }

  /**
   * Update graphql-request client headers
   * Injects JWT Bearer token
   */
  private updateHeaders(): void {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`; // ← JWT injection
    }

    // Recreate client with updated headers
    this.gqlClient = new GraphQLClient(this.endpoint, { headers });
  }
}
```

**How It Works:**
1. User logs in via REST API → receives JWT access token
2. Frontend calls `graphqlClient.setAuthToken(accessToken)`
3. All subsequent GraphQL requests include `Authorization: Bearer <token>` header
4. GraphQL server extracts `userId` from JWT → populates `context.userId`
5. Resolvers use `context.userId` to determine authorization

---

## 🔄 **COMPLETE REQUEST/RESPONSE FLOW**

### **Scenario 1: User Logs In and Views Own Profile**

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: LOGIN (REST)                                             │
└──────────────────────────────────────────────────────────────────┘

Frontend                Backend (REST)
  │                           │
  │  POST /auth/login         │
  │  { email, password }      │
  ├─────────────────────────►│
  │                           │
  │                           │ Validate credentials
  │                           │ Generate JWT:
  │                           │   {
  │                           │     userId: "abc-123",
  │                           │     email: "john@example.com",
  │                           │     exp: 1698766332
  │                           │   }
  │                           │
  │  { accessToken: "...",    │
  │    user: { id, email } }  │
  │◄─────────────────────────┤
  │                           │
  │ Store:                    │
  │ • authStore.setToken("...")
  │ • graphqlClient.setAuthToken("...")
  │

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: QUERY OWN PROFILE (GraphQL)                              │
└──────────────────────────────────────────────────────────────────┘

Frontend                GraphQL Server
  │                           │
  │  POST /graphql            │
  │  Headers: {               │
  │    Authorization:         │
  │      "Bearer eyJ..."      │  ← JWT included
  │  }                        │
  │  Body: {                  │
  │    query: "{ me { ... }}" │
  │  }                        │
  ├─────────────────────────►│
  │                           │
  │                           │ Middleware:
  │                           │ • Extract JWT from header
  │                           │ • Verify signature
  │                           │ • Decode payload
  │                           │ • context.userId = "abc-123"
  │                           │
  │                           │ Resolver:
  │                           │ • me() checks context.userId
  │                           │ • Fetch profile from DB
  │                           │ • Return Profile (with email)
  │                           │
  │  { data: {                │
  │      me: {                │
  │        id: "abc-123",     │
  │        email: "john@...", │  ← Email included
  │        handle: "johndoe"  │
  │      }                    │
  │    }                      │
  │  }                        │
  │◄─────────────────────────┤
  │                           │
```

---

### **Scenario 2: User Views Someone Else's Profile**

```
Frontend                GraphQL Server
  │                           │
  │  POST /graphql            │
  │  Headers: {               │
  │    Authorization:         │
  │      "Bearer eyJ..."      │  ← JWT included (for isFollowing)
  │  }                        │
  │  Body: {                  │
  │    query: "{ profile(     │
  │      handle: 'alice'      │
  │    ) { ... } }"           │
  │  }                        │
  ├─────────────────────────►│
  │                           │
  │                           │ Middleware:
  │                           │ • Extract JWT
  │                           │ • context.userId = "abc-123" (John)
  │                           │
  │                           │ Resolver:
  │                           │ • profile() is PUBLIC
  │                           │ • Fetch Alice's profile by handle
  │                           │ • Return PublicProfile (no email)
  │                           │
  │                           │ Field Resolver:
  │                           │ • isFollowing field
  │                           │ • Check if John follows Alice
  │                           │
  │  { data: {                │
  │      profile: {           │
  │        id: "def-456",     │  ← Alice's ID
  │        handle: "alice",   │
  │        email: undefined   │  ← NO EMAIL (PublicProfile)
  │        isFollowing: true  │  ← John follows Alice
  │      }                    │
  │    }                      │
  │  }                        │
  │◄─────────────────────────┤
  │                           │
```

**Key Differences:**
- `me()`: Returns `Profile` with email (John's own profile)
- `profile(handle: "alice")`: Returns `PublicProfile` without email (Alice's profile)
- `isFollowing`: Computed using John's `context.userId` and Alice's profile

---

### **Scenario 3: Unauthenticated User Views Public Profile**

```
Frontend (Anon)         GraphQL Server
  │                           │
  │  POST /graphql            │
  │  Headers: {               │
  │    (NO Authorization)     │  ← No JWT
  │  }                        │
  │  Body: {                  │
  │    query: "{ profile(     │
  │      handle: 'alice'      │
  │    ) { ... } }"           │
  │  }                        │
  ├─────────────────────────►│
  │                           │
  │                           │ Middleware:
  │                           │ • No JWT token
  │                           │ • context.userId = undefined
  │                           │
  │                           │ Resolver:
  │                           │ • profile() is PUBLIC (no auth check)
  │                           │ • Fetch Alice's profile by handle
  │                           │ • Return PublicProfile (no email)
  │                           │
  │                           │ Field Resolver:
  │                           │ • isFollowing field
  │                           │ • context.userId is undefined
  │                           │ • Return null (can't follow if not logged in)
  │                           │
  │  { data: {                │
  │      profile: {           │
  │        id: "def-456",     │
  │        handle: "alice",   │
  │        isFollowing: null  │  ← null (not logged in)
  │      }                    │
  │    }                      │
  │  }                        │
  │◄─────────────────────────┤
  │                           │
```

**Key Points:**
- Anonymous users can still view public profiles
- `isFollowing` returns `null` when not authenticated
- GraphQL middleware doesn't throw error for missing JWT (public queries work)

---

## ⚠️ **COMMON PITFALLS & SOLUTIONS**

### **Pitfall 1: Exposing Sensitive Data in Public Queries**

**Problem:**
```graphql
# ❌ BAD: Single Profile type used everywhere
type Query {
  profile(handle: String!): Profile  # Returns email!
}
```

**Solution:**
```graphql
# ✅ GOOD: Separate types for different contexts
type Query {
  me: Profile!                      # With email
  profile(handle: String!): PublicProfile  # No email
}
```

---

### **Pitfall 2: Forgetting to Check Authentication**

**Problem:**
```typescript
// ❌ BAD: No auth check
updateProfile: async (parent, { input }, context) => {
  return context.services.profileService.updateProfile(
    input.userId,  // ← Anyone can update any profile!
    input
  );
}
```

**Solution:**
```typescript
// ✅ GOOD: Check authentication and ownership
updateProfile: async (parent, { input }, context) => {
  if (!context.userId) {
    throw new GraphQLError('Not authenticated');
  }

  // Update own profile only (userId from JWT)
  return context.services.profileService.updateProfile(
    context.userId,  // ← From JWT, not input
    input
  );
}
```

---

### **Pitfall 3: Token Expiration Not Handled**

**Problem:** Access token expires, all GraphQL queries fail.

**Solution:** Implement token refresh interceptor:

```typescript
// Frontend: GraphQL client with auto-refresh
export class GraphQLClientImpl implements IGraphQLClient {
  async query<TData>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<AsyncState<TData>> {
    try {
      const data = await this.gqlClient.request<TData>(query, variables);
      return { status: 'success', data };
    } catch (error) {
      // Check if error is authentication failure
      if (this.isAuthError(error)) {
        // Attempt token refresh
        const refreshed = await this.refreshToken();

        if (refreshed) {
          // Retry original query with new token
          const data = await this.gqlClient.request<TData>(query, variables);
          return { status: 'success', data };
        }
      }

      return { status: 'error', error: mapError(error) };
    }
  }

  private isAuthError(error: any): boolean {
    return error.response?.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED';
  }

  private async refreshToken(): Promise<boolean> {
    // Call REST /auth/refresh endpoint
    // Update access token if successful
    // Return true if refresh succeeded
  }
}
```

---

### **Pitfall 4: JWT in URL Query Parameters**

**Problem:**
```typescript
// ❌ NEVER DO THIS: JWT in URL
const url = `/graphql?token=${accessToken}`;
```

**Why Bad:**
- Tokens logged in server access logs
- Tokens visible in browser history
- Tokens cached by proxies/CDNs

**Solution:**
```typescript
// ✅ ALWAYS: JWT in Authorization header
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

---

## 🎯 **MIGRATION CHECKLIST FOR PHASE 2**

### **Backend Changes**
- [ ] Update GraphQL schema with `Profile` and `PublicProfile` types
- [ ] Update `Query.me` resolver to return `Profile`
- [ ] Update `Query.profile` resolver to return `PublicProfile`
- [ ] Create `PublicProfile` field resolver for `isFollowing`
- [ ] Update `Mutation.updateProfile` to return `Profile`
- [ ] Ensure DAL methods return correct types (`Profile` vs `PublicProfile`)
- [ ] Test JWT middleware extracts `userId` correctly

### **Frontend Changes**
- [ ] Create separate GraphQL operations: `GET_ME_QUERY` and `GET_PROFILE_BY_HANDLE_QUERY`
- [ ] Update response types to match new schema
- [ ] Remove `userId` field from all queries (use `id`)
- [ ] Update `ProfileService.graphql.ts` transformer
- [ ] Update components using profile data
- [ ] Test authenticated and unauthenticated flows

### **Testing**
- [ ] Test `me` query with valid JWT → returns Profile with email
- [ ] Test `me` query without JWT → returns UNAUTHENTICATED error
- [ ] Test `profile` query with valid JWT → returns PublicProfile without email, with isFollowing
- [ ] Test `profile` query without JWT → returns PublicProfile without email, isFollowing is null
- [ ] Test `updateProfile` mutation with valid JWT → succeeds
- [ ] Test `updateProfile` mutation without JWT → returns UNAUTHENTICATED error
- [ ] Test `updateProfile` mutation with JWT for different user → returns FORBIDDEN error

---

## 📊 **BEFORE/AFTER COMPARISON**

### **Before: Insecure Profile Access**

```graphql
# Schema
type Profile {
  id: ID!
  email: String!  # ← Exposed to everyone
  handle: String!
}

type Query {
  me: Profile!
  profile(handle: String!): Profile  # ← Same type!
}
```

```typescript
// Anyone can see anyone's email!
query {
  profile(handle: "alice") {
    email  # ← alice@example.com (privacy leak!)
  }
}
```

---

### **After: Secure Profile Access**

```graphql
# Schema
type Profile {
  id: ID!
  email: String!       # ← Only for authenticated user
  handle: String!
}

type PublicProfile {
  id: ID!
  handle: String!      # ← No email field
  isFollowing: Boolean
}

type Query {
  me: Profile!                              # Own profile
  profile(handle: String!): PublicProfile   # Public profile
}
```

```typescript
// Email only visible to self
query {
  me {
    email  # ← Your own email (secure)
  }
}

query {
  profile(handle: "alice") {
    email  # ← GraphQL error: Field doesn't exist on PublicProfile
    isFollowing  # ← true/false/null
  }
}
```

---

## 🎓 **KEY TAKEAWAYS**

1. **JWT Architecture is Solid**: Your current REST auth + JWT + GraphQL data approach is correct

2. **No Migration Needed**: Keep auth endpoints in REST, they work perfectly

3. **JWT Enables Authorization**: `context.userId` from JWT determines what data to return

4. **Profile/PublicProfile Split**: Use JWT to return different types based on authentication

5. **Three Access Levels**:
   - Public (no JWT): Anyone can access
   - Authenticated (JWT required): Must be logged in
   - Authorized (JWT + ownership check): Must own the resource

6. **Security by Design**: GraphQL schema enforces data privacy at type level

7. **Token Injection**: Frontend GraphQL client automatically includes JWT in every request

8. **Context is Key**: `context.userId` available in all resolvers for auth checks

---

## 📚 **ADDITIONAL RESOURCES**

### **JWT Best Practices**
- Use short-lived access tokens (15 minutes)
- Use long-lived refresh tokens (7 days)
- Store tokens in memory, not localStorage (XSS protection)
- Include minimal data in JWT payload
- Always verify JWT signature
- Use HTTPS only

### **GraphQL Security Patterns**
- Field-level authorization (check `context.userId`)
- Query depth limiting (prevent abuse)
- Query complexity analysis
- Rate limiting per user
- DataLoader for N+1 prevention

### **Testing Strategies**
- Mock JWT in tests
- Test with/without authentication
- Test authorization failures
- Test token expiration handling
- Test concurrent requests

---

## 🎉 **CONCLUSION**

**Your JWT architecture is production-ready!** The Phase 2 changes (Profile/PublicProfile split) build on your solid JWT foundation without requiring any auth migration.

**Summary:**
- ✅ Keep REST for auth (login, register, refresh)
- ✅ Keep JWT tokens for authentication
- ✅ Use GraphQL for all data operations
- ✅ JWT `userId` in context enables smart authorization
- ✅ Profile/PublicProfile split protects sensitive data

**Next Steps:**
1. Implement Phase 1 (Shared Schemas)
2. Implement Phase 2 (GraphQL Schema + Resolvers) using this guide
3. Implement Phase 3-5 (Frontend updates)
4. Test thoroughly with and without JWT
5. Deploy with confidence!

Your separation of concerns (REST auth + GraphQL data + JWT tokens) follows industry best practices used by companies like GitHub, Shopify, and Stripe.
