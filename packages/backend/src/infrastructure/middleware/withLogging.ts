/**
 * Logging Middleware
 *
 * Provides structured logging with correlation IDs for request tracing.
 * Logs request start, response completion, duration, and errors.
 *
 * Features:
 * - Correlation IDs for distributed tracing
 * - Request/response logging
 * - Duration tracking
 * - Error logging
 * - CloudWatch Logs compatible format
 *
 * @example
 * ```typescript
 * export const handler = compose(
 *   withErrorHandling(),
 *   withLogging(),  // Logs request/response/errors
 *   async (event, context) => {
 *     // Your logic here
 *   }
 * );
 * ```
 */

import { 
  getOrCreateCorrelationId, 
  addCorrelationIdToHeaders,
  createStructuredLogger,
  logError
} from '@social-media-app/shared';
import type { Middleware } from './compose.js';

/**
 * Logging middleware factory
 *
 * Logs structured JSON for easy parsing in CloudWatch Logs.
 * Uses shared utilities for correlation ID management and structured logging.
 *
 * @returns Middleware function that logs requests/responses
 */
export const withLogging = (): Middleware => {
  return async (event, context, next) => {
    // Extract or generate correlation ID
    const correlationId = getOrCreateCorrelationId(
      event.headers || {},
      event.requestContext?.requestId
    );
    const startTime = Date.now();

    // Add correlation ID to context for downstream middleware
    context.correlationId = correlationId;

    // Create logger instance
    const logger = createStructuredLogger({
      correlationId,
      defaultMetadata: { service: 'backend-lambda' }
    });

    // Log request start
    logger.info('REQUEST_START', 'Processing Lambda request', {
      path: event.rawPath,
      method: event.requestContext?.http?.method,
      userId: context.userId || 'anonymous'
    });

    try {
      const response = await next();
      const duration = Date.now() - startTime;

      // Log successful response
      const statusCode = typeof response === 'object' && 'statusCode' in response ? response.statusCode : 200;
      logger.info('REQUEST_COMPLETE', 'Lambda request completed successfully', {
        statusCode,
        duration
      });

      // Add correlation ID to response headers for client-side tracing
      if (typeof response === 'object' && response !== null) {
        return {
          ...response,
          headers: addCorrelationIdToHeaders(
            ('headers' in response && typeof response.headers === 'object' ? response.headers : {}) as Record<string, string>,
            correlationId
          )
        };
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error using shared utility
      logError('REQUEST_ERROR', correlationId, error as Error, {
        duration,
        service: 'backend-lambda'
      });

      // Re-throw for error handling middleware
      throw error;
    }
  };
};
