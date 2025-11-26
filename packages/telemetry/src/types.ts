import type { Span, Tracer } from '@opentelemetry/api';
import type { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * Configuration for OpenTelemetry initialization
 */
export interface TelemetryConfig {
  /** Service name (required) */
  serviceName: string;

  /** Service version (optional, defaults to env var or '1.0.0') */
  serviceVersion?: string;

  /** Environment (optional, defaults to NODE_ENV or 'development') */
  environment?: string;

  /** OTLP endpoint (optional, defaults to env var or http://localhost:4318/v1/traces) */
  otlpEndpoint?: string;

  /** OTLP headers (optional, for auth) */
  otlpHeaders?: Record<string, string>;

  /** Log level (optional, defaults to 'info') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /** Enable console exporter for development (optional, defaults to true in dev) */
  enableConsoleExporter?: boolean;

  /** Disable auto-instrumentation (optional, defaults to false) */
  disableAutoInstrumentation?: boolean;
}

/**
 * Metadata for span creation
 */
export interface SpanMetadata {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Result of SDK initialization
 */
export interface TelemetrySDK {
  /** The initialized NodeSDK instance */
  sdk: NodeSDK;

  /** Shutdown function to gracefully stop the SDK */
  shutdown: () => Promise<void>;
}

/**
 * Domain-specific span options for DynamoDB operations
 */
export interface DynamoDBSpanOptions extends SpanMetadata {
  /** DynamoDB table name */
  tableName: string;

  /** Index name (for queries using GSI/LSI) */
  indexName?: string;

  /** Number of items processed */
  itemCount?: number;
}

/**
 * Domain-specific span options for cache operations
 */
export interface CacheSpanOptions extends SpanMetadata {
  /** Cache key */
  key: string;

  /** Cache hit (true) or miss (false) */
  hit?: boolean;

  /** TTL in seconds */
  ttl?: number;
}

/**
 * Domain-specific span options for Kinesis operations
 */
export interface KinesisSpanOptions extends SpanMetadata {
  /** Kinesis stream name */
  streamName: string;

  /** Partition key */
  partitionKey?: string;

  /** Batch size (for batch operations) */
  batchSize?: number;
}

/**
 * Domain-specific span options for service operations
 */
export interface ServiceSpanOptions extends SpanMetadata {
  /** Service name */
  serviceName: string;

  /** Operation name */
  operation: string;
}

/**
 * Function type for executing code within a span
 */
export type SpanExecutor<T> = (span: Span) => Promise<T>;

/**
 * Function type for synchronous execution within a span
 */
export type SpanExecutorSync<T> = (span: Span) => T;
