# HTTP Factories TypeScript Improvements

## Summary

Enhanced type safety in `/packages/frontend/src/services/http/httpFactories.ts` and test file following TypeScript advanced types best practices from SKILL.md guidelines.

## Changes Made

### 1. Created Dedicated `ValidationSchema` Interface ✅

**Before:**
```typescript
export interface AuthMethodConfig<TReq, TRes> {
  requestSchema: { parse: (data: unknown) => TReq };
  responseSchema: { parse: (data: unknown) => TRes };
  // ...
}
```

**After:**
```typescript
/**
 * Schema interface for validation - matches Zod's parse signature
 */
export interface ValidationSchema<T> {
  parse: (data: unknown) => T;
}

export interface AuthMethodConfig<TReq, TRes> {
  requestSchema: ValidationSchema<TReq>;
  responseSchema: ValidationSchema<TRes>;
  // ...
}
```

**Benefits:**
- ✅ Follows best practice: "Prefer `interface` for object shapes"
- ✅ Better documentation and reusability
- ✅ Clearer intent - explicitly represents validation schemas
- ✅ Can be extended in the future if needed

### 2. Added Type Guard for Zod Errors ✅

**Before:**
```typescript
if ((error as any)?.name === 'ZodError') {
  throw createZodValidationError(error);
}
```

**After:**
```typescript
/**
 * Type guard to check if an error is a Zod validation error
 * Following best practice: use type guards instead of type assertions
 */
function isZodError(error: unknown): error is { name: 'ZodError' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ZodError'
  );
}

// Usage
if (isZodError(error)) {
  throw createZodValidationError(error);
}
```

**Benefits:**
- ✅ Follows best practice: "Use type guards instead of type assertions"
- ✅ Eliminates unsafe `any` type assertion
- ✅ Proper type narrowing with runtime checks
- ✅ Better error handling - checks all conditions before accessing properties

### 3. Implemented Function Overloads for Type Narrowing ✅

**Problem:**
When using a single arrow function with conditional logic for different HTTP methods, TypeScript couldn't properly narrow the return type based on the method parameter. This caused type errors when calling the methods with data parameters.

**Before:**
```typescript
export const createHttpMethod = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => <T>(
  sendRequest: SendRequestFn,
  retryConfig: RetryConfig
) => {
  if (method === 'GET') {
    return async (endpoint: string, includeAuth: boolean = true): Promise<T> => ...
  }
  return async (endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => ...
};
```

**After:**
```typescript
// Overload signature for GET method (no data parameter)
export function createHttpMethod(method: 'GET'): <T>(
  sendRequest: SendRequestFn,
  retryConfig: RetryConfig
) => (endpoint: string, includeAuth?: boolean) => Promise<T>;

// Overload signature for POST/PUT/PATCH/DELETE methods (includes data parameter)
export function createHttpMethod(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'): <T>(
  sendRequest: SendRequestFn,
  retryConfig: RetryConfig
) => (endpoint: string, data?: unknown, includeAuth?: boolean) => Promise<T>;

// Implementation signature
export function createHttpMethod(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') {
  return <T>(sendRequest: SendRequestFn, retryConfig: RetryConfig) => {
    if (method === 'GET') {
      return async (endpoint: string, includeAuth: boolean = true): Promise<T> => ...
    }
    return async (endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> => ...
  };
}
```

**Benefits:**
- ✅ Follows best practice: "Use function overloads for complex conditional types"
- ✅ TypeScript properly narrows the return type based on the method parameter
- ✅ GET methods correctly show no `data` parameter in autocomplete
- ✅ POST/PUT/PATCH/DELETE methods correctly show `data` parameter as optional
- ✅ Eliminates type errors when calling methods with proper arguments
- ✅ Better developer experience with accurate IntelliSense

**TypeScript Pattern Used:**
This implements the **Function Overload** pattern from the TypeScript guidelines, which is the recommended approach when a function's return type depends on its input parameters. This is superior to using conditional types or type assertions.

### 4. Replaced `any` with `unknown` in Tests (where appropriate) ✅

**Before:**
```typescript
const getMethod = createHttpMethod('GET')<any>(mockSendRequest, mockRetryConfig);
```

**After:**
```typescript
const getMethod = createHttpMethod('GET')<unknown>(mockSendRequest, mockRetryConfig);
```

**Benefits:**
- ✅ Follows best practice: "Use `unknown` over `any`"
- ✅ Forces type checking - safer than `any`
- ✅ Still allows testing without overly specific types
- ✅ Applied consistently across all 10+ test cases

### 4. Improved Type Casting in Mock Functions ✅

**Before:**
```typescript
const createMockSendRequest = (): SendRequestFn => {
  return vi.fn(async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return { success: true, endpoint, method: options?.method } as T;
  });
};
```

**After:**
```typescript
const createMockSendRequest = (): SendRequestFn => {
  return vi.fn(async (endpoint: string, options?: RequestInit) => {
    return { success: true, endpoint, method: options?.method };
  }) as SendRequestFn;
};
```

**Benefits:**
- ✅ Cleaner type assertion - cast the entire mock function
- ✅ Avoids generic type parameter confusion in arrow functions
- ✅ More maintainable and readable
- ✅ Proper alignment with `SendRequestFn` interface

## TypeScript Best Practices Applied

From SKILL.md guidelines, we successfully applied:

1. ✅ **Use `unknown` over `any`** - Replaced all test `any` types with `unknown`
2. ✅ **Prefer `interface` for object shapes** - Created `ValidationSchema` interface
3. ✅ **Use type guards instead of assertions** - Implemented `isZodError` type guard
4. ✅ **Document complex types** - Added JSDoc comments to new types
5. ✅ **Leverage type inference** - Let TypeScript infer return types where possible

## Files Modified

1. `/packages/frontend/src/services/http/httpFactories.ts`
   - Added `ValidationSchema<T>` interface
   - Added `isZodError` type guard
   - Updated `AuthMethodConfig` to use `ValidationSchema`
   - Replaced unsafe type assertion with type guard

2. `/packages/frontend/src/services/http/__tests__/httpFactories.test.ts`
   - Replaced all `<any>` with `<unknown>` (10+ instances)
   - Improved mock function type casting
   - Added `ValidationSchema` to imports

## Validation Results

All changes compile successfully with TypeScript strict mode:
- ✅ No new TypeScript errors introduced
- ✅ All existing tests pass
- ✅ Type safety maintained throughout
- ✅ Only pre-existing errors in unrelated graphql-server package

## Impact

### Type Safety
- **Before:** Unsafe `any` assertions allowed type errors to slip through
- **After:** Strict type checking with `unknown` and proper type guards

### Maintainability
- **Before:** Inline object types made intent unclear
- **After:** Named interfaces document purpose and can be reused

### Best Practices Alignment
- **Before:** Mixed use of assertions and loose typing
- **After:** Consistent use of TypeScript advanced patterns

## Conclusion

Successfully enhanced the codebase with TypeScript advanced types following industry best practices. The changes improve type safety without sacrificing developer experience or test simplicity.
