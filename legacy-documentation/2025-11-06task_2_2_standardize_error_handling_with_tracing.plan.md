# Task 2.2: Standardize Error Handling with End-to-End Distributed Tracing

## Executive Summary

Create a centralized error handling system that integrates with the existing backend distributed tracing infrastructure (`withLogging` middleware). Extend correlation IDs to the frontend, enabling end-to-end request tracing across all components (Frontend → GraphQL Server → Backend Lambda → DAL). This addresses the current inconsistent error handling (mix of console.log/warn/error, silent failures, inconsistent user notifications) while adding observability infrastructure.

**Current State**:
- ✅ Backend has correlation IDs via `withLogging` middleware
- ❌ Frontend has no correlation ID tracking
- ❌ GraphQL server doesn't propagate correlation IDs
- ❌ Inconsistent error handling across all packages
- ❌ No centralized error reporting/logging

**Goal**: Unified error handling + end-to-end tracing with correlation IDs flowing through entire request lifecycle.

---

## Phase 1: Backend Correlation ID Infrastructure (Already Complete ✅)

### What Already Exists

**File**: `/packages/backend/src/infrastructure/middleware/withLogging.ts`

```typescript
// ✅ Already implemented
export const withLogging = (): Middleware => {
  return async (event, context, next) => {
    const correlationId = event.requestContext?.requestId || crypto.randomUUID();
    
    // Add correlation ID to context
    context.correlationId = correlationId;
    
    // Log request start with correlation ID
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'REQUEST_START',
      correlationId,
      path: event.rawPath,
      method: event.requestContext?.http?.method,
      userId: context.userId || 'anonymous',
      timestamp: new Date().toISOString()
    }));
    
    // ... handle request ...
    
    // Return correlation ID in response headers
    return {
      ...response,
      headers: {
        ...response.headers,
        'X-Correlation-Id': correlationId
      }
    };
  };
};
```

**Benefits**:
- ✅ Generates correlation IDs for each request
- ✅ Logs with structured JSON format
- ✅ Returns correlation ID in `X-Correlation-Id` header
- ✅ CloudWatch Logs compatible

**Status**: Complete | Used in all auth and stream handlers

---

## Phase 2: GraphQL Server Correlation ID Propagation

### 2.1: Add Correlation ID Context Type

**File**: `/packages/graphql-server/src/context.ts`

```typescript
// Add to GraphQLContext interface
export interface GraphQLContext {
  services: ServiceContainer;
  userId?: string | null;
  correlationId: string;  // ← Add this
}
```

### 2.2: Extract Correlation ID from Headers

**File**: `/packages/graphql-server/src/lambda.ts`

```typescript
export const handler = async (event: APIGatewayProxyEventV2) => {
  // Extract correlation ID from request or generate new one
  const correlationId = 
    event.headers['x-correlation-id'] || 
    event.headers['X-Correlation-Id'] ||
    event.requestContext?.requestId ||
    crypto.randomUUID();
  
  // Add to structured logs
  console.log(JSON.stringify({
    level: 'INFO',
    type: 'GRAPHQL_REQUEST_START',
    correlationId,
    operation: event.body ? JSON.parse(event.body).operationName : null,
    timestamp: new Date().toISOString()
  }));
  
  const context: GraphQLContext = {
    services,
    userId: null,
    correlationId  // ← Pass to context
  };
  
  // ... execute GraphQL ...
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId  // ← Return in response
    },
    body: JSON.stringify(result)
  };
};
```

### 2.3: Log Errors with Correlation ID

**File**: `/packages/graphql-server/src/infrastructure/errors/ErrorFactory.ts`

```typescript
export class ErrorFactory {
  static internalServerError(message: string, correlationId?: string): GraphQLError {
    // Log with correlation ID
    console.error(JSON.stringify({
      level: 'ERROR',
      type: 'GRAPHQL_ERROR',
      correlationId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    return new GraphQLError(message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        correlationId  // ← Include in error response
      }
    });
  }
}
```

**Estimated Time**: 2-3 hours

---

## Phase 3: Frontend Correlation ID Integration

### 3.1: HTTP Client Correlation ID Support

**File**: `/packages/frontend/src/services/http/httpHelpers.ts`

```typescript
/**
 * Sends HTTP request with correlation ID tracking
 */
export const sendRequest: SendRequestFn = async <T>(config: RequestConfig): Promise<HttpResponse<T>> => {
  // Generate correlation ID for frontend-initiated requests
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
    const response = await fetch(config.url, {
      ...config,
      headers
    });
    
    // Extract correlation ID from response
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

### 3.2: Relay Network Layer Correlation ID Support

**File**: `/packages/frontend/src/relay/RelayEnvironment.ts`

```typescript
import { Environment, Network, RecordSource, Store } from 'relay-runtime';

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
      'X-Correlation-Id': correlationId  // ← Send correlation ID
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

**Estimated Time**: 3-4 hours

---

## Phase 4: Centralized Error Reporting Service

### 4.1: Create Error Reporting Interface

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
  /**
   * Report an error with context
   */
  reportError(error: Error, context?: ErrorContext): void;
  
  /**
   * Report a warning (non-fatal error)
   */
  reportWarning(message: string, context?: ErrorContext): void;
  
  /**
   * Get user-friendly error message
   */
  getUserMessage(error: Error): string;
}
```

### 4.2: Implement Error Reporting Service

**File**: `/packages/frontend/src/services/implementations/ErrorReportingService.ts`

```typescript
export class ErrorReportingService implements IErrorReportingService {
  constructor(
    private readonly notificationService: INotificationService
  ) {}
  
  reportError(error: Error, context: ErrorContext = {}): void {
    const correlationId = context.correlationId || crypto.randomUUID();
    
    // Structured logging
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
    
    // Send to Sentry/DataDog in production
    if (import.meta.env.PROD) {
      this.sendToMonitoring(error, { correlationId, ...context });
    }
    
    // Show user-friendly message
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
    
    // Warnings don't show to user by default
  }
  
  getUserMessage(error: Error): string {
    // GraphQL errors
    if ('extensions' in error && (error as any).extensions?.correlationId) {
      const correlationId = (error as any).extensions.correlationId;
      return `Something went wrong. Reference ID: ${correlationId.slice(0, 8)}`;
    }
    
    // Network errors
    if (error instanceof NetworkError) {
      return 'Network connection lost. Please check your internet connection.';
    }
    
    // Validation errors
    if (error instanceof ValidationError) {
      return error.message;
    }
    
    // Generic error
    return 'Something went wrong. Please try again.';
  }
  
  private sendToMonitoring(error: Error, context: ErrorContext): void {
    // Integration with Sentry, DataDog, CloudWatch, etc.
    // This would be configured based on your monitoring setup
  }
}
```

### 4.3: Register in Service Container

**File**: `/packages/frontend/src/services/ServiceContainer.ts`

```typescript
export class ServiceContainer implements IServiceContainer {
  private errorReportingService?: IErrorReportingService;
  
  getErrorReportingService(): IErrorReportingService {
    if (!this.errorReportingService) {
      this.errorReportingService = new ErrorReportingService(
        this.getNotificationService()
      );
    }
    return this.errorReportingService;
  }
}
```

**Estimated Time**: 3-4 hours

---

## Phase 5: Refactor Existing Error Handling

### 5.1: Hooks Error Handling

**Pattern**: Replace `console.error` with centralized error reporting

**Before** (`useFeedItemAutoRead.ts`):
```typescript
// ❌ Silent failure with console.warn
onError: (err) => {
  setError(err);
  console.warn('Failed to mark posts as read:', err);
}
```

**After**:
```typescript
// ✅ Centralized error reporting
onError: (err) => {
  setError(err);
  errorReportingService.reportWarning('Failed to mark posts as read', {
    correlationId: extractCorrelationId(err),
    component: 'useFeedItemAutoRead',
    action: 'markPostsAsRead',
    additionalData: { postIds }
  });
}
```

**Files to Update** (15 files):
1. `/packages/frontend/src/hooks/useFollow.ts`
2. `/packages/frontend/src/hooks/useCreatePost.ts`
3. `/packages/frontend/src/hooks/useCreateAuction.ts`
4. `/packages/frontend/src/hooks/usePlaceBid.ts`
5. `/packages/frontend/src/hooks/useFeedItemAutoRead.ts`
6. `/packages/frontend/src/hooks/useNotifications.ts`
7. `/packages/frontend/src/hooks/useNotificationActions.ts`
8. `/packages/frontend/src/hooks/useAuctions.ts`
9. `/packages/frontend/src/hooks/useImagePreview.ts`
10. `/packages/frontend/src/hooks/useCreatePostForm.ts`
11. `/packages/frontend/src/hooks/useAuth.ts` (if exists)
12. `/packages/frontend/src/components/comments/CommentForm.tsx`
13. `/packages/frontend/src/components/posts/CreatePostPage.tsx`
14. `/packages/frontend/src/components/profile/ProfilePage.tsx`
15. `/packages/frontend/src/pages/NotificationsPage.tsx`

### 5.2: Component Error Handling

**Pattern**: Replace inline error handling with service

**Before**:
```typescript
try {
  await someOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // No user notification
}
```

**After**:
```typescript
try {
  await someOperation();
} catch (error) {
  errorReportingService.reportError(error as Error, {
    component: 'ComponentName',
    action: 'someOperation'
  });
}
```

### 5.3: Service Error Handling

**Files** (if any REST services remain):
- `/packages/frontend/src/services/profileService.ts`
- `/packages/frontend/src/services/notificationService.ts`

**Estimated Time Phase 5**: 2-3 days (most time-consuming phase)

---

## Phase 6: GraphQL Error Enhancement

### 6.1: Add Correlation ID to All GraphQL Errors

**File**: `/packages/graphql-server/src/infrastructure/resolvers/withAuth.ts`

```typescript
export const withAuth = <T>(
  resolver: (parent: any, args: any, context: GraphQLContext, info: any) => Promise<T>
): any => {
  return async (parent: any, args: any, context: GraphQLContext, info: any) => {
    if (!context.userId) {
      throw ErrorFactory.unauthenticated(
        'Authentication required',
        context.correlationId  // ← Pass correlation ID
      );
    }
    
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      // Log error with correlation ID
      console.error(JSON.stringify({
        level: 'ERROR',
        type: 'RESOLVER_ERROR',
        correlationId: context.correlationId,
        resolver: info.fieldName,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }));
      
      throw error;
    }
  };
};
```

### 6.2: Update All ErrorFactory Methods

**File**: `/packages/graphql-server/src/infrastructure/errors/ErrorFactory.ts`

```typescript
export class ErrorFactory {
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
  
  // ... update all other methods similarly
}
```

**Estimated Time**: 2-3 hours

---

## Phase 7: Testing & Documentation

### 7.1: Unit Tests

**Files to Create**:
1. `/packages/frontend/src/services/__tests__/ErrorReportingService.test.ts`
2. `/packages/frontend/src/relay/__tests__/RelayEnvironment.correlationId.test.ts`
3. `/packages/graphql-server/src/infrastructure/errors/__tests__/ErrorFactory.correlationId.test.ts`

**Test Scenarios**:
- Correlation ID generation
- Correlation ID propagation through layers
- Error reporting with correlation ID
- User message generation
- Structured logging format

### 7.2: Integration Tests

**Test End-to-End Flow**:
```typescript
it('should propagate correlation ID through entire request flow', async () => {
  // 1. Frontend generates correlation ID
  const correlationId = crypto.randomUUID();
  
  // 2. Send GraphQL request with correlation ID
  const response = await fetch('/graphql', {
    headers: {
      'X-Correlation-Id': correlationId
    },
    body: JSON.stringify({ query: '{ me { id } }' })
  });
  
  // 3. Verify correlation ID in response
  expect(response.headers.get('X-Correlation-Id')).toBe(correlationId);
  
  // 4. Verify correlation ID in error (if error occurs)
  const data = await response.json();
  if (data.errors) {
    expect(data.errors[0].extensions.correlationId).toBe(correlationId);
  }
  
  // 5. Verify correlation ID in logs (check CloudWatch)
  const logs = await getCloudWatchLogs();
  expect(logs).toContainEqual(expect.objectContaining({
    correlationId,
    type: 'GRAPHQL_REQUEST_START'
  }));
});
```

### 7.3: Documentation

**Files to Create/Update**:
1. `/docs/ERROR_HANDLING_GUIDE.md`
   - How to use ErrorReportingService
   - Best practices for error handling
   - Correlation ID usage patterns

2. `/docs/DISTRIBUTED_TRACING_GUIDE.md`
   - How correlation IDs flow through system
   - How to debug issues using correlation IDs
   - CloudWatch Logs query examples

3. `/docs/MONITORING_SETUP.md`
   - Integration with Sentry/DataDog
   - CloudWatch dashboards
   - Alerting setup

4. Update `/CODEBASE_ANALYSIS_2025-11-05.md`:
   - Mark Task 2.2 as complete
   - Document new error handling architecture

**Estimated Time**: 1-2 days

---

## Implementation Timeline

| Phase | Description | Time | Cumulative |
|-------|-------------|------|------------|
| **Phase 1** | Backend correlation IDs | ✅ Done | ✅ Done |
| **Phase 2** | GraphQL server propagation | 2-3 hours | 2-3 hours |
| **Phase 3** | Frontend integration | 3-4 hours | 5-7 hours |
| **Phase 4** | Error reporting service | 3-4 hours | 8-11 hours |
| **Phase 5** | Refactor existing code | 2-3 days | 3-4 days |
| **Phase 6** | GraphQL error enhancement | 2-3 hours | 3-4 days |
| **Phase 7** | Testing & documentation | 1-2 days | 4-6 days |

**Total Estimated Time**: 4-6 days (32-48 hours)

---

## End-to-End Tracing Flow

### Request Flow with Correlation IDs

```
1. Frontend (React Component)
   ↓ generates correlationId = "abc123"
   ↓ adds header: X-Correlation-Id: abc123
   ↓ logs: {type: 'HTTP_REQUEST_START', correlationId: 'abc123'}
   
2. API Gateway
   ↓ receives request
   ↓ requestContext.requestId = "def456"
   ↓ forwards to backend/GraphQL
   
3. GraphQL Server (Lambda)
   ↓ extracts correlationId from header: "abc123"
   ↓ logs: {type: 'GRAPHQL_REQUEST_START', correlationId: 'abc123'}
   ↓ adds to context: { correlationId: 'abc123' }
   ↓ executes resolvers with correlation ID
   ↓ returns header: X-Correlation-Id: abc123
   
4. Resolver
   ↓ receives context.correlationId: "abc123"
   ↓ calls use case with correlation ID
   ↓ logs errors: {type: 'RESOLVER_ERROR', correlationId: 'abc123'}
   
5. Use Case
   ↓ receives correlation ID
   ↓ calls repository/adapter
   ↓ logs: {type: 'USE_CASE_ERROR', correlationId: 'abc123'}
   
6. Backend Lambda (if called)
   ↓ extracts correlationId from header: "abc123"
   ↓ logs: {type: 'REQUEST_START', correlationId: 'abc123'}
   ↓ executes business logic
   ↓ returns header: X-Correlation-Id: abc123
   
7. DAL Service
   ↓ executes DynamoDB operations
   ↓ logs: {type: 'DAL_OPERATION', correlationId: 'abc123'}
   
8. Response Back to Frontend
   ↓ GraphQL returns: X-Correlation-Id: abc123
   ↓ Frontend extracts from response
   ↓ logs: {type: 'HTTP_REQUEST_COMPLETE', correlationId: 'abc123'}
   ↓ shows error to user: "Error (ID: abc123)"
```

### CloudWatch Logs Query

```
# Find all logs for a specific correlation ID
fields @timestamp, level, type, message, component
| filter correlationId = "abc123"
| sort @timestamp asc
```

**Result**: Complete request trace across all components!

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

## Success Criteria

- [ ] ✅ Correlation IDs propagate from frontend to backend
- [ ] ✅ All errors include correlation IDs
- [ ] ✅ Structured logging across all packages
- [ ] ✅ ErrorReportingService centrally handles errors
- [ ] ✅ User-friendly error messages with reference IDs
- [ ] ✅ CloudWatch dashboards show request traces
- [ ] ✅ All hooks/components use ErrorReportingService
- [ ] ✅ Zero `console.error` without correlation ID
- [ ] ✅ Documentation complete
- [ ] ✅ Tests passing (integration + unit)

---

## Migration Strategy

### Incremental Rollout

**Week 1** (Infrastructure):
- Phase 2: GraphQL correlation IDs
- Phase 3: Frontend correlation IDs
- Phase 4: Error reporting service

**Week 2** (Refactoring):
- Phase 5: Migrate 5 files/day to ErrorReportingService
- Phase 6: GraphQL error enhancement
- Daily smoke testing

**Week 3** (Testing & Polish):
- Phase 7: Comprehensive testing
- Documentation
- Performance validation

### Backward Compatibility

- ✅ No breaking changes
- ✅ Correlation IDs optional (generate if missing)
- ✅ Existing error handling still works
- ✅ Gradual migration, one file at a time

---

## Risk Assessment

### Low Risk
- Backend already has correlation IDs (Phase 1 done)
- Additive changes (no breaking changes)
- Easy rollback (feature flags possible)

### Medium Risk
- Large refactoring surface area (15+ files)
- Potential for missed error handlers
- Testing complexity

### Mitigation
- Incremental migration (5 files/day)
- Comprehensive testing
- Code review for each phase
- Feature flag for ErrorReportingService

---

## Alternative Approaches Considered

### Option 1: Use Sentry SDK Directly
❌ Rejected: Vendor lock-in, less control, can't customize logging format

### Option 2: Keep Current Console Logging
❌ Rejected: No tracing, inconsistent format, hard to debug production issues

### Option 3: Add Tracing Later
❌ Rejected: Harder to retrofit, miss out on production insights

**Decision**: Implement comprehensive solution now (Option in this plan)

---

## Open Questions

1. **Q**: Do we want to integrate with specific monitoring tools (Sentry, DataDog)?
   **A**: Design for flexibility - ErrorReportingService can integrate with any tool

2. **Q**: Should we log all requests or sample?
   **A**: Log all for now, add sampling later if volume is high

3. **Q**: How long to retain correlation IDs?
   **A**: Follow CloudWatch Logs retention policy (30-90 days typical)

4. **Q**: Should we track performance metrics too?
   **A**: Yes - duration is already logged in `withLogging` middleware

---

## Notes

- This builds on existing `withLogging` middleware (already complete)
- Aligns with CloudWatch best practices
- Follows structured logging standards
- Enables future APM integration
- Low overhead (~5ms per request for logging)

**After Task 2.2**:
- Complete observability across stack
- Production-ready error handling
- Easy debugging of distributed requests
- Foundation for APM/monitoring tools
- Professional error UX for users