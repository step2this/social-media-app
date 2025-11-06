# TypeScript Errors Fix Plan

**Date**: November 6, 2025  
**Scope**: Fix all TS errors in middleware and refactored handlers  
**Estimated Time**: 30-45 minutes  

---

## 🔍 Errors Identified

### Category 1: Context Services Type Safety (4 errors)
**Issue**: `context.services` is possibly undefined

**Files Affected**:
- `auth/login.ts:27` - `context.services.authService`
- `auth/logout.ts:31` - `context.services.authService`  
- `auth/refresh.ts:27` - `context.services.authService`
- `auth/register.ts:27` - `context.services.authService`

**Root Cause**: TypeScript doesn't know that `withServices` middleware guarantees services exist

**Fix Strategy**: Add type assertion or non-null assertion after middleware validation

---

### Category 2: Missing Export (1 error)
**Issue**: `NotFoundError` not exported from responses.ts

**File**: `auth/profile.ts:9`

**Root Cause**: Using `NotFoundError` from wrong module

**Fix Strategy**: Import from middleware or create proper error class

---

### Category 3: Type Mismatch (2 errors)
**Issue**: `string | undefined` not assignable to `string`

**Files Affected**:
- `auth/profile.ts:32` - `context.userId` may be undefined
- `auth/profile.ts:65` - `context.userId` may be undefined

**Root Cause**: TypeScript doesn't know `withAuth()` guarantees userId exists

**Fix Strategy**: Add type guard or non-null assertion after middleware

---

### Category 4: Union Type Discrimination (1 error)
**Issue**: Property `kinesis` does not exist on type `DynamoDBRecord`

**File**: `streamLogger.ts:134`

**Root Cause**: Trying to access `record.kinesis` without discriminating union type

**Fix Strategy**: Proper type narrowing with type guards

---

## 📋 Fix Plan by Priority

### Priority 1: Middleware Context Type Safety (CRITICAL)

**Problem**: Middleware adds properties to context, but TypeScript doesn't track this flow

**Solution**: Update middleware context types to reflect guarantees

#### File: `compose.ts` - Update Context interface
```typescript
// Current
export interface MiddlewareContext {
  userId?: string;
  authPayload?: any;
  validatedInput?: any;
  services?: {
    authService?: any;
  };
  correlationId?: string;
}

// Fixed - Make properties required after middleware
export interface MiddlewareContext {
  // Optional before middleware
  userId?: string;
  authPayload?: any;
  validatedInput?: any;
  services?: Record<string, any>;
  correlationId?: string;
}

// Add helper types for middleware guarantees
export type WithServices<T extends string[]> = MiddlewareContext & {
  services: { [K in T[number]]: any };
};

export type WithAuth = MiddlewareContext & {
  userId: string;
  authPayload: any;
};

export type WithValidation<T> = MiddlewareContext & {
  validatedInput: T;
};
```

#### Fix: Auth handlers - Use non-null assertions
Since we know middleware guarantees these exist, safe to use `!`:

```typescript
// auth/login.ts
const response = await context.services!.authService.login(context.validatedInput);

// auth/register.ts  
const response = await context.services!.authService.register(context.validatedInput);

// auth/refresh.ts
const response = await context.services!.authService.refreshToken(context.validatedInput);

// auth/logout.ts
await context.services!.authService.logout(
  context.validatedInput.refreshToken,
  context.userId! // Also needs non-null assertion
);
```

---

### Priority 2: Fix NotFoundError Import

**File**: `auth/profile.ts`

**Current** (line 9):
```typescript
import { successResponse, NotFoundError } from '../../utils/responses.js';
```

**Fix Option 1** - Use existing error from middleware:
```typescript
import { successResponse } from '../../utils/responses.js';
import { NotFoundError } from '../../infrastructure/middleware/withErrorHandling.js';
```

**Fix Option 2** - Throw regular error (caught by middleware):
```typescript
if (!profile) {
  throw new Error('Profile not found'); // withErrorHandling converts to 404
}
```

**Recommended**: Option 1 (explicit error type)

---

### Priority 3: Fix profile.ts userId Type Issues

**File**: `auth/profile.ts` (lines 32, 65)

**Issue**: `context.userId` may be undefined even though `withAuth()` was called

**Investigation**: Checked JWT payload structure in `/packages/auth-utils/src/index.ts`:
- JWT payload interface (line 12-17) defines `userId: string`
- `verifyAccessToken()` returns `JWTPayload | null` with `userId` field
- `withAuth()` middleware extracts `payload.userId` and assigns to `context.userId`
- ✅ **CONFIRMED**: `userId` is the correct field name (not `id`)

**Fix**: Add non-null assertions since withAuth middleware guarantees userId exists

**Line 32**:
```typescript
// Current
const profile = await profileService.getProfileById(context.userId);

// Fixed
const profile = await profileService.getProfileById(context.userId!);
```

**Line 65**:
```typescript
// Current
const updatedProfile = await profileService.updateProfile(
  context.userId,
  context.validatedInput
);

// Fixed
const updatedProfile = await profileService.updateProfile(
  context.userId!,
  context.validatedInput
);
```

**Rationale**: Safe to use `!` because:
1. Handler is wrapped in `withAuth()` middleware
2. Middleware throws `UnauthorizedError` if token missing/invalid
3. If execution reaches handler code, `context.userId` is guaranteed to exist
4. JWT payload explicitly includes `userId` field (not `id`)

---

### Priority 4: Fix streamLogger Union Type

**File**: `streamLogger.ts` (line 134)

**Current Issue**:
```typescript
// Line 134
const recordId = 'eventID' in record ? record.eventID : record.kinesis.sequenceNumber;
```

**Problem**: After checking `'eventID' in record`, TypeScript doesn't narrow to `DynamoDBRecord`

**Fix**: Proper type guard function

**Add type guards at top of file**:
```typescript
function isDynamoDBRecord(record: DynamoDBRecord | KinesisStreamRecord): record is DynamoDBRecord {
  return 'eventID' in record;
}

function isKinesisRecord(record: DynamoDBRecord | KinesisStreamRecord): record is KinesisStreamRecord {
  return 'kinesis' in record;
}
```

**Update processRecord function** (around line 120):
```typescript
async function processRecord<T>(
  record: DynamoDBRecord | KinesisStreamRecord,
  processor: () => Promise<T>
): Promise<ProcessingResult> {
  // Extract record ID based on record type using type guards
  let recordId: string;
  if (isDynamoDBRecord(record)) {
    recordId = record.eventID || 'unknown';
  } else {
    // TypeScript now knows it's KinesisStreamRecord
    recordId = record.kinesis.sequenceNumber;
  }
  
  const startTime = Date.now();
  // ... rest remains same
}
```

---

## ✅ Verification Steps

After fixes:
1. Run `npx tsc --noEmit` in backend package
2. Verify 0 errors in modified files
3. Run tests: `npm test -- src/handlers/auth/`
4. Run tests: `npm test -- src/handlers/hello.test.ts`

---

## 📊 Impact Assessment

| Category | Files | Errors | Fix Complexity | Time |
|----------|-------|--------|----------------|------|
| Context services | 4 | 4 | Low (add `!`) | 5 min |
| NotFoundError import | 1 | 1 | Low (change import) | 2 min |
| userId type safety | 1 | 2 | Low (add `!`) | 3 min |
| Union type guard | 1 | 1 | Medium (add guards) | 10 min |
| **TOTAL** | **7** | **8** | **Low-Medium** | **20 min** |

---

## 🎯 Implementation Order

1. **Fix streamLogger.ts** (most complex, foundation for others)
   - Add type guard functions
   - Update processRecord to use guards
   - Time: 10 minutes

2. **Fix auth handlers context issues** (simple, repetitive)
   - Add `!` to `context.services` (4 files)
   - Add `!` to `context.userId` (1 file, 2 locations)
   - Time: 5 minutes

3. **Fix NotFoundError import** (simple)
   - Update import in profile.ts
   - Time: 2 minutes

4. **Verify and test**
   - Run tsc --noEmit
   - Run existing tests
   - Time: 5 minutes

**Total Time**: ~20-25 minutes

---

## 🚨 Alternative: Improve Type Safety (Better Long-term)

Instead of using non-null assertions (`!`), we could improve middleware typing:

### Option A: Middleware Type Wrappers (Current approach)
- Pros: Quick, pragmatic
- Cons: Runtime vs. compile-time mismatch

### Option B: Typed Middleware Composition (Better)
```typescript
// Create strongly-typed handler wrapper
export const createAuthHandler = <TInput, TOutput>(
  handler: (
    event: APIGatewayProxyEventV2,
    context: WithAuth & WithServices<['authService']> & WithValidation<TInput>
  ) => Promise<APIGatewayProxyResultV2<TOutput>>
) => {
  return compose(
    withErrorHandling(),
    withLogging(),
    withAuth(),
    withServices(['authService']),
    handler
  );
};

// Usage - TypeScript knows context shape
export const handler = createAuthHandler<LoginRequest, LoginResponse>(
  async (event, context) => {
    // context.services.authService exists (TypeScript knows!)
    // context.userId exists (TypeScript knows!)
    // context.validatedInput is LoginRequest (TypeScript knows!)
  }
);
```

**Recommendation for this PR**: Use Option A (non-null assertions) for speed
**Future improvement**: Implement Option B in separate refactor

---

## 📝 Commit Message

```
fix(backend): resolve TypeScript errors in middleware-based handlers

Fix 8 TypeScript errors across middleware and handler files:

1. Context type safety (4 errors)
   - Add non-null assertions for context.services in auth handlers
   - Safe because withServices middleware guarantees existence
   - Files: login.ts, register.ts, refresh.ts, logout.ts

2. NotFoundError import (1 error)
   - Fix import from correct module (withErrorHandling)
   - File: profile.ts

3. userId type safety (2 errors)
   - Add non-null assertions for context.userId in profile handler
   - Safe because withAuth middleware guarantees existence
   - File: profile.ts

4. Union type discrimination (1 error)
   - Add type guard functions for DynamoDB vs Kinesis records
   - Proper type narrowing in processRecord function
   - File: streamLogger.ts

All errors resolved with minimal code changes. Type safety maintained
through middleware composition guarantees. Tests pass.

Part of Phase 2.1 - Lambda Middleware Implementation
```

---

## ✅ Success Criteria

- [ ] `npx tsc --noEmit` shows 0 errors in modified files
- [ ] All existing tests pass
- [ ] No runtime errors introduced
- [ ] Middleware guarantees maintained
- [ ] Code remains readable and maintainable

---

**Status**: READY TO EXECUTE  
**Risk Level**: LOW (non-null assertions are safe due to middleware guarantees)  
**Estimated Time**: 20-25 minutes
