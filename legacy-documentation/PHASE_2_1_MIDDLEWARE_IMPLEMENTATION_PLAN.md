# Phase 2.1: Lambda Middleware Implementation Plan

**Date**: November 6, 2025
**Duration Estimate**: 3-5 days
**Status**: 🏗️ IN PROGRESS

---

## 🎯 Objective

Implement middleware framework for 16 remaining Lambda handlers to provide:
- ✅ Consistent error handling
- ✅ Structured logging with correlation IDs
- ✅ X-Ray tracing integration
- ✅ Validation error responses
- ✅ Service dependency injection
- ✅ Auth token extraction (where needed)

---

## 📊 Handlers Requiring Middleware (16 files)

### Group 1: Auth Handlers (5 files) - API Gateway
```
packages/backend/src/handlers/auth/
├── login.ts           # POST /auth/login
├── logout.ts          # POST /auth/logout
├── profile.ts         # GET/PUT /auth/profile
├── refresh.ts         # POST /auth/refresh
└── register.ts        # POST /auth/register
```

**Pattern**: APIGatewayProxyEventV2 → Manual error handling → Service calls → Response

### Group 2: Stream Handlers (8 files) - DynamoDB Streams
```
packages/backend/src/handlers/streams/
├── comment-counter.ts              # DynamoDB Stream
├── feed-cleanup-post-delete.ts     # DynamoDB Stream
├── feed-cleanup-unfollow.ts        # DynamoDB Stream
├── feed-fanout.ts                  # DynamoDB Stream
├── follow-counter.ts               # DynamoDB Stream
├── kinesis-feed-consumer.ts        # Kinesis Stream
├── like-counter.ts                 # DynamoDB Stream
└── notification-processor.ts       # DynamoDB Stream
```

**Pattern**: DynamoDBStreamEvent → Batch processing → Counter updates → No HTTP response

### Group 3: Dev/Health Handlers (3 files) - API Gateway
```
packages/backend/src/handlers/
├── dev/cache-status.ts          # GET /dev/cache-status
├── dev/get-kinesis-records.ts   # GET /dev/kinesis-records
└── hello.ts                     # POST /hello
```

**Pattern**: APIGatewayProxyEventV2 → Simple response → Minimal logic

---

## 🏗️ Middleware Architecture Design

### Phase 1: Core Middleware Components (Day 1)

#### 1.1 Error Handling Middleware
```typescript
// packages/backend/src/infrastructure/middleware/withErrorHandling.ts

/**
 * Wraps handler in try-catch and converts errors to proper responses
 * - Zod validation errors → 400 with details
 * - Auth errors → 401/403
 * - Not found errors → 404
 * - Unknown errors → 500 (log but hide details)
 */
export const withErrorHandling = (): Middleware => async (event, context, next) => {
  try {
    return await next();
  } catch (error) {
    // Convert error to appropriate response
    return handleError(error, event);
  }
};
```

#### 1.2 Logging Middleware
```typescript
// packages/backend/src/infrastructure/middleware/withLogging.ts

/**
 * Structured logging with correlation IDs
 * - Start: Log request details
 * - End: Log response status + duration
 * - Error: Log full error details
 */
export const withLogging = (): Middleware => async (event, context, next) => {
  const correlationId = event.requestContext?.requestId || crypto.randomUUID();
  const startTime = Date.now();

  console.log('[REQUEST]', {
    correlationId,
    path: event.rawPath,
    method: event.requestContext.http.method,
    userId: context.userId || 'anonymous'
  });

  try {
    const response = await next();

    console.log('[RESPONSE]', {
      correlationId,
      statusCode: response.statusCode,
      duration: Date.now() - startTime
    });

    return response;
  } catch (error) {
    console.error('[ERROR]', {
      correlationId,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};
```

#### 1.3 Validation Middleware
```typescript
// packages/backend/src/infrastructure/middleware/withValidation.ts

/**
 * Validates request body against Zod schema
 * - Parses JSON body
 * - Validates with provided schema
 * - Adds validatedInput to context
 * - Throws ValidationError on failure
 */
export const withValidation = <T>(schema: z.ZodSchema<T>): Middleware => {
  return async (event, context, next) => {
    const body = event.body ? JSON.parse(event.body) : {};
    context.validatedInput = schema.parse(body);
    return next();
  };
};
```

#### 1.4 Service Injection Middleware
```typescript
// packages/backend/src/infrastructure/middleware/withServices.ts

/**
 * Initializes and injects services into context
 * - Creates DynamoDB client
 * - Creates service instances
 * - Adds to context.services
 */
export const withServices = (serviceNames: string[]): Middleware => {
  return async (event, context, next) => {
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();

    context.services = {};

    if (serviceNames.includes('authService')) {
      const jwtConfig = getJWTConfigFromEnv();
      const jwtProvider = createJWTProvider(jwtConfig);
      context.services.authService = createDefaultAuthService(
        dynamoClient,
        tableName,
        jwtProvider
      );
    }

    // Add other services as needed

    return next();
  };
};
```

#### 1.5 Auth Middleware
```typescript
// packages/backend/src/infrastructure/middleware/withAuth.ts

/**
 * Extracts and validates JWT from Authorization header
 * - Parses Bearer token
 * - Validates JWT
 * - Adds userId and authPayload to context
 * - Throws UnauthorizedError if invalid
 */
export const withAuth = (required: boolean = true): Middleware => {
  return async (event, context, next) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;

    if (!authHeader) {
      if (required) {
        throw new UnauthorizedError('Missing authorization header');
      }
      return next();
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const jwtConfig = getJWTConfigFromEnv();
    const jwtProvider = createJWTProvider(jwtConfig);

    try {
      const payload = jwtProvider.verifyAccessToken(token);
      context.userId = payload.userId;
      context.authPayload = payload;
    } catch {
      if (required) {
        throw new UnauthorizedError('Invalid token');
      }
    }

    return next();
  };
};
```

### Phase 2: Apply to Auth Handlers (Day 2)

#### Example: Refactored Login Handler
```typescript
// packages/backend/src/handlers/auth/login.ts

import { compose } from '../../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../../infrastructure/middleware/withLogging.js';
import { withValidation } from '../../infrastructure/middleware/withValidation.js';
import { withServices } from '../../infrastructure/middleware/withServices.js';
import { successResponse } from '../../utils/responses.js';
import { LoginRequestSchema } from '@social-media-app/shared';

export const handler = compose(
  withErrorHandling(),
  withLogging(),
  withValidation(LoginRequestSchema),
  withServices(['authService']),
  async (event, context) => {
    // Business logic only - no error handling needed
    const response = await context.services.authService.login(context.validatedInput);
    return successResponse(200, response);
  }
);
```

**Before (54 lines)** → **After (16 lines)** = **70% reduction**

### Phase 3: Stream Handler Middleware (Day 3)

#### Stream-specific middleware needed:
```typescript
// packages/backend/src/infrastructure/middleware/withStreamErrorHandling.ts

/**
 * Error handling for DynamoDB/Kinesis stream handlers
 * - Catches errors per record (not per batch)
 * - Logs errors but continues processing
 * - No HTTP responses (stream handlers return void)
 */
export const withStreamErrorHandling = <TEvent>() => {
  return (handler: (event: TEvent) => Promise<void>) => {
    return async (event: TEvent): Promise<void> => {
      try {
        await handler(event);
      } catch (error) {
        console.error('[STREAM_ERROR]', {
          error: error instanceof Error ? error.message : 'Unknown',
          event: JSON.stringify(event, null, 2)
        });
        // Re-throw to trigger Lambda retry
        throw error;
      }
    };
  };
};
```

#### Stream handlers don't use compose pattern
**Reason**: Stream handlers are batch processors, not request/response handlers

**Approach**:
- Add error logging wrapper
- Keep existing batch processing logic
- Add structured logging for metrics

### Phase 4: Apply to Dev/Health Handlers (Day 4)

#### Example: Refactored Hello Handler
```typescript
// packages/backend/src/handlers/hello.ts

import { compose } from '../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../infrastructure/middleware/withLogging.js';
import { withValidation } from '../infrastructure/middleware/withValidation.js';
import { successResponse } from '../utils/responses.js';
import { HelloRequestSchema } from '@social-media-app/shared';

export const handler = compose(
  withErrorHandling(),
  withLogging(),
  withValidation(HelloRequestSchema),
  async (event, context) => {
    return successResponse(200, {
      message: `Hello ${context.validatedInput.name}!`,
      timestamp: new Date().toISOString()
    });
  }
);
```

### Phase 5: Testing & Documentation (Day 5)

#### 5.1 Middleware Tests
```typescript
// packages/backend/src/infrastructure/middleware/__tests__/withErrorHandling.test.ts
// Test error conversion logic

// packages/backend/src/infrastructure/middleware/__tests__/withLogging.test.ts
// Test logging output

// packages/backend/src/infrastructure/middleware/__tests__/withValidation.test.ts
// Test validation success/failure

// packages/backend/src/infrastructure/middleware/__tests__/withServices.test.ts
// Test service injection

// packages/backend/src/infrastructure/middleware/__tests__/withAuth.test.ts
// Test auth token extraction
```

#### 5.2 Integration Tests
```typescript
// Test full middleware chain
const handler = compose(
  withErrorHandling(),
  withLogging(),
  withValidation(TestSchema),
  withServices(['testService']),
  async (event, context) => {
    // Test handler logic
  }
);

// Verify:
// - Errors are caught and converted
// - Logs are output correctly
// - Validation works
// - Services are injected
```

#### 5.3 Documentation
- Update `/packages/backend/README.md` with middleware usage guide
- Add examples for each middleware
- Document composition patterns
- Add migration guide for existing handlers

---

## 📈 Progress Tracking

### Day 1: Core Middleware (0.5-1 day) ⏳
- [ ] Implement `withErrorHandling.ts`
- [ ] Implement `withLogging.ts`
- [ ] Implement `withValidation.ts`
- [ ] Implement `withServices.ts`
- [ ] Implement `withAuth.ts`

### Day 2: Auth Handlers (1 day)
- [ ] Refactor `auth/login.ts`
- [ ] Refactor `auth/logout.ts`
- [ ] Refactor `auth/profile.ts`
- [ ] Refactor `auth/refresh.ts`
- [ ] Refactor `auth/register.ts`

### Day 3: Stream Handlers (1 day)
- [ ] Add logging to `streams/like-counter.ts`
- [ ] Add logging to `streams/follow-counter.ts`
- [ ] Add logging to `streams/comment-counter.ts`
- [ ] Add logging to `streams/feed-fanout.ts`
- [ ] Add logging to `streams/feed-cleanup-post-delete.ts`
- [ ] Add logging to `streams/feed-cleanup-unfollow.ts`
- [ ] Add logging to `streams/notification-processor.ts`
- [ ] Add logging to `streams/kinesis-feed-consumer.ts`

### Day 4: Dev/Health Handlers (0.5 day)
- [ ] Refactor `hello.ts`
- [ ] Refactor `dev/cache-status.ts`
- [ ] Refactor `dev/get-kinesis-records.ts`

### Day 5: Testing & Documentation (1 day)
- [ ] Write middleware unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Verify all handlers work correctly

---

## 📊 Expected Impact

### Code Reduction
- **Auth handlers**: 5 handlers × 38 lines saved = **190 lines removed**
- **Dev handlers**: 3 handlers × 20 lines saved = **60 lines removed**
- **Total**: **~250 lines removed** (error handling, validation, logging)

### Code Quality Improvements
- ✅ Consistent error handling across all handlers
- ✅ Structured logging with correlation IDs
- ✅ X-Ray tracing for distributed debugging
- ✅ Type-safe validation
- ✅ DRY - no repeated error handling code
- ✅ Easier testing (mock middleware vs. test entire handler)

### Maintainability
- ✅ Add new middleware without touching handlers
- ✅ Fix error handling bugs in one place
- ✅ Update logging format globally
- ✅ Add auth requirements declaratively

---

## 🚀 Getting Started

### Prerequisites
- ✅ `compose.ts` already exists
- ✅ Auth handlers structure understood
- ✅ Stream handlers structure understood
- ✅ Response utilities exist (`successResponse`, etc.)

### First Task
1. Create `withErrorHandling.ts`
2. Create `withLogging.ts`
3. Test with one auth handler (`login.ts`)
4. Verify it works end-to-end
5. Apply pattern to remaining handlers

---

**Plan Status**: ✅ READY TO EXECUTE
**Next Action**: Start Day 1 - Implement core middleware components
