/**
 * Tests for OpenTelemetry Context Propagation
 *
 * Verifies that trace context propagates correctly through async operations
 * and that inject/extract mechanisms work for distributed tracing.
 *
 * These tests follow TDD principles (RED-GREEN-REFACTOR):
 * - Write tests first to define expected behavior
 * - Run tests to verify they fail (RED)
 * - Implementation passes tests (GREEN)
 * - Refactor with confidence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { trace, context, propagation } from '@opentelemetry/api';
import { TestTelemetrySDK, createTestSpan } from './test-setup';

describe('Context Propagation', () => {
  let testSDK: TestTelemetrySDK;

  beforeEach(() => {
    testSDK = new TestTelemetrySDK();
  });

  afterEach(async () => {
    await testSDK.shutdown();
  });

  it('should propagate context through async operations', async () => {
    const parentSpan = createTestSpan('parent-operation');
    const parentContext = trace.setSpan(context.active(), parentSpan);

    await context.with(parentContext, async () => {
      const childSpan = createTestSpan('child-operation');
      childSpan.end();

      const activeSpan = trace.getActiveSpan();
      expect(activeSpan?.spanContext().traceId).toBe(parentSpan.spanContext().traceId);
    });

    parentSpan.end();

    const spans = testSDK.getSpans();
    expect(spans.length).toBe(2);
    expect(spans[0].spanContext().traceId).toBe(spans[1].spanContext().traceId);
  });

  it('should inject trace context into carrier', () => {
    const span = createTestSpan('test-operation');
    const spanContext = span.spanContext();
    const ctx = trace.setSpan(context.active(), span);

    const carrier: Record<string, string> = {};
    propagation.inject(ctx, carrier);

    expect(carrier).toHaveProperty('traceparent');
    expect(carrier.traceparent).toContain(spanContext.traceId);
    expect(carrier.traceparent).toContain(spanContext.spanId);

    span.end();
  });

  it('should extract trace context from carrier', () => {
    const span = createTestSpan('test-operation');
    const originalContext = trace.setSpan(context.active(), span);

    const carrier: Record<string, string> = {};
    propagation.inject(originalContext, carrier);

    const extractedContext = propagation.extract(context.active(), carrier);

    const extractedSpan = trace.getSpan(extractedContext);
    expect(extractedSpan?.spanContext().traceId).toBe(span.spanContext().traceId);

    span.end();
  });

  it('should maintain trace context across nested async functions', async () => {
    const rootSpan = createTestSpan('root-span');
    const rootContext = trace.setSpan(context.active(), rootSpan);

    await context.with(rootContext, async () => {
      async function level1() {
        const activeSpan = trace.getActiveSpan();
        expect(activeSpan?.spanContext().traceId).toBe(rootSpan.spanContext().traceId);

        await level2();
      }

      async function level2() {
        const activeSpan = trace.getActiveSpan();
        expect(activeSpan?.spanContext().traceId).toBe(rootSpan.spanContext().traceId);
      }

      await level1();
    });

    rootSpan.end();
  });

  it('should isolate context between concurrent operations', async () => {
    const span1 = createTestSpan('operation-1');
    const span2 = createTestSpan('operation-2');
    const ctx1 = trace.setSpan(context.active(), span1);
    const ctx2 = trace.setSpan(context.active(), span2);

    const operation1 = context.with(ctx1, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      const activeSpan = trace.getActiveSpan();
      expect(activeSpan?.spanContext().traceId).toBe(span1.spanContext().traceId);
    });

    const operation2 = context.with(ctx2, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      const activeSpan = trace.getActiveSpan();
      expect(activeSpan?.spanContext().traceId).toBe(span2.spanContext().traceId);
    });

    await Promise.all([operation1, operation2]);

    span1.end();
    span2.end();
  });
});
