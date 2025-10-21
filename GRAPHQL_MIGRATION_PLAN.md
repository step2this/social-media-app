# GraphQL Migration Plan: Type-Safe Client with Dependency Injection

**Date**: 2025-10-20
**Status**: Planning Phase
**Approach**: TDD + Advanced TypeScript + DI Pattern

---

## 🎯 Executive Summary

**Objective**: Migrate frontend from REST API → GraphQL using type-safe client with dependency injection pattern (no spies, behavior-focused testing).

**Core Principles**:
1. ✅ **Dependency Injection**: Interface-based abstractions, no implementation details in tests
2. ✅ **Advanced TypeScript**: Discriminated unions, conditional types, mapped types, type guards
3. ✅ **Strict TDD**: Red-Green-Refactor, test-first discipline, comprehensive coverage
4. ✅ **Behavior Testing**: Test contracts, not implementations (NO spies, NO vi.mock for business logic)
5. ✅ **Battle-tested Foundation**: Use `graphql-request` library, wrapped in our DI interface

**Why graphql-request?**
- ✅ Minimal & lightweight (~5KB) - saves ~200 lines of custom HTTP code
- ✅ TypeScript-first with excellent type inference
- ✅ Promise-based (perfect for async/await patterns)
- ✅ Easy to wrap in DI interfaces (no framework lock-in)
- ✅ Battle-tested (7k+ GitHub stars, used in production by thousands)
- ✅ Future-proof: Easy to swap to Relay/Apollo later if needed

**Zod + GraphQL Hybrid Strategy:**
- ✅ **GraphQL defines structure** (types, fields, required/optional)
- ✅ **Zod enforces business rules** (min/max lengths, price constraints, custom validations)
- ✅ **Server validates with Zod** before calling DAL (catches invalid data early)
- ✅ **Frontend trusts GraphQL** responses (no validation needed)
- ✅ **Shared schemas in `/packages/shared`** (reused across REST & GraphQL)

See `/ZOD_VS_GRAPHQL_STRATEGY.md` for detailed explanation.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                          │
│                                                                 │
│  Components depend on IServiceContainer (DI)                   │
│  ✅ NO direct hook dependencies                                │
│  ✅ NO direct API client dependencies                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SERVICE CONTAINER (DI)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  IServiceContainer                                       │  │
│  │  • authService: IAuthService                            │  │
│  │  • navigationService: INavigationService                │  │
│  │  • modalService: IModalService                          │  │
│  │  • notificationService: INotificationService            │  │
│  │  • graphqlClient: IGraphQLClient ← NEW                  │  │
│  │  • auctionService: IAuctionService ← NEW                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               GRAPHQL CLIENT (Interface-Based)                  │
│                                                                 │
│  interface IGraphQLClient {                                    │
│    query<TData>(query: string, vars: unknown): Promise<...>   │
│    mutate<TData>(mutation: string, vars: unknown): Promise<...>│
│    setAuthToken(token: string): void                           │
│  }                                                              │
│                                                                 │
│  ✅ Production: RealGraphQLClient                              │
│  ✅ Testing: MockGraphQLClient (implements same interface)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴🟢🔵 Phase Breakdown

### Phase 1: GraphQL Client Infrastructure (TDD) 🔴
**Goal**: Create type-safe GraphQL client with DI pattern

**Files to Create**:
1. `/packages/frontend/src/graphql/types.ts` - Advanced TypeScript types
2. `/packages/frontend/src/graphql/interfaces/IGraphQLClient.ts` - Client interface
3. `/packages/frontend/src/graphql/client.ts` - Real implementation
4. `/packages/frontend/src/graphql/client.mock.ts` - Test implementation
5. `/packages/frontend/src/graphql/__tests__/types.test.ts` - Type tests
6. `/packages/frontend/src/graphql/__tests__/client.test.ts` - Behavior tests

---

### Phase 2: GraphQL Operations & Type Generation 🟢
**Goal**: Define type-safe operations with code generation

**Files to Create**:
1. `/packages/frontend/src/graphql/operations/auctions.ts` - Auction queries/mutations
2. `/packages/frontend/src/graphql/operations/posts.ts` - Post queries/mutations
3. `/packages/frontend/src/graphql/codegen.yml` - GraphQL Code Generator config
4. `/packages/frontend/src/graphql/__tests__/operations.test.ts` - Operation type tests

---

### Phase 3: Service Layer Migration (One at a Time) 🔵
**Goal**: Migrate services incrementally with full test coverage

**Migration Order**:
1. Auction Service (pilot migration)
2. Post Service
3. Like Service
4. Comment Service
5. Follow Service
6. Profile Service

**Pattern for Each Service**:
1. Create interface: `IAuctionService`
2. Create GraphQL implementation: `AuctionService.graphql.ts`
3. Create mock implementation: `AuctionService.mock.ts`
4. Write behavior tests (NO spies)
5. Update ServiceContainer
6. Update hooks to use DI

---

### Phase 4: Integration & Cleanup 🎯
**Goal**: Remove REST dependencies, finalize migration

**Tasks**:
1. Remove REST API client
2. Update all hooks to use GraphQL services
3. Remove old REST service implementations
4. Update integration tests
5. Performance optimization

---

## 📝 Detailed Implementation: Phase 1

### File 1: GraphQL Types (`types.ts`)

#### Advanced TypeScript Patterns to Implement:

**1. Discriminated Union for Async State**
```typescript
/**
 * Async state machine using discriminated union
 * Enables exhaustive type narrowing in switch statements
 */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: GraphQLError };
```

**2. Conditional Types for Operation Extraction**
```typescript
/**
 * Extract variables from GraphQL operation type
 */
export type ExtractVariables<T> = T extends GraphQLOperation<
  any,
  infer V,
  any,
  any
>
  ? V
  : never;

/**
 * Extract response from GraphQL operation type
 */
export type ExtractResponse<T> = T extends GraphQLOperation<
  any,
  any,
  infer R,
  any
>
  ? R
  : never;
```

**3. Type Guards (NOT Spies!)**
```typescript
/**
 * Type guard for success state
 * Used for type narrowing, not spying
 */
export function isSuccess<T>(
  state: AsyncState<T>
): state is Extract<AsyncState<T>, { status: 'success' }> {
  return state.status === 'success';
}
```

**4. Assertion Functions**
```typescript
/**
 * Assert success state, throw if not
 */
export function assertSuccess<T>(
  state: AsyncState<T>
): asserts state is Extract<AsyncState<T>, { status: 'success' }> {
  if (!isSuccess(state)) {
    throw new Error(`Expected success, got: ${state.status}`);
  }
}
```

#### TDD Approach for Types:

**RED**: Write Type Tests First
```typescript
import { describe, test, expectTypeOf } from 'vitest';

describe('GraphQL Type System', () => {
  test('AsyncState success has data property', () => {
    type State = AsyncState<string>;
    type SuccessState = Extract<State, { status: 'success' }>;

    expectTypeOf<SuccessState>().toHaveProperty('data');
    expectTypeOf<SuccessState['data']>().toBeString();
  });

  test('ExtractResponse extracts correct type', () => {
    type Op = GraphQLQuery<'test', {}, { user: User }>;
    type Response = ExtractResponse<Op>;

    expectTypeOf<Response>().toEqualTypeOf<{ user: User }>();
  });
});
```

**GREEN**: Implement Types (see above)

**REFACTOR**: Add TSDoc, optimize inference

---

### File 2: GraphQL Client Interface (`interfaces/IGraphQLClient.ts`)

#### DI Pattern: Interface-First Design

```typescript
/**
 * GraphQL client interface for dependency injection
 *
 * ✅ Components depend on THIS interface
 * ✅ Tests inject MockGraphQLClient
 * ✅ Production injects RealGraphQLClient
 *
 * @example
 * ```typescript
 * // Component receives interface, not implementation
 * function useAuctions(client: IGraphQLClient) {
 *   const result = await client.query<AuctionData>(QUERY, vars);
 *   if (isSuccess(result)) {
 *     return result.data;
 *   }
 * }
 * ```
 */
export interface IGraphQLClient {
  /**
   * Execute GraphQL query
   * @returns AsyncState discriminated union
   */
  query<TData>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>>;

  /**
   * Execute GraphQL mutation
   * @returns AsyncState discriminated union
   */
  mutate<TData>(
    mutation: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>>;

  /**
   * Set authentication token for requests
   */
  setAuthToken(token: string): void;

  /**
   * Clear authentication token
   */
  clearAuthToken(): void;
}
```

**Why This Matters**:
- ✅ Tests inject `MockGraphQLClient` implementing this interface
- ✅ No spies needed - mock has same shape as real client
- ✅ Tests focus on **behavior** (does query get called with right args?)
- ✅ NOT implementation (how does fetch work internally?)

---

### File 3: Real GraphQL Client (`client.ts`)

#### Production Implementation (Using `graphql-request`)

**First, install the dependency:**
```bash
pnpm --filter @social-media-app/frontend add graphql graphql-request
```

**Then, wrap it in our DI interface:**
```typescript
import { GraphQLClient as GQLRequestClient, ClientError } from 'graphql-request';
import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';
import type { AsyncState, GraphQLError } from './types.js';

/**
 * Production GraphQL client implementation
 *
 * Wraps graphql-request library with our DI interface and AsyncState pattern
 *
 * Benefits:
 * ✅ Battle-tested HTTP layer (graphql-request)
 * ✅ Our custom AsyncState error handling
 * ✅ DI-friendly interface
 * ✅ Easy to swap implementations (e.g., to Relay later)
 */
export class GraphQLClient implements IGraphQLClient {
  private gqlClient: GQLRequestClient;
  private authToken: string | null = null;

  constructor(
    private readonly endpoint: string,
    private readonly defaultHeaders: Record<string, string> = {}
  ) {
    this.gqlClient = new GQLRequestClient(endpoint, {
      headers: defaultHeaders
    });
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    // Update client headers with new token
    this.updateHeaders();
  }

  clearAuthToken(): void {
    this.authToken = null;
    // Update client headers to remove token
    this.updateHeaders();
  }

  async query<TData>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<AsyncState<TData>> {
    return this.request<TData>(query, variables);
  }

  async mutate<TData>(
    mutation: string,
    variables: Record<string, unknown> = {}
  ): Promise<AsyncState<TData>> {
    return this.request<TData>(mutation, variables);
  }

  /**
   * Internal request handler that wraps graphql-request errors in AsyncState
   */
  private async request<TData>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    try {
      // graphql-request handles the HTTP request
      const data = await this.gqlClient.request<TData>(query, variables);

      return { status: 'success', data };
    } catch (error) {
      // Transform graphql-request errors to our GraphQLError format
      if (error instanceof ClientError) {
        // GraphQL errors (e.g., validation, resolver errors)
        const gqlError = error.response.errors?.[0];

        const graphqlError: GraphQLError = {
          message: gqlError?.message || error.message,
          extensions: gqlError?.extensions || { code: 'GRAPHQL_ERROR' },
          path: gqlError?.path
        };

        return { status: 'error', error: graphqlError };
      }

      // Network errors or other exceptions
      const graphqlError: GraphQLError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        extensions: { code: 'NETWORK_ERROR' }
      };

      return { status: 'error', error: graphqlError };
    }
  }

  /**
   * Update graphql-request client headers when auth token changes
   */
  private updateHeaders(): void {
    const headers: Record<string, string> = {
      ...this.defaultHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Recreate client with updated headers
    this.gqlClient = new GQLRequestClient(this.endpoint, { headers });
  }
}

/**
 * Factory for creating production client
 */
export function createGraphQLClient(
  endpoint?: string
): IGraphQLClient {
  return new GraphQLClient(
    endpoint || import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql'
  );
}
```

**Why This Approach Works:**
- ✅ **Only ~70 lines** instead of ~150+ with custom fetch implementation
- ✅ **Battle-tested**: `graphql-request` handles edge cases we'd miss
- ✅ **DI-friendly**: Easy to inject/mock - our interface stays the same
- ✅ **Type-safe**: Full TypeScript support with great inference
- ✅ **Future-proof**: Easy to swap to Relay/Apollo later (just change implementation)
- ✅ **Maintains patterns**: AsyncState, error handling, auth injection all preserved

**Alternative: Custom Implementation (If You Want Full Control)**

If you prefer not to use `graphql-request`, here's the pure fetch implementation:

```typescript
import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';
import type { AsyncState, GraphQLError } from './types.js';

/**
 * Custom GraphQL client implementation (no dependencies)
 */
export class GraphQLClient implements IGraphQLClient {
  private authToken: string | null = null;

  constructor(
    private readonly endpoint: string,
    private readonly defaultHeaders: Record<string, string> = {}
  ) {}

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  async query<TData>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    return this.request<TData>(query, variables);
  }

  async mutate<TData>(
    mutation: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    return this.request<TData>(mutation, variables);
  }

  private async request<TData>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.defaultHeaders
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables })
      });

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        const error: GraphQLError = {
          message: json.errors[0].message,
          extensions: json.errors[0].extensions,
          path: json.errors[0].path
        };
        return { status: 'error', error };
      }

      return { status: 'success', data: json.data };

    } catch (error) {
      const graphqlError: GraphQLError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        extensions: { code: 'NETWORK_ERROR' }
      };
      return { status: 'error', error: graphqlError };
    }
  }
}

export function createGraphQLClient(
  endpoint?: string
): IGraphQLClient {
  return new GraphQLClient(
    endpoint || import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql'
  );
}
```

**Recommendation**: Use `graphql-request` approach unless you have specific reasons not to.

---

### File 4: Mock GraphQL Client (`client.mock.ts`)

#### Test Implementation (DI Pattern)

```typescript
import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';
import type { AsyncState } from './types.js';

/**
 * Mock GraphQL client for testing
 *
 * ✅ Implements same interface as real client
 * ✅ NO spies - just records calls for verification
 * ✅ Configurable responses for different test scenarios
 *
 * @example
 * ```typescript
 * // Test setup
 * const mockClient = new MockGraphQLClient();
 * mockClient.setQueryResponse({ status: 'success', data: mockData });
 *
 * // Run test
 * const service = new AuctionService(mockClient);
 * await service.listAuctions();
 *
 * // Verify behavior
 * expect(mockClient.queryCalls).toHaveLength(1);
 * expect(mockClient.queryCalls[0].query).toContain('ListAuctions');
 * ```
 */
export class MockGraphQLClient implements IGraphQLClient {
  // Call recording (NOT spies - just plain arrays)
  public queryCalls: Array<{ query: string; variables: Record<string, unknown> }> = [];
  public mutateCalls: Array<{ mutation: string; variables: Record<string, unknown> }> = [];
  public authTokens: string[] = [];

  // Configurable responses
  private queryResponse: AsyncState<any> = { status: 'success', data: {} };
  private mutationResponse: AsyncState<any> = { status: 'success', data: {} };

  /**
   * Configure what query() should return
   */
  setQueryResponse<TData>(response: AsyncState<TData>): void {
    this.queryResponse = response;
  }

  /**
   * Configure what mutate() should return
   */
  setMutationResponse<TData>(response: AsyncState<TData>): void {
    this.mutationResponse = response;
  }

  async query<TData>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    // Record the call
    this.queryCalls.push({ query, variables });

    // Return configured response
    return this.queryResponse as AsyncState<TData>;
  }

  async mutate<TData>(
    mutation: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    // Record the call
    this.mutateCalls.push({ mutation, variables });

    // Return configured response
    return this.mutationResponse as AsyncState<TData>;
  }

  setAuthToken(token: string): void {
    this.authTokens.push(token);
  }

  clearAuthToken(): void {
    this.authTokens = [];
  }

  /**
   * Reset all recorded calls (use in beforeEach)
   */
  reset(): void {
    this.queryCalls = [];
    this.mutateCalls = [];
    this.authTokens = [];
  }
}
```

**Key Insight**: This is NOT a spy! It's a real implementation that:
- ✅ Records calls for verification (behavior)
- ✅ Returns configurable responses (test scenarios)
- ✅ Implements the same contract (interface)
- ❌ Doesn't use vi.fn() or vi.spyOn()

---

### File 5: Client Behavior Tests (`__tests__/client.test.ts`)

#### TDD: Test Behavior, Not Implementation

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GraphQLClient } from '../client.js';
import type { AsyncState } from '../types.js';

describe('GraphQLClient Behavior', () => {
  let client: GraphQLClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // ✅ ONLY mock external dependencies (fetch)
    // ❌ NOT internal business logic
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    client = new GraphQLClient('http://localhost:4000/graphql');
  });

  describe('Query Behavior', () => {
    test('RED: should return success state when GraphQL succeeds', async () => {
      const mockData = { getUser: { id: '1', name: 'John' } };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData })
      });

      const result = await client.query('query { getUser { id name } }', {});

      expect(result.status).toBe('success');
      expect(result).toEqual({ status: 'success', data: mockData });
    });

    test('RED: should return error state when GraphQL returns errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{
            message: 'User not found',
            extensions: { code: 'NOT_FOUND' }
          }]
        })
      });

      const result = await client.query('query { getUser { id } }', {});

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('User not found');
        expect(result.error.extensions?.code).toBe('NOT_FOUND');
      }
    });

    test('RED: should handle network errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      const result = await client.query('query { }', {});

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.extensions?.code).toBe('NETWORK_ERROR');
      }
    });
  });

  describe('Authentication Behavior', () => {
    test('RED: should include auth token in requests', async () => {
      client.setAuthToken('test-token-123');

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await client.query('query { }', {});

      const [, requestInit] = fetchMock.mock.calls[0];
      expect(requestInit.headers['Authorization']).toBe('Bearer test-token-123');
    });

    test('RED: should not include auth token after clearing', async () => {
      client.setAuthToken('token');
      client.clearAuthToken();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await client.query('query { }', {});

      const [, requestInit] = fetchMock.mock.calls[0];
      expect(requestInit.headers['Authorization']).toBeUndefined();
    });
  });
});
```

**Notice**:
- ✅ We test **what the client does** (behavior)
- ✅ We mock only external dependencies (fetch)
- ❌ We DON'T spy on internal methods
- ❌ We DON'T test implementation details

---

## 📝 Zod Validation in GraphQL Resolvers

### Pattern: Validate with Zod, Then Call DAL

All GraphQL mutations should validate inputs with Zod schemas before calling DAL services.

**Example: CreateAuction Mutation**

```typescript
import { CreateAuctionRequestSchema } from '@social-media-app/shared';
import { GraphQLError } from 'graphql';

const resolvers = {
  Mutation: {
    createAuction: async (_parent, args, context) => {
      // 1. Check authentication
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // 2. ✅ Validate with Zod (business rules)
      const validationResult = CreateAuctionRequestSchema.safeParse(args.input);

      if (!validationResult.success) {
        throw new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: validationResult.error.format(),
          },
        });
      }

      // 3. Use validated data (Zod transformations applied)
      const validatedInput = validationResult.data;

      // 4. Call DAL service with validated data
      const auction = await context.services.auctionService.createAuction(
        context.userId,
        validatedInput,
        publicUrl
      );

      return { auction, uploadUrl };
    },
  },
};
```

**Benefits**:
- ✅ Catches invalid data before hitting DAL
- ✅ Returns structured GraphQL errors with validation details
- ✅ Reuses existing Zod schemas (same rules as REST API)
- ✅ Applies Zod transformations (trim, lowercase, etc.)
- ✅ Business rules enforced (e.g., "endTime > startTime")

**Example Error Response**:

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "validationErrors": {
          "_errors": [],
          "title": {
            "_errors": ["Title must be at least 3 characters"]
          },
          "endTime": {
            "_errors": ["End time must be after start time"]
          }
        }
      }
    }
  ]
}
```

---

## 📝 Detailed Implementation: Phase 2

### GraphQL Operations with Type Safety

**File**: `/packages/frontend/src/graphql/operations/auctions.ts`

```typescript
/**
 * Type-safe GraphQL operations for auctions
 * Uses const assertions for compile-time query validation
 */

import type { GraphQLQuery, GraphQLMutation } from '../types.js';

/**
 * Get single auction query
 */
export const GET_AUCTION = `
  query GetAuction($id: ID!) {
    auction(id: $id) {
      id
      title
      description
      imageUrl
      currentPrice
      startPrice
      bidCount
      status
      seller {
        id
        handle
        displayName
      }
    }
  }
` as const;

/**
 * Type-safe operation definition
 */
export type GetAuctionOperation = GraphQLQuery<
  'GetAuction',
  { id: string },
  { auction: Auction | null }
>;

/**
 * Place bid mutation
 */
export const PLACE_BID = `
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
` as const;

export type PlaceBidOperation = GraphQLMutation<
  'PlaceBid',
  { input: { auctionId: string; amount: number } },
  { placeBid: { bid: Bid; auction: Auction } }
>;
```

---

## 📝 Detailed Implementation: Phase 3

### Service Layer Migration with DI

#### Step 1: Create Service Interface

**File**: `/packages/frontend/src/services/interfaces/IAuctionService.ts`

```typescript
import type { AsyncState } from '../../graphql/types.js';
import type { Auction, Bid } from '@social-media-app/shared';

/**
 * Auction service interface for dependency injection
 *
 * ✅ Components depend on this interface
 * ✅ Tests inject MockAuctionService
 * ✅ Production injects real AuctionService (GraphQL-based)
 */
export interface IAuctionService {
  /**
   * List auctions with optional filtering
   */
  listAuctions(options?: {
    limit?: number;
    cursor?: string;
    status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    userId?: string;
  }): Promise<AsyncState<{
    auctions: Auction[];
    nextCursor: string | null;
    hasMore: boolean;
  }>>;

  /**
   * Get single auction by ID
   */
  getAuction(id: string): Promise<AsyncState<Auction>>;

  /**
   * Place bid on auction
   */
  placeBid(
    auctionId: string,
    amount: number
  ): Promise<AsyncState<{ bid: Bid; auction: Auction }>>;
}
```

#### Step 2: Implement GraphQL Service

**File**: `/packages/frontend/src/services/implementations/AuctionService.graphql.ts`

```typescript
import type { IAuctionService } from '../interfaces/IAuctionService.js';
import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient.js';
import type { AsyncState } from '../../graphql/types.js';
import { isSuccess, isError } from '../../graphql/types.js';
import {
  GET_AUCTION,
  LIST_AUCTIONS,
  PLACE_BID,
  type GetAuctionOperation,
  type ListAuctionsOperation,
  type PlaceBidOperation
} from '../../graphql/operations/auctions.js';

/**
 * GraphQL-based auction service implementation
 *
 * ✅ Depends on IGraphQLClient interface
 * ✅ Returns AsyncState for all operations
 * ✅ Uses type-safe GraphQL operations
 */
export class AuctionService implements IAuctionService {
  constructor(private readonly client: IGraphQLClient) {}

  async listAuctions(options = {}): Promise<AsyncState<{
    auctions: Auction[];
    nextCursor: string | null;
    hasMore: boolean;
  }>> {
    // Call GraphQL client (interface method)
    const result = await this.client.query<
      ExtractResponse<ListAuctionsOperation>
    >(LIST_AUCTIONS, options);

    // Transform GraphQL response to service format
    if (isSuccess(result)) {
      return {
        status: 'success',
        data: {
          auctions: result.data.auctions.edges.map(edge => edge.node),
          nextCursor: result.data.auctions.pageInfo.endCursor,
          hasMore: result.data.auctions.pageInfo.hasNextPage
        }
      };
    }

    // Pass through errors
    return result;
  }

  async getAuction(id: string): Promise<AsyncState<Auction>> {
    const result = await this.client.query<
      ExtractResponse<GetAuctionOperation>
    >(GET_AUCTION, { id });

    if (isSuccess(result)) {
      if (result.data.auction === null) {
        return {
          status: 'error',
          error: {
            message: 'Auction not found',
            extensions: { code: 'NOT_FOUND' }
          }
        };
      }

      return { status: 'success', data: result.data.auction };
    }

    return result;
  }

  async placeBid(auctionId: string, amount: number): Promise<AsyncState<{
    bid: Bid;
    auction: Auction;
  }>> {
    const result = await this.client.mutate<
      ExtractResponse<PlaceBidOperation>
    >(PLACE_BID, { input: { auctionId, amount } });

    if (isSuccess(result)) {
      return { status: 'success', data: result.data.placeBid };
    }

    return result;
  }
}
```

#### Step 3: Create Mock Service for Tests

**File**: `/packages/frontend/src/services/testing/MockAuctionService.ts`

```typescript
import type { IAuctionService } from '../interfaces/IAuctionService.js';
import type { AsyncState } from '../../graphql/types.js';

/**
 * Mock auction service for testing
 *
 * ✅ Implements same interface as real service
 * ✅ Records calls for verification (NO spies)
 * ✅ Configurable responses for test scenarios
 */
export class MockAuctionService implements IAuctionService {
  // Call recording
  public listAuctionsCalls: Array<{ options?: any }> = [];
  public getAuctionCalls: Array<{ id: string }> = [];
  public placeBidCalls: Array<{ auctionId: string; amount: number }> = [];

  // Configurable responses
  private listAuctionsResponse: AsyncState<any> = {
    status: 'success',
    data: { auctions: [], nextCursor: null, hasMore: false }
  };
  private getAuctionResponse: AsyncState<any> = { status: 'success', data: {} };
  private placeBidResponse: AsyncState<any> = { status: 'success', data: {} };

  setListAuctionsResponse(response: AsyncState<any>): void {
    this.listAuctionsResponse = response;
  }

  setGetAuctionResponse(response: AsyncState<any>): void {
    this.getAuctionResponse = response;
  }

  setPlaceBidResponse(response: AsyncState<any>): void {
    this.placeBidResponse = response;
  }

  async listAuctions(options?: any): Promise<AsyncState<any>> {
    this.listAuctionsCalls.push({ options });
    return this.listAuctionsResponse;
  }

  async getAuction(id: string): Promise<AsyncState<any>> {
    this.getAuctionCalls.push({ id });
    return this.getAuctionResponse;
  }

  async placeBid(auctionId: string, amount: number): Promise<AsyncState<any>> {
    this.placeBidCalls.push({ auctionId, amount });
    return this.placeBidResponse;
  }

  reset(): void {
    this.listAuctionsCalls = [];
    this.getAuctionCalls = [];
    this.placeBidCalls = [];
  }
}
```

#### Step 4: Write Service Behavior Tests

**File**: `/packages/frontend/src/services/__tests__/AuctionService.test.ts`

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { AuctionService } from '../implementations/AuctionService.graphql.js';
import { MockGraphQLClient } from '../../graphql/client.mock.js';
import type { AsyncState } from '../../graphql/types.js';

describe('AuctionService Behavior (GraphQL)', () => {
  let client: MockGraphQLClient;
  let service: AuctionService;

  beforeEach(() => {
    // ✅ DI: Inject mock client (NOT spy)
    client = new MockGraphQLClient();
    service = new AuctionService(client);
  });

  describe('listAuctions behavior', () => {
    test('RED: should call GraphQL client with correct query', async () => {
      // Arrange: Configure mock response
      client.setQueryResponse({
        status: 'success',
        data: {
          auctions: {
            edges: [{ cursor: 'c1', node: { id: '1', title: 'Test' } }],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      });

      // Act: Call service method
      await service.listAuctions({ limit: 20 });

      // Assert: Verify behavior (NOT implementation)
      expect(client.queryCalls).toHaveLength(1);
      expect(client.queryCalls[0].query).toContain('ListAuctions');
      expect(client.queryCalls[0].variables).toEqual({
        limit: 20,
        cursor: undefined,
        status: undefined,
        userId: undefined
      });
    });

    test('RED: should transform GraphQL response correctly', async () => {
      // Arrange
      client.setQueryResponse({
        status: 'success',
        data: {
          auctions: {
            edges: [
              { cursor: 'c1', node: { id: '1', title: 'Auction 1' } },
              { cursor: 'c2', node: { id: '2', title: 'Auction 2' } }
            ],
            pageInfo: { hasNextPage: true, endCursor: 'c2' }
          }
        }
      });

      // Act
      const result = await service.listAuctions();

      // Assert: Check transformed data
      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.auctions).toHaveLength(2);
        expect(result.data.nextCursor).toBe('c2');
        expect(result.data.hasMore).toBe(true);
      }
    });

    test('RED: should propagate errors from GraphQL client', async () => {
      // Arrange: Configure error response
      client.setQueryResponse({
        status: 'error',
        error: {
          message: 'Server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        }
      });

      // Act
      const result = await service.listAuctions();

      // Assert: Error passed through
      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Server error');
      }
    });
  });

  describe('placeBid behavior', () => {
    test('RED: should call mutation with correct input', async () => {
      // Arrange
      client.setMutationResponse({
        status: 'success',
        data: {
          placeBid: {
            bid: { id: 'b1', amount: 150 },
            auction: { id: 'a1', currentPrice: 150, bidCount: 6 }
          }
        }
      });

      // Act
      await service.placeBid('a1', 150);

      // Assert
      expect(client.mutateCalls).toHaveLength(1);
      expect(client.mutateCalls[0].mutation).toContain('PlaceBid');
      expect(client.mutateCalls[0].variables).toEqual({
        input: { auctionId: 'a1', amount: 150 }
      });
    });
  });
});
```

**Key Testing Principles**:
- ✅ Test **behavior**: "Does the service call the client with correct args?"
- ✅ Test **transformation**: "Does the service transform GraphQL response correctly?"
- ✅ Test **error handling**: "Does the service propagate errors?"
- ❌ DON'T test **implementation**: "How does fetch work internally?"
- ❌ DON'T use **spies**: Mock client records calls naturally

---

## 📝 Phase 4: Service Container Integration

### Update IServiceContainer

**File**: `/packages/frontend/src/services/interfaces/IServiceContainer.ts`

```typescript
import type { INavigationService } from './INavigationService';
import type { IAuthService } from './IAuthService';
import type { IModalService } from './IModalService';
import type { INotificationService } from './INotificationService';
import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient'; // NEW
import type { IAuctionService } from './IAuctionService'; // NEW

/**
 * Service container interface - provides access to all application services
 * Extended with GraphQL client and GraphQL-based services
 */
export interface IServiceContainer {
  readonly navigationService: INavigationService;
  readonly authService: IAuthService;
  readonly modalService: IModalService;
  readonly notificationService: INotificationService;

  // NEW: GraphQL infrastructure
  readonly graphqlClient: IGraphQLClient;

  // NEW: GraphQL-based services
  readonly auctionService: IAuctionService;
}
```

### Update ServiceContainer Implementation

**File**: `/packages/frontend/src/services/ServiceContainer.ts`

```typescript
import type { IServiceContainer } from './interfaces/IServiceContainer.js';
import { createGraphQLClient } from '../graphql/client.js';
import { AuctionService } from './implementations/AuctionService.graphql.js';

/**
 * Production service container
 * Creates real implementations of all services
 */
export class ServiceContainer implements IServiceContainer {
  readonly navigationService: INavigationService;
  readonly authService: IAuthService;
  readonly modalService: IModalService;
  readonly notificationService: INotificationService;
  readonly graphqlClient: IGraphQLClient;
  readonly auctionService: IAuctionService;

  constructor() {
    // Initialize GraphQL client first
    this.graphqlClient = createGraphQLClient();

    // Initialize GraphQL-based services
    this.auctionService = new AuctionService(this.graphqlClient);

    // ... existing service initialization
  }
}
```

---

## 📊 Migration Checklist

### Phase 1: GraphQL Client Infrastructure ✅

- [ ] Install dependencies: `graphql` (if needed)
- [ ] Create `/packages/frontend/src/graphql/types.ts`
  - [ ] Write type tests (RED)
  - [ ] Implement types (GREEN)
  - [ ] Add TSDoc (REFACTOR)
- [ ] Create `/packages/frontend/src/graphql/interfaces/IGraphQLClient.ts`
- [ ] Create `/packages/frontend/src/graphql/client.ts`
  - [ ] Write behavior tests (RED)
  - [ ] Implement client (GREEN)
  - [ ] Optimize (REFACTOR)
- [ ] Create `/packages/frontend/src/graphql/client.mock.ts`
- [ ] All tests passing ✅

### Phase 2: GraphQL Operations 🔄

- [ ] Create `/packages/frontend/src/graphql/operations/auctions.ts`
  - [ ] Define GET_AUCTION query
  - [ ] Define LIST_AUCTIONS query
  - [ ] Define PLACE_BID mutation
  - [ ] Define CREATE_AUCTION mutation
  - [ ] Type operation interfaces
- [ ] Write operation type tests
- [ ] Set up GraphQL Code Generator (optional)

### Phase 3: Auction Service Migration 🎯

- [ ] Create `/packages/frontend/src/services/interfaces/IAuctionService.ts`
- [ ] Create `/packages/frontend/src/services/implementations/AuctionService.graphql.ts`
  - [ ] Write behavior tests (RED)
  - [ ] Implement listAuctions (GREEN)
  - [ ] Implement getAuction (GREEN)
  - [ ] Implement placeBid (GREEN)
  - [ ] Implement createAuction (GREEN)
- [ ] Create `/packages/frontend/src/services/testing/MockAuctionService.ts`
- [ ] Update IServiceContainer interface
- [ ] Update ServiceContainer implementation
- [ ] All tests passing ✅

### Phase 4: Hook Migration 🔄

- [ ] Update `/packages/frontend/src/hooks/useAuctions.ts`
  - [ ] Use `IAuctionService` from DI
  - [ ] Remove direct REST API calls
  - [ ] Handle AsyncState properly
  - [ ] Update tests
- [ ] All tests passing ✅

### Phase 5: Repeat for Other Services 🔁

For each service (Post, Like, Comment, Follow, Profile):
1. Create interface: `I{Service}Service`
2. Implement GraphQL version: `{Service}Service.graphql.ts`
3. Create mock: `Mock{Service}Service.ts`
4. Write tests (TDD)
5. Update ServiceContainer
6. Migrate hooks

### Phase 6: Cleanup 🧹

- [ ] Remove REST `apiClient.ts` dependencies
- [ ] Remove old REST service implementations
- [ ] Update all tests to use DI pattern
- [ ] Remove unused dependencies
- [ ] Update documentation

---

## 🎓 Key Learnings & Patterns

### DI Pattern Benefits

**Before (Tight Coupling)**:
```typescript
// ❌ Component directly depends on implementation
const useAuctions = () => {
  const data = await apiClient.get('/auctions');
  // ...
};

// ❌ Tests require complex mocking
vi.mock('./apiClient');
```

**After (Dependency Injection)**:
```typescript
// ✅ Component depends on interface
const useAuctions = (service: IAuctionService) => {
  const result = await service.listAuctions();
  // ...
};

// ✅ Tests inject mock (NO vi.mock!)
const mockService = new MockAuctionService();
useAuctions(mockService);
```

### Type Guard Pattern

**Usage**:
```typescript
const result = await service.getAuction('123');

// Type narrowing with discriminated union
if (isSuccess(result)) {
  // TypeScript knows: result.data is Auction
  console.log(result.data.title);
} else if (isError(result)) {
  // TypeScript knows: result.error is GraphQLError
  console.log(result.error.message);
}

// Exhaustive switch
switch (result.status) {
  case 'idle':
    return <div>Idle</div>;
  case 'loading':
    return <div>Loading...</div>;
  case 'success':
    return <div>{result.data.title}</div>;
  case 'error':
    return <div>{result.error.message}</div>;
  default:
    // TypeScript ensures all cases handled
    const _exhaustive: never = result;
}
```

### Mock Without Spies Pattern

**Traditional (Spies)**:
```typescript
// ❌ Uses vi.spyOn - tests implementation details
const spy = vi.spyOn(client, 'query');
await service.listAuctions();
expect(spy).toHaveBeenCalledWith(...);
```

**DI Pattern (No Spies)**:
```typescript
// ✅ Mock naturally records calls - tests behavior
const mockClient = new MockGraphQLClient();
const service = new AuctionService(mockClient);
await service.listAuctions();

expect(mockClient.queryCalls).toHaveLength(1);
expect(mockClient.queryCalls[0].query).toContain('ListAuctions');
```

---

## 📚 Reference Materials

### TypeScript Patterns Used

1. **Discriminated Unions**: `AsyncState<T>`
2. **Conditional Types**: `ExtractVariables<T>`, `ExtractResponse<T>`
3. **Type Guards**: `isSuccess()`, `isError()`, `isLoading()`
4. **Assertion Functions**: `assertSuccess()`
5. **Const Assertions**: `as const` for query strings
6. **Generic Constraints**: `<T extends Record<string, unknown>>`
7. **Mapped Types**: Service interface to mock mapping
8. **Template Literal Types**: Future use for operation names

### TDD Workflow

1. **RED**: Write failing test
2. **GREEN**: Minimal code to pass
3. **REFACTOR**: Improve code quality
4. **REPEAT**: Next test

### Testing Principles

✅ **DO**:
- Test public interfaces (behavior)
- Use dependency injection
- Mock external dependencies only
- Write comprehensive scenarios
- Use type tests for compile-time safety

❌ **DON'T**:
- Spy on internal methods
- Test private implementation
- Mock business logic
- Use vi.mock for services
- Test framework internals

---

## 🚀 Getting Started

### Immediate Next Steps

1. **Review this plan** with your team
2. **Set up Phase 1** - Create GraphQL client infrastructure
3. **Write first test** - RED: Type test for AsyncState
4. **Implement types** - GREEN: Create discriminated union
5. **Iterate** - Continue RED-GREEN-REFACTOR

### Questions to Resolve

1. Do we need GraphQL Code Generator, or manual types?
2. What's the migration timeline (all at once, or incremental)?
3. Which services to migrate first (Auctions already done)?
4. How to handle authentication token sync between REST→GraphQL?
5. Performance considerations for parallel REST+GraphQL during migration?

---

## 🔮 Future: Migrating to Relay (Optional)

**Why the DI pattern makes Relay migration easy:**

Because we've wrapped everything in `IGraphQLClient`, migrating to Relay (or Apollo) later is straightforward:

### Step 1: Create Relay Wrapper

```typescript
import { Environment, Network, RecordSource, Store } from 'relay-runtime';
import type { IGraphQLClient } from './interfaces/IGraphQLClient.js';
import type { AsyncState } from './types.js';

/**
 * Relay-based GraphQL client implementation
 *
 * Wraps Relay environment to match our IGraphQLClient interface
 */
export class RelayGraphQLClient implements IGraphQLClient {
  private environment: Environment;
  private authToken: string | null = null;

  constructor(endpoint: string) {
    const network = Network.create((operation, variables) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      return fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: operation.text,
          variables
        })
      }).then(response => response.json());
    });

    this.environment = new Environment({
      network,
      store: new Store(new RecordSource())
    });
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  async query<TData>(
    query: string,
    variables: Record<string, unknown>
  ): Promise<AsyncState<TData>> {
    try {
      // Use Relay's fetchQuery
      const data = await fetchQuery<TData>(
        this.environment,
        graphql(query),
        variables
      ).toPromise();

      return { status: 'success', data };
    } catch (error) {
      return {
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          extensions: { code: 'RELAY_ERROR' }
        }
      };
    }
  }

  // ... similar implementation for mutate
}
```

### Step 2: Swap Implementation

```typescript
// Change ONE line in ServiceContainer.ts:
this.graphqlClient = new RelayGraphQLClient(endpoint);
// Instead of:
// this.graphqlClient = createGraphQLClient(endpoint);
```

### Step 3: Done!

✅ All services continue working
✅ All tests continue passing (mock stays the same)
✅ No changes to business logic
✅ All components unaffected

**This is the power of DI + interfaces!**

---

## 📞 Support & Resources

- **graphql-request**: https://github.com/jasonkuhrt/graphql-request
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **GraphQL Best Practices**: https://graphql.org/learn/best-practices/
- **TDD Reference**: Kent Beck's "Test Driven Development: By Example"
- **DI Patterns**: Martin Fowler's "Inversion of Control Containers"
- **Relay (future)**: https://relay.dev/

---

**Let's build this migration with TDD discipline, type safety, and `graphql-request`!** 🎯
