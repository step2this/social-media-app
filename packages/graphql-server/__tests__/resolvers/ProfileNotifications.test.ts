/**
 * Profile & Notification Resolver Tests (TDD RED Phase)
 *
 * Tests GraphQL Profile & Notification Mutation and Query resolvers by mocking DAL services.
 *
 * Test Focus (GraphQL concerns only):
 * - Profile update operations (updateProfile, getProfilePictureUploadUrl)
 * - Notification operations (markAsRead, markAllAsRead, delete)
 * - Feed marking operations (markFeedItemsAsRead)
 * - Response field mapping (DAL types → GraphQL types)
 * - Error handling (UNAUTHENTICATED, NOT_FOUND, BAD_REQUEST)
 * - Pagination (notifications query with cursor)
 *
 * NOT Tested Here (DAL already covers):
 * - DynamoDB operations
 * - S3 presigned URL generation
 * - Business logic validation
 *
 * NOTE: These tests are expected to FAIL initially (TDD RED phase).
 * Resolvers will be implemented in the GREEN phase.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Mutation } from '../../src/schema/resolvers/Mutation.js';
import { Query } from '../../src/schema/resolvers/Query.js';
import { ProfileService, NotificationService, FeedService } from '@social-media-app/dal';
import type { GraphQLContext } from '../../src/context.js';
import type { Profile, Notification } from '@social-media-app/shared';

describe('Profile & Notification Resolvers', () => {
  let mockContext: GraphQLContext;
  let mockProfileService: ProfileService;
  let mockNotificationService: NotificationService;
  let mockFeedService: FeedService;

  beforeEach(() => {
    // Create mock service instances
    mockProfileService = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
    mockNotificationService = new NotificationService({} as any, 'test-table');
    mockFeedService = new FeedService({} as any, 'test-table');

    // Create minimal mock context
    mockContext = {
      userId: 'test-user-123',
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        notificationService: mockNotificationService,
        feedService: mockFeedService,
        postService: {} as any,
        likeService: {} as any,
        commentService: {} as any,
        followService: {} as any,
      },
      loaders: {} as any,
    };

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Mutation.updateProfile
  // ==========================================================================
  describe('Mutation.updateProfile', () => {
    it('should successfully update profile with all fields', async () => {
      const updateInput = {
        handle: 'newhandle',
        displayName: 'New Display Name',
        fullName: 'New Full Name',
        bio: 'Updated bio text',
      };

      const mockUpdatedProfile: Profile = {
        id: 'test-user-123',
        handle: 'newhandle',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'New Display Name',
        fullName: 'New Full Name',
        bio: 'Updated bio text',
        profilePictureUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'updateProfile').mockResolvedValue(mockUpdatedProfile);

      const result = await Mutation.updateProfile(
        {},
        { input: updateInput },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockUpdatedProfile);
      expect(result.handle).toBe('newhandle');
      expect(result.displayName).toBe('New Display Name');
      expect(result.bio).toBe('Updated bio text');

      // Verify service method called with correct parameters
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('test-user-123', updateInput);
    });

    it('should update profile with partial fields (only handle)', async () => {
      const updateInput = {
        handle: 'updatedhandle',
      };

      const mockUpdatedProfile: Profile = {
        id: 'test-user-123',
        handle: 'updatedhandle',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        fullName: 'Test User',
        bio: 'Original bio',
        profilePictureUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'updateProfile').mockResolvedValue(mockUpdatedProfile);

      const result = await Mutation.updateProfile(
        {},
        { input: updateInput },
        mockContext,
        {} as any
      );

      expect(result.handle).toBe('updatedhandle');
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('test-user-123', updateInput);
    });

    it('should throw UNAUTHENTICATED error when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      const updateInput = {
        displayName: 'New Name',
      };

      try {
        await Mutation.updateProfile(
          {},
          { input: updateInput },
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/authentication required|not authenticated/i);
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw BAD_REQUEST when handle is already taken', async () => {
      const updateInput = {
        handle: 'takenhandle',
      };

      vi.spyOn(ProfileService.prototype, 'updateProfile').mockRejectedValue(
        new Error('Handle is already taken')
      );

      try {
        await Mutation.updateProfile(
          {},
          { input: updateInput },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/handle is already taken/i);
          expect(error.extensions.code).toBe('BAD_REQUEST');
        }
      }
    });

    it('should handle empty bio (clearing bio)', async () => {
      const updateInput = {
        bio: '',
      };

      const mockUpdatedProfile: Profile = {
        id: 'test-user-123',
        handle: 'testhandle',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        fullName: 'Test User',
        bio: null, // Cleared bio
        profilePictureUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'updateProfile').mockResolvedValue(mockUpdatedProfile);

      const result = await Mutation.updateProfile(
        {},
        { input: updateInput },
        mockContext,
        {} as any
      );

      expect(result.bio).toBeNull();
    });
  });

  // ==========================================================================
  // 2. Mutation.getProfilePictureUploadUrl
  // ==========================================================================
  describe('Mutation.getProfilePictureUploadUrl', () => {
    it('should return presigned URL for profile picture upload', async () => {
      const mockPresignedResponse = {
        uploadUrl: 'https://s3.amazonaws.com/bucket/users/test-user-123/profile/abc123.jpg?signature=xyz',
        publicUrl: 'https://cdn.example.com/users/test-user-123/profile/abc123.jpg',
        thumbnailUrl: 'https://cdn.example.com/users/test-user-123/profile/abc123_thumb.jpg',
        expiresIn: 3600,
      };

      vi.spyOn(ProfileService.prototype, 'generatePresignedUrl').mockResolvedValue(
        mockPresignedResponse
      );

      const result = await Mutation.getProfilePictureUploadUrl(
        {},
        { fileType: 'image/jpeg' },
        mockContext,
        {} as any
      );

      expect(result).toHaveProperty('uploadUrl');
      expect(result.uploadUrl).toBe(mockPresignedResponse.uploadUrl);

      // Verify service called with correct parameters
      expect(mockProfileService.generatePresignedUrl).toHaveBeenCalledWith('test-user-123', {
        fileType: 'image/jpeg',
        purpose: 'profile-picture',
      });
    });

    it('should use default fileType when not provided', async () => {
      const mockPresignedResponse = {
        uploadUrl: 'https://s3.amazonaws.com/bucket/upload-url',
        publicUrl: 'https://cdn.example.com/public-url',
        expiresIn: 3600,
      };

      vi.spyOn(ProfileService.prototype, 'generatePresignedUrl').mockResolvedValue(
        mockPresignedResponse
      );

      const result = await Mutation.getProfilePictureUploadUrl(
        {},
        {}, // No fileType provided
        mockContext,
        {} as any
      );

      expect(result.uploadUrl).toBeDefined();

      // Verify default fileType used
      expect(mockProfileService.generatePresignedUrl).toHaveBeenCalledWith('test-user-123', {
        fileType: 'image/jpeg', // Default
        purpose: 'profile-picture',
      });
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Mutation.getProfilePictureUploadUrl(
          {},
          { fileType: 'image/png' },
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should handle S3 configuration errors gracefully', async () => {
      vi.spyOn(ProfileService.prototype, 'generatePresignedUrl').mockRejectedValue(
        new Error('S3 bucket not configured')
      );

      try {
        await Mutation.getProfilePictureUploadUrl(
          {},
          { fileType: 'image/jpeg' },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/s3 bucket not configured/i);
          expect(error.extensions.code).toBe('INTERNAL_SERVER_ERROR');
        }
      }
    });
  });

  // ==========================================================================
  // 3. Mutation.markNotificationAsRead
  // ==========================================================================
  describe('Mutation.markNotificationAsRead', () => {
    it('should successfully mark notification as read', async () => {
      const notificationId = 'notif-123';

      const mockNotification: Notification = {
        id: notificationId,
        userId: 'test-user-123',
        type: 'LIKE',
        title: 'New like',
        message: 'Someone liked your post',
        status: 'READ',
        actor: {
          userId: 'user-456',
          handle: 'john',
          displayName: 'John Doe',
          avatarUrl: null,
        },
        target: {
          type: 'POST',
          id: 'post-789',
          url: '/posts/post-789',
          preview: 'Post preview',
        },
        createdAt: '2024-01-01T10:00:00.000Z',
        readAt: '2024-01-01T10:05:00.000Z',
      };

      vi.spyOn(NotificationService.prototype, 'markAsRead').mockResolvedValue({
        notification: mockNotification,
      });

      const result = await Mutation.markNotificationAsRead(
        {},
        { id: notificationId },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockNotification);
      expect(result.status).toBe('READ');
      expect(result.readAt).toBeDefined();

      // Verify service called with correct parameters
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith({
        userId: 'test-user-123',
        notificationId,
      });
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Mutation.markNotificationAsRead(
          {},
          { id: 'notif-123' },
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw NOT_FOUND when notification does not exist', async () => {
      vi.spyOn(NotificationService.prototype, 'markAsRead').mockRejectedValue(
        new Error('Notification not found')
      );

      try {
        await Mutation.markNotificationAsRead(
          {},
          { id: 'nonexistent-notif' },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/notification not found/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });

    it('should throw FORBIDDEN when user does not own notification', async () => {
      vi.spyOn(NotificationService.prototype, 'markAsRead').mockRejectedValue(
        new Error('Unauthorized: You can only modify your own notifications')
      );

      try {
        await Mutation.markNotificationAsRead(
          {},
          { id: 'other-user-notif' },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/unauthorized/i);
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  // ==========================================================================
  // 4. Mutation.markAllNotificationsAsRead
  // ==========================================================================
  describe('Mutation.markAllNotificationsAsRead', () => {
    it('should successfully mark all notifications as read', async () => {
      vi.spyOn(NotificationService.prototype, 'markAllAsRead').mockResolvedValue({
        updatedCount: 15,
      });

      const result = await Mutation.markAllNotificationsAsRead(
        {},
        {},
        mockContext,
        {} as any
      );

      expect(result).toEqual({ updatedCount: 15 });
      expect(result.updatedCount).toBe(15);

      // Verify service called with userId
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith({
        userId: 'test-user-123',
      });
    });

    it('should return zero when no unread notifications exist', async () => {
      vi.spyOn(NotificationService.prototype, 'markAllAsRead').mockResolvedValue({
        updatedCount: 0,
      });

      const result = await Mutation.markAllNotificationsAsRead(
        {},
        {},
        mockContext,
        {} as any
      );

      expect(result.updatedCount).toBe(0);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Mutation.markAllNotificationsAsRead(
          {},
          {},
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  // ==========================================================================
  // 5. Mutation.deleteNotification
  // ==========================================================================
  describe('Mutation.deleteNotification', () => {
    it('should successfully delete notification', async () => {
      const notificationId = 'notif-123';

      vi.spyOn(NotificationService.prototype, 'deleteNotification').mockResolvedValue({
        success: true,
      });

      const result = await Mutation.deleteNotification(
        {},
        { id: notificationId },
        mockContext,
        {} as any
      );

      expect(result).toEqual({ success: true });
      expect(result.success).toBe(true);

      // Verify service called with correct parameters
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith({
        userId: 'test-user-123',
        notificationId,
      });
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Mutation.deleteNotification(
          {},
          { id: 'notif-123' },
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should be idempotent (succeeds if notification already deleted)', async () => {
      vi.spyOn(NotificationService.prototype, 'deleteNotification').mockResolvedValue({
        success: true,
      });

      const result = await Mutation.deleteNotification(
        {},
        { id: 'already-deleted-notif' },
        mockContext,
        {} as any
      );

      expect(result.success).toBe(true);
    });

    it('should throw FORBIDDEN when user does not own notification', async () => {
      vi.spyOn(NotificationService.prototype, 'deleteNotification').mockRejectedValue(
        new Error('Unauthorized: You can only modify your own notifications')
      );

      try {
        await Mutation.deleteNotification(
          {},
          { id: 'other-user-notif' },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/unauthorized/i);
          expect(error.extensions.code).toBe('FORBIDDEN');
        }
      }
    });
  });

  // ==========================================================================
  // 6. Mutation.markFeedItemsAsRead
  // ==========================================================================
  describe('Mutation.markFeedItemsAsRead', () => {
    it('should successfully mark multiple feed items as read', async () => {
      const postIds = ['post-1', 'post-2', 'post-3'];

      vi.spyOn(FeedService.prototype, 'markFeedItemsAsRead').mockResolvedValue({
        updatedCount: 3,
      });

      const result = await Mutation.markFeedItemsAsRead(
        {},
        { postIds },
        mockContext,
        {} as any
      );

      expect(result).toEqual({ updatedCount: 3 });
      expect(result.updatedCount).toBe(3);

      // Verify service called with correct parameters
      expect(mockFeedService.markFeedItemsAsRead).toHaveBeenCalledWith({
        userId: 'test-user-123',
        postIds,
      });
    });

    it('should handle empty postIds array', async () => {
      vi.spyOn(FeedService.prototype, 'markFeedItemsAsRead').mockResolvedValue({
        updatedCount: 0,
      });

      const result = await Mutation.markFeedItemsAsRead(
        {},
        { postIds: [] },
        mockContext,
        {} as any
      );

      expect(result.updatedCount).toBe(0);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Mutation.markFeedItemsAsRead(
          {},
          { postIds: ['post-1'] },
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should handle partial failures gracefully', async () => {
      const postIds = ['post-1', 'post-2', 'invalid-post'];

      // Service may return partial success
      vi.spyOn(FeedService.prototype, 'markFeedItemsAsRead').mockResolvedValue({
        updatedCount: 2, // Only 2 succeeded
      });

      const result = await Mutation.markFeedItemsAsRead(
        {},
        { postIds },
        mockContext,
        {} as any
      );

      expect(result.updatedCount).toBe(2);
    });

    it('should throw BAD_REQUEST for invalid UUID format', async () => {
      vi.spyOn(FeedService.prototype, 'markFeedItemsAsRead').mockRejectedValue(
        new Error('Invalid UUID provided')
      );

      try {
        await Mutation.markFeedItemsAsRead(
          {},
          { postIds: ['not-a-uuid'] },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/invalid uuid/i);
          expect(error.extensions.code).toBe('BAD_REQUEST');
        }
      }
    });
  });

  // ==========================================================================
  // 7. Query.notifications
  // ==========================================================================
  describe('Query.notifications', () => {
    it('should return paginated notifications with Relay connection format', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          userId: 'test-user-123',
          type: 'LIKE',
          title: 'New like',
          message: 'Someone liked your post',
          status: 'UNREAD',
          actor: {
            userId: 'user-456',
            handle: 'john',
            displayName: 'John Doe',
            avatarUrl: null,
          },
          target: {
            type: 'POST',
            id: 'post-789',
            url: '/posts/post-789',
            preview: null,
          },
          createdAt: '2024-01-01T10:00:00.000Z',
          readAt: null,
        },
        {
          id: 'notif-2',
          userId: 'test-user-123',
          type: 'FOLLOW',
          title: 'New follower',
          message: 'Jane started following you',
          status: 'UNREAD',
          actor: {
            userId: 'user-789',
            handle: 'jane',
            displayName: 'Jane Smith',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
          target: null,
          createdAt: '2024-01-01T09:00:00.000Z',
          readAt: null,
        },
      ];

      const mockNextCursor = Buffer.from(
        JSON.stringify({ PK: 'USER#test-user-123', SK: 'NOTIFICATION#2024-01-01T09:00:00.000Z#notif-2' })
      ).toString('base64');

      vi.spyOn(NotificationService.prototype, 'getNotifications').mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 2,
        unreadCount: 2,
        hasMore: true,
        nextCursor: mockNextCursor,
      });

      const result = await Query.notifications(
        {},
        { limit: 20 },
        mockContext,
        {} as any
      );

      // Verify Relay connection format
      expect(result).toHaveProperty('edges');
      expect(result).toHaveProperty('pageInfo');
      expect(result.edges).toHaveLength(2);

      // Verify edge structure
      expect(result.edges[0]).toHaveProperty('node');
      expect(result.edges[0]).toHaveProperty('cursor');
      expect(result.edges[0].node).toEqual(mockNotifications[0]);

      // Verify pageInfo
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBeDefined();

      // Verify service called
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'test-user-123',
        limit: 20,
        cursor: undefined,
      });
    });

    it('should handle cursor-based pagination', async () => {
      const cursor = Buffer.from(
        JSON.stringify({ PK: 'USER#test-user-123', SK: 'NOTIFICATION#2024-01-01T09:00:00.000Z#notif-2' })
      ).toString('base64');

      const mockNotifications: Notification[] = [
        {
          id: 'notif-3',
          userId: 'test-user-123',
          type: 'COMMENT',
          title: 'New comment',
          message: 'Someone commented on your post',
          status: 'UNREAD',
          actor: null,
          target: null,
          createdAt: '2024-01-01T08:00:00.000Z',
          readAt: null,
        },
      ];

      vi.spyOn(NotificationService.prototype, 'getNotifications').mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 1,
        unreadCount: 3,
        hasMore: false,
        nextCursor: undefined,
      });

      const result = await Query.notifications(
        {},
        { limit: 10, cursor },
        mockContext,
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.endCursor).toBeNull();

      // Verify cursor passed to service
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'test-user-123',
        limit: 10,
        cursor,
      });
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Query.notifications(
          {},
          { limit: 20 },
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should handle empty notifications (no notifications)', async () => {
      vi.spyOn(NotificationService.prototype, 'getNotifications').mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false,
        nextCursor: undefined,
      });

      const result = await Query.notifications(
        {},
        { limit: 20 },
        mockContext,
        {} as any
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.endCursor).toBeNull();
    });

    it('should default to limit 20 when not specified', async () => {
      vi.spyOn(NotificationService.prototype, 'getNotifications').mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false,
      });

      await Query.notifications(
        {},
        {}, // No limit specified
        mockContext,
        {} as any
      );

      // Verify default limit is 20
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'test-user-123',
        limit: 20,
        cursor: undefined,
      });
    });

    it('should throw BAD_REQUEST for invalid cursor', async () => {
      vi.spyOn(NotificationService.prototype, 'getNotifications').mockRejectedValue(
        new Error('Invalid cursor')
      );

      try {
        await Query.notifications(
          {},
          { limit: 20, cursor: 'invalid-cursor-format' },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/invalid cursor/i);
          expect(error.extensions.code).toBe('BAD_REQUEST');
        }
      }
    });
  });

  // ==========================================================================
  // 8. Query.unreadNotificationsCount
  // ==========================================================================
  describe('Query.unreadNotificationsCount', () => {
    it('should return count of unread notifications', async () => {
      vi.spyOn(NotificationService.prototype, 'getUnreadCount').mockResolvedValue(5);

      const result = await Query.unreadNotificationsCount(
        {},
        {},
        mockContext,
        {} as any
      );

      expect(result).toBe(5);
      expect(typeof result).toBe('number');

      // Verify service called with userId
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('test-user-123');
    });

    it('should return zero when no unread notifications', async () => {
      vi.spyOn(NotificationService.prototype, 'getUnreadCount').mockResolvedValue(0);

      const result = await Query.unreadNotificationsCount(
        {},
        {},
        mockContext,
        {} as any
      );

      expect(result).toBe(0);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Query.unreadNotificationsCount(
          {},
          {},
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should handle large counts correctly', async () => {
      vi.spyOn(NotificationService.prototype, 'getUnreadCount').mockResolvedValue(999);

      const result = await Query.unreadNotificationsCount(
        {},
        {},
        mockContext,
        {} as any
      );

      expect(result).toBe(999);
    });
  });
});
