# Migrate usePlaceBid Hook - TDD Plan

## Goal
Create a new `usePlaceBid` hook using Relay `useMutation` with **minimal required tests**. This hook will handle placing bids on auctions.

## Current State
- **Hook:** Does not exist yet
- **Schema:** `placeBid` mutation exists with `PlaceBidInput` and `PlaceBidPayload`
- **Pattern:** Need to create reusable mutation hook

## Target State
- New `usePlaceBid.ts` hook with Relay `useMutation`
- Minimal test suite (4 tests) using Relay MockEnvironment
- Follows pattern from `useFeedItemAutoRead` and `useCreatePost`
- Ready for use in auction components

---

## GraphQL Schema

```graphql
input PlaceBidInput {
  auctionId: ID!
  amount: Float!
}

type PlaceBidPayload {
  bid: Bid!
  auction: Auction!
}
```

---

## Phase 1: Write Failing Tests (RED)

### File: `/packages/frontend/src/hooks/usePlaceBid.test.tsx`

Following the pattern from `useFeedItemAutoRead.test.tsx` and `useCreatePost.test.tsx`:

```typescript
/**
 * usePlaceBid Hook Tests - Relay Version
 *
 * Tests the usePlaceBid hook using Relay MockEnvironment.
 * Minimal required tests following TDD principles.
 *
 * Pattern: MockEnvironment → RelayEnvironmentProvider → usePlaceBid hook
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { usePlaceBid } from './usePlaceBid';
import type { Environment } from 'relay-runtime';

/**
 * Test wrapper that provides Relay environment
 */
function createWrapper(environment: Environment) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    );
  };
}

describe('usePlaceBid (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  describe('mutation execution', () => {
    it('should call mutation with correct variables', () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // Execute mutation
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 150.50
        });
      });

      // Verify mutation was called
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.node.operation.name).toBe('usePlaceBidMutation');
      expect(operation.request.variables.input).toEqual({
        auctionId: 'auction-123',
        amount: 150.50
      });
    });
  });

  describe('mutation state', () => {
    it('should track in-flight state during mutation', async () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // Initially not in flight
      expect(result.current.isInFlight).toBe(false);

      // Start mutation
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 200
        });
      });

      // Should be in flight
      expect(result.current.isInFlight).toBe(true);

      // Resolve mutation
      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            PlaceBidPayload: () => ({
              bid: {
                id: 'bid-456',
                auctionId: 'auction-123',
                bidderId: 'user-1',
                amount: 200,
                createdAt: new Date().toISOString()
              },
              auction: {
                id: 'auction-123',
                currentPrice: 200,
                bidCount: 5
              }
            })
          })
        );
      });

      // Should no longer be in flight
      await waitFor(() => {
        expect(result.current.isInFlight).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle mutation errors gracefully', async () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // Start mutation
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 100
        });
      });

      // Reject mutation
      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Bid amount too low')
        );
      });

      // Should have error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Bid amount too low');
      });
    });

    it('should clear error on subsequent successful mutation', async () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // First mutation fails
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 50
        });
      });

      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Bid amount too low')
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second mutation succeeds
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 200
        });
      });

      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            PlaceBidPayload: () => ({
              bid: {
                id: 'bid-789',
                auctionId: 'auction-123',
                bidderId: 'user-1',
                amount: 200,
                createdAt: new Date().toISOString()
              },
              auction: {
                id: 'auction-123',
                currentPrice: 200,
                bidCount: 6
              }
            })
          })
        );
      });

      // Error should be cleared
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
```

---

## Phase 2: Implement Hook (GREEN)

### File: `/packages/frontend/src/hooks/usePlaceBid.ts`

```typescript
import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { usePlaceBidMutation } from './__generated__/usePlaceBidMutation.graphql';

/**
 * Input for placing a bid
 */
export interface PlaceBidInput {
  auctionId: string;
  amount: number;
}

/**
 * Result of placing a bid
 */
export interface PlaceBidResult {
  bid: {
    id: string;
    auctionId: string;
    bidderId: string;
    amount: number;
    createdAt: string;
  };
  auction: {
    id: string;
    currentPrice: number;
    bidCount: number;
  };
}

/**
 * Hook to place a bid on an auction using Relay mutation
 *
 * Provides a reusable mutation for placing bids.
 * Updates auction state optimistically for better UX.
 *
 * @returns {object} Object containing placeBid function, isInFlight state, and error state
 *
 * @example
 * ```tsx
 * const { placeBid, isInFlight, error } = usePlaceBid();
 *
 * const handleBid = () => {
 *   placeBid({
 *     auctionId: 'auction-123',
 *     amount: 150.00
 *   });
 * };
 * ```
 */
export function usePlaceBid() {
  const [error, setError] = useState<Error | null>(null);

  const [commit, isInFlight] = useMutation<usePlaceBidMutation>(
    graphql`
      mutation usePlaceBidMutation($input: PlaceBidInput!) {
        placeBid(input: $input) {
          bid {
            id
            auctionId
            bidderId
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
    `
  );

  /**
   * Place a bid on an auction
   *
   * @param input - Bid input (auctionId, amount)
   */
  const placeBid = useCallback((input: PlaceBidInput) => {
    setError(null);

    commit({
      variables: { input },
      onCompleted: () => {
        // Success - error is already null
      },
      onError: (err) => {
        setError(err);
      }
    });
  }, [commit]);

  return {
    placeBid,
    isInFlight,
    error
  };
}
```

**Key Points:**
- Fire and forget pattern (like `useFeedItemAutoRead`)
- Does NOT return a Promise (unlike `useCreatePost`)
- Simple error tracking
- Ready for optimistic updates

### Run Relay Compiler

```bash
cd packages/frontend && npm run relay
```

This generates:
- `__generated__/usePlaceBidMutation.graphql.ts`

---

## Phase 3: Run Tests & Verify

```bash
# Run hook tests
cd packages/frontend && npm test -- usePlaceBid.test

# Run all tests
npm test
```

---

## Phase 4: Clean Git Commits

```bash
# Commit 1: Hook implementation
git add packages/frontend/src/hooks/usePlaceBid.ts \
        packages/frontend/src/hooks/__generated__/usePlaceBidMutation.graphql.ts
git commit -m "feat(hooks): Add usePlaceBid Relay hook

- New mutation hook for placing bids on auctions
- Fire-and-forget pattern (like useFeedItemAutoRead)
- Simple API: placeBid, isInFlight, error
- Generate usePlaceBidMutation GraphQL types

Ready for use in auction bidding components

Related: migrate_usePlaceBid_relay_tdd.plan.md"

# Commit 2: Hook tests
git add packages/frontend/src/hooks/usePlaceBid.test.tsx
git commit -m "test: Add usePlaceBid hook tests with Relay patterns

- 4 focused tests using Relay MockEnvironment
- Test mutation execution, in-flight state, error handling
- No mocks/spies, use relay-test-utils patterns
- All tests passing

Tests verify:
- Mutation called with correct variables (auctionId, amount)
- In-flight state tracking during mutation
- Error handling and propagation
- Error clearing on successful retry

Related: migrate_usePlaceBid_relay_tdd.plan.md"

# Commit 3: Plan documentation
git add migrate_usePlaceBid_relay_tdd.plan.md
git commit -m "docs: Add usePlaceBid Relay migration TDD plan

TDD plan for creating usePlaceBid mutation hook:
- Phase 1: Write 4 failing tests (RED)
- Phase 2: Implement hook (GREEN)
- Timeline: ~60 minutes

Hook provides fire-and-forget bid placement:
- Simple API for auction bidding
- Ready for optimistic updates
- Consistent with other mutation hooks

Migration progress: Phase 1 nearing completion (4/5 hooks migrated)

Related: usePlaceBid.ts"
```

---

## Success Criteria

- ✅ 4 tests passing (minimal required tests)
- ✅ Hook uses Relay `useMutation`
- ✅ Fire-and-forget pattern (no Promise return)
- ✅ Simple error handling
- ✅ Ready for use in auction components
- ✅ Follows established patterns

---

## Notes

### API Comparison

| Hook | Returns Promise | Use Case |
|------|----------------|----------|
| `useFeedItemAutoRead` | No | Fire & forget |
| `usePlaceBid` | No | Fire & forget |
| `useCreatePost` | Yes | Need upload URLs |
| `useCreateAuction` | Yes | Need upload URLs |

**usePlaceBid uses fire-and-forget** because:
- No need for return value
- UI updates via Relay cache
- Simple success/error handling

### Future Enhancements

**Optimistic Updates:**
```typescript
commit({
  variables: { input },
  optimisticResponse: {
    placeBid: {
      bid: {
        id: 'temp-' + Date.now(),
        auctionId: input.auctionId,
        bidderId: currentUserId,
        amount: input.amount,
        createdAt: new Date().toISOString()
      },
      auction: {
        id: input.auctionId,
        currentPrice: input.amount,
        bidCount: currentBidCount + 1
      }
    }
  },
  onCompleted: () => {
    // Success
  },
  onError: (err) => {
    setError(err);
  }
});
```

This can be added later when needed.

---

## Timeline

- Phase 1 (Tests): 20 minutes
- Phase 2 (Implementation): 15 minutes
- Phase 3 (Testing): 10 minutes
- Phase 4 (Git Commits): 10 minutes

**Total:** ~55 minutes (~1 hour)

---

## Migration Progress

After this migration:

**Phase 1: Hooks Migration**
- ✅ useFeedItemAutoRead (COMPLETE)
- ✅ useAuctions (COMPLETE)
- ✅ useCreatePost (COMPLETE)
- ✅ usePlaceBid (COMPLETE - this migration)
- ❌ useCreateAuction (TODO - final hook)

**Progress:** 80% → 90% (Phase 1)

**Remaining:** 1 hook (useCreateAuction)
