/**
 * Auction Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createAuctionResolver } from '../auctionResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetAuction } from '../../../application/use-cases/auction/GetAuction';
import { FakeAuctionRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockAuction } from '@social-media-app/shared/test-utils/fixtures';

describe('auctionResolver', () => {
  let container: Container;
  let resolver: ReturnType<typeof createAuctionResolver>;

  beforeEach(() => {
    container = new Container();
  });

  it('returns auction when it exists', async () => {
    const auction = createMockAuction({ id: 'auction-1', sellerId: 'seller-1' });
    const repository = new FakeAuctionRepository([auction], []);
    const useCase = new GetAuction(repository);
    container.register('GetAuction', () => useCase);
    resolver = createAuctionResolver(container);

    const result = await resolver({}, { id: 'auction-1' }, {} as any, {} as any);

    expect(result.id).toBe('auction-1');
    expect(result.sellerId).toBe('seller-1');
  });

  it('throws error when auction does not exist', async () => {
    const repository = new FakeAuctionRepository([], []);
    const useCase = new GetAuction(repository);
    container.register('GetAuction', () => useCase);
    resolver = createAuctionResolver(container);

    await expect(resolver({}, { id: 'nonexistent' }, {} as any, {} as any)).rejects.toThrow('Auction not found');
  });

  it('returns auction with all required fields', async () => {
    const auction = createMockAuction({
      id: 'auction-1',
      status: 'ACTIVE',
      currentPrice: 200,
      startingPrice: 100,
    });
    const repository = new FakeAuctionRepository([auction], []);
    const useCase = new GetAuction(repository);
    container.register('GetAuction', () => useCase);
    resolver = createAuctionResolver(container);

    const result = await resolver({}, { id: 'auction-1' }, {} as any, {} as any);

    expect(result.status).toBe('ACTIVE');
    expect(result.currentPrice).toBe(200);
    expect(result.startingPrice).toBe(100);
  });
});
