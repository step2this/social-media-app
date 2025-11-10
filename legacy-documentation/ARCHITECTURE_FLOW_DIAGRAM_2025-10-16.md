# Architecture Flow Diagram - End-to-End Request

**Date:** October 16, 2025

---

## Sequence Diagram: Get Profile Request

```mermaid
sequenceDiagram
    participant Browser as Frontend (React)
    participant GQL as GraphQL Server<br/>(Apollo, Port 4000)
    participant Resolver as Query Resolver
    participant Context as GraphQL Context
    participant ServiceFactory as Service Factory
    participant ProfileService as ProfileService<br/>(DAL)
    participant DataLoader as DataLoader<br/>(Batching)
    participant DynamoDB as DynamoDB<br/>(LocalStack)

    Note over Browser,DynamoDB: User requests profile page

    Browser->>GQL: POST /graphql<br/>query { profile(handle: "alice") }
    Note over Browser,GQL: HTTP request with GraphQL query

    GQL->>Context: createContext(event)
    Note over Context: Per-request context creation

    Context->>ServiceFactory: createServices(dynamoClient, tableName)
    ServiceFactory->>ProfileService: new ProfileService(dynamoClient, ...)
    ServiceFactory-->>Context: Return all services

    Context->>DataLoader: createLoaders(services, userId)
    DataLoader-->>Context: Return DataLoaders

    Context-->>GQL: Return context<br/>{services, loaders, userId}

    GQL->>Resolver: Query.profile(parent, args, context)
    Note over Resolver: profile resolver executes

    Resolver->>ProfileService: context.services.profileService<br/>.getProfileByHandle("alice")
    Note over ProfileService: Direct database access

    ProfileService->>DynamoDB: GetCommand<br/>PK: USER#..., SK: PROFILE
    Note over DynamoDB: Single item query

    DynamoDB-->>ProfileService: {id, handle, displayName, ...}

    ProfileService-->>Resolver: PublicProfile object

    Resolver-->>GQL: profile data

    GQL-->>Browser: HTTP 200<br/>{"data": {"profile": {...}}}

    Note over Browser: Render profile page
```

---

## Sequence Diagram: Get Auction with Seller Profile (N+1 Prevention)

```mermaid
sequenceDiagram
    participant Browser as Frontend (React)
    participant GQL as GraphQL Server<br/>(Apollo, Port 4000)
    participant QueryResolver as Query Resolver
    participant FieldResolver as Auction.seller<br/>Field Resolver
    participant Context as GraphQL Context
    participant AuctionService as AuctionService<br/>(Auction DAL)
    participant PostgreSQL as PostgreSQL<br/>(Docker)
    participant DataLoader as profileLoader<br/>(DataLoader)
    participant ProfileService as ProfileService<br/>(DAL)
    participant DynamoDB as DynamoDB<br/>(LocalStack)

    Note over Browser,DynamoDB: User requests auction detail page

    Browser->>GQL: POST /graphql<br/>query { auction(id: "123") { title, seller { handle } } }

    GQL->>Context: createContext(event)
    Context-->>GQL: context with services & loaders

    GQL->>QueryResolver: Query.auction(parent, {id: "123"}, context)

    QueryResolver->>AuctionService: context.services.auctionService<br/>.getAuction("123")
    Note over AuctionService: Direct PostgreSQL access

    AuctionService->>PostgreSQL: SELECT * FROM auctions<br/>WHERE id = '123'
    PostgreSQL-->>AuctionService: {id, userId: "user-456", title, ...}

    AuctionService-->>QueryResolver: Auction object

    Note over QueryResolver,FieldResolver: GraphQL executes field resolver<br/>for "seller" field

    GQL->>FieldResolver: Auction.seller(auction, args, context)
    Note over FieldResolver: auction.userId = "user-456"

    FieldResolver->>DataLoader: context.loaders.profileLoader<br/>.load("user-456")
    Note over DataLoader: Batches requests within 10ms window

    DataLoader->>ProfileService: getProfilesByIds(["user-456"])
    Note over ProfileService: Batch fetches multiple profiles

    ProfileService->>DynamoDB: BatchGetCommand<br/>Keys: [USER#user-456]
    DynamoDB-->>ProfileService: [{id, handle: "alice", ...}]

    ProfileService-->>DataLoader: Map<"user-456", Profile>

    DataLoader-->>FieldResolver: Profile object

    FieldResolver-->>GQL: seller profile

    GQL-->>Browser: HTTP 200<br/>{"data": {"auction": {<br/>  "title": "...",<br/>  "seller": {"handle": "alice"}<br/>}}}

    Note over Browser: Render auction page with seller info
```

---

## Sequence Diagram: List Auctions with Sellers (DataLoader Batching)

```mermaid
sequenceDiagram
    participant Browser as Frontend (React)
    participant GQL as GraphQL Server
    participant QueryResolver as Query.auctions
    participant FieldResolver as Auction.seller<br/>(x10 calls)
    participant DataLoader as profileLoader<br/>(Batching)
    participant ProfileService as ProfileService
    participant AuctionService as AuctionService
    participant PostgreSQL as PostgreSQL
    participant DynamoDB as DynamoDB

    Note over Browser,DynamoDB: User views auction list page (10 auctions)

    Browser->>GQL: query { auctions(limit: 10) {<br/>  edges { node { title, seller { handle } } }<br/>}}

    GQL->>QueryResolver: Query.auctions(parent, {limit: 10}, context)

    QueryResolver->>AuctionService: listAuctions({limit: 10})

    AuctionService->>PostgreSQL: SELECT * FROM auctions<br/>LIMIT 10
    PostgreSQL-->>AuctionService: 10 auction rows

    AuctionService-->>QueryResolver: [auction1, auction2, ..., auction10]

    Note over QueryResolver,FieldResolver: GraphQL resolves "seller" field<br/>for each auction

    loop For each of 10 auctions
        GQL->>FieldResolver: Auction.seller(auction, args, context)
        FieldResolver->>DataLoader: profileLoader.load(auction.userId)
        Note over DataLoader: Queues request, waits 10ms
    end

    Note over DataLoader: 10ms batch window expires<br/>DataLoader batches all 10 IDs

    DataLoader->>ProfileService: getProfilesByIds([<br/>  "user-1", "user-2", ..., "user-10"<br/>])

    ProfileService->>DynamoDB: BatchGetCommand<br/>Keys: [USER#user-1, ..., USER#user-10]
    Note over DynamoDB: Single batch request for all profiles

    DynamoDB-->>ProfileService: 10 profile objects

    ProfileService-->>DataLoader: Map<userId, Profile>

    loop For each of 10 requests
        DataLoader-->>FieldResolver: Profile object
        FieldResolver-->>GQL: seller profile
    end

    GQL-->>Browser: HTTP 200 with all auction + seller data

    Note over Browser,DynamoDB: Total DB queries: 2<br/>(1 PostgreSQL + 1 DynamoDB batch)<br/>Instead of 11 without DataLoader!
```

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  • UI Components                                            │
│  • GraphQL Client (graphql-request)                         │
│  • State Management (React hooks)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST /graphql
                      │ GraphQL queries/mutations
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              GRAPHQL SERVER (Apollo Server v4)              │
│  • Schema (typeDefs)                                        │
│  • Resolvers (Query, Mutation, Field)                      │
│  • Context (services, loaders, userId)                     │
│  • DataLoaders (batching & caching)                        │
└─────────────┬───────────────────┬───────────────────────────┘
              │                   │
              │ Call methods      │ Call methods
              ▼                   ▼
┌──────────────────────┐  ┌──────────────────────┐
│   DAL (DynamoDB)     │  │ Auction DAL (PG)     │
│  • ProfileService    │  │  • AuctionService    │
│  • PostService       │  │  • ACID transactions │
│  • LikeService       │  │  • Row locking       │
│  • FollowService     │  │                      │
│  • CommentService    │  │                      │
│  • FeedService       │  │                      │
│  • NotificationSvc   │  │                      │
└──────────┬───────────┘  └──────────┬───────────┘
           │                         │
           │ AWS SDK commands        │ pg library (SQL)
           ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│   DynamoDB           │  │   PostgreSQL         │
│  (LocalStack)        │  │   (Docker)           │
│  • Single table      │  │  • auctions table    │
│  • GSI indexes       │  │  • bids table        │
│  • Eventual consist. │  │  • ACID guarantees   │
└──────────────────────┘  └──────────────────────┘
```

---

## Key Architectural Patterns

### 1. GraphQL Context (Dependency Injection)

**Created once per request:**
```typescript
context = {
  userId: string | null,           // From JWT token
  dynamoClient: DynamoDBClient,    // AWS SDK client
  tableName: string,               // DynamoDB table
  services: {                      // ALL DAL services
    profileService,
    postService,
    auctionService,  // ← Added for auctions
    // ... 8 services total
  },
  loaders: {                       // DataLoaders for N+1 prevention
    profileLoader,
    postLoader,
    auctionLoader,   // ← Added for auctions
    likeStatusLoader
  }
}
```

### 2. Service Factory Pattern

**Single instantiation point:**
```typescript
function createServices(dynamoClient, tableName) {
  // DynamoDB services
  const profileService = new ProfileService(dynamoClient, tableName);
  const postService = new PostService(dynamoClient, tableName, profileService);

  // PostgreSQL service
  const pgPool = createPostgresPool();
  const auctionService = new AuctionService(pgPool);

  return { profileService, postService, auctionService, ... };
}
```

**Eliminates ~400 lines of duplicated service instantiation code!**

### 3. DataLoader Pattern (N+1 Prevention)

**Without DataLoader (N+1 problem):**
```
Query: Load 10 auctions        → 1 database query
Load seller for auction 1      → 1 database query
Load seller for auction 2      → 1 database query
...
Load seller for auction 10     → 1 database query
Total: 11 queries
```

**With DataLoader (batched):**
```
Query: Load 10 auctions        → 1 database query
DataLoader batches all sellers → 1 database query (batch)
Total: 2 queries (5.5x improvement!)
```

### 4. Resolver Types

**Query Resolvers (root level):**
```typescript
Query.profile(parent, { handle }, context)
Query.auction(parent, { id }, context)
Query.auctions(parent, { limit, status }, context)
```

**Field Resolvers (nested data):**
```typescript
Auction.seller(auction, args, context)
  → return context.loaders.profileLoader.load(auction.userId)

Post.author(post, args, context)
  → return context.loaders.profileLoader.load(post.userId)
```

**Mutation Resolvers (write operations):**
```typescript
Mutation.createAuction(parent, { input }, context)
Mutation.placeBid(parent, { input }, context)
```

---

## Request Flow Summary

### Simple Request (Profile)
1. **Frontend**: GraphQL query → Apollo Client
2. **GraphQL Server**: Parse query → Execute resolver
3. **Resolver**: Call `ProfileService.getProfileByHandle()`
4. **DAL**: Execute DynamoDB GetCommand
5. **Database**: Return profile data
6. **Response**: GraphQL formats & returns JSON

### Complex Request (Auction + Seller)
1. **Frontend**: GraphQL query with nested fields
2. **GraphQL Server**: Execute Query.auction resolver
3. **Query Resolver**: Call `AuctionService.getAuction()` → PostgreSQL
4. **GraphQL**: Execute field resolver Auction.seller
5. **Field Resolver**: Call `profileLoader.load(userId)`
6. **DataLoader**: Batch multiple profile requests (10ms window)
7. **DAL**: Single batch query to DynamoDB
8. **Response**: GraphQL returns auction with seller data

### Batched Request (10 Auctions)
1. **Query Resolver**: Load 10 auctions from PostgreSQL
2. **Field Resolvers**: 10 calls to Auction.seller
3. **DataLoader**: Queues 10 profile IDs, waits 10ms
4. **DataLoader**: Batches into single `getProfilesByIds([...10 IDs])`
5. **DAL**: Single BatchGetCommand to DynamoDB
6. **Result**: 2 database queries instead of 11!

---

## Why This Architecture Works

### ✅ Separation of Concerns
- **Frontend**: UI/UX, user interactions
- **GraphQL**: API gateway, data fetching orchestration
- **DAL**: Database access, business logic
- **Database**: Data persistence

### ✅ Performance Optimization
- **DataLoaders**: Eliminate N+1 queries automatically
- **Batching**: Group multiple requests into single DB call
- **Caching**: Per-request cache prevents duplicate fetches

### ✅ Type Safety
- **GraphQL Schema**: API contract
- **TypeScript**: End-to-end type checking
- **Zod**: Runtime validation in DAL

### ✅ Flexibility
- **GraphQL**: Clients request exactly what they need
- **No over-fetching**: Frontend controls data shape
- **No under-fetching**: Single query gets all related data

### ✅ Scalability
- **Hybrid databases**: PostgreSQL for ACID, DynamoDB for scale
- **Connection pooling**: Efficient resource usage
- **Stateless resolvers**: Horizontal scaling

---

## What's Different: Auctions vs Posts

### Posts (DynamoDB)
```
Frontend → GraphQL → PostService → DynamoDB
         ↓
    Eventually consistent
    High throughput
    NoSQL queries
```

### Auctions (PostgreSQL)
```
Frontend → GraphQL → AuctionService → PostgreSQL
         ↓
    ACID transactions
    Row-level locking
    SQL queries
```

### Both Use Same Patterns!
- ✅ Service factory (context.services)
- ✅ DataLoader (context.loaders)
- ✅ GraphQL resolvers
- ✅ Field resolvers for related data

**The only difference is which database the DAL talks to!**
