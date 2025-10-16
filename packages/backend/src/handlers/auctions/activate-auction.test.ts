/**
 * activate-auction handler tests
 *
 * Testing: POST /auctions/:auctionId/activate
 * Purpose: Activate a pending auction (authenticated endpoint - owner only)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './activate-auction.js';

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
    activateAuction: mockActivateAuction,
    getAuction: mockGetAuction,
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

// Mock auction service methods
const mockActivateAuction = vi.fn();
const mockGetAuction = vi.fn();

// Test helper to create mock event
const createMockEvent = (auctionId: string, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'POST /auctions/{auctionId}/activate',
  rawPath: `/auctions/${auctionId}/activate`,
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader }),
  },
  pathParameters: {
    auctionId,
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'POST',
      path: `/auctions/${auctionId}/activate`,
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
    routeKey: 'POST /auctions/{auctionId}/activate',
  } as any,
  body: null,
  isBase64Encoded: false,
});

describe('activate-auction handler', () => {
  const validAuctionId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123';
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

  describe('✅ Valid activation', () => {
    it('should activate pending auction successfully', async () => {
      const mockAuction = {
        id: validAuctionId,
        userId: mockUserId, // Owner matches authenticated user
        title: 'Test Auction',
        description: 'Test description',
        startPrice: 100.0,
        reservePrice: 500.0,
        currentPrice: 100.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
        status: 'active', // Changed from pending to active
        winnerId: undefined,
        bidCount: 0,
        createdAt: '2025-10-15T00:00:00Z',
        updatedAt: '2025-10-15T12:00:00Z',
      };

      // Mock getAuction to check ownership
      mockGetAuction.mockResolvedValueOnce({
        ...mockAuction,
        status: 'pending',
      });

      mockActivateAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auction).toBeDefined();
      expect(body.auction.id).toBe(validAuctionId);
      expect(body.auction.status).toBe('active');

      expect(mockActivateAuction).toHaveBeenCalledWith(validAuctionId);
    });

    it('should update auction updatedAt timestamp', async () => {
      const createdAt = '2025-10-15T00:00:00Z';
      const updatedAt = '2025-10-15T12:00:00Z';

      const mockAuction = {
        id: validAuctionId,
        userId: mockUserId,
        title: 'Test Auction',
        description: 'Test description',
        startPrice: 100.0,
        reservePrice: 500.0,
        currentPrice: 100.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
        status: 'active',
        winnerId: undefined,
        bidCount: 0,
        createdAt,
        updatedAt,
      };

      mockGetAuction.mockResolvedValueOnce({ ...mockAuction, status: 'pending' });
      mockActivateAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auction.updatedAt).toBe(updatedAt);
      expect(new Date(body.auction.updatedAt).getTime()).toBeGreaterThan(
        new Date(body.auction.createdAt).getTime()
      );
    });
  });

  describe('❌ Invalid requests', () => {
    it('should return 400 for missing auction ID', async () => {
      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      event.pathParameters = {}; // Remove auctionId

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Auction ID is required');
    });

    it('should return 400 for invalid UUID format', async () => {
      const event = createMockEvent('invalid-uuid', `Bearer ${validToken}`);

      mockGetAuction.mockRejectedValueOnce(new Error('invalid input syntax for type uuid'));

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should return 404 when auction not found', async () => {
      mockGetAuction.mockRejectedValueOnce(new Error('Auction not found'));

      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Auction not found');
    });
  });

  describe('🔒 Authorization', () => {
    it('should return 401 without authorization header', async () => {
      const event = createMockEvent(validAuctionId);

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 with invalid token format', async () => {
      const event = createMockEvent(validAuctionId, 'invalid-token-no-bearer');

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 401 with expired/invalid token', async () => {
      const utils = await import('../../utils/index.js');
      vi.mocked(utils.verifyAccessToken).mockResolvedValueOnce(null as any);

      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should return 403 when user is not auction owner', async () => {
      const mockAuction = {
        id: validAuctionId,
        userId: 'different-user-456', // Different from mockUserId
        title: 'Test Auction',
        description: 'Test description',
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

      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Only auction owner can activate');
      expect(mockActivateAuction).not.toHaveBeenCalled();
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetAuction.mockResolvedValueOnce({
        id: validAuctionId,
        userId: mockUserId,
        title: 'Test Auction',
        description: 'Test description',
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
      });

      mockActivateAuction.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors', async () => {
      mockGetAuction.mockResolvedValueOnce({
        id: validAuctionId,
        userId: mockUserId,
        title: 'Test Auction',
        description: 'Test description',
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
      });

      mockActivateAuction.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = createMockEvent(validAuctionId, `Bearer ${validToken}`);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
