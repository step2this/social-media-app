# 📊 Codebase Complexity Analysis & TDD Refactoring Plan

**Date**: 2025-10-10
**Agent**: typescript-pro
**Methodology**: TDD + Functional Programming (Same as scramblePosts.ts & apiClient.ts)

---

## 🎯 Analysis Methodology

Using the same **TDD + Functional Programming** approach successfully applied to:
- ✅ **scramblePosts.ts** (8 tests → 34 tests, complexity ~12 → ~2.0)
- ✅ **apiClient.ts** (10 tests → 55 tests, complexity ~12 → ~2.0)

**4-Phase TDD Approach**:
1. **Phase 1**: Extract Pure Helper Functions (write tests first)
2. **Phase 2**: Create Higher-Order Functions/Factories
3. **Phase 3**: Refactor Main Implementation
4. **Phase 4**: Comprehensive Testing

---

## 📈 Complete Complexity Scores (Descending Order)

| Rank | File | Score | Lines | Package | Status |
|------|------|-------|-------|---------|--------|
| 🔴 1 | `post.service.ts` | **8.5/10** | 526 | dal | ⚠️ HIGHEST |
| 🔴 2 | `auth.service.ts` | **7.7/10** | 559 | dal | ⚠️ HIGH |
| 🔴 3 | `profile.service.ts` | **7.5/10** | 355 | dal | ⚠️ HIGH |
| 🔴 4 | `CreatePostPage.tsx` | **7.4/10** | 420 | frontend | ⚠️ HIGH |
| 🔴 5 | `useAuth.ts` | **6.6/10** | 261 | frontend | ⚠️ HIGH |
| 🔴 6 | `follow-counter.ts` | **6.2/10** | 113 | backend | ⚠️ HIGH |
| 🟡 7 | `useFollow.ts` | **5.9/10** | 189 | frontend | MEDIUM |
| 🟡 8 | `MyProfilePage.tsx` | **5.4/10** | 235 | frontend | MEDIUM |
| 🟡 9 | `like-counter.ts` | **5.2/10** | 80 | backend | MEDIUM |
| 🟢 10 | `ExplorePage.tsx` | **4.5/10** | 174 | frontend | ACCEPTABLE |
| 🟢 11 | `create-post.ts` | **4.3/10** | 139 | backend | ACCEPTABLE |
| 🟢 12 | `ProfileDisplay.tsx` | **3.9/10** | 237 | frontend | GOOD |
| 🟢 13 | `PostCard.tsx` | **3.4/10** | 164 | frontend | GOOD |
| 🟢 14 | `follow.service.ts` | **3.2/10** | 164 | dal | GOOD |
| 🟢 15 | `like.service.ts` | **3.1/10** | 113 | dal | GOOD |
| 🟢 16 | `login.ts` | **2.8/10** | 54 | backend | GOOD |
| 🟢 17 | `register.ts` | **2.8/10** | 54 | backend | GOOD |
| 🟢 18 | `get-feed.ts` | **2.5/10** | 76 | backend | GOOD |
| ✅ 19 | `scramblePosts.ts` | **2.0/10** | 198 | frontend | ✅ REFACTORED |
| ✅ 20 | `apiClient.ts` | **2.0/10** | 518 | frontend | ✅ REFACTORED |

**Summary**:
- 🔴 **HIGH PRIORITY** (6.0-8.5): 6 files, 2,228 lines
- 🟡 **MEDIUM PRIORITY** (5.0-5.9): 3 files, 504 lines
- 🟢 **ACCEPTABLE/GOOD** (< 5.0): 9 files, 1,322 lines
- ✅ **ALREADY REFACTORED**: 2 files, 716 lines

---

## 🔴 HIGH PRIORITY FILES (Detailed Analysis)

### 1. post.service.ts - **8.5/10** ⚠️ MOST COMPLEX

**Location**: `packages/dal/src/services/post.service.ts`
**Lines**: 526 (LARGEST file in entire codebase)

**Complexity Indicators**:
- ❌ **N+1 Query Pattern** in `getFollowingFeedPosts` (lines 417-483)
  - Loops over each followed user individually
  - Makes separate DynamoDB query per user
  - Should use batch operations or GSI query
- ❌ **3 Duplicate Mapping Functions**:
  - `mapEntityToFeedItem` (lines ~350-380)
  - `mapEntityToPost` (lines ~300-330)
  - `mapEntityToPostGridItem` (lines ~380-410)
  - 70-80% code overlap between mappers
- ❌ **Complex `updatePost` Function** (lines 133-204, 72 lines)
  - Dynamic UpdateExpression building
  - Nested conditionals for field validation
  - Multiple UpdateCommand attempts
- ❌ **Duplicate SK Lookup Pattern** (appears 3 times)

**Refactoring Plan**:
- **TDD Cycle 1**: Extract 3 mapping functions as pure helpers
- **TDD Cycle 2**: Create `createDynamoQueryBuilder` factory
- **TDD Cycle 3**: Refactor `getFollowingFeedPosts` to eliminate N+1 using GSI1
- **TDD Cycle 4**: Extract `createUpdateExpressionBuilder` factory

**Expected Impact**:
- Lines: 526 → ~350 (33% reduction)
- New Tests: 30+
- Complexity: 8.5 → 5.0

---

### 2. auth.service.ts - **7.7/10**

**Location**: `packages/dal/src/services/auth.service.ts`
**Lines**: 559

**Complexity Indicators**:
- ❌ **Token Generation Pattern Duplicated 3 Times**:
  - `register` (lines 104-226): Generates access + refresh tokens
  - `login` (lines 231-315): Nearly identical token logic
  - `refreshToken` (lines 320-401): Similar pattern
- ❌ **Refresh Token Entity Creation Duplicated**:
  - Lines 191-207 (register)
  - Lines 272-289 (login)
  - 95% identical code
- ❌ **User Query Pattern Duplicated**:
  - Email query in register (lines 144-156)
  - Username query in register (lines 159-171)
  - Email query in login (lines 233-245)
  - Similar structure, could be abstracted
- ❌ **Large Functions**:
  - `register`: 122 lines
  - `login`: 85 lines
  - `updateUser`: 54 lines

**Refactoring Plan**:
- **TDD Cycle 1**: Extract token generation as pure function `createAuthTokens`
- **TDD Cycle 2**: Create `createRefreshTokenEntity` factory
- **TDD Cycle 3**: Abstract user query pattern as `findUserBy(field, value)`
- **TDD Cycle 4**: Create `createUserEntity` factory

**Expected Impact**:
- Lines: 559 → ~380 (32% reduction)
- New Tests: 25+
- Complexity: 7.7 → 5.5

---

### 3. profile.service.ts - **7.5/10**

**Location**: `packages/dal/src/services/profile.service.ts`
**Lines**: 355

**Complexity Indicators**:
- ❌ **Complex `updateProfile` Function** (lines 142-211, 70 lines)
  - Dynamic UpdateExpression building
  - Conditional GSI3 handling with try-catch (lines 156-183)
  - Multiple nested conditions for field updates
- ❌ **Environment Detection Logic Duplicated 2 Times**:
  - Lines 47-63 (`isLocalStack` detection)
  - Lines 339-352 (similar environment check)
- ❌ **Base URL Calculation with Multiple Conditionals** (lines 332-353)
  - Nested if/else for LocalStack vs production
  - CloudFront vs S3 direct URL logic
- ❌ **Handle Availability Check with Fallback** (lines 156-183)
  - Try-catch for GSI3 index availability
  - Should be environment-based configuration

**Refactoring Plan**:
- **TDD Cycle 1**: Extract UpdateExpression builders as pure functions
- **TDD Cycle 2**: Create environment config module with `isLocalStack()`, `getBaseUrl()`
- **TDD Cycle 3**: Create `createS3UrlBuilder` factory
- **TDD Cycle 4**: Extract handle availability logic

**Expected Impact**:
- Lines: 355 → ~260 (27% reduction)
- New Tests: 18+
- Complexity: 7.5 → 5.0

---

### 4. CreatePostPage.tsx - **7.4/10**

**Location**: `packages/frontend/src/components/posts/CreatePostPage.tsx`
**Lines**: 420

**Complexity Indicators**:
- ❌ **Complex `handleInputChange` Function** (lines 62-89, 28 lines)
  - Inline validation for caption length
  - Inline validation for tags
  - Multiple nested conditionals
- ❌ **Large `handleSubmit` Function** (lines 187-239, 53 lines)
  - Try-catch with error classification
  - Multiple API calls
  - State updates scattered throughout
- ❌ **6+ useState Hooks** - Complex state management:
  - formData, errors, uploadProgress, isDragging, isSubmitting, submitError
- ❌ **Validation Logic Mixed with UI Logic**:
  - `validateForm` (lines 161-184) could be pure function
  - `parseTagsForValidation` (lines 54-60) should be extracted
- ❌ **File Validation in Handler** (lines 92-115)
  - Should be pure validation function

**Refactoring Plan**:
- **TDD Cycle 1**: Extract validation as pure functions module
- **TDD Cycle 2**: Create `useCreatePostForm` custom hook for state management
- **TDD Cycle 3**: Extract error classification logic
- **TDD Cycle 4**: Create validators factory

**Expected Impact**:
- Lines: 420 → ~280 (33% reduction)
- New Tests: 25+
- Complexity: 7.4 → 4.5

---

### 5. useAuth.ts - **6.6/10**

**Location**: `packages/frontend/src/hooks/useAuth.ts`
**Lines**: 261

**Complexity Indicators**:
- ❌ **Error Handling Pattern Repeated 6 Times Identically**:
  ```typescript
  } catch (err) {
    const errorMessage = err instanceof ApiError || err instanceof NetworkError || err instanceof ValidationError
      ? err.message
      : 'Operation failed. Please try again.';
    setError(errorMessage);
    setLoading(false);
    throw err;
  }
  ```
  - Appears in: `login`, `register`, `logout`, `refreshAuth`, `getCurrentUser`, `updateCurrentUser`
  - Lines: 52-62, 86-94, 176-184, 206-214, and more
- ❌ **Repetitive State Updates**:
  - `setLoading(true)` → operation → `setLoading(false)`
  - Same pattern in every function
- ❌ **Nested Conditionals for Token Handling** (lines 101-104, 127-128, 221-240)

**Refactoring Plan**:
- **TDD Cycle 1**: Create `withErrorHandler` HOF to wrap operations
- **TDD Cycle 2**: Create `withLoadingState` HOF
- **TDD Cycle 3**: Extract error classification as pure function

**Expected Impact**:
- Lines: 261 → ~180 (31% reduction)
- New Tests: 15+
- Complexity: 6.6 → 4.0

---

### 6. follow-counter.ts - **6.2/10**

**Location**: `packages/backend/src/handlers/streams/follow-counter.ts`
**Lines**: 113

**Complexity Indicators**:
- ❌ **Follower/Followee Update Logic Duplicated** (lines 64-81 vs 84-100)
  - Nearly identical UpdateCommand blocks
  - Only difference: PK/SK and attribute name (followingCount vs followersCount)
- ❌ **Complex PK/SK Extraction Logic** (lines 44-58)
  - Multiple nested conditionals
  - Should be pure function
- ❌ **Conditional UpdateExpression Based on Delta** (lines 71-76, 91-96)
  - Ternary operators for ADD/SUBTRACT
  - Pattern repeated twice

**Refactoring Plan**:
- **TDD Cycle 1**: Extract PK/SK parsing as pure functions
- **TDD Cycle 2**: Create `createCounterUpdate` factory
- **TDD Cycle 3**: Abstract UpdateCommand creation
- **TDD Cycle 4**: Combine with like-counter.ts for shared pattern

**Expected Impact**:
- Lines: 113 → ~70 (38% reduction)
- New Tests: 10+
- Complexity: 6.2 → 3.5

---

## 🟡 MEDIUM PRIORITY FILES

### 7. useFollow.ts - **5.9/10**
- **Lines**: 189
- **Issue**: `followUser` and `unfollowUser` have 80% code duplication (40 lines each)
- **Refactor**: Extract `withOptimisticUpdate` HOF
- **Impact**: 189 → ~120 lines, 12+ tests, complexity 5.9 → 3.5

### 8. MyProfilePage.tsx - **5.4/10**
- **Lines**: 235
- **Issue**: Form management and modal state mixed with component logic
- **Refactor**: Extract form validation, create separate edit modal component
- **Impact**: 235 → ~160 lines, 10+ tests, complexity 5.4 → 3.5

### 9. like-counter.ts - **5.2/10**
- **Lines**: 80
- **Issue**: Similar pattern to follow-counter, can share abstraction
- **Refactor**: Create shared counter update abstraction
- **Impact**: 80 → ~50 lines, 8+ tests, complexity 5.2 → 3.0

---

## 🟢 ACCEPTABLE/GOOD FILES (No Action Needed)

These files have acceptable complexity and follow good patterns:

- **ExplorePage.tsx** (4.5/10, 174 lines) - Well-structured with hooks
- **create-post.ts** (4.3/10, 139 lines) - Good error handling
- **ProfileDisplay.tsx** (3.9/10, 237 lines) - Clean component design
- **PostCard.tsx** (3.4/10, 164 lines) - Simple, focused component
- **follow.service.ts** (3.2/10, 164 lines) - Clean service layer
- **like.service.ts** (3.1/10, 113 lines) - Good abstraction
- **login.ts** (2.8/10, 54 lines) - Minimal handler
- **register.ts** (2.8/10, 54 lines) - Minimal handler
- **get-feed.ts** (2.5/10, 76 lines) - Simple handler

---

## ✅ SUCCESS STORIES (Already Refactored)

### scramblePosts.ts - **2.0/10** ✅
- **Before**: ~12/10 complexity, 8 tests
- **After**: 2.0/10 complexity, 34 tests (300% increase)
- **Achievement**: Perfect functional style with pure functions
- **Lines**: 198 (7 exported helper functions + main function)

### apiClient.ts - **2.0/10** ✅
- **Before**: ~12/10 complexity, 10 tests, 518 lines
- **After**: 2.0/10 complexity, 55 tests (450% increase)
- **Achievement**: 16 pure helper functions + 2 factories
- **Impact**: ~240 lines of duplication eliminated

---

## 🎯 Proposed Refactoring Order

### Phase 1: Stream Processors (Week 1) - Quick Wins
**Why First?** Small files, clear duplication, demonstrate methodology

**1. follow-counter.ts + like-counter.ts (Together)**
- Create shared `createCounterUpdateHandler` factory
- Extract PK/SK parsing as pure functions
- Extract DynamoDB update operations
- **Combined Impact**: 193 lines → ~90 lines, 18+ new tests

---

### Phase 2: Service Layer Optimization (Week 2-3) - Core Business Logic
**Why Next?** Highest complexity files with most impact

**2. post.service.ts** (HIGHEST COMPLEXITY)
- TDD Cycle 1: Extract 3 mapping functions as pure helpers
- TDD Cycle 2: Create `createDynamoQueryBuilder` factory
- TDD Cycle 3: Refactor `getFollowingFeedPosts` to eliminate N+1
- TDD Cycle 4: Extract UpdateExpression builder
- **Result**: 526 lines → ~350 lines, 30+ new tests

**3. auth.service.ts**
- TDD Cycle 1: Extract token generation/storage as pure functions
- TDD Cycle 2: Create `createUserEntity` factory
- TDD Cycle 3: Abstract DynamoDB query patterns
- **Result**: 559 lines → ~380 lines, 25+ new tests

**4. profile.service.ts**
- TDD Cycle 1: Extract UpdateExpression builders
- TDD Cycle 2: Create environment config module
- TDD Cycle 3: Extract URL building as pure functions
- **Result**: 355 lines → ~260 lines, 18+ new tests

---

### Phase 3: Frontend Hooks & Components (Week 4) - User-Facing Code
**Why Last?** Builds on backend patterns, lower risk

**5. useAuth.ts**
- TDD Cycle 1: Create `withErrorHandler` HOF
- TDD Cycle 2: Extract error classification logic
- **Result**: 261 lines → ~180 lines, 15+ new tests

**6. useFollow.ts**
- TDD Cycle 1: Create `withOptimisticUpdate` HOF
- TDD Cycle 2: Extract rollback logic
- **Result**: 189 lines → ~120 lines, 12+ new tests

**7. CreatePostPage.tsx**
- TDD Cycle 1: Extract validation as pure functions
- TDD Cycle 2: Create form state management hook
- **Result**: 420 lines → ~280 lines, 25+ new tests

---

## 📊 Expected Overall Outcomes

### Aggregate Impact
- **Total Lines Reduced**: ~2,700 → ~1,800 (33% reduction)
- **New Tests Added**: 150+ tests
- **Average Complexity**: 7.0 → 4.5 (36% improvement)
- **Maintainability**: HIGH - pure functions, factories, HOFs
- **Bug Risk**: LOWER - comprehensive test coverage
- **Code Reuse**: HIGH - shared abstractions and utilities

### Per-File Success Metrics
✅ Cyclomatic complexity < 5
✅ No function > 30 lines
✅ 3x increase in test coverage minimum
✅ DRY principle satisfied (no >5 line duplication)
✅ All functions pure or clearly marked as effectful
✅ All 347+ tests passing after each change

### Code Quality Improvements
- **Pure Functions**: Predictable, testable, composable
- **Factory Pattern**: DRY, configurable, scalable
- **Higher-Order Functions**: Reusable operation wrappers
- **Immutable Data**: Safer state management
- **Comprehensive Tests**: Confidence in refactoring

---

## 🚀 Execution Guidelines

### Per-File Workflow
1. **Read & Analyze** - Understand current implementation
2. **Write Tests First** - TDD approach, tests before refactor
3. **Extract Helpers** - Pure functions with unit tests
4. **Create Factories** - Eliminate duplication with HOFs
5. **Refactor Main** - Use new helpers and factories
6. **Verify Tests** - All 347+ tests must pass
7. **Git Commit** - Commit after successful refactor

### Quality Gates
- ❌ **STOP** if any test fails
- ❌ **STOP** if complexity increases
- ❌ **STOP** if duplication increases
- ✅ **PROCEED** only when all tests green

### Agent & Tools
- **Agent**: `typescript-pro` (specialized in TS refactoring)
- **Methodology**: 4-Phase TDD (same as scramblePosts & apiClient)
- **Testing**: Vitest with comprehensive coverage
- **Verification**: Run full test suite after each change

---

## 📝 Notes

### Complexity Scoring Methodology
Complexity score calculated using weighted formula:
- **Line Count** (weight: 0.2): More lines = more complexity
- **Cyclomatic Complexity** (weight: 0.4): Nested conditionals, loops
- **Duplication Score** (weight: 0.3): Repetitive patterns
- **Function Length** (weight: 0.1): Methods > 50 lines

### Why This Order?
1. **Phase 1** (Stream Processors): Quick wins, demonstrate methodology
2. **Phase 2** (Services): Highest impact, core business logic
3. **Phase 3** (Frontend): Builds on patterns, user-facing refinement

### Risk Management
- One file at a time
- Full test suite verification after each change
- Git commit after each successful refactor
- Rollback if tests fail or complexity increases

---

**Ready to Begin Phase 1?**
Start with `follow-counter.ts + like-counter.ts` for quick wins and methodology demonstration.
