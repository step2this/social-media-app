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

// Service configuration
const serviceName = 'social-media-graphql';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'development';

// OTLP exporter configuration
// In development: defaults to local endpoint (or console if not set)
// In production: should be set to SigNoz/Jaeger endpoint via env var
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

console.log(`[OpenTelemetry] Initializing instrumentation for ${serviceName}`);
console.log(`[OpenTelemetry] Environment: ${environment}`);
console.log(`[OpenTelemetry] OTLP Endpoint: ${otlpEndpoint}`);

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

// Initialize OpenTelemetry SDK
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
      // AWS SDK instrumentation for DynamoDB, S3, etc.
      '@opentelemetry/instrumentation-aws-sdk': {
        enabled: true,
        suppressInternalInstrumentation: true,
      },
    }),

    // GraphQL-specific instrumentation
    new GraphQLInstrumentation({
      // Don't merge all resolver spans into one
      mergeItems: false,
      // Include variable values in spans (be careful with sensitive data!)
      allowValues: process.env.NODE_ENV !== 'production',
      // Depth of nested fields to include in spans
      depth: 2,
    }),

    // AWS SDK instrumentation (more specific config)
    new AwsInstrumentation({
      suppressInternalInstrumentation: true,
      sqsExtractContextPropagationFromPayload: true,
    }),
  ],
});

// Start the SDK (returns void, not a promise)
try {
  sdk.start();
  console.log('[OpenTelemetry] SDK started successfully');
  console.log('[OpenTelemetry] Instrumentation active for:');
  console.log('  - GraphQL operations');
  console.log('  - AWS SDK (DynamoDB, S3, etc.)');
  console.log('  - HTTP requests');
} catch (error) {
  console.error('[OpenTelemetry] Failed to start SDK:', error);
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[OpenTelemetry] Shutting down...');
  try {
    await sdk.shutdown();
    console.log('[OpenTelemetry] Shutdown complete');
  } catch (error) {
    console.error('[OpenTelemetry] Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
});

// Export SDK for manual span creation if needed
export { sdk };
