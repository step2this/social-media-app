import type { Span, Tracer } from '@opentelemetry/api';
import { SpanKind, SpanStatusCode, context, trace } from '@opentelemetry/api';
import type {
  DynamoDBSpanOptions,
  CacheSpanOptions,
  KinesisSpanOptions,
  ServiceSpanOptions,
  SpanExecutor,
  SpanExecutorSync,
} from '../types.js';

/**
 * Create a DynamoDB operation span with semantic conventions
 *
 * @param tracer - Tracer instance
 * @param operation - DynamoDB operation (query, get, put, delete, etc.)
 * @param options - DynamoDB span options including tableName
 * @returns Started span (remember to call span.end())
 *
 * @example
 * ```typescript
 * const span = createDynamoDBSpan(tracer, 'query', {
 *   tableName: 'Users',
 *   indexName: 'GSI1',
 *   itemCount: 10,
 * });
 * try {
 *   const result = await dynamodb.query({...});
 *   return result;
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createDynamoDBSpan(
  tracer: Tracer,
  operation: string,
  options: DynamoDBSpanOptions
): Span {
  const span = tracer.startSpan(`dynamodb.${operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.system': 'dynamodb',
      'db.operation': operation,
      'db.dynamodb.table_name': options.tableName,
      ...(options.indexName && { 'db.dynamodb.index_name': options.indexName }),
      ...(options.itemCount && { 'db.item.count': options.itemCount }),
      ...options,
    },
  });

  return span;
}

/**
 * Create a cache operation span
 *
 * @param tracer - Tracer instance
 * @param operation - Cache operation (get, set, delete, clear)
 * @param options - Cache span options including key
 * @returns Started span (remember to call span.end())
 *
 * @example
 * ```typescript
 * const span = createCacheSpan(tracer, 'get', {
 *   key: 'user:123',
 *   hit: true,
 * });
 * try {
 *   const value = await cache.get('user:123');
 *   return value;
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createCacheSpan(
  tracer: Tracer,
  operation: string,
  options: CacheSpanOptions
): Span {
  const span = tracer.startSpan(`cache.${operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'cache.operation': operation,
      'cache.key': options.key,
      ...(options.hit !== undefined && { 'cache.hit': options.hit }),
      ...(options.ttl && { 'cache.ttl': options.ttl }),
      ...options,
    },
  });

  return span;
}

/**
 * Create a Kinesis publish span
 *
 * @param tracer - Tracer instance
 * @param operation - Kinesis operation (publish, publishBatch)
 * @param options - Kinesis span options including streamName
 * @returns Started span (remember to call span.end())
 *
 * @example
 * ```typescript
 * const span = createKinesisSpan(tracer, 'publish', {
 *   streamName: 'events',
 *   partitionKey: 'user-123',
 * });
 * try {
 *   await kinesis.putRecord({...});
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createKinesisSpan(
  tracer: Tracer,
  operation: string,
  options: KinesisSpanOptions
): Span {
  const span = tracer.startSpan(`kinesis.${operation}`, {
    kind: SpanKind.PRODUCER,
    attributes: {
      'messaging.system': 'kinesis',
      'messaging.operation': operation,
      'messaging.destination.name': options.streamName,
      ...(options.partitionKey && { 'messaging.kinesis.partition_key': options.partitionKey }),
      ...(options.batchSize && { 'messaging.batch.size': options.batchSize }),
      ...options,
    },
  });

  return span;
}

/**
 * Create a generic service operation span
 *
 * @param tracer - Tracer instance
 * @param options - Service span options
 * @returns Started span (remember to call span.end())
 *
 * @example
 * ```typescript
 * const span = createServiceSpan(tracer, {
 *   serviceName: 'AuthService',
 *   operation: 'login',
 *   userId: 'user-123',
 * });
 * try {
 *   await authService.login(credentials);
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createServiceSpan(tracer: Tracer, options: ServiceSpanOptions): Span {
  const span = tracer.startSpan(`${options.serviceName}.${options.operation}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'service.name': options.serviceName,
      'service.operation': options.operation,
      ...options,
    },
  });

  return span;
}

/**
 * Execute an async function within a span with automatic lifecycle management
 *
 * Automatically ends the span after execution and records any errors.
 *
 * @param span - The span to execute within
 * @param executor - Async function to execute
 * @returns Promise with the executor's return value
 *
 * @example
 * ```typescript
 * const span = tracer.startSpan('database-query');
 * const result = await withSpan(span, async (span) => {
 *   span.setAttribute('query.type', 'select');
 *   return await db.query('SELECT * FROM users');
 * });
 * // Span automatically ended and errors recorded
 * ```
 */
export async function withSpan<T>(span: Span, executor: SpanExecutor<T>): Promise<T> {
  try {
    const result = await context.with(trace.setSpan(context.active(), span), () =>
      executor(span)
    );
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Execute a synchronous function within a span with automatic lifecycle management
 *
 * Automatically ends the span after execution and records any errors.
 *
 * @param span - The span to execute within
 * @param executor - Synchronous function to execute
 * @returns The executor's return value
 *
 * @example
 * ```typescript
 * const span = tracer.startSpan('computation');
 * const result = withSpanSync(span, (span) => {
 *   span.setAttribute('input.size', data.length);
 *   return processData(data);
 * });
 * // Span automatically ended and errors recorded
 * ```
 */
export function withSpanSync<T>(span: Span, executor: SpanExecutorSync<T>): T {
  try {
    const result = context.with(trace.setSpan(context.active(), span), () => executor(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
