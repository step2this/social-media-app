# NotificationDataService Test Refactoring Plan

## Problem Analysis

The NotificationDataService tests have multiple issues that need fixing:

### 1. **Interface Mismatch on `markAsRead()`**
- **Interface says** (line 115-117 of INotificationDataService.ts):
  ```typescript
  markAsRead(notificationId: string): Promise<AsyncState<...>>
  ```
- **Implementation does** (line 91-93 of NotificationDataService.graphql.ts):
  ```typescript
  markAsRead(notificationId: string): Promise<AsyncState<...>>
  ```
- **Tests are calling**:
  ```typescript
  service.markAsRead({ notificationIds: ['notif-1', 'notif-2'] })
  ```

**Fix**: Tests should call `markAsRead('notif-1')` with a single ID string, not an object.

### 2. **getNotifications() Returns Wrong Type in Tests**
- **Interface says** (line 105-107): Returns `Promise<AsyncState<Notification[]>>`
- **Implementation does** (line 67-89): Returns unwrapped array using `unwrapConnection()`
- **Tests expect**: `result.data.edges`, `result.data.pageInfo` (Connection type)

**Fix**: Tests should expect `result.data` to be an array, not a connection.

### 3. **Not Using Existing Helper Functions**
The tests are NOT using the established helper functions from `serviceTestHelpers.ts`:
- `expectServiceError()` - Used correctly ✅
- `expectServiceSuccess()` - NOT used ❌
- `expectMutationCalledWith()` - NOT used ❌
- `expectQueryCalledWith()` - NOT used ❌

### 4. **Repetitive Test Patterns**
Tests like "should pass limit option to query" repeat the same pattern:
1. Create fixtures
2. Set mock response
3. Call service
4. Assert status
5. Assert data
6. Get lastCall
7. Assert variables

This can be DRYed up with helpers.

---

## Refactoring Strategy

### Phase 1: Fix Interface Mismatch
1. Update all `markAsRead()` calls to use single string ID
2. For tests that need multiple IDs, call `markAsRead()` multiple times or test single ID only

### Phase 2: Fix Return Type Expectations
1. Replace all `result.data.edges` with `result.data` (array)
2. Remove all `result.data.pageInfo` assertions (no longer exposed)
3. Use array methods directly: `result.data.forEach()`, `result.data[0]`, etc.

### Phase 3: Use Existing Helpers
1. Replace repetitive success assertions with `expectServiceSuccess()`
2. Replace repetitive variable checks with `expectQueryCalledWith()` and `expectMutationCalledWith()`
3. Keep using `expectServiceError()` (already correct)

### Phase 4: Remove Redundant Tests
Some tests are testing the same thing:
- "should fetch notifications successfully" - Keep
- "should pass limit option to query" - Merge into above
- "should use default limit" - Merge into above

---

## Implementation Plan

### File: `/packages/frontend/src/services/__tests__/NotificationDataService.test.ts`

#### Changes Needed:

**1. Fix all `markAsRead()` calls** (lines 236-293):
```typescript
// BEFORE
await service.markAsRead({ notificationIds: ['notif-1', 'notif-2', 'notif-3'] });

// AFTER
await service.markAsRead('notif-1');
```

**2. Fix all `getNotifications()` assertions** (lines 101-215):
```typescript
// BEFORE
if (result.status === 'success') {
  expect(result.data.edges).toHaveLength(3);
  expect(result.data.pageInfo.hasNextPage).toBe(false);
}

// AFTER
if (result.status === 'success') {
  expect(result.data).toHaveLength(3);
}
```

**3. Fix array iterations** (line 175-177):
```typescript
// BEFORE
result.data.edges.forEach(edge => {
  expect(edge.node.read).toBe(false);
});

// AFTER
result.data.forEach(notification => {
  expect(notification.read).toBe(false);
});
```

**4. Fix array indexing** (lines 210-213):
```typescript
// BEFORE
expect(result.data.edges[0].node.type).toBe('like');

// AFTER
expect(result.data[0].type).toBe('like');
```

**5. Use helper functions** (throughout):
```typescript
// BEFORE (lines 126-128)
const lastCall = mockClient.lastQueryCall<GetNotificationsVariables>();
expect(lastCall).toBeDefined();
expect(lastCall?.variables.limit).toBe(20);

// AFTER
expectQueryCalledWith<GetNotificationsVariables>(mockClient, { limit: 20 });
```

**6. Update integration test** (line 331):
```typescript
// BEFORE
const notificationIds = fetchResult.data.edges.map(edge => edge.node.id);

// AFTER
const notificationIds = fetchResult.data.map(notification => notification.id);
```

**7. Update markAsRead test for single ID** (lines 260-275):
```typescript
// BEFORE
it('should handle marking single notification as read', async () => {
  const result = createMockMarkNotificationsAsReadResult({
    success: true,
    markedCount: 1,
  });
  mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: result }));

  const response = await service.markAsRead({
    notificationIds: ['notif-1'],
  });

  expect(response.status).toBe('success');
  if (response.status === 'success') {
    expect(response.data.markedCount).toBe(1);
  }
});

// AFTER
it('should mark single notification as read', async () => {
  await expectServiceSuccess(
    mockClient,
    () => service.markAsRead('notif-1'),
    { markNotificationsAsRead: createMockMarkNotificationsAsReadResult({ success: true, markedCount: 1 }) },
    (data) => {
      expect(data.success).toBe(true);
      expect(data.markedCount).toBe(1);
    }
  );
});
```

**8. Remove empty IDs test** (lines 277-292):
This test doesn't make sense for the interface - you can't mark "zero" notifications.
The interface takes a single `notificationId: string`, so empty array doesn't apply.
**Action**: Remove this test entirely.

---

## Type Safety Improvements

### Issue: MarkAsReadVariables Type
Current test defines:
```typescript
interface MarkAsReadVariables {
  input: {
    notificationIds: readonly string[];
  };
}
```

But the interface accepts a single string. The GraphQL mutation takes an input object, but the **service interface** abstracts that away.

**Fix**: The `MarkAsReadVariables` type is only for checking the GraphQL mutation call, which is internal. Tests should only care about the service interface, not the GraphQL variables.

For tests that check mutation variables, we need to keep this type, but change the assertions:
```typescript
const lastCall = mockClient.lastMutationCall<MarkAsReadVariables>();
expect(lastCall).toBeDefined();
// Check that it wrapped the single ID into an array
expect(lastCall?.variables.input.notificationIds).toEqual(['notif-1']);
```

---

## Expected Test Structure (After Refactoring)

```typescript
describe('NotificationDataService.graphql', () => {
  let service: INotificationDataService;
  let mockClient: MockGraphQLClient;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    service = new NotificationDataServiceGraphQL(mockClient);
  });

  describe('getNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const notifications = createMockNotifications(3);
      const connection = createMockNotificationConnection(notifications);

      await expectServiceSuccess(
        mockClient,
        () => service.getNotifications(),
        { notifications: connection },
        (data) => {
          expect(data).toHaveLength(3);
        },
        'query'
      );
    });

    it('should pass limit and cursor to query', async () => {
      const notifications = createMockNotifications(20);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({
        notifications: createMockNotificationConnection(notifications)
      }));

      await service.getNotifications({ limit: 20, cursor: 'encoded-cursor' });

      expectQueryCalledWith<GetNotificationsVariables>(mockClient, {
        limit: 20,
        cursor: 'encoded-cursor',
      });
    });

    // ... more focused tests
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      await expectServiceSuccess(
        mockClient,
        () => service.markAsRead('notif-1'),
        { markNotificationsAsRead: createMockMarkNotificationsAsReadResult({ success: true, markedCount: 1 }) },
        (data) => {
          expect(data.success).toBe(true);
          expect(data.markedCount).toBe(1);
        }
      );
    });

    it('should pass notification ID to mutation (wrapped in array)', async () => {
      mockClient.setMutationResponse(wrapInGraphQLSuccess({
        markNotificationsAsRead: createMockMarkNotificationsAsReadResult()
      }));

      await service.markAsRead('notif-1');

      expectMutationCalledWith<MarkAsReadVariables>(mockClient, {
        input: { notificationIds: ['notif-1'] }
      });
    });

    // Error tests using expectServiceError (already correct)
  });
});
```

---

## Benefits of This Refactoring

1. **Type-safe**: Tests match the interface exactly
2. **DRY**: Using helpers reduces duplication by ~40%
3. **Maintainable**: Changes to service interface only require updating interface, not all tests
4. **Consistent**: Follows same patterns as PostService, CommentService, etc.
5. **Focused**: Each test tests one specific behavior
6. **Clear**: Test names describe behavior, not implementation

---

## Validation

After refactoring, run:
```bash
cd packages/frontend
npm test src/services/__tests__/NotificationDataService.test.ts
```

Expected:
- ✅ All 21 tests pass
- ✅ No type errors
- ✅ Tests match interface contract
- ✅ Tests use established patterns

---

## Estimated Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines of code | 370 | ~280 | -24% |
| Duplicate patterns | High | Low | DRY |
| Type safety | Broken | Correct | Fixed |
| Maintainability | Medium | High | Better |
