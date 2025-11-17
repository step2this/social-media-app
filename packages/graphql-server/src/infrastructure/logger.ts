/**
 * Structured Logging with Pino + OpenTelemetry for GraphQL Server
 *
 * Provides consistent, performant logging for the GraphQL Lambda function
 * with distributed tracing support.
 *
 * Features:
 * - Structured JSON logging
 * - Automatic trace context injection (trace_id, span_id)
 * - Child loggers with context inheritance
 * - Type-safe logging methods
 * - CloudWatch Logs compatible format
 *
 * Usage:
 * ```typescript
 * import { logger } from './infrastructure/logger';
 *
 * // Simple logging (automatically includes trace_id if available)
 * logger.info('GraphQL query received');
 * logger.error('Failed to fetch data');
 *
 * // Structured logging with context
 * logger.info({ userId: '123', operation: 'getUser' }, 'Processing GraphQL operation');
 *
 * // Child logger with inherited context
 * const reqLogger = logger.child({ requestId: 'abc-123' });
 * reqLogger.info('Processing request');
 * ```
 *
 * Distributed Tracing:
 * Every log automatically includes trace_id and span_id from OpenTelemetry.
 * Use these to correlate logs across services:
 * ```bash
 * # See all logs for a specific request
 * grep "trace_id\":\"4bf92f3577b34da6a3ce929d0e0e4736" cloudwatch-logs.json
 * ```
 */

import pino from 'pino';
import { trace } from '@opentelemetry/api';

/**
 * Create the base logger instance with automatic trace context injection
 *
 * For Lambda functions, we output JSON to stdout which is automatically
 * captured by CloudWatch Logs.
 */
const baseLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Base context for all logs
  base: {
    env: process.env.NODE_ENV || 'production',
    app: 'social-media-graphql',
    service: 'graphql-server',
  },

  // Format levels as strings for better readability in CloudWatch
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // Mixin to automatically inject trace context into every log
  mixin() {
    const span = trace.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        trace_flags: spanContext.traceFlags,
      };
    }
    return {};
  },
});

/**
 * Export the logger with automatic trace context
 *
 * Every log will automatically include:
 * - trace_id: Unique ID for the entire request (shared across services)
 * - span_id: Unique ID for this specific operation
 * - trace_flags: Sampling decision flags
 */
export const logger = baseLogger;

/**
 * Create a child logger with additional context
 *
 * @example
 * const resolverLogger = createLogger({ resolver: 'getUserById', userId: '123' });
 * resolverLogger.info('Fetching user');
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Helper to log GraphQL operations with consistent format
 */
export function logGraphQLOperation(
  operation: string,
  variables?: Record<string, unknown>,
  result?: 'success' | 'error',
  metadata?: Record<string, unknown>
) {
  const logData = {
    type: 'graphql-operation',
    operation,
    ...(variables && { variables }),
    ...(result && { result }),
    ...(metadata && metadata),
  };

  if (result === 'error') {
    logger.error(logData, `GraphQL ${operation} failed`);
  } else {
    logger.info(logData, `GraphQL ${operation}`);
  }
}

/**
 * Helper to log resolver execution
 */
export function logResolver(
  resolver: string,
  args?: Record<string, unknown>,
  result?: 'success' | 'error',
  duration?: number
) {
  const logData = {
    type: 'resolver',
    resolver,
    ...(args && { args }),
    ...(result && { result }),
    ...(duration && { duration }),
  };

  if (result === 'error') {
    logger.error(logData, `Resolver ${resolver} failed`);
  } else {
    logger.debug(logData, `Resolver ${resolver}`);
  }
}

// Export singleton instance as default
export default logger;
