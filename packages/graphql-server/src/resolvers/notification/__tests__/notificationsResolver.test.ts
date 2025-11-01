/**
 * Notifications Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createNotificationsResolver } from '../notificationsResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetNotifications } from '../../../application/use-cases/notification/GetNotifications';
import { FakeNotificationRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockNotifications } from '@social-media-app/shared/test-utils/fixtures';

describe('notificationsResolver', () => {
  let container: Container;
  let resolver: ReturnType<typeof createNotificationsResolver>;

  beforeEach(() => {
    container = new Container();
  });

  it('returns notifications as a valid connection', async () => {
    const notifications = createMockNotifications(5, { userId: 'user-1' });
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetNotifications(repository);
    container.register('GetNotifications', () => useCase);
    resolver = createNotificationsResolver(container);

    const result = await resolver({}, { limit: 20 }, { userId: 'user-1' } as any, {} as any);

    expect(result.edges).toHaveLength(5);
    expect(result.edges[0].node.userId).toBe('user-1');
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('returns empty connection when no notifications exist', async () => {
    const repository = new FakeNotificationRepository([]);
    const useCase = new GetNotifications(repository);
    container.register('GetNotifications', () => useCase);
    resolver = createNotificationsResolver(container);

    const result = await resolver({}, { limit: 20 }, { userId: 'user-1' } as any, {} as any);

    expect(result.edges).toHaveLength(0);
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('indicates pagination when more notifications are available', async () => {
    const notifications = createMockNotifications(25, { userId: 'user-1' });
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetNotifications(repository);
    container.register('GetNotifications', () => useCase);
    resolver = createNotificationsResolver(container);

    const result = await resolver({}, { limit: 20 }, { userId: 'user-1' } as any, {} as any);

    expect(result.edges).toHaveLength(20);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});
