# Task 2.2: Standardize Error Handling with End-to-End Distributed Tracing (FINAL)

## Executive Summary

Create a **shared correlation ID and structured logging infrastructure** that both backend lambdas and GraphQL server can use. This eliminates duplication, ensures consistency, and enables end-to-end request tracing across all components (Frontend → GraphQL Server → Backend Lambda → DAL).

**Key Insight**: Backend `withLogging` and GraphQL server lambda handler would have duplicated logic. **Solution**: Extract shared utilities to `/packages/aws-utils`.

---

## Phase 0: Create Shared AWS Lambda Utilities (NEW!)

### 0.1: Correlation ID Utilities

**File**: `/packages/aws-utils/src/correlation/correlationId.ts`

```typescript
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';

/**
 * Constant for correlation ID header name
 * Used consistently across all lambdas
 */
export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

/**
 * Extract correlation ID from request headers or generate a new one
 * 
 * Priority order:
 * 1. X-Correlation-Id header (from client)
 * 2. requestContext.requestId (from API Gateway)
 * 3. Generated UUID (fallback)
 */
export function getOrCreateCorrelationId(
  event: APIGatewayProxyEventV2
): string {
  // Check headers (case-insensitive)
  const correlationId = 
    event.headers['x-correlation-id'] || 
    event.headers['X-Correlation-Id'] ||
    event.headers[CORRELATION_ID_HEADER];
  
  if (correlationId) {
    return correlationId;
  }
  
  // Check API Gateway request ID
  if (event.requestContext?.requestId) {
    return event.requestContext.requestId;
  }
  
  // Generate new UUID
  return randomUUID();
}

/**
 * Add correlation ID to response headers
 */
export function addCorrelationIdToHeaders(
  headers: Record<string, string> | undefined,
  correlationId: string
): Record<string, string> {
  return {
    ...headers,
    [CORRELATION_ID_HEADER]: correlationId
  };
}
```

---

### 0.2: Structured Logging Utilities

**File**: `/packages/aws-utils/src/logging/structuredLogger.ts`

```typescript
/**
 * Log levels (matches CloudWatch Insights standards)
 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/**
 * Base log entry structure
 */
export interface BaseLogEntry {
  level: LogLevel;
  type: string;
  correlationId: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Create a structured logger with correlation ID
 */
export function createStructuredLogger(correlationId: string) {
  const log = (level: LogLevel, type: string, message: string, additionalData?: Record<string, unknown>) => {
    const entry: BaseLogEntry = {
      level,
      type,
      correlationId,
      message,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    const logFn = level === 'ERROR' ? console.error : 
                  level === 'WARN' ? console.warn : 
                  console.log;
    
    logFn(JSON.stringify(entry));
  };
  
  return {
    info: (type: string, message: string, additionalData?: Record<string, unknown>) => 
      log('INFO', type, message, additionalData),
    
    warn: (type: string, message: string, additionalData?: Record<string, unknown>) => 
      log('WARN', type, message, additionalData),
    
    error: (type: string, error: Error | string, additionalData?: Record<string, unknown>) => 
      log('ERROR', type, typeof error === 'string' ? error : error.message, {
        ...additionalData,
        stack: error instanceof Error ? error.stack : undefined
      }),
    
    debug: (type: string, message: string, additionalData?: Record<string, unknown>) => 
      log('DEBUG', type, message, additionalData)
  };
}

/**
 * Simple logging functions for when you don't have a logger instance
 */
export const logInfo = (correlationId: string, type: string, message: string, additionalData?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    level: 'INFO',
    type,
    correlationId,
    message,
    timestamp: new Date().toISOString(),
    ...additionalData
  }));
};

export const logError = (correlationId: string, type: string, error: Error | string, additionalData?: Record<string, unknown>) => {
  console.error(JSON.stringify({
    level: 'ERROR',
    type,
    correlationId,
    message: typeof error === 'string' ? error : error.message,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...additionalData
  }));
};

export const logWarn = (correlationId: string, type: string, message: string, additionalData?: Record<string, unknown>) => {
  console.warn(JSON.stringify({
    level: 'WARN',
    type,
    correlationId,
    message,
    timestamp: new Date().toISOString(),
    ...additionalData
  }));
};
```

---

### 0.3: Update aws-utils Index

**File**: `/packages/aws-utils/src/index.ts`

```typescript
// Correlation ID utilities
export {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
  addCorrelationIdToHeaders
} from './correlation/correlationId.js';

// Structured logging
export {
  createStructuredLogger,
  logInfo,
  logError,
  logWarn,
  type LogLevel,
  type BaseLogEntry
} from './logging/structuredLogger.js';
```

**Estimated Time**: 2-3 hours

---

## Phase 1: Update Backend withLogging to Use Shared Utilities

### 1.1: Refactor withLogging Middleware

**File**: `/packages/backend/src/infrastructure/middleware/withLogging.ts`

**Before** (duplicated logic):
```typescript
export const withLogging = (): Middleware => {
  return async (event, context, next) => {
    const correlationId = event.requestContext?.requestId || crypto.randomUUID();
    context.correlationId = correlationId;
    
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'REQUEST_START',
      correlationId,
      path: event.rawPath,
      method: event.requestContext?.http?.method,
      userId: context.userId || 'anonymous',
      timestamp: new Date().toISOString()
    }));
    
    // ... rest of middleware
  };
};
```

**After** (uses shared utilities):
```typescript
import {
  getOrCreateCorrelationId,
  addCorrelationIdToHeaders,
  createStructuredLogger
} from '@social-media-app/aws-utils';

export const withLogging = (): Middleware => {
  return async (event, context, next) => {
    // ✅ Use shared utility
    const correlationId = getOrCreateCorrelationId(event);
    context.correlationId = correlationId;
    
    // ✅ Use shared structured logger
    const logger = createStructuredLogger(correlationId);
    context.logger = logger;
    
    logger.info('REQUEST_START', 'Request started', {
      path: event.rawPath,
      method: event.requestContext?.http?.method,
      userId: context.userId || 'anonymous'
    });
    
    const startTime = Date.now();
    
    try {
      const response = await next();
      const duration = Date.now() - startTime;
      
      logger.info('REQUEST_COMPLETE', 'Request completed', {
        statusCode: response.statusCode,
        duration
      });
      
      // ✅ Use shared utility
      return {
        ...response,
        headers: addCorrelationIdToHeaders(response.headers, correlationId)
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('REQUEST_ERROR', error as Error, { duration });
      throw error;
    }
  };
};
```

**Benefits**:
- ✅ No duplication of correlation ID logic
- ✅ Consistent structured logging format
- ✅ Shared constants for header names
- ✅ Easier to update logging format globally

**Estimated Time**: 1 hour

---

## Phase 2: Update GraphQL Server to Use Shared Utilities

### 2.1: Update GraphQL Lambda Handler

**File**: `/packages/graphql-server/src/lambda.ts`

**Current code** (lines 181-194) - would have duplicated logic:
```typescript
export async function handler(
  event: APIGatewayProxyEvent,
  lambdaContext: Context
): Promise<APIGatewayProxyResult> {
  try {
    if (!serverInstance) {
      console.log('[Lambda] Cold start: Creating Apollo Server instance');
      serverInstance = createApolloServer();
      await serverInstance.start();
      console.log('[Lambda] Apollo Server started successfully');
    }
```

**Updated code** (uses shared utilities):
```typescript
import {
  getOrCreateCorrelationId,
  addCorrelationIdToHeaders,
  createStructuredLogger
} from '@social-media-app/aws-utils';

export async function handler(
  event: APIGatewayProxyEvent,
  lambdaContext: Context
): Promise<APIGatewayProxyResult> {
  // ✅ Use shared utility
  const eventV2 = convertV1ToV2(event);
  const correlationId = getOrCreateCorrelationId(eventV2);
  
  // ✅ Use shared structured logger
  const logger = createStructuredLogger(correlationId);
  
  try {
    if (!serverInstance) {
      logger.info('COLD_START', 'Creating Apollo Server instance');
      serverInstance = createApolloServer();
      await serverInstance.start();
      logger.info('APOLLO_SERVER_STARTED', 'Apollo Server started successfully');
    } else {
      logger.info('WARM_START', 'Reusing existing Apollo Server instance');
    }
    
    // Parse GraphQL operation name
    let operationName: string | undefined;
    try {
      const body = JSON.parse(event.body || '{}');
      operationName = body.operationName;
    } catch {
      // Ignore parse errors
    }
    
    logger.info('GRAPHQL_REQUEST_START', 'GraphQL request started', {
      operation: operationName,
      path: event.path,
      method: event.httpMethod
    });

    // Create Lambda handler with correlation ID in context
    const lambdaHandler = startServerAndCreateLambdaHandler(
      serverInstance,
      handlers.createAPIGatewayProxyEventV2RequestHandler(),
      {
        context: async ({ event: contextEvent }) => {
          try {
            const context = await createContext(contextEvent);
            return {
              ...context,
              correlationId,
              logger  // ✅ Pass logger to resolvers
            };
          } catch (error) {
            logger.error('CONTEXT_CREATION_ERROR', error as Error);
            throw error;
          }
        },
      }
    );

    const result = await lambdaHandler(eventV2, lambdaContext, {} as any);
    
    logger.info('GRAPHQL_REQUEST_COMPLETE', 'GraphQL request completed', {
      operation: operationName,
      statusCode: result.statusCode
    });
    
    // ✅ Use shared utility
    return {
      ...result,
      headers: addCorrelationIdToHeaders(result.headers, correlationId)
    } as APIGatewayProxyResult;
    
  } catch (error) {
    logger.error('HANDLER_ERROR', error as Error);

    return {
      statusCode: 500,
      headers: addCorrelationIdToHeaders(
        { 'Content-Type': 'application/json' },
        correlationId
      ),
      body: JSON.stringify({
        errors: [
          {
            message: 'Internal server error',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              correlationId
            },
          },
        ],
      }),
    };
  }
}
```

**Benefits**:
- ✅ Uses same utilities as backend lambdas
- ✅ Consistent logging format
- ✅ No duplication of correlation ID extraction logic
- ✅ Easy to maintain

**Estimated Time**: 2-3 hours

---

### 2.2: Update GraphQL Context

**File**: `/packages/graphql-server/src/context.ts`

```typescript
import type { StructuredLogger } from '@social-media-app/aws-utils';

export interface GraphQLContext {
  services: ServiceContainer;
  userId?: string | null;
  correlationId: string;
  logger: ReturnType<typeof createStructuredLogger>;  // ✅ Add logger to context
}
```

**Benefit**: Resolvers can use the logger directly instead of console.log

---

### 2.3: Update ErrorFactory

**File**: `/packages/graphql-server/src/infrastructure/errors/ErrorFactory.ts`

```typescript
import { logError, logWarn } from '@social-media-app/aws-utils';

export class ErrorFactory {
  static internalServerError(message: string, correlationId?: string): GraphQLError {
    if (correlationId) {
      logError(correlationId, 'GRAPHQL_ERROR', message, {
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
    
    return new GraphQLError(message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        correlationId
      }
    });
  }
  
  static notFound(message: string, correlationId?: string): GraphQLError {
    if (correlationId) {
      logWarn(correlationId, 'NOT_FOUND', message);
    }
    
    return new GraphQLError(message, {
      extensions: {
        code: 'NOT_FOUND',
        correlationId
      }
    });
  }
  
  // ... update all other methods similarly
}
```

**Estimated Time**: 1-2 hours

---

### 2.4: Update withAuth Helper

**File**: `/packages/graphql-server/src/infrastructure/resolvers/withAuth.ts`

```typescript
export const withAuth = <T>(
  resolver: (parent: any, args: any, context: GraphQLContext, info: any) => Promise<T>
): any => {
  return async (parent: any, args: any, context: GraphQLContext, info: any) => {
    const { correlationId, logger } = context;
    
    if (!context.userId) {
      throw ErrorFactory.unauthenticated(
        'Authentication required',
        correlationId
      );
    }
    
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      logger.error('RESOLVER_ERROR', error as Error, {
        resolver: info.fieldName
      });
      throw error;
    }
  };
};
```

**Estimated Time**: 30 minutes

---

## Phase 3: Frontend Correlation ID Integration

### 3.1: Relay Network Layer

**File**: `/packages/frontend/src/relay/RelayEnvironment.ts`

```typescript
import { CORRELATION_ID_HEADER } from '@social-media-app/aws-utils';

function fetchQuery(operation: RequestParameters, variables: Variables) {
  const correlationId = crypto.randomUUID();
  
  console.log(JSON.stringify({
    level: 'INFO',
    type: 'GRAPHQL_REQUEST_START',
    correlationId,
    operation: operation.name,
    timestamp: new Date().toISOString()
  }));
  
  return fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      [CORRELATION_ID_HEADER]: correlationId  // ✅ Use shared constant
    },
    body: JSON.stringify({
      query: operation.text,
      variables
    })
  })
  .then(async (response) => {
    const responseCorrelationId = response.headers.get(CORRELATION_ID_HEADER);
    const data = await response.json();
    
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'GRAPHQL_REQUEST_COMPLETE',
      correlationId: responseCorrelationId || correlationId,
      operation: operation.name,
      timestamp: new Date().toISOString()
    }));
    
    if (data.errors) {
      data.errors = data.errors.map((error: any) => ({
        ...error,
        extensions: {
          ...error.extensions,
          correlationId: responseCorrelationId || correlationId
        }
      }));
    }
    
    return data;
  })
  .catch((error) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      type: 'GRAPHQL_REQUEST_ERROR',
      correlationId,
      operation: operation.name,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }));
    
    throw error;
  });
}
```

**Estimated Time**: 2-3 hours

---

### 3.2: HTTP Client for REST Endpoints

**File**: `/packages/frontend/src/services/http/httpHelpers.ts`

```typescript
import { CORRELATION_ID_HEADER } from '@social-media-app/aws-utils';

export const sendRequest: SendRequestFn = async <T>(config: RequestConfig): Promise<HttpResponse<T>> => {
  const correlationId = crypto.randomUUID();
  
  const headers = {
    ...config.headers,
    [CORRELATION_ID_HEADER]: correlationId  // ✅ Use shared constant
  };
  
  console.log(JSON.stringify({
    level: 'INFO',
    type: 'HTTP_REQUEST_START',
    correlationId,
    method: config.method,
    url: config.url,
    timestamp: new Date().toISOString()
  }));
  
  try {
    const response = await fetch(config.url, { ...config, headers });
    const responseCorrelationId = response.headers.get(CORRELATION_ID_HEADER);
    
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'HTTP_REQUEST_COMPLETE',
      correlationId: responseCorrelationId || correlationId,
      status: response.status,
      timestamp: new Date().toISOString()
    }));
    
    return {
      data: await response.json(),
      status: response.status,
      headers: response.headers,
      correlationId: responseCorrelationId || correlationId
    };
  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      type: 'HTTP_REQUEST_ERROR',
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }));
    throw error;
  }
};
```

**Estimated Time**: 1-2 hours

---

## Phase 4: Centralized Error Reporting Service

(Same as previous plan - Phase 4 from TASK_2_2_PLAN_REVISED.md)

**Estimated Time**: 2-3 hours

---

## Phase 5: Refactor Existing Error Handling

(Same as previous plan - Phase 5 from TASK_2_2_PLAN_REVISED.md)

**Estimated Time**: 2-3 days

---

## Phase 6: Testing & Documentation

(Same as previous plan - Phase 7 from TASK_2_2_PLAN_REVISED.md)

**Estimated Time**: 1-2 days

---

## Implementation Timeline (UPDATED)

| Phase | Description | Time | Cumulative |
|-------|-------------|------|------------|
| **Phase 0** | ⭐ Create shared aws-utils (NEW!) | 2-3 hours | 2-3 hours |
| **Phase 1** | Refactor backend withLogging | 1 hour | 3-4 hours |
| **Phase 2** | Update GraphQL server | 4-6 hours | 7-10 hours |
| **Phase 3** | Frontend integration | 3-5 hours | 10-15 hours |
| **Phase 4** | Error reporting service | 2-3 hours | 12-18 hours |
| **Phase 5** | Refactor existing code | 2-3 days | 3-4 days |
| **Phase 6** | Testing & documentation | 1-2 days | 4-6 days |

**Total Estimated Time**: 4-6 days (32-48 hours)

---

## Benefits of Shared Utilities

### 1. No Code Duplication ✅
- Correlation ID extraction logic in ONE place
- Structured logging format in ONE place
- Header name constants in ONE place

### 2. Consistency Across All Lambdas ✅
- Backend lambdas use same utilities
- GraphQL server uses same utilities
- Frontend uses same header constants
- Uniform logging format

### 3. Easy to Maintain ✅
- Change logging format once, applies everywhere
- Update correlation ID strategy once
- Add new log fields globally

### 4. Type Safety ✅
- Shared TypeScript types
- Compile-time checks
- IDE autocomplete

### 5. Testable ✅
- Test utilities independently
- Mock easily in tests
- Single set of unit tests

---

## Shared Utilities Package Structure

```
/packages/aws-utils/
├── src/
│   ├── correlation/
│   │   ├── correlationId.ts          ⭐ getOrCreateCorrelationId()
│   │   └── __tests__/
│   │       └── correlationId.test.ts
│   ├── logging/
│   │   ├── structuredLogger.ts       ⭐ createStructuredLogger()
│   │   └── __tests__/
│   │       └── structuredLogger.test.ts
│   └── index.ts                       ⭐ Exports
├── package.json
└── tsconfig.json
```

---

## End-to-End Tracing Flow (CORRECT)

```
1. Frontend (React Component)
   ↓ generates correlationId = "abc123"
   ↓ adds header: X-Correlation-Id: abc123 (uses CORRELATION_ID_HEADER constant)
   ↓ logs: {type: 'GRAPHQL_REQUEST_START', correlationId: 'abc123'}
   
2. API Gateway
   ↓ receives request
   ↓ forwards to GraphQL Lambda
   
3. GraphQL Server Lambda ⭐ PRIMARY ENTRY POINT
   ↓ calls getOrCreateCorrelationId(event) -> "abc123"
   ↓ creates logger = createStructuredLogger(correlationId)
   ↓ logger.info('GRAPHQL_REQUEST_START', ...)
   ↓ adds to context: { correlationId: 'abc123', logger }
   ↓ executes resolvers with correlation ID
   ↓ returns header via addCorrelationIdToHeaders()
   
4. Resolver
   ↓ receives context.correlationId: "abc123"
   ↓ uses context.logger.error('RESOLVER_ERROR', ...)
   ↓ passes to ErrorFactory: ErrorFactory.notFound(message, correlationId)
   
5. Response Back to Frontend
   ↓ GraphQL returns: X-Correlation-Id: abc123
   ↓ Frontend extracts from response
   ↓ logs: {type: 'GRAPHQL_REQUEST_COMPLETE', correlationId: 'abc123'}
   ↓ shows error to user: "Error (ID: abc123)"
```

### CloudWatch Logs Query

```
# Find all logs for a specific correlation ID
fields @timestamp, level, type, message, component
| filter correlationId = "abc123"
| sort @timestamp asc
```

**Result**: Complete request trace from frontend → GraphQL → resolvers!

---

## Success Criteria

- [ ] ✅ Shared aws-utils package created with correlation ID utilities
- [ ] ✅ Backend withLogging uses shared utilities (no duplication)
- [ ] ✅ GraphQL lambda uses shared utilities (no duplication)
- [ ] ✅ Frontend uses CORRELATION_ID_HEADER constant
- [ ] ✅ All lambdas log with same structured format
- [ ] ✅ Correlation IDs propagate from frontend to backend
- [ ] ✅ All errors include correlation IDs
- [ ] ✅ ErrorReportingService centrally handles errors
- [ ] ✅ User-friendly error messages with reference IDs
- [ ] ✅ CloudWatch dashboards show request traces
- [ ] ✅ All hooks/components use ErrorReportingService
- [ ] ✅ Zero `console.error` without correlation ID
- [ ] ✅ Documentation complete
- [ ] ✅ Tests passing (integration + unit)

---

## Key Differences from Previous Plan

### What Changed?

1. **Phase 0 is NEW** ⭐
   - Create shared `aws-utils` package first
   - Extract correlation ID and logging utilities
   - Single source of truth for all lambdas

2. **Phase 1 updated**
   - Backend `withLogging` refactored to use shared utilities
   - No duplication with GraphQL server

3. **Phase 2 updated**
   - GraphQL server uses same shared utilities
   - Consistent with backend implementation

4. **Frontend uses shared constants**
   - Import `CORRELATION_ID_HEADER` from aws-utils
   - Consistent header names across stack

### Benefits Over Previous Plan

✅ **No duplication** between backend and GraphQL server  
✅ **Single source of truth** for correlation ID logic  
✅ **Easier to maintain** - update in one place  
✅ **Consistent logging** format across all lambdas  
✅ **Type-safe** shared TypeScript types  
✅ **Testable** utilities in isolation  

---

## Notes

- **Phase 0 is critical** - must be done first
- Shared utilities prevent duplication you identified
- Both backend and GraphQL server use same code
- Frontend imports constants for consistency
- Low overhead (~5ms per request for logging)

**After Task 2.2**:
- Complete observability across stack
- Production-ready error handling
- Easy debugging of distributed requests
- Foundation for APM/monitoring tools
- Professional error UX for users
- **Zero code duplication** between lambdas ✅
