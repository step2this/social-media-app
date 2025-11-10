/**
 * Cache Metrics Handler Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type { CacheService } from '../../infrastructure/cache/CacheService.js';
import type { AugmentedEvent } from '../../types/lambda-extended.js';

describe('Cache Metrics Handler', () => {
  let mockCacheService: CacheService;
  let mockEvent: AugmentedEvent;
  let mockContext: Context;

  beforeEach(() => {
    // Mock CacheService
    mockCacheService = {
      getMetrics: vi.fn().mockReturnValue({
        hits: 150,
        misses: 50,
        sets: 120,
        deletes: 30,
        errors: 2,
        hitRate: 0.75,
      }),
    } as any;

    // Mock Lambda event
    mockEvent = {
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      services: {
        cacheService: mockCacheService,
      },
    } as any;

    // Mock Lambda context
    mockContext = {
      functionName: 'test-function',
      awsRequestId: 'test-request-id',
    } as any;
  });

  describe('GET /monitoring/cache/metrics', () => {
    it('should return cache metrics with 200 status', async () => {
      // Import handler dynamically to avoid module initialization issues
      const { handler } = await import('./cache-metrics.js');

      const response = await handler(mockEvent as any, mockContext, vi.fn());

      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('should return metrics in correct format', async () => {
      const { handler } = await import('./cache-metrics.js');

      const response = await handler(mockEvent as any, mockContext, vi.fn());

      const body = JSON.parse(response.body);

      expect(body.metrics).toEqual({
        hits: 150,
        misses: 50,
        sets: 120,
        deletes: 30,
        errors: 2,
        hitRate: 0.75,
        hitRatePercentage: '75.00%',
        totalOperations: 352, // 150 + 50 + 120 + 30 + 2
      });
      expect(body.timestamp).toBeDefined();
    });

    it('should calculate hit rate percentage correctly', async () => {
      // Mock different hit rate
      mockCacheService.getMetrics = vi.fn().mockReturnValue({
        hits: 33,
        misses: 67,
        sets: 100,
        deletes: 0,
        errors: 0,
        hitRate: 0.33,
      });

      const { handler } = await import('./cache-metrics.js');

      const response = await handler(mockEvent as any, mockContext, vi.fn());

      const body = JSON.parse(response.body);

      expect(body.metrics.hitRatePercentage).toBe('33.00%');
    });

    it('should include timestamp in response', async () => {
      const { handler } = await import('./cache-metrics.js');

      const response = await handler(mockEvent as any, mockContext, vi.fn());

      const body = JSON.parse(response.body);

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include CORS headers', async () => {
      const { handler } = await import('./cache-metrics.js');

      const response = await handler(mockEvent as any, mockContext, vi.fn());

      expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle zero operations gracefully', async () => {
      mockCacheService.getMetrics = vi.fn().mockReturnValue({
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0,
      });

      const { handler } = await import('./cache-metrics.js');

      const response = await handler(mockEvent as any, mockContext, vi.fn());

      const body = JSON.parse(response.body);

      expect(body.metrics.totalOperations).toBe(0);
      expect(body.metrics.hitRatePercentage).toBe('0.00%');
      expect(response.statusCode).toBe(200);
    });
  });
});
