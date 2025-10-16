/**
 * Field Resolver Tests
 *
 * Tests GraphQL field resolvers by mocking DAL services (not DynamoDB).
 *
 * Test Focus (GraphQL concerns only):
 * - Field resolution logic (parent → resolved field)
 * - Authentication-dependent fields (isFollowing, isLiked)
 * - Nested object resolution (author profiles)
 * - Null handling for unauthenticated users
 *
 * NOT Tested Here (DAL already covers):
 * - DynamoDB operations
 * - Data fetching logic
 * - Entity mapping
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Profile as ProfileResolver } from '../../src/schema/resolvers/Profile.js';
import { Post as PostResolver } from '../../src/schema/resolvers/Post.js';
import { Comment as CommentResolver } from '../../src/schema/resolvers/Comment.js';
import { ProfileService, FollowService, LikeService, PostService, CommentService } from '@social-media-app/dal';
import { createLoaders } from '../../src/dataloaders/index.js';
import type { GraphQLContext } from '../../src/context.js';
import type { Profile, PublicProfile, Post, Comment } from '@social-media-app/shared';

describe('Field Resolvers', () => {
  let mockContext: GraphQLContext;
  let mockProfileService: ProfileService;
  let mockPostService: PostService;
  let mockLikeService: LikeService;
  let mockFollowService: FollowService;

  beforeEach(() => {
    // Create pure mock service objects (no real instantiation, no spies)
    // Only mock methods that resolvers/loaders actually call
    mockProfileService = {
      getProfilesByIds: vi.fn(),
    } as unknown as ProfileService;

    mockPostService = {} as unknown as PostService;

    mockLikeService = {
      getLikeStatusesByPostIds: vi.fn(),
    } as unknown as LikeService;

    const mockCommentService = {} as unknown as CommentService;

    mockFollowService = {
      getFollowStatus: vi.fn(),
    } as unknown as FollowService;

    mockContext = {
      userId: 'test-user-123',
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
        commentService: mockCommentService,
        followService: mockFollowService,
        feedService: {} as any,
        notificationService: {} as any,
        authService: {} as any,
        auctionService: {} as any,
      },
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
        auctionService: {} as any,
      }, 'test-user-123'),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Profile.isFollowing', () => {
    it('should return true when authenticated user follows this profile', async () => {
      const parentProfile: PublicProfile = {
        id: 'user-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: null,
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      (mockFollowService.getFollowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      });

      const result = await ProfileResolver.isFollowing(
        parentProfile as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBe(true);
    });

    it('should return false when authenticated user does not follow this profile', async () => {
      const parentProfile: PublicProfile = {
        id: 'user-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: null,
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      (mockFollowService.getFollowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        isFollowing: false,
        followersCount: 100,
        followingCount: 50,
      });

      const result = await ProfileResolver.isFollowing(
        parentProfile as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBe(false);
    });

    it('should return null when user is not authenticated', async () => {
      const unauthContext: GraphQLContext = {
        userId: null,
        dynamoClient: {} as any,
        tableName: 'test-table',
        loaders: createLoaders({
          profileService: mockProfileService,
          postService: mockPostService,
          likeService: mockLikeService,
        }, null),
      };

      const parentProfile: PublicProfile = {
        id: 'user-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: null,
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const result = await ProfileResolver.isFollowing(
        parentProfile as any,
        {},
        unauthContext,
        {} as any
      );

      expect(result).toBeNull();
    });

    it('should return null when viewing own profile', async () => {
      const parentProfile: PublicProfile = {
        id: 'test-user-123', // Same as context.userId
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const result = await ProfileResolver.isFollowing(
        parentProfile as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });
  });

  describe('Post.author', () => {
    it('should resolve author profile from userId', async () => {
      const parentPost: Post = {
        id: 'post-123',
        userId: 'user-456',
        userHandle: 'johndoe',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      const mockProfile: PublicProfile = {
        id: 'user-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: 'Software engineer',
        profileImageUrl: 'https://example.com/profile.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock the batch method used by DataLoader
      (mockProfileService.getProfilesByIds as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['user-456', mockProfile]])
      );

      const result = await PostResolver.author(
        parentPost as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockProfile);
      expect(result.id).toBe('user-456');
    });

    it('should handle missing author gracefully', async () => {
      const parentPost: Post = {
        id: 'post-123',
        userId: 'deleted-user',
        userHandle: 'deleteduser',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      // Mock the batch method used by DataLoader (empty map = not found)
      (mockProfileService.getProfilesByIds as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());

      const result = await PostResolver.author(
        parentPost as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });
  });

  describe('Post.isLiked', () => {
    it('should return true when authenticated user liked this post', async () => {
      const parentPost: Post = {
        id: 'post-123',
        userId: 'user-456',
        userHandle: 'johndoe',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      // Mock the batch method used by DataLoader
      (mockLikeService.getLikeStatusesByPostIds as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['post-123', { isLiked: true, likesCount: 5 }]])
      );

      const result = await PostResolver.isLiked(
        parentPost as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBe(true);
    });

    it('should return false when authenticated user has not liked this post', async () => {
      const parentPost: Post = {
        id: 'post-123',
        userId: 'user-456',
        userHandle: 'johndoe',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      // Mock the batch method used by DataLoader
      (mockLikeService.getLikeStatusesByPostIds as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['post-123', { isLiked: false, likesCount: 5 }]])
      );

      const result = await PostResolver.isLiked(
        parentPost as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBe(false);
    });

    it('should return null when user is not authenticated', async () => {
      const unauthContext: GraphQLContext = {
        userId: null,
        dynamoClient: {} as any,
        tableName: 'test-table',
        loaders: createLoaders({
          profileService: mockProfileService,
          postService: mockPostService,
          likeService: mockLikeService,
        }, null),
      };

      const parentPost: Post = {
        id: 'post-123',
        userId: 'user-456',
        userHandle: 'johndoe',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      const result = await PostResolver.isLiked(
        parentPost as any,
        {},
        unauthContext,
        {} as any
      );

      expect(result).toBeNull();
    });
  });

  describe('Comment.author', () => {
    it('should resolve author profile from userId', async () => {
      const parentComment: Comment = {
        id: 'comment-123',
        postId: 'post-123',
        userId: 'user-456',
        userHandle: 'johndoe',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockProfile: PublicProfile = {
        id: 'user-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: 'Software engineer',
        profileImageUrl: 'https://example.com/profile.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock the batch method used by DataLoader
      (mockProfileService.getProfilesByIds as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['user-456', mockProfile]])
      );

      const result = await CommentResolver.author(
        parentComment as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockProfile);
      expect(result.id).toBe('user-456');
    });

    it('should handle missing author gracefully', async () => {
      const parentComment: Comment = {
        id: 'comment-123',
        postId: 'post-123',
        userId: 'deleted-user',
        userHandle: 'deleteduser',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock the batch method used by DataLoader (empty map = not found)
      (mockProfileService.getProfilesByIds as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());

      const result = await CommentResolver.author(
        parentComment as any,
        {},
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });
  });
});
