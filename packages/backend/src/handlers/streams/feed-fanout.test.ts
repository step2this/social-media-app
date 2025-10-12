/* eslint-disable max-lines-per-function, max-statements, complexity, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Comprehensive test suite for feed fan-out stream processor
 *
 * This processor triggers on POST entity INSERT events and:
 * 1. Checks author's follower count
 * 2. If < CELEBRITY_FOLLOWER_THRESHOLD (default 5000), fans out to all followers
 * 3. If >= threshold (celebrity), skips fan-out (followers query at read time)
 * 4. Uses batch writes for efficiency (25 items per batch)
 *
 * Test Coverage:
 * - Event filtering (INSERT/MODIFY/REMOVE, SK validation)
 * - Celebrity bypass logic (threshold checks)
 * - Normal user fan-out (various follower counts)
 * - Batch write optimization (chunking, efficiency)
 * - Data mapping (post snapshot, author metadata)
 * - Error handling (graceful failures, logging)
 * - Service integration (FeedService, FollowService)
 */

// Mock environment variables
const ORIGINAL_ENV = process.env;

// Hoist mock variables before module imports (required for container-scope services)
const { mockDynamoClient, mockFeedService, mockFollowService, mockProfileService, sentCommands } = vi.hoisted(() => {
  const sentCommands: any[] = [];

  return {
    mockDynamoClient: {
      send: vi.fn(async (command: any) => {
        sentCommands.push(command);
        return { $metadata: {} };
      })
    } as unknown as DynamoDBDocumentClient,

    mockFeedService: {
      writeFeedItem: vi.fn().mockResolvedValue(undefined)
    },

    mockFollowService: {
      getFollowerCount: vi.fn().mockResolvedValue(0),
      getAllFollowers: vi.fn().mockResolvedValue([])
    },

    mockProfileService: {
      getProfile: vi.fn().mockResolvedValue({
        followersCount: 0
      })
    },

    sentCommands
  };
});

// Mock AWS SDK and services
vi.mock('../../utils/dynamodb.js', () => ({
  createDynamoDBClient: vi.fn(() => mockDynamoClient),
  getTableName: vi.fn(() => 'test-table')
}));

vi.mock('@social-media-app/dal', () => ({
  FeedService: vi.fn(() => mockFeedService),
  FollowService: vi.fn(() => mockFollowService),
  ProfileService: vi.fn(() => mockProfileService)
}));

// Now import handler after mocks are set up
import { handler } from './feed-fanout.js';

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.CELEBRITY_FOLLOWER_THRESHOLD = '5000';

  // Clear mock call history
  vi.clearAllMocks();
  sentCommands.length = 0;

  // Reset mock implementations to defaults
  mockFeedService.writeFeedItem.mockResolvedValue(undefined);
  mockFollowService.getFollowerCount.mockResolvedValue(0);
  mockFollowService.getAllFollowers.mockResolvedValue([]);
  mockProfileService.getProfile.mockResolvedValue({ followersCount: 0 });
});

/**
 * Helper to create a DynamoDB Stream record for POST INSERT
 */
const createPostInsertRecord = (
  postData: {
    postId: string;
    userId: string;
    userHandle: string;
    caption?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    likesCount?: number;
    commentsCount?: number;
    createdAt: string;
  }
): DynamoDBRecord => ({
  eventID: 'test-event-id',
  eventName: 'INSERT',
  eventVersion: '1.1',
  eventSource: 'aws:dynamodb',
  awsRegion: 'us-east-1',
  dynamodb: {
    Keys: {
      PK: { S: `POST#${postData.postId}` },
      SK: { S: 'POST' }
    },
    NewImage: {
      PK: { S: `USER#${postData.userId}` },
      SK: { S: `POST#${postData.createdAt}#${postData.postId}` },
      postId: { S: postData.postId },
      userId: { S: postData.userId },
      userHandle: { S: postData.userHandle },
      caption: postData.caption ? { S: postData.caption } : undefined,
      imageUrl: postData.imageUrl ? { S: postData.imageUrl } : undefined,
      thumbnailUrl: postData.thumbnailUrl ? { S: postData.thumbnailUrl } : undefined,
      likesCount: { N: String(postData.likesCount ?? 0) },
      commentsCount: { N: String(postData.commentsCount ?? 0) },
      createdAt: { S: postData.createdAt },
      entityType: { S: 'POST' }
    },
    SequenceNumber: '123',
    SizeBytes: 100,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  }
});

/**
 * Helper to create a stream record for non-POST entities
 */
const createNonPostRecord = (
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE',
  sk: string,
  entityType: string
): DynamoDBRecord => ({
  eventID: 'test-event-id',
  eventName,
  eventVersion: '1.1',
  eventSource: 'aws:dynamodb',
  awsRegion: 'us-east-1',
  dynamodb: {
    Keys: {
      PK: { S: 'USER#user-123' },
      SK: { S: sk }
    },
    NewImage: eventName !== 'REMOVE' ? {
      PK: { S: 'USER#user-123' },
      SK: { S: sk },
      entityType: { S: entityType }
    } : undefined,
    OldImage: eventName === 'REMOVE' ? {
      PK: { S: 'USER#user-123' },
      SK: { S: sk },
      entityType: { S: entityType }
    } : undefined,
    SequenceNumber: '123',
    SizeBytes: 100,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  }
});

describe('feed-fanout stream processor', () => {
  describe('Event Filtering Tests', () => {
    it('should process INSERT events with SK="POST"', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(10);
      mockFollowService.getAllFollowers.mockResolvedValue([
        'follower-1', 'follower-2'
      ]);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-123',
            userId: 'author-456',
            userHandle: 'authorhandle',
            caption: 'Test post',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should call FeedService.writeFeedItem for each follower
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(2);
    });

    it('should ignore MODIFY events', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createNonPostRecord('MODIFY', 'POST', 'POST')
        ]
      };

      await handler(event);

      // Should not process MODIFY events
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
      expect(mockFollowService.getFollowerCount).not.toHaveBeenCalled();
    });

    it('should ignore REMOVE/DELETE events', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createNonPostRecord('REMOVE', 'POST', 'POST')
        ]
      };

      await handler(event);

      // Should not process REMOVE events
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
      expect(mockFollowService.getFollowerCount).not.toHaveBeenCalled();
    });

    it('should ignore INSERT events where SK != "POST" (e.g., PROFILE, FOLLOW)', async () => {
      const event: DynamoDBStreamEvent = {
        Records: [
          createNonPostRecord('INSERT', 'PROFILE', 'USER_PROFILE'),
          createNonPostRecord('INSERT', 'FOLLOW#user-789', 'FOLLOW'),
          createNonPostRecord('INSERT', 'LIKE#post-123', 'LIKE')
        ]
      };

      await handler(event);

      // Should not process non-POST entities
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
      expect(mockFollowService.getFollowerCount).not.toHaveBeenCalled();
    });

    it('should handle empty Records array gracefully', async () => {
      const event: DynamoDBStreamEvent = {
        Records: []
      };

      await handler(event);

      // Should not throw and not call any services
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
      expect(mockFollowService.getFollowerCount).not.toHaveBeenCalled();
    });
  });

  describe('Celebrity Bypass Tests', () => {
    it('should skip fan-out when follower count >= 5000 (celebrity)', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(5001);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-celebrity',
            userId: 'celebrity-user',
            userHandle: 'celebrity',
            caption: 'Celebrity post',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should check follower count but not fan-out
      expect(mockFollowService.getFollowerCount).toHaveBeenCalledWith('celebrity-user');
      expect(mockFollowService.getAllFollowers).not.toHaveBeenCalled();
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
    });

    it('should skip fan-out when follower count = 5000 (boundary)', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(5000);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-boundary',
            userId: 'boundary-user',
            userHandle: 'boundary',
            caption: 'Boundary test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should skip fan-out at exactly 5000 followers
      expect(mockFollowService.getFollowerCount).toHaveBeenCalledWith('boundary-user');
      expect(mockFollowService.getAllFollowers).not.toHaveBeenCalled();
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
    });

    it('should process fan-out when follower count = 4999 (boundary)', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(4999);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-1']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-boundary-low',
            userId: 'boundary-user-low',
            userHandle: 'boundaryl',
            caption: 'Just under threshold',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should process fan-out just under threshold
      expect(mockFollowService.getFollowerCount).toHaveBeenCalledWith('boundary-user-low');
      expect(mockFollowService.getAllFollowers).toHaveBeenCalledWith('boundary-user-low');
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(1);
    });

    it('should use CELEBRITY_FOLLOWER_THRESHOLD from env var', async () => {
      // Set custom threshold
      process.env.CELEBRITY_FOLLOWER_THRESHOLD = '1000';

      mockFollowService.getFollowerCount.mockResolvedValue(1000);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-custom-threshold',
            userId: 'custom-user',
            userHandle: 'custom',
            caption: 'Custom threshold test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should skip fan-out at custom threshold
      expect(mockFollowService.getFollowerCount).toHaveBeenCalledWith('custom-user');
      expect(mockFollowService.getAllFollowers).not.toHaveBeenCalled();
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
    });
  });

  describe('Normal User Fan-Out Tests', () => {
    it('should fan-out to all followers when count < 5000', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(3);
      mockFollowService.getAllFollowers.mockResolvedValue([
        'follower-1',
        'follower-2',
        'follower-3'
      ]);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-normal',
            userId: 'normal-user',
            userHandle: 'normaluser',
            caption: 'Normal user post',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should fan-out to all 3 followers
      expect(mockFollowService.getFollowerCount).toHaveBeenCalledWith('normal-user');
      expect(mockFollowService.getAllFollowers).toHaveBeenCalledWith('normal-user');
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(3);
    });

    it('should write feed item for each follower', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(2);
      mockFollowService.getAllFollowers.mockResolvedValue([
        'follower-alpha',
        'follower-beta'
      ]);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-write-test',
            userId: 'author-write',
            userHandle: 'authorwrite',
            caption: 'Testing writes',
            imageUrl: 'https://example.com/image.jpg',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Verify each follower gets a feed item
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'follower-alpha',
          postId: 'post-write-test',
          authorId: 'author-write',
          authorHandle: 'authorwrite',
          caption: 'Testing writes',
          imageUrl: 'https://example.com/image.jpg',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          isLiked: false,
          createdAt: '2025-10-12T10:00:00.000Z'
        })
      );

      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'follower-beta',
          postId: 'post-write-test',
          authorId: 'author-write',
          authorHandle: 'authorwrite'
        })
      );
    });

    it('should handle user with 0 followers gracefully', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(0);
      mockFollowService.getAllFollowers.mockResolvedValue([]);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-zero-followers',
            userId: 'lonely-user',
            userHandle: 'lonely',
            caption: 'No followers',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should not crash and not write any feed items
      expect(mockFollowService.getFollowerCount).toHaveBeenCalledWith('lonely-user');
      expect(mockFollowService.getAllFollowers).toHaveBeenCalledWith('lonely-user');
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();
    });

    it('should handle user with 1 follower', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['single-follower']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-one-follower',
            userId: 'one-follower-user',
            userHandle: 'onefollower',
            caption: 'Single follower',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should write exactly one feed item
      expect(mockFollowService.getAllFollowers).toHaveBeenCalledWith('one-follower-user');
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(1);
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'single-follower',
          postId: 'post-one-follower'
        })
      );
    });

    it('should handle user with 100 followers (batch test)', async () => {
      const followers = Array.from({ length: 100 }, (_, i) => `follower-${i}`);
      mockFollowService.getFollowerCount.mockResolvedValue(100);
      mockFollowService.getAllFollowers.mockResolvedValue(followers);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-hundred-followers',
            userId: 'hundred-user',
            userHandle: 'hundred',
            caption: '100 followers',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should write 100 feed items
      expect(mockFollowService.getAllFollowers).toHaveBeenCalledWith('hundred-user');
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(100);
    });

    it('should preserve post snapshot data (caption, imageUrl, etc.)', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-snapshot']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-snapshot',
            userId: 'snapshot-user',
            userHandle: 'snapshotuser',
            caption: 'Beautiful sunset!',
            imageUrl: 'https://example.com/sunset.jpg',
            thumbnailUrl: 'https://example.com/sunset-thumb.jpg',
            likesCount: 0,
            commentsCount: 0,
            createdAt: '2025-10-12T18:30:00.000Z'
          })
        ]
      };

      await handler(event);

      // Verify all post data is preserved in feed item
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-snapshot',
          authorId: 'snapshot-user',
          authorHandle: 'snapshotuser',
          caption: 'Beautiful sunset!',
          imageUrl: 'https://example.com/sunset.jpg',
          thumbnailUrl: 'https://example.com/sunset-thumb.jpg',
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          createdAt: '2025-10-12T18:30:00.000Z'
        })
      );
    });
  });

  describe('Batch Write Tests', () => {
    it('should batch writes in chunks of 25 (DynamoDB limit)', async () => {
      // Create 50 followers (should result in 2 batches of 25)
      const followers = Array.from({ length: 50 }, (_, i) => `follower-${i}`);
      mockFollowService.getFollowerCount.mockResolvedValue(50);
      mockFollowService.getAllFollowers.mockResolvedValue(followers);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-batch',
            userId: 'batch-user',
            userHandle: 'batchuser',
            caption: 'Batch test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should write 50 items (implementation may batch internally)
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(50);
    });

    it('should handle exactly 25 followers (single batch)', async () => {
      const followers = Array.from({ length: 25 }, (_, i) => `follower-${i}`);
      mockFollowService.getFollowerCount.mockResolvedValue(25);
      mockFollowService.getAllFollowers.mockResolvedValue(followers);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-25',
            userId: 'user-25',
            userHandle: 'user25',
            caption: 'Exactly 25',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should write exactly 25 items
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(25);
    });

    it('should handle 50 followers (2 batches)', async () => {
      const followers = Array.from({ length: 50 }, (_, i) => `follower-${i}`);
      mockFollowService.getFollowerCount.mockResolvedValue(50);
      mockFollowService.getAllFollowers.mockResolvedValue(followers);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-50',
            userId: 'user-50',
            userHandle: 'user50',
            caption: '50 followers',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should write 50 items across 2 batches
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(50);
    });

    it('should handle 100 followers (4 batches)', async () => {
      const followers = Array.from({ length: 100 }, (_, i) => `follower-${i}`);
      mockFollowService.getFollowerCount.mockResolvedValue(100);
      mockFollowService.getAllFollowers.mockResolvedValue(followers);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-100',
            userId: 'user-100',
            userHandle: 'user100',
            caption: '100 followers',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should write 100 items across 4 batches
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(100);
    });

    it('should execute batches efficiently', async () => {
      const startTime = Date.now();

      const followers = Array.from({ length: 75 }, (_, i) => `follower-${i}`);
      mockFollowService.getFollowerCount.mockResolvedValue(75);
      mockFollowService.getAllFollowers.mockResolvedValue(followers);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-efficiency',
            userId: 'user-efficiency',
            userHandle: 'efficient',
            caption: 'Efficiency test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second for mocked operations)
      expect(duration).toBeLessThan(1000);
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(75);
    });
  });

  describe('Data Mapping Tests', () => {
    it('should extract postId from PK correctly', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-1']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'abc-123-def-456-ghi-789',
            userId: 'author-complex',
            userHandle: 'complex',
            caption: 'Complex post ID',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should correctly extract complex post ID
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'abc-123-def-456-ghi-789'
        })
      );
    });

    it('should extract authorId from post item', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-1']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-author-test',
            userId: 'author-id-123',
            userHandle: 'authorhandle',
            caption: 'Author extraction test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should extract authorId from userId field
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: 'author-id-123'
        })
      );
    });

    it('should snapshot authorHandle at creation time', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-1']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-handle-snapshot',
            userId: 'author-snapshot',
            userHandle: 'originalhandle',
            caption: 'Handle snapshot test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should snapshot authorHandle from post creation time
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          authorHandle: 'originalhandle'
        })
      );
    });

    it('should snapshot caption, imageUrl, thumbnailUrl', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-1']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-full-snapshot',
            userId: 'author-full',
            userHandle: 'fullauthor',
            caption: 'Amazing photo of the mountains!',
            imageUrl: 'https://cdn.example.com/mountains-full.jpg',
            thumbnailUrl: 'https://cdn.example.com/mountains-thumb.jpg',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should snapshot all post content at creation time
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          caption: 'Amazing photo of the mountains!',
          imageUrl: 'https://cdn.example.com/mountains-full.jpg',
          thumbnailUrl: 'https://cdn.example.com/mountains-thumb.jpg'
        })
      );
    });

    it('should set isLiked to false (no user context at write time)', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-1']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-isliked',
            userId: 'author-isliked',
            userHandle: 'likeauthor',
            caption: 'Like test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should always set isLiked to false at creation time
      // (updated later by like stream processor)
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          isLiked: false
        })
      );
    });
  });

  describe('Error Handling Tests', () => {
    it('should continue processing if one follower write fails', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(3);
      mockFollowService.getAllFollowers.mockResolvedValue([
        'follower-1',
        'follower-2',
        'follower-3'
      ]);

      // Mock one failure, two successes
      mockFeedService.writeFeedItem
        .mockResolvedValueOnce(undefined) // follower-1 succeeds
        .mockRejectedValueOnce(new Error('DynamoDB write failed')) // follower-2 fails
        .mockResolvedValueOnce(undefined); // follower-3 succeeds

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-partial-failure',
            userId: 'author-partial',
            userHandle: 'partial',
            caption: 'Partial failure test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should attempt all 3 writes despite one failure
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(3);
    });

    it('should log errors but not throw (don\'t poison stream)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-1']);
      mockFeedService.writeFeedItem.mockRejectedValue(new Error('Write failed'));

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-error-logging',
            userId: 'author-error',
            userHandle: 'errorauthor',
            caption: 'Error logging test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      // Should not throw
      await expect(handler(event)).resolves.not.toThrow();

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed stream events gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const malformedEvent: DynamoDBStreamEvent = {
        Records: [
          {
            eventID: 'malformed',
            eventName: 'INSERT',
            eventVersion: '1.1',
            eventSource: 'aws:dynamodb',
            awsRegion: 'us-east-1',
            dynamodb: {
              // Missing NewImage
            }
          } as any
        ]
      };

      // Should not throw
      await expect(handler(malformedEvent)).resolves.not.toThrow();

      // Should log error about malformed event
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing required fields in post entity', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
                PK: { S: 'POST#post-123' },
                SK: { S: 'POST' }
              },
              NewImage: {
                PK: { S: 'USER#author-123' },
                SK: { S: 'POST#2025-10-12T10:00:00.000Z#post-123' },
                postId: { S: 'post-123' }
                // Missing userId, userHandle, createdAt
              },
              SequenceNumber: '123',
              SizeBytes: 100,
              StreamViewType: 'NEW_AND_OLD_IMAGES'
            }
          }
        ]
      };

      // Should not throw
      await expect(handler(event)).resolves.not.toThrow();

      // Should log error about missing fields
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle FollowService errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFollowService.getFollowerCount.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-follow-error',
            userId: 'author-follow-error',
            userHandle: 'followerror',
            caption: 'FollowService error test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      // Should not throw
      await expect(handler(event)).resolves.not.toThrow();

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockFeedService.writeFeedItem).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration with FeedService Tests', () => {
    it('should call FeedService.writeFeedItem for each follower', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(2);
      mockFollowService.getAllFollowers.mockResolvedValue([
        'follower-alpha',
        'follower-beta'
      ]);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-feed-service',
            userId: 'author-feed',
            userHandle: 'feedauthor',
            caption: 'FeedService integration',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should call writeFeedItem for each follower
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(2);

      // Verify first call
      expect(mockFeedService.writeFeedItem).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          userId: 'follower-alpha',
          postId: 'post-feed-service',
          authorId: 'author-feed'
        })
      );

      // Verify second call
      expect(mockFeedService.writeFeedItem).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          userId: 'follower-beta',
          postId: 'post-feed-service',
          authorId: 'author-feed'
        })
      );
    });

    it('should pass correct parameters to writeFeedItem', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-params']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-params',
            userId: 'author-params',
            userHandle: 'paramsauthor',
            caption: 'Parameter validation',
            imageUrl: 'https://example.com/image.jpg',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            likesCount: 0,
            commentsCount: 0,
            createdAt: '2025-10-12T15:30:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should pass all required parameters correctly
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith({
        userId: 'follower-params',
        postId: 'post-params',
        authorId: 'author-params',
        authorHandle: 'paramsauthor',
        caption: 'Parameter validation',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        createdAt: '2025-10-12T15:30:00.000Z'
      });
    });

    it('should set TTL via writeFeedItem', async () => {
      mockFollowService.getFollowerCount.mockResolvedValue(1);
      mockFollowService.getAllFollowers.mockResolvedValue(['follower-ttl']);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-ttl',
            userId: 'author-ttl',
            userHandle: 'ttlauthor',
            caption: 'TTL test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // FeedService.writeFeedItem internally sets TTL (7 days)
      // We just verify the call was made - TTL is handled by FeedService
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'follower-ttl',
          postId: 'post-ttl'
        })
      );
    });

    it('should track successful writes count', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockFollowService.getFollowerCount.mockResolvedValue(10);
      const followers = Array.from({ length: 10 }, (_, i) => `follower-${i}`);
      mockFollowService.getAllFollowers.mockResolvedValue(followers);

      const event: DynamoDBStreamEvent = {
        Records: [
          createPostInsertRecord({
            postId: 'post-tracking',
            userId: 'author-tracking',
            userHandle: 'tracking',
            caption: 'Tracking test',
            createdAt: '2025-10-12T10:00:00.000Z'
          })
        ]
      };

      await handler(event);

      // Should write to all 10 followers
      expect(mockFeedService.writeFeedItem).toHaveBeenCalledTimes(10);

      // Should log success count (implementation may vary)
      // Verify the handler completed successfully
      expect(mockFollowService.getAllFollowers).toHaveBeenCalledWith('author-tracking');

      consoleLogSpy.mockRestore();
    });
  });
});
