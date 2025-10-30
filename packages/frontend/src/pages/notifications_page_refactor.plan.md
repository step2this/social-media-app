# NotificationsPage Refactoring Plan

Apply TypeScript Advanced Types principles to break down `/Users/shaperosteve/social-media-app/packages/frontend/src/pages/NotificationsPage.tsx` into smaller, more maintainable components and helper functions.

## Goals

1. Extract reusable React components following single responsibility principle
2. Apply advanced TypeScript types (generics, utility types, discriminated unions)
3. Create type-safe component props with proper type constraints
4. Improve code maintainability and testability
5. Follow the principles outlined in SKILL.md

## Phase 1: Create Advanced TypeScript Types

Create a new types file with advanced TypeScript patterns:

**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/pages/NotificationsPage.types.ts`**

- Define discriminated unions for notification states (loading, error, success, empty)
- Create generic types for async operations
- Use mapped types for notification group configurations
- Apply utility types (Pick, Omit, Record) for component props
- Create template literal types for CSS class names
- Use conditional types for type-safe event handlers

## Phase 2: Extract Helper Functions Module

Create a dedicated utilities file for helper functions:

**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/pages/NotificationsPage.utils.ts`**

Move and enhance existing helper functions:
- `groupNotificationsByTime` - with generic time period type
- `getNotificationText` - with exhaustive type checking
- `formatTimestamp` - with branded types for timestamps
- `getNotificationIcon` - with template literal return types
- `getNotificationColor` - with const assertions for class names

## Phase 3: Create Atomic Components

Extract small, reusable components with generic and constrained types:

### 3.1 NotificationAvatar Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationAvatar.tsx`**

- Props using Pick utility type from Notification
- Generic avatar display logic
- Type-safe icon/image rendering

### 3.2 NotificationContent Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationContent.tsx`**

- Display notification text, preview, and timestamp
- Props with conditional types for optional preview
- Type-safe text formatting

### 3.3 NotificationThumbnail Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationThumbnail.tsx`**

- Conditional rendering based on metadata
- Props with Extract utility type for post-type notifications
- Type guards for metadata validation

### 3.4 NotificationUnreadDot Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationUnreadDot.tsx`**

- Simple indicator component
- Boolean prop with proper ARIA attributes

## Phase 4: Create Composite Components

Build larger components from atomic ones:

### 4.1 NotificationItem Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationItem.tsx`**

- Compose all atomic notification components
- Generic event handler props with proper typing
- Use discriminated union for click handlers
- Apply mapped types for className generation

### 4.2 NotificationGroup Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationGroup.tsx`**

- Render a group of notifications with title
- Generic group configuration using Record types
- Type-safe group title mapping with template literals

### 4.3 NotificationsHeader Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationsHeader.tsx`**

- Header with "Mark all as read" button
- Conditional rendering logic
- Type-safe callback props

## Phase 5: Create State-Specific Components

Extract different UI states into separate components:

### 5.1 NotificationsLoading Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationsLoading.tsx`**

- Loading spinner and message
- Simple, no-props component

### 5.2 NotificationsError Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationsError.tsx`**

- Error display with retry button
- Props with generic error type and retry handler
- Use conditional types for custom error messages

### 5.3 NotificationsEmpty Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationsEmpty.tsx`**

- Empty state with icon and message
- Optional custom message prop with string literals

## Phase 6: Create Container Components

### 6.1 NotificationsList Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/NotificationsList.tsx`**

- Main list container rendering groups
- Generic props for notification array
- Type-safe event handlers using generics
- Apply builder pattern for complex configurations

### 6.2 LoadMoreButton Component
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/LoadMoreButton.tsx`**

- Load more functionality
- Generic loading state handling
- Disabled state with proper types

## Phase 7: Apply Advanced Type Patterns to Main Page

Refactor the main NotificationsPage component:

**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/pages/NotificationsPage.tsx`**

Apply patterns from SKILL.md:

1. **Discriminated Unions** for page state (loading | error | empty | success)
2. **Generic Hooks** for data fetching with type constraints
3. **Conditional Types** for render logic based on state
4. **Type-safe Event Handlers** using generics
5. **Builder Pattern** for complex notification operations
6. **Mapped Types** for state management
7. **Utility Types** (Readonly, Partial, Pick, Omit) for immutability

Structure:
- Import all new components
- Use discriminated unions for state management
- Implement type-safe event handlers
- Extract custom hooks with generics
- Apply pattern matching for state rendering

## Phase 8: Create Custom Hooks

Extract business logic into custom hooks:

### 8.1 useNotifications Hook
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/useNotifications.ts`**

- Generic hook for notifications data fetching
- Return discriminated union for loading/error/success states
- Type-safe pagination handling

### 8.2 useNotificationActions Hook
**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/useNotificationActions.ts`**

- Handle mark as read, delete, mark all as read
- Generic action types with proper constraints
- Type-safe optimistic updates

## Phase 9: Create Index Files

Organize exports with barrel exports:

**Files:**
- `/Users/shaperosteve/social-media-app/packages/frontend/src/components/notifications/index.ts`
- `/Users/shaperosteve/social-media-app/packages/frontend/src/hooks/index.ts` (update)

## Phase 10: Update Tests

Update the existing test file to work with new structure:

**File: `/Users/shaperosteve/social-media-app/packages/frontend/src/pages/NotificationsPage.test.tsx`**

- Update imports
- Add tests for new components
- Test type safety with TypeScript test utilities
- Verify discriminated union handling

## Type Safety Benefits

This refactoring will provide:

1. **Compile-time Safety**: Catch errors before runtime using advanced types
2. **Better IntelliSense**: Enhanced autocomplete and type hints
3. **Exhaustive Checking**: Switch statements with never type for completeness
4. **Generic Reusability**: Components that work with various data types
5. **Type Inference**: Let TypeScript infer types automatically
6. **Branded Types**: Prevent mixing incompatible string types
7. **Discriminated Unions**: Type-safe state management
8. **Utility Types**: Reduce boilerplate and improve DRY

## File Structure After Refactoring

```
packages/frontend/src/
├── components/
│   └── notifications/
│       ├── NotificationAvatar.tsx
│       ├── NotificationContent.tsx
│       ├── NotificationThumbnail.tsx
│       ├── NotificationUnreadDot.tsx
│       ├── NotificationItem.tsx
│       ├── NotificationGroup.tsx
│       ├── NotificationsHeader.tsx
│       ├── NotificationsLoading.tsx
│       ├── NotificationsError.tsx
│       ├── NotificationsEmpty.tsx
│       ├── NotificationsList.tsx
│       ├── LoadMoreButton.tsx
│       └── index.ts
├── hooks/
│   ├── useNotifications.ts
│   ├── useNotificationActions.ts
│   └── index.ts
└── pages/
    ├── NotificationsPage.tsx (refactored)
    ├── NotificationsPage.types.ts
    ├── NotificationsPage.utils.ts
    └── NotificationsPage.test.tsx
```

## Testing Strategy

After each phase:
1. Run TypeScript compiler to verify type safety
2. Run existing tests to ensure no regression
3. Add new tests for extracted components
4. Verify all discriminated unions are exhaustively checked

## Notes

- All components will use proper TypeScript strict mode
- No use of `any` type - use `unknown` with type guards instead
- Apply `readonly` modifiers where appropriate
- Use const assertions for constant values
- Follow existing project patterns and conventions
- Maintain backward compatibility with existing CSS classes