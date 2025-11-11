/**
 * GetNotifications Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetNotifications } from '../GetNotifications.js';
import { FakeNotificationRepository } from '../../../../../__tests__/helpers/fake-repositories.js';
import { createMockNotifications } from '@social-media-app/shared/test-utils/fixtures';

describe('GetNotifications', () => {
  it('returns notifications for the specified user', async () => {
    const notifications = createMockNotifications(5, { userId: 'user-1' });
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetNotifications(repository);

    const result = await useCase.execute('user-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(5);
      expect(result.data.items[0].userId).toBe('user-1');
    }
  });

  it('returns empty array when no notifications exist', async () => {
    const repository = new FakeNotificationRepository([]);
    const useCase = new GetNotifications(repository);

    const result = await useCase.execute('user-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('handles pagination correctly', async () => {
    const notifications = createMockNotifications(25, { userId: 'user-1' });
    const repository = new FakeNotificationRepository(notifications);
    const useCase = new GetNotifications(repository);

    const result = await useCase.execute('user-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(20);
      expect(result.data.hasMore).toBe(true);
    }
  });
});
