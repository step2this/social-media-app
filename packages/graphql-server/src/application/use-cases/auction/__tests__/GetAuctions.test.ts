/**
 * GetAuctions Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetAuctions } from '../GetAuctions';
import { FakeAuctionRepository } from '../../../../../__tests__/helpers/fake-repositories';
import { createMockAuctions, createMockActiveAuction, createMockEndedAuction } from '@social-media-app/shared/test-utils/fixtures';

describe('GetAuctions', () => {
  it('returns all auctions when no filter is provided', async () => {
    const auctions = createMockAuctions(5);
    const repository = new FakeAuctionRepository(auctions, []);
    const useCase = new GetAuctions(repository);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toHaveLength(5);
    }
  });

  it('filters auctions by status', async () => {
    const auctions = [
      ...createMockAuctions(3, { status: 'ACTIVE' }),
      ...createMockAuctions(2, { status: 'ENDED' }),
    ];
    const repository = new FakeAuctionRepository(auctions, []);
    const useCase = new GetAuctions(repository);

    const result = await useCase.execute('ACTIVE', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toHaveLength(3);
      expect(result.value.items.every(a => a.status === 'ACTIVE')).toBe(true);
    }
  });

  it('handles pagination correctly', async () => {
    const auctions = createMockAuctions(25);
    const repository = new FakeAuctionRepository(auctions, []);
    const useCase = new GetAuctions(repository);

    const result = await useCase.execute(undefined, 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toHaveLength(20);
      expect(result.value.hasMore).toBe(true);
    }
  });
});
