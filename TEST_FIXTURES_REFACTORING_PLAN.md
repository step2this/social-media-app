# Test Fixtures Refactoring Plan

**Date**: 2025-10-21
**Goal**: DRY up AuctionService.test.ts by extracting reusable test fixtures

---

## 🎯 Analysis: Current Problems

### Problem 1: Repetitive Auction Objects
Every test creates full `Auction` objects with ~20 properties:
```typescript
const mockAuction: Auction = {
  id: '1',
  userId: 'user-1',
  seller: { id: 'user-1', handle: 'seller', username: 'seller', displayName: null, profilePictureUrl: null },
  title: 'Test Auction',
  description: null,
  imageUrl: 'https://example.com/image.jpg',
  startPrice: 100,
  reservePrice: null,
  currentPrice: 100,
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-08T00:00:00Z',
  status: 'ACTIVE',
  winnerId: null,
  winner: null,
  bidCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};
```

**Repeated**: ~10 times throughout the file
**Lines of code**: ~200 lines just for auction fixtures

### Problem 2: Repetitive Bid Objects
Every test creates full `Bid` objects:
```typescript
const mockBid: Bid = {
  id: 'bid-1',
  auctionId: 'auction-1',
  userId: 'user-1',
  bidder: { id: 'user-1', handle: 'bidder', username: 'bidder', displayName: null, profilePictureUrl: null },
  amount: 150,
  createdAt: '2024-01-01T00:00:00Z',
};
```

**Repeated**: ~4 times
**Lines of code**: ~30 lines just for bid fixtures

### Problem 3: Repetitive Profile Objects
Every test creates profile objects for sellers/winners/bidders:
```typescript
seller: {
  id: 'user-1',
  handle: 'seller',
  username: 'seller',
  displayName: null,
  profilePictureUrl: null,
}
```

**Repeated**: ~15 times
**Lines of code**: ~75 lines just for profile fixtures

### Problem 4: Repetitive GraphQL Response Structures
Every test wraps data in GraphQL response format:
```typescript
client.setQueryResponse({
  status: 'success',
  data: {
    auctions: {
      edges: [...],
      pageInfo: { hasNextPage: true, hasPreviousPage: false, startCursor: '...', endCursor: '...' }
    }
  }
});
```

**Repeated**: ~7 times
**Lines of code**: ~100 lines just for response wrappers

---

## 🏗️ Solution: Test Fixture Factory Pattern

### Approach: Builder Pattern with Sensible Defaults

Create factory functions that:
1. ✅ Provide sensible defaults for all required fields
2. ✅ Allow overriding specific fields for test-specific scenarios
3. ✅ Type-safe with TypeScript
4. ✅ Easy to read and understand in tests

---

## 📝 Implementation Plan

### File Structure

```
packages/frontend/src/services/__tests__/
├── AuctionService.test.ts           # Main test file (refactored)
└── fixtures/
    ├── auctionFixtures.ts           # Auction & Bid factories
    ├── profileFixtures.ts           # Profile factories
    └── graphqlFixtures.ts           # GraphQL response wrappers
```

---

## 📄 Fixture Files to Create

### 1. Profile Fixtures (`profileFixtures.ts`)

```typescript
/**
 * Test fixtures for Profile objects
 */
import type { Profile } from '../../../graphql/operations/auctions.js';

/**
 * Create a mock Profile with sensible defaults
 *
 * @example
 * ```typescript
 * const seller = createMockProfile({ id: 'user-1', handle: 'seller' });
 * const winner = createMockProfile({ id: 'user-2', handle: 'winner', displayName: 'John Doe' });
 * ```
 */
export function createMockProfile(
  overrides: Partial<Profile> = {}
): Profile {
  return {
    id: 'profile-1',
    handle: 'testuser',
    username: 'testuser',
    displayName: null,
    profilePictureUrl: null,
    ...overrides,
  };
}

/**
 * Create a seller profile (common pattern)
 */
export function createMockSeller(
  overrides: Partial<Profile> = {}
): Profile {
  return createMockProfile({
    id: 'seller-1',
    handle: 'seller',
    username: 'seller',
    ...overrides,
  });
}

/**
 * Create a bidder profile (common pattern)
 */
export function createMockBidder(
  overrides: Partial<Profile> = {}
): Profile {
  return createMockProfile({
    id: 'bidder-1',
    handle: 'bidder',
    username: 'bidder',
    ...overrides,
  });
}
```

**Benefits**:
- ✅ One function for all profiles
- ✅ Specialized helpers for common cases
- ✅ Override any field when needed
- ✅ Type-safe

---

### 2. Auction Fixtures (`auctionFixtures.ts`)

```typescript
/**
 * Test fixtures for Auction and Bid objects
 */
import type { Auction, Bid, AuctionStatus } from '../../../graphql/operations/auctions.js';
import { createMockSeller, createMockBidder } from './profileFixtures.js';

/**
 * Create a mock Auction with sensible defaults
 *
 * @example
 * ```typescript
 * // Basic auction
 * const auction = createMockAuction();
 *
 * // Auction with specific fields
 * const activeAuction = createMockAuction({
 *   id: 'auction-123',
 *   title: 'Vintage Watch',
 *   status: 'ACTIVE',
 *   currentPrice: 150,
 *   bidCount: 5
 * });
 *
 * // Completed auction with winner
 * const completedAuction = createMockAuction({
 *   status: 'COMPLETED',
 *   winnerId: 'user-2',
 *   winner: createMockBidder({ id: 'user-2' })
 * });
 * ```
 */
export function createMockAuction(
  overrides: Partial<Auction> = {}
): Auction {
  const sellerId = overrides.userId || 'seller-1';
  const seller = overrides.seller || createMockSeller({ id: sellerId });

  return {
    id: 'auction-1',
    userId: sellerId,
    seller,
    title: 'Test Auction',
    description: null,
    imageUrl: 'https://example.com/image.jpg',
    startPrice: 100,
    reservePrice: null,
    currentPrice: 100,
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-08T00:00:00Z',
    status: 'PENDING',
    winnerId: null,
    winner: null,
    bidCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock Bid with sensible defaults
 *
 * @example
 * ```typescript
 * const bid = createMockBid();
 * const highBid = createMockBid({ amount: 200 });
 * ```
 */
export function createMockBid(
  overrides: Partial<Bid> = {}
): Bid {
  const bidderId = overrides.userId || 'bidder-1';
  const bidder = overrides.bidder || createMockBidder({ id: bidderId });

  return {
    id: 'bid-1',
    auctionId: 'auction-1',
    userId: bidderId,
    bidder,
    amount: 150,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create multiple auctions quickly
 *
 * @example
 * ```typescript
 * const auctions = createMockAuctions(5); // 5 auctions with unique IDs
 * ```
 */
export function createMockAuctions(count: number): Auction[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAuction({
      id: `auction-${i + 1}`,
      title: `Auction ${i + 1}`,
    })
  );
}

/**
 * Create multiple bids quickly
 */
export function createMockBids(count: number, auctionId: string = 'auction-1'): Bid[] {
  return Array.from({ length: count }, (_, i) =>
    createMockBid({
      id: `bid-${i + 1}`,
      auctionId,
      userId: `user-${i + 1}`,
      bidder: createMockBidder({
        id: `user-${i + 1}`,
        handle: `bidder${i + 1}`,
        username: `bidder${i + 1}`,
      }),
      amount: 100 + (i + 1) * 25,
    })
  );
}
```

**Benefits**:
- ✅ Sensible defaults reduce boilerplate
- ✅ Auto-generates related fields (seller, bidder)
- ✅ Helper for bulk creation
- ✅ Override any field when needed

---

### 3. GraphQL Response Fixtures (`graphqlFixtures.ts`)

```typescript
/**
 * Test fixtures for GraphQL responses
 */
import type { AsyncState } from '../../../graphql/types.js';
import type {
  Auction,
  Bid,
  AuctionConnection,
  AuctionEdge,
  PageInfo,
  BidConnection,
} from '../../../graphql/operations/auctions.js';

/**
 * Create success AsyncState
 */
export function createSuccessState<T>(data: T): AsyncState<T> {
  return { status: 'success', data };
}

/**
 * Create error AsyncState
 */
export function createErrorState(
  message: string,
  code: string = 'ERROR'
): AsyncState<never> {
  return {
    status: 'error',
    error: {
      message,
      extensions: { code },
    },
  };
}

/**
 * Create paginated auction connection
 *
 * @example
 * ```typescript
 * const connection = createAuctionConnection(
 *   [auction1, auction2],
 *   { hasNextPage: true, endCursor: 'cursor-2' }
 * );
 * ```
 */
export function createAuctionConnection(
  auctions: Auction[],
  pageInfo: Partial<PageInfo> = {}
): AuctionConnection {
  const edges: AuctionEdge[] = auctions.map((auction, i) => ({
    cursor: `cursor-${i + 1}`,
    node: auction,
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
      ...pageInfo,
    },
  };
}

/**
 * Create bid connection
 */
export function createBidConnection(
  bids: Bid[],
  total?: number
): BidConnection {
  return {
    bids,
    total: total !== undefined ? total : bids.length,
  };
}

/**
 * Create ListAuctions GraphQL response
 */
export function createListAuctionsResponse(
  auctions: Auction[],
  pageInfo: Partial<PageInfo> = {}
): AsyncState<{ auctions: AuctionConnection }> {
  return createSuccessState({
    auctions: createAuctionConnection(auctions, pageInfo),
  });
}

/**
 * Create GetAuction GraphQL response
 */
export function createGetAuctionResponse(
  auction: Auction | null
): AsyncState<{ auction: Auction | null }> {
  return createSuccessState({ auction });
}

/**
 * Create GetBids GraphQL response
 */
export function createGetBidsResponse(
  bids: Bid[],
  total?: number
): AsyncState<{ bids: BidConnection }> {
  return createSuccessState({
    bids: createBidConnection(bids, total),
  });
}

/**
 * Create CreateAuction GraphQL response
 */
export function createCreateAuctionResponse(
  auction: Auction,
  uploadUrl: string = 'https://s3.example.com/upload'
): AsyncState<{ createAuction: { auction: Auction; uploadUrl: string } }> {
  return createSuccessState({
    createAuction: { auction, uploadUrl },
  });
}

/**
 * Create PlaceBid GraphQL response
 */
export function createPlaceBidResponse(
  bid: Bid,
  auction: Auction
): AsyncState<{ placeBid: { bid: Bid; auction: Auction } }> {
  return createSuccessState({
    placeBid: { bid, auction },
  });
}
```

**Benefits**:
- ✅ Encapsulates GraphQL response structure
- ✅ No need to remember AsyncState format
- ✅ Easy to create success/error states
- ✅ Specialized helpers for each operation

---

## 📝 Before & After Comparison

### Before (Current Code - ~20 lines)

```typescript
test('should call GraphQL client with correct query', async () => {
  const mockAuction: Auction = {
    id: 'auction-123',
    userId: 'user-1',
    seller: {
      id: 'user-1',
      handle: 'seller',
      username: 'seller',
      displayName: null,
      profilePictureUrl: null,
    },
    title: 'Test Auction',
    description: 'Description',
    imageUrl: 'https://example.com/image.jpg',
    startPrice: 100,
    reservePrice: null,
    currentPrice: 150,
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-08T00:00:00Z',
    status: 'ACTIVE',
    winnerId: null,
    winner: null,
    bidCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  client.setQueryResponse({
    status: 'success',
    data: { auction: mockAuction },
  });

  const result = await service.getAuction('auction-123');

  expect(client.queryCalls).toHaveLength(1);
  expect(isSuccess(result)).toBe(true);
});
```

### After (With Fixtures - ~8 lines)

```typescript
test('should call GraphQL client with correct query', async () => {
  const auction = createMockAuction({
    id: 'auction-123',
    currentPrice: 150,
    bidCount: 5,
  });

  client.setQueryResponse(createGetAuctionResponse(auction));

  const result = await service.getAuction('auction-123');

  expect(client.queryCalls).toHaveLength(1);
  expect(isSuccess(result)).toBe(true);
});
```

**Result**:
- 60% reduction in lines
- More readable (focuses on what's being tested)
- Less noise (defaults hidden)

---

## 📊 Expected Impact

### Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total lines | ~644 | ~350 | -46% |
| Auction fixtures | ~200 lines | ~30 lines | -85% |
| Bid fixtures | ~30 lines | ~10 lines | -67% |
| Profile fixtures | ~75 lines | ~10 lines | -87% |
| GraphQL wrappers | ~100 lines | ~20 lines | -80% |
| Test readability | Low | High | +++++ |

### Maintainability Benefits

1. **Single Source of Truth**: Change Profile structure once, all tests update
2. **Focus on Test Intent**: Tests show only what's important for that test
3. **Easier to Write Tests**: New tests require less boilerplate
4. **Type Safety**: Factory functions ensure all required fields present
5. **Consistency**: All tests use same fixture patterns

---

## 🚀 Migration Steps

### Step 1: Create Fixture Files (TDD)

1. Create `profileFixtures.ts` with tests
2. Create `auctionFixtures.ts` with tests
3. Create `graphqlFixtures.ts` with tests

### Step 2: Refactor Test File (One Test at a Time)

1. Update imports
2. Refactor `listAuctions` tests (4 tests)
3. Refactor `getAuction` tests (2 tests)
4. Refactor `createAuction` tests (3 tests)
5. Refactor `placeBid` tests (2 tests)
6. Refactor `getBidHistory` tests (2 tests)

### Step 3: Validate

1. Run all tests (should still pass)
2. Check test coverage (should be same)
3. Verify readability improvements

---

## 🎯 Priority Order

### High Priority (Do First)
1. ✅ `createMockAuction()` - Most repetitive
2. ✅ `createMockProfile()` - Used everywhere
3. ✅ `createListAuctionsResponse()` - Complex structure

### Medium Priority
4. ✅ `createMockBid()` - Used in several tests
5. ✅ `createGetAuctionResponse()` - Common pattern

### Low Priority (Nice to Have)
6. ✅ `createMockAuctions()` - Bulk creation helper
7. ✅ `createMockBids()` - Bulk creation helper

---

## 📝 Example Refactored Test

### Complete Before/After

#### Before (~35 lines)
```typescript
test('should return bid and updated auction', async () => {
  const mockBid: Bid = {
    id: 'bid-1',
    auctionId: 'auction-1',
    userId: 'user-1',
    bidder: {
      id: 'user-1',
      handle: 'bidder',
      username: 'bidder',
      displayName: null,
      profilePictureUrl: null,
    },
    amount: 150,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockAuction: Auction = {
    id: 'auction-1',
    userId: 'seller-1',
    seller: {
      id: 'seller-1',
      handle: 'seller',
      username: 'seller',
      displayName: null,
      profilePictureUrl: null,
    },
    title: 'Test Auction',
    description: null,
    imageUrl: 'https://example.com/image.jpg',
    startPrice: 100,
    reservePrice: null,
    currentPrice: 150,
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-08T00:00:00Z',
    status: 'ACTIVE',
    winnerId: null,
    winner: null,
    bidCount: 6,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  client.setMutationResponse({
    status: 'success',
    data: {
      placeBid: {
        bid: mockBid,
        auction: mockAuction,
      },
    },
  });

  const result = await service.placeBid('auction-1', 150);

  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.data.bid.amount).toBe(150);
    expect(result.data.auction.currentPrice).toBe(150);
    expect(result.data.auction.bidCount).toBe(6);
  }
});
```

#### After (~12 lines)
```typescript
test('should return bid and updated auction', async () => {
  const bid = createMockBid({ amount: 150 });
  const auction = createMockAuction({
    currentPrice: 150,
    bidCount: 6
  });

  client.setMutationResponse(createPlaceBidResponse(bid, auction));

  const result = await service.placeBid('auction-1', 150);

  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.data.bid.amount).toBe(150);
    expect(result.data.auction.currentPrice).toBe(150);
    expect(result.data.auction.bidCount).toBe(6);
  }
});
```

**Improvement**: 66% fewer lines, much more readable!

---

## 🔧 Implementation Commands

```bash
# Step 1: Create fixture directory
mkdir -p packages/frontend/src/services/__tests__/fixtures

# Step 2: Create fixture files (use touch, then populate)
touch packages/frontend/src/services/__tests__/fixtures/profileFixtures.ts
touch packages/frontend/src/services/__tests__/fixtures/auctionFixtures.ts
touch packages/frontend/src/services/__tests__/fixtures/graphqlFixtures.ts

# Step 3: Run tests after each fixture
pnpm --filter @social-media-app/frontend test src/services/__tests__/AuctionService.test.ts
```

---

## ✅ Success Criteria

1. ✅ All 17 tests still passing
2. ✅ Test file reduced to ~350 lines (from ~644)
3. ✅ No loss of test coverage
4. ✅ Tests more readable (focus on intent)
5. ✅ Easy to add new tests (less boilerplate)

---

**Ready to implement! Should I proceed with creating the fixture files?** 🚀
