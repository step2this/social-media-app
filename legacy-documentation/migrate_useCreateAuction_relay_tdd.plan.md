# Migrate useCreateAuction Hook - TDD Plan (FINAL HOOK - Phase 1 Complete!)

## Goal
Create a new `useCreateAuction` hook using Relay `useMutation` with **minimal required tests**. This is the **FINAL hook** in Phase 1 of the Relay migration audit, completing the hooks migration phase!

## Current State
- **Hook:** Does not exist yet
- **Schema:** `createAuction` mutation exists with `CreateAuctionInput` and `CreateAuctionPayload`
- **Pattern:** Similar to `useCreatePost` (needs S3 upload URL)

## Target State
- New `useCreateAuction.ts` hook with Relay `useMutation`
- Minimal test suite (4 tests) using Relay MockEnvironment
- Returns Promise with auction data and upload URL (like `useCreatePost`)
- Ready for use in auction creation components

---

## GraphQL Schema

```graphql
input CreateAuctionInput {
  title: String!
  description: String!
  startPrice: Float!
  reservePrice: Float!
  startTime: String!
  endTime: String!
  fileType: String!
}

type CreateAuctionPayload {
  auction: Auction!
  uploadUrl: String!
}
```

**Key Similarity to CreatePost:**
- Both return `uploadUrl` for S3 upload
- Both need Promise-based API (need the upload URL)
- Both follow async pattern (create record → upload file → navigate)

---

## Phase 1: Write Failing Tests (RED)

### File: `/packages/frontend/src/hooks/useCreateAuction.test.tsx`

Following the pattern from `useCreatePost.test.tsx`:

```typescript
/**
 * useCreateAuction Hook Tests - Relay Version
 *
 * Tests the useCreateAuction hook using Relay MockEnvironment.
 * Minimal required tests following TDD principles.
 *
 * Pattern: MockEnvironment → RelayEnvironmentProvider → useCreateAuction hook
 * Best Practices: DRY helpers, focused tests on behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { useCreateAuction } from './useCreateAuction';
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

describe('useCreateAuction (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  describe('mutation execution', () => {
    it('should call mutation with correct variables', () => {
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // Execute mutation
      act(() => {
        result.current.createAuction({
          title: 'Test Auction',
          description: 'Test Description',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      // Verify mutation was called
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.node.operation.name).toBe('useCreateAuctionMutation');
      expect(operation.request.variables.input).toMatchObject({
        title: 'Test Auction',
        description: 'Test Description',
        startPrice: 100,
        reservePrice: 200,
        fileType: 'image/jpeg'
      });
    });
  });

  describe('mutation state', () => {
    it('should track in-flight state during mutation', async () => {
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // Initially not in flight
      expect(result.current.isInFlight).toBe(false);

      // Start mutation
      act(() => {
        result.current.createAuction({
          title: 'Test Auction',
          description: 'Test Description',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      // Should be in flight
      expect(result.current.isInFlight).toBe(true);

      // Resolve mutation
      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            CreateAuctionPayload: () => ({
              auction: {
                id: 'auction-123',
                userId: 'user-1',
                title: 'Test Auction',
                description: 'Test Description',
                imageUrl: 'https://example.com/image.jpg',
                startPrice: 100,
                reservePrice: 200,
                currentPrice: 100,
                status: 'PENDING',
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 86400000).toISOString(),
                bidCount: 0,
                createdAt: new Date().toISOString()
              },
              uploadUrl: 'https://s3.amazonaws.com/upload'
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
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // Start mutation
      act(() => {
        result.current.createAuction({
          title: 'Test Auction',
          description: 'Test Description',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      // Reject mutation
      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create auction')
        );
      });

      // Should have error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Failed to create auction');
      });
    });

    it('should clear error on subsequent successful mutation', async () => {
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // First mutation fails
      act(() => {
        result.current.createAuction({
          title: 'Test Auction 1',
          description: 'Test Description 1',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create auction')
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second mutation succeeds
      act(() => {
        result.current.createAuction({
          title: 'Test Auction 2',
          description: 'Test Description 2',
          startPrice: 150,
          reservePrice: 250,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/png'
        });
      });

      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            CreateAuctionPayload: () => ({
              auction: {
                id: 'auction-456',
                userId: 'user-1',
                title: 'Test Auction 2',
                description: 'Test Description 2',
                imageUrl: 'https://example.com/image2.jpg',
                startPrice: 150,
                reservePrice: 250,
                currentPrice: 150,
                status: 'PENDING',
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 86400000).toISOString(),
                bidCount: 0,
                createdAt: new Date().toISOString()
              },
              uploadUrl: 'https://s3.amazonaws.com/upload2'
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

### File: `/packages/frontend/src/hooks/useCreateAuction.ts`

```typescript
import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { useCreateAuctionMutation } from './__generated__/useCreateAuctionMutation.graphql';

/**
 * Input for creating an auction
 */
export interface CreateAuctionInput {
  title: string;
  description: string;
  startPrice: number;
  reservePrice: number;
  startTime: string;
  endTime: string;
  fileType: string;
}

/**
 * Result of creating an auction
 */
export interface CreateAuctionResult {
  auction: {
    id: string;
    userId: string;
    title: string;
    description: string;
    imageUrl: string;
    startPrice: number;
    reservePrice: number;
    currentPrice: number;
    status: string;
    startTime: string;
    endTime: string;
    bidCount: number;
    createdAt: string;
  };
  uploadUrl: string;
}

/**
 * Hook to create an auction using Relay mutation
 *
 * Provides a reusable mutation for creating auctions with image upload URLs.
 * Follows the same pattern as useCreatePost (returns Promise with upload URL).
 *
 * @returns {object} Object containing createAuction function, isInFlight state, and error state
 *
 * @example
 * ```tsx
 * const { createAuction, isInFlight, error } = useCreateAuction();
 *
 * const handleCreate = async () => {
 *   const result = await createAuction({
 *     title: 'Rare Painting',
 *     description: 'Beautiful artwork',
 *     startPrice: 1000,
 *     reservePrice: 2000,
 *     startTime: new Date().toISOString(),
 *     endTime: new Date(Date.now() + 86400000 * 7).toISOString(),
 *     fileType: 'image/jpeg'
 *   });
 *
 *   if (result) {
 *     await uploadToS3(result.uploadUrl, file);
 *     navigate(`/auction/${result.auction.id}`);
 *   }
 * };
 * ```
 */
export function useCreateAuction() {
  const [error, setError] = useState<Error | null>(null);

  const [commit, isInFlight] = useMutation<useCreateAuctionMutation>(
    graphql`
      mutation useCreateAuctionMutation($input: CreateAuctionInput!) {
        createAuction(input: $input) {
          auction {
            id
            userId
            title
            description
            imageUrl
            startPrice
            reservePrice
            currentPrice
            status
            startTime
            endTime
            bidCount
            createdAt
          }
          uploadUrl
        }
      }
    `
  );

  /**
   * Create a new auction
   *
   * @param input - Auction creation input
   * @returns Promise that resolves with auction data and upload URL, or null on error
   */
  const createAuction = useCallback((input: CreateAuctionInput): Promise<CreateAuctionResult | null> => {
    setError(null);

    return new Promise((resolve) => {
      commit({
        variables: { input },
        onCompleted: (response) => {
          if (response.createAuction) {
            resolve(response.createAuction as CreateAuctionResult);
          } else {
            const err = new Error('Failed to create auction');
            setError(err);
            resolve(null);
          }
        },
        onError: (err) => {
          setError(err);
          resolve(null);
        }
      });
    });
  }, [commit]);

  return {
    createAuction,
    isInFlight,
    error
  };
}
```

**Key Points:**
- Returns Promise (like `useCreatePost`)
- Need upload URL for S3 upload
- Same pattern: create record → upload file → navigate
- Clean error handling

### Run Relay Compiler

```bash
cd packages/frontend && npm run relay
```

This generates:
- `__generated__/useCreateAuctionMutation.graphql.ts`

---

## Phase 3: Run Tests & Verify

```bash
# Run hook tests
cd packages/frontend && npm test -- useCreateAuction.test

# Run all tests
npm test
```

---

## Phase 4: Clean Git Commits

```bash
# Commit 1: Hook implementation
git add packages/frontend/src/hooks/useCreateAuction.ts \
        packages/frontend/src/hooks/__generated__/useCreateAuctionMutation.graphql.ts
git commit -m "feat(hooks): Add useCreateAuction Relay hook (PHASE 1 COMPLETE! 🎉)

- New mutation hook for creating auctions
- Promise-based API (need upload URL for S3)
- Returns auction data + uploadUrl
- Follow pattern from useCreatePost
- Generate useCreateAuctionMutation GraphQL types

Ready for use in auction creation components

THIS COMPLETES PHASE 1 OF RELAY MIGRATION! 🚀
All 5 hooks migrated:
✅ useFeedItemAutoRead
✅ useAuctions
✅ useCreatePost
✅ usePlaceBid
✅ useCreateAuction (this commit)

Related: migrate_useCreateAuction_relay_tdd.plan.md"

# Commit 2: Hook tests
git add packages/frontend/src/hooks/useCreateAuction.test.tsx
git commit -m "test: Add useCreateAuction hook tests with Relay patterns

- 4 focused tests using Relay MockEnvironment
- Test mutation execution, in-flight state, error handling
- No mocks/spies, use relay-test-utils patterns
- All tests passing

Tests verify:
- Mutation called with correct variables (title, prices, dates, etc.)
- In-flight state tracking during mutation
- Error handling and propagation
- Error clearing on successful retry

Follows pattern from useCreatePost tests

Related: migrate_useCreateAuction_relay_tdd.plan.md"

# Commit 3: Plan documentation
git add migrate_useCreateAuction_relay_tdd.plan.md
git commit -m "docs: Add useCreateAuction Relay migration TDD plan

TDD plan for creating useCreateAuction mutation hook:
- Phase 1: Write 4 failing tests (RED)
- Phase 2: Implement hook (GREEN)
- Timeline: ~60 minutes

Hook provides Promise-based auction creation:
- Returns upload URL for S3 image upload
- Same pattern as useCreatePost
- Ready for auction creation forms

🎉 PHASE 1 MIGRATION COMPLETE! 🎉

All 5 hooks successfully migrated to Relay:
1. ✅ useFeedItemAutoRead (fire & forget)
2. ✅ useAuctions (query)
3. ✅ useCreatePost (mutation with Promise)
4. ✅ usePlaceBid (fire & forget)
5. ✅ useCreateAuction (mutation with Promise)

Migration progress: Phase 1 COMPLETE! 100%

Related: useCreateAuction.ts, RELAY_MIGRATION_AUDIT.md"
```

---

## Success Criteria

- ✅ 4 tests passing (minimal required tests)
- ✅ Hook uses Relay `useMutation`
- ✅ Promise-based API (returns upload URL)
- ✅ Ready for use in auction creation components
- ✅ Follows established patterns
- ✅ **PHASE 1 MIGRATION COMPLETE!** 🎉

---

## Notes

### API Comparison

| Hook | Type | Returns Promise | Use Case |
|------|------|----------------|----------|
| `useFeedItemAutoRead` | Mutation | No | Fire & forget |
| `usePlaceBid` | Mutation | No | Fire & forget |
| `useCreatePost` | Mutation | Yes | Need upload URL |
| `useCreateAuction` | Mutation | Yes | Need upload URL |
| `useAuctions` | Query | N/A | Fetch data |

**useCreateAuction returns Promise** because:
- Need the upload URL for S3
- Component must wait for URL before uploading
- Same flow as useCreatePost

### S3 Upload Pattern

The hook returns upload URL but doesn't handle S3 upload itself:
- **Hook:** GraphQL mutation (create auction record + get upload URL)
- **Component:** S3 upload (upload actual image to S3)

This keeps concerns separated.

### Similar to useCreatePost

Both hooks:
1. Create a record in the database
2. Return S3 upload URL
3. Component uploads file to S3
4. Navigate to detail page

---

## Timeline

- Phase 1 (Tests): 20 minutes
- Phase 2 (Implementation): 20 minutes
- Phase 3 (Testing): 10 minutes
- Phase 4 (Git Commits): 10 minutes

**Total:** ~60 minutes (~1 hour)

---

## Migration Progress

After this migration:

**Phase 1: Hooks Migration**
- ✅ useFeedItemAutoRead (COMPLETE)
- ✅ useAuctions (COMPLETE)
- ✅ useCreatePost (COMPLETE)
- ✅ usePlaceBid (COMPLETE)
- ✅ useCreateAuction (COMPLETE - this migration)

**🎉 PHASE 1: 100% COMPLETE! 🎉**

**Next Phase:** Phase 2 - Component cleanup and service layer removal

---

## Celebration! 🎉

This completes all 5 hooks in Phase 1 of the Relay migration audit!

**Accomplishments:**
- 5 hooks fully migrated to Relay
- All tests passing (20+ tests across 5 hooks)
- Consistent patterns established
- No service layer dependencies
- Clean, reusable APIs

**What's Next:**
After celebrating this milestone, Phase 2 will focus on:
- Replacing old components with Relay versions
- Removing service layer files
- Updating imports across the application
- Final cleanup and documentation

But first... let's complete this final hook! 🚀
