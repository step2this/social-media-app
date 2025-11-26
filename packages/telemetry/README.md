# @social-media-app/telemetry

**Shared OpenTelemetry infrastructure for distributed tracing and observability**

Provides consistent OpenTelemetry configuration, initialization, and utilities across all packages (Next.js, GraphQL Server, and DAL) in the social-media-app monorepo.

## Features

- ✅ **Zero-config initialization** with sensible defaults
- ✅ **Multi-context support** (Node.js, Next.js, AWS Lambda)
- ✅ **Domain-specific span factories** (DynamoDB, Cache, Kinesis, Services)
- ✅ **Automatic environment detection** (Lambda, Kubernetes, containers)
- ✅ **Lambda-optimized** with SimpleSpanProcessor for immediate export
- ✅ **Type-safe** with full TypeScript support
- ✅ **Production-ready** with comprehensive instrumentation

## Installation

```bash
# From monorepo root
pnpm add @social-media-app/telemetry --filter=your-package
```

## Quick Start

### GraphQL Server (Standalone Node.js)

```typescript
// src/infrastructure/instrumentation.ts
import { initializeNodeSDK } from '@social-media-app/telemetry';

const { sdk, shutdown } = initializeNodeSDK({
  serviceName: 'social-media-graphql',
  serviceVersion: '1.0.0',
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});
```

### Next.js Application

```typescript
// instrumentation.node.ts
import { initializeNextJS } from '@social-media-app/telemetry';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initializeNextJS({
      serviceName: 'social-media-web',
    });
  }
}
```

### AWS Lambda Function

```typescript
// src/infrastructure/instrumentation.ts
import { initializeLambda } from '@social-media-app/telemetry';

// Initialize once outside the handler
const { sdk } = initializeLambda({
  serviceName: 'social-media-graphql',
});

export const handler = async (event: any) => {
  // Your Lambda handler code
  // Spans will be exported immediately with SimpleSpanProcessor
};
```

### DAL (Library Usage)

```typescript
// src/services/post.service.ts
import {
  createTracer,
  createDynamoDBSpan,
  withSpan,
} from '@social-media-app/telemetry';

const tracer = createTracer('social-media-dal', '1.0.0');

export async function getPost(postId: string) {
  const span = createDynamoDBSpan(tracer, 'get', {
    tableName: 'Posts',
  });

  return withSpan(span, async (span) => {
    span.setAttribute('post.id', postId);
    const result = await dynamodb.get({
      TableName: 'Posts',
      Key: { postId },
    });
    return result.Item;
  });
}
```

## Configuration

### Environment Variables

All configuration can be overridden via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_SERVICE_NAME` | (required) | Service name for traces |
| `OTEL_SERVICE_VERSION` | `1.0.0` | Service version |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | OTLP collector endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | `""` | HTTP headers (format: `key1=value1,key2=value2`) |
| `OTEL_LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV` | `development` | Environment (`development`, `staging`, `production`) |
| `AWS_LAMBDA_FUNCTION_NAME` | (auto-detected) | Lambda function name (auto-detected) |

### Configuration Hierarchy

1. **Environment variables** (highest priority)
2. **User config object**
3. **Default values** (lowest priority)

Example with explicit configuration:

```typescript
import { initializeNodeSDK } from '@social-media-app/telemetry';

const { sdk, shutdown } = initializeNodeSDK({
  serviceName: 'my-service',
  serviceVersion: '2.0.0',
  environment: 'staging',
  otlpEndpoint: 'https://collector.example.com:4318/v1/traces',
  otlpHeaders: {
    authorization: 'Bearer token123',
  },
  enableConsoleExporter: false,
  disableAutoInstrumentation: false,
});
```

## API Reference

### Initialization Functions

#### `initializeNodeSDK(config)`

Initialize OpenTelemetry SDK for standalone Node.js applications.

**Parameters**:
- `config: TelemetryConfig` - Configuration object

**Returns**: `{ sdk: NodeSDK, shutdown: () => Promise<void> }`

**Features**:
- Auto-instrumentation for HTTP, GraphQL, AWS SDK
- BatchSpanProcessor (default, efficient batching)
- SIGTERM handler for graceful shutdown

#### `initializeNextJS(config)`

Initialize OpenTelemetry for Next.js applications using `@vercel/otel`.

**Parameters**:
- `config: TelemetryConfig` - Configuration object

**Features**:
- Next.js-specific instrumentation
- Edge runtime compatibility
- Automatic Vercel integration

#### `initializeLambda(config)`

Initialize OpenTelemetry for AWS Lambda functions with optimizations.

**Parameters**:
- `config: TelemetryConfig` - Configuration object

**Returns**: `{ sdk: NodeSDK }`

**Features**:
- SimpleSpanProcessor (immediate export, no buffering)
- No SIGTERM handler (AWS manages lifecycle)
- Prevents span loss on container freeze

### Span Creation Utilities

#### `createTracer(name, version?)`

Create or get a tracer for a service.

```typescript
const tracer = createTracer('social-media-dal', '1.0.0');
```

#### `createDynamoDBSpan(tracer, operation, options)`

Create a DynamoDB operation span with semantic conventions.

```typescript
const span = createDynamoDBSpan(tracer, 'query', {
  tableName: 'Users',
  indexName: 'GSI1',
  itemCount: 10,
});
```

#### `createCacheSpan(tracer, operation, options)`

Create a cache operation span.

```typescript
const span = createCacheSpan(tracer, 'get', {
  key: 'user:123',
  hit: true,
  ttl: 3600,
});
```

#### `createKinesisSpan(tracer, operation, options)`

Create a Kinesis publish span.

```typescript
const span = createKinesisSpan(tracer, 'publish', {
  streamName: 'events',
  partitionKey: 'user-123',
});
```

#### `createServiceSpan(tracer, options)`

Create a generic service operation span.

```typescript
const span = createServiceSpan(tracer, {
  serviceName: 'AuthService',
  operation: 'login',
  userId: 'user-123',
});
```

### Span Lifecycle Helpers

#### `withSpan(span, executor)`

Execute an async function within a span with automatic lifecycle management.

```typescript
const result = await withSpan(span, async (span) => {
  span.setAttribute('custom.attr', 'value');
  return await doWork();
});
// Span automatically ended and errors recorded
```

#### `withSpanSync(span, executor)`

Execute a synchronous function within a span with automatic lifecycle management.

```typescript
const result = withSpanSync(span, (span) => {
  span.setAttribute('custom.attr', 'value');
  return processData();
});
// Span automatically ended and errors recorded
```

### Context Propagation

#### `getActiveSpanContext()`

Get the active span context from the current context.

```typescript
const spanContext = getActiveSpanContext();
if (spanContext) {
  console.log('Trace ID:', spanContext.traceId);
  console.log('Span ID:', spanContext.spanId);
}
```

#### `injectContext(carrier, ctx?)`

Inject trace context into a carrier for distributed tracing.

```typescript
// HTTP request
const headers: Record<string, string> = {};
injectContext(headers);
await fetch(url, { headers });

// Kinesis message
const messageAttributes: Record<string, string> = {};
injectContext(messageAttributes);
await kinesis.putRecord({ Data: payload, MessageAttributes: messageAttributes });
```

#### `extractContext(carrier)`

Extract trace context from a carrier for distributed tracing.

```typescript
// HTTP request handler
const extractedContext = extractContext(request.headers);
await withContext(extractedContext, async () => {
  await handleRequest(request);
});
```

### Attribute Helpers

#### `setUserAttributes(span, userId, additionalAttrs?)`

Set user-related attributes on a span.

```typescript
setUserAttributes(span, 'user-123', {
  'user.email': 'user@example.com',
  'user.role': 'admin',
});
```

#### `setDatabaseAttributes(span, system, operation, additionalAttrs?)`

Set database operation attributes on a span.

```typescript
setDatabaseAttributes(span, 'dynamodb', 'query', {
  'db.table': 'Users',
  'db.item.count': 10,
});
```

#### `setErrorAttributes(span, error, additionalAttrs?)`

Set error attributes on a span.

```typescript
try {
  await riskyOperation();
} catch (error) {
  setErrorAttributes(span, error, {
    'error.handled': true,
    'error.retry_count': 3,
  });
  throw error;
}
```

## Usage Examples

### DynamoDB Query with Tracing

```typescript
import { createTracer, createDynamoDBSpan, withSpan } from '@social-media-app/telemetry';

const tracer = createTracer('social-media-dal', '1.0.0');

export async function queryUserPosts(userId: string) {
  const span = createDynamoDBSpan(tracer, 'query', {
    tableName: 'Posts',
    indexName: 'GSI1-UserId',
  });

  return withSpan(span, async (span) => {
    span.setAttribute('user.id', userId);
    
    const result = await dynamodb.query({
      TableName: 'Posts',
      IndexName: 'GSI1-UserId',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    span.setAttribute('db.item.count', result.Items?.length || 0);
    return result.Items;
  });
}
```

### Cache Operation with Tracing

```typescript
import { createTracer, createCacheSpan, withSpan } from '@social-media-app/telemetry';

const tracer = createTracer('social-media-dal', '1.0.0');

export async function getCachedUser(userId: string) {
  const cacheKey = `user:${userId}`;
  const span = createCacheSpan(tracer, 'get', { key: cacheKey });

  return withSpan(span, async (span) => {
    const cached = await redis.get(cacheKey);
    span.setAttribute('cache.hit', !!cached);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - fetch from database
    const user = await getUserFromDB(userId);
    await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
    span.setAttribute('cache.ttl', 3600);
    
    return user;
  });
}
```

### Distributed Tracing Across Services

```typescript
import { 
  createTracer, 
  createServiceSpan, 
  withSpan,
  injectContext,
  extractContext,
  withContext,
} from '@social-media-app/telemetry';

const tracer = createTracer('social-media-graphql', '1.0.0');

// Service A: Making a request
export async function callServiceB(data: any) {
  const span = createServiceSpan(tracer, {
    serviceName: 'ServiceA',
    operation: 'callServiceB',
  });

  return withSpan(span, async () => {
    // Inject trace context into HTTP headers
    const headers: Record<string, string> = {};
    injectContext(headers);

    const response = await fetch('https://service-b.com/api', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    return response.json();
  });
}

// Service B: Receiving the request
export async function handleRequest(request: Request) {
  // Extract trace context from headers
  const extractedContext = extractContext(request.headers);

  // Continue trace in extracted context
  return withContext(extractedContext, async () => {
    const span = createServiceSpan(tracer, {
      serviceName: 'ServiceB',
      operation: 'handleRequest',
    });

    return withSpan(span, async () => {
      // Process request within the trace context
      return await processRequest(request);
    });
  });
}
```

## Migration Guide

### From GraphQL Server Direct Instrumentation

**Before** (`packages/graphql-server/src/infrastructure/instrumentation.ts`):
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// ... lots of imports and configuration

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations,
});

sdk.start();
```

**After**:
```typescript
import { initializeNodeSDK } from '@social-media-app/telemetry';

const { sdk, shutdown } = initializeNodeSDK({
  serviceName: 'social-media-graphql',
  serviceVersion: '1.0.0',
});
```

**Benefits**:
- **-200 lines** of boilerplate code
- Consistent configuration across services
- Automatic Lambda optimization
- Type-safe with better error handling

### From Next.js Direct @vercel/otel Usage

**Before** (`apps/web/instrumentation.node.ts`):
```typescript
import { registerOTel } from '@vercel/otel';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    registerOTel({ serviceName: 'social-media-web' });
  }
}
```

**After**:
```typescript
import { initializeNextJS } from '@social-media-app/telemetry';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initializeNextJS({ serviceName: 'social-media-web' });
  }
}
```

**Benefits**:
- Consistent API across all packages
- Same configuration approach as GraphQL Server
- Easier to add custom instrumentation later

### Adding Instrumentation to DAL

**Before** (no instrumentation):
```typescript
export async function getPost(postId: string) {
  return await dynamodb.get({
    TableName: 'Posts',
    Key: { postId },
  });
}
```

**After** (with instrumentation):
```typescript
import { createTracer, createDynamoDBSpan, withSpan } from '@social-media-app/telemetry';

const tracer = createTracer('social-media-dal', '1.0.0');

export async function getPost(postId: string) {
  const span = createDynamoDBSpan(tracer, 'get', { tableName: 'Posts' });

  return withSpan(span, async (span) => {
    span.setAttribute('post.id', postId);
    const result = await dynamodb.get({
      TableName: 'Posts',
      Key: { postId },
    });
    return result.Item;
  });
}
```

**Benefits**:
- **1-2 lines** to add comprehensive tracing
- Automatic error handling and span lifecycle
- Domain-specific semantic conventions
- No boilerplate span management code

## Architecture

### Deployment Context Detection

The package automatically detects the deployment environment and applies appropriate optimizations:

- **AWS Lambda**: Uses `SimpleSpanProcessor` for immediate export (prevents span loss)
- **Kubernetes**: Adds `k8s.namespace.name`, `k8s.pod.name` resource attributes
- **Container**: Adds `container.name`, `container.id` resource attributes
- **Standalone**: Uses `BatchSpanProcessor` for efficient batching

### Semantic Conventions

All span factories follow OpenTelemetry semantic conventions:

- **DynamoDB**: `db.system=dynamodb`, `db.operation`, `db.dynamodb.table_name`
- **Cache**: `cache.operation`, `cache.key`, `cache.hit`, `cache.ttl`
- **Kinesis**: `messaging.system=kinesis`, `messaging.operation`, `messaging.destination.name`
- **Service**: `service.name`, `service.operation`

### Auto-Instrumentation

Automatic instrumentation is enabled by default for:

- **HTTP** (incoming/outgoing requests)
- **GraphQL** (queries, mutations, resolvers)
- **AWS SDK** (DynamoDB, S3, SQS, SNS, etc.)
- **DNS** (DNS lookups)
- **Net** (network sockets)

File system (`fs`) instrumentation is disabled by default to reduce noise.

## Troubleshooting

### Spans not appearing in collector

1. **Check OTLP endpoint**:
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   # Should output: http://your-collector:4318/v1/traces
   ```

2. **Test collector connectivity**:
   ```bash
   curl -X POST http://localhost:4318/v1/traces \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
   # Should return 200 OK
   ```

3. **Enable debug logging**:
   ```bash
   export OTEL_LOG_LEVEL=debug
   ```

### Missing trace context in logs

Ensure logger integration is configured to inject trace context. See `@social-media-app/logger` package.

### Lambda span loss

If using custom span processor in Lambda, switch to `initializeLambda()` which uses `SimpleSpanProcessor` for immediate export.

### Performance impact

- **Overhead**: <5% in production
- **Lambda cold start**: ~10-20ms additional initialization time
- **Optimization**: Disable auto-instrumentation for specific modules if needed

```typescript
initializeNodeSDK({
  serviceName: 'my-service',
  disableAutoInstrumentation: true, // Disable all auto-instrumentation
});
```

## Development

### Building the package

```bash
cd packages/telemetry
pnpm build
```

### Running type checks

```bash
pnpm typecheck
```

### Local testing

```bash
# Link package locally
cd packages/telemetry
pnpm link

# Use in another package
cd ../graphql-server
pnpm link @social-media-app/telemetry
```

## Contributing

When adding new span factories or utilities:

1. Follow OpenTelemetry semantic conventions
2. Add comprehensive JSDoc comments
3. Include usage examples in documentation
4. Export from `src/index.ts`

## License

MIT

## Related Packages

- `@social-media-app/logger` - Structured logging with trace context
- `@social-media-app/dal` - Data access layer (uses this package)
- `@social-media-app/graphql-server` - GraphQL server (uses this package)

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Node.js SDK](https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/)
- [Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
