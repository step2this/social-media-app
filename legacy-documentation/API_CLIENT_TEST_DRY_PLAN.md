# API Client Test DRY Optimization Plan

## Analysis

The `apiClient.test.ts` file is 802 lines and contains:
- **Token Authentication Tests** (~210 lines)
- **Helper Function Tests** (~400 lines)
- **Error Classification Tests** (~100 lines)
- **Retry Logic Tests** (~50 lines)
- **Token Storage Tests** (~40 lines)

## Recommendation

**DO NOT DRY UP THIS FILE** - Here's why:

### 1. Helper Functions Already Extracted

The helper functions being tested in `apiClient.test.ts` have already been extracted to dedicated modules:
- `httpHelpers.ts` → tested in `httpHelpers.test.ts` ✅ (already DRYed up)
- `httpFactories.ts` → tested in `httpFactories.test.ts` ✅ (already DRYed up)
- `httpErrors.ts` → should have dedicated test file

### 2. Duplicate Test Coverage

Currently `apiClient.test.ts` tests helper functions that are ALSO tested in their dedicated test files. This is redundant.

### 3. Better Approach

Instead of DRYing up `apiClient.test.ts`, we should:

**Option A: Remove Redundant Tests** (RECOMMENDED)
1. Remove helper function tests from `apiClient.test.ts`
2. Keep only integration tests that test the actual API client behavior
3. This would reduce the file from ~800 lines to ~300 lines
4. Clearer separation of concerns: unit tests vs integration tests

**Option B: Extract Error Tests**
1. Create `httpErrors.test.ts` for error classification functions
2. Remove error tests from `apiClient.test.ts`
3. Keep API client integration tests

## Proposed File Structure

```
/services/http/
├── httpErrors.ts
├── httpHelpers.ts
├── httpFactories.ts
└── __tests__/
    ├── httpErrors.test.ts      # ← CREATE THIS (unit tests)
    ├── httpHelpers.test.ts     # ✅ Already optimized
    └── httpFactories.test.ts   # ✅ Already optimized

/services/
├── apiClient.ts
└── apiClient.test.ts           # ← SLIM DOWN (integration tests only)
```

## Impact Analysis

### Current State
- `apiClient.test.ts`: 802 lines (unit + integration tests mixed)
- `httpHelpers.test.ts`: ~260 lines (DRYed up ✅)
- `httpFactories.test.ts`: ~350 lines (DRYed up ✅)
- `httpErrors.test.ts`: MISSING

### Proposed State
- `apiClient.test.ts`: ~300 lines (integration tests only)
- `httpHelpers.test.ts`: ~260 lines (unit tests)
- `httpFactories.test.ts`: ~350 lines (unit tests)
- `httpErrors.test.ts`: ~200 lines (unit tests) ← NEW

### Benefits
1. ✅ **Clearer separation**: Unit tests separate from integration tests
2. ✅ **Faster test execution**: Unit tests run independently
3. ✅ **Better maintainability**: Changes to helpers don't require updating integration tests
4. ✅ **No duplication**: Each function tested in one place
5. ✅ **Easier debugging**: Clear which layer has issues

## Recommendation

**Create `httpErrors.test.ts` and slim down `apiClient.test.ts`** to focus on integration testing only.

This follows testing best practices:
- Unit tests for pure functions (helpers, factories, errors)
- Integration tests for composed behavior (API client)
