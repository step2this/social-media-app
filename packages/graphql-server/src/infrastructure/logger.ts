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
 * - Pretty-printed file output for local development
 * - CloudWatch Logs compatible format for production
 *
 * Log outputs:
 * - Development: Pretty-printed file (./logs/graphql.log)
 * - Production: JSON to stdout (captured by CloudWatch)
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
 * View logs in the pretty-printed file (development):
 * ```bash
 * # View recent logs (they're already pretty-printed!)
 * tail -f ./logs/graphql.log
 *
 * # Search for specific trace
 * grep "4bf92f3577b34da6a3ce929d0e0e4736" ./logs/graphql.log
 * ```
 */

import pino from 'pino';
import { trace } from '@opentelemetry/api';
import { createStream } from 'rotating-file-stream';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { graphqlEnv } from '@social-media-app/env';

/**
 * Create rotating file stream with daily rotation
 * Automatically rotates logs each day and keeps last 14 days
 *
 * Logs are written as JSON for:
 * - Better searching and parsing
 * - Smaller file size
 * - Easier integration with log tools
 *
 * View pretty logs with: tail -f logs/graphql.log | pnpm exec pino-pretty
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

    // Filename pattern: graphql.log, graphql-20241120.log.gz, etc.
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
 * In test: write JSON to stdout for test capture
 * In development: write JSON to rotating file
 * In production: write JSON to stdout for CloudWatch
 */
let logStreams: pino.StreamEntry[] | undefined;

const isTest = graphqlEnv.NODE_ENV === 'test';
const isDevelopment = graphqlEnv.NODE_ENV !== 'production' && !isTest;

if (isDevelopment) {
  const logsDir = path.join(process.cwd(), 'logs');

  // Create rotating stream for JSON logs
  const rotatingStream = createRotatingStream('graphql.log', logsDir);

  // Single stream: rotating JSON file with explicit level
  logStreams = [{ level: graphqlEnv.LOG_LEVEL, stream: rotatingStream }];
}
// In test mode, logStreams remains undefined so pino writes to stdout

/**
 * Create the base logger instance with automatic trace context injection
 *
 * Log outputs:
 * - Development: JSON to rotating file (14-day retention)
 * - Production: JSON to stdout (captured by CloudWatch Logs)
 * - Build time: Console only (no file system access)
 *
 * To view pretty logs: tail -f logs/graphql.log | pnpm exec pino-pretty
 */
const baseLogger = logStreams
  ? pino(
      {
        level: graphqlEnv.LOG_LEVEL,

        // Base context for all logs
        base: {
          env: graphqlEnv.NODE_ENV,
          app: 'social-media-graphql',
          service: 'graphql-server',
        },

        // Format levels as strings for better readability
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
  : // Fallback for production (stdout only)
    pino({
      level: graphqlEnv.LOG_LEVEL,
      base: {
        env: graphqlEnv.NODE_ENV,
        app: 'social-media-graphql',
        service: 'graphql-server',
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

// Log environment configuration on startup to verify correct loading
logger.info({
  LOG_LEVEL: graphqlEnv.LOG_LEVEL,
  NODE_ENV: graphqlEnv.NODE_ENV,
  OTEL_SERVICE_NAME: graphqlEnv.OTEL_SERVICE_NAME,
  TABLE_NAME: graphqlEnv.TABLE_NAME,
  USE_LOCALSTACK: graphqlEnv.USE_LOCALSTACK,
  loggerActiveLevel: baseLogger.level,
}, '🔍 Logger initialized with environment configuration');

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
