import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

/**
 * Create OTLP HTTP trace exporter
 *
 * @param endpoint - OTLP endpoint URL (e.g., 'http://localhost:4318/v1/traces')
 * @param headers - Optional HTTP headers for authentication/authorization
 * @returns Configured OTLP trace exporter
 *
 * @example
 * ```typescript
 * const exporter = createOTLPExporter(
 *   'https://my-collector:4318/v1/traces',
 *   { authorization: 'Bearer token' }
 * );
 * ```
 */
export function createOTLPExporter(
  endpoint: string,
  headers?: Record<string, string>
): OTLPTraceExporter {
  return new OTLPTraceExporter({
    url: endpoint,
    headers: headers || {},
  });
}
