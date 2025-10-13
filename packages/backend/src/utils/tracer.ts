/**
 * AWS X-Ray Tracer Configuration
 *
 * Centralized configuration for AWS X-Ray distributed tracing using AWS Lambda Powertools.
 * This module provides a singleton tracer instance configured for production observability.
 *
 * @module utils/tracer
 */

import { Tracer } from '@aws-lambda-powertools/tracer';

/**
 * Environment-specific configuration for X-Ray tracing
 */
const isLocal = process.env.NODE_ENV === 'local' || process.env.IS_LOCAL === 'true';
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

/**
 * AWS Lambda Powertools Tracer instance
 *
 * Configuration:
 * - Service name: Identifies traces in X-Ray console
 * - Capture HTTP responses: Includes response bodies in traces (disabled in prod for performance)
 * - Capture AWS SDK v3 clients: Automatically instruments AWS SDK calls
 * - Enabled: Disabled in local/test environments for performance
 *
 * @example
 * ```typescript
 * import { tracer } from '../utils/tracer.js';
 *
 * // In Lambda handler
 * export const handler = tracer.captureLambdaHandler(async (event) => {
 *   const segment = tracer.getSegment();
 *   tracer.putAnnotation('userId', userId);
 *   tracer.putMetadata('request', { body: event.body });
 *
 *   // Create subsegments for specific operations
 *   const subsegment = segment.addNewSubsegment('DynamoDB.Query');
 *   try {
 *     const result = await someOperation();
 *     subsegment.close();
 *     return result;
 *   } catch (error) {
 *     subsegment.addError(error);
 *     subsegment.close();
 *     throw error;
 *   }
 * });
 * ```
 */
export const tracer = new Tracer({
  serviceName: process.env.SERVICE_NAME || 'social-media-app',
  captureHTTPsRequests: !isProd, // Capture response bodies only in non-prod
  enabled: !isLocal && !isTest    // Disable in local and test environments
});

/**
 * Helper function to add custom annotations to traces
 * Annotations are indexed and searchable in X-Ray console
 *
 * @param key - The annotation key (e.g., 'userId', 'postId')
 * @param value - The annotation value
 *
 * @example
 * ```typescript
 * addTraceAnnotation('operationType', 'CREATE_POST');
 * addTraceAnnotation('userId', decoded.userId);
 * ```
 */
export const addTraceAnnotation = (key: string, value: string | number | boolean): void => {
  if (tracer.isTracingEnabled()) {
    tracer.putAnnotation(key, value);
  }
};

/**
 * Helper function to add custom metadata to traces
 * Metadata is not indexed but provides detailed context in trace viewer
 *
 * @param namespace - The metadata namespace (e.g., 'request', 'response', 'error')
 * @param key - The metadata key
 * @param value - The metadata value (can be any serializable object)
 *
 * @example
 * ```typescript
 * addTraceMetadata('request', 'body', event.body);
 * addTraceMetadata('dynamodb', 'queryParams', params);
 * ```
 */
export const addTraceMetadata = (namespace: string, key: string, value: unknown): void => {
  if (tracer.isTracingEnabled()) {
    tracer.putMetadata(key, value, namespace);
  }
};

/**
 * Helper function to capture errors with context in traces
 *
 * @param error - The error to capture
 * @param context - Additional context to include with the error
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   captureTraceError(error, { operation: 'createPost', userId });
 *   throw error;
 * }
 * ```
 */
export const captureTraceError = (error: Error | unknown, context?: Record<string, unknown>): void => {
  if (tracer.isTracingEnabled()) {
    if (context) {
      tracer.putMetadata('errorContext', context);
    }
    tracer.addError(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Create a traced async operation with automatic subsegment management
 *
 * @param name - The name of the subsegment
 * @param fn - The async function to execute within the subsegment
 * @returns The result of the async function
 *
 * @example
 * ```typescript
 * const result = await tracedOperation('DynamoDB.GetItem', async () => {
 *   return await dynamoClient.send(new GetItemCommand(params));
 * });
 * ```
 */
export const tracedOperation = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  if (!tracer.isTracingEnabled()) {
    return fn();
  }

  const segment = tracer.getSegment();
  if (!segment) {
    return fn();
  }

  const subsegment = segment.addNewSubsegment(name);

  try {
    const result = await fn();
    subsegment.close();
    return result;
  } catch (error) {
    if (subsegment && !subsegment.isClosed()) {
      subsegment.addError(error instanceof Error ? error : new Error(String(error)));
      subsegment.close();
    }
    throw error;
  }
};

/**
 * Trace cache operations with hit/miss tracking
 *
 * @param operation - The cache operation type ('get', 'set', 'delete')
 * @param key - The cache key
 * @param hit - Whether the operation was a cache hit (for 'get' operations)
 *
 * @example
 * ```typescript
 * traceCacheOperation('get', `feed:${userId}`, true);
 * ```
 */
export const traceCacheOperation = (
  operation: 'get' | 'set' | 'delete',
  key: string,
  hit?: boolean
): void => {
  if (tracer.isTracingEnabled()) {
    tracer.putAnnotation('cache.operation', operation);
    tracer.putAnnotation('cache.key', key);
    if (operation === 'get' && hit !== undefined) {
      tracer.putAnnotation('cache.hit', hit);
    }
  }
};

/**
 * Trace Kinesis event publishing with event details
 *
 * @param eventType - The type of event being published
 * @param eventId - The unique event ID
 * @param partitionKey - The Kinesis partition key
 *
 * @example
 * ```typescript
 * traceKinesisPublish('POST_CREATED', eventId, userId);
 * ```
 */
export const traceKinesisPublish = (
  eventType: string,
  eventId: string,
  partitionKey: string
): void => {
  if (tracer.isTracingEnabled()) {
    tracer.putAnnotation('kinesis.eventType', eventType);
    tracer.putAnnotation('kinesis.eventId', eventId);
    tracer.putMetadata('kinesis', 'partitionKey', partitionKey);
  }
};

/**
 * Trace DynamoDB operations with query details
 *
 * @param operation - The DynamoDB operation type
 * @param tableName - The DynamoDB table name
 * @param details - Additional operation details
 *
 * @example
 * ```typescript
 * traceDynamoDBOperation('Query', 'social-media-table', {
 *   pk: 'USER#123',
 *   sk: 'POST#',
 *   limit: 20
 * });
 * ```
 */
export const traceDynamoDBOperation = (
  operation: string,
  tableName: string,
  details?: Record<string, unknown>
): void => {
  if (tracer.isTracingEnabled()) {
    tracer.putAnnotation('dynamodb.operation', operation);
    tracer.putAnnotation('dynamodb.table', tableName);
    if (details) {
      tracer.putMetadata('dynamodb', operation.toLowerCase(), details);
    }
  }
};

export default tracer;