/**
 * DAL Package Logging Infrastructure
 *
 * Uses @social-media-app/logger for structured logging with
 * OpenTelemetry trace context injection and rotating file streams.
 *
 * This replaces console.log/console.error throughout the DAL package
 * with production-ready, structured logging.
 */

import {
  createPinoLogger,
  createChildLogger,
  createDomainLogger,
  createResultLogger,
  createServiceLogger,
  createSlowOperationLogger,
  createBatchLogger,
  createValidationLogger,
  createErrorLogger,
  type Logger,
} from '@social-media-app/logger';

/**
 * Base logger for the DAL package
 *
 * Automatically includes:
 * - Service: 'data-access-layer'
 * - App: 'social-media-dal'
 * - Environment variables (LOG_LEVEL, NODE_ENV)
 * - OpenTelemetry trace context (trace_id, span_id) when available
 */
export const logger: Logger = createPinoLogger({
  service: 'data-access-layer',
  app: 'social-media-dal',
  logLevel: process.env.LOG_LEVEL || 'debug',
  env: process.env.NODE_ENV || 'development',
});

/**
 * Domain-specific logger for DynamoDB operations
 *
 * @example
 * ```typescript
 * logDynamoDB('query', { table: 'MainTable', gsi: 'GSI1', limit: 20 });
 * logDynamoDB('put', { table: 'MainTable', userId: 'user-123' });
 * logDynamoDB('batchWrite', { table: 'MainTable', itemCount: 25 });
 * ```
 */
export const logDynamoDB = createDomainLogger(logger, 'dynamodb', 'debug');

/**
 * Result-aware logger for Redis cache operations
 *
 * Automatically logs at 'warn' level for errors, 'debug' for success cases.
 *
 * @example
 * ```typescript
 * logCache('get', 'hit', { key: 'feed:user-123', itemCount: 50 });
 * logCache('get', 'miss', { key: 'feed:user-456' });
 * logCache('set', 'success', { key: 'feed:user-789', ttl: 300 });
 * logCache('get', 'error', { key: 'feed:user-000', error: 'Connection timeout' });
 * ```
 */
export const logCache = createResultLogger(logger, 'cache', 'debug');

/**
 * Domain-specific logger for Kinesis event publishing
 *
 * @example
 * ```typescript
 * logKinesis('publish', { stream: 'events', eventType: 'POST_CREATED', partitionKey: 'user-123' });
 * logKinesis('batchPublish', { stream: 'events', count: 10 });
 * ```
 */
export const logKinesis = createDomainLogger(logger, 'kinesis', 'debug');

/**
 * Domain-specific logger for S3 operations
 *
 * @example
 * ```typescript
 * logS3('presignedUrl', { bucket: 'profile-pictures', key: 'user-123.jpg', expiry: 3600 });
 * logS3('upload', { bucket: 'profile-pictures', key: 'user-123.jpg', size: 1024000 });
 * ```
 */
export const logS3 = createDomainLogger(logger, 's3', 'debug');

/**
 * Service operation logger with duration tracking
 *
 * @example
 * ```typescript
 * const startTime = Date.now();
 * // ... perform operation
 * const duration = Date.now() - startTime;
 * logServiceOp('FeedService', 'writeFeedItemsBatch', { itemCount: 1000 }, duration);
 * ```
 */
export const logServiceOp = createServiceLogger(logger);

/**
 * Slow operation logger (warns when operations exceed thresholds)
 *
 * @example
 * ```typescript
 * const duration = 250; // ms
 * const threshold = 100; // ms
 * logSlowOp('PostService', 'getUserPosts', duration, threshold, { userId: '123' });
 * ```
 */
export const logSlowOp = createSlowOperationLogger(logger);

/**
 * Batch operation logger
 *
 * @example
 * ```typescript
 * logBatch('FeedService', 'writeFeedItemsBatch', 1000, 25);
 * // Logs: [FeedService] Starting batch writeFeedItemsBatch: 1000 items in 40 chunks
 * ```
 */
export const logBatch = createBatchLogger(logger);

/**
 * Validation error logger
 *
 * @example
 * ```typescript
 * logValidation('CommentService', 'content', 'Content exceeds 500 characters', { userId: '123' });
 * ```
 */
export const logValidation = createValidationLogger(logger);

/**
 * Error logger with stack trace capture
 *
 * @example
 * ```typescript
 * try {
 *   await dynamoClient.send(new PutCommand({...}));
 * } catch (error) {
 *   logError('PostService', 'createPost', error, { userId: '123', postId: 'post-456' });
 *   throw error;
 * }
 * ```
 */
export const logError = createErrorLogger(logger);

/**
 * Create a child logger with additional context
 *
 * Useful for adding request-specific context that will be included in all subsequent logs.
 *
 * @example
 * ```typescript
 * const requestLogger = createChildLogger(logger, {
 *   requestId: 'req-123',
 *   userId: 'user-456',
 * });
 *
 * requestLogger.info('Processing request');
 * // Automatically includes requestId and userId in log
 * ```
 */
export { createChildLogger };

/**
 * Export the base logger for direct usage when needed
 *
 * @example
 * ```typescript
 * logger.info({ eventType: 'SERVICE_STARTED' }, 'DAL service initialized');
 * logger.error({ error: 'Connection failed' }, 'Database connection error');
 * ```
 */
export { logger as default };
