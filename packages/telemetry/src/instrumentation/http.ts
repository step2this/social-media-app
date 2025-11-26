import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

/**
 * Create Node.js auto-instrumentations
 *
 * Includes instrumentation for HTTP, DNS, net, and other Node.js built-ins.
 * Some noisy instrumentation (fs) is disabled by default.
 *
 * @returns Configured Node.js auto-instrumentations
 *
 * @example
 * ```typescript
 * const nodeInstrumentations = createNodeAutoInstrumentations();
 * // Automatically instruments HTTP requests, DNS lookups, etc.
 * ```
 */
export function createNodeAutoInstrumentations() {
  return getNodeAutoInstrumentations({
    // Disable file system instrumentation (can be very noisy)
    '@opentelemetry/instrumentation-fs': {
      enabled: false,
    },
    
    // Disable GraphQL and AWS SDK in auto-instrumentations
    // We configure these manually with custom settings
    '@opentelemetry/instrumentation-graphql': {
      enabled: false,
    },
    '@opentelemetry/instrumentation-aws-sdk': {
      enabled: false,
    },
  });
}
