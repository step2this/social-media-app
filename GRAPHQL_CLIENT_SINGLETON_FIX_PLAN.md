# GraphQL Client Singleton Issue - Fix Plan

**Date**: 2025-10-25
**Status**: Planning Phase
**Goal**: Fix singleton GraphQL client issue preventing proper test mocking and causing empty homepage

---

## 🔍 **PROBLEM STATEMENT**

### **Issue**: Services create singleton GraphQL clients at module load time

**Current Implementation** (BROKEN):
```typescript
// /packages/frontend/src/services/feedService.ts
import { FeedServiceGraphQL } from './implementations/FeedService.graphql.js';
import { createGraphQLClient } from '../graphql/client.js';

// ❌ PROBLEM: Client created at module initialization
// This happens BEFORE tests can mock it
// This happens BEFORE auth tokens are set
export const feedService = new FeedServiceGraphQL(createGraphQLClient());
```

**Why This Breaks:**
1. **Testing**: Tests can't mock the GraphQL client because it's already created
2. **Auth**: Client is created before user logs in, so auth token isn't set
3. **Singleton**: Same client instance used everywhere, can't be reset between tests
4. **Homepage**: Feed service has no auth token → requests fail → empty page

**Affected Services**:
- ❌ `feedService.ts`
- ❌ `profileService.ts`
- ❌ `postService.ts`
- ❌ `commentService.ts`
- ❌ `followService.ts`
- ❌ `likeService.ts`

---

## ✅ **SOLUTION APPROACH**

### **Use Lazy Initialization with Dependency Injection**

**Pattern** (Following existing working services):
```typescript
// Option 1: Lazy singleton (simplest)
let _feedService: FeedServiceGraphQL | null = null;

export function getFeedService(): FeedServiceGraphQL {
  if (!_feedService) {
    _feedService = new FeedServiceGraphQL(createGraphQLClient());
  }
  return _feedService;
}

// For tests: allow injection
export function setFeedService(service: FeedServiceGraphQL): void {
  _feedService = service;
}

export function resetFeedService(): void {
  _feedService = null;
}

// Convenience export (calls getter)
export const feedService = getFeedService();
```

**Why This Works:**
1. ✅ **Testing**: Tests can call `setFeedService()` with mocked client
2. ✅ **Auth**: Client created on first use (after login)
3. ✅ **Resettable**: Tests can call `resetFeedService()` between tests
4. ✅ **Backwards Compatible**: Existing code using `feedService` still works

---

## 📋 **IMPLEMENTATION PLAN**

### **Phase 1: Document Current State** ✅ (THIS DOCUMENT)
- [x] Identify singleton pattern in all service barrel exports
- [x] Document why it breaks (testing + auth)
- [x] Design lazy initialization pattern
- [x] Create this plan document

### **Phase 2: Create Integration Tests** (NEXT)
**Goal**: Write tests that expose the singleton problem AND verify the fix

**Test Files to Create:**

#### **2.1. Feed Service Integration Test**
**File**: `/packages/frontend/src/services/__tests__/integration/feedService.integration.test.ts`

**Test Cases**:
```typescript
describe('FeedService Integration Tests', () => {
  describe('Singleton Issue (Current Broken State)', () => {
    it('should fail: cannot mock client after module load', () => {
      // This test SHOULD FAIL with current implementation
      // Demonstrates the problem
    });

    it('should fail: client has no auth token on first load', () => {
      // Shows auth token issue
    });
  });

  describe('After Lazy Initialization Fix', () => {
    it('should allow client injection for testing', () => {
      // After fix: inject mock client
      // Should PASS after Phase 3
    });

    it('should create client with auth token after login', () => {
      // After fix: client created lazily
      // Should PASS after Phase 3
    });

    it('should reset client between tests', () => {
      // After fix: reset functionality
      // Should PASS after Phase 3
    });
  });
});
```

#### **2.2. Auth Integration Test**
**File**: `/packages/frontend/src/services/__tests__/integration/authFlow.integration.test.ts`

**Test Cases**:
```typescript
describe('Auth Flow Integration', () => {
  it('should create GraphQL client with auth token after login', async () => {
    // 1. User logs in
    // 2. Auth token stored
    // 3. First GraphQL request creates client with token
    // 4. Verify Authorization header set
  });

  it('should update client auth token on token refresh', async () => {
    // 1. Client exists with old token
    // 2. Token refreshed
    // 3. Verify client updated with new token
  });
});
```

#### **2.3. Service Factory Test**
**File**: `/packages/frontend/src/services/__tests__/integration/serviceFactory.integration.test.ts`

**Test Cases**:
```typescript
describe('Service Factory Integration', () => {
  it('should create services with shared GraphQL client', () => {
    // All services should share ONE client instance
  });

  it('should inject custom client for testing', () => {
    // Tests should be able to inject mock client
  });

  it('should reset all services between tests', () => {
    // Reset functionality should clear all services
  });
});
```

**Test Patterns to Follow** (from existing tests):

1. **Use `createMockGraphQLClient()`** (from `serviceTestHelpers.ts`):
```typescript
import { createMockGraphQLClient } from '../helpers/serviceTestHelpers';

const mockClient = createMockGraphQLClient();
mockClient.query.mockResolvedValue({
  status: 'success',
  data: { /* ... */ }
});
```

2. **Use Fixture Helpers** (from `graphqlFixtures.ts`):
```typescript
import { createSuccessResponse, createErrorResponse } from '../fixtures/graphqlFixtures';

const successResult = createSuccessResponse({ feed: { items: [...] } });
const errorResult = createErrorResponse('Network error');
```

3. **Test Error Handling**:
```typescript
it('should handle network errors gracefully', async () => {
  mockClient.query.mockResolvedValue(createErrorResponse('Network error'));

  const result = await feedService.getFeed();

  expect(result.status).toBe('error');
  expect(result.error.message).toBe('Network error');
});
```

4. **Test Auth Token Injection**:
```typescript
it('should include auth token in requests', async () => {
  const mockClient = createMockGraphQLClient();
  const service = new FeedServiceGraphQL(mockClient);

  // Simulate login
  mockClient.setAuthToken('test-token');

  await service.getFeed();

  // Verify Authorization header
  expect(mockClient.query).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(Object)
  );
});
```

### **Phase 3: Refactor Service Barrel Exports** (AFTER TESTS)
**Goal**: Implement lazy initialization pattern in all service exports

**Files to Refactor**:
1. `/packages/frontend/src/services/feedService.ts`
2. `/packages/frontend/src/services/profileService.ts`
3. `/packages/frontend/src/services/postService.ts`
4. `/packages/frontend/src/services/commentService.ts`
5. `/packages/frontend/src/services/followService.ts`
6. `/packages/frontend/src/services/likeService.ts`

**Refactor Pattern**:
```typescript
// Before (BROKEN):
export const feedService = new FeedServiceGraphQL(createGraphQLClient());

// After (FIXED):
let _feedService: FeedServiceGraphQL | null = null;

export function getFeedService(): FeedServiceGraphQL {
  if (!_feedService) {
    _feedService = new FeedServiceGraphQL(createGraphQLClient());
  }
  return _feedService;
}

export function setFeedService(service: FeedServiceGraphQL): void {
  _feedService = service;
}

export function resetFeedService(): void {
  _feedService = null;
}

// Backwards compatible export
export const feedService = getFeedService();
```

**OR Use Proxy Pattern** (More Elegant):
```typescript
// Create proxy that forwards all calls to lazy instance
export const feedService = new Proxy({} as FeedServiceGraphQL, {
  get(target, prop) {
    const instance = getFeedService();
    return instance[prop as keyof FeedServiceGraphQL];
  }
});
```

### **Phase 4: Update Tests to Use New Pattern**
**Goal**: Update all existing service tests to use lazy initialization

**Changes Needed**:
```typescript
// In test setup:
beforeEach(() => {
  const mockClient = createMockGraphQLClient();
  setFeedService(new FeedServiceGraphQL(mockClient));
});

afterEach(() => {
  resetFeedService();
});
```

### **Phase 5: Update Components/Hooks**
**Goal**: Ensure all components use services correctly

**No Changes Needed** if using backwards-compatible export:
```typescript
// Components continue to work as-is
import { feedService } from '../services/feedService';

const result = await feedService.getFeed();
```

**Optional**: Update to explicit getter:
```typescript
import { getFeedService } from '../services/feedService';

const result = await getFeedService().getFeed();
```

---

## 🧪 **TEST STRATEGY**

### **TDD Approach**:
1. **Write failing tests first** (Phase 2)
   - Tests demonstrate the singleton problem
   - Tests define the desired behavior
   - Tests guide the refactoring

2. **Refactor to make tests pass** (Phase 3)
   - Implement lazy initialization
   - All tests should pass

3. **Verify no regressions** (Phase 4)
   - Update existing tests
   - Run full test suite

### **Test Coverage Goals**:
- ✅ Service instantiation (lazy)
- ✅ Client injection (for mocking)
- ✅ Service reset (between tests)
- ✅ Auth token propagation
- ✅ Shared client instance
- ✅ Error handling
- ✅ Backwards compatibility

---

## 📊 **EXISTING TEST PATTERNS TO FOLLOW**

### **1. Mock GraphQL Client Creation**
```typescript
// From: serviceTestHelpers.ts
export function createMockGraphQLClient(): MockGraphQLClient {
  return {
    query: vi.fn(),
    mutate: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  };
}
```

### **2. Success/Error Response Helpers**
```typescript
// From: graphqlFixtures.ts
export function createSuccessResponse<T>(data: T): AsyncState<T> {
  return {
    status: 'success',
    data,
  };
}

export function createErrorResponse(message: string): AsyncState<never> {
  return {
    status: 'error',
    error: new Error(message),
  };
}
```

### **3. Service Test Structure**
```typescript
// From: ProfileService.test.ts
describe('ProfileService', () => {
  let service: ProfileServiceGraphQL;
  let mockClient: MockGraphQLClient;

  beforeEach(() => {
    mockClient = createMockGraphQLClient();
    service = new ProfileServiceGraphQL(mockClient);
  });

  describe('getProfileByHandle', () => {
    it('should return success result', async () => {
      // Arrange
      const mockResponse = createSuccessResponse({ profile: { /* ... */ } });
      mockClient.query.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getProfileByHandle('johndoe');

      // Assert
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
    });
  });
});
```

### **4. Integration Test Structure**
```typescript
// Pattern for integration tests
describe('Service Integration', () => {
  let mockClient: MockGraphQLClient;

  beforeEach(() => {
    mockClient = createMockGraphQLClient();
    // Inject mock client
    setFeedService(new FeedServiceGraphQL(mockClient));
  });

  afterEach(() => {
    // Reset for next test
    resetFeedService();
  });

  it('should work end-to-end', async () => {
    // Test full flow
  });
});
```

---

## 🎯 **SUCCESS CRITERIA**

### **Phase 2 (Integration Tests)**:
- [ ] Integration test file created for each service
- [ ] Tests demonstrate singleton problem (some should fail initially)
- [ ] Tests define desired behavior (will pass after Phase 3)
- [ ] Tests follow existing patterns (mock client, fixtures, helpers)
- [ ] All tests are well-documented with comments

### **Phase 3 (Refactor)**:
- [ ] All service barrel exports use lazy initialization
- [ ] Getter/setter functions implemented
- [ ] Reset functions implemented
- [ ] Backwards compatibility maintained
- [ ] All integration tests pass

### **Phase 4 (Update Existing Tests)**:
- [ ] All existing service tests updated
- [ ] All tests use `set*Service()` in setup
- [ ] All tests use `reset*Service()` in teardown
- [ ] Full test suite passes

### **Phase 5 (Verify)**:
- [ ] Homepage loads correctly with auth token
- [ ] Feed displays posts
- [ ] Profile page works
- [ ] All GraphQL operations include auth token
- [ ] No console errors

---

## 🔑 **KEY INSIGHTS**

### **Why Lazy Initialization Solves This**:
1. **Testing**: Client not created until first use → tests can inject mock before first use
2. **Auth**: Client created after login → has auth token
3. **Flexibility**: Can reset and recreate client as needed
4. **Performance**: No overhead (client still created only once)

### **Backwards Compatibility**:
```typescript
// Old code continues to work:
import { feedService } from '../services/feedService';
await feedService.getFeed();

// New test code:
import { setFeedService, resetFeedService } from '../services/feedService';
setFeedService(mockService);
```

### **Alternative: Service Container** (More Complex):
Instead of individual getters/setters, could use a service container:
```typescript
// ServiceContainer.ts
class ServiceContainer {
  private services = new Map();

  get<T>(key: string, factory: () => T): T {
    if (!this.services.has(key)) {
      this.services.set(key, factory());
    }
    return this.services.get(key);
  }

  set<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  reset(): void {
    this.services.clear();
  }
}

export const container = new ServiceContainer();

// Usage:
export const feedService = container.get(
  'feedService',
  () => new FeedServiceGraphQL(createGraphQLClient())
);
```

**Decision**: Use simple lazy initialization (simpler, more explicit)

---

## 📚 **REFERENCE FILES**

### **Existing Patterns**:
- `/packages/frontend/src/services/__tests__/ProfileService.test.ts` - Service test structure
- `/packages/frontend/src/services/__tests__/helpers/serviceTestHelpers.ts` - Mock creation
- `/packages/frontend/src/services/__tests__/fixtures/graphqlFixtures.ts` - Response helpers

### **Files to Create**:
- `/packages/frontend/src/services/__tests__/integration/feedService.integration.test.ts`
- `/packages/frontend/src/services/__tests__/integration/authFlow.integration.test.ts`
- `/packages/frontend/src/services/__tests__/integration/serviceFactory.integration.test.ts`

### **Files to Refactor**:
- `/packages/frontend/src/services/feedService.ts`
- `/packages/frontend/src/services/profileService.ts`
- `/packages/frontend/src/services/postService.ts`
- `/packages/frontend/src/services/commentService.ts`
- `/packages/frontend/src/services/followService.ts`
- `/packages/frontend/src/services/likeService.ts`

---

## 🎓 **SUMMARY**

**Problem**: Singleton GraphQL clients break testing and auth
**Solution**: Lazy initialization with dependency injection
**Approach**: TDD - write tests first, then refactor
**Phases**:
1. ✅ Document (this file)
2. 🔄 Create integration tests (NEXT)
3. ⏳ Refactor service exports
4. ⏳ Update existing tests
5. ⏳ Verify functionality

**Expected Outcome**:
- ✅ Homepage loads with feed
- ✅ Auth tokens work correctly
- ✅ Tests can mock GraphQL client
- ✅ Services are testable
- ✅ Full test coverage

**Next Step**: Execute Phase 2 - Create integration tests
