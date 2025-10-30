/**
 * Notification Data Service Tests
 *
 * Comprehensive tests for GraphQL-based Notification Data service.
 * Uses dependency injection and factory pattern for DRY testing.
 * Tests behavior, not implementation.
 *
 * Pattern: Constructor injection with MockGraphQLClient, NO vi.mock()
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { INotificationDataService } from '../interfaces/INotificationDataService';
import { NotificationDataServiceGraphQL } from '../implementations/NotificationDataService.graphql.js';
import { MockGraphQLClient } from '../../graphql/client.mock';
import {
  createMockNotification,
  createMockNotifications,
  createMockNotificationConnection,
  createMockUnreadCountResult,
  createMockMarkNotificationsAsReadResult,
} from './fixtures/notificationFixtures';
import { wrapInGraphQLSuccess } from './fixtures/graphqlFixtures';
import {
  expectServiceError,
  expectServiceSuccess,
  expectQueryCalledWith,
  errorScenarios,
} from './helpers/serviceTestHelpers';

// Type definitions for mock client generic calls
interface GetNotificationsVariables {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

interface MarkAsReadVariables {
  input: {
    notificationIds: readonly string[];
  };
}

describe('NotificationDataService.graphql', () => {
  let service: INotificationDataService;
  let mockClient: MockGraphQLClient;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    service = new NotificationDataServiceGraphQL(mockClient);
  });

  describe('getUnreadCount', () => {
    it('should fetch unread notification count successfully', async () => {
      const unreadCount = createMockUnreadCountResult({ count: 5 });

      await expectServiceSuccess(
        mockClient,
        () => service.getUnreadCount(),
        { unreadCount },
        (data) => {
          expect(data.count).toBe(5);
        },
        'query'
      );
    });

    it('should return zero when no unread notifications', async () => {
      const unreadCount = createMockUnreadCountResult({ count: 0 });

      await expectServiceSuccess(
        mockClient,
        () => service.getUnreadCount(),
        { unreadCount },
        (data) => {
          expect(data.count).toBe(0);
        },
        'query'
      );
    });

    it('should handle authentication errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.getUnreadCount(),
        errorScenarios.authentication.unauthenticated.message,
        errorScenarios.authentication.unauthenticated.code,
        'query'
      );
    });

    it('should handle network errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.getUnreadCount(),
        errorScenarios.network.error.message,
        errorScenarios.network.error.code,
        'query'
      );
    });
  });

  describe('getNotifications', () => {
    it('should fetch notifications successfully with default options', async () => {
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

    it('should pass limit option to query', async () => {
      const notifications = createMockNotifications(20);
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications({ limit: 20 });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data).toHaveLength(20);
      }

      expectQueryCalledWith<GetNotificationsVariables>(mockClient, { limit: 20 });
    });

    it('should use default limit of 50 if not provided', async () => {
      const notifications = createMockNotifications(50);
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications();

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data).toHaveLength(50);
      }

      expectQueryCalledWith<GetNotificationsVariables>(mockClient, { limit: 50 });
    });

    it('should handle pagination with cursor', async () => {
      const notifications = createMockNotifications(50);
      const connection = createMockNotificationConnection(notifications, true);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications({
        limit: 50,
        cursor: 'encoded-cursor',
      });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data).toHaveLength(50);
      }

      expectQueryCalledWith<GetNotificationsVariables>(mockClient, {
        cursor: 'encoded-cursor',
      });
    });

    it('should filter unread notifications only when specified', async () => {
      const notifications = createMockNotifications(5, { status: 'unread' });
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications({ unreadOnly: true });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        // All notifications should be unread
        expect(result.data.length).toBe(5);
      }

      expectQueryCalledWith<GetNotificationsVariables>(mockClient, {
        unreadOnly: true,
      });
    });

    it('should handle empty results', async () => {
      const connection = createMockNotificationConnection([]);

      await expectServiceSuccess(
        mockClient,
        () => service.getNotifications(),
        { notifications: connection },
        (data) => {
          expect(data).toHaveLength(0);
        },
        'query'
      );
    });

    it('should handle notifications with different types', async () => {
      const notifications = [
        createMockNotification({ type: 'like' }),
        createMockNotification({ type: 'comment' }),
        createMockNotification({ type: 'follow' }),
        createMockNotification({ type: 'mention' }),
      ];
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications();

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data[0].type).toBe('like');
        expect(result.data[1].type).toBe('comment');
        expect(result.data[2].type).toBe('follow');
        expect(result.data[3].type).toBe('mention');
      }
    });

    it('should handle authentication errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.getNotifications(),
        errorScenarios.authentication.unauthenticated.message,
        errorScenarios.authentication.unauthenticated.code,
        'query'
      );
    });
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
      const result = createMockMarkNotificationsAsReadResult();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: result }));

      await service.markAsRead('notif-1');

      const lastCall = mockClient.lastMutationCall<MarkAsReadVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.input.notificationIds).toEqual(['notif-1']);
    });

    it('should handle authentication errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.markAsRead('notif-1'),
        errorScenarios.authentication.unauthenticated.message,
        errorScenarios.authentication.unauthenticated.code
      );
    });

    it('should handle notification not found errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.markAsRead('nonexistent'),
        errorScenarios.notFound.notification.message,
        errorScenarios.notFound.notification.code
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      await expectServiceSuccess(
        mockClient,
        () => service.markAllAsRead(),
        { markNotificationsAsRead: createMockMarkNotificationsAsReadResult({ success: true, markedCount: 10 }) },
        (data) => {
          expect(data.success).toBe(true);
          expect(data.markedCount).toBe(10);
        }
      );
    });

    it('should pass empty array to mutation (backend interprets as "all")', async () => {
      const result = createMockMarkNotificationsAsReadResult();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: result }));

      await service.markAllAsRead();

      const lastCall = mockClient.lastMutationCall<MarkAsReadVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.input.notificationIds).toEqual([]);
    });

    it('should handle authentication errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.markAllAsRead(),
        errorScenarios.authentication.unauthenticated.message,
        errorScenarios.authentication.unauthenticated.code
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle fetching notifications and marking single one as read', async () => {
      // Fetch notifications
      const notifications = createMockNotifications(3, { status: 'unread' });
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const fetchResult = await service.getNotifications({ unreadOnly: true });
      expect(fetchResult.status).toBe('success');

      // Mark first one as read
      const markResult = createMockMarkNotificationsAsReadResult({
        success: true,
        markedCount: 1,
      });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: markResult }));

      if (fetchResult.status === 'success') {
        const firstNotificationId = fetchResult.data[0].id;
        const markResponse = await service.markAsRead(firstNotificationId);

        expect(markResponse.status).toBe('success');
        if (markResponse.status === 'success') {
          expect(markResponse.data.markedCount).toBe(1);
        }
      }
    });

    it('should handle checking unread count after marking as read', async () => {
      // Initial unread count
      const initialCount = createMockUnreadCountResult({ count: 5 });
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ unreadCount: initialCount }));

      const initialResult = await service.getUnreadCount();
      expect(initialResult.status).toBe('success');

      // Mark one as read
      const markResult = createMockMarkNotificationsAsReadResult({
        success: true,
        markedCount: 1,
      });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: markResult }));

      await service.markAsRead('notif-1');

      // Updated unread count
      const updatedCount = createMockUnreadCountResult({ count: 4 });
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ unreadCount: updatedCount }));

      const updatedResult = await service.getUnreadCount();
      expect(updatedResult.status).toBe('success');
      if (updatedResult.status === 'success') {
        expect(updatedResult.data.count).toBe(4);
      }
    });
  });
});
