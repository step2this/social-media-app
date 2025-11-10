/**
 * Cache Metrics Handler
 *
 * Provides cache statistics for monitoring and observability.
 * Returns hit rate, cache operations, and error counts.
 *
 * @route GET /monitoring/cache/metrics
 */

import { createHandler } from '../../infrastructure/middleware/index.js';
import type { AugmentedLambdaHandler } from '../../types/lambda-extended.js';

/**
 * GET handler - returns cache metrics
 */
const getCacheMetricsHandler: AugmentedLambdaHandler = async (event) => {
  // CacheService injected by Awilix middleware
  const { cacheService } = event.services!;

  // Get current metrics
  const metrics = cacheService.getMetrics();

  // Calculate additional statistics
  const totalOperations = metrics.hits + metrics.misses + metrics.sets + metrics.deletes;
  const hitRatePercentage = (metrics.hitRate * 100).toFixed(2);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      metrics: {
        hits: metrics.hits,
        misses: metrics.misses,
        sets: metrics.sets,
        deletes: metrics.deletes,
        errors: metrics.errors,
        hitRate: metrics.hitRate,
        hitRatePercentage: `${hitRatePercentage}%`,
        totalOperations,
      },
      timestamp: new Date().toISOString(),
    }),
  };
};

/**
 * Export Middy-wrapped handler with Awilix service injection
 *
 * Note: No auth required for monitoring endpoints (can be added based on requirements)
 * In production, consider:
 * - Adding API key authentication
 * - Rate limiting
 * - IP whitelisting
 */
export const handler = createHandler(getCacheMetricsHandler, {
  auth: false, // No JWT required for monitoring
  services: ['cacheService'], // Awilix injects cacheService
});
