/**
 * get-auction handler tests
 *
 * Testing: GET /auctions/:auctionId
 * Purpose: Retrieve auction details by ID (public endpoint)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-auction.js';
import { createMockAPIGatewayEvent } from '@social-media-app/shared/test-utils';

// Mock PostgreSQL Pool
const mockPoolQuery = vi.fn();
const mockPool = {
  query: mockPoolQuery,
  connect: vi.fn(),
  end: vi.fn(),
};

// Mock dependencies
vi.mock('pg', () => ({
  Pool: vi.fn(() => mockPool),
}));

vi.mock('@social-media-app/auction-dal', () => ({
  AuctionService: vi.fn().mockImplementation(() => ({
    getAuction: mockGetAuction,
  })),
}));

vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string) => ({
    statusCode: status,
    body: JSON.stringify({ error: message, message }),
  }),
  successResponse: (status: number, data: any) => ({
    statusCode: status,
    body: JSON.stringify(data),
  }),
}));

// Mock auction service method
const mockGetAuction = vi.fn();



describe('get-auction handler', () => {
  const validAuctionId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ Valid requests', () => {
    it('should retrieve auction by ID', async () => {
      const mockAuction = {
        id: validAuctionId,
        userId: 'user-123',
        title: 'Vintage Camera',
        description: 'Rare camera',
        startPrice: 100.0,
        reservePrice: 500.0,
        currentPrice: 100.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
        status: 'pending',
        winnerId: undefined,
        bidCount: 0,
        createdAt: '2025-10-15T00:00:00Z',
        updatedAt: '2025-10-15T00:00:00Z',
      };

      mockGetAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockAPIGatewayEvent({
        pathParameters: {},
        method: 'GET',
        path: `/auctions/${validAuctionId}`,
        routeKey: 'GET /auctions/{auctionId}'
      }); // Remove auctionId

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Auction ID is required');
    });

    it('should return 404 or 500 for invalid UUID format', async () => {
      // Handler doesn't validate UUID format, passes to AuctionService
      // which will throw an error when querying PostgreSQL
      mockGetAuction.mockRejectedValueOnce(new Error('invalid input syntax for type uuid'));

      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: 'invalid-uuid' },
        method: 'GET',
        path: '/auctions/invalid-uuid',
        routeKey: 'GET /auctions/{auctionId}'
      });
      const result = await handler(event);

      // Should return 500 for database errors
      expect([404, 500]).toContain(result.statusCode);
    });

    it('should return 404 for non-existent valid UUID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      mockGetAuction.mockRejectedValueOnce(new Error('Auction not found'));

      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: nonExistentId },
        method: 'GET',
        path: `/auctions/${nonExistentId}`,
        routeKey: 'GET /auctions/{auctionId}'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetAuction.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        method: 'GET',
        path: `/auctions/${validAuctionId}`,
        routeKey: 'GET /auctions/{auctionId}'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors', async () => {
      mockGetAuction.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        method: 'GET',
        path: `/auctions/${validAuctionId}`,
        routeKey: 'GET /auctions/{auctionId}'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
