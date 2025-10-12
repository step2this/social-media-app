/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { handler } from './notification-processor.js';

// Mock DynamoDB utilities
vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(() => mockDynamoClient),
  getTableName: vi.fn(() => 'test-table')
}));

// Mock NotificationService and ProfileService from DAL
vi.mock('@social-media-app/dal', () => ({
  NotificationService: vi.fn().mockImplementation(() => mockNotificationService),
  ProfileService: vi.fn().mockImplementation(() => mockProfileService)
}));

// Mock DynamoDB client
let mockDynamoClient: any;
let mockNotificationService: any;
let mockProfileService: any;
let createdNotifications: any[] = [];

beforeEach(() => {
  createdNotifications = [];

  mockDynamoClient = {
    send: vi.fn()
  };

  mockNotificationService = {
    createNotification: vi.fn(async (data: any) => {
      createdNotifications.push(data);
      return {
        notification: {
          id: `notification-${createdNotifications.length}`,
          ...data,
          status: 'unread',
          createdAt: new Date().toISOString()
        }
      };
    })
  };

  mockProfileService = {
    getProfileByHandle: vi.fn(async (handle: string) => {
      // Mock profile resolution: @mentioneduser → mentioned-user-456
      // This simulates resolving handles to user IDs
      if (handle === 'mentioneduser') {
        return {
          userId: 'mentioned-user-456',
          handle: 'mentioneduser',
          displayName: 'Mentioned User'
        };
      }
      // Return null for unknown handles
      return null;
    })
  };
});

/**
 * Helper to create a DynamoDB Stream record
 */
const createStreamRecord = (
  eventName: 'INSERT' | 'REMOVE' | 'MODIFY',
  newImage?: Record<string, any>,
  oldImage?: Record<string, any>
): DynamoDBRecord => ({
  eventID: `test-event-${Math.random()}`,
  eventName,
  eventVersion: '1.1',
  eventSource: 'aws:dynamodb',
  awsRegion: 'us-east-1',
  dynamodb: {
    Keys: {
      PK: { S: 'USER#user-123' },
      SK: { S: 'ENTITY#123' }
    },
    NewImage: newImage ? convertToAttributeValue(newImage) : undefined,
    OldImage: oldImage ? convertToAttributeValue(oldImage) : undefined,
    SequenceNumber: `${Math.random()}`,
    SizeBytes: 100,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  }
});

/**
 * Convert plain object to DynamoDB AttributeValue format
 */
const convertToAttributeValue = (obj: Record<string, any>): any => {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string') {
      result[key] = { S: value };
    } else if (typeof value === 'number') {
      result[key] = { N: String(value) };
    } else if (typeof value === 'boolean') {
      result[key] = { BOOL: value };
    } else if (Array.isArray(value)) {
      result[key] = { L: value.map(v => convertToAttributeValue({ v }).v) };
    } else if (typeof value === 'object') {
      result[key] = { M: convertToAttributeValue(value) };
    }
  }
  return result;
};

describe('notification-processor stream handler', () => {
  describe('LIKE entity processing', () => {
    it('should create "liked your post" notification when LIKE is inserted', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            postThumbnailUrl: 'https://example.com/thumb.jpg',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0]).toMatchObject({
        userId: 'post-owner-789',
        type: 'like',
        title: 'New like',
        message: expect.stringContaining('liked your post')
      });
    });

    it('should extract correct actor information from LIKE entity', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#actor-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'actor-123',
            userHandle: 'actorhandle',
            displayName: 'Actor Name',
            avatarUrl: 'https://example.com/avatar.jpg',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].actor).toMatchObject({
        userId: 'actor-123',
        handle: 'actorhandle'
      });
    });

    it('should send notification to correct recipient (post owner)', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-999',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].userId).toBe('post-owner-999');
    });

    it('should use correct notification type for likes', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].type).toBe('like');
    });

    it('should include post thumbnail URL in notification target', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            postThumbnailUrl: 'https://example.com/thumbnail.jpg',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].target).toBeDefined();
      expect(createdNotifications[0].target.type).toBe('post');
      expect(createdNotifications[0].target.id).toBe('post-456');
    });

    it('should not notify when user likes their own post', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'user-123',
            userHandle: 'selfuser',
            postId: 'post-456',
            postUserId: 'user-123', // Same as liker
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should handle missing postUserId gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            // Missing postUserId
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should handle missing actor handle gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            // Missing userHandle
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should create notification with proper message format', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'cooluser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].message).toMatch(/cooluser.*liked/i);
    });

    it('should handle NotificationService errors gracefully for LIKE', async () => {
      mockNotificationService.createNotification = vi.fn().mockRejectedValue(
        new Error('DynamoDB error')
      );

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      // Should not throw
      await expect(handler(event)).resolves.not.toThrow();
    });

    it('should include postThumbnailUrl when available', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            postThumbnailUrl: 'https://example.com/image.jpg',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].target).toMatchObject({
        type: 'post',
        id: 'post-456'
      });
      expect(createdNotifications[0].metadata).toBeDefined();
      expect(createdNotifications[0].metadata?.thumbnailUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle LIKE without thumbnail URL', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            // No postThumbnailUrl
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0].target.type).toBe('post');
    });
  });

  describe('COMMENT entity processing', () => {
    it('should create "commented on your post" notification when COMMENT is inserted', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Great post!',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0]).toMatchObject({
        userId: 'post-owner-789',
        type: 'comment',
        title: 'New comment'
      });
    });

    it('should extract actor information from COMMENT entity', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenterhandle',
            displayName: 'Commenter Name',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Nice!',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].actor).toMatchObject({
        userId: 'commenter-123',
        handle: 'commenterhandle'
      });
    });

    it('should send comment notification to post owner', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-999',
            content: 'Comment text',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].userId).toBe('post-owner-999');
    });

    it('should use correct notification type for comments', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Comment',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].type).toBe('comment');
    });

    it('should include comment preview (first 100 chars) in notification', async () => {
      const longComment = 'This is a very long comment that exceeds one hundred characters and should be truncated to only show the first hundred characters in the preview';

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: longComment,
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].target.preview).toBeDefined();
      expect(createdNotifications[0].target.preview!.length).toBeLessThanOrEqual(100);
    });

    it('should include post thumbnail URL in comment notification', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Comment',
            postThumbnailUrl: 'https://example.com/thumb.jpg',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].target.type).toBe('post');
      expect(createdNotifications[0].target.id).toBe('post-456');
    });

    it('should not notify when user comments on their own post', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'user-123',
            userHandle: 'selfuser',
            postId: 'post-456',
            postUserId: 'user-123', // Same as commenter
            content: 'My own comment',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should detect @handle in comment content', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Hey @mentioneduser check this out!',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should create 2 notifications: one for comment, one for mention
      expect(createdNotifications.length).toBeGreaterThanOrEqual(1);

      const mentionNotification = createdNotifications.find(n => n.type === 'mention');
      expect(mentionNotification).toBeDefined();
    });

    it('should create MENTION notification when @handle is found', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Great post @mentioneduser!',
            mentionedUserIds: ['mentioned-user-456'],
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      const mentionNotification = createdNotifications.find(n => n.type === 'mention');
      expect(mentionNotification).toBeDefined();
      expect(mentionNotification?.userId).toBe('mentioned-user-456');
    });

    it('should send mention notification to mentioned user (not post owner)', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Hey @someuser',
            mentionedUserIds: ['mentioned-999'],
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      const mentionNotification = createdNotifications.find(n => n.type === 'mention');
      expect(mentionNotification?.userId).toBe('mentioned-999');
      expect(mentionNotification?.userId).not.toBe('post-owner-789');
    });

    it('should use correct notification type for mentions', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: '@user123 check this',
            mentionedUserIds: ['user123'],
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      const mentionNotification = createdNotifications.find(n => n.type === 'mention');
      expect(mentionNotification?.type).toBe('mention');
    });

    it('should not create mention for self-mention', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: '@commenteruser I said this',
            mentionedUserIds: ['commenter-123'], // Mentioning self
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      const mentionNotifications = createdNotifications.filter(n => n.type === 'mention');
      expect(mentionNotifications).toHaveLength(0);
    });

    it('should handle multiple mentions (create multiple notifications)', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: '@user1 @user2 @user3 check this out',
            mentionedUserIds: ['user1', 'user2', 'user3'],
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      const mentionNotifications = createdNotifications.filter(n => n.type === 'mention');
      expect(mentionNotifications.length).toBe(3);

      const mentionedUserIds = mentionNotifications.map(n => n.userId);
      expect(mentionedUserIds).toContain('user1');
      expect(mentionedUserIds).toContain('user2');
      expect(mentionedUserIds).toContain('user3');
    });

    it('should handle comment errors gracefully', async () => {
      mockNotificationService.createNotification = vi.fn().mockRejectedValue(
        new Error('Service error')
      );

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            content: 'Comment',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await expect(handler(event)).resolves.not.toThrow();
    });
  });

  describe('FOLLOW entity processing', () => {
    it('should create "started following you" notification when FOLLOW is inserted', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'followeruser',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(1);
      expect(createdNotifications[0]).toMatchObject({
        userId: 'followee-456',
        type: 'follow',
        title: 'New follower'
      });
    });

    it('should extract follower info (userId, handle) from FOLLOW entity', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'followerhandle',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].actor).toMatchObject({
        userId: 'follower-123',
        handle: 'followerhandle'
      });
    });

    it('should send notification to followee', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-999',
            GSI2PK: 'USER#followee-999',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'followeruser',
            followeeId: 'followee-999',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].userId).toBe('followee-999');
    });

    it('should use correct notification type for follows', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'followeruser',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].type).toBe('follow');
    });

    it('should not notify when user follows themselves', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'FOLLOW#user-123',
            GSI2PK: 'USER#user-123',
            GSI2SK: 'FOLLOWER#user-123',
            entityType: 'FOLLOW',
            followerId: 'user-123',
            followerHandle: 'selfuser',
            followeeId: 'user-123',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should handle missing follower handle gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            // Missing followerHandle
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should create notification with proper follow message', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'awesomeuser',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].message).toMatch(/awesomeuser.*follow/i);
    });

    it('should handle follow errors gracefully', async () => {
      mockNotificationService.createNotification = vi.fn().mockRejectedValue(
        new Error('Service error')
      );

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'followeruser',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await expect(handler(event)).resolves.not.toThrow();
    });

    it('should handle missing followeeId gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'followeruser',
            // Missing followeeId
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should include target user information in follow notification', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-123',
            SK: 'FOLLOW#followee-456',
            GSI2PK: 'USER#followee-456',
            GSI2SK: 'FOLLOWER#follower-123',
            entityType: 'FOLLOW',
            followerId: 'follower-123',
            followerHandle: 'followeruser',
            followeeId: 'followee-456',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications[0].target).toMatchObject({
        type: 'user',
        id: 'followee-456'
      });
    });
  });

  describe('event filtering', () => {
    it('should only process INSERT events (not REMOVE)', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('REMOVE', undefined, {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should ignore MODIFY events', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('MODIFY', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          }, {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'oldhandle',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should ignore non-relevant entity types (PROFILE)', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'PROFILE',
            entityType: 'PROFILE',
            userId: 'user-123',
            handle: 'userhandle',
            displayName: 'User Name',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should ignore non-relevant entity types (POST)', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'POST#2024-01-01T00:00:00.000Z#post-123',
            entityType: 'POST',
            userId: 'user-123',
            content: 'Post content',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should handle missing stream image gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          {
            eventID: 'test-event-id',
            eventName: 'INSERT',
            eventVersion: '1.1',
            eventSource: 'aws:dynamodb',
            awsRegion: 'us-east-1',
            dynamodb: {
              Keys: {
                PK: { S: 'USER#user-123' },
                SK: { S: 'LIKE#post-456' }
              },
              // No NewImage or OldImage
              SequenceNumber: '123',
              SizeBytes: 100,
              StreamViewType: 'KEYS_ONLY'
            }
          }
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should handle malformed stream records', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          {
            eventID: 'test-event-id',
            eventName: 'INSERT',
            eventVersion: '1.1',
            eventSource: 'aws:dynamodb',
            awsRegion: 'us-east-1',
            dynamodb: undefined as any // Malformed
          }
        ]
      };

      await expect(handler(event)).resolves.not.toThrow();
    });

    it('should log warnings for invalid data', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            // Missing required fields
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Verify warning was logged (exact message may vary)
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should continue processing other records on error', async () => {
      mockNotificationService.createNotification = vi.fn()
        .mockRejectedValueOnce(new Error('First notification fails'))
        .mockResolvedValueOnce({
          notification: { id: 'notif-2', status: 'unread' }
        });

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-1',
            SK: 'LIKE#post-1',
            entityType: 'LIKE',
            userId: 'liker-1',
            userHandle: 'user1',
            postId: 'post-1',
            postUserId: 'owner-1',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-2',
            SK: 'LIKE#post-2',
            entityType: 'LIKE',
            userId: 'liker-2',
            userHandle: 'user2',
            postId: 'post-2',
            postUserId: 'owner-2',
            createdAt: '2024-01-01T00:00:01.000Z'
          })
        ]
      };

      await handler(event);

      // Both notifications should be attempted
      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('parallel processing', () => {
    it('should process multiple records in parallel', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-1',
            SK: 'LIKE#post-1',
            entityType: 'LIKE',
            userId: 'liker-1',
            userHandle: 'user1',
            postId: 'post-1',
            postUserId: 'owner-1',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-2',
            SK: 'LIKE#post-2',
            entityType: 'LIKE',
            userId: 'liker-2',
            userHandle: 'user2',
            postId: 'post-2',
            postUserId: 'owner-2',
            createdAt: '2024-01-01T00:00:01.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-3',
            SK: 'LIKE#post-3',
            entityType: 'LIKE',
            userId: 'liker-3',
            userHandle: 'user3',
            postId: 'post-3',
            postUserId: 'owner-3',
            createdAt: '2024-01-01T00:00:02.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(3);
    });

    it('should create multiple notifications concurrently', async () => {
      const startTime = Date.now();

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#follower-1',
            SK: 'FOLLOW#followee-1',
            entityType: 'FOLLOW',
            followerId: 'follower-1',
            followerHandle: 'user1',
            followeeId: 'followee-1',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#follower-2',
            SK: 'FOLLOW#followee-2',
            entityType: 'FOLLOW',
            followerId: 'follower-2',
            followerHandle: 'user2',
            followeeId: 'followee-2',
            createdAt: '2024-01-01T00:00:01.000Z'
          })
        ]
      };

      await handler(event);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(createdNotifications).toHaveLength(2);
      // Should complete quickly due to parallel processing
      expect(duration).toBeLessThan(1000);
    });

    it('should handle mixed entity types in single batch', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-1',
            SK: 'LIKE#post-1',
            entityType: 'LIKE',
            userId: 'liker-1',
            userHandle: 'user1',
            postId: 'post-1',
            postUserId: 'owner-1',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'POST#post-2',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-1',
            entityType: 'COMMENT',
            userId: 'commenter-1',
            userHandle: 'user2',
            postId: 'post-2',
            postUserId: 'owner-2',
            content: 'Comment',
            createdAt: '2024-01-01T00:00:01.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#follower-1',
            SK: 'FOLLOW#followee-1',
            entityType: 'FOLLOW',
            followerId: 'follower-1',
            followerHandle: 'user3',
            followeeId: 'followee-1',
            createdAt: '2024-01-01T00:00:02.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(3);

      const notificationTypes = createdNotifications.map(n => n.type);
      expect(notificationTypes).toContain('like');
      expect(notificationTypes).toContain('comment');
      expect(notificationTypes).toContain('follow');
    });

    it('should not let one failed notification stop others', async () => {
      let callCount = 0;
      mockNotificationService.createNotification = vi.fn(async (data: any) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Second notification fails');
        }
        createdNotifications.push(data);
        return {
          notification: { id: `notif-${callCount}`, ...data, status: 'unread' }
        };
      });

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-1',
            SK: 'LIKE#post-1',
            entityType: 'LIKE',
            userId: 'liker-1',
            userHandle: 'user1',
            postId: 'post-1',
            postUserId: 'owner-1',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-2',
            SK: 'LIKE#post-2',
            entityType: 'LIKE',
            userId: 'liker-2',
            userHandle: 'user2',
            postId: 'post-2',
            postUserId: 'owner-2',
            createdAt: '2024-01-01T00:00:01.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-3',
            SK: 'LIKE#post-3',
            entityType: 'LIKE',
            userId: 'liker-3',
            userHandle: 'user3',
            postId: 'post-3',
            postUserId: 'owner-3',
            createdAt: '2024-01-01T00:00:02.000Z'
          })
        ]
      };

      await handler(event);

      // All 3 should be attempted
      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(3);
      // Only 2 should succeed
      expect(createdNotifications).toHaveLength(2);
    });

    it('should return successfully even with partial failures', async () => {
      mockNotificationService.createNotification = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce({ notification: { id: 'notif-2' } })
        .mockRejectedValueOnce(new Error('Fail 3'));

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-1',
            SK: 'LIKE#post-1',
            entityType: 'LIKE',
            userId: 'liker-1',
            userHandle: 'user1',
            postId: 'post-1',
            postUserId: 'owner-1',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-2',
            SK: 'LIKE#post-2',
            entityType: 'LIKE',
            userId: 'liker-2',
            userHandle: 'user2',
            postId: 'post-2',
            postUserId: 'owner-2',
            createdAt: '2024-01-01T00:00:01.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-3',
            SK: 'LIKE#post-3',
            entityType: 'LIKE',
            userId: 'liker-3',
            userHandle: 'user3',
            postId: 'post-3',
            postUserId: 'owner-3',
            createdAt: '2024-01-01T00:00:02.000Z'
          })
        ]
      };

      // Should not throw
      await expect(handler(event)).resolves.not.toThrow();
    });
  });

  describe('self-notification prevention', () => {
    it('should prevent user liking own post from creating notification', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'user-123',
            userHandle: 'selfuser',
            postId: 'post-456',
            postUserId: 'user-123', // Same user
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should prevent user commenting on own post from creating notification', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'user-123',
            userHandle: 'selfuser',
            postId: 'post-456',
            postUserId: 'user-123', // Same user
            content: 'My own comment',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should prevent user following themselves from creating notification', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'FOLLOW#user-123',
            entityType: 'FOLLOW',
            followerId: 'user-123',
            followerHandle: 'selfuser',
            followeeId: 'user-123', // Same user
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should prevent mention of self in own comment', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'user-123',
            userHandle: 'selfuser',
            postId: 'post-456',
            postUserId: 'owner-789',
            content: '@selfuser I mentioned myself',
            mentionedUserIds: ['user-123'],
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      const mentionNotifications = createdNotifications.filter(n => n.type === 'mention');
      expect(mentionNotifications).toHaveLength(0);
    });

    it('should allow comment notification when user mentions themselves but comments on others post', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'POST#post-456',
            SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
            entityType: 'COMMENT',
            userId: 'commenter-123',
            userHandle: 'commenteruser',
            postId: 'post-456',
            postUserId: 'owner-789',
            content: '@commenteruser I mentioned myself',
            mentionedUserIds: ['commenter-123'],
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should create comment notification to post owner
      const commentNotifications = createdNotifications.filter(n => n.type === 'comment');
      expect(commentNotifications).toHaveLength(1);
      expect(commentNotifications[0].userId).toBe('owner-789');

      // Should NOT create mention notification to self
      const mentionNotifications = createdNotifications.filter(n => n.type === 'mention');
      expect(mentionNotifications).toHaveLength(0);
    });

    it('should handle edge case of null userId', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            // Missing userId
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle NotificationService.createNotification() throwing error', async () => {
      mockNotificationService.createNotification = vi.fn().mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await expect(handler(event)).resolves.not.toThrow();
    });

    it('should handle missing required fields in stream record', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            // Missing entityType
            userId: 'liker-123',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await expect(handler(event)).resolves.not.toThrow();
    });

    it('should handle invalid entity type', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#user-123',
            SK: 'UNKNOWN#123',
            entityType: 'UNKNOWN_TYPE',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(0);
    });

    it('should handle DynamoDB client errors', async () => {
      mockDynamoClient.send = vi.fn().mockRejectedValue(
        new Error('DynamoDB error')
      );

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await expect(handler(event)).resolves.not.toThrow();
    });

    it('should continue processing after error in one record', async () => {
      let callCount = 0;
      mockNotificationService.createNotification = vi.fn(async (data: any) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        createdNotifications.push(data);
        return { notification: { id: `notif-${callCount}`, ...data } };
      });

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-1',
            SK: 'LIKE#post-1',
            entityType: 'LIKE',
            userId: 'liker-1',
            userHandle: 'user1',
            postId: 'post-1',
            postUserId: 'owner-1',
            createdAt: '2024-01-01T00:00:00.000Z'
          }),
          createStreamRecord('INSERT', {
            PK: 'USER#liker-2',
            SK: 'LIKE#post-2',
            entityType: 'LIKE',
            userId: 'liker-2',
            userHandle: 'user2',
            postId: 'post-2',
            postUserId: 'owner-2',
            createdAt: '2024-01-01T00:00:01.000Z'
          })
        ]
      };

      await handler(event);

      expect(createdNotifications).toHaveLength(1);
      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should log errors appropriately', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockNotificationService.createNotification = vi.fn().mockRejectedValue(
        new Error('Service error')
      );

      const event: DynamoDBStreamEvent = {
        Records: [
          createStreamRecord('INSERT', {
            PK: 'USER#liker-123',
            SK: 'LIKE#post-456',
            entityType: 'LIKE',
            userId: 'liker-123',
            userHandle: 'likeruser',
            postId: 'post-456',
            postUserId: 'post-owner-789',
            createdAt: '2024-01-01T00:00:00.000Z'
          })
        ]
      };

      await handler(event);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
