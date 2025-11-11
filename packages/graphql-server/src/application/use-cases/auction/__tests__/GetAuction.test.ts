/**
 * GetAuction Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetAuction } from '../GetAuction.js';
import { FakeAuctionRepository } from '../../../../../__tests__/helpers/fake-repositories.js';
import { createMockAuction } from '@social-media-app/shared/test-utils/fixtures';

describe('GetAuction', () => {
  it('returns auction when it exists', async () => {
    const auction = createMockAuction({ id: 'auction-1', sellerId: 'seller-1' });
    const repository = new FakeAuctionRepository([auction], []);
    const useCase = new GetAuction(repository);

    const result = await useCase.execute('auction-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('auction-1');
      expect(result.data.sellerId).toBe('seller-1');
    }
  });

  it('returns error when auction does not exist', async () => {
    const repository = new FakeAuctionRepository([], []);
    const useCase = new GetAuction(repository);

    const result = await useCase.execute('nonexistent');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Auction not found');
    }
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

    const result = await useCase.execute('auction-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE');
      expect(result.data.currentPrice).toBe(200);
      expect(result.data.startingPrice).toBe(100);
    }
  });
});
