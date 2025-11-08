# Task 2.2: Standardize Error Handling with End-to-End Distributed Tracing (REVISED)

## Executive Summary

Create a centralized error handling system that integrates with the existing backend distributed tracing infrastructure (`withLogging` middleware). **The key insight is that GraphQL is the primary entry point**, not backend lambdas, so we need to add correlation ID support there first. This enables end-to-end request tracing across all components (Frontend → GraphQL Server → Backend Lambda → DAL).

**Current State**:
- ✅ Backend lambdas have correlation IDs via `withLogging` middleware (auth + stream handlers)
- ❌ **GraphQL server (primary entry point) has NO correlation ID support** ⚠️
- ❌ Frontend has no correlation ID tracking
- ❌ Inconsistent error handling across all packages
- ❌ No centralized error reporting/logging

**Key Realization**: Most requests go through GraphQL lambda, **not** backend lambdas. Backend lambdas are only for:
- Auth endpoints (login, register, profile, logout, refresh) - 5 endpoints
- Stream handlers (DynamoDB streams) - 8 handlers
- Dev tools (hello, health, cache-status) - 3 endpoints

**Goal**: Unified error handling + end-to-end tracing starting with GraphQL server (where 90%+ of traffic goes).

---

## Request Flow Analysis

### Current Architecture (90% of traffic)

```
Frontend → API Gateway → GraphQL Lambda (NO correlation IDs ❌) → Resolvers → Use Cases → DAL
```

**Problem**: GraphQL lambda doesn't generate or log correlation IDs!

### Rare Path (10% of traffic)

```
Frontend → API Gateway → Backend Lambda (HAS correlation IDs ✅) → DAL
```

**Already working**: Backend lambdas use `withLogging` middleware

---

## Phase 1: GraphQL Server Correlation ID Support (CRITICAL)

### 1.1: Add Correlation ID to GraphQL Lambda Handler

**File**: `/packages/graphql-server/src/lambda.ts`

**Current code** (lines 181-194):
```typescript
export async function handler(
  event: APIGatewayProxyEvent,
  lambdaContext: Context
): Promise<APIGatewayProxyResult> {
  try {
    if (!serverInstance) {
      console.log('[Lambda] Cold start: Creating Apollo Server instance');  // ❌ Not structured
      serverInstance = createApolloServer();
      await serverInstance.start();
      console.log('[Lambda] Apollo Server started successfully');
    } else {
      console.log('[Lambda] Warm start: Reusing existing Apollo Server instance');
    }
```

**Updated code**:
```typescript
export async function handler(
  event: APIGatewayProxyEvent,
  lambdaContext: Context
): Promise<APIGatewayProxyResult> {
  // Extract or generate correlation ID (FIRST THING!)
  const correlationId = 
    event.headers['x-correlation-id'] || 
    event.headers['X-Correlation-Id'] ||
    event.requestContext?.requestId ||
    crypto.randomUUID();
  
  // Structured logging with correlation ID
  const logInfo = (type: string, message: string, additionalData?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'INFO',
      type,
      correlationId,
      message,
      timestamp: new Date().toISOString(),
      ...additionalData
    }));
  };
  
  const logError = (type: string, error: unknown, additionalData?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      type,
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      ...additionalData
    }));
  };
  
  try {
    if (!serverInstance) {
      logInfo('COLD_START', 'Creating Apollo Server instance');
      serverInstance = createApolloServer();
      await serverInstance.start();
      logInfo('APOLLO_SERVER_STARTED', 'Apollo Server started successfully');
    } else {
      logInfo('WARM_START', 'Reusing existing Apollo Server instance');
    }
    
    // Parse GraphQL operation name from request body
    let operationName: string | undefined;
    try {
      const body = JSON.parse(event.body || '{}');
      operationName = body.operationName;
    } catch {
      // Ignore parse errors
    }
    
    logInfo('GRAPHQL_REQUEST_START', 'GraphQL request started', {
      operation: operationName,
      path: event.path,
      method: event.httpMethod
    });

    // Create Lambda handler with Apollo Server integration
    const lambdaHandler = startServerAndCreateLambdaHandler(
      serverInstance,
      handlers.createAPIGatewayProxyEventV2RequestHandler(),
      {
        // Pass correlation ID to context
        context: async ({ event: eventV2 }) => {
          try {
            const context = await createContext(eventV2);
            return {
              ...context,
              correlationId  // ← Add correlation ID to GraphQL context
            };
          } catch (error) {
            logError('CONTEXT_CREATION_ERROR', error);
            throw error;
          }
        },
      }
    );

    // Execute the GraphQL request
    const eventV2 = convertV1ToV2(event);
    const result = await lambdaHandler(eventV2, lambdaContext, {} as any);
    
    logInfo('GRAPHQL_REQUEST_COMPLETE', 'GraphQL request completed', {
      operation: operationName,
      statusCode: result.statusCode
    });
    
    // Return result with correlation ID header
    return {
      ...result,
      headers: {
        ...result.headers,
        'X-Correlation-Id': correlationId
      }
    } as APIGatewayProxyResult;
    
  } catch (error) {
    logError('HANDLER_ERROR', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId
      },
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
- ✅ Generates correlation ID at entry point
- ✅ Structured JSON logging (CloudWatch compatible)
- ✅ Returns correlation ID in response headers
- ✅ Includes correlation ID in error responses
- ✅ Logs operation names for better debugging

**Estimated Time**: 1-2 hours

---

### 1.2: Add Correlation ID to GraphQL Context

**File**: `/packages/graphql-server/src/context.ts`

**Current interface**:
```typescript
export interface GraphQLContext {
  services: ServiceContainer;
  userId?: string | null;
}
```

**Updated interface**:
```typescript
export interface GraphQLContext {
  services: ServiceContainer;
  userId?: string | null;
  correlationId: string;  // ← Add this
}
```

**Updated createContext function**:
```typescript
export async function createContext(event: APIGatewayProxyEventV2): Promise<GraphQLContext> {
  // Extract correlation ID from event (already added to event in lambda.ts)
  const correlationId = event.headers['x-correlation-id'] || event.headers['X-Correlation-Id'] || crypto.randomUUID();
  
  const services = createServiceContainer(event);
  
  // ... existing auth logic ...
  
  return {
    services,
    userId: userId || null,
    correlationId
  };
}
```

**Estimated Time**: 30 minutes

---

### 1.3: Update ErrorFactory to Include Correlation ID

**File**: `/packages/graphql-server/src/infrastructure/errors/ErrorFactory.ts`

**Update ALL methods**:
```typescript
export class ErrorFactory {
  static internalServerError(message: string, correlationId?: string): GraphQLError {
    console.error(JSON.stringify({
      level: 'ERROR',
      type: 'GRAPHQL_ERROR',
      code: 'INTERNAL_SERVER_ERROR',
      correlationId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    return new GraphQLError(message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        correlationId
      }
    });
  }
  
  static notFound(message: string, correlationId?: string): GraphQLError {
    console.warn(JSON.stringify({
      level: 'WARN',
      type: 'NOT_FOUND',
      correlationId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    return new GraphQLError(message, {
      extensions: {
        code: 'NOT_FOUND',
        correlationId
      }
    });
  }
  
  static badRequest(message: string, correlationId?: string): GraphQLError {
    console.warn(JSON.stringify({
      level: 'WARN',
      type: 'BAD_REQUEST',
      correlationId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    return new GraphQLError(message, {
      extensions: {
        code: 'BAD_REQUEST',
        correlationId
      }
    });
  }
  
  static unauthenticated(message: string, correlationId?: string): GraphQLError {
    console.warn(JSON.stringify({
      level: 'WARN',
      type: 'UNAUTHENTICATED',
      correlationId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    return new GraphQLError(message, {
      extensions: {
        code: 'UNAUTHENTICATED',
        correlationId
      }
    });
  }
}
```

**Estimated Time**: 1 hour

---

### 1.4: Update All Resolvers to Pass Correlation ID

**Pattern**: Update all resolvers to extract correlationId from context and pass to ErrorFactory

**Example** (`postResolver.ts`):
```typescript
export const createPostResolver = (container: Container): QueryResolvers['post'] => {
  return withAuth(async (_parent, args, context) => {
    const { correlationId } = context;  // ← Extract correlation ID
    
    const useCase = container.resolve<GetPostById>('GetPostById');
    const result = await useCase.execute({ postId: PostId(args.id) });
    
    if (!result.success) {
      throw ErrorFactory.internalServerError(
        result.error.message,
        correlationId  // ← Pass to ErrorFactory
      );
    }
    
    return result.data as unknown as Post;
  });
};
```

**Files to update** (~15 resolvers):
1. `/packages/graphql-server/src/resolvers/post/postResolver.ts`
2. `/packages/graphql-server/src/resolvers/post/userPostsResolver.ts`
3. `/packages/graphql-server/src/resolvers/feed/exploreFeedResolver.ts`
4. `/packages/graphql-server/src/resolvers/feed/followingFeedResolver.ts`
5. `/packages/graphql-server/src/resolvers/profile/profileResolver.ts`
6. `/packages/graphql-server/src/resolvers/profile/meResolver.ts`
7. `/packages/graphql-server/src/resolvers/comment/commentsResolver.ts`
8. `/packages/graphql-server/src/resolvers/notification/notificationsResolver.ts`
9. `/packages/graphql-server/src/resolvers/notification/unreadNotificationsCountResolver.ts`
10. `/packages/graphql-server/src/resolvers/auction/auctionResolver.ts`
11. `/packages/graphql-server/src/resolvers/auction/auctionsResolver.ts`
12. `/packages/graphql-server/src/resolvers/auction/bidsResolver.ts`
13. `/packages/graphql-server/src/resolvers/like/postLikeStatusResolver.ts`
14. `/packages/graphql-server/src/resolvers/follow/followStatusResolver.ts`
15. Any other resolvers

**Estimated Time**: 2-3 hours

---

### 1.5: Update withAuth Helper to Log with Correlation ID

**File**: `/packages/graphql-server/src/infrastructure/resolvers/withAuth.ts`

```typescript
export const withAuth = <T>(
  resolver: (parent: any, args: any, context: GraphQLContext, info: any) => Promise<T>
): any => {
  return async (parent: any, args: any, context: GraphQLContext, info: any) => {
    const { correlationId } = context;
    
    if (!context.userId) {
      throw ErrorFactory.unauthenticated(
        'Authentication required',
        correlationId
      );
    }
    
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      console.error(JSON.stringify({
        level: 'ERROR',
        type: 'RESOLVER_ERROR',
        correlationId,
        resolver: info.fieldName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }));
      
      throw error;
    }
  };
};
```

**Estimated Time**: 30 minutes

---

## Phase 2: Frontend Correlation ID Integration

### 2.1: Relay Network Layer with Correlation IDs

**File**: `/packages/frontend/src/relay/RelayEnvironment.ts`

```typescript
function fetchQuery(operation: RequestParameters, variables: Variables) {
  // Generate correlation ID for GraphQL requests
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
      'X-Correlation-Id': correlationId  // ← Send to GraphQL server
    },
    body: JSON.stringify({
      query: operation.text,
      variables
    })
  })
  .then(async (response) => {
    const responseCorrelationId = response.headers.get('X-Correlation-Id');
    const data = await response.json();
    
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'GRAPHQL_REQUEST_COMPLETE',
      correlationId: responseCorrelationId || correlationId,
      operation: operation.name,
      timestamp: new Date().toISOString()
    }));
    
    // Add correlation ID to errors
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

### 2.2: HTTP Client Correlation ID Support (for REST auth endpoints)

**File**: `/packages/frontend/src/services/http/httpHelpers.ts`

```typescript
export const sendRequest: SendRequestFn = async <T>(config: RequestConfig): Promise<HttpResponse<T>> => {
  const correlationId = crypto.randomUUID();
  
  const headers = {
    ...config.headers,
    'X-Correlation-Id': correlationId
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
    const responseCorrelationId = response.headers.get('X-Correlation-Id');
    
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

## Phase 3: Centralized Error Reporting Service

### 3.1: Create Error Reporting Interface

**File**: `/packages/frontend/src/services/interfaces/IErrorReportingService.ts`

```typescript
export interface ErrorContext {
  correlationId?: string;
  userId?: string;
  component?: string;
  action?: string;
  additionalData?: Record<string, unknown>;
}

export interface IErrorReportingService {
  reportError(error: Error, context?: ErrorContext): void;
  reportWarning(message: string, context?: ErrorContext): void;
  getUserMessage(error: Error): string;
}
```

### 3.2: Implement Error Reporting Service

**File**: `/packages/frontend/src/services/implementations/ErrorReportingService.ts`

```typescript
export class ErrorReportingService implements IErrorReportingService {
  constructor(
    private readonly notificationService: INotificationService
  ) {}
  
  reportError(error: Error, context: ErrorContext = {}): void {
    const correlationId = context.correlationId || crypto.randomUUID();
    
    console.error(JSON.stringify({
      level: 'ERROR',
      type: 'APPLICATION_ERROR',
      correlationId,
      message: error.message,
      stack: error.stack,
      name: error.name,
      userId: context.userId,
      component: context.component,
      action: context.action,
      additionalData: context.additionalData,
      timestamp: new Date().toISOString()
    }));
    
    if (import.meta.env.PROD) {
      this.sendToMonitoring(error, { correlationId, ...context });
    }
    
    const userMessage = this.getUserMessage(error);
    this.notificationService.showError(userMessage);
  }
  
  reportWarning(message: string, context: ErrorContext = {}): void {
    const correlationId = context.correlationId || crypto.randomUUID();
    
    console.warn(JSON.stringify({
      level: 'WARN',
      type: 'APPLICATION_WARNING',
      correlationId,
      message,
      userId: context.userId,
      component: context.component,
      timestamp: new Date().toISOString()
    }));
  }
  
  getUserMessage(error: Error): string {
    if ('extensions' in error && (error as any).extensions?.correlationId) {
      const correlationId = (error as any).extensions.correlationId;
      return `Something went wrong. Reference ID: ${correlationId.slice(0, 8)}`;
    }
    
    if (error instanceof NetworkError) {
      return 'Network connection lost. Please check your internet connection.';
    }
    
    if (error instanceof ValidationError) {
      return error.message;
    }
    
    return 'Something went wrong. Please try again.';
  }
  
  private sendToMonitoring(error: Error, context: ErrorContext): void {
    // Integration with Sentry, DataDog, CloudWatch, etc.
  }
}
```

**Estimated Time**: 2-3 hours

---

## Phase 4: Refactor Existing Error Handling

**Pattern**: Replace console logging with ErrorReportingService

**Files to refactor** (15 files):

**Hooks** (10 files):
1. `useFollow.ts`
2. `useCreatePost.ts`
3. `useCreateAuction.ts`
4. `usePlaceBid.ts`
5. `useFeedItemAutoRead.ts`
6. `useNotifications.ts`
7. `useNotificationActions.ts`
8. `useAuctions.ts`
9. `useImagePreview.ts`
10. `useCreatePostForm.ts`

**Components** (5 files):
1. `CommentForm.tsx`
2. `CreatePostPage.tsx`
3. `ProfilePage.tsx`
4. `NotificationsPage.tsx`
5. `App.tsx`

**Estimated Time**: 2-3 days (5 files/day)

---

## Phase 5: Testing & Documentation

### 5.1: Unit Tests

**Files to create**:
1. `/packages/graphql-server/src/lambda.test.ts` - Test correlation ID generation/propagation
2. `/packages/graphql-server/src/infrastructure/errors/__tests__/ErrorFactory.correlationId.test.ts`
3. `/packages/frontend/src/services/__tests__/ErrorReportingService.test.ts`
4. `/packages/frontend/src/relay/__tests__/RelayEnvironment.correlationId.test.ts`

### 5.2: Integration Tests

Test end-to-end correlation ID flow from frontend → GraphQL → backend.

### 5.3: Documentation

**Files to create/update**:
1. `/docs/ERROR_HANDLING_GUIDE.md`
2. `/docs/DISTRIBUTED_TRACING_GUIDE.md`
3. `/docs/MONITORING_SETUP.md`
4. Update `/CODEBASE_ANALYSIS_2025-11-05.md` - Mark Task 2.2 complete

**Estimated Time**: 1-2 days

---

## Implementation Timeline

| Phase | Description | Time | Cumulative |
|-------|-------------|------|------------|
| **Phase 1** | GraphQL server correlation IDs | 4-6 hours | 4-6 hours |
| **Phase 2** | Frontend integration | 3-5 hours | 7-11 hours |
| **Phase 3** | Error reporting service | 2-3 hours | 9-14 hours |
| **Phase 4** | Refactor existing code | 2-3 days | 3-4 days |
| **Phase 5** | Testing & documentation | 1-2 days | 4-6 days |

**Total Estimated Time**: 4-6 days (32-48 hours)

---

## End-to-End Tracing Flow (CORRECT)

```
1. Frontend (React Component)
   ↓ generates correlationId = "abc123"
   ↓ adds header: X-Correlation-Id: abc123
   ↓ logs: {type: 'GRAPHQL_REQUEST_START', correlationId: 'abc123'}
   
2. API Gateway
   ↓ receives request
   ↓ forwards to GraphQL Lambda
   
3. GraphQL Server Lambda ⭐ PRIMARY ENTRY POINT
   ↓ extracts correlationId from header: "abc123"
   ↓ logs: {type: 'GRAPHQL_REQUEST_START', correlationId: 'abc123'}
   ↓ adds to context: { correlationId: 'abc123' }
   ↓ executes resolvers with correlation ID
   ↓ returns header: X-Correlation-Id: abc123
   
4. Resolver
   ↓ receives context.correlationId: "abc123"
   ↓ passes to ErrorFactory: ErrorFactory.notFound(message, correlationId)
   ↓ logs errors: {type: 'RESOLVER_ERROR', correlationId: 'abc123'}
   
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

## Key Differences from Original Plan

### What Changed?

1. **Phase 1 is now GraphQL server** (not backend lambdas)
   - GraphQL lambda is the primary entry point (90%+ traffic)
   - Backend lambdas already have `withLogging` (done ✅)

2. **Focus on GraphQL first** (highest impact)
   - Add correlation ID to lambda.ts handler
   - Update GraphQL context
   - Update all resolvers
   - Update ErrorFactory

3. **Backend lambdas already done** ✅
   - `withLogging` middleware exists
   - Used in auth handlers (5 endpoints)
   - Used in stream handlers (8 handlers)
   - No changes needed!

### Traffic Distribution

- **GraphQL Lambda**: 90%+ of user traffic
- **Backend Lambdas**: 10% (auth endpoints only)
- **Stream Handlers**: Internal (DynamoDB triggers)

**Conclusion**: Fix GraphQL first, get 90% coverage immediately!

---

## Success Criteria

- [ ] ✅ GraphQL lambda generates correlation IDs
- [ ] ✅ Correlation IDs in GraphQL context
- [ ] ✅ All GraphQL errors include correlation IDs
- [ ] ✅ Frontend sends correlation IDs
- [ ] ✅ Structured logging across all packages
- [ ] ✅ ErrorReportingService centrally handles errors
- [ ] ✅ User-friendly error messages with reference IDs
- [ ] ✅ CloudWatch dashboards show request traces
- [ ] ✅ All hooks/components use ErrorReportingService
- [ ] ✅ Zero `console.error` without correlation ID
- [ ] ✅ Documentation complete
- [ ] ✅ Tests passing (integration + unit)

---

## Benefits

### 1. End-to-End Observability ✅
- Trace requests from frontend to database
- Find all logs for a specific request
- Debug distributed systems easily

### 2. Better Error Messages ✅
- Users get meaningful reference IDs
- Support can look up errors by ID
- Developers can correlate logs

### 3. Consistent Error Handling ✅
- Single pattern across all code
- Standardized logging format
- Centralized error reporting

### 4. CloudWatch Integration ✅
- Structured JSON logs
- Easy queries and dashboards
- Alerting on error patterns

### 5. Production-Ready Monitoring ✅
- Integration with Sentry/DataDog
- Error tracking and aggregation
- Performance monitoring

---

## Notes

- GraphQL is primary entry point (90%+ traffic)
- Backend lambdas already have withLogging ✅
- Focus on GraphQL first for maximum impact
- Aligns with CloudWatch best practices
- Follows structured logging standards
- Low overhead (~5ms per request)

**After Task 2.2**:
- Complete observability across stack
- Production-ready error handling
- Easy debugging of distributed requests
- Foundation for APM/monitoring tools
- Professional error UX for users
