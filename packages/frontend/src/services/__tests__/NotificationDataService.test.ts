/**
 * Notification Data Service Tests
 *
 * Comprehensive tests for GraphQL-based Notification Data service.
 * Uses dependency injection and factory pattern for DRY testing.
 * Tests behavior, not implementation.
 *
 * TDD: Tests written first to define expected behavior
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
import { wrapInGraphQLError, wrapInGraphQLSuccess } from './fixtures/graphqlFixtures';
import {
  expectServiceError,
  errorScenarios,
} from './helpers/serviceTestHelpers';

// Type definitions for mock client generic calls
interface GetUnreadCountVariables {
  // No variables for unread count query
}

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
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ unreadCount }));

      const result = await service.getUnreadCount();

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.count).toBe(5);
      }
    });

    it('should return zero when no unread notifications', async () => {
      const unreadCount = createMockUnreadCountResult({ count: 0 });
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ unreadCount }));

      const result = await service.getUnreadCount();

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.count).toBe(0);
      }
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
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications();

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.edges).toHaveLength(3);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should pass limit option to query', async () => {
      const notifications = createMockNotifications(20);
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      await service.getNotifications({ limit: 20 });

      const lastCall = mockClient.lastQueryCall<GetNotificationsVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.limit).toBe(20);
    });

    it('should use default limit of 50 if not provided', async () => {
      const notifications = createMockNotifications(50);
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      await service.getNotifications();

      const lastCall = mockClient.lastQueryCall<GetNotificationsVariables>();
      expect(lastCall?.variables.limit).toBe(50);
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
        expect(result.data.pageInfo.hasNextPage).toBe(true);
        expect(result.data.edges).toHaveLength(50);
      }

      const lastCall = mockClient.lastQueryCall<GetNotificationsVariables>();
      expect(lastCall?.variables.cursor).toBe('encoded-cursor');
    });

    it('should filter unread notifications only when specified', async () => {
      const notifications = createMockNotifications(5, { read: false });
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications({ unreadOnly: true });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        result.data.edges.forEach(edge => {
          expect(edge.node.read).toBe(false);
        });
      }

      const lastCall = mockClient.lastQueryCall<GetNotificationsVariables>();
      expect(lastCall?.variables.unreadOnly).toBe(true);
    });

    it('should handle empty results', async () => {
      const connection = createMockNotificationConnection([]);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const result = await service.getNotifications();

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.edges).toHaveLength(0);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
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
        expect(result.data.edges[0].node.type).toBe('like');
        expect(result.data.edges[1].node.type).toBe('comment');
        expect(result.data.edges[2].node.type).toBe('follow');
        expect(result.data.edges[3].node.type).toBe('mention');
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
    it('should mark notifications as read successfully', async () => {
      const result = createMockMarkNotificationsAsReadResult({
        success: true,
        markedCount: 3,
      });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: result }));

      const response = await service.markAsRead({
        notificationIds: ['notif-1', 'notif-2', 'notif-3'],
      });

      expect(response.status).toBe('success');
      if (response.status === 'success') {
        expect(response.data.success).toBe(true);
        expect(response.data.markedCount).toBe(3);
      }
    });

    it('should pass notification IDs to mutation', async () => {
      const result = createMockMarkNotificationsAsReadResult();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: result }));

      await service.markAsRead({
        notificationIds: ['notif-1', 'notif-2'],
      });

      const lastCall = mockClient.lastMutationCall<MarkAsReadVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.input.notificationIds).toEqual(['notif-1', 'notif-2']);
    });

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

    it('should handle empty notification IDs', async () => {
      const result = createMockMarkNotificationsAsReadResult({
        success: true,
        markedCount: 0,
      });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: result }));

      const response = await service.markAsRead({
        notificationIds: [],
      });

      expect(response.status).toBe('success');
      if (response.status === 'success') {
        expect(response.data.markedCount).toBe(0);
      }
    });

    it('should handle authentication errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.markAsRead({ notificationIds: ['notif-1'] }),
        errorScenarios.authentication.unauthenticated.message,
        errorScenarios.authentication.unauthenticated.code
      );
    });

    it('should handle notification not found errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.markAsRead({ notificationIds: ['nonexistent'] }),
        errorScenarios.notFound.notification.message,
        errorScenarios.notFound.notification.code
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle fetching notifications and marking them as read', async () => {
      // Fetch notifications
      const notifications = createMockNotifications(3, { read: false });
      const connection = createMockNotificationConnection(notifications);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ notifications: connection }));

      const fetchResult = await service.getNotifications({ unreadOnly: true });
      expect(fetchResult.status).toBe('success');

      // Mark them as read
      const markResult = createMockMarkNotificationsAsReadResult({
        success: true,
        markedCount: 3,
      });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: markResult }));

      if (fetchResult.status === 'success') {
        const notificationIds = fetchResult.data.edges.map(edge => edge.node.id);
        const markResponse = await service.markAsRead({ notificationIds });

        expect(markResponse.status).toBe('success');
        if (markResponse.status === 'success') {
          expect(markResponse.data.markedCount).toBe(3);
        }
      }
    });

    it('should handle checking unread count after marking as read', async () => {
      // Initial unread count
      const initialCount = createMockUnreadCountResult({ count: 5 });
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ unreadCount: initialCount }));

      const initialResult = await service.getUnreadCount();
      expect(initialResult.status).toBe('success');

      // Mark some as read
      const markResult = createMockMarkNotificationsAsReadResult({
        success: true,
        markedCount: 3,
      });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ markNotificationsAsRead: markResult }));

      await service.markAsRead({ notificationIds: ['notif-1', 'notif-2', 'notif-3'] });

      // Updated unread count
      const updatedCount = createMockUnreadCountResult({ count: 2 });
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ unreadCount: updatedCount }));

      const updatedResult = await service.getUnreadCount();
      expect(updatedResult.status).toBe('success');
      if (updatedResult.status === 'success') {
        expect(updatedResult.data.count).toBe(2);
      }
    });
  });
});
