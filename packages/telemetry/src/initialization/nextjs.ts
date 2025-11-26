import { registerOTel } from '@vercel/otel';
import type { TelemetryConfig } from '../types.js';
import { resolveConfig, validateConfig } from './config.js';

/**
 * Initialize OpenTelemetry for Next.js applications
 *
 * Uses Vercel's @vercel/otel wrapper for simplified Next.js integration.
 * This handles Next.js-specific instrumentation patterns and edge runtime compatibility.
 *
 * @param userConfig - Telemetry configuration
 *
 * @example
 * ```typescript
 * // instrumentation.node.ts
 * import { initializeNextJS } from '@social-media-app/telemetry';
 *
 * export function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     initializeNextJS({
 *       serviceName: 'social-media-web',
 *     });
 *   }
 * }
 * ```
 */
export function initializeNextJS(userConfig: TelemetryConfig): void {
  // Validate configuration
  validateConfig(userConfig);

  // Resolve final configuration
  const config = resolveConfig(userConfig);

  console.log(
    `[OpenTelemetry] Initializing Next.js instrumentation for: ${config.serviceName}`
  );

  // Register OpenTelemetry with Vercel's wrapper
  // This handles Next.js-specific patterns and edge runtime compatibility
  registerOTel({
    serviceName: config.serviceName,
  });

  console.log(`[OpenTelemetry] Next.js instrumentation registered`);
}
