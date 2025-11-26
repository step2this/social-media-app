/**
 * @social-media-app/telemetry
 *
 * Shared OpenTelemetry infrastructure for distributed tracing and observability
 * across all packages (Next.js, GraphQL Server, DAL).
 *
 * @example
 * ```typescript
 * // GraphQL Server initialization
 * import { initializeNodeSDK } from '@social-media-app/telemetry';
 *
 * const { sdk, shutdown } = initializeNodeSDK({
 *   serviceName: 'social-media-graphql',
 *   serviceVersion: '1.0.0',
 * });
 *
 * process.on('SIGTERM', async () => {
 *   await shutdown();
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Next.js initialization
 * import { initializeNextJS } from '@social-media-app/telemetry';
 *
 * export function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     initializeNextJS({ serviceName: 'social-media-web' });
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // DAL span creation
 * import {
 *   createTracer,
 *   createDynamoDBSpan,
 *   withSpan,
 * } from '@social-media-app/telemetry';
 *
 * const tracer = createTracer('social-media-dal', '1.0.0');
 *
 * export async function getPost(postId: string) {
 *   const span = createDynamoDBSpan(tracer, 'get', {
 *     tableName: 'Posts',
 *   });
 *
 *   return withSpan(span, async () => {
 *     return await dynamodb.get({ Key: { postId } });
 *   });
 * }
 * ```
 */

// Core types
export type {
  TelemetryConfig,
  SpanMetadata,
  TelemetrySDK,
  DynamoDBSpanOptions,
  CacheSpanOptions,
  KinesisSpanOptions,
  ServiceSpanOptions,
  SpanExecutor,
  SpanExecutorSync,
} from './types.js';

// SDK Initialization
export { initializeNodeSDK } from './initialization/node-sdk.js';
export { initializeNextJS } from './initialization/nextjs.js';
export { initializeLambda } from './initialization/lambda.js';

// Configuration
export { resolveConfig, validateConfig } from './initialization/config.js';

// Resources
export { createServiceResource } from './resources/service.js';
export { createDeploymentResource } from './resources/deployment.js';

// Exporters
export { createOTLPExporter } from './exporters/otlp.js';
export { createConsoleExporter } from './exporters/console.js';
export { createExporter } from './exporters/factory.js';

// Instrumentation
export { createGraphQLInstrumentation } from './instrumentation/graphql.js';
export { createAWSInstrumentation } from './instrumentation/aws-sdk.js';
export { createNodeAutoInstrumentations } from './instrumentation/http.js';
export { getAutoInstrumentations } from './instrumentation/auto.js';

// Tracing - Tracer
export { createTracer } from './tracing/tracer.js';

// Tracing - Span Factory
export {
  createDynamoDBSpan,
  createCacheSpan,
  createKinesisSpan,
  createServiceSpan,
  withSpan,
  withSpanSync,
} from './tracing/span-factory.js';

// Tracing - Context
export {
  getActiveSpanContext,
  injectContext,
  extractContext,
  withContext,
  withContextSync,
} from './tracing/context.js';

// Tracing - Attributes
export {
  setUserAttributes,
  setDatabaseAttributes,
  setCacheAttributes,
  setMessagingAttributes,
  setErrorAttributes,
} from './tracing/attributes.js';
