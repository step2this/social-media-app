# Task 4: NotificationsPage Refactor Plan

## Problem Analysis

**Current Issues** (52 failing tests):
1. ❌ NotificationsPage.test.tsx uses `vi.mock()` on `notificationService` singleton
2. ❌ Tests mock the WRONG service - `notificationService` is UI toasts, NOT data fetching
3. ❌ Test creates its own `createMockNotification()` instead of using existing fixtures
4. ❌ 1,244 lines of test code with massive duplication
5. ❌ Tests violate DI principles - should use `renderWithServices()` pattern

**Root Causes**:
- `notificationService` = UI toast notification service (showSuccess, showError, etc.)
- `NotificationDataService` = GraphQL data service (getNotifications, markAsRead, etc.)
- NotificationsPage needs the DATA service, not the toast service
- Tests currently mock the toast service which doesn't have the methods the page needs

## Established Patterns (from SKILL.md, DI-TRANSFORMATION.md, TEST_REFACTORING_SUMMARY.md)

### 1. Component Test Pattern
```typescript
// ✅ CORRECT (what we should do)
import { renderWithServices } from '../test-utils';
import { MockNotificationDataService } from '../services/testing/MockServices';

const mockNotificationDataService = new MockNotificationDataService();
renderWithServices(<NotificationsPage />, {
  notificationDataService: mockNotificationDataService
});

// Configure mock behavior
mockNotificationDataService.getNotifications.mockResolvedValue({...});
```

```typescript
// ❌ WRONG (what the tests currently do)
vi.mock('../services/notificationService');
vi.mocked(notificationService.getNotifications).mockResolvedValue({...});
// ^ This breaks because notificationService doesn't have getNotifications method!
```

### 2. Fixture Pattern
```typescript
// ✅ CORRECT - use existing fixtures
import { createMockNotification, createMockNotifications } from '../services/__tests__/fixtures/notificationFixtures';

const notifications = createMockNotifications(3);

// ❌ WRONG - duplicate fixture creation in test file
const createMockNotification = (overrides) => ({ id: '...', ... });
```

### 3. NO vi.mock() for Services
- Service tests: Use constructor injection with MockGraphQLClient
- Component tests: Use ServiceProvider + renderWithServices()
- NO `vi.mock()` on service singletons - it breaks DI patterns

### 4. Test Behavior, Not Implementation
```typescript
// ✅ CORRECT - test behavior
expect(screen.getByText('You have no notifications')).toBeInTheDocument();

// ❌ WRONG - test implementation details
expect(document.querySelector('.notifications-page__loading')).toBeInTheDocument();
expect(loadingContainer?.querySelector('.spinner')).toBeInTheDocument();
```

### 5. Avoid Redundant Coverage
- Don't test CSS class names (that's testing implementation)
- Don't test loading states in 5 different ways
- Don't test every edge case scenario
- Focus on core user journeys

## Implementation Plan

### Step 1: Update NotificationsPage to Use Correct Service (if needed)

**Check**: Does NotificationsPage.tsx import the correct service?

Looking at line 4 of NotificationsPage.tsx: `import { notificationService } from '../services/notificationService';`

This is wrong! It should import the data service. However, based on the comprehensive test pattern analysis, NotificationsPage should NOT import services directly at all - it should get them from the ServiceProvider context!

**Solution**: Refactor NotificationsPage to use DI pattern

```typescript
// NotificationsPage.tsx - BEFORE (❌)
import { notificationService } from '../services/notificationService';

const NotificationsPage = () => {
  useEffect(() => {
    notificationService.getNotifications(); // ❌ This method doesn't exist!
  }, []);
};

// NotificationsPage.tsx - AFTER (✅)
import { useServices } from '../services/ServiceProvider';

const NotificationsPage = () => {
  const { notificationDataService } = useServices();

  useEffect(() => {
    notificationDataService.getNotifications(); // ✅ Correct service with correct method
  }, [notificationDataService]);
};
```

### Step 2: Create NotificationDataService Barrel Export (if not exists)

**File**: `/packages/frontend/src/services/notificationDataService.ts`

```typescript
/**
 * NotificationDataService Barrel Export
 * Re-exports notification data service for data fetching (not UI toasts)
 */

import { NotificationDataService } from './implementations/NotificationDataService.graphql.js';

// Create singleton instance
export const notificationDataService = new NotificationDataService();
```

### Step 3: Add NotificationDataService to ServiceContainer

**File**: `/packages/frontend/src/services/ServiceContainer.ts`

```typescript
import { notificationDataService } from './notificationDataService.js';
import type { INotificationDataService } from './interfaces/INotificationDataService';

export interface ServiceContainer {
  // ... existing services
  notificationDataService: INotificationDataService;
}

export const defaultServices: ServiceContainer = {
  // ... existing services
  notificationDataService,
};
```

### Step 4: Add Mock NotificationDataService to MockServices

**File**: `/packages/frontend/src/services/testing/MockServices.ts`

```typescript
import type { INotificationDataService } from '../interfaces/INotificationDataService';

export class MockNotificationDataService implements INotificationDataService {
  getNotifications = vi.fn();
  getUnreadCount = vi.fn();
  markAsRead = vi.fn();
  markAllAsRead = vi.fn();
  deleteNotification = vi.fn();
}

export const createMockNotificationDataService = (): MockNotificationDataService => {
  return new MockNotificationDataService();
};
```

### Step 5: Completely Rewrite NotificationsPage.test.tsx

**Goal**: Reduce from 1,244 lines to ~300 lines by:
1. Using `renderWithServices()` pattern (no vi.mock)
2. Using existing notification fixtures
3. Removing redundant tests
4. Testing behavior, not implementation
5. DRYing up helper functions

**New Test Structure**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { NotificationsPage } from './NotificationsPage';
import { renderWithServices } from '../test-utils';
import { createMockNotificationConnection, createMockNotifications } from '../services/__tests__/fixtures/notificationFixtures';
import { MockNotificationDataService } from '../services/testing/MockServices';

describe('NotificationsPage', () => {
  let mockNotificationDataService: MockNotificationDataService;

  beforeEach(() => {
    mockNotificationDataService = new MockNotificationDataService();
  });

  // Helper: Render with configured mock service
  const renderPage = () => {
    return renderWithServices(<NotificationsPage />, {
      notificationDataService: mockNotificationDataService
    });
  };

  describe('Loading State', () => {
    it('should display loading state while fetching notifications', () => {
      // Never-resolving promise simulates loading
      mockNotificationDataService.getNotifications.mockImplementation(
        () => new Promise(() => {})
      );

      renderPage();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no notifications exist', async () => {
      mockNotificationDataService.getNotifications.mockResolvedValue(
        createMockNotificationConnection([], false)
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Display', () => {
    it('should display list of notifications', async () => {
      const notifications = createMockNotifications(3);
      mockNotificationDataService.getNotifications.mockResolvedValue(
        createMockNotificationConnection(notifications, false)
      );

      renderPage();

      await waitFor(() => {
        notifications.forEach(notif => {
          expect(screen.getByText(notif.message)).toBeInTheDocument();
        });
      });
    });

    it('should display unread notifications with visual indicator', async () => {
      const notifications = createMockNotifications(2, { read: false });
      mockNotificationDataService.getNotifications.mockResolvedValue(
        createMockNotificationConnection(notifications, false)
      );

      renderPage();

      await waitFor(() => {
        // Look for unread indicator (aria-label is behavior, not implementation)
        const unreadIndicators = screen.getAllByLabelText(/unread/i);
        expect(unreadIndicators).toHaveLength(2);
      });
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read when clicked', async () => {
      const notifications = createMockNotifications(1, { read: false });
      mockNotificationDataService.getNotifications.mockResolvedValue(
        createMockNotificationConnection(notifications, false)
      );
      mockNotificationDataService.markAsRead.mockResolvedValue({ success: true });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(notifications[0].message)).toBeInTheDocument();
      });

      // Click the notification
      const notification = screen.getByText(notifications[0].message);
      fireEvent.click(notification);

      // Verify service was called (testing behavior - user action triggered service call)
      await waitFor(() => {
        expect(mockNotificationDataService.markAsRead).toHaveBeenCalledWith(notifications[0].id);
      });
    });

    it('should mark all notifications as read when button clicked', async () => {
      const notifications = createMockNotifications(3, { read: false });
      mockNotificationDataService.getNotifications.mockResolvedValue(
        createMockNotificationConnection(notifications, false)
      );
      mockNotificationDataService.markAllAsRead.mockResolvedValue({
        success: true,
        markedCount: 3
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/mark all as read/i)).toBeInTheDocument();
      });

      const markAllButton = screen.getByText(/mark all as read/i);
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(mockNotificationDataService.markAllAsRead).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetching fails', async () => {
      mockNotificationDataService.getNotifications.mockRejectedValue(
        new Error('Network error')
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/error.*notifications/i)).toBeInTheDocument();
      });
    });
  });

  // NOTE: Pagination, filtering, and other features tested ONLY if they exist
  // Don't over-test edge cases or implementation details
});
```

**Key Principles Applied**:

1. **NO vi.mock()** - Uses DI pattern with `renderWithServices()`
2. **Existing fixtures** - Uses `createMockNotifications()` from fixtures
3. **Behavior testing** - Tests user-visible behavior, not CSS classes
4. **DRY** - `renderPage()` helper eliminates duplication
5. **Focused** - ~10-15 tests instead of 52 tests
6. **Type-safe** - MockNotificationDataService implements INotificationDataService

### Step 6: Remove Redundant Tests

**Tests to REMOVE** (not needed, testing implementation):
- ❌ "should show loading container with proper structure" - tests HTML structure
- ❌ Multiple loading state variations - test once, not 5 times
- ❌ CSS class assertions - `expect(document.querySelector('.notifications-page__loading'))`
- ❌ DOM structure tests - testing how it's built, not what users see

**Tests to KEEP** (test behavior):
- ✅ Display loading state
- ✅ Display empty state
- ✅ Display list of notifications
- ✅ Mark notification as read
- ✅ Mark all as read
- ✅ Error handling
- ✅ Pagination (if exists)

### Step 7: Validate Changes

```bash
# Run NotificationsPage tests
cd packages/frontend
npm test src/pages/NotificationsPage.test.tsx

# Should see:
# Test Files  1 passed (1)
# Tests       ~15 passed (~15)  [down from 52]

# Run full test suite
npm test

# Should see all 1,053 tests passing
```

## Success Criteria

- ✅ NotificationsPage uses correct service (NotificationDataService, not NotificationService)
- ✅ NotificationsPage uses DI pattern (gets service from ServiceProvider)
- ✅ Tests use `renderWithServices()` pattern (no vi.mock)
- ✅ Tests use existing notification fixtures
- ✅ Test file reduced from 1,244 lines to ~300 lines
- ✅ Test count reduced from 52 to ~15 (focused on behavior)
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ Type-safe throughout

## Why This Approach

### Aligns with Established Patterns
- ✅ Follows DI container pattern (ServiceProvider + useServices)
- ✅ Uses `renderWithServices()` helper (TestUtils.tsx)
- ✅ Uses existing fixtures (notificationFixtures.ts)
- ✅ Uses MockServices pattern (MockServices.ts)
- ✅ NO vi.mock() on singletons

### Fixes Architectural Issue
- ✅ Separates concerns: UI toasts (NotificationService) vs data (NotificationDataService)
- ✅ Follows established service organization pattern
- ✅ Components get services through DI, not direct imports

### Improves Test Quality
- ✅ Reduces test LOC by 75% (1,244 → ~300)
- ✅ Eliminates redundant coverage
- ✅ Tests behavior, not implementation
- ✅ Type-safe mocking throughout

### Follows SKILL.md Principles
- ✅ Type-safe: MockNotificationDataService implements interface
- ✅ DRY: Reuses fixtures and helpers
- ✅ Pragmatic: Removes unnecessary tests
- ✅ Clear: Test names describe user behavior

## Estimated Effort

- Step 1: Update NotificationsPage.tsx - 30 minutes
- Step 2-4: Add service to DI container - 15 minutes
- Step 5: Rewrite test file - 2 hours
- Step 6: Remove redundant tests - 30 minutes
- Step 7: Validate and fix any issues - 30 minutes

**Total: ~4 hours**

## Risk Assessment

**Low Risk** because:
- ✅ Follows established patterns used by 908 passing tests
- ✅ Uses existing fixtures and test utilities
- ✅ No changes to production code logic (just DI wiring)
- ✅ Can roll back by file if issues arise

## Related Files

**To Modify**:
- `/packages/frontend/src/pages/NotificationsPage.tsx` - Use DI pattern
- `/packages/frontend/src/pages/NotificationsPage.test.tsx` - Complete rewrite
- `/packages/frontend/src/services/ServiceContainer.ts` - Add notificationDataService
- `/packages/frontend/src/services/testing/MockServices.ts` - Add mock

**To Create**:
- `/packages/frontend/src/services/notificationDataService.ts` - Barrel export

**To Reference** (don't modify):
- `/packages/frontend/src/services/__tests__/fixtures/notificationFixtures.ts` - Use fixtures
- `/packages/frontend/src/services/implementations/NotificationDataService.graphql.ts` - Data service
- `/packages/frontend/src/services/implementations/NotificationService.ts` - Toast service (different!)
- `/packages/frontend/src/test-utils/TestUtils.tsx` - renderWithServices()

---

**This plan brings NotificationsPage into alignment with the established DI architecture while dramatically improving test quality and reducing duplication.**
