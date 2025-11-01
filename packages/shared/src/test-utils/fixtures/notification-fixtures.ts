/**
 * Notification Test Fixtures
 *
 * Lean test data builders for notification entities.
 */

export interface MockNotification {
  id: string;
  userId: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';
  read: boolean;
  createdAt: string;
  actorId?: string;
  postId?: string;
}

/**
 * Creates a single mock notification with optional overrides.
 */
export function createMockNotification(
  overrides: Partial<MockNotification> = {}
): MockNotification {
  return {
    id: `notif-${Math.random().toString(36).slice(2, 9)}`,
    userId: 'user-1',
    type: 'LIKE',
    read: false,
    createdAt: new Date().toISOString(),
    actorId: 'actor-1',
    postId: 'post-1',
    ...overrides,
  };
}

/**
 * Creates an array of mock notifications.
 */
export function createMockNotifications(
  count: number,
  overrides?: Partial<MockNotification>
): MockNotification[] {
  return Array.from({ length: count }, (_, i) =>
    createMockNotification({
      id: `notif-${i + 1}`,
      ...overrides,
    })
  );
}

/**
 * Creates an unread notification (convenience helper).
 */
export function createMockUnreadNotification(
  overrides?: Partial<MockNotification>
): MockNotification {
  return createMockNotification({ read: false, ...overrides });
}

/**
 * Creates a read notification (convenience helper).
 */
export function createMockReadNotification(
  overrides?: Partial<MockNotification>
): MockNotification {
  return createMockNotification({ read: true, ...overrides });
}
