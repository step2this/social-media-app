# GraphQL Helpers Extraction Plan

## Problem

Multiple GraphQL service implementations (FeedService, NotificationDataService, etc.) duplicate the same logic:
1. Unwrapping GraphQL Connection edges to get nodes
2. Transforming AsyncState responses
3. Handling pagination data

**Current duplication in FeedService.graphql.ts (lines 121-131)**:
```typescript
private transformResponse(connection: PostConnection): Post[] {
  return connection.edges.map((edge) => edge.node);
}
```

**Current duplication in NotificationDataService** (proposed):
```typescript
// Will need similar unwrapping logic
response.edges.map(edge => edge.node)
```

## Solution: Extract Reusable GraphQL Helper Utilities

### Step 1: Create `/packages/frontend/src/graphql/helpers.ts`

```typescript
/**
 * GraphQL Helper Utilities
 *
 * Reusable helper functions for working with GraphQL responses.
 * Encapsulates common patterns like Connection unwrapping and response transformation.
 */

import type { AsyncState } from './types';

/**
 * GraphQL Connection edge structure (standard Relay pattern)
 */
export interface Edge<T> {
  node: T;
  cursor: string;
}

/**
 * GraphQL Connection structure (standard Relay pattern)
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount?: number;
}

/**
 * Unwrap GraphQL Connection to get array of nodes
 *
 * Converts Relay-style Connection (edges/nodes) to simple array.
 * Encapsulates GraphQL implementation detail from consumers.
 *
 * @param connection - GraphQL Connection object
 * @returns Array of nodes
 *
 * @example
 * ```typescript
 * const posts: Post[] = unwrapConnection(postConnection);
 * const notifications: Notification[] = unwrapConnection(notificationConnection);
 * ```
 */
export function unwrapConnection<T>(connection: Connection<T>): T[] {
  return connection.edges.map((edge) => edge.node);
}

/**
 * Transform GraphQL response that returns a single field
 *
 * Extracts nested data from GraphQL response while preserving AsyncState.
 * Common pattern: response shape is { fieldName: actualData }
 *
 * @param result - AsyncState result from GraphQL query/mutation
 * @param fieldName - Name of field to extract from response
 * @returns AsyncState with extracted field data
 *
 * @example
 * ```typescript
 * // GraphQL response: { notifications: NotificationConnection }
 * const result = await client.query<{ notifications: NotificationConnection }>(query);
 * return transformGraphQLResponse(result, 'notifications');
 * // Returns: AsyncState<NotificationConnection>
 * ```
 */
export function transformGraphQLResponse<TResponse, TField extends keyof TResponse>(
  result: AsyncState<TResponse>,
  fieldName: TField
): AsyncState<TResponse[TField]> {
  if (result.status === 'success') {
    return {
      status: 'success' as const,
      data: result.data[fieldName],
    };
  }
  return result;
}

/**
 * Transform GraphQL Connection response and unwrap to array
 *
 * Combines transformGraphQLResponse + unwrapConnection in one step.
 * Common pattern for queries that return Connection types.
 *
 * @param result - AsyncState result from GraphQL query
 * @param fieldName - Name of Connection field to extract
 * @returns AsyncState with unwrapped array of nodes
 *
 * @example
 * ```typescript
 * // GraphQL response: { notifications: { edges: [...], pageInfo: {...} } }
 * const result = await client.query<{ notifications: NotificationConnection }>(query);
 * return transformConnectionResponse(result, 'notifications');
 * // Returns: AsyncState<Notification[]>
 * ```
 */
export function transformConnectionResponse<
  TResponse,
  TField extends keyof TResponse,
  TNode
>(
  result: AsyncState<TResponse>,
  fieldName: TField
): AsyncState<TNode[]>
where TResponse[TField] extends Connection<TNode> {
  if (result.status === 'success') {
    const connection = result.data[fieldName] as Connection<TNode>;
    return {
      status: 'success' as const,
      data: unwrapConnection(connection),
    };
  }
  return result;
}

/**
 * Extract pagination info from Connection
 *
 * @param connection - GraphQL Connection object
 * @returns PageInfo object
 *
 * @example
 * ```typescript
 * const pageInfo = getPageInfo(postConnection);
 * if (pageInfo.hasNextPage) {
 *   // Load more with pageInfo.endCursor
 * }
 * ```
 */
export function getPageInfo<T>(connection: Connection<T>) {
  return connection.pageInfo;
}

/**
 * Check if Connection has more data to load
 *
 * @param connection - GraphQL Connection object
 * @returns true if there's a next page
 *
 * @example
 * ```typescript
 * if (hasNextPage(notificationConnection)) {
 *   setShowLoadMore(true);
 * }
 * ```
 */
export function hasNextPage<T>(connection: Connection<T>): boolean {
  return connection.pageInfo.hasNextPage;
}
```

### Step 2: Update NotificationDataService.graphql.ts

**BEFORE** (manual unwrapping in component):
```typescript
// NotificationsPage.tsx - ❌ Exposes GraphQL implementation detail
const response = await notificationDataService.getNotifications({ first: 100 });
setNotifications(response.edges.map(edge => edge.node)); // Manual unwrapping!
```

**AFTER** (encapsulated in service):
```typescript
// NotificationDataService.graphql.ts
import { unwrapConnection, transformGraphQLResponse } from '../../graphql/helpers';
import type { Connection } from '../../graphql/helpers';

async getNotifications(
  options?: NotificationQueryOptions
): Promise<AsyncState<Notification[]>> {  // ✅ Returns Notification[], not Connection
  const variables = {
    first: options?.first ?? this.DEFAULT_LIMIT,
    after: options?.after,
    unreadOnly: options?.unreadOnly,
  };

  return this.client
    .query<GetNotificationsResponse>(GET_NOTIFICATIONS_QUERY, variables)
    .then((result) => {
      if (result.status === 'success') {
        const notifications = unwrapConnection(result.data.notifications);
        return {
          status: 'success' as const,
          data: notifications,  // ✅ Array of Notification, not Connection
        };
      }
      return result;
    });
}

// NotificationsPage.tsx - ✅ Clean, no GraphQL knowledge needed
const response = await notificationDataService.getNotifications({ first: 100 });
if (response.status === 'success') {
  setNotifications(response.data);  // ✅ Already unwrapped!
}
```

### Step 3: Update FeedService.graphql.ts to use helpers

**BEFORE** (custom transformResponse method):
```typescript
private transformResponse(connection: PostConnection): Post[] {
  return connection.edges.map((edge) => edge.node);
}
```

**AFTER** (use shared helper):
```typescript
import { unwrapConnection } from '../../graphql/helpers';

// Remove transformResponse method, use unwrapConnection directly:
return unwrapConnection(result.data.homeFeed);
```

### Step 4: Update INotificationDataService interface

**BEFORE**:
```typescript
export interface INotificationDataService {
  getNotifications(options?: NotificationQueryOptions): Promise<AsyncState<NotificationConnection>>;
  //                                                                           ^^^ Leaks GraphQL detail
}
```

**AFTER**:
```typescript
export interface INotificationDataService {
  getNotifications(options?: NotificationQueryOptions): Promise<AsyncState<Notification[]>>;
  //                                                                           ^^^ Clean abstraction
}
```

### Step 5: Update NotificationsPage.tsx to use clean interface

**BEFORE** (was exposing GraphQL details):
```typescript
const response = await notificationDataService.getNotifications({ first: 100 });
setNotifications(response.edges.map(edge => edge.node));  // ❌ Component knows about edges/nodes
```

**AFTER** (clean separation of concerns):
```typescript
const response = await notificationDataService.getNotifications({ first: 100 });
if (response.status === 'success') {
  setNotifications(response.data);  // ✅ Just an array of notifications
}
```

## Benefits

### 1. **Encapsulation**
- ✅ Components don't know about GraphQL Connection structure
- ✅ Service layer handles unwrapping
- ✅ Can swap GraphQL for REST without changing components

### 2. **DRY**
- ✅ Remove duplicate unwrapping logic across services
- ✅ Single source of truth for Connection handling
- ✅ Consistent pattern across all services

### 3. **Type Safety**
- ✅ TypeScript ensures correct Connection types
- ✅ Generic helpers work with any node type
- ✅ Compile-time safety for response transformations

### 4. **Testability**
- ✅ Helpers are pure functions, easy to test
- ✅ Mock services return simple arrays, not Connections
- ✅ Test fixtures don't need Connection wrapper

### 5. **Maintainability**
- ✅ GraphQL implementation details isolated in one place
- ✅ Easier to update pagination logic
- ✅ Clear abstraction layer

## Files to Modify

**New file**:
- `/packages/frontend/src/graphql/helpers.ts` - Create helper utilities

**Update**:
- `/packages/frontend/src/services/implementations/NotificationDataService.graphql.ts` - Use unwrapConnection
- `/packages/frontend/src/services/implementations/FeedService.graphql.ts` - Use unwrapConnection
- `/packages/frontend/src/services/interfaces/INotificationDataService.ts` - Return arrays not Connections
- `/packages/frontend/src/pages/NotificationsPage.tsx` - Use clean service interface
- `/packages/frontend/src/graphql/index.ts` - Export helpers

**No changes needed** (already abstracted):
- `/packages/frontend/src/services/implementations/PostService.graphql.ts`
- `/packages/frontend/src/services/implementations/CommentService.graphql.ts`

## Pattern Comparison

### Old Pattern (GraphQL details leak to component)
```typescript
// Service
getNotifications(): Promise<AsyncState<NotificationConnection>>

// Component
const response = await service.getNotifications();
const notifications = response.data.edges.map(e => e.node);  // ❌ GraphQL knowledge
```

### New Pattern (Clean abstraction)
```typescript
// Service (encapsulates GraphQL)
getNotifications(): Promise<AsyncState<Notification[]>> {
  return client.query().then(result => {
    if (result.status === 'success') {
      return {
        status: 'success',
        data: unwrapConnection(result.data.notifications)  // ✅ Hidden here
      };
    }
    return result;
  });
}

// Component (no GraphQL knowledge)
const response = await service.getNotifications();
setNotifications(response.data);  // ✅ Just an array
```

## Success Criteria

- ✅ No component code references `.edges` or `.node`
- ✅ Service interfaces return arrays, not Connections
- ✅ GraphQL helpers are reused across services
- ✅ All tests pass
- ✅ Type safety maintained throughout

---

**This refactoring improves separation of concerns and makes the codebase more maintainable by properly encapsulating GraphQL implementation details in the service layer.**
