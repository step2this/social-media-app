/**
 * Auction Test Fixtures
 *
 * Lean test data builders for auction entities.
 */

export interface MockAuction {
  id: string;
  sellerId: string;
  postId: string;
  startingPrice: number;
  currentPrice: number;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  startTime: string;
  endTime: string;
  createdAt: string;
}

/**
 * Creates a single mock auction with optional overrides.
 */
export function createMockAuction(overrides: Partial<MockAuction> = {}): MockAuction {
  return {
    id: `auction-${Math.random().toString(36).slice(2, 9)}`,
    sellerId: 'seller-1',
    postId: 'post-1',
    startingPrice: 100,
    currentPrice: 150,
    status: 'ACTIVE',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 86400000).toISOString(), // +1 day
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates an array of mock auctions.
 */
export function createMockAuctions(count: number, overrides?: Partial<MockAuction>): MockAuction[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAuction({
      id: `auction-${i + 1}`,
      ...overrides,
    })
  );
}

/**
 * Creates an active auction (convenience helper).
 */
export function createMockActiveAuction(overrides?: Partial<MockAuction>): MockAuction {
  return createMockAuction({ status: 'ACTIVE', ...overrides });
}

/**
 * Creates an ended auction (convenience helper).
 */
export function createMockEndedAuction(overrides?: Partial<MockAuction>): MockAuction {
  return createMockAuction({ status: 'ENDED', ...overrides });
}
