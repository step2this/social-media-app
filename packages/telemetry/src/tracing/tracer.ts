import { trace, type Tracer } from '@opentelemetry/api';

/**
 * Create or get a tracer for a service
 *
 * Tracers are used to create spans. Each service should have its own tracer
 * identified by name and version.
 *
 * @param name - Tracer name (typically service name)
 * @param version - Tracer version (typically service version)
 * @returns Tracer instance
 *
 * @example
 * ```typescript
 * import { createTracer } from '@social-media-app/telemetry';
 *
 * const tracer = createTracer('social-media-dal', '1.0.0');
 *
 * // Create spans with the tracer
 * const span = tracer.startSpan('database-query');
 * try {
 *   // ... perform operation
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createTracer(name: string, version?: string): Tracer {
  return trace.getTracer(name, version);
}
