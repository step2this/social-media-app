/**
 * OpenTelemetry Instrumentation for Next.js
 *
 * Sets up distributed tracing using OpenTelemetry with Vercel's integration.
 * This automatically instruments:
 * - HTTP requests (fetch, axios, etc.)
 * - Next.js Server Actions
 * - Next.js API routes
 * - Database queries (if using instrumented clients)
 *
 * Traces are exported to console by default (development mode).
 * In production, configure OTEL_EXPORTER_OTLP_ENDPOINT to send to your
 * observability platform (SigNoz, Jaeger, New Relic, etc.)
 */

import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'social-media-web',

    // In development, we'll see traces in console
    // In production, set OTEL_EXPORTER_OTLP_ENDPOINT env var to export traces
  });

  console.log('[OpenTelemetry] Instrumentation registered for social-media-web');
}
