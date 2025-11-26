import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';

/**
 * Create console span exporter for development
 *
 * Outputs spans to console for easy debugging during development.
 * Not recommended for production use.
 *
 * @returns Console span exporter
 *
 * @example
 * ```typescript
 * const exporter = createConsoleExporter();
 * // Spans will be logged to console when ended
 * ```
 */
export function createConsoleExporter(): ConsoleSpanExporter {
  return new ConsoleSpanExporter();
}
