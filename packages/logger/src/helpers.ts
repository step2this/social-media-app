/**
 * Generic helper function factory for domain-specific logging
 *
 * This eliminates the need to repeat similar logging patterns across different domains.
 * Uses advanced TypeScript patterns for type safety and code reuse.
 */

import type { Logger } from 'pino';
import type { LogLevel, LogResult, LogMetadata } from './types.js';

/**
 * Operation configuration for specialized loggers
 */
interface OperationConfig {
  readonly type: string;
  readonly defaultLevel: LogLevel;
  readonly messageFormatter: (operation: string, metadata?: LogMetadata) => string;
}

/**
 * Generic helper function for logging operations with consistent structure
 *
 * @param logger - Pino logger instance
 * @param type - Type of operation (e.g., 'dynamodb', 'cache', 'kinesis')
 * @param operation - Specific operation being performed
 * @param level - Log level to use
 * @param metadata - Additional metadata
 * @param message - Human-readable message
 *
 * @example
 * ```typescript
 * logOperation(logger, 'dynamodb', 'query', 'debug', { table: 'users' }, 'DynamoDB query on users');
 * ```
 */
export function logOperation(
  logger: Logger,
  type: string,
  operation: string,
  level: LogLevel,
  metadata?: LogMetadata,
  message?: string
): void {
  const logData = {
    type,
    operation,
    ...metadata,
  };

  const msg = message || `${type} ${operation}`;

  logger[level](logData, msg);
}

/**
 * Generic logger factory that creates type-safe logging functions
 *
 * Uses advanced TypeScript generics to create specialized loggers with
 * proper type inference and reduced code duplication.
 *
 * @param logger - Pino logger instance
 * @param config - Operation configuration
 * @returns Type-safe logging function
 *
 * @example
 * ```typescript
 * const logDynamoDB = createGenericLogger(logger, {
 *   type: 'dynamodb',
 *   defaultLevel: 'debug',
 *   messageFormatter: (op) => `DynamoDB ${op}`
 * });
 * ```
 */
function createGenericLogger<TMetadata extends LogMetadata = LogMetadata>(
  logger: Logger,
  config: OperationConfig
) {
  return (
    operation: string,
    metadata?: TMetadata,
    customLevel?: LogLevel
  ): void => {
    const level = customLevel || config.defaultLevel;
    const message = config.messageFormatter(operation, metadata);

    logOperation(logger, config.type, operation, level, metadata, message);
  };
}

/**
 * Generic logger factory with result awareness
 *
 * Creates loggers that automatically select log level based on operation result.
 *
 * @param logger - Pino logger instance
 * @param config - Operation configuration
 * @returns Result-aware logging function
 */
function createResultAwareLogger<TMetadata extends LogMetadata = LogMetadata>(
  logger: Logger,
  config: Omit<OperationConfig, 'messageFormatter'>
) {
  return (
    operation: string,
    result: LogResult,
    metadata?: TMetadata
  ): void => {
    const level = result === 'error' ? 'warn' : config.defaultLevel;
    const message = `${config.type} ${operation} - ${result}`;

    logOperation(
      logger,
      config.type,
      operation,
      level,
      { ...metadata, result },
      message
    );
  };
}

/**
 * Generic logger factory with custom metadata enrichment
 *
 * Creates loggers that enrich metadata with additional context before logging.
 *
 * @param logger - Pino logger instance
 * @param config - Operation configuration
 * @param enrichMetadata - Function to enrich metadata
 * @returns Metadata-enriched logging function
 */
function createEnrichedLogger<TParams extends readonly unknown[]>(
  logger: Logger,
  config: OperationConfig,
  enrichMetadata: (...params: TParams) => LogMetadata & { operation: string; message: string }
) {
  return (...params: TParams): void => {
    const { operation, message, ...metadata } = enrichMetadata(...params);

    logOperation(
      logger,
      config.type,
      operation,
      config.defaultLevel,
      metadata,
      message
    );
  };
}

/**
 * Create a domain-specific logging helper
 *
 * This factory function creates specialized logging helpers for specific domains
 * (e.g., DynamoDB, cache, Kinesis) with pre-configured types and log levels.
 *
 * @param logger - Pino logger instance
 * @param type - Domain type (e.g., 'dynamodb', 'cache', 'kinesis')
 * @param defaultLevel - Default log level for this domain
 *
 * @returns A function that logs operations for this domain
 *
 * @example
 * ```typescript
 * const logDynamoDB = createDomainLogger(logger, 'dynamodb', 'debug');
 * logDynamoDB('query', { table: 'users', gsi: 'GSI1' });
 * ```
 */
export function createDomainLogger(
  logger: Logger,
  type: string,
  defaultLevel: LogLevel = 'debug'
) {
  return createGenericLogger(logger, {
    type,
    defaultLevel,
    messageFormatter: (op) => `${type} ${op}`,
  });
}

/**
 * Create a result-based logging helper (for operations that have success/error outcomes)
 *
 * Automatically selects log level based on result:
 * - 'error' -> 'warn' level
 * - everything else -> default level
 *
 * @param logger - Pino logger instance
 * @param type - Domain type (e.g., 'cache')
 * @param defaultLevel - Default log level for success cases
 *
 * @returns A function that logs operations with result awareness
 *
 * @example
 * ```typescript
 * const logCache = createResultLogger(logger, 'cache', 'debug');
 * logCache('get', 'hit', { key: 'user:123', ttl: 300 });
 * logCache('get', 'error', { key: 'user:123', error: 'Connection timeout' });
 * ```
 */
export function createResultLogger(
  logger: Logger,
  type: string,
  defaultLevel: LogLevel = 'debug'
) {
  return createResultAwareLogger(logger, { type, defaultLevel });
}

/**
 * Create a service operation logger with duration tracking
 *
 * @param logger - Pino logger instance
 *
 * @returns A function that logs service operations with optional duration
 *
 * @example
 * ```typescript
 * const logServiceOp = createServiceLogger(logger);
 * logServiceOp('AuthService', 'login', { userId: '123' }, 45);
 * ```
 */
export function createServiceLogger(logger: Logger) {
  return createEnrichedLogger(
    logger,
    { type: 'service-operation', defaultLevel: 'debug', messageFormatter: () => '' },
    (service: string, operation: string, metadata?: LogMetadata, duration?: number) => ({
      operation,
      message: `[${service}] ${operation}`,
      service,
      ...(duration && { duration }),
      ...metadata,
    })
  );
}

/**
 * Create a slow operation logger
 *
 * @param logger - Pino logger instance
 *
 * @returns A function that logs slow operations with threshold information
 *
 * @example
 * ```typescript
 * const logSlowOp = createSlowOperationLogger(logger);
 * logSlowOp('PostService', 'getUserPosts', 250, 100, { userId: '123' });
 * ```
 */
export function createSlowOperationLogger(logger: Logger) {
  return createEnrichedLogger(
    logger,
    { type: 'slow-operation', defaultLevel: 'warn', messageFormatter: () => '' },
    (service: string, operation: string, duration: number, threshold: number, metadata?: LogMetadata) => ({
      operation,
      message: `[${service}] Slow ${operation} detected: ${duration}ms (threshold: ${threshold}ms)`,
      service,
      duration,
      threshold,
      ...metadata,
    })
  );
}

/**
 * Create a batch operation logger
 *
 * @param logger - Pino logger instance
 *
 * @returns A function that logs batch operations with size/chunk information
 *
 * @example
 * ```typescript
 * const logBatch = createBatchLogger(logger);
 * logBatch('FeedService', 'writeFeedItemsBatch', 1000, 25);
 * ```
 */
export function createBatchLogger(logger: Logger) {
  return createEnrichedLogger(
    logger,
    { type: 'batch-operation', defaultLevel: 'debug', messageFormatter: () => '' },
    (service: string, operation: string, totalItems: number, chunkSize: number, metadata?: LogMetadata) => {
      const chunks = Math.ceil(totalItems / chunkSize);
      return {
        operation,
        message: `[${service}] Starting batch ${operation}: ${totalItems} items in ${chunks} chunks`,
        service,
        totalItems,
        chunkSize,
        chunks,
        ...metadata,
      };
    }
  );
}

/**
 * Create a validation error logger
 *
 * @param logger - Pino logger instance
 *
 * @returns A function that logs validation errors
 *
 * @example
 * ```typescript
 * const logValidation = createValidationLogger(logger);
 * logValidation('CommentService', 'content', 'Content exceeds 500 characters');
 * ```
 */
export function createValidationLogger(logger: Logger) {
  return createEnrichedLogger(
    logger,
    { type: 'validation-error', defaultLevel: 'warn', messageFormatter: () => '' },
    (service: string, field: string, error: string, metadata?: LogMetadata) => ({
      operation: field,
      message: `[${service}] Validation failed for ${field}: ${error}`,
      service,
      field,
      error,
      ...metadata,
    })
  );
}

/**
 * Create an error logger
 *
 * @param logger - Pino logger instance
 *
 * @returns A function that logs errors with stack traces
 *
 * @example
 * ```typescript
 * const logErr = createErrorLogger(logger);
 * try {
 *   // operation
 * } catch (error) {
 *   logErr('PostService', 'createPost', error, { userId: '123' });
 * }
 * ```
 */
export function createErrorLogger(logger: Logger) {
  return createEnrichedLogger(
    logger,
    { type: 'error', defaultLevel: 'error', messageFormatter: () => '' },
    (service: string, operation: string, error: Error | string, metadata?: LogMetadata) => ({
      operation,
      message: `[${service}] Error in ${operation}`,
      service,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      ...metadata,
    })
  );
}
