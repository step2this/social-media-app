/**
 * list-auctions handler tests
 *
 * Testing: GET /auctions
 * Purpose: List auctions with filtering and pagination (public endpoint)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './list-auctions.js';

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
    listAuctions: mockListAuctions,
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
const mockListAuctions = vi.fn();

// Test helper to create mock event
const createMockEvent = (queryParams?: Record<string, string>): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /auctions',
  rawPath: '/auctions',
  rawQueryString: queryParams ? new URLSearchParams(queryParams).toString() : '',
  headers: {
    'content-type': 'application/json',
  },
  queryStringParameters: queryParams,
  requestContext: {
    requestId: 'test-request-id',
    http: {
      method: 'GET',
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
    routeKey: 'GET /auctions',
  } as any,
  body: null,
  isBase64Encoded: false,
});

const createMockAuction = (id: string, overrides?: any) => ({
  id,
  userId: 'user-123',
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
  ...overrides,
});

describe('list-auctions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ List all auctions', () => {
    it('should list auctions with default limit', async () => {
      const mockAuctions = [
        createMockAuction('123e4567-e89b-12d3-a456-426614174000'),
        createMockAuction('123e4567-e89b-12d3-a456-426614174001'),
        createMockAuction('123e4567-e89b-12d3-a456-426614174002'),
      ];

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: false,
        nextCursor: undefined,
      });

      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auctions).toHaveLength(3);
      expect(body.hasMore).toBe(false);

      expect(mockListAuctions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 24 })
      );
    });

    it('should list auctions with custom limit', async () => {
      const mockAuctions = [createMockAuction('123e4567-e89b-12d3-a456-426614174000')];

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: false,
        nextCursor: undefined,
      });

      const event = createMockEvent({ limit: '10' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auctions).toHaveLength(1);

      expect(mockListAuctions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      );
    });

    it('should return empty list when no auctions', async () => {
      mockListAuctions.mockResolvedValueOnce({
        auctions: [],
        hasMore: false,
        nextCursor: undefined,
      });

      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auctions).toEqual([]);
      expect(body.hasMore).toBe(false);
    });
  });

  describe('🔍 Filtering', () => {
    it('should filter by status', async () => {
      const mockAuctions = [
        createMockAuction('123e4567-e89b-12d3-a456-426614174000', { status: 'active' }),
        createMockAuction('123e4567-e89b-12d3-a456-426614174001', { status: 'active' }),
      ];

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: false,
        nextCursor: undefined,
      });

      const event = createMockEvent({ status: 'active' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auctions).toHaveLength(2);
      expect(body.auctions.every((a: any) => a.status === 'active')).toBe(true);

      expect(mockListAuctions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });

    it('should filter by userId', async () => {
      const userId = 'user-456';
      const mockAuctions = [
        createMockAuction('123e4567-e89b-12d3-a456-426614174000', { userId }),
        createMockAuction('123e4567-e89b-12d3-a456-426614174001', { userId }),
      ];

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: false,
        nextCursor: undefined,
      });

      const event = createMockEvent({ userId });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auctions).toHaveLength(2);
      expect(body.auctions.every((a: any) => a.userId === userId)).toBe(true);

      expect(mockListAuctions).toHaveBeenCalledWith(
        expect.objectContaining({ userId })
      );
    });

    it('should filter by both status and userId', async () => {
      const userId = 'user-789';
      const mockAuctions = [
        createMockAuction('123e4567-e89b-12d3-a456-426614174000', {
          userId,
          status: 'completed',
        }),
      ];

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: false,
        nextCursor: undefined,
      });

      const event = createMockEvent({ status: 'completed', userId });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auctions).toHaveLength(1);
      expect(body.auctions[0].userId).toBe(userId);
      expect(body.auctions[0].status).toBe('completed');

      expect(mockListAuctions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', userId })
      );
    });
  });

  describe('📄 Pagination', () => {
    it('should support cursor-based pagination', async () => {
      const mockAuctions = [createMockAuction('123e4567-e89b-12d3-a456-426614174000')];

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: true,
        nextCursor: '10',
      });

      const event = createMockEvent({ cursor: '0', limit: '5' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.hasMore).toBe(true);
      expect(body.nextCursor).toBe('10');

      expect(mockListAuctions).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: '0', limit: 5 })
      );
    });

    it('should indicate no more results', async () => {
      const mockAuctions = [createMockAuction('123e4567-e89b-12d3-a456-426614174000')];

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: false,
        nextCursor: undefined,
      });

      const event = createMockEvent({ cursor: '20', limit: '10' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.hasMore).toBe(false);
      expect(body.nextCursor).toBeUndefined();
    });

    it('should handle large result sets', async () => {
      const mockAuctions = Array.from({ length: 24 }, (_, i) =>
        createMockAuction(`123e4567-e89b-12d3-a456-42661417${String(i).padStart(4, '0')}`)
      );

      mockListAuctions.mockResolvedValueOnce({
        auctions: mockAuctions,
        hasMore: true,
        nextCursor: '24',
      });

      const event = createMockEvent({ limit: '24' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body!);
      expect(body.auctions).toHaveLength(24);
      expect(body.hasMore).toBe(true);
    });
  });

  describe('❌ Invalid requests', () => {
    it('should reject invalid limit with 400', async () => {
      const event = createMockEvent({ limit: 'invalid' });
      const result = await handler(event);

      // Should return 400 for invalid limit (NaN from parseInt)
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request parameters');
    });

    it('should reject invalid status value with 400', async () => {
      const event = createMockEvent({ status: 'invalid-status' });
      const result = await handler(event);

      // Should return 400 for invalid enum value
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Invalid request parameters');
    });
  });

  describe('⚠️ Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockListAuctions.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body!);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unexpected errors', async () => {
      mockListAuctions.mockRejectedValueOnce(new Error('Unexpected error'));

      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
