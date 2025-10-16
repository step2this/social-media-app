/**
 * create-auction handler tests
 *
 * Testing: POST /auctions
 * Purpose: Create new auction listing with PostgreSQL backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './create-auction.js';
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
    createAuction: mockCreateAuction,
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
const mockCreateAuction = vi.fn();

describe('create-auction handler', () => {
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

  describe('✅ Valid requests', () => {
    it('should create auction with all fields', async () => {
      const mockAuction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: mockUserId,
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

      mockCreateAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Vintage Camera',
          description: 'Rare camera',
          startPrice: 100.0,
          reservePrice: 500.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body!);
      expect(body.auction).toBeDefined();
      expect(body.auction.title).toBe('Vintage Camera');
      expect(body.auction.userId).toBe(mockUserId);

      expect(mockCreateAuction).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          title: 'Vintage Camera',
          description: 'Rare camera',
          startPrice: 100.0,
          reservePrice: 500.0,
        }),
        undefined // imageUrl is undefined when no fileType provided
      );
    });

    it('should create auction without optional fields', async () => {
      const mockAuction = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        userId: mockUserId,
        title: 'Simple Item',
        description: undefined,
        startPrice: 50.0,
        reservePrice: undefined,
        currentPrice: 50.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
        status: 'pending',
        winnerId: undefined,
        bidCount: 0,
        createdAt: '2025-10-15T00:00:00Z',
        updatedAt: '2025-10-15T00:00:00Z',
      };

      mockCreateAuction.mockResolvedValueOnce(mockAuction);

      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Simple Item',
          startPrice: 50.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body!);
      expect(body.auction.title).toBe('Simple Item');
      expect(body.auction.description).toBeUndefined();
      expect(body.auction.reservePrice).toBeUndefined();
    });
  });

  describe('❌ Invalid requests - Missing fields', () => {
    it('should reject request with missing title', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request data');
    });

    it('should reject request with missing startPrice', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject request with missing timestamps', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startPrice: 100.0,
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('❌ Invalid requests - Invalid values', () => {
    it('should reject empty title', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          title: '',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject negative price', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startPrice: -10.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject end time before start time', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-16T00:00:00Z',
          endTime: '2025-10-15T00:00:00Z', // Before start
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject reserve price less than start price', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startPrice: 100.0,
          reservePrice: 50.0, // Less than start price
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject invalid JSON', async () => {
      const event = createMockAPIGatewayEvent({
        rawBody: 'not-json',
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.message).toContain('Invalid JSON');
    });
  });

  describe('🔒 Authentication', () => {
    it('should reject request without authorization header', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
        title: 'Test',
        startPrice: 100.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
      },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: 'invalid-token-no-bearer' },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });

    it('should reject request with expired/invalid token', async () => {
      const utils = await import('../../utils/index.js');
      vi.mocked(utils.verifyAccessToken).mockResolvedValueOnce(null as any);

      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockCreateAuction.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockAPIGatewayEvent({
        body: {
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        headers: { authorization: `Bearer ${validToken}` },
        method: 'POST',
        path: '/auctions',
        routeKey: 'POST /auctions'
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });
  });
});
