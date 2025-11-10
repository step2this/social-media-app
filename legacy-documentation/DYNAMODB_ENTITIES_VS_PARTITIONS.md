# DynamoDB: Entities vs Physical Partitions

**Understanding the Mental Model vs Physical Reality**

---

## Table of Contents

1. [The Key Insight](#the-key-insight)
2. [Entities: Your Logical Organization](#entities-your-logical-organization)
3. [Physical Reality: One Flat Table](#physical-reality-one-flat-table)
4. [AWS Auto-Sharding Explained](#aws-auto-sharding-explained)
5. [What You Control vs What AWS Controls](#what-you-control-vs-what-aws-controls)
6. [How Queries Work](#how-queries-work)
7. [Design Patterns](#design-patterns)
8. [Summary](#summary)

---

## The Key Insight

```mermaid
graph LR
    subgraph "What You Think About"
        E[Entity Types:<br/>USER, POST, LIKE]
    end

    subgraph "What Actually Exists"
        R[Rows in One Table<br/>with PK, SK, attributes]
    end

    subgraph "How AWS Distributes"
        S[Auto-sharded across<br/>physical servers]
    end

    E -->|Helps organize| R
    R -->|AWS hashes PK| S

    style E fill:#87CEEB
    style R fill:#FFD700
    style S fill:#90EE90
```

**Core Truth:**
- **Entities** = Logical concept to help YOU organize (not a database feature)
- **Rows** = Physical reality (one big table of items)
- **Partitions** = AWS-managed servers (you never touch these)

---

## Entities: Your Logical Organization

### The Mental Model (How We Think)

```mermaid
erDiagram
    USER_PROFILE ||--o{ POST : owns
    USER_PROFILE ||--o{ FOLLOW : follows
    POST ||--o{ LIKE : receives
    POST ||--o{ COMMENT : receives

    USER_PROFILE {
        uuid id
        string email
        string username
        string handle
        int postsCount
    }

    POST {
        uuid id
        uuid userId
        string imageUrl
        string caption
        int likesCount
    }

    LIKE {
        uuid userId
        uuid postId
        timestamp createdAt
    }

    COMMENT {
        uuid id
        uuid postId
        uuid userId
        string content
    }
```

**This diagram is conceptual!** It helps us design and think, but DynamoDB doesn't have these "tables."

### Entities as Naming Conventions

```mermaid
flowchart TB
    subgraph "Entity Pattern (Your Design Choice)"
        P1[Partition Key Pattern]
        P2[Sort Key Pattern]
        P3[entityType Attribute]
    end

    P1 -->|Example| E1[USER#alice<br/>USER#bob<br/>POST#abc]
    P2 -->|Example| E2[PROFILE<br/>POST#timestamp<br/>LIKE#userId]
    P3 -->|Example| E3[USER_PROFILE<br/>POST<br/>LIKE<br/>COMMENT]

    E1 --> Result[These conventions<br/>create 'entities'<br/>in your mind]
    E2 --> Result
    E3 --> Result

    style Result fill:#FFD700
```

**Key Point:** `entityType: "POST"` is just a string attribute you add. DynamoDB doesn't care about it - it's for YOUR code to understand what type of data it is.

---

## Physical Reality: One Flat Table

### What DynamoDB Actually Stores

```mermaid
graph TB
    subgraph "DynamoDB Table: tamafriends-local"
        direction TB
        R1["Row 1:<br/>PK=USER#alice<br/>SK=PROFILE<br/>entityType=USER_PROFILE<br/>email=alice@example.com<br/>name=Alice"]

        R2["Row 2:<br/>PK=USER#alice<br/>SK=POST#2024-01-15#abc<br/>entityType=POST<br/>imageUrl=https://...<br/>caption=Sunset"]

        R3["Row 3:<br/>PK=USER#bob<br/>SK=PROFILE<br/>entityType=USER_PROFILE<br/>email=bob@example.com<br/>name=Bob"]

        R4["Row 4:<br/>PK=POST#abc<br/>SK=LIKE#bob<br/>entityType=LIKE<br/>userId=bob<br/>postId=abc"]

        R5["Row 5:<br/>PK=POST#abc<br/>SK=COMMENT#2024-01-16#xyz<br/>entityType=COMMENT<br/>content=Great photo!"]

        R6["Row ...<br/>PK=...<br/>SK=...<br/>..."]
    end

    Note[All entity types<br/>mixed together<br/>in one table]

    R1 -.-> Note
    R2 -.-> Note
    R3 -.-> Note
    R4 -.-> Note
    R5 -.-> Note

    style Note fill:#FFB6C1
```

### Table Structure: The Reality

**Conceptual view of actual storage:**

| PK | SK | entityType | email | name | imageUrl | caption | userId | postId | content | ... |
|----|-------|------------|-------|------|----------|---------|--------|--------|---------|-----|
| USER#alice | PROFILE | USER_PROFILE | alice@... | Alice | - | - | - | - | - | ... |
| USER#alice | POST#2024-01-15#abc | POST | - | - | https://... | Sunset | - | - | - | ... |
| USER#bob | PROFILE | USER_PROFILE | bob@... | Bob | - | - | - | - | - | ... |
| POST#abc | LIKE#bob | LIKE | - | - | - | - | bob | abc | - | ... |
| POST#abc | COMMENT#2024-01-16#xyz | COMMENT | - | - | - | - | - | abc | Great! | ... |

**Notice:**
- One flat table with all entity types
- Different rows have different attributes (sparse)
- `entityType` is just another attribute (not special to DynamoDB)

### Visualization: Flat Storage

```mermaid
flowchart TB
    subgraph "Your Code Creates These Objects"
        O1[const userProfile = new UserProfile]
        O2[const post = new Post]
        O3[const like = new Like]
    end

    O1 -->|SDK writes| DB
    O2 -->|SDK writes| DB
    O3 -->|SDK writes| DB

    subgraph "DynamoDB Stores As"
        DB[(Rows with:<br/>PK, SK,<br/>and attributes)]
    end

    DB -->|SDK reads| Q1[Query returns items]
    Q1 -->|Your code maps| M1[Back to entity objects]

    style O1 fill:#87CEEB
    style O2 fill:#87CEEB
    style O3 fill:#87CEEB
    style DB fill:#FFD700
```

---

## AWS Auto-Sharding Explained

### The Hash Function (Black Box)

```mermaid
flowchart LR
    subgraph "Your Writes"
        W1[PK: USER#alice]
        W2[PK: USER#bob]
        W3[PK: POST#abc]
        W4[PK: USER#charlie]
    end

    W1 --> H{AWS Hash Function<br/>Consistent Hashing}
    W2 --> H
    W3 --> H
    W4 --> H

    H -->|Hash result 1| P1[Physical Partition 1]
    H -->|Hash result 2| P2[Physical Partition 2]
    H -->|Hash result 3| P3[Physical Partition 3]

    P1 --> S1[Stores certain PKs]
    P2 --> S2[Stores different PKs]
    P3 --> S3[Stores more PKs]

    style H fill:#FFD700
    style P1 fill:#90EE90
    style P2 fill:#90EE90
    style P3 fill:#90EE90
```

**You NEVER know or control which partition!** AWS handles this automatically.

### How Items Get Distributed

```mermaid
graph TB
    subgraph "Your Data (Logical View)"
        direction TB
        A1[Alice's Profile]
        A2[Alice's Post 1]
        A3[Alice's Post 2]
        B1[Bob's Profile]
        B2[Bob's Post 1]
        L1[Like on Alice's post]
    end

    subgraph "Physical Distribution (AWS Managed)"
        direction LR

        subgraph "Server in Virginia"
            V1[USER#alice → PROFILE]
            V2[USER#alice → POST#...]
            V3[USER#alice → POST#...]
        end

        subgraph "Server in Ohio"
            O1[USER#bob → PROFILE]
            O2[USER#bob → POST#...]
        end

        subgraph "Server in Oregon"
            OR1[POST#abc → LIKE#bob]
        end
    end

    A1 -.AWS decides.-> V1
    A2 -.AWS decides.-> V2
    A3 -.AWS decides.-> V3
    B1 -.AWS decides.-> O1
    B2 -.AWS decides.-> O2
    L1 -.AWS decides.-> OR1

    style V1 fill:#90EE90
    style O1 fill:#FFD700
    style OR1 fill:#FFB6C1
```

### Same PK = Same Physical Partition

```mermaid
flowchart TB
    subgraph "Items with PK=USER#alice"
        I1[SK: PROFILE]
        I2[SK: POST#2024-01-10#xyz]
        I3[SK: POST#2024-01-15#abc]
        I4[SK: POST#2024-01-20#def]
    end

    I1 --> Group[All stored together<br/>on same physical server]
    I2 --> Group
    I3 --> Group
    I4 --> Group

    Group --> Benefit1[✅ Fast queries]
    Group --> Benefit2[✅ One network hop]
    Group --> Benefit3[✅ Pre-sorted by SK]

    style Group fill:#90EE90
    style Benefit1 fill:#87CEEB
    style Benefit2 fill:#87CEEB
    style Benefit3 fill:#87CEEB
```

**This is why you design PK carefully!** Related data should share the same PK.

### Distribution Strategy

```mermaid
stateDiagram-v2
    [*] --> WriteItem: App writes item
    WriteItem --> HashPK: AWS hashes PK
    HashPK --> DeterminePartition: Find partition
    DeterminePartition --> StoreItem: Write to server
    StoreItem --> Replicate: Replicate to 3 AZs
    Replicate --> [*]: Complete

    note right of HashPK
        Consistent hashing ensures
        same PK always goes to
        same partition
    end note

    note right of Replicate
        AWS automatically replicates
        to 3 availability zones
        for durability
    end note
```

---

## What You Control vs What AWS Controls

### Responsibility Matrix

```mermaid
flowchart TB
    subgraph "Your Responsibilities"
        Y1[Design PK/SK patterns]
        Y2[Choose entity naming]
        Y3[Design access patterns]
        Y4[Create GSI structure]
        Y5[Write queries]
    end

    subgraph "AWS Handles Automatically"
        A1[Hash function]
        A2[Physical servers]
        A3[Partition splitting]
        A4[Load balancing]
        A5[Replication]
        A6[Failover]
        A7[Scaling]
    end

    Y1 -.Enables.-> A1
    Y3 -.Enables.-> A4
    Y4 -.Triggers.-> A5

    style Y1 fill:#87CEEB
    style Y2 fill:#87CEEB
    style Y3 fill:#87CEEB
    style A1 fill:#90EE90
    style A2 fill:#90EE90
    style A3 fill:#90EE90
```

### The Division of Labor

| Aspect | You Decide | AWS Manages |
|--------|-----------|-------------|
| **Partition Key** | ✅ Choose pattern (USER#..., POST#...) | ✅ Hash to determine server |
| **Sort Key** | ✅ Choose pattern (PROFILE, POST#...) | ✅ Sort order on disk |
| **Entity Types** | ✅ Define conventions | ❌ (AWS doesn't know about this) |
| **Physical Servers** | ❌ Never touch | ✅ Provision and manage |
| **Data Distribution** | ❌ Can't control | ✅ Automatic sharding |
| **Scaling** | ❌ Not needed | ✅ Auto-scales partitions |
| **Replication** | ❌ Not your concern | ✅ 3-way replication |
| **Backups** | ✅ Enable/schedule | ✅ Handles mechanics |

### What Happens Behind the Scenes

```mermaid
sequenceDiagram
    participant You as Your Application
    participant API as DynamoDB API
    participant Router as Partition Router
    participant Server as Physical Server
    participant Replica as Replica Servers

    You->>API: PutItem(PK=USER#alice, ...)
    API->>Router: Hash PK
    Router->>Router: Calculate: hash("USER#alice") % partitions
    Router->>Server: Route to Partition 42
    Server->>Server: Store item

    par Automatic Replication
        Server->>Replica: Replicate to AZ-1
        Server->>Replica: Replicate to AZ-2
        Server->>Replica: Replicate to AZ-3
    end

    Server-->>API: Write confirmed
    API-->>You: Success

    rect rgb(144, 238, 144)
        Note over Router,Replica: All of this is automatic!<br/>You just write and read.
    end
```

---

## How Queries Work

### Query: Get User's Posts

```mermaid
sequenceDiagram
    participant Code as Your Code
    participant SDK as AWS SDK
    participant Router as Partition Router
    participant Server as Physical Server

    Code->>SDK: Query(PK=USER#alice, SK begins_with POST#)
    SDK->>Router: Hash USER#alice
    Router->>Router: Result: Partition 42
    Router->>Server: Forward query to Partition 42

    Note over Server: Server knows all items<br/>with PK=USER#alice<br/>are stored together

    Server->>Server: Scan items where SK starts with POST#
    Server-->>Router: [3 POST items found]
    Router-->>SDK: Results
    SDK-->>Code: [Post 1, Post 2, Post 3]

    rect rgb(144, 238, 144)
        Note right of Server: Efficient!<br/>One partition,<br/>data co-located,<br/>pre-sorted by SK
    end
```

### Query Performance Benefits

```mermaid
flowchart TB
    Q[Query: PK=USER#alice]

    Q --> H[AWS hashes PK]
    H --> P[Determines: Partition 42]
    P --> S[Server reads local data]

    S --> B1[✅ Single server<br/>One network hop]
    S --> B2[✅ Data co-located<br/>No scatter-gather]
    S --> B3[✅ Pre-sorted by SK<br/>No sorting needed]

    B1 --> R[Fast response: ~5-10ms]
    B2 --> R
    B3 --> R

    style H fill:#FFD700
    style P fill:#FFD700
    style R fill:#90EE90
```

### Query vs Scan

```mermaid
graph LR
    subgraph "Query (Efficient)"
        Q1[Specify PK] --> Q2[AWS hashes]
        Q2 --> Q3[Routes to ONE partition]
        Q3 --> Q4[Fast: 5-10ms]
    end

    subgraph "Scan (Slow)"
        S1[No PK specified] --> S2[Must check all partitions]
        S2 --> S3[Reads ALL items]
        S3 --> S4[Slow: seconds+]
    end

    style Q4 fill:#90EE90
    style S4 fill:#FFB6C1
```

**Always query by PK when possible!**

---

## Design Patterns

### Pattern 1: Group Related Data by PK

```mermaid
flowchart TB
    subgraph "Good Design: Same PK"
        G1[PK: USER#alice]
        G2[SK: PROFILE]
        G3[SK: POST#2024-01-15#abc]
        G4[SK: POST#2024-01-20#def]
    end

    G1 --> G2
    G1 --> G3
    G1 --> G4

    G2 --> R1[One query gets user<br/>+ all their posts]
    G3 --> R1
    G4 --> R1

    R1 --> B1[✅ Efficient<br/>✅ Co-located<br/>✅ Fast]

    style R1 fill:#90EE90
    style B1 fill:#87CEEB
```

### Pattern 2: Multiple Access Patterns with GSIs

```mermaid
flowchart TB
    subgraph "Base Table Access"
        B1[PK: USER#alice<br/>SK: POST#2024-01-15#abc] -->|Query by user| Q1[Get user's posts]
    end

    subgraph "GSI1 Access"
        G1[GSI1PK: POST#abc<br/>GSI1SK: USER#alice] -->|Query by post ID| Q2[Get post by ID]
    end

    subgraph "Same Physical Item"
        Item[One row in DynamoDB<br/>with both key sets]
    end

    B1 -.Same item.-> Item
    G1 -.Same item.-> Item

    Item --> Result[Two ways to find<br/>the same data!]

    style Item fill:#FFD700
    style Result fill:#90EE90
```

### Pattern 3: Entity Type Filtering

```mermaid
flowchart LR
    Q[Query: PK=USER#alice]

    Q --> R[Returns all items]

    R --> F{Filter in code}

    F -->|entityType=PROFILE| P[Profile data]
    F -->|entityType=POST| O[Posts only]
    F -->|all types| A[Everything]

    style Q fill:#87CEEB
    style R fill:#FFD700
    style P fill:#90EE90
    style O fill:#90EE90
    style A fill:#90EE90
```

### Pattern 4: Hierarchical SK for Sorting

```mermaid
graph TB
    subgraph "Natural Sort Order"
        direction TB
        S1[SK: POST#2024-01-10#xyz]
        S2[SK: POST#2024-01-15#abc]
        S3[SK: POST#2024-01-20#def]
    end

    S1 -->|Older| S2
    S2 -->|Older| S3

    subgraph "Query Result"
        Q[Query: PK=USER#alice<br/>SK begins_with POST#<br/>ScanIndexForward=false]
    end

    Q --> R[Returns in order:<br/>def, abc, xyz<br/>Newest first]

    style Q fill:#87CEEB
    style R fill:#90EE90
```

---

## Summary

### Mental Model vs Reality

```mermaid
flowchart TB
    subgraph "How You Think About It"
        M1[Entities: USER, POST, LIKE]
        M2[Relationships between entities]
        M3[Different 'types' of data]
    end

    subgraph "What Actually Exists"
        R1[Rows in one table]
        R2[PK and SK attributes]
        R3[Mixed entity types]
    end

    subgraph "How AWS Manages It"
        A1[Hash PK to partition]
        A2[Distribute across servers]
        A3[Replicate for durability]
    end

    M1 -.Helps design.-> R1
    M2 -.Helps design.-> R2
    M3 -.Helps design.-> R3

    R1 -->|AWS hashes| A1
    R2 -->|AWS routes| A2
    R3 -->|AWS copies| A3

    style M1 fill:#87CEEB
    style R1 fill:#FFD700
    style A1 fill:#90EE90
```

### Key Takeaways

```mermaid
mindmap
  root((DynamoDB Reality))
    Entities
      Just naming conventions
      Help organize thinking
      Not a database feature
      You define patterns
    Physical Storage
      One flat table
      Rows with PK SK attributes
      All entity types mixed
      Sparse attributes
    AWS Sharding
      Hash function on PK
      Automatic distribution
      You never control
      Scales automatically
    Design Leverage
      Choose PK carefully
      Group related data
      Use SK for sorting
      GSIs for alternate access
```

### The Beautiful Abstraction

| Layer | What It Is | Who Controls |
|-------|-----------|--------------|
| **Application Layer** | Entity objects (User, Post, Like) | ✅ You |
| **Data Model Layer** | PK/SK patterns, entity conventions | ✅ You |
| **DynamoDB Layer** | Rows with attributes | 🤝 Shared interface |
| **Physical Layer** | Servers, partitions, replication | ✅ AWS |

**The magic:** You design the logical structure (entities, keys), AWS handles the physical complexity (sharding, scaling, servers). You get distributed database performance without the operational burden!

### Core Principles

1. **Entities are conceptual** - They help YOU organize, not DynamoDB
2. **One table, all entity types** - Mixed together in flat storage
3. **AWS auto-shards by PK** - You never think about physical partitions
4. **Same PK = co-located** - Your design lever for performance
5. **GSIs = alternate views** - Different keys for different access patterns

---

## Related Documentation

- [DYNAMODB_DESIGN_DEEP_DIVE.md](./DYNAMODB_DESIGN_DEEP_DIVE.md) - Complete design analysis with all patterns
- [packages/dal/docs/GSI_STRATEGY.md](./packages/dal/docs/GSI_STRATEGY.md) - GSI allocation rules
- [FEED_ARCHITECTURE_ANALYSIS.md](./FEED_ARCHITECTURE_ANALYSIS.md) - Feed patterns discussion

---

**Document Version:** 1.0
**Created:** October 2025
**Purpose:** Clarify mental model vs physical reality of DynamoDB single-table design
