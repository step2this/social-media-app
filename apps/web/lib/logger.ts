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
 * - Pretty-printed file output for easy reading
 * - Log rotation support
 *
 * Log outputs:
 * - Development: Pretty-printed file (./logs/app.log) + optional console
 * - Production: Pretty-printed file (./logs/app.log)
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
 * View logs in the pretty-printed file:
 * ```bash
 * # View recent logs (they're already pretty-printed!)
 * tail -f ./logs/app.log
 *
 * # Search for specific trace
 * grep "4bf92f3577b34da6a3ce929d0e0e4736" ./logs/app.log
 * ```
 */

import pino from 'pino';
import { trace } from '@opentelemetry/api';
import { createStream } from 'rotating-file-stream';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { webEnv } from '@social-media-app/env';

/**
 * Create rotating file stream with daily rotation
 * Automatically rotates logs each day and keeps last 14 days
 *
 * Logs are written as JSON for:
 * - Better searching and parsing
 * - Smaller file size
 * - Easier integration with log tools
 *
 * View pretty logs with: tail -f logs/app.log | pnpm exec pino-pretty
 */
function createRotatingStream(filename: string, logsDir: string) {
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Create rotating file stream
  const stream = createStream(filename, {
    interval: '1d', // Daily rotation at midnight
    maxFiles: 14, // Keep 14 days of logs (2 weeks)
    path: logsDir,
    compress: 'gzip', // Compress rotated files

    // Rotation behavior
    immutable: false, // Allow writing to current file
    initialRotation: false, // Don't rotate on startup

    // Filename pattern: app.log, app-20241120.log.gz, etc.
    // The 'interval' option automatically adds date suffix on rotation
  });

  // Handle rotation events
  stream.on('rotation', () => {
    console.log(`📦 Log rotation started`);
  });

  stream.on('rotated', () => {
    console.log(`✅ Log rotation complete`);
  });

  stream.on('error', (error) => {
    console.error('❌ Log rotation error:', error);
  });

  return stream;
}

/**
 * Set up log directory and rotating file stream
 * Only create file streams on server side (not during build/edge runtime)
 */
let logStreams: pino.StreamEntry[] | undefined;

if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  const logsDir = path.join(process.cwd(), 'logs');

  // Create rotating stream for JSON logs
  const rotatingStream = createRotatingStream('app.log', logsDir);

  // Optional: Also log to console in development
  const consoleEnabled = webEnv.CONSOLE_LOGS;

  if (webEnv.NODE_ENV !== 'production' && consoleEnabled) {
    // Multi-stream: rotating JSON file + pretty console
    logStreams = [
      { stream: rotatingStream }, // JSON to rotating file
      {
        stream: pino.transport({
          target: 'pino-pretty',
          options: {
            destination: 1, // stdout
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }),
      },
    ];
  } else {
    // Single stream: rotating JSON file only
    logStreams = [{ stream: rotatingStream }];
  }
}

/**
 * Create the base logger instance with automatic trace context injection
 *
 * Log outputs:
 * - Development: JSON to rotating file (14-day retention) + optional pretty console
 * - Production: JSON to rotating file (14-day retention)
 * - Build time: Console only (no file system access)
 *
 * To view pretty logs: tail -f logs/app.log | pnpm exec pino-pretty
 */
const baseLogger = logStreams
  ? pino(
      {
        level: webEnv.LOG_LEVEL,

        // Base context for all logs
        base: {
          env: webEnv.NODE_ENV,
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
      },
      pino.multistream(logStreams)
    )
  : // Fallback for build time (no file system access)
    pino({
      level: webEnv.LOG_LEVEL,
      base: {
        env: webEnv.NODE_ENV,
        app: 'social-media-web',
      },
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
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
