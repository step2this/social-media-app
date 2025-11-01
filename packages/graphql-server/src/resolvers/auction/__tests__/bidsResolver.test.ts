/**
 * Bids Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createBidsResolver } from '../bidsResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetBidHistory } from '../../../application/use-cases/auction/GetBidHistory';
import { FakeAuctionRepository } from '../../../../__tests__/helpers/fake-repositories';

describe('bidsResolver', () => {
  let container: Container;
  let resolver: ReturnType<typeof createBidsResolver>;

  beforeEach(() => {
    container = new Container();
  });

  it('returns bids as a valid connection', async () => {
    const bids = [
      { id: 'bid-1', auctionId: 'auction-1', bidderId: 'user-1', amount: 150, createdAt: '2024-01-01' },
      { id: 'bid-2', auctionId: 'auction-1', bidderId: 'user-2', amount: 200, createdAt: '2024-01-02' },
    ];
    const repository = new FakeAuctionRepository([], bids);
    const useCase = new GetBidHistory(repository);
    container.register('GetBidHistory', () => useCase);
    resolver = createBidsResolver(container);

    const result = await resolver({}, { auctionId: 'auction-1', limit: 20 }, {} as any, {} as any);

    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].node.auctionId).toBe('auction-1');
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('returns empty connection when no bids exist', async () => {
    const repository = new FakeAuctionRepository([], []);
    const useCase = new GetBidHistory(repository);
    container.register('GetBidHistory', () => useCase);
    resolver = createBidsResolver(container);

    const result = await resolver({}, { auctionId: 'auction-1', limit: 20 }, {} as any, {} as any);

    expect(result.edges).toHaveLength(0);
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('indicates pagination when more bids are available', async () => {
    const bids = Array.from({ length: 25 }, (_, i) => ({
      id: `bid-${i + 1}`,
      auctionId: 'auction-1',
      bidderId: 'user-1',
      amount: 100 + i,
      createdAt: `2024-01-${String(i + 1).padStart(2, '0')}`,
    }));
    const repository = new FakeAuctionRepository([], bids);
    const useCase = new GetBidHistory(repository);
    container.register('GetBidHistory', () => useCase);
    resolver = createBidsResolver(container);

    const result = await resolver({}, { auctionId: 'auction-1', limit: 20 }, {} as any, {} as any);

    expect(result.edges).toHaveLength(20);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});
