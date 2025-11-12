/**
 * AuctionServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { AuctionServiceAdapter } from '../AuctionServiceAdapter.js';
import { createMockAuction } from '@social-media-app/shared/test-utils/fixtures';
import type { AuctionService } from '@social-media-app/auction-dal';

describe('AuctionServiceAdapter', () => {
  describe('getAuction', () => {
    it('transforms service response to repository format', async () => {
      // Mock DAL format (lowercase status, userId instead of sellerId)
      const mockAuction = {
        id: 'auction-1',
        userId: 'seller-1',
        startPrice: 100,
        currentPrice: 150,
        status: 'active', // DAL format: lowercase
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
      };
      const mockService = {
        getAuction: async () => mockAuction,
        listAuctions: async () => ({ auctions: [], hasMore: false, nextCursor: null }),
        getBidHistory: async () => ({ bids: [], hasMore: false, nextCursor: null }),
      };
      const adapter = new AuctionServiceAdapter(mockService as unknown as AuctionService);

      const result = await adapter.getAuction('auction-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('auction-1');
        // Adapter transforms userId → sellerId, startPrice → startingPrice, lowercase → uppercase
        expect(result.data.sellerId).toBe('seller-1');
        expect(result.data.startingPrice).toBe(100);
        expect(result.data.status).toBe('ACTIVE');
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
      const adapter = new AuctionServiceAdapter(mockService as unknown as AuctionService);

      const result = await adapter.getAuction('nonexistent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Auction not found');
      }
    });
  });

  describe('getAuctions', () => {
    it('transforms paginated service response', async () => {
      // Mock DAL format
      const mockAuctions = [
        {
          id: 'auction-1',
          userId: 'seller-1',
          startPrice: 100,
          currentPrice: 150,
          status: 'active',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      const mockService = {
        getAuction: async () => mockAuctions[0],
        listAuctions: async () => ({
          auctions: mockAuctions,
          hasMore: false,
          nextCursor: null,
        }),
        getBidHistory: async () => ({ bids: [], hasMore: false, nextCursor: null }),
      };
      const adapter = new AuctionServiceAdapter(mockService as unknown as AuctionService);

      const result = await adapter.getAuctions();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items.length).toBe(1);
        expect(result.data.items[0].id).toBe('auction-1');
        expect(result.data.items[0].sellerId).toBe('seller-1');
        expect(result.data.items[0].status).toBe('ACTIVE');
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
      const adapter = new AuctionServiceAdapter(mockService as unknown as AuctionService);

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
        { id: 'bid-1', auctionId: 'auction-1', userId: 'user-1', amount: 150, createdAt: '2024-01-01' },
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
      const adapter = new AuctionServiceAdapter(mockService as unknown as AuctionService);

      const result = await adapter.getBidHistory('auction-1', 20);

      expect(result.success).toBe(true);
      if (result.success) {
        // Adapter transforms userId → bidderId
        expect(result.data.items).toEqual([
          { id: 'bid-1', auctionId: 'auction-1', bidderId: 'user-1', amount: 150, createdAt: '2024-01-01' },
        ]);
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
      const adapter = new AuctionServiceAdapter(mockService as unknown as AuctionService);

      const result = await adapter.getBidHistory('auction-1', 20);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Service down');
      }
    });
  });
});
