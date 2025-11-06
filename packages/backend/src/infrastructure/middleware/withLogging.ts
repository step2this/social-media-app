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

import type { Middleware } from './compose.js';

/**
 * Structured log entry interface
 */
interface LogEntry {
  correlationId: string;
  [key: string]: any;
}

/**
 * Logging middleware factory
 *
 * Logs structured JSON for easy parsing in CloudWatch Logs.
 * Includes correlation IDs from API Gateway request context.
 *
 * @returns Middleware function that logs requests/responses
 */
export const withLogging = (): Middleware => {
  return async (event, context, next) => {
    const correlationId = event.requestContext?.requestId || crypto.randomUUID();
    const startTime = Date.now();

    // Add correlation ID to context for downstream middleware
    context.correlationId = correlationId;

    // Log request start
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'REQUEST_START',
      correlationId,
      path: event.rawPath,
      method: event.requestContext?.http?.method,
      userId: context.userId || 'anonymous',
      timestamp: new Date().toISOString()
    } as LogEntry));

    try {
      const response = await next();
      const duration = Date.now() - startTime;

      // Log successful response
      const statusCode = typeof response === 'object' && 'statusCode' in response ? response.statusCode : 200;
      console.log(JSON.stringify({
        level: 'INFO',
        type: 'REQUEST_COMPLETE',
        correlationId,
        statusCode,
        duration,
        timestamp: new Date().toISOString()
      } as LogEntry));

      // Add correlation ID to response headers for client-side tracing
      if (typeof response === 'object' && response !== null) {
        return {
          ...response,
          headers: {
            ...(('headers' in response && typeof response.headers === 'object' ? response.headers : {}) as Record<string, string>),
            'X-Correlation-Id': correlationId
          }
        };
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error (withErrorHandling will handle the response)
      console.error(JSON.stringify({
        level: 'ERROR',
        type: 'REQUEST_ERROR',
        correlationId,
        duration,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error),
        timestamp: new Date().toISOString()
      } as LogEntry));

      // Re-throw for error handling middleware
      throw error;
    }
  };
};
