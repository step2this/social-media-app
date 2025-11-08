/**
 * Structured Logger Utilities
 *
 * Shared utility functions for creating structured JSON logs compatible with CloudWatch Logs.
 * These utilities provide consistent logging format across backend, GraphQL server, and frontend.
 *
 * Used by:
 * - Backend Lambda handlers (via withLogging middleware)
 * - GraphQL server (via lambda handler and resolvers)
 * - Frontend (via ErrorReportingService)
 *
 * @module structuredLogger
 */

/**
 * Log severity levels
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Base log entry structure
 * All log entries include these fields
 */
export interface BaseLogEntry {
  /** Severity level */
  level: LogLevel;
  /** Type/category of log entry */
  type: string;
  /** Correlation ID for distributed tracing */
  correlationId: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional message */
  message?: string;
}

/**
 * Extended log entry with additional fields
 */
export interface LogEntry extends BaseLogEntry {
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Options for creating a structured logger
 */
export interface StructuredLoggerOptions {
  /** Correlation ID to include in all log entries */
  correlationId: string;
  /** Optional default metadata to include in all log entries */
  defaultMetadata?: Record<string, any>;
}

/**
 * Structured logger instance
 * Provides methods for logging at different severity levels
 */
export interface StructuredLogger {
  /** Log debug message */
  debug(type: string, message?: string, metadata?: Record<string, any>): void;
  /** Log info message */
  info(type: string, message?: string, metadata?: Record<string, any>): void;
  /** Log warning message */
  warn(type: string, message?: string, metadata?: Record<string, any>): void;
  /** Log error message */
  error(type: string, message?: string, metadata?: Record<string, any>): void;
  /** Get the correlation ID used by this logger */
  getCorrelationId(): string;
}

/**
 * Creates a structured log entry
 * Internal utility used by logger methods
 *
 * @param level - Log severity level
 * @param type - Log type/category
 * @param correlationId - Correlation ID for tracing
 * @param message - Optional message
 * @param metadata - Optional additional metadata
 * @returns Structured log entry object
 */
function createLogEntry(
  level: LogLevel,
  type: string,
  correlationId: string,
  message?: string,
  metadata?: Record<string, any>
): LogEntry {
  const entry: LogEntry = {
    level,
    type,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  if (message) {
    entry.message = message;
  }

  if (metadata) {
    Object.assign(entry, metadata);
  }

  return entry;
}

/**
 * Creates a structured logger instance with consistent correlation ID.
 *
 * The logger provides methods for logging at different severity levels:
 * - `debug()`: For detailed debugging information
 * - `info()`: For general informational messages
 * - `warn()`: For warning messages
 * - `error()`: For error messages
 *
 * All log entries are output as JSON to stdout/stderr for CloudWatch Logs.
 *
 * @param options - Logger configuration options
 * @returns StructuredLogger instance
 *
 * @example
 * ```typescript
 * const logger = createStructuredLogger({
 *   correlationId: 'abc-123',
 *   defaultMetadata: { service: 'graphql-server' }
 * });
 *
 * // Log info message
 * logger.info('REQUEST_START', 'Processing GraphQL query', {
 *   operation: 'exploreFeed',
 *   userId: 'user-123'
 * });
 *
 * // Log error
 * logger.error('DATABASE_ERROR', 'Failed to fetch user', {
 *   error: error.message,
 *   userId: 'user-123'
 * });
 * ```
 */
export function createStructuredLogger(
  options: StructuredLoggerOptions
): StructuredLogger {
  const { correlationId, defaultMetadata = {} } = options;

  return {
    debug(type: string, message?: string, metadata?: Record<string, any>): void {
      const entry = createLogEntry(
        'DEBUG',
        type,
        correlationId,
        message,
        { ...defaultMetadata, ...metadata }
      );
      console.log(JSON.stringify(entry));
    },

    info(type: string, message?: string, metadata?: Record<string, any>): void {
      const entry = createLogEntry(
        'INFO',
        type,
        correlationId,
        message,
        { ...defaultMetadata, ...metadata }
      );
      console.log(JSON.stringify(entry));
    },

    warn(type: string, message?: string, metadata?: Record<string, any>): void {
      const entry = createLogEntry(
        'WARN',
        type,
        correlationId,
        message,
        { ...defaultMetadata, ...metadata }
      );
      console.warn(JSON.stringify(entry));
    },

    error(type: string, message?: string, metadata?: Record<string, any>): void {
      const entry = createLogEntry(
        'ERROR',
        type,
        correlationId,
        message,
        { ...defaultMetadata, ...metadata }
      );
      console.error(JSON.stringify(entry));
    },

    getCorrelationId(): string {
      return correlationId;
    },
  };
}

/**
 * Logs an info message with structured format.
 * Convenience function for one-off logging without creating a logger instance.
 *
 * @param type - Log type/category
 * @param correlationId - Correlation ID for tracing
 * @param message - Optional message
 * @param metadata - Optional additional metadata
 *
 * @example
 * ```typescript
 * logInfo('REQUEST_START', correlationId, 'Processing request', {
 *   path: '/api/users',
 *   method: 'GET'
 * });
 * ```
 */
export function logInfo(
  type: string,
  correlationId: string,
  message?: string,
  metadata?: Record<string, any>
): void {
  const entry = createLogEntry('INFO', type, correlationId, message, metadata);
  console.log(JSON.stringify(entry));
}

/**
 * Logs a warning message with structured format.
 * Convenience function for one-off logging without creating a logger instance.
 *
 * @param type - Log type/category
 * @param correlationId - Correlation ID for tracing
 * @param message - Optional message
 * @param metadata - Optional additional metadata
 *
 * @example
 * ```typescript
 * logWarn('DEPRECATED_API', correlationId, 'Using deprecated endpoint', {
 *   endpoint: '/v1/users',
 *   userId: 'user-123'
 * });
 * ```
 */
export function logWarn(
  type: string,
  correlationId: string,
  message?: string,
  metadata?: Record<string, any>
): void {
  const entry = createLogEntry('WARN', type, correlationId, message, metadata);
  console.warn(JSON.stringify(entry));
}

/**
 * Logs an error message with structured format.
 * Convenience function for one-off logging without creating a logger instance.
 *
 * Handles Error objects specially, extracting name, message, and stack trace.
 *
 * @param type - Log type/category
 * @param correlationId - Correlation ID for tracing
 * @param error - Error object or message
 * @param metadata - Optional additional metadata
 *
 * @example
 * ```typescript
 * try {
 *   // ... some operation
 * } catch (error) {
 *   logError('DATABASE_ERROR', correlationId, error, {
 *     operation: 'fetchUser',
 *     userId: 'user-123'
 *   });
 * }
 * ```
 */
export function logError(
  type: string,
  correlationId: string,
  error: Error | string,
  metadata?: Record<string, any>
): void {
  const errorData = error instanceof Error
    ? {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    : { message: String(error) };

  const entry = createLogEntry(
    'ERROR',
    type,
    correlationId,
    undefined,
    { ...errorData, ...metadata }
  );
  console.error(JSON.stringify(entry));
}
