/**
 * get-bid-history handler tests
 *
 * Testing: GET /auctions/:auctionId/bids
 * Purpose: Retrieve paginated bid history for an auction (public endpoint)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './get-bid-history.js';

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

// Test helper to create mock event
const createMockEvent = (
  auctionId: string,
  queryParams?: Record<string, string>
): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /auctions/{auctionId}/bids',
  rawPath: `/auctions/${auctionId}/bids`,
  rawQueryString: queryParams ? new URLSearchParams(queryParams).toString() : '',
  headers: {
    'content-type': 'application/json',
  },
  pathParameters: {
    auctionId,
  },
  queryStringParameters: queryParams,
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'GET',
      path: `/auctions/${auctionId}/bids`,
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
    routeKey: 'GET /auctions/{auctionId}/bids',
  } as any,
  body: null,
  isBase64Encoded: false,
});

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

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids).toHaveLength(3);
      expect(body.total).toBe(3);

      expect(mockGetBidHistory).toHaveBeenCalledWith({
        auctionId: validAuctionId,
        limit: 50, // Default limit
        offset: 0, // Default offset
      });
    });

    it('should retrieve bid history with custom limit', async () => {
      const mockBids = [
        createMockBid('223e4567-e89b-12d3-a456-426614174004', validAuctionId, { amount: 150.0 }),
        createMockBid('223e4567-e89b-12d3-a456-426614174005', validAuctionId, { amount: 125.0 }),
      ];

      mockGetBidHistory.mockResolvedValueOnce({
        bids: mockBids,
        total: 10,
      });

      const event = createMockEvent(validAuctionId, { limit: '2' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids).toHaveLength(2);
      expect(body.total).toBe(10);

      expect(mockGetBidHistory).toHaveBeenCalledWith({
        auctionId: validAuctionId,
        limit: 2,
        offset: 0,
      });
    });

    it('should retrieve bid history with custom offset', async () => {
      const mockBids = [
        createMockBid('223e4567-e89b-12d3-a456-426614174006', validAuctionId, { amount: 90.0 }),
        createMockBid('223e4567-e89b-12d3-a456-426614174007', validAuctionId, { amount: 85.0 }),
      ];

      mockGetBidHistory.mockResolvedValueOnce({
        bids: mockBids,
        total: 10,
      });

      const event = createMockEvent(validAuctionId, { limit: '5', offset: '5' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids).toHaveLength(2);

      expect(mockGetBidHistory).toHaveBeenCalledWith({
        auctionId: validAuctionId,
        limit: 5,
        offset: 5,
      });
    });

    it('should retrieve empty bid history', async () => {
      mockGetBidHistory.mockResolvedValueOnce({
        bids: [],
        total: 0,
      });

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should retrieve large bid history', async () => {
      const mockBids = Array.from({ length: 100 }, (_, i) =>
        createMockBid(
          `223e4567-e89b-12d3-a456-4266141740${String(i).padStart(2, '0')}`,
          validAuctionId,
          { amount: 100 + i }
        )
      );

      mockGetBidHistory.mockResolvedValueOnce({
        bids: mockBids.slice(0, 50), // First page
        total: 100,
      });

      const event = createMockEvent(validAuctionId, { limit: '50' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids).toHaveLength(50);
      expect(body.total).toBe(100);
    });

    it('should retrieve second page of results', async () => {
      const mockBids = Array.from({ length: 50 }, (_, i) =>
        createMockBid(
          `323e4567-e89b-12d3-a456-4266141740${String(i).padStart(2, '0')}`,
          validAuctionId,
          { amount: 150 + i }
        )
      );

      mockGetBidHistory.mockResolvedValueOnce({
        bids: mockBids,
        total: 100,
      });

      const event = createMockEvent(validAuctionId, { limit: '50', offset: '50' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids).toHaveLength(50);
      expect(body.total).toBe(100);
    });

    it('should handle offset beyond total', async () => {
      mockGetBidHistory.mockResolvedValueOnce({
        bids: [],
        total: 10,
      });

      const event = createMockEvent(validAuctionId, { offset: '20' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids).toEqual([]);
      expect(body.total).toBe(10);
    });
  });

  describe('📊 Bid details', () => {
    it('should retrieve bids with correct structure', async () => {
      const mockBids = [
        createMockBid('223e4567-e89b-12d3-a456-426614174001', validAuctionId, {
          userId: 'user-456',
          amount: 200.0,
          createdAt: '2025-10-15T14:00:00Z',
        }),
        createMockBid('223e4567-e89b-12d3-a456-426614174002', validAuctionId, {
          userId: 'user-789',
          amount: 175.5,
          createdAt: '2025-10-15T13:30:00Z',
        }),
      ];

      mockGetBidHistory.mockResolvedValueOnce({
        bids: mockBids,
        total: 2,
      });

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.bids[0]).toHaveProperty('id');
      expect(body.bids[0]).toHaveProperty('auctionId');
      expect(body.bids[0]).toHaveProperty('userId');
      expect(body.bids[0]).toHaveProperty('amount');
      expect(body.bids[0]).toHaveProperty('createdAt');
      expect(body.bids[0].amount).toBe(200.0);
    });

    it('should retrieve bids from different users', async () => {
      const mockBids = [
        createMockBid('323e4567-e89b-12d3-a456-426614174100', validAuctionId, {
          userId: 'user-1',
          amount: 150.0,
        }),
        createMockBid('323e4567-e89b-12d3-a456-426614174101', validAuctionId, {
          userId: 'user-2',
          amount: 125.0,
        }),
        createMockBid('323e4567-e89b-12d3-a456-426614174102', validAuctionId, {
          userId: 'user-3',
          amount: 100.0,
        }),
      ];

      mockGetBidHistory.mockResolvedValueOnce({
        bids: mockBids,
        total: 3,
      });

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      const userIds = body.bids.map((bid: any) => bid.userId);
      expect(userIds).toEqual(['user-1', 'user-2', 'user-3']);
    });
  });

  describe('❌ Invalid requests', () => {
    it('should return 400 for missing auction ID', async () => {
      const event = createMockEvent(validAuctionId);
      event.pathParameters = {}; // Remove auctionId

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Auction ID is required');
    });

    it('should reject invalid UUID format', async () => {
      const event = createMockEvent('invalid-uuid');
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request parameters');
    });

    it('should reject negative limit', async () => {
      const event = createMockEvent(validAuctionId, { limit: '-10' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject zero limit', async () => {
      const event = createMockEvent(validAuctionId, { limit: '0' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject limit exceeding maximum', async () => {
      const event = createMockEvent(validAuctionId, { limit: '101' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject negative offset', async () => {
      const event = createMockEvent(validAuctionId, { offset: '-5' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid limit value', async () => {
      const event = createMockEvent(validAuctionId, { limit: 'invalid' });
      const result = await handler(event);

      // NaN from parseInt gets rejected by Zod
      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid offset value', async () => {
      const event = createMockEvent(validAuctionId, { offset: 'invalid' });
      const result = await handler(event);

      // NaN from parseInt gets rejected by Zod
      expect(result.statusCode).toBe(400);
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetBidHistory.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors', async () => {
      mockGetBidHistory.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    it('should handle service errors gracefully', async () => {
      mockGetBidHistory.mockRejectedValueOnce(new Error('Service unavailable'));

      const event = createMockEvent(validAuctionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
