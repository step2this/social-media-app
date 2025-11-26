import type { Span } from '@opentelemetry/api';

/**
 * Set user-related attributes on a span
 *
 * @param span - Span to add attributes to
 * @param userId - User identifier
 * @param additionalAttrs - Additional user attributes
 *
 * @example
 * ```typescript
 * setUserAttributes(span, 'user-123', {
 *   'user.email': 'user@example.com',
 *   'user.role': 'admin',
 * });
 * ```
 */
export function setUserAttributes(
  span: Span,
  userId: string,
  additionalAttrs?: Record<string, string | number | boolean>
): void {
  span.setAttribute('user.id', userId);
  if (additionalAttrs) {
    Object.entries(additionalAttrs).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Set database operation attributes on a span
 *
 * @param span - Span to add attributes to
 * @param system - Database system (dynamodb, postgresql, redis, etc.)
 * @param operation - Operation name (query, get, put, delete, etc.)
 * @param additionalAttrs - Additional database attributes
 *
 * @example
 * ```typescript
 * setDatabaseAttributes(span, 'dynamodb', 'query', {
 *   'db.table': 'Users',
 *   'db.item.count': 10,
 * });
 * ```
 */
export function setDatabaseAttributes(
  span: Span,
  system: string,
  operation: string,
  additionalAttrs?: Record<string, string | number | boolean>
): void {
  span.setAttribute('db.system', system);
  span.setAttribute('db.operation', operation);
  if (additionalAttrs) {
    Object.entries(additionalAttrs).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Set cache operation attributes on a span
 *
 * @param span - Span to add attributes to
 * @param operation - Cache operation (get, set, delete, clear)
 * @param key - Cache key
 * @param hit - Whether the operation was a cache hit
 *
 * @example
 * ```typescript
 * setCacheAttributes(span, 'get', 'user:123', true);
 * ```
 */
export function setCacheAttributes(
  span: Span,
  operation: string,
  key: string,
  hit?: boolean
): void {
  span.setAttribute('cache.operation', operation);
  span.setAttribute('cache.key', key);
  if (hit !== undefined) {
    span.setAttribute('cache.hit', hit);
  }
}

/**
 * Set messaging/event attributes on a span
 *
 * @param span - Span to add attributes to
 * @param system - Messaging system (kinesis, sqs, sns, etc.)
 * @param operation - Operation (publish, consume, etc.)
 * @param destination - Destination name (stream, queue, topic)
 * @param additionalAttrs - Additional messaging attributes
 *
 * @example
 * ```typescript
 * setMessagingAttributes(span, 'kinesis', 'publish', 'events', {
 *   'messaging.message_id': 'msg-123',
 *   'messaging.batch.size': 10,
 * });
 * ```
 */
export function setMessagingAttributes(
  span: Span,
  system: string,
  operation: string,
  destination: string,
  additionalAttrs?: Record<string, string | number | boolean>
): void {
  span.setAttribute('messaging.system', system);
  span.setAttribute('messaging.operation', operation);
  span.setAttribute('messaging.destination.name', destination);
  if (additionalAttrs) {
    Object.entries(additionalAttrs).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Set error attributes on a span
 *
 * Marks the span as failed and records error details.
 *
 * @param span - Span to add error attributes to
 * @param error - Error object or error message
 * @param additionalAttrs - Additional error attributes
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   setErrorAttributes(span, error, {
 *     'error.handled': true,
 *     'error.retry_count': 3,
 *   });
 *   throw error;
 * }
 * ```
 */
export function setErrorAttributes(
  span: Span,
  error: Error | string,
  additionalAttrs?: Record<string, string | number | boolean>
): void {
  const isError = error instanceof Error;
  
  span.setAttribute('error', true);
  span.setAttribute('error.type', isError ? error.name : 'Error');
  span.setAttribute('error.message', isError ? error.message : error);
  
  if (isError && error.stack) {
    span.setAttribute('error.stack', error.stack);
  }
  
  if (additionalAttrs) {
    Object.entries(additionalAttrs).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}
