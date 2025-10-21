# Zod vs GraphQL: Type System Strategy

**Date**: 2025-10-20
**Question**: Should we reuse Zod schemas or leverage GraphQL's type system?
**Answer**: Use **both**, but for **different purposes** ✅

---

## 🎯 TL;DR: The Hybrid Approach

| Layer | Primary Type System | Purpose | Validation |
|-------|-------------------|---------|------------|
| **GraphQL Server** | GraphQL Schema + Zod | Type definition + Runtime validation | Zod validates inputs |
| **Frontend Types** | GraphQL (generated or manual) | Type safety for queries/mutations | None (trust GraphQL) |
| **Shared Validation Logic** | Zod (in `/packages/shared`) | Business rules + constraints | Reuse across REST & GraphQL |

**Key Insight**: GraphQL handles **structure**, Zod handles **business rules**.

---

## 📊 Current State Analysis

### What You Have Now (REST + Zod)

```typescript
// /packages/shared/src/schemas/auction.schema.ts

export const CreateAuctionRequestSchema = z.object({
  title: AuctionTitleField,           // min 3, max 200
  description: AuctionDescriptionField, // max 2000
  startPrice: PriceField,              // positive, 2 decimals
  reservePrice: OptionalPriceField,
  startTime: TimestampField,
  endTime: TimestampField,
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});
```

**Benefits**:
- ✅ Business rules enforced (e.g., "endTime > startTime")
- ✅ Shared between frontend validation & backend validation
- ✅ Runtime validation catches invalid data
- ✅ Great error messages

### What GraphQL Gives You

```graphql
input CreateAuctionInput {
  title: String!              # Required, but no length constraints
  description: String         # Optional, but no max length
  startPrice: Float!          # Required, but no positive constraint
  reservePrice: Float
  startTime: DateTime!
  endTime: DateTime!
}
```

**Benefits**:
- ✅ Type safety at compile time
- ✅ Auto-generated TypeScript types
- ✅ Single source of truth for API shape
- ✅ Self-documenting (GraphQL Playground)

**Limitations**:
- ❌ No business rule validation (can't enforce "endTime > startTime")
- ❌ No min/max constraints (can't enforce "title min 3 chars")
- ❌ No custom error messages
- ❌ No decimal precision constraints

---

## 🏗️ Recommended Architecture

### 1. GraphQL Schema (Structure)

**File**: `/packages/graphql-server/src/schema/typeDefs.ts`

```graphql
input CreateAuctionInput {
  title: String!
  description: String
  fileType: String!
  startPrice: Float!
  reservePrice: Float
  startTime: DateTime!
  endTime: DateTime!
}

type Auction {
  id: ID!
  title: String!
  description: String
  # ... etc
}
```

**Purpose**: Define the **structure** and **types** of your API.

---

### 2. Zod Schemas (Business Rules)

**File**: `/packages/shared/src/schemas/auction.schema.ts` (keep as-is!)

```typescript
export const AuctionTitleField = z
  .string()
  .min(3, 'Title must be at least 3 characters')
  .max(200, 'Title must not exceed 200 characters')
  .trim();

export const CreateAuctionRequestSchema = z.object({
  title: AuctionTitleField,
  description: AuctionDescriptionField,
  startPrice: PriceField,
  // ...
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});
```

**Purpose**: Define **business rules** and **validation constraints**.

---

### 3. GraphQL Resolver (Validation Layer)

**File**: `/packages/graphql-server/src/schema/resolvers/Mutation.ts`

```typescript
import { CreateAuctionRequestSchema } from '@social-media-app/shared';
import { GraphQLError } from 'graphql';

const resolvers = {
  Mutation: {
    createAuction: async (
      _parent: unknown,
      { input }: { input: any },
      context: Context
    ) => {
      // ✅ VALIDATE with Zod (business rules)
      const result = CreateAuctionRequestSchema.safeParse(input);

      if (!result.success) {
        throw new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: result.error.format(),
          },
        });
      }

      // ✅ Proceed with validated data
      const validatedInput = result.data;

      // Call DAL service
      const auction = await context.auctionService.createAuction({
        userId: context.userId!,
        ...validatedInput,
      });

      return { auction, uploadUrl: '...' };
    },
  },
};
```

**Benefits**:
- ✅ Reuses existing Zod schemas
- ✅ Same validation logic as REST API
- ✅ Catches invalid data before hitting DAL
- ✅ Returns structured GraphQL errors

---

### 4. Frontend Types (GraphQL-Generated)

**Option A: Manual Types** (what we're doing now)

```typescript
// /packages/frontend/src/graphql/operations/auctions.ts

export type CreateAuctionInput = {
  title: string;
  description?: string;
  fileType: string;
  startPrice: number;
  reservePrice?: number;
  startTime: string;
  endTime: string;
};

export const CREATE_AUCTION = `
  mutation CreateAuction($input: CreateAuctionInput!) {
    createAuction(input: $input) {
      auction { id title ... }
      uploadUrl
    }
  }
` as const;
```

**Option B: Auto-Generated Types** (future enhancement)

```bash
# Install GraphQL Code Generator
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations

# codegen.yml
schema: 'http://localhost:4000/graphql'
documents: 'src/graphql/operations/**/*.ts'
generates:
  src/graphql/generated/types.ts:
    plugins:
      - typescript
      - typescript-operations
```

---

## 🔄 How It All Fits Together

### Data Flow: Frontend → GraphQL → DAL

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                        │
│                                                                 │
│  const input: CreateAuctionInput = {                           │
│    title: 'Vintage Watch',                                     │
│    startPrice: 100,                                             │
│    endTime: '2024-01-01T00:00:00Z',  // Could be invalid!     │
│    startTime: '2024-01-08T00:00:00Z', // Oops! After endTime  │
│  };                                                             │
│                                                                 │
│  // TypeScript: ✅ Compiles (types match)                      │
│  await client.mutate(CREATE_AUCTION, { input });               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ GRAPHQL SERVER                                                  │
│                                                                 │
│  createAuction(input: CreateAuctionInput!) {                   │
│    // ✅ Zod validation catches business rule violation        │
│    const result = CreateAuctionRequestSchema.safeParse(input); │
│                                                                 │
│    if (!result.success) {                                       │
│      throw GraphQLError('Validation failed', {                 │
│        extensions: {                                            │
│          code: 'BAD_USER_INPUT',                               │
│          validationErrors: {                                    │
│            endTime: 'End time must be after start time'        │
│          }                                                      │
│        }                                                        │
│      });                                                        │
│    }                                                            │
│                                                                 │
│    // ❌ Never reaches DAL - validation failed                 │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Recommended Pattern: Zod → GraphQL Schema Generation

**Problem**: Maintaining both Zod schemas AND GraphQL schemas is duplicative.

**Solution**: Generate GraphQL schema from Zod (or vice versa).

### Approach 1: Zod as Source of Truth (Recommended)

**Install**: `zod-to-graphql` or similar

```typescript
// /packages/graphql-server/src/schema/generated.ts

import { zodToGraphQL } from 'zod-to-graphql';
import { CreateAuctionRequestSchema, AuctionSchema } from '@social-media-app/shared';

// Generate GraphQL types from Zod
export const AuctionInputType = zodToGraphQL(
  CreateAuctionRequestSchema,
  'CreateAuctionInput'
);

export const AuctionType = zodToGraphQL(
  AuctionSchema.omit({ winnerId: true }), // Exclude internal fields
  'Auction'
);
```

**Benefits**:
- ✅ Single source of truth (Zod)
- ✅ Business rules baked into GraphQL schema documentation
- ✅ No manual sync needed
- ✅ Validation happens automatically

**Caveats**:
- ⚠️ Complex refinements might not translate well
- ⚠️ Need to handle GraphQL-specific features (resolvers, dataloaders)

---

## 📝 Recommended Strategy for Your Project

### Phase 1: Keep Both (Current Approach) ✅

**What to do**:
1. ✅ Keep Zod schemas in `/packages/shared/src/schemas/`
2. ✅ Manually define GraphQL types in frontend operations
3. ✅ Validate with Zod in GraphQL resolvers
4. ✅ Frontend trusts GraphQL responses (no validation)

**Why**:
- Easy to implement
- Reuses existing Zod validation logic
- No new dependencies
- Low risk

**Files to update**:
```
/packages/graphql-server/src/schema/resolvers/Mutation.ts
  ↓
Add Zod validation in createAuction, placeBid, etc.

/packages/frontend/src/graphql/operations/auctions.ts
  ↓
Manual types (already done!)
```

---

### Phase 2: Add Frontend Validation (Optional)

**When**: If you want **client-side** validation before sending to server

```typescript
// /packages/frontend/src/services/implementations/AuctionService.graphql.ts

import { CreateAuctionRequestSchema } from '@social-media-app/shared';

export class AuctionService implements IAuctionService {
  async createAuction(input: CreateAuctionInput): Promise<AsyncState<...>> {
    // ✅ Client-side validation (instant feedback)
    const validation = CreateAuctionRequestSchema.safeParse(input);

    if (!validation.success) {
      return {
        status: 'error',
        error: {
          message: 'Validation failed',
          extensions: {
            code: 'VALIDATION_ERROR',
            details: validation.error.format(),
          },
        },
      };
    }

    // ✅ Send to GraphQL (server validates again)
    return this.client.mutate(CREATE_AUCTION, { input });
  }
}
```

**Benefits**:
- ✅ Instant user feedback (no server round-trip)
- ✅ Same validation logic as server
- ✅ Better UX

**Trade-offs**:
- ⚠️ Bundle size increases (Zod in frontend)
- ⚠️ Duplicate validation (client + server)

---

### Phase 3: GraphQL Code Generation (Future)

**When**: After GraphQL is stable and proven

**Benefits**:
- ✅ Auto-generated TypeScript types
- ✅ No manual type definitions
- ✅ Always in sync with schema

**Example**:
```typescript
// Generated file: /packages/frontend/src/graphql/generated/types.ts

export type CreateAuctionMutation = {
  __typename?: 'Mutation';
  createAuction: {
    __typename?: 'CreateAuctionPayload';
    auction: {
      __typename?: 'Auction';
      id: string;
      title: string;
      // ... all fields auto-generated
    };
    uploadUrl: string;
  };
};

export type CreateAuctionMutationVariables = {
  input: CreateAuctionInput;
};
```

---

## 🎓 Summary: What to Use Where

| Scenario | Use | Example |
|----------|-----|---------|
| **GraphQL Schema Definition** | GraphQL SDL | `type Auction { id: ID! ... }` |
| **Business Rule Validation** | Zod | `title: z.string().min(3).max(200)` |
| **Frontend Types** | Manual (now) → Generated (later) | `export type Auction = { ... }` |
| **Resolver Validation** | Zod | `CreateAuctionRequestSchema.parse(input)` |
| **Client-side Validation** | Zod (optional) | `schema.safeParse(formData)` |
| **Response Validation** | None (trust GraphQL) | GraphQL guarantees shape |

---

## 🚀 Action Items for Phase 2

1. **Update GraphQL resolvers to use Zod validation**
   - File: `/packages/graphql-server/src/schema/resolvers/Mutation.ts`
   - Import: `CreateAuctionRequestSchema` from `@social-media-app/shared`
   - Validate before calling DAL

2. **Keep using existing Zod schemas** ✅
   - No changes needed in `/packages/shared/src/schemas/`
   - These are now the source of truth for business rules

3. **Frontend types stay manual** (for now)
   - Continue with `/packages/frontend/src/graphql/operations/auctions.ts`
   - Consider GraphQL Code Generator in Phase 3

4. **Update migration plan**
   - Document the Zod + GraphQL hybrid approach
   - Add resolver validation examples

---

## 🔗 Resources

- **Zod**: https://zod.dev/
- **GraphQL Validation**: https://graphql.org/learn/validation/
- **GraphQL Code Generator**: https://the-guild.dev/graphql/codegen
- **Zod to GraphQL**: https://github.com/MakeNowJust/zod-to-graphql

---

**Decision**: Keep using Zod for business rules, leverage GraphQL for structure. Best of both worlds! 🎯
