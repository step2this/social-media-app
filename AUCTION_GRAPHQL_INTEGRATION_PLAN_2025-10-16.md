# GraphQL Integration Plan for Auctions

**Date:** October 16, 2025
**Status:** Architecture Decision - Pending Implementation

---

## Executive Summary

**Current State:**
- ✅ GraphQL server exists at `packages/graphql-server` running on port 4000
- ✅ Serves ALL social media features (posts, profiles, comments, likes, follows, notifications, feed)
- ✅ Uses Apollo Server v4 with DynamoDB, DataLoaders, and service factory pattern
- ✅ Frontend will eventually consume GraphQL exclusively (REST API being phased out)
- ⚠️ Auctions currently have REST API handlers + PostgreSQL backend (separate architecture)
- ⚠️ Frontend auction service uses REST client (18/18 tests but wrong approach)

**Critical Insight:**
The user is 100% correct - GraphQL IS the primary API strategy. Auctions MUST integrate into GraphQL for unified feed experience where posts and auction items appear together.

---

## Phase 1: Add Auction Types to GraphQL Schema (TDD)

**Goal:** Extend GraphQL schema with auction types, queries, and mutations

### 1.1 Update `packages/graphql-server/src/schema/typeDefs.ts`

Add auction types to GraphQL schema:

```graphql
# ============================================================================
# Auction Types
# ============================================================================

type Auction {
  id: ID!
  userId: ID!
  seller: Profile!
  title: String!
  description: String
  imageUrl: String!
  startPrice: Float!
  reservePrice: Float
  currentPrice: Float!
  startTime: String!
  endTime: String!
  status: AuctionStatus!
  winnerId: ID
  winner: Profile
  bidCount: Int!
  createdAt: String!
  updatedAt: String!
}

type Bid {
  id: ID!
  auctionId: ID!
  userId: ID!
  bidder: Profile!
  amount: Float!
  createdAt: String!
}

enum AuctionStatus {
  PENDING
  ACTIVE
  COMPLETED
  CANCELLED
}

# ============================================================================
# Auction Queries
# ============================================================================

extend type Query {
  # Get single auction
  auction(id: ID!): Auction

  # List auctions with filters
  auctions(
    limit: Int
    cursor: String
    status: AuctionStatus
    userId: ID
  ): AuctionConnection!

  # Get bid history for auction
  bids(auctionId: ID!, limit: Int, offset: Int): BidConnection!
}

# ============================================================================
# Auction Mutations
# ============================================================================

extend type Mutation {
  # Create new auction
  createAuction(input: CreateAuctionInput!): CreateAuctionPayload!

  # Activate auction (seller action)
  activateAuction(id: ID!): Auction!

  # Place bid (buyer action)
  placeBid(input: PlaceBidInput!): PlaceBidPayload!
}

# ============================================================================
# Auction Input Types
# ============================================================================

input CreateAuctionInput {
  title: String!
  description: String
  fileType: String!
  startPrice: Float!
  reservePrice: Float
  startTime: String!
  endTime: String!
}

input PlaceBidInput {
  auctionId: ID!
  amount: Float!
}

# ============================================================================
# Auction Connection Types (Relay Pagination)
# ============================================================================

type AuctionConnection {
  edges: [AuctionEdge!]!
  pageInfo: PageInfo!
}

type AuctionEdge {
  cursor: String!
  node: Auction!
}

type BidConnection {
  bids: [Bid!]!
  total: Int!
}

# ============================================================================
# Auction Response Types
# ============================================================================

type CreateAuctionPayload {
  auction: Auction!
  uploadUrl: String!
}

type PlaceBidPayload {
  bid: Bid!
  auction: Auction!
}
```

### 1.2 Write Schema Tests (`__tests__/schema.test.ts`)

Add test coverage for auction schema validation.

---

## Phase 2: Integrate Auction DAL into GraphQL Services (TDD)

**Goal:** Add AuctionService to GraphQL context with proper dependency injection

### 2.1 Update `packages/graphql-server/src/services/factory.ts`

```typescript
import { AuctionService } from '@social-media-app/auction-dal';
import { createPostgresPool } from '@social-media-app/auction-dal';

export interface Services {
  // ... existing services
  auctionService: AuctionService;
}

export function createServices(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string
): Services {
  // ... existing DynamoDB services

  // Create PostgreSQL pool for auctions (separate from DynamoDB)
  const pgPool = createPostgresPool();
  const auctionService = new AuctionService(pgPool);

  return {
    // ... existing services
    auctionService,
  };
}
```

### 2.2 Update Context Types

Add PostgreSQL client to `GraphQLContext` interface in `context.ts`.

### 2.3 Write Service Factory Tests

Verify AuctionService is properly instantiated in context.

---

## Phase 3: Create Auction Resolvers (TDD)

**Goal:** Implement GraphQL resolvers that call AuctionService

### 3.1 Create `packages/graphql-server/src/schema/resolvers/Auction.ts`

Field resolvers for Auction type:

```typescript
import type { AuctionResolvers } from '../generated/types.js';

export const Auction: AuctionResolvers = {
  // seller field resolver - batch load seller profiles
  seller: async (parent, _args, context) => {
    const profile = await context.loaders.profileLoader.load(parent.userId);
    if (!profile) {
      throw new GraphQLError('Seller profile not found');
    }
    return profile;
  },

  // winner field resolver - batch load winner profiles if exists
  winner: async (parent, _args, context) => {
    if (!parent.winnerId) return null;
    return await context.loaders.profileLoader.load(parent.winnerId);
  },
};
```

### 3.2 Create Query Resolvers (`Query.ts` additions)

```typescript
// In Query resolvers
auction: async (_parent, args, context) => {
  const auction = await context.services.auctionService.getAuction(args.id);
  return auction || null;
},

auctions: async (_parent, args, context) => {
  const result = await context.services.auctionService.listAuctions({
    limit: args.limit || 20,
    cursor: args.cursor,
    status: args.status,
    userId: args.userId,
  });

  // Transform to Relay connection
  const edges = result.auctions.map((auction) => ({
    node: auction,
    cursor: btoa(JSON.stringify({ id: auction.id, createdAt: auction.createdAt })),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: result.hasMore,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
    },
  };
},

bids: async (_parent, args, context) => {
  const result = await context.services.auctionService.getBidHistory(
    args.auctionId,
    { limit: args.limit || 50, offset: args.offset || 0 }
  );

  return {
    bids: result.bids,
    total: result.total,
  };
},
```

### 3.3 Create Mutation Resolvers (`Mutation.ts` additions)

```typescript
// In Mutation resolvers
createAuction: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // S3 upload URL generation (reuse existing pattern)
  const s3Client = createS3Client();
  const result = await generatePresignedUploadUrl({...});

  const auction = await context.services.auctionService.createAuction(
    context.userId,
    args.input,
    result.publicUrl
  );

  return {
    auction,
    uploadUrl: result.uploadUrl,
  };
},

activateAuction: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required');
  }

  const auction = await context.services.auctionService.activateAuction(
    args.id,
    context.userId
  );

  return auction;
},

placeBid: async (_parent, args, context) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required');
  }

  const result = await context.services.auctionService.placeBid(
    context.userId,
    args.input
  );

  return {
    bid: result.bid,
    auction: result.auction,
  };
},
```

### 3.4 Write Resolver Tests

Full test coverage for all auction queries and mutations.

---

## Phase 4: Add Auction DataLoaders (Optimization)

**Goal:** Prevent N+1 queries when loading auction data

### 4.1 Update `packages/graphql-server/src/dataloaders/index.ts`

```typescript
export interface DataLoaders {
  // ... existing loaders
  auctionLoader: DataLoader<string, Auction | null>;
}

// Add auction loader to createLoaders()
auctionLoader: new DataLoader<string, Auction | null>(
  async (ids) => {
    const auctions = await services.auctionService.getAuctionsByIds([...ids]);
    return ids.map(id => auctions.get(id) || null);
  },
  { cache: true, batchScheduleFn: (callback) => setTimeout(callback, 10) }
),
```

### 4.2 Implement Batch Loading in AuctionService

Add `getAuctionsByIds()` method to `@social-media-app/auction-dal`.

---

## Phase 5: Integrate Auctions into Feed (Unified Experience)

**Goal:** Mix auction items with posts in user feeds

### 5.1 Update Feed Schema

```graphql
# Update FeedItem to support both posts and auctions
union FeedContent = Post | Auction

type FeedItem {
  id: ID!
  content: FeedContent!  # Can be Post or Auction
  readAt: String
  createdAt: String!
}
```

### 5.2 Update Feed Resolver

Modify `feed` query to include auctions from followed users.

### 5.3 Update FeedService in DAL

Add logic to fetch both posts and auctions, merge, and sort by timestamp.

---

## Phase 6: Frontend GraphQL Client Integration

**Goal:** Replace REST API calls with GraphQL queries

### 6.1 Install GraphQL Client Dependencies

```bash
pnpm --filter @social-media-app/frontend add graphql graphql-request
```

### 6.2 Create GraphQL Client (`packages/frontend/src/graphql/client.ts`)

```typescript
import { GraphQLClient } from 'graphql-request';

const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  credentials: 'include',
});

// Auth token injection
export const setAuthToken = (token: string) => {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`);
};
```

### 6.3 Create Auction Queries (`packages/frontend/src/graphql/queries/auctions.ts`)

```typescript
import { gql } from 'graphql-request';

export const GET_AUCTION = gql`
  query GetAuction($id: ID!) {
    auction(id: $id) {
      id
      title
      description
      imageUrl
      currentPrice
      startPrice
      reservePrice
      bidCount
      status
      startTime
      endTime
      seller {
        id
        handle
        displayName
        profilePictureUrl
      }
      winner {
        id
        handle
        displayName
      }
    }
  }
`;

export const LIST_AUCTIONS = gql`
  query ListAuctions($limit: Int, $cursor: String, $status: AuctionStatus, $userId: ID) {
    auctions(limit: $limit, cursor: $cursor, status: $status, userId: $userId) {
      edges {
        cursor
        node {
          id
          title
          imageUrl
          currentPrice
          bidCount
          status
          endTime
          seller {
            id
            handle
            displayName
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PLACE_BID = gql`
  mutation PlaceBid($input: PlaceBidInput!) {
    placeBid(input: $input) {
      bid {
        id
        amount
        createdAt
      }
      auction {
        id
        currentPrice
        bidCount
      }
    }
  }
`;
```

### 6.4 Replace REST Service with GraphQL Service

**REPLACE** `packages/frontend/src/services/auctionService.ts` with GraphQL implementation:

```typescript
import { graphqlClient } from '../graphql/client.js';
import { GET_AUCTION, LIST_AUCTIONS, PLACE_BID } from '../graphql/queries/auctions.js';
import type { Auction, ListAuctionsResponse, PlaceBidResponse } from '@social-media-app/shared';

export const auctionService = {
  async listAuctions(options: ListAuctionsOptions = {}): Promise<ListAuctionsResponse> {
    const data = await graphqlClient.request(LIST_AUCTIONS, options);
    return {
      auctions: data.auctions.edges.map(edge => edge.node),
      nextCursor: data.auctions.pageInfo.endCursor,
      hasMore: data.auctions.pageInfo.hasNextPage,
    };
  },

  async getAuction(auctionId: string): Promise<Auction> {
    const data = await graphqlClient.request(GET_AUCTION, { id: auctionId });
    return data.auction;
  },

  async placeBid(auctionId: string, amount: number): Promise<PlaceBidResponse> {
    const data = await graphqlClient.request(PLACE_BID, {
      input: { auctionId, amount }
    });
    return data.placeBid;
  },

  // ... other methods
};
```

### 6.5 Update Tests

Update all 18 auction service tests to mock `graphqlClient.request` instead of `apiClient`.

---

## Phase 7: Deprecate REST Auction Endpoints

**Goal:** Remove duplicate REST handlers once GraphQL is live

1. Mark REST endpoints as deprecated
2. Update server.js to show deprecation warnings
3. Eventually remove REST handlers entirely
4. Keep PostgreSQL backend (accessed via GraphQL resolvers)

---

## Key Architectural Decisions

### ✅ Why GraphQL Integration Makes Sense

1. **Unified API Surface**: Single GraphQL endpoint instead of mixing REST + GraphQL
2. **Feed Integration**: Auctions can appear in feeds alongside posts naturally
3. **Batching/Caching**: DataLoaders eliminate N+1 queries for auction+profile data
4. **Type Safety**: GraphQL schema provides end-to-end type safety
5. **Flexibility**: Clients request exactly what they need (no over-fetching)

### ⚠️ Hybrid Data Layer (DynamoDB + PostgreSQL)

- **DynamoDB**: Social features (posts, likes, follows, comments, notifications)
  - Eventual consistency acceptable
  - High read/write throughput
  - Optimized for social graph queries

- **PostgreSQL**: Auctions + bidding
  - ACID transactions required (critical for bid atomicity)
  - Row-level locking prevents race conditions
  - Complex relational queries (bid history, winner selection)

### 🔧 Service Factory Pattern

- GraphQL context creates ONE instance of each service per request
- Services injected into resolvers via context
- Eliminates ~400 lines of duplicated instantiation code
- Consistent dependency injection across entire API

---

## Testing Strategy

**All phases use TDD:**

1. Write failing schema/resolver tests
2. Implement minimal code to pass
3. Refactor for quality
4. Verify 100% test coverage

**Integration tests:**
- Test auction creation → activation → bidding flow end-to-end
- Test mixed feed queries (posts + auctions)
- Test DataLoader batching efficiency

---

## Migration Path

1. **Phase 1-4**: Build GraphQL auction API (backend only)
2. **Phase 5**: Integrate auctions into feed (backend)
3. **Phase 6**: Update frontend to use GraphQL (breaking change)
4. **Phase 7**: Remove REST auction handlers

**Rollout**: Feature flag for GraphQL vs REST to allow gradual migration.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GraphQL Client (graphql-request)                        │  │
│  │  • Auth token injection                                  │  │
│  │  • Query/Mutation execution                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
            │ GraphQL over HTTP (port 4000)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              GRAPHQL SERVER (Apollo Server v4)                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Schema Layer                                            │  │
│  │  • typeDefs (posts, auctions, profiles, etc.)           │  │
│  │  • Relay-style pagination                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Resolver Layer                                          │  │
│  │  • Query resolvers                                       │  │
│  │  • Mutation resolvers                                    │  │
│  │  • Field resolvers (Auction.seller, Post.author)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Context Layer (per request)                            │  │
│  │  • JWT auth (userId extraction)                         │  │
│  │  • Service Factory (DI for all services)               │  │
│  │  • DataLoaders (N+1 prevention)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────┬───────────────────────────────┬───────────────────┘
              │                               │
              │                               │
              ▼                               ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   DATA ACCESS LAYER (DAL)    │  │   AUCTION DAL (PostgreSQL)   │
│                              │  │                              │
│  • ProfileService            │  │  • AuctionService            │
│  • PostService               │  │    - createAuction()         │
│  • LikeService               │  │    - placeBid() [ACID]       │
│  • FollowService             │  │    - getAuctionsByIds()      │
│  • CommentService            │  │    - getBidHistory()         │
│  • FeedService               │  │                              │
│  • NotificationService       │  │                              │
└──────────────┬───────────────┘  └──────────────┬───────────────┘
               │                                 │
               ▼                                 ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   DynamoDB (LocalStack)      │  │   PostgreSQL (Docker)        │
│                              │  │                              │
│  • tamafriends-local table   │  │  • auctions_dev database     │
│  • Posts, profiles, likes    │  │  • auctions table            │
│  • Comments, follows         │  │  • bids table                │
│  • Notifications, feed       │  │  • Row-level locking         │
│  • Eventual consistency      │  │  • ACID transactions         │
└──────────────────────────────┘  └──────────────────────────────┘
```

---

## Current Status Summary

### ✅ Completed
- GraphQL server infrastructure (`packages/graphql-server`)
- All social media features via GraphQL (posts, profiles, comments, etc.)
- DataLoader pattern for N+1 prevention
- Service factory for dependency injection
- REST auction handlers + PostgreSQL backend (wrong approach)
- Frontend REST auction service with 18/18 tests (needs replacement)

### 🚧 In Progress
- Frontend hooks (useAuctions.ts completed with 14/14 tests)

### ⏳ Pending
- GraphQL schema extension for auctions (Phase 1)
- GraphQL resolvers for auctions (Phase 2-3)
- DataLoader for auctions (Phase 4)
- Feed integration (Phase 5)
- Frontend GraphQL migration (Phase 6)
- REST endpoint deprecation (Phase 7)

---

## Next Steps

**Immediate action:** Begin Phase 1 by extending GraphQL schema with auction types and writing schema validation tests.

**Critical decision:** Should we pause frontend work until GraphQL backend is ready, or continue with REST temporarily and migrate later?

**Recommendation:** Pause frontend UI work, complete GraphQL backend integration first (Phases 1-4), then resume frontend with GraphQL client. This prevents building UI twice.
