/**
 * get-auction handler tests
 *
 * Testing: GET /auctions/:auctionId
 * Purpose: Retrieve auction details by ID (public endpoint)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './get-auction.js';

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

// Test helper to create mock event
const createMockEvent = (auctionId: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /auctions/{auctionId}',
  rawPath: `/auctions/${auctionId}`,
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
  },
  pathParameters: {
    auctionId,
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'GET',
      path: `/auctions/${auctionId}`,
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent',
    },
    stage: 'test',
    time: '2024-01-01T00:00:00.000Z',
    timeEpoch: 1704067200000,
    domainName: 'api.example.com',
    accountId: '123456789012',
    apiId: 'api123',
    routeKey: 'GET /auctions/{auctionId}',
  } as any,
  body: null,
  isBase64Encoded: false,
});

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

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auction).toBeDefined();
      expect(body.auction.id).toBe(validAuctionId);
      expect(body.auction.title).toBe('Vintage Camera');

      expect(mockGetAuction).toHaveBeenCalledWith(validAuctionId);
    });

    it('should retrieve auction without optional fields', async () => {
      const mockAuction = {
        id: validAuctionId,
        userId: 'user-123',
        title: 'Simple Item',
        description: undefined,
        startPrice: 50.0,
        reservePrice: undefined,
        currentPrice: 50.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
        status: 'active',
        winnerId: undefined,
        bidCount: 5,
        createdAt: '2025-10-15T00:00:00Z',
        updatedAt: '2025-10-15T00:00:00Z',
      };

      mockGetAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auction.description).toBeUndefined();
      expect(body.auction.reservePrice).toBeUndefined();
      expect(body.auction.bidCount).toBe(5);
    });

    it('should retrieve active auction with bids', async () => {
      const mockAuction = {
        id: validAuctionId,
        userId: 'user-123',
        title: 'Hot Item',
        description: 'Popular auction',
        startPrice: 100.0,
        reservePrice: 500.0,
        currentPrice: 250.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
        status: 'active',
        winnerId: undefined,
        bidCount: 12,
        createdAt: '2025-10-15T00:00:00Z',
        updatedAt: '2025-10-15T12:00:00Z',
      };

      mockGetAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auction.status).toBe('active');
      expect(body.auction.currentPrice).toBe(250.0);
      expect(body.auction.bidCount).toBe(12);
    });

    it('should retrieve completed auction', async () => {
      const mockAuction = {
        id: validAuctionId,
        userId: 'user-123',
        title: 'Completed Auction',
        description: 'Sold item',
        startPrice: 100.0,
        reservePrice: 500.0,
        currentPrice: 600.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
        status: 'completed',
        winnerId: 'winner-456',
        bidCount: 25,
        createdAt: '2025-10-15T00:00:00Z',
        updatedAt: '2025-10-16T00:01:00Z',
      };

      mockGetAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auction.status).toBe('completed');
      expect(body.auction.winnerId).toBe('winner-456');
      expect(body.auction.currentPrice).toBe(600.0);
    });
  });

  describe('❌ Invalid requests', () => {
    it('should return 404 when auction not found', async () => {
      mockGetAuction.mockRejectedValueOnce(new Error('Auction not found'));

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Auction not found');
    });

    it('should return 400 for missing auction ID', async () => {
      const event = createMockEvent(validAuctionId);
      event.pathParameters = {}; // Remove auctionId

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Auction ID is required');
    });

    it('should return 404 or 500 for invalid UUID format', async () => {
      // Handler doesn't validate UUID format, passes to AuctionService
      // which will throw an error when querying PostgreSQL
      mockGetAuction.mockRejectedValueOnce(new Error('invalid input syntax for type uuid'));

      const event = createMockEvent('invalid-uuid');
      const result = await handler(event);

      // Should return 500 for database errors
      expect([404, 500]).toContain(result.statusCode);
    });

    it('should return 404 for non-existent valid UUID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      mockGetAuction.mockRejectedValueOnce(new Error('Auction not found'));

      const event = createMockEvent(nonExistentId);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetAuction.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors', async () => {
      mockGetAuction.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
