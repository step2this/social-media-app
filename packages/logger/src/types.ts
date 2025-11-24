/**
 * Type definitions for the shared logger package
 */

import type { Logger } from 'pino';

/**
 * Configuration for creating a logger instance
 */
export interface LoggerConfig {
  /**
   * Service name to include in all logs (e.g., 'data-access-layer', 'graphql-server')
   */
  service: string;

  /**
   * Application name (e.g., 'social-media-dal', 'social-media-graphql')
   */
  app: string;

  /**
   * Log level (trace, debug, info, warn, error, fatal)
   * @default 'debug'
   */
  logLevel?: string;

  /**
   * Node environment (development, production, test)
   * @default process.env.NODE_ENV || 'development'
   */
  env?: string;

  /**
   * Whether to enable file logging (rotating file streams)
   * @default true in development, false in production
   */
  enableFileLogging?: boolean;

  /**
   * Directory for log files (only used if enableFileLogging is true)
   * @default 'logs'
   */
  logsDir?: string;

  /**
   * Log file name (only used if enableFileLogging is true)
   * @default '<service>.log'
   */
  logFileName?: string;
}

/**
 * Log level type
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Result of a logging operation (hit, miss, success, error)
 */
export type LogResult = 'hit' | 'miss' | 'success' | 'error';

/**
 * Generic metadata for logging
 */
export type LogMetadata = Record<string, unknown>;

/**
 * Helper function signature for domain-specific logging
 */
export type LogHelperFn = (
  metadata?: LogMetadata
) => void;

/**
 * Extended logger with helper methods
 */
export interface ExtendedLogger extends Logger {
  /**
   * Create a child logger with additional context
   */
  createChild: (context: LogMetadata) => ExtendedLogger;
}
