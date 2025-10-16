/**
 * create-auction handler tests
 *
 * Testing: POST /auctions
 * Purpose: Create new auction listing with PostgreSQL backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './create-auction.js';

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

// Test helper to create mock event
const createMockEvent = (body?: any, authHeader?: string): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'POST /auctions',
  rawPath: '/auctions',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    ...(authHeader && { authorization: authHeader }),
  },
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'POST',
      path: '/auctions',
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
    routeKey: 'POST /auctions',
  } as any,
  body: body ? JSON.stringify(body) : null,
  isBase64Encoded: false,
});

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

      const event = createMockEvent(
        {
          title: 'Vintage Camera',
          description: 'Rare camera',
          startPrice: 100.0,
          reservePrice: 500.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

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

      const event = createMockEvent(
        {
          title: 'Simple Item',
          startPrice: 50.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

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
      const event = createMockEvent(
        {
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request data');
    });

    it('should reject request with missing startPrice', async () => {
      const event = createMockEvent(
        {
          title: 'Test',
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject request with missing timestamps', async () => {
      const event = createMockEvent(
        {
          title: 'Test',
          startPrice: 100.0,
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('❌ Invalid requests - Invalid values', () => {
    it('should reject empty title', async () => {
      const event = createMockEvent(
        {
          title: '',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject negative price', async () => {
      const event = createMockEvent(
        {
          title: 'Test',
          startPrice: -10.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject end time before start time', async () => {
      const event = createMockEvent(
        {
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-16T00:00:00Z',
          endTime: '2025-10-15T00:00:00Z', // Before start
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('should reject reserve price less than start price', async () => {
      const event = createMockEvent(
        {
          title: 'Test',
          startPrice: 100.0,
          reservePrice: 50.0, // Less than start price
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
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

  describe('🔒 Authentication', () => {
    it('should reject request without authorization header', async () => {
      const event = createMockEvent({
        title: 'Test',
        startPrice: 100.0,
        startTime: '2025-10-15T00:00:00Z',
        endTime: '2025-10-16T00:00:00Z',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const event = createMockEvent(
        {
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
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
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockCreateAuction.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockEvent(
        {
          title: 'Test',
          startPrice: 100.0,
          startTime: '2025-10-15T00:00:00Z',
          endTime: '2025-10-16T00:00:00Z',
        },
        `Bearer ${validToken}`
      );

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });
  });
});
