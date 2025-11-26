import type { SpanExporter } from '@opentelemetry/sdk-trace-node';
import { createOTLPExporter } from './otlp.js';
import { createConsoleExporter } from './console.js';

/**
 * Create appropriate span exporter based on configuration
 *
 * Selects between console exporter (development) and OTLP exporter (production)
 * based on environment settings.
 *
 * @param otlpEndpoint - OTLP endpoint URL for production traces
 * @param otlpHeaders - HTTP headers for OTLP requests
 * @param enableConsoleExporter - Whether to use console exporter (dev mode)
 * @returns Configured span exporter
 *
 * @example
 * ```typescript
 * // Development: use console exporter
 * const exporter = createExporter(
 *   'http://localhost:4318/v1/traces',
 *   {},
 *   true  // enableConsoleExporter
 * );
 *
 * // Production: use OTLP exporter
 * const exporter = createExporter(
 *   'https://collector.example.com:4318/v1/traces',
 *   { authorization: 'Bearer token' },
 *   false  // enableConsoleExporter
 * );
 * ```
 */
export function createExporter(
  otlpEndpoint: string,
  otlpHeaders: Record<string, string>,
  enableConsoleExporter: boolean
): SpanExporter {
  // In development with console exporter enabled
  if (enableConsoleExporter) {
    return createConsoleExporter();
  }

  // Production: use OTLP exporter
  return createOTLPExporter(otlpEndpoint, otlpHeaders);
}
