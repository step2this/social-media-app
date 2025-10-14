/**
 * GraphQL Integration Tests - Field Resolution
 *
 * Tests nested field resolution through actual GraphQL execution.
 * Verifies that field resolvers work correctly in real queries.
 *
 * Test Focus:
 * - Multi-hop field resolution (Post → author → profile data)
 * - Authentication-dependent fields (isLiked, isFollowing)
 * - Null handling for unauthenticated users
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { createApolloServer } from '../../src/server.js';
import { PostService, ProfileService, LikeService, FollowService } from '@social-media-app/dal';
import { createLoaders } from '../../src/dataloaders/index.js';
import type { GraphQLContext } from '../../src/context.js';
import type { Post, PublicProfile } from '@social-media-app/shared';

describe('GraphQL Integration - Field Resolution', () => {
  let server: ApolloServer<GraphQLContext>;
  let mockContext: GraphQLContext;
  let unauthContext: GraphQLContext;
  let mockProfileService: ProfileService;
  let mockPostService: PostService;
  let mockLikeService: LikeService;

  beforeEach(async () => {
    server = createApolloServer();
    await server.start();

    // Create mock service instances
    mockProfileService = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
    mockPostService = new PostService({} as any, 'test-table', mockProfileService);
    mockLikeService = new LikeService({} as any, 'test-table');

    mockContext = {
      userId: 'test-user-123',
      dynamoClient: {} as any,
      tableName: 'test-table',
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, 'test-user-123'),
    };

    unauthContext = {
      userId: null,
      dynamoClient: {} as any,
      tableName: 'test-table',
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
      }, null),
    };

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.stop();
    vi.restoreAllMocks();
  });

  describe('Post Field Resolution', () => {
    it('should resolve Post.author and Post.isLiked in single query (authenticated)', async () => {
      const mockPost: Post = {
        id: 'post-123',
        userId: 'author-456',
        userHandle: 'authoruser',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      const mockAuthor: PublicProfile = {
        id: 'author-456',
        handle: 'authoruser',
        displayName: 'Author User',
        bio: 'Content creator',
        profileImageUrl: 'https://example.com/avatar.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(PostService.prototype, 'getPostById').mockResolvedValue(mockPost);
      // Mock batch methods used by DataLoaders
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(
        new Map([['author-456', mockAuthor]])
      );
      vi.spyOn(LikeService.prototype, 'getLikeStatusesByPostIds').mockResolvedValue(
        new Map([['post-123', { isLiked: true, likesCount: 5 }]])
      );

      const result = await server.executeOperation({
        query: `
          query GetPostWithDetails($id: ID!) {
            post(id: $id) {
              id
              caption
              likesCount
              isLiked
              author {
                id
                handle
                displayName
                bio
                followersCount
              }
            }
          }
        `,
        variables: { id: 'post-123' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const post = result.body.singleResult.data?.post;
        expect(post.id).toBe('post-123');
        expect(post.isLiked).toBe(true);
        expect(post.author.handle).toBe('authoruser');
        expect(post.author.displayName).toBe('Author User');
        expect(post.author.bio).toBe('Content creator');
        expect(post.author.followersCount).toBe(100);
      }

      // Verify batch methods were called by DataLoaders
      expect(ProfileService.prototype.getProfilesByIds).toHaveBeenCalled();
      expect(LikeService.prototype.getLikeStatusesByPostIds).toHaveBeenCalled();
    });

    it('should resolve Post.author but return null for Post.isLiked (unauthenticated)', async () => {
      const mockPost: Post = {
        id: 'post-123',
        userId: 'author-456',
        userHandle: 'authoruser',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      const mockAuthor: PublicProfile = {
        id: 'author-456',
        handle: 'authoruser',
        displayName: 'Author User',
        bio: null,
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(PostService.prototype, 'getPostById').mockResolvedValue(mockPost);
      // Mock batch method used by DataLoader
      vi.spyOn(ProfileService.prototype, 'getProfilesByIds').mockResolvedValue(
        new Map([['author-456', mockAuthor]])
      );
      const likeServiceSpy = vi.spyOn(LikeService.prototype, 'getLikeStatusesByPostIds');

      const result = await server.executeOperation({
        query: `
          query GetPostWithDetails($id: ID!) {
            post(id: $id) {
              id
              caption
              isLiked
              author {
                handle
              }
            }
          }
        `,
        variables: { id: 'post-123' },
      }, { contextValue: unauthContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const post = result.body.singleResult.data?.post;
        expect(post.isLiked).toBeNull(); // Unauthenticated users get null
        expect(post.author.handle).toBe('authoruser'); // But author still resolves
      }

      // Verify LikeService was NOT called for unauthenticated user
      expect(likeServiceSpy).not.toHaveBeenCalled();
    });
  });

  describe('Profile Field Resolution', () => {
    it('should resolve Profile.isFollowing when authenticated', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-456',
        handle: 'targetuser',
        displayName: 'Target User',
        bio: 'Bio text',
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(mockProfile);
      vi.spyOn(FollowService.prototype, 'getFollowStatus').mockResolvedValue({
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      });

      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              id
              handle
              followersCount
              isFollowing
            }
          }
        `,
        variables: { handle: 'targetuser' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const profile = result.body.singleResult.data?.profile;
        expect(profile.isFollowing).toBe(true);
      }

      // Verify field resolver was called
      expect(FollowService.prototype.getFollowStatus).toHaveBeenCalledWith('test-user-123', 'user-456');
    });

    it('should return null for Profile.isFollowing when viewing own profile', async () => {
      const mockProfile: PublicProfile = {
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

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(mockProfile);
      const followServiceSpy = vi.spyOn(FollowService.prototype, 'getFollowStatus');

      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              id
              handle
              isFollowing
            }
          }
        `,
        variables: { handle: 'testuser' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const profile = result.body.singleResult.data?.profile;
        expect(profile.isFollowing).toBeNull(); // Can't follow yourself
      }

      // Verify FollowService was NOT called
      expect(followServiceSpy).not.toHaveBeenCalled();
    });

    it('should return null for Profile.isFollowing when unauthenticated', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-456',
        handle: 'targetuser',
        displayName: 'Target User',
        bio: null,
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(mockProfile);
      const followServiceSpy = vi.spyOn(FollowService.prototype, 'getFollowStatus');

      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              id
              handle
              isFollowing
            }
          }
        `,
        variables: { handle: 'targetuser' },
      }, { contextValue: unauthContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const profile = result.body.singleResult.data?.profile;
        expect(profile.isFollowing).toBeNull(); // Unauthenticated users get null
      }

      // Verify FollowService was NOT called
      expect(followServiceSpy).not.toHaveBeenCalled();
    });
  });
});
