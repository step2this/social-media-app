/* eslint-disable max-lines-per-function, max-statements, complexity, max-depth, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostService, type PostEntity } from './post.service';
import { ProfileService } from './profile.service';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { CreatePostRequest, UpdatePostRequest, GetUserPostsRequest } from '@social-media-app/shared';
import { createMockDynamoClient, type MockDynamoClient } from '@social-media-app/shared/test-utils';

// Mock ProfileService
const createMockProfileService = () => ({
  incrementPostsCount: vi.fn(),
  decrementPostsCount: vi.fn(),
  resetPostsCount: vi.fn(),
  getProfileByHandle: vi.fn(),
  getProfileById: vi.fn(),
  updateProfile: vi.fn(),
  generatePresignedUrl: vi.fn()
});

// Mock FollowService
const createMockFollowService = () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowStatus: vi.fn(),
  getFollowingList: vi.fn()
});

describe('PostService', () => {
  let postService: PostService;
  let mockDynamoClient: MockDynamoClient;
  let mockProfileService: ReturnType<typeof createMockProfileService>;
  const tableName = 'test-table';

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();
    mockProfileService = createMockProfileService();
    postService = new PostService(
      mockDynamoClient as unknown as DynamoDBDocumentClient,
      tableName,
      mockProfileService as unknown as ProfileService
    );
  });

  describe('createPost', () => {
    it('should create a new post successfully', async () => {
      const userId = 'user123';
      const userHandle = 'testuser';
      const request: CreatePostRequest = {
        caption: 'Test caption',
        tags: ['test', 'photo'],
        isPublic: true
      };
      const imageUrl = 'https://example.com/image.jpg';
      const thumbnailUrl = 'https://example.com/thumb.jpg';

      const result = await postService.createPost(userId, userHandle, request, imageUrl, thumbnailUrl);

      expect(result).toMatchObject({
        userId,
        userHandle,
        imageUrl,
        thumbnailUrl,
        caption: 'Test caption',
        tags: ['test', 'photo'],
        likesCount: 0,
        commentsCount: 0,
        isPublic: true
      });
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
      expect(mockProfileService.incrementPostsCount).toHaveBeenCalledWith(userId);
    });

    it('should create post with default values', async () => {
      const userId = 'user123';
      const userHandle = 'testuser';
      const request: CreatePostRequest = {};
      const imageUrl = 'https://example.com/image.jpg';
      const thumbnailUrl = 'https://example.com/thumb.jpg';

      const result = await postService.createPost(userId, userHandle, request, imageUrl, thumbnailUrl);

      expect(result.caption).toBeUndefined();
      expect(result.tags).toEqual([]);
      expect(result.isPublic).toBe(true);
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(postService.createPost('user123', 'testuser', {}, 'image.jpg', 'thumb.jpg'))
        .rejects.toThrow('Database connection failed');

      expect(mockProfileService.incrementPostsCount).not.toHaveBeenCalled();
    });
  });

  describe('getPostById', () => {
    it('should return post when found', async () => {
      const postId = 'post123';
      const postEntity: PostEntity = {
        PK: 'USER#user123',
        SK: 'POST#2024-01-01T00:00:00.000Z#post123',
        GSI1PK: `POST#${postId}`,
        GSI1SK: 'USER#user123',
        id: postId,
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'image.jpg',
        thumbnailUrl: 'thumb.jpg',
        caption: 'Test caption',
        tags: ['test'],
        likesCount: 5,
        commentsCount: 3,
        isPublic: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'POST'
      };

      // Add to mock database
      mockDynamoClient._getGSI1Items().set(`POST#${postId}`, [postEntity]);

      const result = await postService.getPostById(postId);

      expect(result).toMatchObject({
        id: postId,
        userId: 'user123',
        userHandle: 'testuser',
        caption: 'Test caption',
        tags: ['test'],
        likesCount: 5,
        commentsCount: 3,
        isPublic: true
      });
    });

    it('should return null when post not found', async () => {
      const result = await postService.getPostById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updatePost', () => {
    const postId = 'post123';
    const userId = 'user123';
    const postEntity: PostEntity = {
      PK: 'USER#user123',
      SK: 'POST#2024-01-01T00:00:00.000Z#post123',
      GSI1PK: `POST#${postId}`,
      GSI1SK: 'USER#user123',
      id: postId,
      userId,
      userHandle: 'testuser',
      imageUrl: 'image.jpg',
      thumbnailUrl: 'thumb.jpg',
      caption: 'Original caption',
      tags: ['original'],
      likesCount: 0,
      commentsCount: 0,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entityType: 'POST'
    };

    beforeEach(() => {
      // Add post to mock database
      const key = `${postEntity.PK}#${postEntity.SK}`;
      mockDynamoClient._getItems().set(key, postEntity);
      mockDynamoClient._getGSI1Items().set(`POST#${postId}`, [postEntity]);
    });

    it('should update post successfully', async () => {
      const updates: UpdatePostRequest = {
        caption: 'Updated caption',
        tags: ['updated', 'test'],
        isPublic: false
      };

      const result = await postService.updatePost(postId, userId, updates);

      expect(result).toMatchObject({
        id: postId,
        caption: 'Updated caption',
        tags: ['updated', 'test'],
        isPublic: false
      });
      expect(result!.updatedAt).not.toBe(postEntity.updatedAt);
    });

    it('should return null for non-existent post', async () => {
      const result = await postService.updatePost('nonexistent', userId, { caption: 'test' });
      expect(result).toBeNull();
    });

    it('should return null when user is not the owner', async () => {
      const result = await postService.updatePost(postId, 'different-user', { caption: 'test' });
      expect(result).toBeNull();
    });
  });

  describe('deletePost', () => {
    const postId = 'post123';
    const userId = 'user123';
    const postEntity: PostEntity = {
      PK: 'USER#user123',
      SK: 'POST#2024-01-01T00:00:00.000Z#post123',
      GSI1PK: `POST#${postId}`,
      GSI1SK: 'USER#user123',
      id: postId,
      userId,
      userHandle: 'testuser',
      imageUrl: 'image.jpg',
      thumbnailUrl: 'thumb.jpg',
      caption: 'Test caption',
      tags: ['test'],
      likesCount: 0,
      commentsCount: 0,
      isPublic: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entityType: 'POST'
    };

    beforeEach(() => {
      // Add post to mock database
      const key = `${postEntity.PK}#${postEntity.SK}`;
      mockDynamoClient._getItems().set(key, postEntity);
      mockDynamoClient._getGSI1Items().set(`POST#${postId}`, [postEntity]);
    });

    it('should delete post successfully', async () => {
      const result = await postService.deletePost(postId, userId);

      expect(result).toBe(true);
      expect(mockProfileService.decrementPostsCount).toHaveBeenCalledWith(userId);

      // Verify post is removed from mock database
      const key = `${postEntity.PK}#${postEntity.SK}`;
      expect(mockDynamoClient._getItems().has(key)).toBe(false);
    });

    it('should return false for non-existent post', async () => {
      const result = await postService.deletePost('nonexistent', userId);
      expect(result).toBe(false);
      expect(mockProfileService.decrementPostsCount).not.toHaveBeenCalled();
    });

    it('should return false when user is not the owner', async () => {
      const result = await postService.deletePost(postId, 'different-user');
      expect(result).toBe(false);
      expect(mockProfileService.decrementPostsCount).not.toHaveBeenCalled();
    });
  });

  describe('getUserPostsByHandle', () => {
    const userProfile = {
      id: 'user123',
      handle: 'testuser',
      postsCount: 2
    };

    beforeEach(() => {
      mockProfileService.getProfileByHandle.mockResolvedValue(userProfile);
    });

    it('should return user posts successfully', async () => {
      const post1: PostEntity = {
        PK: 'USER#user123',
        SK: 'POST#2024-01-02T00:00:00.000Z#post2',
        GSI1PK: 'POST#post2',
        GSI1SK: 'USER#user123',
        id: 'post2',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'image2.jpg',
        thumbnailUrl: 'thumb2.jpg',
        tags: [],
        likesCount: 10,
        commentsCount: 5,
        isPublic: true,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        entityType: 'POST'
      };

      const post2: PostEntity = {
        PK: 'USER#user123',
        SK: 'POST#2024-01-01T00:00:00.000Z#post1',
        GSI1PK: 'POST#post1',
        GSI1SK: 'USER#user123',
        id: 'post1',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'image1.jpg',
        thumbnailUrl: 'thumb1.jpg',
        tags: [],
        likesCount: 5,
        commentsCount: 2,
        isPublic: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'POST'
      };

      // Add posts to mock database
      mockDynamoClient._getItems().set(`${post1.PK}#${post1.SK}`, post1);
      mockDynamoClient._getItems().set(`${post2.PK}#${post2.SK}`, post2);

      const request: GetUserPostsRequest = {
        handle: 'testuser',
        limit: 24
      };

      const result = await postService.getUserPostsByHandle(request);

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].id).toBe('post2'); // Newer post first
      expect(result.posts[1].id).toBe('post1');
      expect(result.hasMore).toBe(false);
      expect(result.totalCount).toBe(2);
      expect(mockProfileService.getProfileByHandle).toHaveBeenCalledWith('testuser');
    });

    it('should return empty result when user not found', async () => {
      mockProfileService.getProfileByHandle.mockResolvedValue(null);

      const request: GetUserPostsRequest = {
        handle: 'nonexistent',
        limit: 24
      };

      const result = await postService.getUserPostsByHandle(request);

      expect(result).toEqual({
        posts: [],
        hasMore: false,
        totalCount: 0
      });
    });

    it('should handle pagination with cursor', async () => {
      const post1: PostEntity = {
        PK: 'USER#user123',
        SK: 'POST#2024-01-02T00:00:00.000Z#post2',
        GSI1PK: 'POST#post2',
        GSI1SK: 'USER#user123',
        id: 'post2',
        userId: 'user123',
        userHandle: 'testuser',
        imageUrl: 'image2.jpg',
        thumbnailUrl: 'thumb2.jpg',
        tags: [],
        likesCount: 10,
        commentsCount: 5,
        isPublic: true,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        entityType: 'POST'
      };

      mockDynamoClient._getItems().set(`${post1.PK}#${post1.SK}`, post1);

      const cursor = Buffer.from(JSON.stringify({ PK: 'USER#user123', SK: 'POST#2024-01-01T00:00:00.000Z#post1' })).toString('base64');

      const request: GetUserPostsRequest = {
        handle: 'testuser',
        limit: 1,
        cursor
      };

      const result = await postService.getUserPostsByHandle(request);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].id).toBe('post2');
    });
  });

  describe('getUserPosts', () => {
    it('should return authenticated user posts', async () => {
      const userId = 'user123';
      const post: PostEntity = {
        PK: 'USER#user123',
        SK: 'POST#2024-01-01T00:00:00.000Z#post1',
        GSI1PK: 'POST#post1',
        GSI1SK: 'USER#user123',
        id: 'post1',
        userId,
        userHandle: 'testuser',
        imageUrl: 'image1.jpg',
        thumbnailUrl: 'thumb1.jpg',
        caption: 'Private post',
        tags: ['private'],
        likesCount: 5,
        commentsCount: 2,
        isPublic: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        entityType: 'POST'
      };

      mockDynamoClient._getItems().set(`${post.PK}#${post.SK}`, post);

      const result = await postService.getUserPosts(userId);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]).toMatchObject({
        id: 'post1',
        caption: 'Private post',
        isPublic: false
      });
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getFollowingFeedPosts', () => {
    it('should return empty array when user is not following anyone', async () => {
      const userId = 'user123';
      const mockFollowService = createMockFollowService();
      mockFollowService.getFollowingList.mockResolvedValue([]);

      const result = await postService.getFollowingFeedPosts(userId, mockFollowService, 24);

      expect(result.posts).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(mockFollowService.getFollowingList).toHaveBeenCalledWith(userId);
    });

    it('should return posts from followed users only', async () => {
      const userId = 'user123';
      const followeeId1 = 'user-followed-1';
      const followeeId2 = 'user-followed-2';
      const unfollowedUserId = 'user-unfollowed';

      // Create posts from followed users
      const post1: PostEntity = {
        PK: `USER#${followeeId1}`,
        SK: `POST#2025-01-01T10:00:00.000Z#post1`,
        GSI1PK: `POST#post1`,
        GSI1SK: `USER#${followeeId1}`,
        id: 'post1',
        userId: followeeId1,
        userHandle: 'followed1',
        imageUrl: 'https://example.com/image1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        caption: 'Post from followed user 1',
        tags: [],
        likesCount: 5,
        commentsCount: 2,
        isPublic: true,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        entityType: 'POST'
      };

      const post2: PostEntity = {
        PK: `USER#${followeeId2}`,
        SK: `POST#2025-01-01T11:00:00.000Z#post2`,
        GSI1PK: `POST#post2`,
        GSI1SK: `USER#${followeeId2}`,
        id: 'post2',
        userId: followeeId2,
        userHandle: 'followed2',
        imageUrl: 'https://example.com/image2.jpg',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        caption: 'Post from followed user 2',
        tags: [],
        likesCount: 10,
        commentsCount: 3,
        isPublic: true,
        createdAt: '2025-01-01T11:00:00.000Z',
        updatedAt: '2025-01-01T11:00:00.000Z',
        entityType: 'POST'
      };

      // Create post from unfollowed user (should NOT appear in feed)
      const post3: PostEntity = {
        PK: `USER#${unfollowedUserId}`,
        SK: `POST#2025-01-01T12:00:00.000Z#post3`,
        GSI1PK: `POST#post3`,
        GSI1SK: `USER#${unfollowedUserId}`,
        id: 'post3',
        userId: unfollowedUserId,
        userHandle: 'unfollowed',
        imageUrl: 'https://example.com/image3.jpg',
        thumbnailUrl: 'https://example.com/thumb3.jpg',
        caption: 'Post from unfollowed user',
        tags: [],
        likesCount: 1,
        commentsCount: 0,
        isPublic: true,
        createdAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-01T12:00:00.000Z',
        entityType: 'POST'
      };

      mockDynamoClient._getItems().set(`${post1.PK}#${post1.SK}`, post1);
      mockDynamoClient._getItems().set(`${post2.PK}#${post2.SK}`, post2);
      mockDynamoClient._getItems().set(`${post3.PK}#${post3.SK}`, post3);

      const mockFollowService = createMockFollowService();
      mockFollowService.getFollowingList.mockResolvedValue([followeeId1, followeeId2]);

      const result = await postService.getFollowingFeedPosts(userId, mockFollowService, 24);

      expect(result.posts).toHaveLength(2);
      expect(result.posts.map(p => p.id)).toEqual(expect.arrayContaining(['post1', 'post2']));
      expect(result.posts.map(p => p.id)).not.toContain('post3');
    });

    it('should return posts sorted by createdAt DESC (newest first)', async () => {
      const userId = 'user123';
      const followeeId = 'user-followed';

      const olderPost: PostEntity = {
        PK: `USER#${followeeId}`,
        SK: `POST#2025-01-01T10:00:00.000Z#post-older`,
        GSI1PK: `POST#post-older`,
        GSI1SK: `USER#${followeeId}`,
        id: 'post-older',
        userId: followeeId,
        userHandle: 'followed',
        imageUrl: 'https://example.com/old.jpg',
        thumbnailUrl: 'https://example.com/old-thumb.jpg',
        caption: 'Older post',
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        isPublic: true,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        entityType: 'POST'
      };

      const newerPost: PostEntity = {
        PK: `USER#${followeeId}`,
        SK: `POST#2025-01-02T10:00:00.000Z#post-newer`,
        GSI1PK: `POST#post-newer`,
        GSI1SK: `USER#${followeeId}`,
        id: 'post-newer',
        userId: followeeId,
        userHandle: 'followed',
        imageUrl: 'https://example.com/new.jpg',
        thumbnailUrl: 'https://example.com/new-thumb.jpg',
        caption: 'Newer post',
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        isPublic: true,
        createdAt: '2025-01-02T10:00:00.000Z',
        updatedAt: '2025-01-02T10:00:00.000Z',
        entityType: 'POST'
      };

      mockDynamoClient._getItems().set(`${olderPost.PK}#${olderPost.SK}`, olderPost);
      mockDynamoClient._getItems().set(`${newerPost.PK}#${newerPost.SK}`, newerPost);

      const mockFollowService = createMockFollowService();
      mockFollowService.getFollowingList.mockResolvedValue([followeeId]);

      const result = await postService.getFollowingFeedPosts(userId, mockFollowService, 24);

      expect(result.posts).toHaveLength(2);
      // Newer post should be first
      expect(result.posts[0].id).toBe('post-newer');
      expect(result.posts[1].id).toBe('post-older');
    });

    it('should only return public posts', async () => {
      const userId = 'user123';
      const followeeId = 'user-followed';

      const publicPost: PostEntity = {
        PK: `USER#${followeeId}`,
        SK: `POST#2025-01-01T10:00:00.000Z#post-public`,
        GSI1PK: `POST#post-public`,
        GSI1SK: `USER#${followeeId}`,
        id: 'post-public',
        userId: followeeId,
        userHandle: 'followed',
        imageUrl: 'https://example.com/public.jpg',
        thumbnailUrl: 'https://example.com/public-thumb.jpg',
        caption: 'Public post',
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        isPublic: true,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        entityType: 'POST'
      };

      const privatePost: PostEntity = {
        PK: `USER#${followeeId}`,
        SK: `POST#2025-01-01T11:00:00.000Z#post-private`,
        GSI1PK: `POST#post-private`,
        GSI1SK: `USER#${followeeId}`,
        id: 'post-private',
        userId: followeeId,
        userHandle: 'followed',
        imageUrl: 'https://example.com/private.jpg',
        thumbnailUrl: 'https://example.com/private-thumb.jpg',
        caption: 'Private post',
        tags: [],
        likesCount: 0,
        commentsCount: 0,
        isPublic: false,
        createdAt: '2025-01-01T11:00:00.000Z',
        updatedAt: '2025-01-01T11:00:00.000Z',
        entityType: 'POST'
      };

      mockDynamoClient._getItems().set(`${publicPost.PK}#${publicPost.SK}`, publicPost);
      mockDynamoClient._getItems().set(`${privatePost.PK}#${privatePost.SK}`, privatePost);

      const mockFollowService = createMockFollowService();
      mockFollowService.getFollowingList.mockResolvedValue([followeeId]);

      const result = await postService.getFollowingFeedPosts(userId, mockFollowService, 24);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].id).toBe('post-public');
    });

    it('should respect limit parameter', async () => {
      const userId = 'user123';
      const followeeId = 'user-followed';

      // Create 5 posts
      for (let i = 1; i <= 5; i++) {
        const post: PostEntity = {
          PK: `USER#${followeeId}`,
          SK: `POST#2025-01-01T${String(i).padStart(2, '0')}:00:00.000Z#post-${i}`,
          GSI1PK: `POST#post-${i}`,
          GSI1SK: `USER#${followeeId}`,
          id: `post-${i}`,
          userId: followeeId,
          userHandle: 'followed',
          imageUrl: `https://example.com/image${i}.jpg`,
          thumbnailUrl: `https://example.com/thumb${i}.jpg`,
          caption: `Post ${i}`,
          tags: [],
          likesCount: 0,
          commentsCount: 0,
          isPublic: true,
          createdAt: `2025-01-01T${String(i).padStart(2, '0')}:00:00.000Z`,
          updatedAt: `2025-01-01T${String(i).padStart(2, '0')}:00:00.000Z`,
          entityType: 'POST'
        };
        mockDynamoClient._getItems().set(`${post.PK}#${post.SK}`, post);
      }

      const mockFollowService = createMockFollowService();
      mockFollowService.getFollowingList.mockResolvedValue([followeeId]);

      const result = await postService.getFollowingFeedPosts(userId, mockFollowService, 3);

      expect(result.posts).toHaveLength(3);
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user123';
      const mockFollowService = createMockFollowService();
      mockFollowService.getFollowingList.mockRejectedValue(new Error('Database error'));

      await expect(postService.getFollowingFeedPosts(userId, mockFollowService, 24))
        .rejects.toThrow('Database error');
    });
  });

  describe('deleteAllUserPosts - GSI4 Optimization', () => {
    it('should delete all user posts using GSI4 query', async () => {
      const userId = 'user123';

      // Create multiple posts with GSI4 attributes
      const posts: PostEntity[] = [
        {
          PK: `USER#${userId}`,
          SK: `POST#2025-01-01T10:00:00.000Z#post1`,
          GSI1PK: `POST#post1`,
          GSI1SK: `USER#${userId}`,
          GSI4PK: `USER#${userId}`,
          GSI4SK: `POST#2025-01-01T10:00:00.000Z#post1`,
          id: 'post1',
          userId,
          userHandle: 'testuser',
          imageUrl: 'https://example.com/image1.jpg',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          caption: 'Post 1',
          tags: [],
          likesCount: 0,
          commentsCount: 0,
          isPublic: true,
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
          entityType: 'POST'
        },
        {
          PK: `USER#${userId}`,
          SK: `POST#2025-01-02T10:00:00.000Z#post2`,
          GSI1PK: `POST#post2`,
          GSI1SK: `USER#${userId}`,
          GSI4PK: `USER#${userId}`,
          GSI4SK: `POST#2025-01-02T10:00:00.000Z#post2`,
          id: 'post2',
          userId,
          userHandle: 'testuser',
          imageUrl: 'https://example.com/image2.jpg',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          caption: 'Post 2',
          tags: [],
          likesCount: 5,
          commentsCount: 2,
          isPublic: false,
          createdAt: '2025-01-02T10:00:00.000Z',
          updatedAt: '2025-01-02T10:00:00.000Z',
          entityType: 'POST'
        },
        {
          PK: `USER#${userId}`,
          SK: `POST#2025-01-03T10:00:00.000Z#post3`,
          GSI1PK: `POST#post3`,
          GSI1SK: `USER#${userId}`,
          GSI4PK: `USER#${userId}`,
          GSI4SK: `POST#2025-01-03T10:00:00.000Z#post3`,
          id: 'post3',
          userId,
          userHandle: 'testuser',
          imageUrl: 'https://example.com/image3.jpg',
          thumbnailUrl: 'https://example.com/thumb3.jpg',
          caption: 'Post 3',
          tags: ['test', 'gsi4'],
          likesCount: 10,
          commentsCount: 5,
          isPublic: true,
          createdAt: '2025-01-03T10:00:00.000Z',
          updatedAt: '2025-01-03T10:00:00.000Z',
          entityType: 'POST'
        }
      ];

      // Add posts to mock database
      posts.forEach(post => {
        mockDynamoClient._getItems().set(`${post.PK}#${post.SK}`, post);
      });

      // Call deleteAllUserPosts
      const deletedCount = await postService.deleteAllUserPosts(userId);

      // Verify results
      expect(deletedCount).toBe(3);

      // Verify all posts were deleted
      posts.forEach(post => {
        const key = `${post.PK}#${post.SK}`;
        expect(mockDynamoClient._getItems().has(key)).toBe(false);
      });

      // Verify resetPostsCount was called
      expect(mockProfileService.resetPostsCount).toHaveBeenCalledWith(userId);
    });

    it('should handle pagination when deleting many posts', async () => {
      const userId = 'user456';

      // Create 30 posts (more than the batch size of 25)
      const posts: PostEntity[] = [];
      for (let i = 1; i <= 30; i++) {
        const post: PostEntity = {
          PK: `USER#${userId}`,
          SK: `POST#2025-01-${String(i).padStart(2, '0')}T10:00:00.000Z#post${i}`,
          GSI1PK: `POST#post${i}`,
          GSI1SK: `USER#${userId}`,
          GSI4PK: `USER#${userId}`,
          GSI4SK: `POST#2025-01-${String(i).padStart(2, '0')}T10:00:00.000Z#post${i}`,
          id: `post${i}`,
          userId,
          userHandle: 'testuser',
          imageUrl: `https://example.com/image${i}.jpg`,
          thumbnailUrl: `https://example.com/thumb${i}.jpg`,
          caption: `Post ${i}`,
          tags: [],
          likesCount: 0,
          commentsCount: 0,
          isPublic: true,
          createdAt: `2025-01-${String(i).padStart(2, '0')}T10:00:00.000Z`,
          updatedAt: `2025-01-${String(i).padStart(2, '0')}T10:00:00.000Z`,
          entityType: 'POST'
        };
        posts.push(post);
        mockDynamoClient._getItems().set(`${post.PK}#${post.SK}`, post);
      }

      // Call deleteAllUserPosts
      const deletedCount = await postService.deleteAllUserPosts(userId);

      // Verify all 30 posts were deleted
      expect(deletedCount).toBe(30);

      // Verify all posts were deleted from the database
      posts.forEach(post => {
        const key = `${post.PK}#${post.SK}`;
        expect(mockDynamoClient._getItems().has(key)).toBe(false);
      });

      // Verify resetPostsCount was called once
      expect(mockProfileService.resetPostsCount).toHaveBeenCalledWith(userId);
    });

    it('should return 0 when user has no posts', async () => {
      const userId = 'user-no-posts';

      // Call deleteAllUserPosts for a user with no posts
      const deletedCount = await postService.deleteAllUserPosts(userId);

      // Verify results
      expect(deletedCount).toBe(0);

      // Verify resetPostsCount was NOT called when no posts exist
      expect(mockProfileService.resetPostsCount).not.toHaveBeenCalled();
    });

    it('should set GSI4 attributes when creating a post', async () => {
      const userId = 'user789';
      const userHandle = 'testuser789';
      const request: CreatePostRequest = {
        caption: 'Test post with GSI4',
        tags: ['test', 'gsi4'],
        isPublic: true
      };
      const imageUrl = 'https://example.com/test.jpg';
      const thumbnailUrl = 'https://example.com/test-thumb.jpg';

      const result = await postService.createPost(userId, userHandle, request, imageUrl, thumbnailUrl);

      // Get the created post from mock database
      const items = Array.from(mockDynamoClient._getItems().values());
      const createdPost = items.find(item => item.id === result.id) as PostEntity;

      // Verify GSI4 attributes were set
      expect(createdPost.GSI4PK).toBe(`USER#${userId}`);
      expect(createdPost.GSI4SK).toMatch(/^POST#\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#/);

      // Verify GSI4SK matches the SK pattern for chronological ordering
      expect(createdPost.GSI4SK).toBe(createdPost.SK);
    });
  });
});