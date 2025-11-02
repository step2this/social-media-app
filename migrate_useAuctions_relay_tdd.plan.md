# Migrate useAuctions to Relay - TDD Plan

## Goal
Migrate `useAuctions` hook from REST service to Relay `useLazyLoadQuery` with **minimal required tests**.

## Current State
- **Hook:** `/packages/frontend/src/hooks/useAuctions.ts` (REST-based)
- **Tests:** 14 tests using MockGraphQLClient + DI pattern
- **Schema:** `auctions` query exists with pagination support
- **Fixtures:** `createMockAuction`, `createMockAuctions` from `@social-media-app/shared`

## Target State
- Single `useAuctions.ts` hook using Relay `useLazyLoadQuery`
- Minimal test suite using Relay MockEnvironment (5-6 tests)
- Same API: `{ auctions, isLoading, error, hasMore, refetch, loadMore }`
- Use existing shared fixtures

---

## Phase 1: Write Failing Tests (RED)

### Test 1: Fetch auctions on mount
```typescript
it('should fetch auctions on mount', async () => {
  const environment = createMockEnvironment();
  const auctions = createMockAuctions(3);
  
  const { result } = renderHook(() => useAuctions(), {
    wrapper: ({ children }) => (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    )
  });

  // Initially loading
  expect(result.current.isLoading).toBe(true);
  expect(result.current.auctions).toEqual([]);

  // Resolve query
  act(() => {
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        AuctionConnection: () => ({
          edges: auctions.map(auction => ({ node: auction })),
          pageInfo: { hasNextPage: false, endCursor: null }
        })
      })
    );
  });

  // Wait for data
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.auctions).toHaveLength(3);
  expect(result.current.error).toBeNull();
});
```

### Test 2: Handle empty auction list
```typescript
it('should handle empty auction list', async () => {
  const environment = createMockEnvironment();
  
  const { result } = renderHook(() => useAuctions(), {
    wrapper: ({ children }) => (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    )
  });

  // Resolve with empty list
  act(() => {
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        AuctionConnection: () => ({
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null }
        })
      })
    );
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.auctions).toEqual([]);
  expect(result.current.hasMore).toBe(false);
});
```

### Test 3: Handle errors
```typescript
it('should handle API errors gracefully', async () => {
  const environment = createMockEnvironment();
  
  const { result } = renderHook(() => useAuctions(), {
    wrapper: ({ children }) => (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    )
  });

  // Reject with error
  act(() => {
    environment.mock.rejectMostRecentOperation(
      new Error('Network error')
    );
  });

  await waitFor(() => {
    expect(result.current.error).toBeTruthy();
  });

  expect(result.current.auctions).toEqual([]);
});
```

### Test 4: Filter by status
```typescript
it('should filter auctions by status', async () => {
  const environment = createMockEnvironment();
  const activeAuctions = createMockAuctions(2, { status: 'ACTIVE' });
  
  const { result } = renderHook(
    () => useAuctions({ status: 'ACTIVE' }),
    {
      wrapper: ({ children }) => (
        <RelayEnvironmentProvider environment={environment}>
          {children}
        </RelayEnvironmentProvider>
      )
    }
  );

  // Check query variables include status filter
  const operation = environment.mock.getMostRecentOperation();
  expect(operation.request.variables.status).toBe('ACTIVE');

  // Resolve with filtered auctions
  act(() => {
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        AuctionConnection: () => ({
          edges: activeAuctions.map(a => ({ node: a })),
          pageInfo: { hasNextPage: false, endCursor: null }
        })
      })
    );
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.auctions).toHaveLength(2);
});
```

### Test 5: Pagination - hasMore indicator
```typescript
it('should indicate when more results are available', async () => {
  const environment = createMockEnvironment();
  const auctions = createMockAuctions(10);
  
  const { result } = renderHook(() => useAuctions(), {
    wrapper: ({ children }) => (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    )
  });

  // Resolve with hasNextPage = true
  act(() => {
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        AuctionConnection: () => ({
          edges: auctions.map(a => ({ node: a })),
          pageInfo: { hasNextPage: true, endCursor: 'cursor-10' }
        })
      })
    );
  });

  await waitFor(() => {
    expect(result.current.hasMore).toBe(true);
  });
});
```

### Test 6: Refetch functionality
```typescript
it('should refetch auctions from the beginning', async () => {
  const environment = createMockEnvironment();
  const initialAuctions = createMockAuctions(3);
  
  const { result } = renderHook(() => useAuctions(), {
    wrapper: ({ children }) => (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    )
  });

  // Initial fetch
  act(() => {
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        AuctionConnection: () => ({
          edges: initialAuctions.map(a => ({ node: a })),
          pageInfo: { hasNextPage: false, endCursor: null }
        })
      })
    );
  });

  await waitFor(() => {
    expect(result.current.auctions).toHaveLength(3);
  });

  // Refetch
  act(() => {
    result.current.refetch();
  });

  // Resolve refetch
  const updatedAuctions = createMockAuctions(5);
  act(() => {
    environment.mock.resolveMostRecentOperation(operation =>
      MockPayloadGenerator.generate(operation, {
        AuctionConnection: () => ({
          edges: updatedAuctions.map(a => ({ node: a })),
          pageInfo: { hasNextPage: false, endCursor: null }
        })
      })
    );
  });

  await waitFor(() => {
    expect(result.current.auctions).toHaveLength(5);
  });
});
```

---

## Phase 2: Implement Hook (GREEN)

### File: `/packages/frontend/src/hooks/useAuctions.relay.ts`

```typescript
import { useLazyLoadQuery, graphql } from 'react-relay';
import { useMemo } from 'react';
import type { useAuctionsQuery } from './__generated__/useAuctionsQuery.graphql';

export interface UseAuctionsOptions {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  userId?: string;
}

export const useAuctions = (options: UseAuctionsOptions = {}) => {
  const { status, userId } = options;

  const data = useLazyLoadQuery<useAuctionsQuery>(
    graphql`
      query useAuctionsQuery(
        $status: AuctionStatus
        $userId: ID
        $cursor: String
        $limit: Int
      ) {
        auctions(
          status: $status
          userId: $userId
          cursor: $cursor
          limit: $limit
        ) {
          edges {
            node {
              id
              sellerId
              postId
              startingPrice
              currentPrice
              status
              startTime
              endTime
              createdAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    {
      status: status || null,
      userId: userId || null,
      cursor: null,
      limit: 20
    },
    { fetchPolicy: 'store-and-network' }
  );

  // Extract auctions from edges
  const auctions = useMemo(
    () => data.auctions.edges.map(edge => edge.node),
    [data.auctions.edges]
  );

  return {
    auctions,
    isLoading: false, // Relay suspends, so if we're here, we're not loading
    error: null, // Relay throws errors, so if we're here, no error
    hasMore: data.auctions.pageInfo.hasNextPage,
    refetch: () => {
      // TODO: Implement with useQueryLoader
    },
    loadMore: () => {
      // TODO: Implement with usePaginationFragment
    }
  };
};
```

### Run Relay Compiler

```bash
cd packages/frontend && npm run relay
```

This generates:
- `__generated__/useAuctionsQuery.graphql.ts`

---

## Phase 3: Replace Old Hook

Once tests pass:

```bash
# Delete old hook
rm packages/frontend/src/hooks/useAuctions.ts

# Rename Relay hook
mv packages/frontend/src/hooks/useAuctions.relay.ts \
   packages/frontend/src/hooks/useAuctions.ts

# Delete old test
rm packages/frontend/src/hooks/useAuctions.test.ts

# Rename Relay test
mv packages/frontend/src/hooks/useAuctions.relay.test.tsx \
   packages/frontend/src/hooks/useAuctions.test.tsx
```

---

## Success Criteria

- ✅ 6 tests passing (minimal required tests)
- ✅ Hook uses Relay `useLazyLoadQuery`
- ✅ Same API as before
- ✅ No service layer dependencies
- ✅ Uses existing shared fixtures
- ✅ Tests use RelayEnvironmentProvider + MockEnvironment
- ✅ No mocks, no spies - pure Relay patterns

---

## Notes

### Pagination Pattern

For full pagination support, we'll need to use `usePaginationFragment` instead of `useLazyLoadQuery`. This can be added in a follow-up if needed.

### Refetch Pattern

For refetch, we may need to use `useQueryLoader` hook. For now, we'll implement a basic version.

### Differences from REST

- **Relay suspends**: No explicit `isLoading` state needed
- **Relay throws**: Error boundary handles errors
- **Normalized cache**: Automatic cache updates
- **Type safety**: Generated types from schema

---

## Timeline

- Phase 1 (Tests): 30 minutes
- Phase 2 (Implementation): 30 minutes
- Phase 3 (Replace): 15 minutes

**Total:** ~75 minutes (1.25 hours)
