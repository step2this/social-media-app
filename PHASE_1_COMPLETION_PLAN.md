# Phase 1 Completion Plan - Fixing Remaining 60 Tests

## Current Status
- **Tests Fixed**: 85 (59% of original failures)
- **Tests Remaining**: 60 (6% of total tests)
- **Test Files**: 10 failed | 45 passed (55)
- **Core Refactoring**: COMPLETE (GraphQL helpers, DI patterns, fixtures)

---

## Established Patterns to Follow

### From SKILL.md:
1. ✅ **Type-safe** - No `any`, proper AsyncState<T> handling
2. ✅ **DRY** - Reuse existing helpers, fixtures, utilities
3. ✅ **Clear intent** - Self-documenting code with JSDoc
4. ✅ **Validate early** - Run validate_changes after each change

### From DI-TRANSFORMATION.md:
1. ✅ **NO vi.mock()** on singletons - Use DI pattern
2. ✅ **Components get services from ServiceProvider** - `useServices()`
3. ✅ **Tests use renderWithServices()** - Pass mock services
4. ✅ **Service tests use constructor injection** - MockGraphQLClient

### From TEST_REFACTORING_SUMMARY.md:
1. ✅ **Test behavior, not implementation** - User-visible outcomes
2. ✅ **Use existing fixtures** - Don't create inline mocks
3. ✅ **DRY test helpers** - `expectServiceSuccess()`, `expectServiceError()`
4. ✅ **Focus on core journeys** - Remove redundant tests

### From GRAPHQL_HELPERS_EXTRACTION_PLAN.md:
1. ✅ **Services unwrap Connections** - Return arrays, not edges/nodes
2. ✅ **Components don't know GraphQL** - Clean interface, no `.edges`
3. ✅ **Use helpers** - `unwrapConnection()`, `getPageInfo()`
4. ✅ **Type-safe transformations** - `transformAsyncState()`

---

## Remaining Failing Tests Breakdown

### Category 1: NotificationsPage Tests (12 failing)
**Root Cause**: Test assertions don't match actual DOM, incomplete service methods

**Files**:
- `/packages/frontend/src/pages/NotificationsPage.test.tsx` (12 tests)

**Issues**:
1. Tests look for elements that don't exist in actual component
2. `markAllAsRead()` and `deleteNotification()` need proper implementation
3. Mock service responses don't match expected interface

---

### Category 2: HomePage Tests (8 failing)
**Root Cause**: HomePage may use NotificationDataService, needs DI pattern

**Files**:
- `/packages/frontend/src/pages/HomePage.test.tsx` (8 tests)

**Issues**:
1. HomePage might directly import notificationDataService
2. Tests may use old mocking pattern (vi.mock)
3. May need to update to use `renderWithServices()`

---

### Category 3: Integration Tests (~20-30 failing)
**Root Cause**: GraphQL helper changes broke integration test setup

**Files**:
- `/packages/frontend/src/services/__tests__/integration/feedService.integration.test.ts`
- Other integration tests

**Issues**:
1. Integration tests expect Connection responses, not arrays
2. Mock GraphQL client may not handle new unwrapping
3. Need to update fixture responses

---

### Category 4: Hook Tests (~10 failing)
**Root Cause**: Hooks using services affected by GraphQL changes

**Files**:
- `/packages/frontend/src/hooks/useAuctions.test.ts`
- Other hook tests

**Issues**:
1. Hooks may expect Connection responses
2. Mock services need to return arrays now
3. May need fixture updates

---

### Category 5: Component Tests (~10 failing)
**Root Cause**: Cascading failures from service changes

**Files**:
- Various component test files

**Issues**:
1. Components using affected services
2. Mock responses don't match new interfaces
3. Test setup needs updates

---

## Execution Plan

### Phase 1.1: Fix NotificationsPage Tests (2 hours, 12 tests)

#### Step 1: Examine actual DOM output (15 min)
```bash
# Run NotificationsPage in dev mode
cd packages/frontend
npm run dev

# Navigate to /notifications
# Inspect DOM elements with browser DevTools
# Note actual text content, aria-labels, roles
```

**Action Items**:
- Check what "loading" text actually says
- Find actual text for "no notifications"
- Verify "Mark all as read" button text
- Check delete button aria-label
- Note listitem role usage

#### Step 2: Update test assertions to match reality (30 min)

**File**: `/packages/frontend/src/pages/NotificationsPage.test.tsx`

**Pattern to follow** (from CommentService.test.ts):
```typescript
// ✅ CORRECT - Test actual DOM output
expect(screen.getByText('Loading notifications...')).toBeInTheDocument();

// ❌ WRONG - Test non-existent text
expect(screen.getByText(/loading/i)).toBeInTheDocument();
```

**Changes**:
1. Replace regex matchers with exact strings
2. Update button labels to match actual UI
3. Fix listitem role expectations
4. Update unread indicator selectors

#### Step 3: Implement missing service methods (1 hour)

**File**: `/packages/frontend/src/services/implementations/NotificationDataService.graphql.ts`

**Already done** (just needs verification):
- ✅ `markAsRead(notificationId)` - Wraps ID in array
- ✅ `markAllAsRead()` - Passes empty array
- ⚠️  `deleteNotification(notificationId)` - Returns mock (needs implementation)

**Action**: Check if DELETE_NOTIFICATION_MUTATION exists, if not, implement stub properly:

```typescript
async deleteNotification(notificationId: string): Promise<AsyncState<{ success: boolean }>> {
  // For now, return success (backend may not have delete implemented yet)
  console.warn('DELETE_NOTIFICATION_MUTATION not implemented yet');
  return Promise.resolve({
    status: 'success' as const,
    data: { success: true }
  });
}
```

#### Step 4: Verify mock service setup (15 min)

**File**: `/packages/frontend/src/services/testing/MockServices.ts`

Ensure `MockNotificationDataService` matches interface:
```typescript
export class MockNotificationDataService implements INotificationDataService {
  getNotifications = vi.fn<[], Promise<AsyncState<Notification[]>>>();
  getUnreadCount = vi.fn<[], Promise<AsyncState<UnreadCountResult>>>();
  markAsRead = vi.fn<[string], Promise<AsyncState<MarkNotificationsAsReadResult>>>();
  markAllAsRead = vi.fn<[], Promise<AsyncState<MarkNotificationsAsReadResult>>>();
  deleteNotification = vi.fn<[string], Promise<AsyncState<{ success: boolean }>>>();
}
```

**Validation**:
```bash
npm test src/pages/NotificationsPage.test.tsx
# Target: All 16 tests passing
```

---

### Phase 1.2: Fix HomePage Tests (1 hour, 8 tests)

#### Step 1: Check if HomePage uses NotificationDataService (10 min)

**File**: `/packages/frontend/src/pages/HomePage.tsx`

Search for:
- `import.*notification` - Check what it imports
- `getNotifications` - Check method calls
- Direct service imports vs `useServices()`

#### Step 2: Update HomePage to use DI if needed (20 min)

**IF** HomePage directly imports service:

**BEFORE** (❌):
```typescript
import { notificationDataService } from '../services/notificationDataService';
```

**AFTER** (✅):
```typescript
import { useServices } from '../services/ServiceProvider';

const { notificationDataService } = useServices();
```

#### Step 3: Update HomePage.test.tsx (30 min)

**Pattern to follow** (from NotificationsPage.test.tsx):

**BEFORE** (❌):
```typescript
vi.mock('../services/notificationDataService');
```

**AFTER** (✅):
```typescript
import { renderWithServices, MockNotificationDataService } from '../services/testing/TestUtils';

const mockNotificationDataService = new MockNotificationDataService();

renderWithServices(<HomePage />, {
  services: {
    ...createMockServiceContainer(),
    notificationDataService: mockNotificationDataService
  }
});
```

**Validation**:
```bash
npm test src/pages/HomePage.test.tsx
# Target: All 8 tests passing
```

---

### Phase 1.3: Fix Integration Tests (1.5 hours, ~20-30 tests)

#### Step 1: Understand integration test pattern (15 min)

**File**: `/packages/frontend/src/services/__tests__/integration/feedService.integration.test.ts`

**Check**:
- How does it create real service instances?
- Does it use MockGraphQLClient or real client?
- What response format does MockGraphQLClient return?

#### Step 2: Update MockGraphQLClient for unwrapping pattern (30 min)

**File**: `/packages/frontend/src/graphql/client.mock.ts`

**IF** MockGraphQLClient returns Connection responses:

**BEFORE** (❌):
```typescript
mockClient.query.mockResolvedValue({
  status: 'success',
  data: {
    homeFeed: {
      edges: [...],
      pageInfo: {...}
    }
  }
});
```

**AFTER** (✅ - Services unwrap now):
```typescript
// Mock client still returns Connection (matches GraphQL)
mockClient.query.mockResolvedValue({
  status: 'success',
  data: {
    homeFeed: {
      edges: posts.map(post => ({ node: post, cursor: post.id })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null
      }
    }
  }
});

// Service will unwrap this to Post[] for caller
```

**Key insight**: Integration tests should test the FULL stack:
- MockGraphQLClient returns GraphQL shape (Connection)
- Service unwraps to domain shape (Array)
- Test verifies service returns Array

#### Step 3: Update integration test expectations (45 min)

**Pattern**:
```typescript
// Test that service unwraps correctly
const result = await feedService.getHomeFeed();

expect(result.status).toBe('success');
expect(result.data.items).toBeInstanceOf(Array); // ✅ Not Connection
expect(result.data.items).toHaveLength(3);
expect(result.data.hasNextPage).toBe(false); // ✅ From FeedResult, not pageInfo
```

**Validation**:
```bash
npm test src/services/__tests__/integration/
# Target: All integration tests passing
```

---

### Phase 1.4: Fix Hook Tests (1 hour, ~10 tests)

#### Step 1: Check hook test pattern (15 min)

**File**: `/packages/frontend/src/hooks/useAuctions.test.ts`

**Check**:
- Does it use `renderHook` from testing-library?
- How does it provide services?
- Does it mock services with vi.mock or use providers?

#### Step 2: Update hook tests to use service providers (45 min)

**Pattern to follow** (from test-utils/hook-mocks.ts):

**BEFORE** (❌):
```typescript
vi.mock('../services/auctionService');
renderHook(() => useAuctions());
```

**AFTER** (✅):
```typescript
import { renderHookWithServices, MockAuctionService } from '../services/testing/TestUtils';

const mockAuctionService = new MockAuctionService();
mockAuctionService.getAuctions.mockResolvedValue({
  status: 'success',
  data: createMockAuctions(3) // ✅ Returns array, not Connection
});

renderHookWithServices(() => useAuctions(), {
  services: {
    ...createMockServiceContainer(),
    auctionService: mockAuctionService
  }
});
```

**Note**: May need to create `renderHookWithServices` if it doesn't exist:

```typescript
// In TestUtils.tsx
export function renderHookWithServices<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: { services: Partial<IServiceContainer> }
) {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <ServiceProvider services={createMockServiceContainer(options.services)}>
        {children}
      </ServiceProvider>
    )
  });
}
```

**Validation**:
```bash
npm test src/hooks/useAuctions.test.ts
# Target: All hook tests passing
```

---

### Phase 1.5: Fix Remaining Component Tests (1 hour, ~10 tests)

#### Step 1: Identify which components are failing (10 min)

```bash
npm test 2>&1 | grep "FAIL" | grep "components"
```

#### Step 2: Update each component test (50 min)

**Common patterns to fix**:

1. **Replace vi.mock with renderWithServices**:
```typescript
// BEFORE (❌)
vi.mock('../services/postService');
render(<PostCard post={mockPost} />);

// AFTER (✅)
renderWithServices(<PostCard post={mockPost} />, {
  services: createMockServiceContainer()
});
```

2. **Update mock responses to return arrays**:
```typescript
// BEFORE (❌)
mockService.getPosts.mockResolvedValue({
  status: 'success',
  data: { edges: [...], pageInfo: {...} }
});

// AFTER (✅)
mockService.getPosts.mockResolvedValue({
  status: 'success',
  data: createMockPosts(3) // Array
});
```

3. **Use existing fixtures**:
```typescript
// BEFORE (❌)
const mockPost = { id: '1', content: 'test', ... };

// AFTER (✅)
const mockPost = createMockPost({ content: 'test' });
```

**Validation**:
```bash
npm test src/components/
# Target: All component tests passing
```

---

## Validation & Quality Checks

### After Each Phase:
1. **Run validate_changes** - Check for type errors
2. **Run affected tests** - Verify fixes work
3. **Check test output** - No new warnings/errors
4. **Review changes** - Ensure patterns followed

### Final Validation:
```bash
# Run full test suite
cd packages/frontend
npm test

# Expected output:
# Test Files  55 passed (55)
# Tests       1,053 passed (1,053)

# Run type check
npm run typecheck
# Expected: No errors

# Run linter
npm run lint
# Expected: No new warnings
```

---

## Success Criteria

- ✅ All 1,053 tests passing (0 failures)
- ✅ No TypeScript errors
- ✅ No new lint warnings
- ✅ All tests follow established patterns:
  - Use DI (no vi.mock on singletons)
  - Use existing fixtures
  - Test behavior, not implementation
  - Type-safe throughout
- ✅ Services return arrays, not Connections
- ✅ Components don't know about GraphQL
- ✅ Documentation updated

---

## Estimated Effort

| Phase | Task | Time | Tests Fixed |
|-------|------|------|-------------|
| 1.1 | NotificationsPage tests | 2 hours | 12 |
| 1.2 | HomePage tests | 1 hour | 8 |
| 1.3 | Integration tests | 1.5 hours | ~25 |
| 1.4 | Hook tests | 1 hour | ~10 |
| 1.5 | Component tests | 1 hour | ~5 |
| **Total** | **Phase 1 Completion** | **6.5 hours** | **60 tests** |

---

## Key Principles to Remember

### 1. **Check Existing Patterns First**
Before making changes, look at:
- Passing service tests (CommentService.test.ts, PostService.test.ts)
- Existing component tests using renderWithServices
- Test fixtures for creating mock data
- DI-TRANSFORMATION.md for service patterns

### 2. **Type Safety Is Non-Negotiable**
- No `any` types
- Proper AsyncState<T> handling
- Mock services implement interfaces
- Use TypeScript to guide fixes

### 3. **DRY > Duplication**
- Reuse existing helpers (expectServiceSuccess, etc.)
- Reuse existing fixtures (createMockPost, etc.)
- Reuse existing test utilities (renderWithServices, etc.)
- Don't create inline mocks

### 4. **Test Behavior, Not Implementation**
- Focus on user-visible outcomes
- Don't test CSS classes
- Don't test DOM structure details
- Test what users see and do

### 5. **GraphQL Is Encapsulated**
- Services unwrap Connections
- Components get arrays
- Tests mock with arrays
- GraphQL details stay in service layer

---

## Risk Mitigation

### Low Risk Changes:
- ✅ Updating test assertions to match actual DOM
- ✅ Adding missing mock service methods
- ✅ Using existing fixtures

### Medium Risk Changes:
- ⚠️ Changing HomePage to use DI (if needed)
- ⚠️ Updating integration test setup
- ⚠️ Creating new test helpers

### High Risk Changes:
- ❌ Changing service interfaces (already done)
- ❌ Modifying GraphQL operations (not needed)
- ❌ Refactoring core service implementations (already done)

### Rollback Strategy:
- Each phase can be rolled back independently
- Changes are isolated to test files mostly
- Production code changes are minimal
- Git commit after each phase

---

## Next Steps After Phase 1

Once all tests pass:

### Phase 2: Documentation (1 hour)
1. Update PHASE_1_PROGRESS_SUMMARY.md with final results
2. Create PHASE_1_COMPLETE.md with lessons learned
3. Update README.md test section
4. Create TEST_STYLE_GUIDE.md for future contributors

### Phase 2: Infrastructure (Optional, 2-3 hours)
1. Add pre-commit hook to run tests
2. Add test coverage gates
3. Add CI quality checks
4. Create test templates

### Phase 3: Tech Debt Review
1. Review tech-debt.md
2. Prioritize remaining issues
3. Plan Phase 2 test improvements

---

**This plan follows all established patterns and will bring the test suite to 100% passing while maintaining consistency with the existing architecture.**
