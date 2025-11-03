/**
 * AuctionServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { AuctionServiceAdapter } from '../AuctionServiceAdapter';
import { createMockAuction, createMockAuctions } from '@social-media-app/shared/test-utils/fixtures';

describe('AuctionServiceAdapter', () => {
  describe('getAuction', () => {
    it('transforms service response to repository format', async () => {
      const mockAuction = createMockAuction({ id: 'auction-1' });
      const mockService = {
        getAuction: async () => mockAuction,
        listAuctions: async () => ({ auctions: [], hasMore: false, nextCursor: null }),
        getBidHistory: async () => ({ bids: [], hasMore: false, nextCursor: null }),
      };
      const adapter = new AuctionServiceAdapter(mockService as any);

      const result = await adapter.getAuction('auction-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('auction-1');
      }
    });

    it('handles service errors gracefully', async () => {
      const mockService = {
        getAuction: async () => {
          throw new Error('Auction not found');
        },
        listAuctions: async () => ({ auctions: [], hasMore: false, nextCursor: null }),
        getBidHistory: async () => ({ bids: [], hasMore: false, nextCursor: null }),
      };
      const adapter = new AuctionServiceAdapter(mockService as any);

      const result = await adapter.getAuction('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Auction not found');
      }
    });
  });

  describe('getAuctions', () => {
    it('transforms paginated service response', async () => {
      const mockAuctions = createMockAuctions(3);
      const mockService = {
        getAuction: async () => mockAuctions[0],
        listAuctions: async () => ({
          auctions: mockAuctions,
          hasMore: false,
          nextCursor: null,
        }),
        getBidHistory: async () => ({ bids: [], hasMore: false, nextCursor: null }),
      };
      const adapter = new AuctionServiceAdapter(mockService as any);

      const result = await adapter.getAuctions();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toEqual(mockAuctions);
      }
    });

    it('handles service errors gracefully', async () => {
      const mockService = {
        getAuction: async () => createMockAuction(),
        listAuctions: async () => {
          throw new Error('Service down');
        },
        getBidHistory: async () => ({ bids: [], hasMore: false, nextCursor: null }),
      };
      const adapter = new AuctionServiceAdapter(mockService as any);

      const result = await adapter.getAuctions();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Service down');
      }
    });
  });

  describe('getBidHistory', () => {
    it('transforms paginated bid history response', async () => {
      const mockBids = [
        { id: 'bid-1', auctionId: 'auction-1', bidderId: 'user-1', amount: 150, createdAt: '2024-01-01' },
      ];
      const mockService = {
        getAuction: async () => createMockAuction(),
        listAuctions: async () => ({ auctions: [], hasMore: false, nextCursor: null }),
        getBidHistory: async () => ({
          bids: mockBids,
          hasMore: false,
          nextCursor: null,
        }),
      };
      const adapter = new AuctionServiceAdapter(mockService as any);

      const result = await adapter.getBidHistory('auction-1', 20);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toEqual(mockBids);
      }
    });

    it('handles service errors gracefully', async () => {
      const mockService = {
        getAuction: async () => createMockAuction(),
        listAuctions: async () => ({ auctions: [], hasMore: false, nextCursor: null }),
        getBidHistory: async () => {
          throw new Error('Service down');
        },
      };
      const adapter = new AuctionServiceAdapter(mockService as any);

      const result = await adapter.getBidHistory('auction-1', 20);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Service down');
      }
    });
  });
});
