/**
 * Core logger infrastructure with DRY'd pino configuration
 *
 * This module provides a factory function to create pino logger instances
 * with consistent configuration, OpenTelemetry integration, and rotating
 * file streams.
 */

import pino from 'pino';
import type { Logger } from 'pino';
import { trace } from '@opentelemetry/api';
import { createStream } from 'rotating-file-stream';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LoggerConfig } from './types.js';

/**
 * Create pino configuration object with OpenTelemetry mixin
 *
 * This extracts the common configuration to avoid duplication between
 * development and production logger instances.
 *
 * @param config - Logger configuration
 * @returns Pino options object
 */
function createPinoConfig(config: LoggerConfig): pino.LoggerOptions {
  return {
    level: config.logLevel || 'debug',

    // Base context included in all logs
    base: {
      env: config.env || process.env.NODE_ENV || 'development',
      app: config.app,
      service: config.service,
    },

    // Format levels as strings for better readability
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },

    // Mixin to automatically inject OpenTelemetry trace context
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
  };
}

/**
 * Create a rotating file stream for logs
 *
 * @param filename - Log file name
 * @param logsDir - Directory for log files
 * @returns Rotating file stream
 */
function createRotatingStream(filename: string, logsDir: string) {
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const stream = createStream(filename, {
    interval: '1d',        // Daily rotation at midnight
    maxFiles: 14,          // Keep 14 days of logs
    path: logsDir,
    compress: 'gzip',      // Compress rotated files
    immutable: false,
    initialRotation: false,
  });

  // Handle rotation events
  stream.on('rotation', () => {
    console.log(`📦 Log rotation started for ${filename}`);
  });

  stream.on('rotated', () => {
    console.log(`✅ Log rotation complete for ${filename}`);
  });

  stream.on('error', (error) => {
    console.error(`❌ Log rotation error for ${filename}:`, error);
  });

  return stream;
}

/**
 * Create a configured pino logger instance
 *
 * This factory function creates a pino logger with:
 * - OpenTelemetry trace context injection
 * - Rotating file streams (development)
 * - Stdout logging (production)
 * - Consistent configuration
 *
 * @param config - Logger configuration
 * @returns Configured pino logger
 *
 * @example
 * ```typescript
 * const logger = createPinoLogger({
 *   service: 'data-access-layer',
 *   app: 'social-media-dal',
 *   logLevel: 'debug',
 * });
 *
 * logger.info('Service started');
 * logger.debug({ userId: '123' }, 'Processing request');
 * ```
 */
export function createPinoLogger(config: LoggerConfig): Logger {
  const pinoConfig = createPinoConfig(config);

  // Determine if we should enable file logging
  const env = config.env || process.env.NODE_ENV || 'development';
  const shouldLogToFile = config.enableFileLogging !== undefined
    ? config.enableFileLogging
    : env !== 'production';

  // If file logging is disabled or we're in production, just use stdout
  if (!shouldLogToFile) {
    const logger = pino(pinoConfig);

    logger.info({
      service: config.service,
      app: config.app,
      logLevel: pinoConfig.level,
      env,
      fileLogging: false,
    }, '🔍 Logger initialized (stdout only)');

    return logger;
  }

  // Create rotating file stream
  const logsDir = config.logsDir || path.join(process.cwd(), 'logs');
  const logFileName = config.logFileName || `${config.service}.log`;
  const rotatingStream = createRotatingStream(logFileName, logsDir);

  // Create logger with file stream
  const logStreams: pino.StreamEntry[] = [
    { level: pinoConfig.level as pino.Level, stream: rotatingStream }
  ];

  const logger = pino(pinoConfig, pino.multistream(logStreams));

  logger.info({
    service: config.service,
    app: config.app,
    logLevel: pinoConfig.level,
    env,
    logsDir,
    logFileName,
    fileLogging: true,
  }, '🔍 Logger initialized with file logging');

  return logger;
}

/**
 * Create a child logger with additional context
 *
 * @param logger - Parent logger instance
 * @param context - Additional context to include in all logs
 * @returns Child logger
 *
 * @example
 * ```typescript
 * const requestLogger = createChildLogger(logger, {
 *   requestId: 'abc-123',
 *   userId: 'user-456',
 * });
 *
 * requestLogger.info('Processing request'); // Includes requestId and userId
 * ```
 */
export function createChildLogger(logger: Logger, context: Record<string, unknown>): Logger {
  return logger.child(context);
}
