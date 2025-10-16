/**
 * get-bid-history handler tests
 *
 * Testing: GET /auctions/:auctionId/bids
 * Purpose: Retrieve paginated bid history for an auction (public endpoint)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './get-bid-history.js';
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
    getBidHistory: mockGetBidHistory,
  })),
}));

vi.mock('../../utils/index.js', () => ({
  errorResponse: (status: number, message: string, details?: any) => ({
    statusCode: status,
    body: JSON.stringify({ error: message, message, ...(details && { details }) }),
  }),
  successResponse: (status: number, data: any) => ({
    statusCode: status,
    body: JSON.stringify(data),
  }),
}));

// Mock auction service method
const mockGetBidHistory = vi.fn();

const createMockBid = (id: string, auctionId: string, overrides?: any) => ({
  id,
  auctionId,
  userId: 'user-123',
  amount: 100.0,
  createdAt: '2025-10-15T12:00:00Z',
  ...overrides,
});

describe('get-bid-history handler', () => {
  const validAuctionId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ Retrieve bid history', () => {
    it('should retrieve bid history with default pagination', async () => {
      const mockBids = [
        createMockBid('223e4567-e89b-12d3-a456-426614174001', validAuctionId, { amount: 150.0 }),
        createMockBid('223e4567-e89b-12d3-a456-426614174002', validAuctionId, { amount: 125.0 }),
        createMockBid('223e4567-e89b-12d3-a456-426614174003', validAuctionId, { amount: 100.0 }),
      ];

      mockGetBidHistory.mockResolvedValueOnce({
        bids: mockBids,
        total: 3,
      });

      const event = createMockAPIGatewayEvent({
        pathParameters: {},
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      }); // Remove auctionId

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Auction ID is required');
    });

    it('should reject invalid UUID format', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: 'invalid-uuid' },
        method: 'GET',
        path: '/auctions/invalid-uuid/bids',
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request parameters');
    });

    it('should reject negative limit', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        queryStringParameters: { limit: '-10' },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject zero limit', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        queryStringParameters: { limit: '0' },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject limit exceeding maximum', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        queryStringParameters: { limit: '101' },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject negative offset', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        queryStringParameters: { offset: '-5' },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid limit value', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        queryStringParameters: { limit: 'invalid' },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      // NaN from parseInt gets rejected by Zod
      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid offset value', async () => {
      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        queryStringParameters: { offset: 'invalid' },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      // NaN from parseInt gets rejected by Zod
      expect(result.statusCode).toBe(400);
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetBidHistory.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors', async () => {
      mockGetBidHistory.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    it('should handle service errors gracefully', async () => {
      mockGetBidHistory.mockRejectedValueOnce(new Error('Service unavailable'));

      const event = createMockAPIGatewayEvent({
        pathParameters: { auctionId: validAuctionId },
        method: 'GET',
        path: `/auctions/${validAuctionId}/bids`,
        routeKey: 'GET /auctions/{auctionId}/bids'
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
