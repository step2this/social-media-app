import type { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import type { TelemetryConfig } from '../types.js';
import { resolveConfig, validateConfig } from './config.js';
import { createServiceResource } from '../resources/service.js';
import { createDeploymentResource } from '../resources/deployment.js';
import { createExporter } from '../exporters/factory.js';
import { getAutoInstrumentations } from '../instrumentation/auto.js';
import { NodeSDK as SDK } from '@opentelemetry/sdk-node';

/**
 * Initialize OpenTelemetry for AWS Lambda functions
 *
 * Optimized for Lambda with SimpleSpanProcessor for immediate span export
 * and Lambda-specific lifecycle management. No SIGTERM handler as AWS
 * manages the Lambda lifecycle.
 *
 * @param userConfig - Telemetry configuration
 * @returns NodeSDK instance (no shutdown function - AWS handles lifecycle)
 *
 * @example
 * ```typescript
 * import { initializeLambda } from '@social-media-app/telemetry';
 *
 * // Initialize once outside the handler
 * const { sdk } = initializeLambda({
 *   serviceName: 'social-media-graphql',
 * });
 *
 * export const handler = async (event: any) => {
 *   // Your Lambda handler code
 *   // Spans will be exported immediately with SimpleSpanProcessor
 * };
 * ```
 */
export function initializeLambda(userConfig: TelemetryConfig): { sdk: NodeSDK } {
  // Validate configuration
  validateConfig(userConfig);

  // Resolve final configuration
  const config = resolveConfig(userConfig);

  console.log(`[OpenTelemetry] Initializing Lambda SDK for: ${config.serviceName}`);

  // Create resource attributes with semantic conventions
  const serviceResource = createServiceResource(
    config.serviceName,
    config.serviceVersion,
    config.environment
  );
  const deploymentResource = createDeploymentResource();
  const resource = serviceResource.merge(deploymentResource);

  // Create appropriate exporter
  const traceExporter = createExporter(
    config.otlpEndpoint,
    config.otlpHeaders,
    config.enableConsoleExporter
  );

  console.log(`[OpenTelemetry] Lambda exporting traces to: ${config.otlpEndpoint}`);

  // Get auto-instrumentations unless disabled
  const instrumentations = config.disableAutoInstrumentation
    ? []
    : getAutoInstrumentations(config.environment);

  // Lambda optimization: Use SimpleSpanProcessor for immediate export
  // This prevents span loss when Lambda container freezes
  const spanProcessor = new SimpleSpanProcessor(traceExporter);

  // Create and configure SDK
  const sdk = new SDK({
    resource,
    spanProcessor,
    instrumentations,
  });

  // Start the SDK
  sdk.start();

  console.log(
    `[OpenTelemetry] Lambda SDK started with SimpleSpanProcessor (immediate export)`
  );

  // Note: No SIGTERM handler - AWS manages Lambda lifecycle
  // Lambda containers may freeze at any time, so immediate export is critical

  return { sdk };
}
