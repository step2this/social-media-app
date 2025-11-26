import { NodeSDK } from '@opentelemetry/sdk-node';
import type { TelemetryConfig, TelemetrySDK } from '../types.js';
import { resolveConfig, validateConfig } from './config.js';
import { createServiceResource } from '../resources/service.js';
import { createDeploymentResource } from '../resources/deployment.js';
import { createExporter } from '../exporters/factory.js';
import { getAutoInstrumentations } from '../instrumentation/auto.js';

/**
 * Initialize OpenTelemetry NodeSDK for standalone applications
 *
 * Configures and starts OpenTelemetry SDK with auto-instrumentation for GraphQL Server,
 * Lambda functions, or any standalone Node.js application.
 *
 * @param userConfig - Telemetry configuration
 * @returns TelemetrySDK instance with shutdown function
 *
 * @example
 * ```typescript
 * import { initializeNodeSDK } from '@social-media-app/telemetry';
 *
 * const { sdk, shutdown } = initializeNodeSDK({
 *   serviceName: 'social-media-graphql',
 *   serviceVersion: '1.0.0',
 * });
 *
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await shutdown();
 *   process.exit(0);
 * });
 * ```
 */
export function initializeNodeSDK(userConfig: TelemetryConfig): TelemetrySDK {
  // Validate configuration
  validateConfig(userConfig);

  // Resolve final configuration from env vars and defaults
  const config = resolveConfig(userConfig);

  console.log(`[OpenTelemetry] Initializing SDK for service: ${config.serviceName}`);

  // Create resource attributes with semantic conventions
  const serviceResource = createServiceResource(
    config.serviceName,
    config.serviceVersion,
    config.environment
  );
  const deploymentResource = createDeploymentResource();
  const resource = serviceResource.merge(deploymentResource);

  // Create appropriate exporter (console for dev, OTLP for prod)
  const traceExporter = createExporter(
    config.otlpEndpoint,
    config.otlpHeaders,
    config.enableConsoleExporter
  );

  console.log(`[OpenTelemetry] Exporting traces to: ${config.otlpEndpoint}`);

  // Get auto-instrumentations unless disabled
  const instrumentations = config.disableAutoInstrumentation
    ? []
    : getAutoInstrumentations(config.environment);

  // Create and configure SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations,
  });

  // Start the SDK
  sdk.start();

  console.log(`[OpenTelemetry] SDK started successfully`);

  // Create shutdown function
  const shutdown = async (): Promise<void> => {
    console.log('[OpenTelemetry] Shutting down SDK...');
    await sdk.shutdown();
    console.log('[OpenTelemetry] SDK shutdown complete');
  };

  return { sdk, shutdown };
}
