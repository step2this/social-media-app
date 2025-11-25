/**
 * OpenTelemetry Instrumentation for GraphQL Lambda
 *
 * Sets up distributed tracing for the GraphQL server running in AWS Lambda.
 * This automatically instruments:
 * - GraphQL operations (queries, mutations, subscriptions)
 * - DynamoDB queries (via AWS SDK)
 * - HTTP requests (incoming and outgoing)
 * - Apollo Server operations
 *
 * Traces are exported via OTLP to the configured endpoint (SigNoz, Jaeger, etc.)
 *
 * IMPORTANT: This must be imported BEFORE the Lambda handler is loaded
 * to ensure all instrumentation is registered before any other code runs.
 *
 * Usage in Lambda handler:
 * ```typescript
 * // MUST be first import!
 * import './infrastructure/instrumentation';
 * import { handler } from './lambda';
 *
 * export { handler };
 * ```
 */

// Use dynamic imports to handle CommonJS modules in ESM context
// NodeNext module resolution requires this approach for proper interop
const [
  { NodeSDK },
  { OTLPTraceExporter },
  { resourceFromAttributes },
  { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT },
  { getNodeAutoInstrumentations },
  { GraphQLInstrumentation },
  { AwsInstrumentation },
] = await Promise.all([
  import('@opentelemetry/sdk-node'),
  import('@opentelemetry/exporter-trace-otlp-http'),
  import('@opentelemetry/resources'),
  import('@opentelemetry/semantic-conventions'),
  import('@opentelemetry/auto-instrumentations-node'),
  import('@opentelemetry/instrumentation-graphql'),
  import('@opentelemetry/instrumentation-aws-sdk'),
]);

// Import logger for structured logging
import { logger } from './logger.js';

// Service configuration
const serviceName = 'social-media-graphql';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'development';

// OTLP exporter configuration
// In development: defaults to local endpoint (or console if not set)
// In production: should be set to SigNoz/Jaeger endpoint via env var
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

// Detect Lambda environment for optimizations
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

logger.info(
  {
    serviceName,
    environment,
    otlpEndpoint,
    isLambda,
  },
  'Initializing OpenTelemetry instrumentation'
);

// Create resource with service information using resourceFromAttributes
// Note: Resource is not a constructor in OpenTelemetry v2.x, use the factory function instead
const resource = resourceFromAttributes({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
});

// Create OTLP trace exporter
const traceExporter = new OTLPTraceExporter({
  url: otlpEndpoint,
  headers: {}, // Add auth headers here if needed
});

// Import span processors for Lambda optimization
const { SimpleSpanProcessor } = await import('@opentelemetry/sdk-trace-node');

// Create SDK with appropriate span processor for environment
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    // Auto-instrumentations (HTTP, DNS, net, etc.)
    getNodeAutoInstrumentations({
      // Disable default GraphQL instrumentation (we'll use custom one)
      '@opentelemetry/instrumentation-graphql': {
        enabled: false,
      },
      // Disable AWS SDK in auto-instrumentations (we configure it manually below)
      '@opentelemetry/instrumentation-aws-sdk': {
        enabled: false,
      },
    }),

    // GraphQL-specific instrumentation with custom config
    new GraphQLInstrumentation({
      // Don't merge all resolver spans into one
      mergeItems: false,
      // Include variable values in spans (be careful with sensitive data!)
      allowValues: environment !== 'production',
      // Depth of nested fields to include in spans
      depth: 2,
    }),

    // AWS SDK instrumentation with SQS context propagation
    new AwsInstrumentation({
      suppressInternalInstrumentation: true,
      sqsExtractContextPropagationFromPayload: true,
    }),
  ],
  // Lambda optimization: Use SimpleSpanProcessor for immediate export
  // Non-Lambda: Use default BatchSpanProcessor for efficiency
  spanProcessor: isLambda ? new SimpleSpanProcessor(traceExporter) : undefined,
});

// Start the SDK
try {
  sdk.start();
  logger.info(
    {
      instrumentations: ['GraphQL operations', 'AWS SDK (DynamoDB, S3)', 'HTTP requests'],
      spanProcessor: isLambda ? 'SimpleSpanProcessor' : 'BatchSpanProcessor (default)',
    },
    'OpenTelemetry SDK started successfully'
  );
} catch (error) {
  logger.error(
    {
      error: error instanceof Error ? error.message : String(error),
    },
    'Failed to start OpenTelemetry SDK'
  );
  throw error;
}

// Handle graceful shutdown (only for non-Lambda environments)
if (!isLambda) {
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down OpenTelemetry SDK');
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry SDK shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during OpenTelemetry shutdown');
      process.exit(1);
    }
  });
} else {
  logger.debug('Running in Lambda - AWS manages lifecycle, no SIGTERM handler needed');
}

// Export SDK for manual span creation if needed
export { sdk };
