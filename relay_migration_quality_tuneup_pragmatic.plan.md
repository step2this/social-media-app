# Relay Migration Quality Tune-up Plan (Pragmatic)

## Overview
Pragmatic quality improvements after Relay migration Phase 1 & 2. Fix critical errors, remove dead code, leverage existing infrastructure. Focus on behavior over implementation.

## Phase 1: Remove Dead Code (Clean First, Fix Second)

### 1.1 Delete Unused Test Files
**Action:** Remove test files for deleted hooks (no need to fix what shouldn't exist)

**Files to Delete:**
```bash
# Deleted hooks
rm packages/frontend/src/hooks/useLike.test.ts
rm packages/frontend/src/hooks/useFollow.test.ts

# Empty test files (0 tests)
rm packages/frontend/src/components/common/UserLink.test.tsx
```

**Rationale:** These test REST-based hooks that were deleted in Relay migration. No point fixing - just remove.

---

### 1.2 Delete/Fix follow-state-helpers
**File:** `/Users/shaperosteve/social-media-app/packages/frontend/src/utils/follow-state-helpers.ts`

**Investigation Required:** Check if file is still used
```bash
grep -r "follow-state-helpers" packages/frontend/src/ --exclude-dir=node_modules
```

**Decision Tree:**
- **If UNUSED:** Delete both `.ts` and `.test.ts` files
- **If USED:** Remove import on line 6, define `UseFollowOptions` inline:
  ```typescript
  interface UseFollowOptions {
    initialIsFollowing?: boolean;
  }
  ```

---

## Phase 2: Fix Type Errors (Pragmatic Fixes)

### 2.1 Fix Enum Case Mismatches (Find/Replace)
**File:** `/Users/shaperosteve/social-media-app/packages/frontend/src/test-utils/relay-fixture-adapters.ts`

**Simple Solution:** Use editor find/replace (case-sensitive):
```typescript
// Find and replace ALL occurrences:
"UNREAD" → "unread"
"READ" → "read"
"LIKE" → "like"
"COMMENT" → "comment"
"FOLLOW" → "follow"
```

**Lines affected:** 127-128, 143-145, 159-161, 178, 195

---

### 2.2 Fix relay-fixture-adapters Imports
**File:** `/Users/shaperosteve/social-media-app/packages/frontend/src/test-utils/relay-fixture-adapters.ts`

**Option A (Recommended):** Delete file if not used by any tests
```bash
grep -r "relay-fixture-adapters" packages/frontend/src/ --exclude-dir=node_modules
```

**Option B:** Fix imports if still needed:
- Line 21: Remove unused `createMockNotificationConnection`
- Line 25: Remove `createSystemNotification` import (doesn't exist)
- Line 27: Import `Notification` from correct location (check schema)

---

### 2.3 Fix relay-test-utils.ts MockEnvironment
**File:** `/Users/shaperosteve/social-media-app/packages/frontend/src/test-utils/relay-test-utils.ts`

**Investigation:** Check if file is actually used
```bash
grep -r "relay-test-utils" packages/frontend/src/ --exclude="relay-test-utils.ts" --exclude-dir=node_modules
```

**Decision:**
- **If UNUSED:** Delete the file
- **If USED:** Import correct types from `relay-test-utils`:
  ```typescript
  import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
  import type { OperationDescriptor } from 'relay-runtime';
  
  // Add type annotations to operation parameters
  (operation: OperationDescriptor) => { ... }
  ```

---

### 2.4 Fix Simple Type Errors (5 min fixes)

**DevKinesisMonitor.tsx** (Line 290):
```typescript
// Add null check or default
const url = import.meta.env.VITE_KINESIS_URL ?? '';
```

**DevReadStateDebugger.test.tsx** (Lines 12, 21):
```typescript
// Replace mediaUrl with imageUrl
imageUrl: 'http://example.com/image.jpg',
```

**auth-response-handlers.test.ts**:
```typescript
// Replace null with undefined
tokens: undefined  // not tokens: null

// Remove updatedAt property (not in type)
const user = {
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  createdAt: new Date().toISOString(),
  emailVerified: true,
  // Remove: updatedAt
};
```

---

## Phase 3: Fix Test Infrastructure (Leverage Existing)

### 3.1 Fix localStorage Mock (One-Line Fix)
**File:** `/Users/shaperosteve/social-media-app/packages/frontend/src/test-setup.ts`

**Current Issue:** Tests fail because localStorage.clear is not a function

**Solution:** Check if mock already exists, if not add:
```typescript
// In test-setup.ts global setup
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
  writable: true,
});
```

---

### 3.2 Add Vitest Imports (Auto-fix via ESLint)
**Problem:** Multiple test files missing vitest globals

**Solution:** Run ESLint auto-fix first:
```bash
npm run lint -- --fix
```

**Manual fix if needed** (add to top of affected test files):
```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
```

**Affected Files (only if auto-fix doesn't work):**
- DevApiLogger.test.tsx
- DevFeedSourceBadge.test.tsx
- DevReadStateDebugger.test.tsx

---

### 3.3 Fix test-setup.ts Implicit Any
**File:** Line 56 - likely a global assignment

**Pattern from SKILL.md:** Use type assertion or interface extension:
```typescript
// Option A: Type assertion
(global as any).someProperty = value;

// Option B: Interface extension (better)
declare global {
  var someProperty: SomeType;
}
global.someProperty = value;
```

---

## Phase 4: Remove Unused Imports (Automated)

### 4.1 Run ESLint Auto-fix
```bash
npm run lint -- --fix
```

**Expected removals:**
- `relay-fixture-adapters.ts:21` - createMockNotificationConnection
- `follow-state-helpers.test.ts:12` - FollowStateSnapshot
- `relay-test-utils.ts:15` - OperationType
- `auth-response-handlers.test.ts:7` - AuthTokens
- `image-helpers.ts:6` - ALLOWED_IMAGE_TYPES
- `image-helpers.ts:132` - error parameter

### 4.2 Fix DevCacheStatusIndicator.test.tsx
```typescript
// Remove unused import
import { render } from '@testing-library/react';  // remove 'act'

// Fix readonly property with proper env mock
vi.stubEnv('VITE_API_URL', 'test-url');
// OR use import.meta.env mock from vitest config
```

---

## Phase 5: Validate Changes

### 5.1 Run Type Check
```bash
cd packages/frontend && npm run typecheck
```

**Expected:** 0 errors (down from ~80+ current errors)

### 5.2 Run Tests
```bash
cd packages/frontend && npm test
```

**Strategy:**
1. Run tests to see actual failures
2. Fix only tests that are actually used
3. Delete tests for deleted components/hooks

---

## Phase 6: Apply SKILL.md Patterns (If Refactoring Needed)

### 6.1 Discriminated Unions for Result Types
**Pattern 6 from SKILL.md** - Already used in codebase:
```typescript
type Result<T, E = Error> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };
```

### 6.2 Type-Safe Error Handling
**Assertion Functions (Section 3 from SKILL.md)**:
```typescript
function assertIsDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Value is not defined');
  }
}
```

### 6.3 Const Assertions for Enum-like Values
**Best Practice #6 from SKILL.md**:
```typescript
const NotificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
  ARCHIVED: 'archived',
} as const;

type NotificationStatus = typeof NotificationStatus[keyof typeof NotificationStatus];
```

---

## Phase 7: Documentation

### 7.1 Update README if Needed
- Remove references to deleted GraphQL services (if any)
- Document Relay testing patterns

### 7.2 Create Completion Summary
**New File:** `RELAY_QUALITY_TUNEUP_COMPLETE.md`

Brief summary:
- Issues fixed (count)
- Files deleted (count)
- Test changes (count)
- Type errors resolved (before/after)

---

## Estimated Time

| Phase | Duration |
|-------|----------|
| Phase 1: Dead Code Removal | 10 min |
| Phase 2: Type Error Fixes | 20 min |
| Phase 3: Test Infrastructure | 15 min |
| Phase 4: Unused Imports (automated) | 5 min |
| Phase 5: Validation | 15 min |
| Phase 6: SKILL.md Patterns (if needed) | 15 min |
| Phase 7: Documentation | 10 min |
| **Total** | **~90 minutes** |

---

## Success Criteria

- ✅ Zero TypeScript compilation errors
- ✅ All tests passing (or deleted if obsolete)
- ✅ No unused imports
- ✅ Clean codebase ready for Phase 3

---

## Pragmatic Principles Applied

1. **Delete before Fix:** Remove obsolete code first
2. **Leverage Existing:** Use shared fixtures and helpers
3. **Automate:** Let ESLint do the work
4. **Investigate First:** Check if code is used before fixing
5. **Test Behavior:** Focus on what code does, not how
6. **SKILL.md Patterns:** Apply advanced TypeScript when refactoring
7. **DRY Tests:** Reuse fixtures, no mocks/spies

---

## Risk Mitigation

1. **Check usage before deletion:** Use grep to verify
2. **One phase at a time:** Validate after each phase
3. **Commit frequently:** Atomic commits per logical change
4. **Run tests often:** Catch regressions early

---

## Investigation Commands

```bash
# Check if follow-state-helpers is used
grep -r "follow-state-helpers" packages/frontend/src/ --exclude-dir=node_modules

# Check if relay-fixture-adapters is used
grep -r "relay-fixture-adapters" packages/frontend/src/ --exclude-dir=node_modules

# Check if relay-test-utils is used
grep -r "relay-test-utils" packages/frontend/src/ --exclude="relay-test-utils.ts" --exclude-dir=node_modules

# Find all test files with 0 tests
grep -r "test\|describe" packages/frontend/src/**/*.test.ts* --exclude-dir=node_modules | wc -l
```

---

## Next Steps After Completion

1. **Phase 3:** Service layer cleanup (remaining REST services)
2. **Bundle analysis:** Verify deleted services aren't in bundle
3. **Performance baseline:** Measure improvements
4. **Developer docs:** Update Relay testing guide