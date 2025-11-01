/**
 * Auctions Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createAuctionsResolver } from '../auctionsResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetAuctions } from '../../../application/use-cases/auction/GetAuctions';
import { FakeAuctionRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockAuctions } from '@social-media-app/shared/test-utils/fixtures';

describe('auctionsResolver', () => {
  let container: Container;
  let resolver: ReturnType<typeof createAuctionsResolver>;

  beforeEach(() => {
    container = new Container();
  });

  it('returns auctions as a valid connection', async () => {
    const auctions = createMockAuctions(5);
    const repository = new FakeAuctionRepository(auctions, []);
    const useCase = new GetAuctions(repository);
    container.register('GetAuctions', () => useCase);
    resolver = createAuctionsResolver(container);

    const result = await resolver({}, { limit: 20 }, {} as any, {} as any);

    expect(result.edges).toHaveLength(5);
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('filters auctions by status', async () => {
    const auctions = [
      ...createMockAuctions(3, { status: 'ACTIVE' }),
      ...createMockAuctions(2, { status: 'ENDED' }),
    ];
    const repository = new FakeAuctionRepository(auctions, []);
    const useCase = new GetAuctions(repository);
    container.register('GetAuctions', () => useCase);
    resolver = createAuctionsResolver(container);

    const result = await resolver({}, { status: 'ACTIVE', limit: 20 }, {} as any, {} as any);

    expect(result.edges).toHaveLength(3);
    expect(result.edges.every(e => e.node.status === 'ACTIVE')).toBe(true);
  });

  it('indicates pagination when more auctions are available', async () => {
    const auctions = createMockAuctions(25);
    const repository = new FakeAuctionRepository(auctions, []);
    const useCase = new GetAuctions(repository);
    container.register('GetAuctions', () => useCase);
    resolver = createAuctionsResolver(container);

    const result = await resolver({}, { limit: 20 }, {} as any, {} as any);

    expect(result.edges).toHaveLength(20);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});
