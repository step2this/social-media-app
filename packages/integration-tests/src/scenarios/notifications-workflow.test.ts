/**
 * Notifications Workflow Integration Test
 *
 * This test demonstrates the complete notifications workflow:
 * 1. Create notifications via user interactions (like, comment, follow)
 * 2. Retrieve notifications list with pagination
 * 3. Mark notifications as read (single and bulk)
 * 4. Mark all notifications as read
 * 5. Delete notifications
 * 6. Verify unread count updates
 * 7. Authorization and validation
 *
 * Tests real-time notification system with DynamoDB backend.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  RegisterResponseSchema,
  CreatePostResponseSchema,
  LikePostResponseSchema,
  CreateCommentResponseSchema,
  FollowUserResponseSchema,
  NotificationsListResponseSchema,
  MarkNotificationReadResponseSchema,
  MarkAllNotificationsReadResponseSchema,
  GetUnreadCountResponseSchema,
  DeleteNotificationResponseSchema,
  type RegisterResponse,
  type CreatePostResponse,
  type LikePostResponse,
  type CreateCommentResponse,
  type FollowUserResponse,
  type NotificationsListResponse,
  type MarkNotificationReadResponse,
  type MarkAllNotificationsReadResponse,
  type GetUnreadCountResponse,
  type DeleteNotificationResponse
} from '@social-media-app/shared';
import {
  createLocalStackHttpClient,
  parseResponse,
  environmentDetector,
  testLogger,
  delay
} from '../utils/index.js';
import {
  createRegisterRequest,
  createPostRequest
} from '../fixtures/index.js';

describe('Notifications Workflow Integration', () => {
  const httpClient = createLocalStackHttpClient();

  // Test users and data
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let testPostId: string;
  let notificationId: string;

  beforeAll(async () => {
    testLogger.info('Starting Notifications Workflow Integration Tests');

    // Wait for services to be ready
    await environmentDetector.waitForServices(30000);

    // Verify environment configuration
    const serviceUrls = environmentDetector.getServiceUrls();
    testLogger.debug('Service URLs:', serviceUrls);

    // Verify services are available
    const localStackReady = await environmentDetector.isLocalStackAvailable();
    const apiReady = await environmentDetector.isApiServerAvailable();

    if (!localStackReady) {
      throw new Error('LocalStack is not available. Please start LocalStack before running integration tests.');
    }

    if (!apiReady) {
      throw new Error('API server is not available. Please start the backend server before running integration tests.');
    }

    testLogger.info('All required services are ready');

    // Setup: Create two test users
    const uniqueId1 = randomUUID().slice(0, 8);
    const uniqueId2 = randomUUID().slice(0, 8);

    // Register user 1 (will receive notifications)
    const user1RegisterRequest = createRegisterRequest()
      .withEmail(`notif-test-user1-${uniqueId1}@tamafriends.local`)
      .withUsername(`notifuser1_${uniqueId1}`)
      .withPassword('TestPassword123!')
      .build();

    const user1RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user1RegisterRequest);
    const user1RegisterData = await parseResponse(user1RegisterResponse, RegisterResponseSchema);
    user1Token = user1RegisterData.tokens!.accessToken;
    user1Id = user1RegisterData.user.id;

    // Register user 2 (will trigger notifications)
    const user2RegisterRequest = createRegisterRequest()
      .withEmail(`notif-test-user2-${uniqueId2}@tamafriends.local`)
      .withUsername(`notifuser2_${uniqueId2}`)
      .withPassword('TestPassword123!')
      .build();

    const user2RegisterResponse = await httpClient.post<RegisterResponse>('/auth/register', user2RegisterRequest);
    const user2RegisterData = await parseResponse(user2RegisterResponse, RegisterResponseSchema);
    user2Token = user2RegisterData.tokens!.accessToken;
    user2Id = user2RegisterData.user.id;

    // Create a test post by user1 (for like/comment notifications)
    const postRequest = createPostRequest()
      .withCaption('Test post for notifications integration')
      .build();

    const createPostResponse = await httpClient.post<CreatePostResponse>(
      '/posts',
      postRequest,
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    const createPostData = await parseResponse(createPostResponse, CreatePostResponseSchema);
    testPostId = createPostData.post.id;

    testLogger.info('Setup complete', { user1Id, user2Id, testPostId });
  }, 30000);

  afterAll(() => {
    testLogger.info('Notifications Workflow Integration Tests completed');
  });

  describe('Create Notifications via Interactions', () => {
    it('should create notification when user likes a post', async () => {
      testLogger.debug('Testing notification creation via like');

      // User 2 likes user 1's post
      const likeResponse = await httpClient.post<LikePostResponse>(
        '/likes',
        { postId: testPostId },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      const likeData = await parseResponse(likeResponse, LikePostResponseSchema);
      expect(likeData.success).toBe(true);

      // Wait for notification system to process
      testLogger.info('Waiting for notification to be created');
      await delay(1000);

      // Verify notification was created for user 1
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      expect(notificationsData.notifications).toBeDefined();
      expect(notificationsData.notifications.length).toBeGreaterThan(0);

      // Find the like notification
      const likeNotification = notificationsData.notifications.find(
        n => n.type === 'like' && n.target?.id === testPostId
      );

      expect(likeNotification).toBeDefined();
      expect(likeNotification?.status).toBe('unread');
      expect(likeNotification?.actor?.userId).toBe(user2Id);

      // Save for later tests
      notificationId = likeNotification!.id;
    });

    it('should create notification when user comments on a post', async () => {
      testLogger.debug('Testing notification creation via comment');

      // User 2 comments on user 1's post
      const commentResponse = await httpClient.post<CreateCommentResponse>(
        '/comments',
        { postId: testPostId, content: 'Great post!' },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      const commentData = await parseResponse(commentResponse, CreateCommentResponseSchema);
      expect(commentData.comment).toBeDefined();

      // Wait for notification system to process
      await delay(1000);

      // Verify notification was created for user 1
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      // Find the comment notification
      const commentNotification = notificationsData.notifications.find(
        n => n.type === 'comment' && n.target?.id === testPostId
      );

      expect(commentNotification).toBeDefined();
      expect(commentNotification?.status).toBe('unread');
      expect(commentNotification?.actor?.userId).toBe(user2Id);
    });

    it('should create notification when user follows another user', async () => {
      testLogger.debug('Testing notification creation via follow');

      // User 2 follows user 1
      const followResponse = await httpClient.post<FollowUserResponse>(
        '/follows',
        { userId: user1Id },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      const followData = await parseResponse(followResponse, FollowUserResponseSchema);
      expect(followData.success).toBe(true);

      // Wait for notification system to process
      await delay(1000);

      // Verify notification was created for user 1
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      // Find the follow notification
      const followNotification = notificationsData.notifications.find(
        n => n.type === 'follow' && n.actor?.userId === user2Id
      );

      expect(followNotification).toBeDefined();
      expect(followNotification?.status).toBe('unread');
    });
  });

  describe('Fetch Notifications List', () => {
    it('should retrieve all notifications for user', async () => {
      testLogger.debug('Testing get notifications operation');

      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      expect(notificationsData.notifications).toBeDefined();
      expect(notificationsData.notifications.length).toBeGreaterThan(0);
      expect(notificationsData.totalCount).toBeGreaterThan(0);

      // Verify notifications are sorted by newest first
      const timestamps = notificationsData.notifications.map(n => new Date(n.createdAt).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });

    it('should respect pagination limit', async () => {
      testLogger.debug('Testing pagination limit');

      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications?limit=1',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      expect(notificationsData.notifications).toBeDefined();
      expect(notificationsData.notifications.length).toBe(1);

      // Verify pagination metadata
      if (notificationsData.totalCount > 1) {
        expect(notificationsData.hasMore).toBe(true);
        expect(notificationsData.nextCursor).toBeDefined();
      }
    });

    it('should support pagination with cursor', async () => {
      testLogger.debug('Testing pagination with cursor');

      // Get first page
      const firstPageResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications?limit=1',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const firstPageData = await parseResponse(firstPageResponse, NotificationsListResponseSchema);

      if (!firstPageData.hasMore || !firstPageData.nextCursor) {
        // Skip test if not enough notifications for pagination
        testLogger.info('Skipping pagination test - not enough notifications');
        return;
      }

      // Get second page
      const secondPageResponse = await httpClient.get<NotificationsListResponse>(
        `/notifications?limit=1&cursor=${firstPageData.nextCursor}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const secondPageData = await parseResponse(secondPageResponse, NotificationsListResponseSchema);

      expect(secondPageData.notifications.length).toBeGreaterThan(0);
      expect(secondPageData.notifications[0].id).not.toBe(firstPageData.notifications[0].id);
    });

    it('should filter notifications by status (unread)', async () => {
      testLogger.debug('Testing filter by unread status');

      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications?filter=unread',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      expect(notificationsData.notifications).toBeDefined();
      notificationsData.notifications.forEach(notification => {
        expect(notification.status).toBe('unread');
      });
    });

    it('should return empty array for user with no notifications', async () => {
      testLogger.debug('Testing get notifications for user with no notifications');

      // User 2 should have no notifications (they triggered notifications for user 1)
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      expect(notificationsData.notifications).toBeDefined();
      expect(notificationsData.totalCount).toBe(0);
      expect(notificationsData.hasMore).toBe(false);
    });
  });

  describe('Unread Count', () => {
    it('should get unread notification count', async () => {
      testLogger.debug('Testing get unread count');

      const countResponse = await httpClient.get<GetUnreadCountResponse>(
        '/notifications/unread-count',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const countData = await parseResponse(countResponse, GetUnreadCountResponseSchema);

      expect(countData.count).toBeDefined();
      expect(countData.count).toBeGreaterThan(0);
    });

    it('should return zero for user with no unread notifications', async () => {
      testLogger.debug('Testing unread count for user with no notifications');

      const countResponse = await httpClient.get<GetUnreadCountResponse>(
        '/notifications/unread-count',
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      const countData = await parseResponse(countResponse, GetUnreadCountResponseSchema);

      expect(countData.count).toBe(0);
    });
  });

  describe('Mark Notifications as Read', () => {
    it('should mark single notification as read', async () => {
      testLogger.debug('Testing mark single notification as read');

      const markReadResponse = await httpClient.put<MarkNotificationReadResponse>(
        `/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const markReadData = await parseResponse(markReadResponse, MarkNotificationReadResponseSchema);

      expect(markReadData.notification).toBeDefined();
      expect(markReadData.notification?.id).toBe(notificationId);
      expect(markReadData.notification?.status).toBe('read');

      // Verify notification is marked as read in list
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);
      const updatedNotification = notificationsData.notifications.find(n => n.id === notificationId);

      expect(updatedNotification?.status).toBe('read');
    });

    it('should be idempotent when marking already-read notification', async () => {
      testLogger.debug('Testing mark read idempotency');

      // Mark same notification as read again
      const markReadResponse = await httpClient.put<MarkNotificationReadResponse>(
        `/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const markReadData = await parseResponse(markReadResponse, MarkNotificationReadResponseSchema);

      // Should still succeed
      expect(markReadData.notification).toBeDefined();
      expect(markReadData.notification?.status).toBe('read');
    });

    it('should update unread count after marking as read', async () => {
      testLogger.debug('Testing unread count update after mark read');

      // Get initial unread count
      const initialCountResponse = await httpClient.get<GetUnreadCountResponse>(
        '/notifications/unread-count',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const initialCountData = await parseResponse(initialCountResponse, GetUnreadCountResponseSchema);
      const initialCount = initialCountData.count;

      // Get an unread notification
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications?filter=unread&limit=1',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      if (notificationsData.notifications.length === 0) {
        testLogger.info('No unread notifications to test count update');
        return;
      }

      const unreadNotificationId = notificationsData.notifications[0].id;

      // Mark as read
      await httpClient.put<MarkNotificationReadResponse>(
        `/notifications/${unreadNotificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      // Get updated unread count
      const updatedCountResponse = await httpClient.get<GetUnreadCountResponse>(
        '/notifications/unread-count',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const updatedCountData = await parseResponse(updatedCountResponse, GetUnreadCountResponseSchema);

      expect(updatedCountData.count).toBe(initialCount - 1);
    });
  });

  describe('Mark All Notifications as Read', () => {
    it('should mark all notifications as read', async () => {
      testLogger.debug('Testing mark all notifications as read');

      const markAllReadResponse = await httpClient.put<MarkAllNotificationsReadResponse>(
        '/notifications/mark-all-read',
        {},
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const markAllReadData = await parseResponse(markAllReadResponse, MarkAllNotificationsReadResponseSchema);

      expect(markAllReadData.updatedCount).toBeDefined();
      expect(markAllReadData.updatedCount).toBeGreaterThanOrEqual(0);

      // Verify unread count is now zero
      const countResponse = await httpClient.get<GetUnreadCountResponse>(
        '/notifications/unread-count',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const countData = await parseResponse(countResponse, GetUnreadCountResponseSchema);
      expect(countData.count).toBe(0);

      // Verify all notifications are marked as read
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);
      notificationsData.notifications.forEach(notification => {
        expect(notification.status).toBe('read');
      });
    });

    it('should be idempotent when no unread notifications exist', async () => {
      testLogger.debug('Testing mark all read idempotency');

      // Mark all as read again (already read)
      const markAllReadResponse = await httpClient.put<MarkAllNotificationsReadResponse>(
        '/notifications/mark-all-read',
        {},
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const markAllReadData = await parseResponse(markAllReadResponse, MarkAllNotificationsReadResponseSchema);

      // Should return 0 updated count
      expect(markAllReadData.updatedCount).toBe(0);
    });
  });

  describe('Delete Notifications', () => {
    it('should delete notification successfully', async () => {
      testLogger.debug('Testing delete notification');

      // Get a notification to delete
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications?limit=1',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      if (notificationsData.notifications.length === 0) {
        testLogger.info('No notifications to delete');
        return;
      }

      const deleteNotificationId = notificationsData.notifications[0].id;
      const initialCount = notificationsData.totalCount;

      // Delete the notification
      const deleteResponse = await httpClient.delete<DeleteNotificationResponse>(
        `/notifications/${deleteNotificationId}`,
        undefined,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const deleteData = await parseResponse(deleteResponse, DeleteNotificationResponseSchema);

      expect(deleteData.success).toBe(true);

      // Verify notification is removed from list
      const updatedNotificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const updatedNotificationsData = await parseResponse(updatedNotificationsResponse, NotificationsListResponseSchema);

      expect(updatedNotificationsData.totalCount).toBe(initialCount - 1);
      expect(updatedNotificationsData.notifications.find(n => n.id === deleteNotificationId)).toBeUndefined();
    });

    it('should be idempotent when deleting non-existent notification', async () => {
      testLogger.debug('Testing delete idempotency');

      const fakeNotificationId = randomUUID();

      // Delete non-existent notification
      const deleteResponse = await httpClient.delete<DeleteNotificationResponse>(
        `/notifications/${fakeNotificationId}`,
        undefined,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      const deleteData = await parseResponse(deleteResponse, DeleteNotificationResponseSchema);

      // Should still return success (idempotent)
      expect(deleteData.success).toBe(true);
    });

    it('should return 403 when trying to delete another user\'s notification', async () => {
      testLogger.debug('Testing delete authorization');

      // Get user 1's notification
      const notificationsResponse = await httpClient.get<NotificationsListResponse>(
        '/notifications?limit=1',
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const notificationsData = await parseResponse(notificationsResponse, NotificationsListResponseSchema);

      if (notificationsData.notifications.length === 0) {
        testLogger.info('No notifications to test authorization');
        return;
      }

      const user1NotificationId = notificationsData.notifications[0].id;

      // Try to delete with user 2's token
      try {
        await httpClient.delete<DeleteNotificationResponse>(
          `/notifications/${user1NotificationId}`,
          undefined,
          { headers: { Authorization: `Bearer ${user2Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(403);
      }
    });
  });

  describe('Authorization', () => {
    it('should require authentication for getting notifications', async () => {
      testLogger.debug('Testing authentication requirement for get notifications');

      try {
        await httpClient.get<NotificationsListResponse>('/notifications');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should require authentication for getting unread count', async () => {
      testLogger.debug('Testing authentication requirement for get unread count');

      try {
        await httpClient.get<GetUnreadCountResponse>('/notifications/unread-count');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should require authentication for marking as read', async () => {
      testLogger.debug('Testing authentication requirement for mark as read');

      try {
        await httpClient.put<MarkNotificationReadResponse>(
          `/notifications/${notificationId}/read`,
          {}
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should require authentication for marking all as read', async () => {
      testLogger.debug('Testing authentication requirement for mark all as read');

      try {
        await httpClient.put<MarkAllNotificationsReadResponse>(
          '/notifications/mark-all-read',
          {}
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should require authentication for deleting notifications', async () => {
      testLogger.debug('Testing authentication requirement for delete');

      try {
        await httpClient.delete<DeleteNotificationResponse>(
          `/notifications/${notificationId}`
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should reject invalid Bearer token', async () => {
      testLogger.debug('Testing invalid Bearer token');

      try {
        await httpClient.get<NotificationsListResponse>(
          '/notifications',
          { headers: { Authorization: 'Bearer invalid-token' } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });
  });

  describe('Validation', () => {
    it('should reject invalid notificationId format', async () => {
      testLogger.debug('Testing invalid notificationId validation');

      try {
        await httpClient.put<MarkNotificationReadResponse>(
          '/notifications/not-a-uuid/read',
          {},
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should reject invalid limit parameter', async () => {
      testLogger.debug('Testing invalid limit validation');

      try {
        await httpClient.get<NotificationsListResponse>(
          '/notifications?limit=-1',
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should reject limit exceeding maximum', async () => {
      testLogger.debug('Testing maximum limit validation');

      try {
        await httpClient.get<NotificationsListResponse>(
          '/notifications?limit=1000',
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should reject invalid filter parameter', async () => {
      testLogger.debug('Testing invalid filter validation');

      try {
        await httpClient.get<NotificationsListResponse>(
          '/notifications?filter=invalid-filter',
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });
});
