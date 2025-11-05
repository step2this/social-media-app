/**
 * Auction Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GraphQLResolveInfo } from 'graphql';
import { createAuctionResolver } from '../auctionResolver';
import { Container } from '../../../infrastructure/di/Container';
import type { GraphQLContext } from '../../../context';
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

    const _parent: any = {};
    const args: { id: string } = { id: 'auction-1' };
    const context: GraphQLContext = {} as GraphQLContext;
    const _info: GraphQLResolveInfo = {} as GraphQLResolveInfo;

    const result = await resolver!(_parent, args, context, _info);

    expect(result.id).toBe('auction-1');
    expect(result.sellerId).toBe('seller-1');
  });

  it('throws error when auction does not exist', async () => {
    const repository = new FakeAuctionRepository([], []);
    const useCase = new GetAuction(repository);
    container.register('GetAuction', () => useCase);
    resolver = createAuctionResolver(container);

    const _parent: any = {};
    const args: { id: string } = { id: 'nonexistent' };
    const context: GraphQLContext = {} as GraphQLContext;
    const _info: GraphQLResolveInfo = {} as GraphQLResolveInfo;

    await expect(resolver!(_parent, args, context, _info)).rejects.toThrow('Auction not found');
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

    const _parent: any = {};
    const args: { id: string } = { id: 'auction-1' };
    const context: GraphQLContext = {} as GraphQLContext;
    const _info: GraphQLResolveInfo = {} as GraphQLResolveInfo;

    const result = await resolver!(_parent, args, context, _info);

    expect(result.status).toBe('ACTIVE');
    expect(result.currentPrice).toBe(200);
    expect(result.startingPrice).toBe(100);
  });
});
