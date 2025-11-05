/**
 * GetBidHistory Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetBidHistory } from '../GetBidHistory';
import { FakeAuctionRepository } from '../../../../../__tests__/helpers/fake-repositories';

describe('GetBidHistory', () => {
  it('returns bid history for an auction', async () => {
    const bids = [
      { id: 'bid-1', auctionId: 'auction-1', bidderId: 'user-1', amount: 150, createdAt: '2024-01-01' },
      { id: 'bid-2', auctionId: 'auction-1', bidderId: 'user-2', amount: 200, createdAt: '2024-01-02' },
    ];
    const repository = new FakeAuctionRepository([], bids);
    const useCase = new GetBidHistory(repository);

    const result = await useCase.execute('auction-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].auctionId).toBe('auction-1');
    }
  });

  it('returns empty array when no bids exist', async () => {
    const repository = new FakeAuctionRepository([], []);
    const useCase = new GetBidHistory(repository);

    const result = await useCase.execute('auction-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('handles pagination correctly', async () => {
    const bids = Array.from({ length: 25 }, (_, i) => ({
      id: `bid-${i + 1}`,
      auctionId: 'auction-1',
      bidderId: 'user-1',
      amount: 100 + i,
      createdAt: `2024-01-${String(i + 1).padStart(2, '0')}`,
    }));
    const repository = new FakeAuctionRepository([], bids);
    const useCase = new GetBidHistory(repository);

    const result = await useCase.execute('auction-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(20);
      expect(result.data.hasMore).toBe(true);
    }
  });
});
