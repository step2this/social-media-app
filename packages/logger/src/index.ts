/**
 * @social-media-app/logger
 *
 * Shared logging infrastructure for the social media application.
 *
 * Provides:
 * - Structured JSON logging with Pino
 * - OpenTelemetry distributed tracing integration
 * - Rotating file streams for development
 * - Generic helper factories for DRY logging patterns
 * - Production-ready logging configuration
 *
 * @example Basic usage
 * ```typescript
 * import { createPinoLogger } from '@social-media-app/logger';
 *
 * const logger = createPinoLogger({
 *   service: 'my-service',
 *   app: 'my-app',
 *   logLevel: 'debug',
 * });
 *
 * logger.info({ userId: '123' }, 'Processing request');
 * ```
 *
 * @example Using helper factories
 * ```typescript
 * import { createPinoLogger, createDomainLogger, createResultLogger } from '@social-media-app/logger';
 *
 * const logger = createPinoLogger({ service: 'dal', app: 'social-media-dal' });
 *
 * // Create domain-specific loggers
 * const logDynamoDB = createDomainLogger(logger, 'dynamodb');
 * const logCache = createResultLogger(logger, 'cache');
 *
 * // Use them
 * logDynamoDB('query', { table: 'users', gsi: 'GSI1' });
 * logCache('get', 'hit', { key: 'user:123' });
 * ```
 */

// Core logger functionality
export { createPinoLogger, createChildLogger } from './logger.js';

// Helper factories
export {
  logOperation,
  createDomainLogger,
  createResultLogger,
  createServiceLogger,
  createSlowOperationLogger,
  createBatchLogger,
  createValidationLogger,
  createErrorLogger,
} from './helpers.js';

// Types
export type {
  LoggerConfig,
  LogLevel,
  LogResult,
  LogMetadata,
  LogHelperFn,
  ExtendedLogger,
} from './types.js';

// Re-export pino Logger type for consumers
export type { Logger } from 'pino';
