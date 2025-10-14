/**
 * DataLoader Tests
 *
 * Comprehensive test suite for DataLoader implementation to solve N+1 query problem.
 *
 * Test Focus (DataLoader behavior):
 * - Batching: Multiple loads within event loop should batch into single DB call
 * - Deduplication: Identical keys should only query DB once
 * - Caching: Within request scope, second load returns cached value
 * - Isolation: Different contexts should not share cache
 * - Error handling: Partial failures and error propagation
 * - Integration: Field resolvers use DataLoaders (not DAL services directly)
 *
 * N+1 Problem Context:
 * - Without DataLoader: Fetching 20 posts = 21 DB calls (1 for posts + 20 for authors)
 * - With DataLoader: Fetching 20 posts = 2 DB calls (1 for posts + 1 batched for authors)
 *
 * TDD RED Phase: ALL TESTS WILL FAIL because DataLoader not yet implemented
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProfileService, PostService, LikeService } from '@social-media-app/dal';
import type { PublicProfile, Post } from '@social-media-app/shared';
import type { GraphQLContext } from '../src/context.js';

// Import DataLoader types and implementation (will fail initially - TDD RED)
import type DataLoader from 'dataloader';

// Import DataLoader factory (will fail initially - TDD RED)
import { createLoaders } from '../src/dataloaders/index.js';

describe('DataLoaders', () => {
  let mockContext: GraphQLContext;
  let mockProfileService: ProfileService;
  let mockPostService: PostService;
  let mockLikeService: LikeService;

  beforeEach(() => {
    mockContext = {
      userId: 'test-user-123',
      dynamoClient: {} as any,
      tableName: 'test-table',
    };

    // Create mock service instances matching actual constructor signatures
    mockProfileService = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
    mockPostService = new PostService({} as any, 'test-table', mockProfileService);
    mockLikeService = new LikeService({} as any, 'test-table');

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ProfileLoader', () => {
    it('should batch multiple profile loads into single DB call', async () => {
      // Arrange: Mock ProfileService.getProfilesByIds to return Map
      const mockProfile1: PublicProfile = {
        id: 'user-1',
        handle: 'user1',
        username: 'user1@example.com',
        fullName: 'User One',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const mockProfile2: PublicProfile = {
        id: 'user-2',
        handle: 'user2',
        username: 'user2@example.com',
        fullName: 'User Two',
        bio: 'Hello world',
        profilePictureUrl: 'https://example.com/profile2.jpg',
        profilePictureThumbnailUrl: 'https://example.com/thumb2.jpg',
        followersCount: 20,
        followingCount: 15,
        postsCount: 8,
        createdAt: '2024-01-02T00:00:00.000Z',
      };

      // Mock the batch method that should be called ONCE
      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(
          new Map([
            ['user-1', mockProfile1],
            ['user-2', mockProfile2],
          ])
        );

      // Act: Load multiple profiles in parallel (same event loop tick)
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [profile1, profile2] = await Promise.all([
        loaders.profileLoader.load('user-1'),
        loaders.profileLoader.load('user-2'),
      ]);

      // Assert: Should call DB only ONCE (batching behavior)
      expect(getProfilesByIdsSpy).toHaveBeenCalledTimes(1);
      expect(getProfilesByIdsSpy).toHaveBeenCalledWith(['user-1', 'user-2']);

      // Assert: Should return correct profiles
      expect(profile1).toEqual(mockProfile1);
      expect(profile2).toEqual(mockProfile2);
    });

    it('should deduplicate identical profile requests', async () => {
      // Arrange: Mock profile service
      const mockProfile: PublicProfile = {
        id: 'user-1',
        handle: 'user1',
        username: 'user1@example.com',
        fullName: 'User One',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(new Map([['user-1', mockProfile]]));

      // Act: Load same profile multiple times
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [profile1, profile2, profile3] = await Promise.all([
        loaders.profileLoader.load('user-1'),
        loaders.profileLoader.load('user-1'),
        loaders.profileLoader.load('user-1'),
      ]);

      // Assert: Should call DB once with deduplicated keys
      expect(getProfilesByIdsSpy).toHaveBeenCalledTimes(1);
      expect(getProfilesByIdsSpy).toHaveBeenCalledWith(['user-1']); // Only one ID

      // Assert: All should return same profile
      expect(profile1).toEqual(mockProfile);
      expect(profile2).toEqual(mockProfile);
      expect(profile3).toEqual(mockProfile);
    });

    it('should cache profile results within request scope', async () => {
      // Arrange: Mock profile service
      const mockProfile: PublicProfile = {
        id: 'user-1',
        handle: 'user1',
        username: 'user1@example.com',
        fullName: 'User One',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(new Map([['user-1', mockProfile]]));

      // Act: Load profile, then load same profile again after first completes
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');

      // First load
      const profile1 = await loaders.profileLoader.load('user-1');

      // Second load (should hit cache)
      const profile2 = await loaders.profileLoader.load('user-1');

      // Assert: Should only call DB once (second load uses cache)
      expect(getProfilesByIdsSpy).toHaveBeenCalledTimes(1);

      // Assert: Both return same profile
      expect(profile1).toEqual(mockProfile);
      expect(profile2).toEqual(mockProfile);
    });

    it('should not cache across different contexts', async () => {
      // Arrange: Create two separate service instances for different contexts
      const profileService1 = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
      const postService1 = new PostService({} as any, 'test-table', profileService1);
      const likeService1 = new LikeService({} as any, 'test-table');

      const profileService2 = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
      const postService2 = new PostService({} as any, 'test-table', profileService2);
      const likeService2 = new LikeService({} as any, 'test-table');

      const mockProfile: PublicProfile = {
        id: 'user-1',
        handle: 'user1',
        username: 'user1@example.com',
        fullName: 'User One',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(new Map([['user-1', mockProfile]]));

      // Act: Load profile in first context
      const loaders1 = createLoaders({
        profileService: profileService1,
        postService: postService1,
        likeService: likeService1,
      }, 'test-user-1');
      await loaders1.profileLoader.load('user-1');

      // Act: Load same profile in second context
      const loaders2 = createLoaders({
        profileService: profileService2,
        postService: postService2,
        likeService: likeService2,
      }, 'test-user-2');
      await loaders2.profileLoader.load('user-1');

      // Assert: Should call DB twice (different contexts, no shared cache)
      expect(getProfilesByIdsSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle null/missing profiles gracefully', async () => {
      // Arrange: Mock service returning null for missing profile
      const mockProfile: PublicProfile = {
        id: 'user-1',
        handle: 'user1',
        username: 'user1@example.com',
        fullName: 'User One',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Return Map with only one profile (user-2 is missing)
      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(new Map([['user-1', mockProfile]]));

      // Act: Load both existing and non-existing profiles
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [profile1, profile2] = await Promise.all([
        loaders.profileLoader.load('user-1'),
        loaders.profileLoader.load('user-2'), // This one doesn't exist
      ]);

      // Assert: Should call DB once with both IDs
      expect(getProfilesByIdsSpy).toHaveBeenCalledTimes(1);
      expect(getProfilesByIdsSpy).toHaveBeenCalledWith(['user-1', 'user-2']);

      // Assert: Existing profile returned, missing one is null
      expect(profile1).toEqual(mockProfile);
      expect(profile2).toBeNull();
    });
  });

  describe('PostLoader', () => {
    it('should batch multiple post loads into single DB call', async () => {
      // Arrange: Mock PostService.getPostsByIds
      const mockPost1: Post = {
        id: 'post-1',
        userId: 'user-1',
        userHandle: 'user1',
        caption: 'First post',
        imageUrl: 'https://example.com/post1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: ['test'],
        isPublic: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockPost2: Post = {
        id: 'post-2',
        userId: 'user-2',
        userHandle: 'user2',
        caption: 'Second post',
        imageUrl: 'https://example.com/post2.jpg',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        likesCount: 10,
        commentsCount: 5,
        tags: [],
        isPublic: true,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      const getPostsByIdsSpy = vi
        .spyOn(PostService.prototype, 'getPostsByIds')
        .mockResolvedValue(
          new Map([
            ['post-1', mockPost1],
            ['post-2', mockPost2],
          ])
        );

      // Act: Load multiple posts in parallel
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [post1, post2] = await Promise.all([
        loaders.postLoader.load('post-1'),
        loaders.postLoader.load('post-2'),
      ]);

      // Assert: Should call DB only once (batching)
      expect(getPostsByIdsSpy).toHaveBeenCalledTimes(1);
      expect(getPostsByIdsSpy).toHaveBeenCalledWith(['post-1', 'post-2']);

      // Assert: Should return correct posts
      expect(post1).toEqual(mockPost1);
      expect(post2).toEqual(mockPost2);
    });

    it('should deduplicate identical post requests', async () => {
      // Arrange: Mock post service
      const mockPost: Post = {
        id: 'post-1',
        userId: 'user-1',
        userHandle: 'user1',
        caption: 'Test post',
        imageUrl: 'https://example.com/post1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        isPublic: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const getPostsByIdsSpy = vi
        .spyOn(PostService.prototype, 'getPostsByIds')
        .mockResolvedValue(new Map([['post-1', mockPost]]));

      // Act: Load same post multiple times
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [post1, post2, post3] = await Promise.all([
        loaders.postLoader.load('post-1'),
        loaders.postLoader.load('post-1'),
        loaders.postLoader.load('post-1'),
      ]);

      // Assert: Should call DB once with deduplicated keys
      expect(getPostsByIdsSpy).toHaveBeenCalledTimes(1);
      expect(getPostsByIdsSpy).toHaveBeenCalledWith(['post-1']);

      // Assert: All return same post
      expect(post1).toEqual(mockPost);
      expect(post2).toEqual(mockPost);
      expect(post3).toEqual(mockPost);
    });

    it('should handle empty batch gracefully', async () => {
      // Arrange: Mock post service with empty result
      const getPostsByIdsSpy = vi
        .spyOn(PostService.prototype, 'getPostsByIds')
        .mockResolvedValue(new Map());

      // Act: Load non-existent post
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const post = await loaders.postLoader.load('nonexistent-post');

      // Assert: Should call DB
      expect(getPostsByIdsSpy).toHaveBeenCalledTimes(1);
      expect(getPostsByIdsSpy).toHaveBeenCalledWith(['nonexistent-post']);

      // Assert: Should return null for missing post
      expect(post).toBeNull();
    });
  });

  describe('LikeStatusLoader', () => {
    it('should batch like status checks for multiple posts', async () => {
      // Arrange: Mock LikeService.getLikeStatusesByPostIds
      const mockStatuses = new Map([
        ['post-1', { isLiked: true, likesCount: 10 }],
        ['post-2', { isLiked: false, likesCount: 5 }],
        ['post-3', { isLiked: true, likesCount: 15 }],
      ]);

      const getLikeStatusesSpy = vi
        .spyOn(LikeService.prototype, 'getLikeStatusesByPostIds')
        .mockResolvedValue(mockStatuses);

      // Act: Load like statuses for multiple posts
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [status1, status2, status3] = await Promise.all([
        loaders.likeStatusLoader.load('post-1'),
        loaders.likeStatusLoader.load('post-2'),
        loaders.likeStatusLoader.load('post-3'),
      ]);

      // Assert: Should call DB only once (batching)
      expect(getLikeStatusesSpy).toHaveBeenCalledTimes(1);
      expect(getLikeStatusesSpy).toHaveBeenCalledWith(
        'test-user-123',
        ['post-1', 'post-2', 'post-3']
      );

      // Assert: Should return correct statuses
      expect(status1).toEqual({ isLiked: true, likesCount: 10 });
      expect(status2).toEqual({ isLiked: false, likesCount: 5 });
      expect(status3).toEqual({ isLiked: true, likesCount: 15 });
    });

    it('should handle compound keys (userId + postId)', async () => {
      // Arrange: Create two separate service instances for different users
      const profileService1 = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
      const postService1 = new PostService({} as any, 'test-table', profileService1);
      const likeService1 = new LikeService({} as any, 'test-table');

      const profileService2 = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
      const postService2 = new PostService({} as any, 'test-table', profileService2);
      const likeService2 = new LikeService({} as any, 'test-table');

      const mockStatuses1 = new Map([['post-1', { isLiked: true, likesCount: 10 }]]);
      const mockStatuses2 = new Map([['post-1', { isLiked: false, likesCount: 10 }]]);

      const getLikeStatusesSpy = vi
        .spyOn(LikeService.prototype, 'getLikeStatusesByPostIds')
        .mockResolvedValueOnce(mockStatuses1)
        .mockResolvedValueOnce(mockStatuses2);

      // Act: Load same post for different users
      const loaders1 = createLoaders({
        profileService: profileService1,
        postService: postService1,
        likeService: likeService1,
      }, 'user-1');
      const loaders2 = createLoaders({
        profileService: profileService2,
        postService: postService2,
        likeService: likeService2,
      }, 'user-2');

      const status1 = await loaders1.likeStatusLoader.load('post-1');
      const status2 = await loaders2.likeStatusLoader.load('post-1');

      // Assert: Should call DB twice (different users)
      expect(getLikeStatusesSpy).toHaveBeenCalledTimes(2);
      expect(getLikeStatusesSpy).toHaveBeenNthCalledWith(1, 'user-1', ['post-1']);
      expect(getLikeStatusesSpy).toHaveBeenNthCalledWith(2, 'user-2', ['post-1']);

      // Assert: Different statuses for different users
      expect(status1?.isLiked).toBe(true);
      expect(status2?.isLiked).toBe(false);
    });

    it('should return correct status for each post', async () => {
      // Arrange: Mix of liked and unliked posts
      const mockStatuses = new Map([
        ['post-1', { isLiked: true, likesCount: 10 }],
        ['post-2', { isLiked: false, likesCount: 5 }],
        ['post-3', { isLiked: false, likesCount: 3 }],
      ]);

      vi.spyOn(LikeService.prototype, 'getLikeStatusesByPostIds').mockResolvedValue(
        mockStatuses
      );

      // Act: Load statuses
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [status1, status2, status3] = await Promise.all([
        loaders.likeStatusLoader.load('post-1'),
        loaders.likeStatusLoader.load('post-2'),
        loaders.likeStatusLoader.load('post-3'),
      ]);

      // Assert: Correct isLiked for each post
      expect(status1?.isLiked).toBe(true);
      expect(status2?.isLiked).toBe(false);
      expect(status3?.isLiked).toBe(false);
    });

    it('should cache results within request', async () => {
      // Arrange: Mock like service
      const mockStatuses = new Map([['post-1', { isLiked: true, likesCount: 10 }]]);

      const getLikeStatusesSpy = vi
        .spyOn(LikeService.prototype, 'getLikeStatusesByPostIds')
        .mockResolvedValue(mockStatuses);

      // Act: Load same status twice
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');

      const status1 = await loaders.likeStatusLoader.load('post-1');
      const status2 = await loaders.likeStatusLoader.load('post-1');

      // Assert: Should only call DB once (second uses cache)
      expect(getLikeStatusesSpy).toHaveBeenCalledTimes(1);

      // Assert: Both return same status
      expect(status1).toEqual(status2);
      expect(status1?.isLiked).toBe(true);
    });
  });

  describe('Integration with Field Resolvers', () => {
    it('should use profileLoader in Post.author resolver instead of ProfileService directly', async () => {
      // This test verifies that Post.author field resolver uses DataLoader
      // instead of calling ProfileService.getProfileById directly

      // Arrange: Import Post field resolver
      const { Post: PostResolver } = await import('../src/schema/resolvers/Post.js');

      const mockPost: Post = {
        id: 'post-123',
        userId: 'user-456',
        userHandle: 'johndoe',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        isPublic: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockProfile: PublicProfile = {
        id: 'user-456',
        handle: 'johndoe',
        username: 'johndoe@example.com',
        fullName: 'John Doe',
        bio: 'Software engineer',
        profilePictureUrl: 'https://example.com/profile.jpg',
        profilePictureThumbnailUrl: 'https://example.com/thumb.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Spy on ProfileService (should NOT be called directly)
      const getProfileByIdSpy = vi.spyOn(ProfileService.prototype, 'getProfileById');

      // Mock the batch method (should be called via DataLoader)
      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(new Map([['user-456', mockProfile]]));

      // Create context with DataLoaders
      const contextWithLoaders = {
        ...mockContext,
        loaders: createLoaders({
          profileService: mockProfileService,
          postService: mockPostService,
          likeService: mockLikeService,
        }, 'test-user-123'),
      };

      // Act: Call Post.author resolver
      const result = await PostResolver.author(
        mockPost as any,
        {},
        contextWithLoaders as any,
        {} as any
      );

      // Assert: Should NOT call getProfileById (old way)
      expect(getProfileByIdSpy).not.toHaveBeenCalled();

      // Assert: Should call getProfilesByIds through DataLoader (new way)
      expect(getProfilesByIdsSpy).toHaveBeenCalled();

      // Assert: Should return profile
      expect(result).toEqual(mockProfile);
    });

    it('should use profileLoader in Comment.author resolver', async () => {
      // This test verifies that Comment.author field resolver uses DataLoader

      // Arrange: Import Comment field resolver
      const { Comment: CommentResolver } = await import(
        '../src/schema/resolvers/Comment.js'
      );

      const mockComment = {
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
        username: 'johndoe@example.com',
        fullName: 'John Doe',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Spy on ProfileService (should NOT be called directly)
      const getProfileByIdSpy = vi.spyOn(ProfileService.prototype, 'getProfileById');

      // Mock the batch method (should be called via DataLoader)
      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockResolvedValue(new Map([['user-456', mockProfile]]));

      // Create context with DataLoaders
      const contextWithLoaders = {
        ...mockContext,
        loaders: createLoaders({
          profileService: mockProfileService,
          postService: mockPostService,
          likeService: mockLikeService,
        }, 'test-user-123'),
      };

      // Act: Call Comment.author resolver
      const result = await CommentResolver.author(
        mockComment as any,
        {},
        contextWithLoaders as any,
        {} as any
      );

      // Assert: Should NOT call getProfileById
      expect(getProfileByIdSpy).not.toHaveBeenCalled();

      // Assert: Should call getProfilesByIds through DataLoader
      expect(getProfilesByIdsSpy).toHaveBeenCalled();

      // Assert: Should return profile
      expect(result).toEqual(mockProfile);
    });

    it('should use likeStatusLoader in Post.isLiked resolver', async () => {
      // This test verifies that Post.isLiked field resolver uses DataLoader

      // Arrange: Import Post field resolver
      const { Post: PostResolver } = await import('../src/schema/resolvers/Post.js');

      const mockPost: Post = {
        id: 'post-123',
        userId: 'user-456',
        userHandle: 'johndoe',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        isPublic: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Spy on LikeService (should NOT be called directly)
      const getPostLikeStatusSpy = vi.spyOn(LikeService.prototype, 'getPostLikeStatus');

      // Mock the batch method (should be called via DataLoader)
      const getLikeStatusesSpy = vi
        .spyOn(LikeService.prototype, 'getLikeStatusesByPostIds')
        .mockResolvedValue(
          new Map([['post-123', { isLiked: true, likesCount: 5 }]])
        );

      // Create context with DataLoaders
      const contextWithLoaders = {
        ...mockContext,
        loaders: createLoaders({
          profileService: mockProfileService,
          postService: mockPostService,
          likeService: mockLikeService,
        }, 'test-user-123'),
      };

      // Act: Call Post.isLiked resolver
      const result = await PostResolver.isLiked(
        mockPost as any,
        {},
        contextWithLoaders as any,
        {} as any
      );

      // Assert: Should NOT call getPostLikeStatus (old way)
      expect(getPostLikeStatusSpy).not.toHaveBeenCalled();

      // Assert: Should call getLikeStatusesByPostIds through DataLoader (new way)
      expect(getLikeStatusesSpy).toHaveBeenCalled();

      // Assert: Should return isLiked status
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle partial failures in batch', async () => {
      // Arrange: Mock service that throws error for specific IDs
      const mockProfile: PublicProfile = {
        id: 'user-1',
        handle: 'user1',
        username: 'user1@example.com',
        fullName: 'User One',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock: user-1 succeeds, user-2 fails (returns null or throws)
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(
        new Map([['user-1', mockProfile]])
        // user-2 is missing from response
      );

      // Act: Load both profiles
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');
      const [profile1, profile2] = await Promise.all([
        loaders.profileLoader.load('user-1'),
        loaders.profileLoader.load('user-2'),
      ]);

      // Assert: Successful one returns profile, failed one returns null
      expect(profile1).toEqual(mockProfile);
      expect(profile2).toBeNull();
    });

    it('should not cache errors', async () => {
      // Arrange: Mock service that fails first time, succeeds second time
      const mockProfile: PublicProfile = {
        id: 'user-1',
        handle: 'user1',
        username: 'user1@example.com',
        fullName: 'User One',
        bio: null,
        profilePictureUrl: null,
        profilePictureThumbnailUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockRejectedValueOnce(new Error('Database connection failed'))
        .mockResolvedValueOnce(new Map([['user-1', mockProfile]]));

      // Act: First load fails
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');

      let error: Error | null = null;
      try {
        await loaders.profileLoader.load('user-1');
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toMatch(/database connection failed/i);

      // Act: Second load should retry (not cached)
      const profile = await loaders.profileLoader.load('user-1');

      // Assert: Should call DB twice (error not cached)
      expect(getProfilesByIdsSpy).toHaveBeenCalledTimes(2);

      // Assert: Second attempt succeeds
      expect(profile).toEqual(mockProfile);
    });

    it('should propagate errors correctly', async () => {
      // Arrange: Mock service that throws error
      const getProfilesByIdsSpy = vi
        .spyOn(ProfileService.prototype, 'getProfilesByIds')
        .mockRejectedValue(new Error('Database error'));

      // Act & Assert: Error should propagate to caller
      const loaders = createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123');

      await expect(loaders.profileLoader.load('user-1')).rejects.toThrow(
        'Database error'
      );

      // Verify error was thrown by the service
      expect(getProfilesByIdsSpy).toHaveBeenCalled();
    });
  });
});
