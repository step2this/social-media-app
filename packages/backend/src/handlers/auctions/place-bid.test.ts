/**
 * place-bid handler tests
 *
 * Testing: POST /bids
 * Purpose: Place bid on auction with ACID transaction support (authenticated endpoint)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './place-bid.js';

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
    placeBid: mockPlaceBid,
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
  verifyAccessToken: vi.fn(),
  getJWTConfigFromEnv: vi.fn(() => ({
    secret: 'test-secret',
    accessTokenExpiry: 900,
    refreshTokenExpiry: 2592000,
  })),
}));

// Mock auction service method
const mockPlaceBid = vi.fn();

// Test helper to create mock event
const createMockEvent = (body?: any, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'POST /bids',
  rawPath: '/bids',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader }),
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'POST',
      path: '/bids',
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
    routeKey: 'POST /bids',
  } as any,
  body: body ? JSON.stringify(body) : null,
  isBase64Encoded: false,
});

describe('place-bid handler', () => {
  const mockUserId = 'user-123';
  const mockAuctionId = '123e4567-e89b-12d3-a456-426614174000';
  const validToken = 'valid-jwt-token';

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup JWT mocking
    const utils = await import('../../utils/index.js');
    vi.mocked(utils.verifyAccessToken).mockResolvedValue({
      userId: mockUserId,
      email: 'test@example.com',
    } as any);
  });

  describe('✅ Valid bids', () => {
    it('should place bid successfully', async () => {
      const mockResult = {
        bid: {
          id: '223e4567-e89b-12d3-a456-426614174000',
          auctionId: mockAuctionId,
          userId: mockUserId,
          amount: 150.0,
          createdAt: '2025-10-15T12:00:00Z',
        },
        auction: {
          id: mockAuctionId,
          userId: 'seller-456',
          title: 'Test Auction',
          description: 'Test description',
          startPrice: 100.0,
          reservePrice: 500.0,
          currentPrice: 150.0, // Updated to bid amount
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
          status: 'active',
          winnerId: undefined,
          bidCount: 1, // Incremented
          createdAt: '2025-10-15T00:00:00Z',
          updatedAt: '2025-10-15T12:00:00Z',
        },
      };

      mockPlaceBid.mockResolvedValueOnce(mockResult);

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body!);
      expect(body.bid).toBeDefined();
      expect(body.auction).toBeDefined();
      expect(body.bid.amount).toBe(150.0);
      expect(body.auction.currentPrice).toBe(150.0);
      expect(body.auction.bidCount).toBe(1);

      expect(mockPlaceBid).toHaveBeenCalledWith(mockUserId, {
        auctionId: mockAuctionId,
        amount: 150.0,
      });
    });

    it('should place bid with decimal amount', async () => {
      const mockResult = {
        bid: {
          id: '223e4567-e89b-12d3-a456-426614174001',
          auctionId: mockAuctionId,
          userId: mockUserId,
          amount: 125.99,
          createdAt: '2025-10-15T12:00:00Z',
        },
        auction: {
          id: mockAuctionId,
          userId: 'seller-456',
          title: 'Test Auction',
          description: 'Test description',
          startPrice: 100.0,
          reservePrice: 500.0,
          currentPrice: 125.99,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
          status: 'active',
          winnerId: undefined,
          bidCount: 1,
          createdAt: '2025-10-15T00:00:00Z',
          updatedAt: '2025-10-15T12:00:00Z',
        },
      };

      mockPlaceBid.mockResolvedValueOnce(mockResult);

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 125.99,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body!);
      expect(body.bid.amount).toBe(125.99);
    });

    it('should place bid on auction with existing bids', async () => {
      const mockResult = {
        bid: {
          id: '223e4567-e89b-12d3-a456-426614174002',
          auctionId: mockAuctionId,
          userId: mockUserId,
          amount: 200.0,
          createdAt: '2025-10-15T13:00:00Z',
        },
        auction: {
          id: mockAuctionId,
          userId: 'seller-456',
          title: 'Test Auction',
          description: 'Test description',
          startPrice: 100.0,
          reservePrice: 500.0,
          currentPrice: 200.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
          status: 'active',
          winnerId: undefined,
          bidCount: 5, // Multiple existing bids
          createdAt: '2025-10-15T00:00:00Z',
          updatedAt: '2025-10-15T13:00:00Z',
        },
      };

      mockPlaceBid.mockResolvedValueOnce(mockResult);

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 200.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body!);
      expect(body.auction.bidCount).toBe(5);
    });
  });

  describe('❌ Invalid bids - Missing fields', () => {
    it('should reject request with missing auctionId', async () => {
      const event = createMockEvent(
        {
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request data');
    });

    it('should reject request with missing amount', async () => {
      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject request with empty body', async () => {
      const event = createMockEvent({}, `Bearer ${validToken}`);

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('❌ Invalid bids - Invalid values', () => {
    it('should reject bid with invalid UUID format', async () => {
      const event = createMockEvent(
        {
          auctionId: 'invalid-uuid',
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request data');
    });

    it('should reject bid with zero amount', async () => {
      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject bid with negative amount', async () => {
      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: -50.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject bid with too many decimal places', async () => {
      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.999, // 3 decimal places
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid JSON', async () => {
      const event = createMockEvent();
      event.body = 'not-json';
      event.headers.authorization = `Bearer ${validToken}`;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Invalid JSON');
    });
  });

  describe('🚫 Business logic errors', () => {
    it('should return 404 for non-existent auction', async () => {
      mockPlaceBid.mockRejectedValueOnce(new Error('Auction not found or not active'));

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Auction not found or not active');
    });

    it('should return 404 for inactive auction', async () => {
      mockPlaceBid.mockRejectedValueOnce(new Error('Auction not found or not active'));

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });

    it('should return 400 for bid amount too low', async () => {
      mockPlaceBid.mockRejectedValueOnce(
        new Error('Bid amount must be higher than current price')
      );

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 90.0, // Lower than start price
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Bid amount must be higher than current price');
    });

    it('should return 400 when bid equals current price', async () => {
      mockPlaceBid.mockRejectedValueOnce(
        new Error('Bid amount must be higher than current price')
      );

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 100.0, // Same as current price
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('🔒 Authentication', () => {
    it('should reject request without authorization header', async () => {
      const event = createMockEvent({
        auctionId: mockAuctionId,
        amount: 150.0,
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        'invalid-token-no-bearer'
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should reject request with expired/invalid token', async () => {
      const utils = await import('../../utils/index.js');
      vi.mocked(utils.verifyAccessToken).mockResolvedValueOnce(null as any);

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should reject request with token missing userId', async () => {
      const utils = await import('../../utils/index.js');
      vi.mocked(utils.verifyAccessToken).mockResolvedValueOnce({
        email: 'test@example.com',
      } as any);

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPlaceBid.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors', async () => {
      mockPlaceBid.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    it('should handle transaction errors gracefully', async () => {
      mockPlaceBid.mockRejectedValueOnce(new Error('Transaction failed'));

      const event = createMockEvent(
        {
          auctionId: mockAuctionId,
          amount: 150.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
