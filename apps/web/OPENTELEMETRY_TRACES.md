# OpenTelemetry Distributed Tracing

**Status:** ✅ Enabled
**Phase:** 1 - Trace Context in Logs

---

## What This Does

Every log message now automatically includes:
- **`trace_id`** - Unique identifier for the entire request (shared across all services)
- **`span_id`** - Unique identifier for the specific operation
- **`trace_flags`** - Sampling decision flags

This allows you to **grep for a trace ID** and see the complete flow of a request through your entire stack.

---

## How It Works

### 1. Automatic Trace Context

The Pino logger automatically injects OpenTelemetry trace context into every log:

```typescript
// You write:
logger.info({ postId: '123' }, 'Liking post');

// What gets logged:
{
  "level": "info",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_flags": 1,
  "postId": "123",
  "msg": "Liking post"
}
```

### 2. Trace Propagation

OpenTelemetry automatically propagates traces through:
- **HTTP requests** (Next.js → GraphQL server)
- **Server Actions**
- **API routes**
- **Fetch calls**

The `trace_id` stays the same across all logs for a single user request.

---

## Usage Examples

### Example 1: Debug a Like Button Issue

**Scenario:** User clicks like, but count flashes 0→1→0

**Step 1:** Check the logs for the likePost action
```bash
# Look at recent logs
tail -n 100 logs/app.log | grep "likePost"
```

**Step 2:** Find the trace_id from a log entry
```json
{
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "msg": "Server Action likePost started"
}
```

**Step 3:** Grep for that trace_id to see the entire flow
```bash
grep "4bf92f3577b34da6a3ce929d0e0e4736" logs/*.log
```

**What you'll see:**
```json
{"trace_id":"4bf92...","msg":"Server Action likePost started","postId":"post-123"}
{"trace_id":"4bf92...","msg":"Calling GraphQL mutation","operation":"likePost"}
{"trace_id":"4bf92...","msg":"GraphQL mutation likePost","postId":"post-123"}
{"trace_id":"4bf92...","msg":"DynamoDB GetItem","table":"posts","key":"POST#post-123"}
{"trace_id":"4bf92...","msg":"DynamoDB returned","likesCount":2,"isLiked":false}
{"trace_id":"4bf92...","msg":"DynamoDB PutItem","table":"likes","item":"LIKE#..."}
{"trace_id":"4bf92...","msg":"GraphQL response","likesCount":3,"isLiked":true}
{"trace_id":"4bf92...","msg":"Server Action completed","success":true}
```

Now you can see **exactly** what happened at each layer!

---

### Example 2: Track Post Creation Flow

**Scenario:** User uploads image, want to see entire flow

```bash
# Search for trace by postId
grep "postId\":\"new-post-456" logs/app.log | head -1 | jq -r '.trace_id'
# Returns: abc123def456...

# See complete flow
grep "abc123def456" logs/app.log | jq -r '[.time, .msg, .service] | @tsv'
```

**Output:**
```
2025-11-17T10:30:00Z  CreatePost action started     social-media-web
2025-11-17T10:30:01Z  Generating thumbnail          social-media-web
2025-11-17T10:30:02Z  Calling GraphQL createPost    social-media-web
2025-11-17T10:30:03Z  GraphQL mutation createPost   social-media-graphql
2025-11-17T10:30:04Z  Generating presigned S3 URLs  social-media-graphql
2025-11-17T10:30:05Z  S3 upload started             social-media-web
2025-11-17T10:30:08Z  S3 upload completed           social-media-web
2025-11-17T10:30:09Z  Post created successfully     social-media-web
```

---

## Development Workflow

### Pretty Logs in Terminal

```bash
# Option 1: Pipe to pino-pretty
pnpm dev:web 2>&1 | pnpm exec pino-pretty

# Option 2: Use the dev:pretty script
pnpm --filter @social-media-app/web dev:pretty
```

**Example pretty output:**
```
[1700000000000] INFO (social-media-web): Server Action likePost started
  trace_id: "4bf92f3577b34da6a3ce929d0e0e4736"
  span_id: "00f067aa0ba902b7"
  postId: "post-123"
```

### JSON Logs (Production)

In production, logs are JSON by default - perfect for log aggregation:

```json
{
  "level": 30,
  "time": 1700000000000,
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "env": "production",
  "app": "social-media-web",
  "postId": "post-123",
  "msg": "Server Action likePost started"
}
```

---

## Grep Cheatsheet

### Find all logs for a trace
```bash
grep "trace_id\":\"4bf92f3577b34da6a3ce929d0e0e4736" logs/*.log
```

### Find trace ID for a specific user action
```bash
grep "userId\":\"user-456" logs/app.log | jq -r '.trace_id' | head -1
```

### Count how many operations happened in a trace
```bash
grep "trace_id\":\"abc123" logs/app.log | wc -l
```

### See timing of each operation
```bash
grep "trace_id\":\"abc123" logs/app.log | jq -r '[.time, .msg] | @tsv'
```

### Filter by service
```bash
grep "trace_id\":\"abc123" logs/app.log | grep "social-media-graphql"
```

---

## Next Steps (Future Phases)

### Phase 2: Visual Trace Viewer (Optional)

Install a trace viewer like Jaeger or SigNoz to see flamegraphs:

```
likePost (Next.js)        [============45ms=============]
  └─ GraphQL mutation     [=====30ms=====]
      └─ DynamoDB GetItem [==10ms==]
      └─ DynamoDB PutItem [==15ms==]
```

### Phase 3: Add GraphQL Server Tracing

Extend traces to the GraphQL server so you can see:
- Database query timing
- Resolver performance
- DataLoader batching

### Phase 4: Add Custom Spans

Add custom spans for critical operations:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('social-media-web');
const span = tracer.startSpan('generate-thumbnail');

try {
  const thumbnail = await generateThumbnail(file);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  throw error;
} finally {
  span.end();
}
```

---

## Troubleshooting

### No trace_id in logs

**Cause:** Instrumentation not loaded

**Fix:**
```bash
# Verify instrumentation.ts exists
ls apps/web/instrumentation.ts

# Check server startup logs
pnpm dev:web
# Should see: [OpenTelemetry] Instrumentation registered for social-media-web
```

### Different trace_id for same request

**Cause:** Trace context not propagating

**Fix:** Ensure you're using Next.js 15's built-in fetch (automatic trace propagation)

### Logs missing in production

**Cause:** Log level too high

**Fix:** Set `LOG_LEVEL=debug` environment variable

---

## Technical Details

### Implementation

- **Library:** `@vercel/otel` + `@opentelemetry/api`
- **Instrumentation:** `apps/web/instrumentation.ts` (auto-loaded by Next.js)
- **Logger Integration:** Pino mixin in `apps/web/lib/logger.ts`

### Trace Format

- **trace_id:** 32-character hex string (128-bit)
- **span_id:** 16-character hex string (64-bit)
- **trace_flags:** 1 byte (sampling decision)

### Environment Variables

```bash
# Set log level (default: info in prod, debug in dev)
LOG_LEVEL=debug

# Export traces to external service (future)
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-trace-collector.com
```

---

**Implemented:** 2025-11-17
**Phase:** 1 - Trace Context in Logs
**Next Phase:** Add GraphQL server tracing
