/**
 * Circuit Breaker Metrics Handler
 *
 * Provides circuit breaker statistics for monitoring and observability.
 * Returns state, success/failure counts, and circuit open events for all breakers.
 *
 * @route GET /monitoring/circuit-breaker/metrics
 */

import { createHandler } from '../../infrastructure/middleware/index.js';
import type { AugmentedLambdaHandler } from '../../types/lambda-extended.js';

/**
 * GET handler - returns all circuit breaker metrics
 */
const getCircuitBreakerMetricsHandler: AugmentedLambdaHandler = async (event) => {
  // Circuit breakers injected by Awilix middleware
  const { circuitBreakerDatabase, circuitBreakerCache, circuitBreakerExternal } =
    event.services!;

  // Get metrics from all breakers
  const databaseMetrics = circuitBreakerDatabase.getMetrics();
  const cacheMetrics = circuitBreakerCache.getMetrics();
  const externalMetrics = circuitBreakerExternal.getMetrics();

  // Calculate aggregate statistics
  const totalRequests =
    databaseMetrics.totalRequests +
    cacheMetrics.totalRequests +
    externalMetrics.totalRequests;

  const totalFailures =
    databaseMetrics.failureCount +
    cacheMetrics.failureCount +
    externalMetrics.failureCount;

  const totalCircuitOpens =
    databaseMetrics.circuitOpenCount +
    cacheMetrics.circuitOpenCount +
    externalMetrics.circuitOpenCount;

  const overallFailureRate = totalRequests > 0 ? totalFailures / totalRequests : 0;

  // Identify any open circuits
  const openCircuits = [];
  if (databaseMetrics.state === 'OPEN') openCircuits.push('database');
  if (cacheMetrics.state === 'OPEN') openCircuits.push('cache');
  if (externalMetrics.state === 'OPEN') openCircuits.push('external-api');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests,
        totalFailures,
        totalCircuitOpens,
        overallFailureRate,
        failureRatePercentage: `${(overallFailureRate * 100).toFixed(2)}%`,
        openCircuits: openCircuits.length > 0 ? openCircuits : null,
        healthStatus: openCircuits.length === 0 ? 'healthy' : 'degraded',
      },
      circuitBreakers: {
        database: {
          ...databaseMetrics,
          failureRatePercentage: `${(databaseMetrics.failureRate * 100).toFixed(2)}%`,
        },
        cache: {
          ...cacheMetrics,
          failureRatePercentage: `${(cacheMetrics.failureRate * 100).toFixed(2)}%`,
        },
        externalApi: {
          ...externalMetrics,
          failureRatePercentage: `${(externalMetrics.failureRate * 100).toFixed(2)}%`,
        },
      },
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
export const handler = createHandler(getCircuitBreakerMetricsHandler, {
  auth: false, // No JWT required for monitoring
  services: [
    'circuitBreakerDatabase',
    'circuitBreakerCache',
    'circuitBreakerExternal',
  ],
});
