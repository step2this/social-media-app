# TypeScript Type Narrowing Guide for Tests

## The Problem

When testing async results with discriminated unions (`AsyncState<T>`), you need to narrow the type to access specific properties. The basic type guard pattern creates redundant checks in tests:

```typescript
// ❌ PROBLEM: Redundant checks
expect(isSuccess(result)).toBe(true);  // Test assertion
if (isSuccess(result)) {               // Type narrowing (redundant in test context)
  expect(result.data.foo).toBe('bar');
}
```

If the first `expect` fails, the test stops - so the `if` block always executes if reached.

## Three Solutions (Ranked)

### 1. ✅ BEST: Assertion Functions

Use `assertSuccess()` - it both throws AND narrows the type:

```typescript
// ✅ Single assertion that narrows type + verifies
const result = await service.doSomething();
assertSuccess(result);  // Throws if not success + TypeScript narrows type
expect(result.data.foo).toBe('bar');  // TypeScript knows result.data exists
```

**Pros:**
- Clean, concise code
- Single source of truth
- Test fails immediately with clear error
- TypeScript automatically narrows type

**Use when:** Most test scenarios (default choice)

### 2. ✅ GOOD: Type Assertion After Verification

Explicit verification followed by type assertion:

```typescript
// ✅ Explicit check + manual type assertion
const result = await service.doSomething();
expect(isSuccess(result)).toBe(true);

// Type assertion since we already verified above
const successResult = result as Extract<typeof result, { status: 'success' }>;
expect(successResult.data.foo).toBe('bar');
```

**Pros:**
- Explicit test verification visible
- Clear that we're asserting type based on prior check
- Good for code reviews where explicitness helps

**Use when:** You want explicit visibility of the success check in test output

### 3. ⚠️ ACCEPTABLE: Current Pattern

Keep both test assertion and type guard:

```typescript
// ⚠️ Works but redundant
expect(isSuccess(result)).toBe(true);  // Test assertion
if (isSuccess(result)) {                // Type narrowing for TypeScript
  expect(result.data.foo).toBe('bar');
}
```

**Pros:**
- Works correctly at runtime
- Familiar pattern

**Cons:**
- Redundant check (test + type guard)
- More verbose
- Can confuse readers about necessity

**Use when:** Not worth refactoring existing tests, but avoid in new code

## Real Example: Before & After

### Before (Redundant Pattern)
```typescript
test('should fetch user data', async () => {
  const result = await service.getUser('123');
  
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.data.name).toBe('John');
    expect(result.data.email).toBe('john@example.com');
  }
});
```

### After (Assertion Function)
```typescript
test('should fetch user data', async () => {
  const result = await service.getUser('123');
  
  assertSuccess(result);
  expect(result.data.name).toBe('John');
  expect(result.data.email).toBe('john@example.com');
});
```

## Available Assertion Functions

From `/Users/shaperosteve/social-media-app/packages/frontend/src/graphql/types.ts`:

```typescript
import { 
  assertSuccess,  // Asserts status === 'success'
  assertError,    // Asserts status === 'error'
  isSuccess,      // Type guard (use for explicit checks)
  isError,        // Type guard (use for explicit checks)
} from '../graphql/types';
```

## When to Use Type Guards vs Assertions

| Scenario | Use | Example |
|----------|-----|---------|
| Testing happy path | `assertSuccess()` | `assertSuccess(result); expect(result.data.x).toBe(y);` |
| Testing error path | `assertError()` | `assertError(result); expect(result.error.message).toBe('...');` |
| Conditional logic in prod code | `isSuccess()` / `isError()` | `if (isSuccess(result)) { return result.data; }` |
| Explicit test verification | `expect(isSuccess(...))` + assertion | See Solution #2 above |

## Summary

**Default choice:** Use `assertSuccess()` or `assertError()` in tests for clean, single-line type narrowing.

**Alternative:** If you prefer explicit expect statements, use type assertion after verification.

**Avoid:** Redundant `expect().toBe(true)` followed by `if (isTypeGuard())` in new code.
