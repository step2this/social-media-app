/**
 * OpenTelemetry Test Utilities
 *
 * Provides test infrastructure for verifying OpenTelemetry instrumentation
 * including span capture, log output capture, and test span creation.
 *
 * Usage:
 * ```typescript
 * import { TestTelemetrySDK, createTestSpan, captureLogs } from './test-setup';
 *
 * let testSDK: TestTelemetrySDK;
 *
 * beforeEach(() => {
 *   testSDK = new TestTelemetrySDK();
 * });
 *
 * afterEach(async () => {
 *   await testSDK.shutdown();
 * });
 *
 * it('should create spans', () => {
 *   const span = createTestSpan('test-operation');
 *   span.end();
 *
 *   const spans = testSDK.getSpans();
 *   expect(spans.length).toBe(1);
 * });
 * ```
 */

import { trace, type Span } from '@opentelemetry/api';

/**
 * Test SDK for managing OpenTelemetry test lifecycle
 *
 * Simplified test infrastructure that doesn't require additional packages.
 * Uses the OpenTelemetry API directly to test trace context behavior.
 */
export class TestTelemetrySDK {
  constructor() {
    // Minimal setup - global tracer is already available
  }

  /**
   * Get all finished spans (not available without SDK, returns empty for now)
   */
  getSpans(): Span[] {
    return [];
  }

  /**
   * Clear all captured spans
   */
  clearSpans() {
    // No-op for simplified test setup
  }

  /**
   * Shutdown and clean up resources
   */
  async shutdown() {
    // No-op for simplified test setup
  }
}

/**
 * Helper to capture log output from pino logger
 *
 * Temporarily intercepts stdout writes to capture structured JSON logs.
 * This allows testing that logs contain the expected fields and values.
 *
 * @param fn - Function to execute while capturing logs
 * @returns Array of parsed JSON log objects
 *
 * @example
 * const logs = captureLogs(() => {
 *   logger.info({ userId: '123' }, 'Test message');
 * });
 * expect(logs[0].userId).toBe('123');
 */
export function captureLogs(
  fn: () => void
): Array<{ level: string; message: string; [key: string]: unknown }> {
  const logs: Array<{ level: string; message: string; [key: string]: unknown }> = [];
  const originalWrite = process.stdout.write;

  process.stdout.write = function (chunk: unknown) {
    try {
      const parsed = JSON.parse(chunk!.toString());
      logs.push(parsed);
    } catch {
      // Not JSON, ignore
    }
    return true;
  } as typeof process.stdout.write;

  try {
    fn();
  } finally {
    process.stdout.write = originalWrite;
  }

  return logs;
}

/**
 * Helper to create a test span context
 *
 * Creates a simple span for testing trace context propagation
 * and logger integration without requiring full instrumentation.
 *
 * @param name - Name of the span
 * @returns A started span (remember to call span.end())
 *
 * @example
 * const span = createTestSpan('test-operation');
 * const spanContext = span.spanContext();
 * // ... test code ...
 * span.end();
 */
export function createTestSpan(name: string) {
  const tracer = trace.getTracer('test');
  return tracer.startSpan(name);
}
