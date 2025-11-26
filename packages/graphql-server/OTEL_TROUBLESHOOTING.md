# OpenTelemetry Troubleshooting Guide

**GraphQL Server** | OpenTelemetry Implementation

This guide covers common issues, diagnostic steps, and solutions for OpenTelemetry instrumentation in the GraphQL server.

---

## Table of Contents

1. [Spans Not Appearing](#spans-not-appearing)
2. [Missing Trace Context in Logs](#missing-trace-context-in-logs)
3. [Lambda Cold Start Performance](#lambda-cold-start-performance)
4. [Context Propagation Issues](#context-propagation-issues)
5. [Duplicate AWS SDK Instrumentation](#duplicate-aws-sdk-instrumentation)
6. [Test Environment Issues](#test-environment-issues)
7. [Performance Degradation](#performance-degradation)

---

## Spans Not Appearing

### Symptoms
- Telemetry data not reaching collector/backend
- Missing traces in SigNoz/Jaeger
- No spans exported despite instrumentation

### Diagnostic Steps

1. **Check SDK Initialization**
   ```bash
   # Look for initialization log
   grep "OpenTelemetry SDK started successfully" logs/graphql.log
   ```

2. **Verify OTLP Endpoint**
   ```bash
   # Check environment variable
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   # Should output: http://localhost:4318/v1/traces (or your collector URL)
   ```

3. **Test Collector Connectivity**
   ```bash
   curl -X POST http://localhost:4318/v1/traces \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
   # Should return 200 OK
   ```

### Solutions

**Solution 1: Fix OTLP Endpoint Configuration**
```bash
# Set correct endpoint in .env or environment
export OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318/v1/traces
```

**Solution 2: Verify Collector is Running**
```bash
# Check collector status
docker ps | grep otel-collector
# Or for local development
lsof -i :4318
```

**Solution 3: Lambda Span Loss**

Lambda containers may freeze with buffered spans. Ensure SimpleSpanProcessor is used:

```typescript
// instrumentation.ts - Already implemented
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const sdk = new NodeSDK({
  spanProcessor: isLambda ? new SimpleSpanProcessor(traceExporter) : undefined,
});
```

---

## Missing Trace Context in Logs

### Symptoms
- Logs don't contain `trace_id` or `span_id`
- Unable to correlate logs with traces
- Missing trace context fields

### Diagnostic Steps

1. **Check Logger Configuration**
   ```typescript
   // Verify logger has trace context mixin
   import { logger } from './infrastructure/logger.js';
   logger.info('Test log');
   // Should output JSON with trace_id, span_id when span is active
   ```

2. **Verify Active Span**
   ```typescript
   import { trace } from '@opentelemetry/api';
   const activeSpan = trace.getActiveSpan();
   console.log('Active span:', activeSpan?.spanContext());
   ```

### Solutions

**Solution 1: Ensure Span is Active**
```typescript
import { trace, context } from '@opentelemetry/api';

// Create span and set as active
const tracer = trace.getTracer('my-service');
const span = tracer.startSpan('my-operation');

// Execute within span context
context.with(trace.setSpan(context.active(), span), () => {
  logger.info('This log will have trace context');
  // Your code here
});

span.end();
```

**Solution 2: Check Logger Mixin**

The logger should automatically inject trace context via mixin (already implemented in `logger.ts`):

```typescript
// This is already configured, but verify mixin is working
const loggerConfig = {
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const spanContext = span.spanContext();
    return {
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
      trace_flags: spanContext.traceFlags,
    };
  },
};
```

---

## Lambda Cold Start Performance

### Symptoms
- Slow Lambda cold starts (>1s initialization)
- Increased Lambda costs
- Timeout errors during cold start

### Diagnostic Steps

1. **Measure Initialization Time**
   ```typescript
   const startTime = Date.now();
   // ... initialization code ...
   const duration = Date.now() - startTime;
   logger.info({ duration }, 'Initialization complete');
   ```

2. **Check Span Processor**
   ```bash
   # Verify SimpleSpanProcessor is used in Lambda
   grep "SimpleSpanProcessor" logs/graphql.log
   ```

### Solutions

**Solution 1: Use SimpleSpanProcessor in Lambda** (Already Implemented)

```typescript
// instrumentation.ts - Already configured
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const sdk = new NodeSDK({
  spanProcessor: isLambda
    ? new SimpleSpanProcessor(traceExporter)  // Immediate export
    : undefined,  // BatchSpanProcessor (default)
});
```

**Benefits**:
- 10-20ms faster cold starts
- No span loss on container freeze
- Immediate export, no buffering

**Solution 2: Lazy Load Heavy Dependencies**

```typescript
// Load heavy instrumentation only when needed
const instrumentations = [
  getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },  // Skip if not needed
  }),
];
```

---

## Context Propagation Issues

### Symptoms
- Trace context lost across async operations
- Separate traces instead of single distributed trace
- Child spans don't inherit parent trace ID

### Diagnostic Steps

1. **Verify Context Propagation**
   ```typescript
   import { trace, context } from '@opentelemetry/api';

   const parentSpan = trace.getActiveSpan();
   console.log('Parent trace ID:', parentSpan?.spanContext().traceId);

   await someAsyncOperation();

   const childSpan = trace.getActiveSpan();
   console.log('Child trace ID:', childSpan?.spanContext().traceId);
   // Should match parent trace ID
   ```

2. **Check W3C Trace Context Headers**
   ```bash
   # In HTTP requests, verify traceparent header
   curl -i http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{ __typename }"}' | grep traceparent
   ```

### Solutions

**Solution 1: Wrap Async Operations with Context**

```typescript
import { context, trace } from '@opentelemetry/api';

async function myAsyncOperation() {
  const span = trace.getActiveSpan();
  if (!span) {
    logger.warn('No active span in async operation');
    return;
  }

  // Context is automatically propagated through async/await
  await doWork();
}
```

**Solution 2: Manual Context Propagation for Event Handlers**

```typescript
import { context, trace } from '@opentelemetry/api';

eventEmitter.on('event', (data) => {
  // Create new span for event handling
  const tracer = trace.getTracer('my-service');
  const span = tracer.startSpan('handle-event');

  context.with(trace.setSpan(context.active(), span), async () => {
    await handleEvent(data);
    span.end();
  });
});
```

---

## Duplicate AWS SDK Instrumentation

### Symptoms
- Multiple identical spans for AWS SDK calls
- Doubled trace data volume
- Confusing trace visualization

### Diagnostic Steps

1. **Check Instrumentation Configuration**
   ```bash
   grep "aws-sdk" src/infrastructure/instrumentation.ts
   ```

2. **Look for Duplicate Spans**
   - Check SigNoz/Jaeger for duplicate DynamoDB/S3 spans
   - Same operation appearing twice with identical timing

### Solutions

**Solution: Disable AWS SDK in Auto-Instrumentations** (Already Fixed)

```typescript
// instrumentation.ts - Already corrected
instrumentations: [
  getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-aws-sdk': {
      enabled: false,  // ✅ Disabled in auto-instrumentations
    },
  }),

  // Manual AWS SDK instrumentation with custom config
  new AwsInstrumentation({
    suppressInternalInstrumentation: true,
    sqsExtractContextPropagationFromPayload: true,
  }),
]
```

---

## Test Environment Issues

### Symptoms
- Tests failing with OpenTelemetry errors
- "Cannot find module '@opentelemetry/sdk-trace-node'"
- Logger not capturing output in tests

### Diagnostic Steps

1. **Check Test Environment Setup**
   ```bash
   NODE_ENV=test pnpm test
   ```

2. **Verify Logger Test Mode**
   ```typescript
   // Logger should write to stdout in test mode
   console.log('NODE_ENV:', process.env.NODE_ENV);
   ```

### Solutions

**Solution 1: Logger Test Mode** (Already Implemented)

```typescript
// logger.ts - Already configured
const isTest = graphqlEnv.NODE_ENV === 'test';
if (isTest) {
  // Write to stdout for test capture
  logStreams = undefined;
} else if (isDevelopment) {
  // Write to rotating file
  logStreams = [{ level: graphqlEnv.LOG_LEVEL, stream: rotatingStream }];
}
```

**Solution 2: Simplified Test Setup** (Already Implemented)

```typescript
// test-setup.ts - Uses only @opentelemetry/api
import { trace } from '@opentelemetry/api';

export function createTestSpan(name: string) {
  const tracer = trace.getTracer('test');
  return tracer.startSpan(name);
}
```

**Solution 3: Vitest Configuration** (Already Implemented)

```typescript
// vitest.config.ts - Inline OpenTelemetry packages
export default defineConfig({
  server: {
    deps: {
      inline: [
        '@opentelemetry/sdk-trace-node',
        '@opentelemetry/sdk-trace-base',
      ],
    },
  },
});
```

---

## Performance Degradation

### Symptoms
- Increased response times after enabling OpenTelemetry
- High CPU usage
- Slow resolver execution

### Diagnostic Steps

1. **Measure Overhead**
   ```typescript
   const start = performance.now();
   // ... your code ...
   const duration = performance.now() - start;
   logger.info({ duration }, 'Operation timing');
   ```

2. **Check Span Volume**
   ```bash
   # Count spans being created
   grep "span.end()" logs/graphql.log | wc -l
   ```

### Solutions

**Solution 1: Reduce Span Volume**

```typescript
// Only trace root-level resolvers (already configured in pothos builder)
tracing: {
  default: (config) => isRootField(config),  // Skip nested resolvers
}
```

**Solution 2: Use Sampling**

```typescript
// Add sampling to reduce trace volume in production
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  sampler: process.env.NODE_ENV === 'production'
    ? new TraceIdRatioBasedSampler(0.1)  // Sample 10% of traces
    : undefined,  // 100% sampling in dev/test
});
```

**Solution 3: Optimize Resolver Instrumentation**

```typescript
// Skip expensive nested resolvers
tracing: {
  default: (config) => {
    // Only trace queries/mutations, skip nested fields
    return config.parentType === 'Query' || config.parentType === 'Mutation';
  },
}
```

---

## Quick Reference: Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OTEL_SERVICE_NAME` | `social-media-graphql` | Service name in traces |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | Collector endpoint |
| `NODE_ENV` | `development` | Environment detection |
| `AWS_LAMBDA_FUNCTION_NAME` | (unset) | Lambda detection |
| `LOG_LEVEL` | `info` | Logging verbosity |

---

## Quick Reference: Common Commands

```bash
# Check OpenTelemetry SDK status
grep "OpenTelemetry" logs/graphql.log

# Test collector connectivity
curl http://localhost:4318/v1/traces

# Run tests with OpenTelemetry
NODE_ENV=test pnpm test

# Check for duplicate instrumentation
grep -n "AwsInstrumentation" src/infrastructure/instrumentation.ts

# Verify span processor in Lambda
grep "SimpleSpanProcessor\|BatchSpanProcessor" logs/graphql.log
```

---

## Additional Resources

- **OpenTelemetry Docs**: https://opentelemetry.io/docs/
- **Node.js SDK**: https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/
- **GraphQL Instrumentation**: https://www.npmjs.com/package/@opentelemetry/instrumentation-graphql
- **AWS Instrumentation**: https://www.npmjs.com/package/@opentelemetry/instrumentation-aws-sdk

---

## Getting Help

If issues persist after trying these solutions:

1. **Enable Debug Logging**
   ```bash
   export OTEL_LOG_LEVEL=debug
   export LOG_LEVEL=debug
   ```

2. **Check Instrumentation Documentation**
   - See `OTEL_IMPROVEMENT_PLAN.md` for architecture details
   - See `OTEL_PHASE_1_COMPLETE.md` for test coverage
   - See `OTEL_PHASE_2_COMPLETE.md` for implemented fixes

3. **Review Test Output**
   ```bash
   pnpm test src/infrastructure/__tests__ --run
   ```

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0
**Maintainer**: GraphQL Server Team
