/**
 * Structured Logging with Pino + OpenTelemetry
 *
 * Provides consistent, performant logging across the Next.js application
 * with distributed tracing support.
 *
 * Features:
 * - Structured JSON logging
 * - Automatic trace context injection (trace_id, span_id)
 * - Child loggers with context inheritance
 * - Type-safe logging methods
 * - Works with Next.js 15 (no worker threads)
 *
 * Pretty printing in development:
 * To see pretty logs, pipe through pino-pretty:
 * ```bash
 * pnpm dev | pnpm exec pino-pretty
 * ```
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * // Simple logging (automatically includes trace_id if available)
 * logger.info('User logged in');
 * logger.error('Failed to fetch data');
 *
 * // Structured logging with context
 * logger.info({ userId: '123', action: 'login' }, 'User logged in');
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
 * grep "trace_id\":\"4bf92f3577b34da6a3ce929d0e0e4736" logs.json
 * ```
 */

import pino from 'pino';
import { trace } from '@opentelemetry/api';

/**
 * Create the base logger instance with automatic trace context injection
 *
 * Note: We don't use pino-pretty transport here because it spawns
 * worker threads that break Next.js 15's bundling. Instead, we output
 * JSON and you can pipe through pino-pretty if you want colored logs.
 */
const baseLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Base context for all logs
  base: {
    env: process.env.NODE_ENV,
    app: 'social-media-web',
  },

  // Automatically log errors with full stack traces
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
 * const userLogger = createLogger({ module: 'auth', userId: '123' });
 * userLogger.info('User authenticated');
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Log levels:
 * - trace: Very detailed information (rarely used)
 * - debug: Debug information (dev only)
 * - info: General informational messages
 * - warn: Warning messages
 * - error: Error messages with stack traces
 * - fatal: Fatal errors that crash the app
 */

/**
 * Helper to log GraphQL operations
 */
export function logGraphQL(operation: string, variables?: Record<string, unknown>, result?: 'success' | 'error') {
  const logData = {
    type: 'graphql',
    operation,
    ...(variables && { variables }),
    ...(result && { result }),
  };

  if (result === 'error') {
    logger.error(logData, `GraphQL ${operation} failed`);
  } else {
    logger.info(logData, `GraphQL ${operation}`);
  }
}

/**
 * Helper to log Server Actions
 */
export function logServerAction(action: string, data?: Record<string, unknown>, result?: 'success' | 'error') {
  const logData = {
    type: 'server-action',
    action,
    ...(data && { data }),
    ...(result && { result }),
  };

  if (result === 'error') {
    logger.error(logData, `Server Action ${action} failed`);
  } else {
    logger.info(logData, `Server Action ${action}`);
  }
}

/**
 * Helper to log authentication events
 */
export function logAuth(event: 'login' | 'logout' | 'register' | 'failed', userId?: string) {
  logger.info(
    {
      type: 'auth',
      event,
      ...(userId && { userId }),
    },
    `Auth: ${event}`
  );
}

// Export singleton instance as default
export default logger;
