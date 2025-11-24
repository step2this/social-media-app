# @social-media-app/logger

Shared logging infrastructure with Pino and OpenTelemetry for the social media application.

## Features

- 🎯 **Structured JSON Logging** - Machine-parseable logs with consistent format
- 🔍 **Distributed Tracing** - Automatic OpenTelemetry trace context injection
- 📁 **Rotating File Streams** - Daily log rotation with 14-day retention and gzip compression
- 🏭 **Production-Ready** - Environment-aware configuration (file logging in dev, stdout in prod)
- 🧩 **DRY Helper Factories** - Generic logging helpers to eliminate code duplication
- 🚀 **Zero Configuration** - Sensible defaults with easy customization
- 📦 **ESM/NodeNext** - Full support for modern module resolution

## Installation

```bash
pnpm add @social-media-app/logger
```

## Quick Start

### Basic Logger

```typescript
import { createPinoLogger } from '@social-media-app/logger';

// Create a logger for your service
const logger = createPinoLogger({
  service: 'my-service',
  app: 'my-app',
  logLevel: 'debug',
});

// Start logging
logger.info('Service started');
logger.debug({ userId: '123', action: 'login' }, 'User logged in');
logger.error({ error: 'Connection timeout' }, 'Database connection failed');
```

### With Helper Factories

```typescript
import {
  createPinoLogger,
  createDomainLogger,
  createResultLogger,
  createServiceLogger,
  createErrorLogger,
} from '@social-media-app/logger';

const logger = createPinoLogger({
  service: 'data-access-layer',
  app: 'social-media-dal',
});

// Create domain-specific loggers
const logDynamoDB = createDomainLogger(logger, 'dynamodb');
const logCache = createResultLogger(logger, 'cache');
const logServiceOp = createServiceLogger(logger);
const logError = createErrorLogger(logger);

// Use them
logDynamoDB('query', { table: 'users', gsi: 'GSI1' });
logCache('get', 'hit', { key: 'user:123', ttl: 300 });
logServiceOp('AuthService', 'login', { userId: '123' }, 45);

try {
  // some operation
} catch (error) {
  logError('AuthService', 'login', error, { userId: '123' });
}
```

## Configuration

### Logger Configuration

The `createPinoLogger` function accepts a `LoggerConfig` object:

```typescript
interface LoggerConfig {
  // Required
  service: string;           // Service name (e.g., 'data-access-layer')
  app: string;              // Application name (e.g., 'social-media-dal')

  // Optional
  logLevel?: string;        // Log level (default: 'debug')
  env?: string;             // Environment (default: process.env.NODE_ENV)
  enableFileLogging?: boolean;  // Enable file logging (default: true in dev, false in prod)
  logsDir?: string;         // Log directory (default: 'logs')
  logFileName?: string;     // Log file name (default: '<service>.log')
}
```

### Example Configurations

**Development (with file logging)**:
```typescript
const logger = createPinoLogger({
  service: 'auth-service',
  app: 'social-media-auth',
  logLevel: 'debug',
  env: 'development',
  // File logging is automatically enabled in development
});
```

**Production (stdout only)**:
```typescript
const logger = createPinoLogger({
  service: 'auth-service',
  app: 'social-media-auth',
  logLevel: 'info',
  env: 'production',
  // File logging is automatically disabled in production
});
```

**Custom file location**:
```typescript
const logger = createPinoLogger({
  service: 'auth-service',
  app: 'social-media-auth',
  logsDir: '/var/log/myapp',
  logFileName: 'custom.log',
});
```

## Helper Factories

The package provides several helper factories to eliminate repetitive logging code:

### `createDomainLogger(logger, type, defaultLevel?)`

Create a logger for a specific domain (e.g., DynamoDB, Kinesis).

```typescript
const logDynamoDB = createDomainLogger(logger, 'dynamodb', 'debug');
const logKinesis = createDomainLogger(logger, 'kinesis', 'debug');

logDynamoDB('query', { table: 'users', gsi: 'GSI1' });
logDynamoDB('put', { table: 'posts', item: 'post-123' });
logKinesis('publish', { stream: 'events', partitionKey: 'user-123' });
```

### `createResultLogger(logger, type, defaultLevel?)`

Create a logger for operations with success/error outcomes. Automatically uses 'warn' level for errors.

```typescript
const logCache = createResultLogger(logger, 'cache', 'debug');

logCache('get', 'hit', { key: 'user:123' });    // Logged at debug level
logCache('get', 'miss', { key: 'user:456' });   // Logged at debug level
logCache('set', 'error', { error: 'Timeout' }); // Logged at warn level
```

### `createServiceLogger(logger)`

Create a logger for service operations with duration tracking.

```typescript
const logServiceOp = createServiceLogger(logger);

const startTime = Date.now();
// ... perform operation
const duration = Date.now() - startTime;

logServiceOp('AuthService', 'login', { userId: '123' }, duration);
```

### `createSlowOperationLogger(logger)`

Create a logger for slow operations that exceed thresholds.

```typescript
const logSlowOp = createSlowOperationLogger(logger);

const duration = 250;  // ms
const threshold = 100; // ms

logSlowOp('PostService', 'getUserPosts', duration, threshold, { userId: '123' });
// Logs: "[PostService] Slow getUserPosts detected: 250ms (threshold: 100ms)"
```

### `createBatchLogger(logger)`

Create a logger for batch operations.

```typescript
const logBatch = createBatchLogger(logger);

logBatch('FeedService', 'writeFeedItemsBatch', 1000, 25);
// Logs: "[FeedService] Starting batch writeFeedItemsBatch: 1000 items in 40 chunks"
```

### `createValidationLogger(logger)`

Create a logger for validation errors.

```typescript
const logValidation = createValidationLogger(logger);

logValidation('CommentService', 'content', 'Content exceeds 500 characters');
```

### `createErrorLogger(logger)`

Create a logger for errors with stack traces.

```typescript
const logError = createErrorLogger(logger);

try {
  // operation
} catch (error) {
  logError('PostService', 'createPost', error, { userId: '123' });
}
```

## Child Loggers

Create child loggers with inherited context:

```typescript
import { createPinoLogger, createChildLogger } from '@social-media-app/logger';

const logger = createPinoLogger({
  service: 'api-server',
  app: 'social-media-api',
});

// Create child logger with request context
const requestLogger = createChildLogger(logger, {
  requestId: 'abc-123',
  userId: 'user-456',
});

// All logs from requestLogger will include requestId and userId
requestLogger.info('Processing request');
requestLogger.debug({ action: 'fetch' }, 'Fetching user data');
```

## OpenTelemetry Integration

The logger automatically injects OpenTelemetry trace context into every log when available:

```typescript
// If OpenTelemetry tracing is active, logs will automatically include:
{
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "a3ce929d0e0e4736",
  "trace_flags": 1,
  // ... your log data
}
```

No additional configuration required - it just works!

## Log Rotation

In development mode, logs are automatically rotated:

- **Rotation**: Daily at midnight
- **Retention**: 14 days
- **Compression**: Gzip compression for rotated files
- **Location**: `./logs/<service>.log` (configurable)

Rotated files are named:
- `service.log` (current)
- `service-20241120.log.gz` (rotated)

## Viewing Logs

### Development (Pretty Printing)

View logs in real-time with pretty formatting:

```bash
# Basic viewing
tail -f ./logs/dal.log | pnpm exec pino-pretty

# Search for specific trace
grep "4bf92f3577b34da6a3ce929d0e0e4736" ./logs/dal.log | pnpm exec pino-pretty

# Filter by log level
grep '"level":"error"' ./logs/dal.log | pnpm exec pino-pretty
```

### Production

Logs go to stdout and can be captured by your logging infrastructure (CloudWatch, Datadog, etc.).

## Log Levels

Supported log levels (in order of severity):

1. `trace` - Very detailed diagnostic information
2. `debug` - Detailed diagnostic information
3. `info` - Informational messages
4. `warn` - Warning messages
5. `error` - Error messages
6. `fatal` - Fatal errors

Set the log level when creating the logger:

```typescript
const logger = createPinoLogger({
  service: 'my-service',
  app: 'my-app',
  logLevel: 'info', // Only info, warn, error, fatal will be logged
});
```

## Best Practices

### 1. Use Structured Logging

```typescript
// Good ✅
logger.info({ userId: '123', action: 'login', duration: 45 }, 'User logged in');

// Bad ❌
logger.info(`User 123 logged in, took 45ms`);
```

### 2. Use Helper Factories

```typescript
// Good ✅
const logCache = createResultLogger(logger, 'cache');
logCache('get', 'hit', { key: 'user:123' });

// Bad ❌
logger.debug({
  type: 'cache',
  operation: 'get',
  result: 'hit',
  key: 'user:123',
}, 'Cache get - hit');
```

### 3. Include Context

```typescript
// Good ✅
const requestLogger = createChildLogger(logger, {
  requestId: req.id,
  userId: req.user?.id,
});
requestLogger.info('Processing request');

// Bad ❌
logger.info({ requestId: req.id, userId: req.user?.id }, 'Processing request');
logger.debug({ requestId: req.id, userId: req.user?.id }, 'Fetching data');
```

### 4. Choose Appropriate Log Levels

- `debug`: Detailed flow information for debugging
- `info`: Important events and state changes
- `warn`: Unexpected but recoverable situations
- `error`: Errors that need attention
- `fatal`: Critical failures requiring immediate action

### 5. Don't Log Sensitive Data

```typescript
// Good ✅
logger.info({ email: user.email }, 'User registered');

// Bad ❌
logger.info({ password: user.password, token: user.token }, 'User registered');
```

## Integration Examples

### DAL Package

```typescript
// packages/dal/src/infrastructure/logger.ts
import { createPinoLogger, createDomainLogger, createResultLogger } from '@social-media-app/logger';

export const logger = createPinoLogger({
  service: 'data-access-layer',
  app: 'social-media-dal',
  logLevel: process.env.LOG_LEVEL || 'debug',
});

export const logDynamoDB = createDomainLogger(logger, 'dynamodb');
export const logCache = createResultLogger(logger, 'cache');
export const logKinesis = createDomainLogger(logger, 'kinesis');
```

### GraphQL Server

```typescript
// packages/graphql-server/src/infrastructure/logger.ts
import { createPinoLogger, createDomainLogger } from '@social-media-app/logger';

export const logger = createPinoLogger({
  service: 'graphql-server',
  app: 'social-media-graphql',
  logLevel: process.env.LOG_LEVEL || 'debug',
});

export const logGraphQL = createDomainLogger(logger, 'graphql-operation');
export const logResolver = createDomainLogger(logger, 'resolver');
```

### Next.js App

```typescript
// apps/web/lib/logger.ts
import { createPinoLogger } from '@social-media-app/logger';

export const logger = createPinoLogger({
  service: 'web-app',
  app: 'social-media-web',
  logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  // Disable file logging in Next.js (use stdout)
  enableFileLogging: false,
});
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  LoggerConfig,
  LogLevel,
  LogResult,
  LogMetadata,
} from '@social-media-app/logger';

const config: LoggerConfig = {
  service: 'my-service',
  app: 'my-app',
  logLevel: 'debug',
};

const metadata: LogMetadata = {
  userId: '123',
  action: 'login',
};
```

## Architecture

The package is organized into:

- **`logger.ts`**: Core Pino logger factory with DRY'd configuration
- **`helpers.ts`**: Generic helper function factories
- **`types.ts`**: TypeScript type definitions
- **`index.ts`**: Public API exports

## Contributing

When adding new helper factories:

1. Add the factory function to `helpers.ts`
2. Export it from `index.ts`
3. Update this README with examples
4. Add JSDoc comments to the function

## License

MIT

## Related Packages

- **@social-media-app/dal** - Data Access Layer (uses this logger)
- **@social-media-app/graphql-server** - GraphQL Server (uses this logger)
- **@social-media-app/env** - Environment configuration
