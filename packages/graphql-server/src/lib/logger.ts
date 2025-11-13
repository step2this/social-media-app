/**
 * Structured Logging with Pino for GraphQL Server
 *
 * Provides consistent, performant logging across the GraphQL server.
 *
 * Features:
 * - Structured JSON logging in production
 * - Pretty printing in development
 * - Child loggers with context inheritance
 * - Type-safe logging methods
 *
 * Usage:
 * ```typescript
 * import { logger } from './lib/logger';
 *
 * // Simple logging
 * logger.info('Server started');
 * logger.error('Database connection failed');
 *
 * // Structured logging with context
 * logger.info({ userId: '123', mutation: 'likePost' }, 'Processing mutation');
 *
 * // Child logger with inherited context
 * const resolverLogger = logger.child({ resolver: 'Post.author' });
 * resolverLogger.debug('Fetching author');
 * ```
 */

import pino from 'pino';

/**
 * Create the base logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Pretty printing in development for readability
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,

  // Base context for all logs
  base: {
    env: process.env.NODE_ENV,
    app: 'social-media-graphql',
  },

  // Automatically log errors with full stack traces
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Create a child logger with additional context
 *
 * @example
 * const queryLogger = createLogger({ type: 'query', name: 'getPosts' });
 * queryLogger.info('Executing query');
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Helper to log GraphQL resolver execution
 */
export function logResolver(
  type: 'Query' | 'Mutation',
  name: string,
  context?: { userId?: string; [key: string]: unknown }
) {
  logger.info(
    {
      type: 'resolver',
      resolverType: type,
      resolverName: name,
      ...context,
    },
    `${type}.${name}`
  );
}

/**
 * Helper to log database operations
 */
export function logDatabase(
  operation: 'get' | 'put' | 'update' | 'delete' | 'query' | 'scan',
  table: string,
  metadata?: Record<string, unknown>
) {
  logger.debug(
    {
      type: 'database',
      operation,
      table,
      ...metadata,
    },
    `DB ${operation} on ${table}`
  );
}

/**
 * Helper to log authentication/authorization
 */
export function logAuth(event: 'authenticated' | 'unauthorized' | 'forbidden', userId?: string) {
  const logData = {
    type: 'auth',
    event,
    ...(userId && { userId }),
  };

  if (event === 'unauthorized' || event === 'forbidden') {
    logger.warn(logData, `Auth: ${event}`);
  } else {
    logger.debug(logData, `Auth: ${event}`);
  }
}

/**
 * Helper to log GraphQL errors
 */
export function logGraphQLError(error: Error, context?: { userId?: string; [key: string]: unknown }) {
  logger.error(
    {
      type: 'graphql-error',
      error: {
        message: error.message,
        stack: error.stack,
      },
      ...context,
    },
    'GraphQL Error'
  );
}

// Export singleton instance as default
export default logger;
