/**
 * GetUnreadNotificationsCount Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetUnreadNotificationsCount } from '../GetUnreadNotificationsCount';
import { FakeNotificationRepository } from '../../../../../__tests__/helpers/fake-repositories';
import { createMockNotifications } from '@social-media-app/shared/test-utils/fixtures';

describe('GetUnreadNotificationsCount', () => {
  it('returns count of unread notifications', async () => {
    const notifications = [
      ...createMockNotifications(5, { userId: 'user-1', read: false }),
      ...createMockNotifications(3, { userId: 'user-1', read: true }),
    ];
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetUnreadNotificationsCount(repository);

    const result = await useCase.execute('user-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(5);
    }
  });

  it('returns zero when no unread notifications exist', async () => {
    const notifications = createMockNotifications(3, { userId: 'user-1', read: true });
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetUnreadNotificationsCount(repository);

    const result = await useCase.execute('user-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(0);
    }
  });

  it('returns zero when no notifications exist', async () => {
    const repository = new FakeNotificationRepository([]);
    const useCase = new GetUnreadNotificationsCount(repository);

    const result = await useCase.execute('user-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(0);
    }
  });
});
