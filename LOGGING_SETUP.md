# Logging & Observability Setup

This project uses **OpenTelemetry + Pino + SigNoz** for comprehensive logging and distributed tracing.

## Architecture

```
┌─────────────────────┐
│   Next.js App       │
│  (Port 3000)        │
│                     │
│  ├─ OTel SDK        │◄─ Auto-instruments HTTP, fetch, Next.js
│  ├─ Pino Logger     │◄─ Injects trace_id/span_id into logs
│  └─ File Output     │◄─ Writes to ./apps/web/logs/app.log
└──────────┬──────────┘
           │
           ├─── HTTP with trace headers (traceparent)
           │
           ▼
┌─────────────────────┐
│  GraphQL Server     │
│  (Lambda/Port 4000) │
│                     │
│  ├─ OTel SDK        │◄─ Auto-instruments GraphQL, DynamoDB, HTTP
│  ├─ Pino Logger     │◄─ Injects trace_id/span_id into logs
│  └─ Console Output  │◄─ Captured by CloudWatch in production
└──────────┬──────────┘
           │
           │
           ▼
┌─────────────────────┐
│     SigNoz          │
│  (Port 3301)        │
│                     │
│  ├─ OTLP Collector  │◄─ Receives traces/logs (ports 4317/4318)
│  ├─ ClickHouse DB   │◄─ Stores telemetry data
│  ├─ Query Service   │◄─ API for querying data
│  └─ Frontend UI     │◄─ Visualization dashboard
└─────────────────────┘
```

## Features

✅ **Structured JSON Logging** - All logs in consistent format
✅ **Automatic Trace Context** - Every log includes `trace_id` and `span_id`
✅ **Distributed Tracing** - Track requests across Next.js → GraphQL → DynamoDB
✅ **Log Correlation** - Click a log in SigNoz to see the full trace
✅ **File Output** - Logs written to files for backup/analysis
✅ **Performance** - <5ms overhead, async I/O
✅ **Visual Traces** - See request flow and timing in SigNoz UI

## Quick Start

### 1. Start SigNoz

```bash
# Start SigNoz containers (ClickHouse, OTLP Collector, Query Service, Frontend)
docker compose -f docker-compose.signoz.yml up -d

# Wait ~30 seconds for services to start
# Access SigNoz UI: http://localhost:3301
```

### 2. Configure Environment Variables

**Next.js App** (`apps/web/.env.local`):
```bash
# Copy example and customize
cp apps/web/.env.example apps/web/.env.local

# Key variables:
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=social-media-web
LOG_LEVEL=debug
```

**GraphQL Server** (`packages/graphql-server/.env`):
```bash
# Copy example and customize
cp packages/graphql-server/.env.example packages/graphql-server/.env

# Key variables:
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=social-media-graphql
LOG_LEVEL=debug
```

### 3. Start the Application

```bash
# Terminal 1: Start Next.js app
cd apps/web
pnpm dev

# Optional: Pretty-print logs in development
pnpm dev:pretty  # or: pnpm dev | pnpm exec pino-pretty

# Terminal 2: Start GraphQL server
cd packages/graphql-server
pnpm dev:server
```

### 4. Generate Some Traces

1. Open your app: http://localhost:3000
2. Register a new user or log in
3. Browse around, create posts, etc.

### 5. View Traces in SigNoz

1. Open SigNoz: http://localhost:3301
2. Go to **Traces** tab
3. You should see traces from `social-media-web` and `social-media-graphql`
4. Click on a trace to see the full request flow
5. Click **View Logs** to see all logs for that trace

## Log Files

### Next.js App

Logs are written to: `apps/web/logs/app.log`

```bash
# View recent logs
tail -f apps/web/logs/app.log

# Pretty-print log file
cat apps/web/logs/app.log | pnpm exec pino-pretty

# Search for specific trace
grep "trace_id\":\"abc123" apps/web/logs/app.log | pnpm exec pino-pretty

# Count errors
grep '"level":"error"' apps/web/logs/app.log | wc -l
```

### GraphQL Server

In development, logs go to console (stdout).
In production (Lambda), logs are captured by CloudWatch.

```bash
# View GraphQL server logs (development)
cd packages/graphql-server
pnpm dev:server | pnpm exec pino-pretty
```

## Log Format

All logs are structured JSON with automatic trace context:

```json
{
  "level": "info",
  "time": 1732032451234,
  "env": "development",
  "app": "social-media-web",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_flags": 1,
  "msg": "User logged in successfully",
  "userId": "user-123",
  "email": "user@example.com"
}
```

### Key Fields

- `trace_id` - Unique ID for the entire request (shared across services)
- `span_id` - Unique ID for this specific operation
- `trace_flags` - Sampling decision (1 = sampled, 0 = not sampled)
- `level` - Log level: debug, info, warn, error, fatal
- `msg` - Human-readable message
- Additional fields - Context-specific metadata

## Usage Examples

### Server-Side (Next.js API Routes, Pages)

```typescript
import { logger } from '@/lib/logger';

// Simple logging
logger.info('User registration started');

// Structured logging with context
logger.info({ userId: '123', email: 'user@example.com' }, 'User registered successfully');

// Error logging
try {
  await riskyOperation();
} catch (error) {
  logger.error({ error }, 'Operation failed');
}

// Child logger with inherited context
const userLogger = logger.child({ userId: '123', module: 'auth' });
userLogger.info('Checking permissions');
userLogger.info('Access granted');
```

### GraphQL Server

```typescript
import { logger, logGraphQLOperation, logResolver } from './infrastructure/logger';

// In resolver
export const userResolver = async (parent, args, context) => {
  const resolverLogger = logger.child({
    resolver: 'getUser',
    userId: args.id
  });

  resolverLogger.debug('Fetching user from database');

  const user = await context.dataSources.userService.findById(args.id);

  if (!user) {
    resolverLogger.warn('User not found');
    throw new Error('User not found');
  }

  resolverLogger.info('User fetched successfully');
  return user;
};
```

## Trace Correlation

### Find All Logs for a Trace

```bash
# Get trace_id from SigNoz or any log entry
TRACE_ID="4bf92f3577b34da6a3ce929d0e0e4736"

# Search Next.js logs
grep "trace_id\":\"$TRACE_ID" apps/web/logs/app.log | pnpm exec pino-pretty

# In SigNoz: Traces → Click trace → View Logs (automatic!)
```

### End-to-End Flow

1. User clicks "Register" in browser
2. Next.js API route receives request → **Trace ID created** (e.g., `abc123`)
3. Next.js logs: "Registration request received" with `trace_id: abc123`
4. Next.js calls GraphQL server with `traceparent` header
5. GraphQL server extracts trace ID from header → **Same trace ID!**
6. GraphQL logs: "Creating user" with `trace_id: abc123`
7. DynamoDB query traced with `trace_id: abc123`
8. All logs and spans visible in SigNoz under one trace

## Troubleshooting

### Trace IDs Not Showing Up

**Symptom**: Logs missing `trace_id` and `span_id` fields

**Solutions**:
1. Verify instrumentation is running:
   ```bash
   # Should see this on startup:
   [OpenTelemetry] Instrumentation registered for social-media-web
   ```

2. Check that you're logging inside an active span (request context):
   - ✅ API routes, pages, middleware - automatic
   - ❌ Module-level code (runs at import time) - no active span

3. For GraphQL server, ensure instrumentation is imported first:
   ```typescript
   // lambda.ts - MUST be first import!
   import './infrastructure/instrumentation.js';
   ```

### Traces Not Appearing in SigNoz

**Symptom**: Application logs show trace IDs, but nothing in SigNoz UI

**Solutions**:
1. Check SigNoz is running:
   ```bash
   docker ps | grep signoz
   # Should see 4 containers: clickhouse, otel-collector, query-service, frontend
   ```

2. Check OTLP endpoint is reachable:
   ```bash
   curl http://localhost:4318/v1/traces
   # Should return HTTP 405 (method not allowed) - means it's listening
   ```

3. Verify environment variables:
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   # Should output: http://localhost:4318/v1/traces
   ```

4. Check OTel Collector logs:
   ```bash
   docker logs signoz-otel-collector
   # Look for "Traces receiver is starting" and no errors
   ```

### Log Files Not Created

**Symptom**: `apps/web/logs/app.log` doesn't exist

**Solutions**:
1. Ensure the Next.js server is running (not just build)
2. Check directory permissions:
   ```bash
   ls -la apps/web/logs/
   # Should be writable
   ```

3. Trigger a log:
   ```bash
   # Hit any API route, e.g., visit http://localhost:3000/api/auth/register
   ```

### Performance Issues

**Symptom**: Application feels slow after adding logging

**Solutions**:
1. Pino is extremely fast (<5ms overhead), but check log level:
   ```bash
   # In production, use 'info' or 'warn'
   LOG_LEVEL=info  # Not 'debug' or 'trace'
   ```

2. Reduce sampling rate in production (instrumentation.ts):
   ```typescript
   sampler: traceIdRatioBased(0.1),  // Sample 10% of requests
   ```

## Production Considerations

### Next.js App (Vercel/etc.)

1. **Set environment variables** in deployment platform:
   ```
   OTEL_EXPORTER_OTLP_ENDPOINT=https://your-signoz-instance.com/v1/traces
   LOG_LEVEL=info
   ```

2. **File logging**: Won't work on serverless (ephemeral filesystem)
   - Remove file transport for serverless deployments
   - Or use cloud storage (S3) with a custom transport

3. **Sampling**: Enable to reduce costs:
   ```typescript
   // instrumentation.node.ts
   import { traceIdRatioBased } from '@opentelemetry/sdk-trace-base';

   const sdk = new NodeSDK({
     sampler: traceIdRatioBased(0.1), // 10% sampling
   });
   ```

### GraphQL Server (AWS Lambda)

1. **CloudWatch Logs**: Logs automatically captured (JSON format perfect for CloudWatch Insights)

2. **Cold starts**: OTel adds ~100-200ms to cold start (acceptable)

3. **X-Ray Alternative**: Can also use AWS X-Ray instead of SigNoz:
   ```typescript
   // Use AWS X-Ray exporter
   import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
   ```

## Advanced Configuration

### Custom Sampling

```typescript
// Only trace errors and slow requests
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});
```

### Log Redaction

```typescript
// Automatically redact sensitive fields
import pino from 'pino';

const logger = pino({
  redact: {
    paths: ['password', 'email', 'ssn', '*.password'],
    censor: '[REDACTED]'
  }
});
```

### Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

const span = tracer.startSpan('expensive-operation');
try {
  await expensiveOperation();
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  throw error;
} finally {
  span.end();
}
```

## Resources

- [OpenTelemetry JavaScript Docs](https://opentelemetry.io/docs/languages/js/)
- [Pino Logger Documentation](https://getpino.io/)
- [SigNoz Documentation](https://signoz.io/docs/)
- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry)

## Support

If you encounter issues:
1. Check this README's Troubleshooting section
2. Review logs for error messages
3. Check SigNoz documentation
4. Open an issue in the project repository
