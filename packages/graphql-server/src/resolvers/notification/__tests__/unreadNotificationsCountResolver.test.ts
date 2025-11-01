/**
 * UnreadNotificationsCount Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createUnreadNotificationsCountResolver } from '../unreadNotificationsCountResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetUnreadNotificationsCount } from '../../../application/use-cases/notification/GetUnreadNotificationsCount';
import { FakeNotificationRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockNotifications } from '@social-media-app/shared/test-utils/fixtures';

describe('unreadNotificationsCountResolver', () => {
  let container: Container;
  let resolver: ReturnType<typeof createUnreadNotificationsCountResolver>;

  beforeEach(() => {
    container = new Container();
  });

  it('returns count of unread notifications', async () => {
    const notifications = [
      ...createMockNotifications(5, { userId: 'user-1', read: false }),
      ...createMockNotifications(3, { userId: 'user-1', read: true }),
    ];
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetUnreadNotificationsCount(repository);
    container.register('GetUnreadNotificationsCount', () => useCase);
    resolver = createUnreadNotificationsCountResolver(container);

    const result = await resolver({}, {}, { userId: 'user-1' } as any, {} as any);

    expect(result).toBe(5);
  });

  it('returns zero when no unread notifications exist', async () => {
    const notifications = createMockNotifications(3, { userId: 'user-1', read: true });
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetUnreadNotificationsCount(repository);
    container.register('GetUnreadNotificationsCount', () => useCase);
    resolver = createUnreadNotificationsCountResolver(container);

    const result = await resolver({}, {}, { userId: 'user-1' } as any, {} as any);

    expect(result).toBe(0);
  });

  it('returns zero when no notifications exist', async () => {
    const repository = new FakeNotificationRepository([]);
    const useCase = new GetUnreadNotificationsCount(repository);
    container.register('GetUnreadNotificationsCount', () => useCase);
    resolver = createUnreadNotificationsCountResolver(container);

    const result = await resolver({}, {}, { userId: 'user-1' } as any, {} as any);

    expect(result).toBe(0);
  });
});
