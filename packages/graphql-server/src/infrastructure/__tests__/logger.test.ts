/**
 * Tests for Logger Trace Context Injection
 *
 * Verifies that the logger correctly injects OpenTelemetry trace context
 * (trace_id, span_id, trace_flags) into all log messages when a span is active.
 *
 * These tests follow TDD principles (RED-GREEN-REFACTOR):
 * - Write tests first to define expected behavior
 * - Run tests to verify they fail (RED)
 * - Implementation passes tests (GREEN)
 * - Refactor with confidence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logger, logGraphQLOperation } from '../logger';
import { trace, context } from '@opentelemetry/api';
import { TestTelemetrySDK, createTestSpan } from './test-setup';

describe('Logger - Trace Context Injection', () => {
  let testSDK: TestTelemetrySDK;

  beforeEach(() => {
    testSDK = new TestTelemetrySDK();
  });

  afterEach(async () => {
    await testSDK.shutdown();
  });

  it('should inject trace_id and span_id when span is active', () => {
    const span = createTestSpan('test-operation');
    const spanContext = span.spanContext();

    let logOutput: Record<string, unknown>;
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown) => {
      logOutput = JSON.parse(chunk!.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      context.with(trace.setSpan(context.active(), span), () => {
        logger.info({ userId: '123' }, 'Test message');
      });

      expect(logOutput!.trace_id).toBe(spanContext.traceId);
      expect(logOutput!.span_id).toBe(spanContext.spanId);
      expect(logOutput!.trace_flags).toBe(spanContext.traceFlags);
      expect(logOutput!.userId).toBe('123');
      expect(logOutput!.msg).toBe('Test message');
    } finally {
      process.stdout.write = originalWrite;
      span.end();
    }
  });

  it('should not fail when no span is active', () => {
    let logOutput: Record<string, unknown>;
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown) => {
      logOutput = JSON.parse(chunk!.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      logger.info({ userId: '123' }, 'Test message');

      expect(logOutput!.trace_id).toBeUndefined();
      expect(logOutput!.span_id).toBeUndefined();
      expect(logOutput!.userId).toBe('123');
      expect(logOutput!.msg).toBe('Test message');
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it('should include base context (app, service, env)', () => {
    let logOutput: Record<string, unknown>;
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown) => {
      logOutput = JSON.parse(chunk!.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      logger.info('Test message');

      expect(logOutput!.app).toBe('social-media-graphql');
      expect(logOutput!.service).toBe('graphql-server');
      expect(logOutput!.env).toBeDefined();
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it('should create child logger with inherited context', () => {
    const childLogger = logger.child({ requestId: 'req-123', userId: 'user-456' });

    let logOutput: Record<string, unknown>;
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown) => {
      logOutput = JSON.parse(chunk!.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      childLogger.info('Child log message');

      expect(logOutput!.requestId).toBe('req-123');
      expect(logOutput!.userId).toBe('user-456');
      expect(logOutput!.msg).toBe('Child log message');
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});

describe('Logger - Helper Functions', () => {
  it('logGraphQLOperation should format operation logs correctly', () => {
    let logOutput: Record<string, unknown>;
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown) => {
      logOutput = JSON.parse(chunk!.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      logGraphQLOperation('createPost', { postId: 'post-123' }, 'success', { duration: 45 });

      expect(logOutput!.type).toBe('graphql-operation');
      expect(logOutput!.operation).toBe('createPost');
      expect(logOutput!.variables).toEqual({ postId: 'post-123' });
      expect(logOutput!.result).toBe('success');
      expect(logOutput!.duration).toBe(45);
      expect(logOutput!.level).toBe('info');
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it('logGraphQLOperation should use error level for failures', () => {
    let logOutput: Record<string, unknown>;
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: unknown) => {
      logOutput = JSON.parse(chunk!.toString());
      return true;
    }) as typeof process.stdout.write;

    try {
      logGraphQLOperation('createPost', { postId: 'post-123' }, 'error');

      expect(logOutput!.level).toBe('error');
      expect(logOutput!.result).toBe('error');
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});
